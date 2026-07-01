"""Render v3 source documents into canonical page images."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps

try:
    import pypdfium2 as pdfium
except ImportError:  # pragma: no cover - exercised only when dependency is absent
    pdfium = None

try:
    from config import PROCESSED_DIR, SOURCE_DOCUMENTS_RAW_DIR
    from content_type import SourceContent, detect_source_content
    from db import SupabaseClient
    from source_manifest import edition_matches_quarter
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR, SOURCE_DOCUMENTS_RAW_DIR
    from .content_type import SourceContent, detect_source_content
    from .db import SupabaseClient
    from .source_manifest import edition_matches_quarter


DEFAULT_OUTPUT_DIR = PROCESSED_DIR / "page_images"
DEFAULT_REPORT_PATH = PROCESSED_DIR / "eval" / "v3_render_source_pages_report.json"
DEFAULT_PDF_DPI = 450
RENDER_SOURCE_PAGES_REPORT_SCHEMA_VERSION = "v3_render_source_pages_001"
SOURCE_DOCUMENT_PAGES_CONFLICT = "source_document_id,page_number,canonical_image_sha256"
THUMBNAIL_MAX_SIZE = (360, 360)
SOURCE_METADATA_FIELDS = (
    "source_document_id",
    "source_kind",
    "source_role",
    "canonical_url",
    "fetched_url",
    "http_status",
    "currentness",
    "captured_at",
)

# These are trusted official source renders, and 450-DPI one-page flyers are
# intentionally large enough to exceed Pillow's generic decompression warning.
Image.MAX_IMAGE_PIXELS = None


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def stable_config_hash(config: dict[str, Any]) -> str:
    payload = json.dumps(config, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256_bytes(payload)


def _package_version(package: str) -> str | None:
    try:
        return importlib.metadata.version(package)
    except importlib.metadata.PackageNotFoundError:
        return None


def _page_dir(output_dir: Path, source_sha256: str) -> Path:
    return output_dir / source_sha256


def _source_document_files(source_documents_dir: Path) -> list[Path]:
    if not source_documents_dir.exists():
        return []
    return sorted(path for path in source_documents_dir.rglob("*") if path.is_file())


def _source_metadata_from_path(path: Path, source_documents_dir: Path) -> dict[str, str]:
    relative = path.relative_to(source_documents_dir)
    parts = relative.parts
    if len(parts) >= 3:
        return {
            "calendar_group_key": parts[0],
            "edition": parts[1],
        }
    return {
        "calendar_group_key": "unknown",
        "edition": "unknown",
    }


def _load_source_inventory(path: Path | None) -> list[dict[str, Any]]:
    if path is None:
        return []
    payload = json.loads(path.read_text())
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if isinstance(payload, dict):
        rows = payload.get("sources") or payload.get("results") or payload.get("documents") or []
        if isinstance(rows, list):
            return [row for row in rows if isinstance(row, dict)]
    return []


def _source_inventory_by_hash(source_inventory: list[dict[str, Any]] | None) -> dict[str, dict[str, Any]]:
    indexed: dict[str, dict[str, Any]] = {}
    for row in source_inventory or []:
        content_sha256 = row.get("content_sha256") or row.get("source_sha256")
        if isinstance(content_sha256, str) and content_sha256:
            indexed[content_sha256] = row
    return indexed


def _report_source_metadata(row: dict[str, Any], source_metadata: dict[str, Any] | None) -> None:
    if not isinstance(source_metadata, dict):
        return
    for field in SOURCE_METADATA_FIELDS:
        if field in source_metadata:
            row[field] = source_metadata[field]


def source_document_page_rows_from_manifest(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    """Build DB-ready source_document_pages rows from a render manifest."""
    source_document_id = str(manifest.get("source_document_id") or "").strip()
    if not source_document_id:
        raise ValueError("missing_source_document_id")
    content_sha256 = str(manifest.get("source_sha256") or "").strip()
    if not content_sha256:
        raise ValueError("missing_source_sha256")

    rows: list[dict[str, Any]] = []
    for page in manifest.get("pages") or []:
        if not isinstance(page, dict):
            continue
        rows.append(
            {
                "source_document_id": source_document_id,
                "content_sha256": content_sha256,
                "page_number": page.get("page_number"),
                "page_kind": page.get("page_kind"),
                "canonical_image_storage_path": page.get("canonical_image_path"),
                "canonical_image_sha256": page.get("canonical_image_sha256"),
                "width_px": page.get("width_px"),
                "height_px": page.get("height_px"),
                "render_engine": page.get("render_engine"),
                "render_engine_version": page.get("render_engine_version"),
                "render_dpi": page.get("render_dpi"),
                "render_scale": page.get("render_scale"),
                "image_orientation": page.get("image_orientation"),
                "image_quality": {
                    "thumbnail_storage_path": page.get("thumbnail_path"),
                    "thumbnail_sha256": page.get("thumbnail_sha256"),
                },
            }
        )
    return rows


def source_document_page_rows_from_report(report: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for result in report.get("results") or []:
        if not isinstance(result, dict) or result.get("status") != "rendered":
            continue
        for row in result.get("source_document_pages") or []:
            if isinstance(row, dict):
                rows.append(row)
    return rows


def upsert_source_document_pages_from_report(db: Any, report: dict[str, Any]) -> dict[str, int]:
    rows = source_document_page_rows_from_report(report)
    if rows:
        db.upsert(
            "source_document_pages",
            rows,
            on_conflict=SOURCE_DOCUMENT_PAGES_CONFLICT,
        )
    return {"source_document_pages": len(rows)}


def _matches_filters(
    *,
    calendar_group_key: str,
    edition: str,
    group: str | None,
    quarter: str | None,
) -> bool:
    if group and calendar_group_key != group:
        return False
    if not edition_matches_quarter(edition, quarter):
        return False
    return True


def _write_thumbnail(image_path: Path, thumb_path: Path) -> None:
    with Image.open(image_path) as image:
        thumbnail = image.copy()
        thumbnail.thumbnail(THUMBNAIL_MAX_SIZE)
        thumb_path.parent.mkdir(parents=True, exist_ok=True)
        thumbnail.save(thumb_path, "PNG")


def _path_size(path_value: Any) -> int:
    if not path_value:
        return 0
    try:
        path = Path(str(path_value))
        return path.stat().st_size if path.exists() else 0
    except OSError:
        return 0


def _image_page(
    source_path: Path,
    *,
    source_sha256: str,
    output_dir: Path,
    render_config: dict[str, Any],
    page_number: int = 1,
    page_kind: str = "image_file",
) -> dict[str, Any]:
    page_dir = _page_dir(output_dir, source_sha256)
    page_dir.mkdir(parents=True, exist_ok=True)
    canonical_path = page_dir / f"page_{page_number:03d}.png"
    thumb_path = page_dir / f"page_{page_number:03d}.thumb.png"

    with Image.open(source_path) as image:
        oriented = ImageOps.exif_transpose(image).convert("RGB")
        oriented.save(canonical_path, "PNG")
        width, height = oriented.size

    _write_thumbnail(canonical_path, thumb_path)
    return {
        "page_number": page_number,
        "page_kind": page_kind,
        "canonical_image_path": str(canonical_path),
        "canonical_image_sha256": sha256_file(canonical_path),
        "thumbnail_path": str(thumb_path),
        "thumbnail_sha256": sha256_file(thumb_path),
        "width_px": width,
        "height_px": height,
        "render_engine": render_config["image_engine"],
        "render_engine_version": render_config["image_engine_version"],
        "render_dpi": None,
        "render_scale": None,
        "image_orientation": 1,
    }


def _visual_source_manifest_payload(source_path: Path) -> dict[str, Any] | None:
    if source_path.suffix.lower() != ".json":
        return None
    try:
        payload = json.loads(source_path.read_text())
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, dict) or not isinstance(payload.get("images"), list):
        return None
    content_sha256 = str(payload.get("content_sha256") or "").strip()
    if not content_sha256:
        return None
    return payload


def _visual_source_manifest_pages(
    source_path: Path,
    payload: dict[str, Any],
    *,
    source_sha256: str,
    output_dir: Path,
    render_config: dict[str, Any],
) -> list[dict[str, Any]]:
    pages: list[dict[str, Any]] = []
    for index, image_entry in enumerate(payload.get("images") or [], start=1):
        if not isinstance(image_entry, dict):
            continue
        image_path = Path(str(image_entry.get("path") or ""))
        if not image_path.is_absolute():
            image_path = (source_path.parent / image_path).resolve() if not image_path.exists() else image_path
        page_number = int(image_entry.get("page") or index)
        page = _image_page(
            image_path,
            source_sha256=source_sha256,
            output_dir=output_dir,
            render_config=render_config,
            page_number=page_number,
            page_kind="reviewed_visual_schedule_image_page",
        )
        page["source_image_path"] = str(image_path)
        page["source_image_sha256"] = image_entry.get("sha256") or sha256_file(image_path)
        for key in ("visible_title", "visible_validity"):
            if image_entry.get(key):
                page[key] = image_entry[key]
        pages.append(page)
    if not pages:
        raise ValueError("visual_source_manifest_missing_images")
    return sorted(pages, key=lambda page: int(page["page_number"]))


def _pdf_pages(
    source_path: Path,
    *,
    source_sha256: str,
    output_dir: Path,
    dpi: int,
    render_config: dict[str, Any],
) -> list[dict[str, Any]]:
    if pdfium is None:
        raise RuntimeError("pypdfium2_missing")

    page_dir = _page_dir(output_dir, source_sha256)
    page_dir.mkdir(parents=True, exist_ok=True)
    document = pdfium.PdfDocument(str(source_path))
    scale = dpi / 72
    pages: list[dict[str, Any]] = []
    try:
        for index in range(len(document)):
            page_number = index + 1
            page = document[index]
            image = page.render(scale=scale).to_pil().convert("RGB")
            canonical_path = page_dir / f"page_{page_number:03d}.png"
            thumb_path = page_dir / f"page_{page_number:03d}.thumb.png"
            image.save(canonical_path, "PNG")
            width, height = image.size
            _write_thumbnail(canonical_path, thumb_path)
            pages.append(
                {
                    "page_number": page_number,
                    "page_kind": "pdf_page",
                    "canonical_image_path": str(canonical_path),
                    "canonical_image_sha256": sha256_file(canonical_path),
                    "thumbnail_path": str(thumb_path),
                    "thumbnail_sha256": sha256_file(thumb_path),
                    "width_px": width,
                    "height_px": height,
                    "render_engine": render_config["pdf_engine"],
                    "render_engine_version": render_config["pdf_engine_version"],
                    "render_dpi": dpi,
                    "render_scale": scale,
                    "image_orientation": None,
                }
            )
    finally:
        document.close()
    return pages


def render_source_document(
    source_path: Path,
    *,
    calendar_group_key: str,
    edition: str,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    pdf_dpi: int = DEFAULT_PDF_DPI,
    source_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    source_path = Path(source_path)
    visual_manifest = _visual_source_manifest_payload(source_path)
    data = source_path.read_bytes()
    source_sha256 = (
        str(visual_manifest.get("content_sha256")).strip()
        if visual_manifest
        else sha256_bytes(data)
    )
    detected = None if visual_manifest else detect_source_content(data, fallback_path=source_path)
    if not visual_manifest and detected.source_type not in {"pdf", "image"}:
        raise ValueError(f"unsupported_source_type:{detected.mime_type}")

    render_config = {
        "pipeline_version": "vision_v3_001",
        "pdf_engine": "pypdfium2",
        "pdf_engine_version": _package_version("pypdfium2"),
        "pdf_dpi": pdf_dpi,
        "image_engine": "Pillow",
        "image_engine_version": _package_version("Pillow"),
        "image_policy": "exif_transpose_rgb_png",
        "image_manifest_policy": "render_each_manifest_image_as_canonical_page",
        "output_format": "png",
        "coordinate_origin": "top_left",
        "bbox_format": "[x1,y1,x2,y2]",
    }
    render_config["config_hash"] = stable_config_hash(render_config)

    if visual_manifest:
        pages = _visual_source_manifest_pages(
            source_path,
            visual_manifest,
            source_sha256=source_sha256,
            output_dir=output_dir,
            render_config=render_config,
        )
    elif detected.source_type == "pdf":
        pages = _pdf_pages(
            source_path,
            source_sha256=source_sha256,
            output_dir=output_dir,
            dpi=pdf_dpi,
            render_config=render_config,
        )
    else:
        pages = [
            _image_page(
                source_path,
                source_sha256=source_sha256,
                output_dir=output_dir,
                render_config=render_config,
            )
        ]

    manifest_path = _page_dir(output_dir, source_sha256) / "page_manifest.json"
    manifest = {
        "pipeline_version": render_config["pipeline_version"],
        "source_path": str(source_path),
        "source_sha256": source_sha256,
        "source_type": "image_manifest" if visual_manifest else detected.source_type,
        "mime_type": "application/json" if visual_manifest else detected.mime_type,
        "file_extension": source_path.suffix.lower().lstrip(".") if visual_manifest else detected.file_extension,
        "calendar_group_key": calendar_group_key,
        "edition": edition,
        "page_count": len(pages),
        "render_config": render_config,
        "pages": pages,
    }
    if visual_manifest:
        for field in (
            "source_kind",
            "canonical_url",
            "internal_source_id",
            "valid_from",
            "valid_to",
            "source_note",
        ):
            value = visual_manifest.get(field) or (visual_manifest.get("manifest") or {}).get(field)
            if value:
                manifest[field] = value
    if isinstance(source_metadata, dict):
        for field in SOURCE_METADATA_FIELDS:
            if field in source_metadata:
                manifest[field] = source_metadata[field]
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    manifest["manifest_path"] = str(manifest_path)
    return manifest


def render_source_documents_from_directory(
    *,
    source_documents_dir: Path = SOURCE_DOCUMENTS_RAW_DIR,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    report_path: Path | None = DEFAULT_REPORT_PATH,
    pdf_dpi: int = DEFAULT_PDF_DPI,
    group: str | None = None,
    quarter: str | None = None,
    source_inventory: list[dict[str, Any]] | None = None,
    source_inventory_path: Path | None = None,
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    inventory_rows = source_inventory if source_inventory is not None else _load_source_inventory(source_inventory_path)
    inventory_by_hash = _source_inventory_by_hash(inventory_rows)
    for source_path in _source_document_files(source_documents_dir):
        metadata = _source_metadata_from_path(source_path, source_documents_dir)
        calendar_group_key = metadata["calendar_group_key"]
        edition = metadata["edition"]
        if not _matches_filters(
            calendar_group_key=calendar_group_key,
            edition=edition,
            group=group,
            quarter=quarter,
        ):
            continue

        source_sha256 = sha256_file(source_path)
        source_metadata = inventory_by_hash.get(source_sha256)
        started_at = time.perf_counter()
        try:
            manifest = render_source_document(
                source_path,
                calendar_group_key=calendar_group_key,
                edition=edition,
                output_dir=output_dir,
                pdf_dpi=pdf_dpi,
                source_metadata=source_metadata,
            )
            result = {
                "status": "rendered",
                "source_path": str(source_path),
                "calendar_group_key": calendar_group_key,
                "edition": edition,
                "source_sha256": manifest["source_sha256"],
                "source_type": manifest["source_type"],
                "mime_type": manifest["mime_type"],
                "page_count": manifest["page_count"],
                "manifest_path": manifest["manifest_path"],
                "error": None,
                "render_elapsed_seconds": time.perf_counter() - started_at,
            }
            if manifest.get("source_document_id"):
                page_rows = source_document_page_rows_from_manifest(manifest)
                result["source_document_page_count"] = len(page_rows)
                result["source_document_pages"] = page_rows
            else:
                result["source_document_page_count"] = 0
                result["source_document_pages"] = []
            _report_source_metadata(result, source_metadata)
            results.append(result)
        except Exception as exc:
            result = {
                "status": "source_error",
                "source_path": str(source_path),
                "calendar_group_key": calendar_group_key,
                "edition": edition,
                "source_sha256": source_sha256,
                "source_type": None,
                "mime_type": None,
                "page_count": 0,
                "manifest_path": None,
                "source_document_page_count": 0,
                "source_document_pages": [],
                "error": str(exc),
                "render_elapsed_seconds": time.perf_counter() - started_at,
            }
            _report_source_metadata(result, source_metadata)
            results.append(result)

    rendered_results = [result for result in results if result["status"] == "rendered"]
    rendered_page_count = sum(int(result.get("page_count") or 0) for result in rendered_results)
    render_elapsed_seconds = sum(float(result.get("render_elapsed_seconds") or 0.0) for result in rendered_results)
    page_image_bytes = 0
    thumbnail_bytes = 0
    for result in rendered_results:
        manifest_path = result.get("manifest_path")
        if not manifest_path:
            continue
        try:
            manifest = json.loads(Path(str(manifest_path)).read_text())
        except (OSError, json.JSONDecodeError):
            continue
        for page in manifest.get("pages") or []:
            if not isinstance(page, dict):
                continue
            page_image_bytes += _path_size(page.get("canonical_image_path"))
            thumbnail_bytes += _path_size(page.get("thumbnail_path"))
    report = {
        "report_kind": "v3_render_source_pages",
        "schema_version": RENDER_SOURCE_PAGES_REPORT_SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_documents_dir": str(source_documents_dir),
        "output_dir": str(output_dir),
        "quarter": quarter,
        "group": group,
        "summary": {
            "source_count": len(results),
            "rendered_count": sum(1 for result in results if result["status"] == "rendered"),
            "source_error_count": sum(1 for result in results if result["status"] == "source_error"),
            "source_document_page_count": sum(
                int(result.get("source_document_page_count") or 0)
                for result in results
            ),
            "render_elapsed_seconds": render_elapsed_seconds,
            "average_render_time_per_page_seconds": (
                render_elapsed_seconds / rendered_page_count if rendered_page_count else None
            ),
            "page_image_bytes": page_image_bytes,
            "thumbnail_bytes": thumbnail_bytes,
            "average_page_image_bytes": (
                page_image_bytes / rendered_page_count if rendered_page_count else None
            ),
            "average_thumbnail_bytes": (
                thumbnail_bytes / rendered_page_count if rendered_page_count else None
            ),
        },
        "results": results,
    }
    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Render v3 source documents into canonical page images")
    parser.add_argument("source", type=Path, nargs="?")
    parser.add_argument("--calendar-group-key")
    parser.add_argument("--edition", default="unknown")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--source-documents-dir", type=Path, default=SOURCE_DOCUMENTS_RAW_DIR)
    parser.add_argument("--report-path", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--group")
    parser.add_argument("--quarter")
    parser.add_argument("--pdf-dpi", type=int, default=DEFAULT_PDF_DPI)
    parser.add_argument("--source-inventory", type=Path)
    parser.add_argument(
        "--upsert-source-document-pages",
        action="store_true",
        help="Upsert rendered canonical page metadata into source_document_pages",
    )
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.source:
        if args.upsert_source_document_pages:
            parser.error("--upsert-source-document-pages is only supported for batch rendering")
        if not args.calendar_group_key:
            parser.error("--calendar-group-key is required when rendering a single source")
        manifest = render_source_document(
            args.source,
            calendar_group_key=args.calendar_group_key,
            edition=args.edition,
            output_dir=args.output_dir,
            pdf_dpi=args.pdf_dpi,
        )
        if args.json:
            print(json.dumps(manifest, indent=2, sort_keys=True))
        else:
            print(manifest["manifest_path"])
        return

    report = render_source_documents_from_directory(
        source_documents_dir=args.source_documents_dir,
        output_dir=args.output_dir,
        report_path=args.report_path,
        pdf_dpi=args.pdf_dpi,
        group=args.group,
        quarter=args.quarter,
        source_inventory_path=args.source_inventory,
    )
    if args.upsert_source_document_pages:
        report["source_document_pages_upsert"] = upsert_source_document_pages_from_report(
            SupabaseClient(),
            report,
        )
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(args.report_path)


if __name__ == "__main__":
    main()
