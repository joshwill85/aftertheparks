"""Render v3 source documents into canonical page images."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
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
    from source_manifest import edition_matches_quarter
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR, SOURCE_DOCUMENTS_RAW_DIR
    from .content_type import SourceContent, detect_source_content
    from .source_manifest import edition_matches_quarter


DEFAULT_OUTPUT_DIR = PROCESSED_DIR / "page_images"
DEFAULT_REPORT_PATH = PROCESSED_DIR / "eval" / "v3_render_source_pages_report.json"
DEFAULT_PDF_DPI = 450
THUMBNAIL_MAX_SIZE = (360, 360)

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


def _image_page(
    source_path: Path,
    *,
    source_sha256: str,
    output_dir: Path,
    render_config: dict[str, Any],
) -> dict[str, Any]:
    page_dir = _page_dir(output_dir, source_sha256)
    page_dir.mkdir(parents=True, exist_ok=True)
    canonical_path = page_dir / "page_001.png"
    thumb_path = page_dir / "page_001.thumb.png"

    with Image.open(source_path) as image:
        oriented = ImageOps.exif_transpose(image).convert("RGB")
        oriented.save(canonical_path, "PNG")
        width, height = oriented.size

    _write_thumbnail(canonical_path, thumb_path)
    return {
        "page_number": 1,
        "page_kind": "image_file",
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
) -> dict[str, Any]:
    source_path = Path(source_path)
    data = source_path.read_bytes()
    source_sha256 = sha256_bytes(data)
    detected = detect_source_content(data, fallback_path=source_path)
    if detected.source_type not in {"pdf", "image"}:
        raise ValueError(f"unsupported_source_type:{detected.mime_type}")

    render_config = {
        "pipeline_version": "vision_v3_001",
        "pdf_engine": "pypdfium2",
        "pdf_engine_version": _package_version("pypdfium2"),
        "pdf_dpi": pdf_dpi,
        "image_engine": "Pillow",
        "image_engine_version": _package_version("Pillow"),
        "image_policy": "exif_transpose_rgb_png",
        "output_format": "png",
        "coordinate_origin": "top_left",
        "bbox_format": "[x1,y1,x2,y2]",
    }
    render_config["config_hash"] = stable_config_hash(render_config)

    if detected.source_type == "pdf":
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
        "source_type": detected.source_type,
        "mime_type": detected.mime_type,
        "file_extension": detected.file_extension,
        "calendar_group_key": calendar_group_key,
        "edition": edition,
        "page_count": len(pages),
        "render_config": render_config,
        "pages": pages,
    }
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
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
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

        try:
            manifest = render_source_document(
                source_path,
                calendar_group_key=calendar_group_key,
                edition=edition,
                output_dir=output_dir,
                pdf_dpi=pdf_dpi,
            )
            results.append(
                {
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
                }
            )
        except Exception as exc:
            results.append(
                {
                    "status": "source_error",
                    "source_path": str(source_path),
                    "calendar_group_key": calendar_group_key,
                    "edition": edition,
                    "source_sha256": sha256_file(source_path),
                    "source_type": None,
                    "mime_type": None,
                    "page_count": 0,
                    "manifest_path": None,
                    "error": str(exc),
                }
            )

    report = {
        "report_kind": "v3_render_source_pages",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_documents_dir": str(source_documents_dir),
        "output_dir": str(output_dir),
        "quarter": quarter,
        "group": group,
        "summary": {
            "source_count": len(results),
            "rendered_count": sum(1 for result in results if result["status"] == "rendered"),
            "source_error_count": sum(1 for result in results if result["status"] == "source_error"),
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
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.source:
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
    )
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(args.report_path)


if __name__ == "__main__":
    main()
