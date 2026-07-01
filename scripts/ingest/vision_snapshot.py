"""Build v3 vision snapshot envelopes from canonical page manifests."""

from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
from typing import Any

try:
    from .config import PROCESSED_DIR
    from .debug_overlays import build_debug_overlays
    from .family_classifier import classify_document_family
    from .normalization_v3 import build_runtime_lineage
    from .ocr.base import package_version
    from .ocr.docling_adapter import DoclingAdapter
    from .ocr.paddle_adapter import PaddleOcrAdapter
    from .ocr.rapidocr_adapter import RapidOcrAdapter
    from .quality_metrics import compute_snapshot_quality
    from .regions import segment_major_regions
    from .render_source_pages import stable_config_hash
    from .source_manifest import edition_matches_quarter
    from .db import SupabaseClient
except ImportError:  # pragma: no cover - supports direct script execution
    from config import PROCESSED_DIR
    from debug_overlays import build_debug_overlays
    from family_classifier import classify_document_family
    from normalization_v3 import build_runtime_lineage
    from ocr.base import package_version
    from ocr.docling_adapter import DoclingAdapter
    from ocr.paddle_adapter import PaddleOcrAdapter
    from ocr.rapidocr_adapter import RapidOcrAdapter
    from quality_metrics import compute_snapshot_quality
    from regions import segment_major_regions
    from render_source_pages import stable_config_hash
    from source_manifest import edition_matches_quarter
    from db import SupabaseClient


DEFAULT_OUTPUT_DIR = PROCESSED_DIR / "vision_snapshots"
DEFAULT_PAGE_IMAGES_DIR = PROCESSED_DIR / "page_images"
DEFAULT_REPORT_PATH = PROCESSED_DIR / "eval" / "v3_vision_snapshot_report.json"
PIPELINE_VERSION = "vision_v3_001"
ACTIVITY_LAYOUT_SNAPSHOTS_CONFLICT = "content_sha256,parser_version"
PRIMARY_ENGINE = "paddleocr_ppstructurev3"
SECONDARY_ENGINE = "rapidocr"
DOCLING_ENGINE = "docling_snapshot"
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

DEFAULT_VISION_CONFIG: dict[str, Any] = {
    "pipeline_version": PIPELINE_VERSION,
    "engine_routing_policy": "fixed_config",
    "render": {
        "pdf_engine": "pypdfium2",
        "default_dpi": 450,
        "max_dpi": 600,
        "output_format": "png",
        "color_mode": "rgb",
    },
    "image": {
        "apply_exif_orientation": True,
        "preserve_original_bytes": True,
        "canonical_format": "png",
    },
    "ocr": {
        "primary": {
            "engine": PRIMARY_ENGINE,
            "package": "paddleocr",
            "mode": "ppstructurev3",
            "role": "primary_ocr_layout",
        },
        "secondary": {
            "engine": SECONDARY_ENGINE,
            "package": "rapidocr",
            "role": "secondary_ocr_comparator",
        },
        "optional": {
            "surya_enabled": False,
        },
        "docling_snapshot": {
            "engine": DOCLING_ENGINE,
            "package": "docling",
            "role": "parallel_structural_snapshot",
        },
        "docling_snapshot_enabled": False,
    },
    "publish_gates": {
        "require_field_evidence": True,
        "require_engine_agreement_for_auto_publish": True,
        "require_manual_review_on_disagreement": True,
        "allow_generic_family_auto_publish": False,
    },
}


def default_vision_config() -> dict[str, Any]:
    return deepcopy(DEFAULT_VISION_CONFIG)


def _git_sha() -> str | None:
    env_sha = os.environ.get("GIT_SHA") or os.environ.get("VERCEL_GIT_COMMIT_SHA")
    if env_sha:
        return env_sha
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return result.stdout.strip() or None


def _package_versions() -> dict[str, str | None]:
    return {
        "Pillow": package_version("Pillow"),
        "pypdfium2": package_version("pypdfium2"),
        "paddleocr": package_version("paddleocr"),
        "rapidocr": package_version("rapidocr"),
        "docling": package_version("docling"),
    }


def _engine_routes(config: dict[str, Any]) -> list[dict[str, Any]]:
    ocr_config = config.get("ocr") if isinstance(config.get("ocr"), dict) else {}
    routes: list[dict[str, Any]] = []
    for role_key in ("primary", "secondary"):
        engine_config = ocr_config.get(role_key)
        if not isinstance(engine_config, dict):
            continue
        engine = str(engine_config.get("engine") or "").strip()
        if not engine:
            continue
        routes.append(
            {
                "engine": engine,
                "role": str(engine_config.get("role") or f"{role_key}_ocr"),
                "package": str(engine_config.get("package") or engine),
                "config": deepcopy(engine_config),
            }
        )
    if ocr_config.get("docling_snapshot_enabled", False):
        docling_config = ocr_config.get("docling_snapshot")
        if isinstance(docling_config, dict):
            routes.append(
                {
                    "engine": str(docling_config.get("engine") or DOCLING_ENGINE),
                    "role": str(docling_config.get("role") or "parallel_structural_snapshot"),
                    "package": str(docling_config.get("package") or "docling"),
                    "config": deepcopy(docling_config),
                }
            )
    return routes


def _ocr_engine_configs(routes: list[dict[str, Any]]) -> dict[str, Any]:
    return {str(route["engine"]): route["config"] for route in routes}


def _hash_model_asset_path(path: Path) -> str:
    hasher = hashlib.sha256()
    if path.is_file():
        hasher.update(path.name.encode("utf-8"))
        hasher.update(path.read_bytes())
        return hasher.hexdigest()

    for child in sorted(item for item in path.rglob("*") if item.is_file()):
        relative = child.relative_to(path).as_posix()
        hasher.update(relative.encode("utf-8"))
        hasher.update(str(child.stat().st_size).encode("utf-8"))
        hasher.update(child.read_bytes())
    return hasher.hexdigest()


def _known_model_asset_path(engine: str, package: str) -> Path | None:
    if engine == PRIMARY_ENGINE:
        path = Path.home() / ".paddlex" / "official_models"
        return path if path.exists() else None
    if engine == SECONDARY_ENGINE:
        spec = importlib.util.find_spec(package)
        if spec and spec.origin:
            path = Path(spec.origin).resolve().parent / "models"
            return path if path.exists() else None
    return None


def _model_asset_hashes(routes: list[dict[str, Any]]) -> dict[str, str]:
    hashes: dict[str, str] = {}
    for route in routes:
        engine_config = route.get("config") if isinstance(route.get("config"), dict) else {}
        engine = str(route["engine"])
        model_hash = str(
            engine_config.get("model_asset_sha256")
            or engine_config.get("model_asset_hash")
            or ""
        ).strip()
        if model_hash:
            hashes[engine] = model_hash
            continue

        model_asset_path = str(engine_config.get("model_asset_path") or "").strip()
        path = Path(model_asset_path).expanduser() if model_asset_path else _known_model_asset_path(
            engine,
            str(route.get("package") or ""),
        )
        if path and path.exists():
            hashes[engine] = _hash_model_asset_path(path)
    return hashes


def _adapter_for_engine(engine: str) -> Any:
    if engine == PRIMARY_ENGINE:
        return PaddleOcrAdapter()
    if engine == SECONDARY_ENGINE:
        return RapidOcrAdapter()
    if engine == DOCLING_ENGINE:
        return DoclingAdapter()
    raise ValueError(f"unsupported_ocr_engine:{engine}")


def _annotated_engine_run(
    run: dict[str, Any],
    *,
    route: dict[str, Any],
    config_hash: str,
    pipeline_version: str,
    package_versions: dict[str, str | None],
) -> dict[str, Any]:
    engine_config = route["config"]
    engine_config_hash = stable_config_hash(engine_config)
    engine_version = (
        run.get("engine_version")
        or run.get("version")
        or package_versions.get(str(route.get("package") or ""))
    )
    return {
        **run,
        "engine": run.get("engine") or route["engine"],
        "engine_role": route["role"],
        "engine_config": engine_config,
        "engine_config_hash": engine_config_hash,
        "engine_version": engine_version,
        "pipeline_version": pipeline_version,
        "config_hash": config_hash,
    }


def _engine_config_error_run(
    *,
    route: dict[str, Any],
    error: str,
    config_hash: str,
    pipeline_version: str,
) -> dict[str, Any]:
    engine_config = route["config"]
    return {
        "engine": route["engine"],
        "engine_role": route["role"],
        "engine_config": engine_config,
        "engine_config_hash": stable_config_hash(engine_config),
        "engine_version": None,
        "pipeline_version": pipeline_version,
        "config_hash": config_hash,
        "status": "config_error",
        "tokens": [],
        "lines": [],
        "regions": [],
        "error": error,
    }


def _engine_exception_run(
    *,
    route: dict[str, Any],
    page: dict[str, Any],
    exc: Exception,
    config_hash: str,
    pipeline_version: str,
    package_versions: dict[str, str | None],
) -> dict[str, Any]:
    engine_config = route["config"]
    error = f"ocr_engine_error:{route['engine']}:{type(exc).__name__}"
    return {
        "engine": route["engine"],
        "engine_role": route["role"],
        "engine_config": engine_config,
        "engine_config_hash": stable_config_hash(engine_config),
        "engine_version": package_versions.get(str(route.get("package") or "")),
        "pipeline_version": pipeline_version,
        "config_hash": config_hash,
        "status": "error",
        "page_number": page.get("page_number"),
        "page_image_sha256": page.get("page_image_sha256"),
        "tokens": [],
        "lines": [],
        "regions": [],
        "error": error,
        "error_detail": str(exc),
    }


def _region_segmentation_error(exc: Exception) -> str:
    if isinstance(exc, FileNotFoundError):
        return "region_segmentation_error:missing_page_image"
    return f"region_segmentation_error:{type(exc).__name__}"


def _source_pages(page_manifest: dict[str, Any]) -> list[dict[str, Any]]:
    pages = page_manifest.get("pages") if isinstance(page_manifest.get("pages"), list) else []
    normalized: list[dict[str, Any]] = []
    for page in pages:
        if not isinstance(page, dict):
            continue
        normalized.append(
            {
                "page_number": page.get("page_number"),
                "page_kind": page.get("page_kind"),
                "page_image_path": page.get("canonical_image_path"),
                "page_image_sha256": page.get("canonical_image_sha256"),
                "width_px": page.get("width_px"),
                "height_px": page.get("height_px"),
                "render_dpi": page.get("render_dpi"),
                "render_engine": page.get("render_engine"),
                "render_engine_version": page.get("render_engine_version"),
                "coordinate_contract": {
                    "units": "pixels",
                    "origin": "top_left",
                    "bbox_format": "[x1,y1,x2,y2]",
                    "bbox_reference": "canonical_page_image",
                },
            }
        )
    return normalized


def _canonical_tokens(engine_runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    tokens: list[dict[str, Any]] = []
    for run in engine_runs:
        if run.get("status") != "success":
            continue
        run_tokens = run.get("tokens") if isinstance(run.get("tokens"), list) else []
        for index, token in enumerate(run_tokens, start=1):
            if not isinstance(token, dict):
                continue
            text = str(token.get("text") or token.get("token_text") or "").strip()
            bbox = token.get("bbox_px")
            if not text or not (isinstance(bbox, list) and len(bbox) == 4):
                continue
            tokens.append(
                {
                    **token,
                    "engine": token.get("engine") or run.get("engine"),
                    "page_number": token.get("page_number") or run.get("page_number"),
                    "page_image_sha256": token.get("page_image_sha256") or run.get("page_image_sha256"),
                    "text": text,
                    "token_text": token.get("token_text") or text,
                    "bbox_px": bbox,
                    "reading_order": token.get("reading_order", index),
                }
            )
    tokens.sort(
        key=lambda token: (
            int(token.get("page_number") or 0),
            str(token.get("engine") or ""),
            int(token.get("reading_order") or 0),
        )
    )
    return tokens


def _canonical_lines(engine_runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    lines: list[dict[str, Any]] = []
    for run in engine_runs:
        if run.get("status") != "success":
            continue
        run_lines = run.get("lines") if isinstance(run.get("lines"), list) else []
        for index, line in enumerate(run_lines, start=1):
            if not isinstance(line, dict):
                continue
            text = str(line.get("text") or line.get("line_text") or "").strip()
            bbox = line.get("bbox_px")
            if not text or not (isinstance(bbox, list) and len(bbox) == 4):
                continue
            lines.append(
                {
                    **line,
                    "engine": line.get("engine") or run.get("engine"),
                    "page_number": line.get("page_number") or run.get("page_number"),
                    "page_image_sha256": line.get("page_image_sha256") or run.get("page_image_sha256"),
                    "text": text,
                    "line_text": line.get("line_text") or text,
                    "bbox_px": bbox,
                    "reading_order": line.get("reading_order", index),
                }
            )
    lines.sort(
        key=lambda line: (
            int(line.get("page_number") or 0),
            str(line.get("engine") or ""),
            int(line.get("reading_order") or 0),
        )
    )
    return lines


def _canonical_engine_regions(engine_runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    regions: list[dict[str, Any]] = []
    for run in engine_runs:
        if run.get("status") != "success":
            continue
        run_regions = run.get("regions") if isinstance(run.get("regions"), list) else []
        for index, region in enumerate(run_regions, start=1):
            if not isinstance(region, dict):
                continue
            bbox = region.get("bbox_px")
            if not (isinstance(bbox, list) and len(bbox) == 4):
                continue
            regions.append(
                {
                    **region,
                    "engine": region.get("engine") or run.get("engine"),
                    "page_number": region.get("page_number") or run.get("page_number"),
                    "page_image_sha256": region.get("page_image_sha256") or run.get("page_image_sha256"),
                    "region_type": region.get("region_type") or "unknown",
                    "bbox_px": bbox,
                    "reading_order": region.get("reading_order", index),
                }
            )
    regions.sort(
        key=lambda region: (
            int(region.get("page_number") or 0),
            str(region.get("engine") or ""),
            int(region.get("reading_order") or 0),
        )
    )
    return regions


def _first_overlay_for_engine(
    overlays: dict[str, Any],
    engine: str,
) -> dict[str, Any] | None:
    engine_overlays = overlays.get("engines", {}).get(engine)
    if isinstance(engine_overlays, list) and engine_overlays:
        first = engine_overlays[0]
        return first if isinstance(first, dict) else None
    return None


def _write_debug_overlay_artifacts(
    snapshot: dict[str, Any],
    *,
    output_dir: Path,
) -> dict[str, Any]:
    source_sha256 = str(snapshot.get("source_sha256") or "unknown")
    debug_dir = output_dir / source_sha256
    overlays = build_debug_overlays(snapshot, output_dir=debug_dir)
    aliases: dict[str, Any] = {"all": overlays}
    for label, engine, filename in (
        ("primary", PRIMARY_ENGINE, "overlay_primary.png"),
        ("secondary", SECONDARY_ENGINE, "overlay_secondary.png"),
    ):
        overlay = _first_overlay_for_engine(overlays, engine)
        if not overlay:
            continue
        source_path = Path(str(overlay.get("overlay_path")))
        alias_path = debug_dir / filename
        if source_path.exists():
            shutil.copyfile(source_path, alias_path)
            aliases[label] = {
                **overlay,
                "engine": engine,
                "overlay_path": str(alias_path),
                "overlay_sha256": hashlib.sha256(alias_path.read_bytes()).hexdigest(),
            }
    return aliases


def build_vision_snapshot(
    *,
    page_manifest: dict[str, Any],
    vision_config: dict[str, Any] | None = None,
    attach_regions: bool = False,
    region_output_dir: Path | None = None,
    write_debug_overlays: bool = False,
    debug_output_dir: Path | None = None,
) -> dict[str, Any]:
    config = deepcopy(vision_config) if vision_config is not None else default_vision_config()
    config.setdefault("pipeline_version", PIPELINE_VERSION)
    config.setdefault("engine_routing_policy", "fixed_config")
    config.pop("config_hash", None)
    config["config_hash"] = stable_config_hash(config)
    routes = _engine_routes(config)
    package_versions = _package_versions()
    runtime_lineage = build_runtime_lineage(
        config=config,
        package_versions=package_versions,
        model_asset_hashes=_model_asset_hashes(routes),
        ocr_engine_configs=_ocr_engine_configs(routes),
        git_sha=_git_sha(),
        container_image_digest=os.environ.get("CONTAINER_IMAGE_DIGEST"),
    )

    engine_runs: list[dict[str, Any]] = []
    for route in routes:
        try:
            adapter = _adapter_for_engine(str(route["engine"]))
        except ValueError:
            engine_runs.append(
                _engine_config_error_run(
                    route=route,
                    error=f"ocr_config_error:unsupported_ocr_engine:{route['engine']}",
                    config_hash=config["config_hash"],
                    pipeline_version=str(config["pipeline_version"]),
                )
            )
            continue
        for page in _source_pages(page_manifest):
            try:
                run = adapter.run_page(page)
            except Exception as exc:
                engine_runs.append(
                    _engine_exception_run(
                        route=route,
                        page=page,
                        exc=exc,
                        config_hash=config["config_hash"],
                        pipeline_version=str(config["pipeline_version"]),
                        package_versions=package_versions,
                    )
                )
                continue
            engine_runs.append(
                _annotated_engine_run(
                    run,
                    route=route,
                    config_hash=config["config_hash"],
                    pipeline_version=str(config["pipeline_version"]),
                    package_versions=package_versions,
                )
            )
    errors = [
        run["error"]
        for run in engine_runs
        if isinstance(run.get("error"), str) and run["error"]
    ]
    if not routes:
        errors.append("ocr_config_error:no_configured_ocr_routes")
    tokens = _canonical_tokens(engine_runs)
    lines = _canonical_lines(engine_runs)
    engine_regions = _canonical_engine_regions(engine_runs)

    classification = classify_document_family(page_manifest)
    regions: list[dict[str, Any]] = []
    derived_source_links: list[dict[str, Any]] = []
    if attach_regions:
        output_dir = region_output_dir or (PROCESSED_DIR / "vision_debug" / str(page_manifest.get("source_sha256")))
        try:
            region_result = segment_major_regions(
                snapshot={
                    "source_document_id": page_manifest.get("source_document_id"),
                    "source_sha256": page_manifest.get("source_sha256"),
                    "source_pages": _source_pages(page_manifest),
                },
                classification=classification,
                output_dir=output_dir,
            )
            regions = region_result["regions"]
            derived_source_links = [
                link
                for link in region_result.get("derived_source_links", [])
                if isinstance(link, dict)
            ]
        except Exception as exc:
            errors.append(_region_segmentation_error(exc))
    status = (
        "region_segmentation_failed"
        if any(error.startswith("region_segmentation_error:") for error in errors)
        else "ocr_unavailable"
        if errors
        else "ocr_complete"
    )

    snapshot = {
        "snapshot_kind": "vision_layout_v3",
        "pipeline_version": PIPELINE_VERSION,
        "status": status,
        "document_family": classification["document_family"],
        "family_classification": classification,
        "source_sha256": page_manifest.get("source_sha256"),
        "source_type": page_manifest.get("source_type"),
        "calendar_group_key": page_manifest.get("calendar_group_key"),
        "edition": page_manifest.get("edition"),
        "config_hash": config["config_hash"],
        "config": config,
        "runtime_lineage": runtime_lineage,
        "render_config": page_manifest.get("render_config", {}),
        "source_pages": _source_pages(page_manifest),
        "engine_runs": engine_runs,
        "regions": regions,
        "derived_source_links": derived_source_links,
        "engine_regions": engine_regions,
        "lines": lines,
        "tokens": tokens,
        "errors": errors,
    }
    for field in SOURCE_METADATA_FIELDS:
        if field in page_manifest:
            snapshot[field] = page_manifest[field]
    snapshot_quality = compute_snapshot_quality(snapshot)
    snapshot_quality.update(
        {
            "ocr_success": any(run.get("status") == "success" for run in engine_runs),
            "structured_error_count": len(errors),
        }
    )
    snapshot["quality"] = snapshot_quality
    if write_debug_overlays:
        snapshot["debug_overlays"] = _write_debug_overlay_artifacts(
            snapshot,
            output_dir=debug_output_dir or (PROCESSED_DIR / "vision_debug"),
        )
    return snapshot


def snapshot_output_path(snapshot: dict[str, Any], *, output_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    source_sha256 = str(snapshot.get("source_sha256") or "unknown")
    return output_dir / f"{source_sha256}.vision.json"


def activity_layout_snapshot_row_from_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    if snapshot.get("snapshot_kind") != "vision_layout_v3":
        raise ValueError("unsupported_snapshot_kind")
    content_sha256 = str(snapshot.get("source_sha256") or "").strip()
    if not content_sha256:
        raise ValueError("missing_source_sha256")
    parser_version = str(snapshot.get("pipeline_version") or PIPELINE_VERSION).strip()
    source_pages = snapshot.get("source_pages") if isinstance(snapshot.get("source_pages"), list) else []
    page_count = len(source_pages)
    if page_count < 1:
        raise ValueError("missing_source_pages")
    return {
        "source_document_id": snapshot.get("source_document_id"),
        "content_sha256": content_sha256,
        "parser_version": parser_version,
        "snapshot_json": snapshot,
        "page_count": page_count,
    }


def activity_layout_snapshot_rows_from_report(report: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for result in report.get("results") or []:
        if not isinstance(result, dict):
            continue
        snapshot_path = result.get("snapshot_path")
        if not snapshot_path:
            continue
        snapshot = json.loads(Path(str(snapshot_path)).read_text())
        if isinstance(snapshot, dict):
            rows.append(activity_layout_snapshot_row_from_snapshot(snapshot))
    return rows


def upsert_activity_layout_snapshots_from_report(db: Any, report: dict[str, Any]) -> dict[str, int]:
    rows = activity_layout_snapshot_rows_from_report(report)
    if rows:
        db.upsert(
            "activity_layout_snapshots",
            rows,
            on_conflict=ACTIVITY_LAYOUT_SNAPSHOTS_CONFLICT,
        )
    return {"activity_layout_snapshots": len(rows)}


def _page_manifest_paths(page_images_dir: Path) -> list[Path]:
    if not page_images_dir.exists():
        return []
    return sorted(page_images_dir.rglob("page_manifest.json"))


def _manifest_matches_filters(
    page_manifest: dict[str, Any],
    *,
    group: str | None,
    quarter: str | None,
) -> bool:
    if group and page_manifest.get("calendar_group_key") != group:
        return False
    edition = str(page_manifest.get("edition") or "")
    if not edition_matches_quarter(edition, quarter):
        return False
    return True


def build_vision_snapshots_from_directory(
    *,
    page_images_dir: Path = DEFAULT_PAGE_IMAGES_DIR,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    report_path: Path | None = DEFAULT_REPORT_PATH,
    group: str | None = None,
    quarter: str | None = None,
    attach_regions: bool = False,
    write_debug_overlays: bool = True,
    debug_output_dir: Path | None = None,
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    for manifest_path in _page_manifest_paths(page_images_dir):
        started_at = time.perf_counter()
        try:
            page_manifest = json.loads(manifest_path.read_text())
            if not _manifest_matches_filters(page_manifest, group=group, quarter=quarter):
                continue
            snapshot = build_vision_snapshot(
                page_manifest=page_manifest,
                attach_regions=attach_regions,
                write_debug_overlays=write_debug_overlays,
                debug_output_dir=debug_output_dir,
            )
            output_path = snapshot_output_path(snapshot, output_dir=output_dir)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(snapshot, indent=2, sort_keys=True) + "\n")
            results.append(
                {
                    "status": snapshot["status"],
                    "page_manifest_path": str(manifest_path),
                    "snapshot_path": str(output_path),
                    "source_sha256": snapshot.get("source_sha256"),
                    "calendar_group_key": snapshot.get("calendar_group_key"),
                    "edition": snapshot.get("edition"),
                    "document_family": snapshot.get("document_family"),
                    "ocr_success": snapshot.get("quality", {}).get("ocr_success"),
                    "debug_overlay_path": snapshot.get("debug_overlays", {}).get("primary", {}).get("overlay_path"),
                    "error": None,
                    "ocr_elapsed_seconds": time.perf_counter() - started_at,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "status": "parser_error",
                    "page_manifest_path": str(manifest_path),
                    "snapshot_path": None,
                    "source_sha256": None,
                    "calendar_group_key": None,
                    "edition": None,
                    "document_family": None,
                    "ocr_success": False,
                    "debug_overlay_path": None,
                    "error": str(exc),
                    "ocr_elapsed_seconds": time.perf_counter() - started_at,
                }
            )

    snapshot_results = [result for result in results if result["snapshot_path"]]
    ocr_elapsed_seconds = sum(float(result.get("ocr_elapsed_seconds") or 0.0) for result in snapshot_results)
    report = {
        "report_kind": "v3_vision_snapshot",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "page_images_dir": str(page_images_dir),
        "output_dir": str(output_dir),
        "quarter": quarter,
        "group": group,
        "summary": {
            "page_manifest_count": len(results),
            "snapshot_count": sum(1 for result in results if result["snapshot_path"]),
            "parser_error_count": sum(1 for result in results if result["status"] == "parser_error"),
            "ocr_elapsed_seconds": ocr_elapsed_seconds,
            "average_ocr_time_per_page_seconds": (
                ocr_elapsed_seconds / len(snapshot_results) if snapshot_results else None
            ),
        },
        "results": results,
    }
    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    return report


def _snapshot_matches_filters(
    snapshot: dict[str, Any],
    *,
    group: str | None,
    quarter: str | None,
) -> bool:
    if group and snapshot.get("calendar_group_key") != group:
        return False
    edition = str(snapshot.get("edition") or "")
    if not edition_matches_quarter(edition, quarter):
        return False
    return True


def _vision_snapshot_report_result(
    *,
    snapshot: dict[str, Any],
    snapshot_path: Path,
    page_manifest_path: str | None = None,
    ocr_elapsed_seconds: float | None = None,
) -> dict[str, Any]:
    return {
        "status": snapshot.get("status"),
        "page_manifest_path": page_manifest_path,
        "snapshot_path": str(snapshot_path),
        "source_sha256": snapshot.get("source_sha256"),
        "calendar_group_key": snapshot.get("calendar_group_key"),
        "edition": snapshot.get("edition"),
        "document_family": snapshot.get("document_family"),
        "ocr_success": snapshot.get("quality", {}).get("ocr_success"),
        "debug_overlay_path": snapshot.get("debug_overlays", {}).get("primary", {}).get("overlay_path"),
        "error": None,
        "ocr_elapsed_seconds": ocr_elapsed_seconds,
    }


def build_vision_snapshot_report_from_existing_snapshots(
    *,
    snapshots_dir: Path = DEFAULT_OUTPUT_DIR,
    report_path: Path | None = DEFAULT_REPORT_PATH,
    group: str | None = None,
    quarter: str | None = None,
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    for snapshot_path in sorted(snapshots_dir.glob("*.vision.json")):
        try:
            snapshot = json.loads(snapshot_path.read_text())
            if not isinstance(snapshot, dict):
                raise ValueError("snapshot_json_must_be_object")
            if not _snapshot_matches_filters(snapshot, group=group, quarter=quarter):
                continue
            results.append(
                _vision_snapshot_report_result(
                    snapshot=snapshot,
                    snapshot_path=snapshot_path,
                    ocr_elapsed_seconds=snapshot.get("ocr_elapsed_seconds"),
                )
            )
        except Exception as exc:
            results.append(
                {
                    "status": "parser_error",
                    "page_manifest_path": None,
                    "snapshot_path": None,
                    "snapshot_file_path": str(snapshot_path),
                    "source_sha256": None,
                    "calendar_group_key": None,
                    "edition": None,
                    "document_family": None,
                    "ocr_success": False,
                    "debug_overlay_path": None,
                    "error": str(exc),
                    "ocr_elapsed_seconds": None,
                }
            )

    snapshot_results = [result for result in results if result["snapshot_path"]]
    timed_results = [
        result
        for result in snapshot_results
        if isinstance(result.get("ocr_elapsed_seconds"), (int, float))
    ]
    ocr_elapsed_seconds = (
        sum(float(result["ocr_elapsed_seconds"]) for result in timed_results)
        if timed_results
        else None
    )
    report = {
        "report_kind": "v3_vision_snapshot",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "snapshots_dir": str(snapshots_dir),
        "output_dir": str(snapshots_dir),
        "quarter": quarter,
        "group": group,
        "summary": {
            "page_manifest_count": len(results),
            "snapshot_count": len(snapshot_results),
            "parser_error_count": sum(1 for result in results if result["status"] == "parser_error"),
            "ocr_elapsed_seconds": ocr_elapsed_seconds,
            "average_ocr_time_per_page_seconds": (
                ocr_elapsed_seconds / len(timed_results) if timed_results and ocr_elapsed_seconds is not None else None
            ),
        },
        "results": results,
    }
    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    return report


def refresh_snapshot_regions(
    *,
    snapshots_dir: Path = DEFAULT_OUTPUT_DIR,
    report_path: Path | None = DEFAULT_REPORT_PATH,
    group: str | None = None,
    quarter: str | None = None,
    debug_output_dir: Path | None = None,
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    for snapshot_path in sorted(snapshots_dir.glob("*.vision.json")):
        try:
            snapshot = json.loads(snapshot_path.read_text())
            if not isinstance(snapshot, dict) or not _snapshot_matches_filters(snapshot, group=group, quarter=quarter):
                continue
            existing_classification = snapshot.get("family_classification")
            reclassified = classify_document_family(snapshot)
            if reclassified.get("document_family") != "unknown_visual_schedule":
                classification = reclassified
            elif isinstance(existing_classification, dict):
                classification = existing_classification
            else:
                document_family = str(snapshot.get("document_family") or "unknown_visual_schedule")
                classification = {
                    "document_family": document_family,
                    "allow_auto_publish": document_family != "unknown_visual_schedule",
                }
            snapshot["document_family"] = classification.get("document_family")
            snapshot["family_classification"] = classification
            source_hash = str(snapshot.get("source_sha256") or snapshot_path.stem.replace(".vision", ""))
            region_result = segment_major_regions(
                snapshot={
                    "source_document_id": snapshot.get("source_document_id"),
                    "source_sha256": snapshot.get("source_sha256"),
                    "source_pages": snapshot.get("source_pages") if isinstance(snapshot.get("source_pages"), list) else [],
                },
                classification=classification,
                output_dir=(debug_output_dir or (PROCESSED_DIR / "vision_debug")) / source_hash,
                qr_decoder=lambda _: [],
            )
            snapshot["regions"] = region_result["regions"]
            existing_derived_links = snapshot.get("derived_source_links")
            snapshot["derived_source_links"] = (
                [link for link in existing_derived_links if isinstance(link, dict)]
                if isinstance(existing_derived_links, list)
                else []
            )
            snapshot_path.write_text(json.dumps(snapshot, indent=2, sort_keys=True) + "\n")
            results.append(
                {
                    "status": "refreshed",
                    "snapshot_path": str(snapshot_path),
                    "source_sha256": snapshot.get("source_sha256"),
                    "calendar_group_key": snapshot.get("calendar_group_key"),
                    "edition": snapshot.get("edition"),
                    "document_family": snapshot.get("document_family"),
                    "region_count": len(snapshot["regions"]),
                    "error": None,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "status": "parser_error",
                    "snapshot_path": str(snapshot_path),
                    "source_sha256": None,
                    "calendar_group_key": None,
                    "edition": None,
                    "document_family": None,
                    "region_count": 0,
                    "error": str(exc),
                }
            )

    report = {
        "report_kind": "v3_vision_snapshot_region_refresh",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "snapshots_dir": str(snapshots_dir),
        "quarter": quarter,
        "group": group,
        "summary": {
            "snapshot_count": len(results),
            "refreshed_count": sum(1 for result in results if result["status"] == "refreshed"),
            "parser_error_count": sum(1 for result in results if result["status"] == "parser_error"),
        },
        "results": results,
    }
    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Build v3 vision snapshot envelope")
    parser.add_argument("page_manifest", type=Path, nargs="?")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--page-images-dir", type=Path, default=DEFAULT_PAGE_IMAGES_DIR)
    parser.add_argument("--report-path", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--group")
    parser.add_argument("--quarter")
    parser.add_argument("--attach-regions", action="store_true")
    parser.add_argument(
        "--refresh-regions-only",
        action="store_true",
        help="Refresh region crops in existing snapshots without rerunning OCR",
    )
    parser.add_argument(
        "--report-existing-snapshots",
        action="store_true",
        help="Summarize existing snapshot envelopes without rerunning OCR",
    )
    parser.add_argument("--debug-output-dir", type=Path, default=PROCESSED_DIR / "vision_debug")
    parser.add_argument("--no-debug-overlays", action="store_true")
    parser.add_argument(
        "--upsert-layout-snapshots",
        action="store_true",
        help="Upsert v3 snapshot envelopes into activity_layout_snapshots",
    )
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.report_existing_snapshots:
        if args.page_manifest:
            parser.error("--report-existing-snapshots is only supported for batch snapshot files")
        report = build_vision_snapshot_report_from_existing_snapshots(
            snapshots_dir=args.output_dir,
            report_path=args.report_path,
            group=args.group,
            quarter=args.quarter,
        )
        if args.upsert_layout_snapshots:
            report["activity_layout_snapshots_upsert"] = upsert_activity_layout_snapshots_from_report(
                SupabaseClient(),
                report,
            )
        if args.json:
            print(json.dumps(report, indent=2, sort_keys=True))
        else:
            print(args.report_path)
        return

    if args.refresh_regions_only:
        if args.page_manifest:
            parser.error("--refresh-regions-only is only supported for batch snapshot files")
        if args.upsert_layout_snapshots:
            parser.error("--upsert-layout-snapshots is not supported with --refresh-regions-only")
        report = refresh_snapshot_regions(
            snapshots_dir=args.output_dir,
            report_path=args.report_path,
            group=args.group,
            quarter=args.quarter,
            debug_output_dir=args.debug_output_dir,
        )
        if args.json:
            print(json.dumps(report, indent=2, sort_keys=True))
        else:
            print(args.report_path)
        return

    if args.page_manifest:
        if args.upsert_layout_snapshots:
            parser.error("--upsert-layout-snapshots is only supported for batch snapshot generation")
        page_manifest = json.loads(args.page_manifest.read_text())
        snapshot = build_vision_snapshot(
            page_manifest=page_manifest,
            attach_regions=args.attach_regions,
            write_debug_overlays=not args.no_debug_overlays,
            debug_output_dir=args.debug_output_dir,
        )
        if args.json:
            print(json.dumps(snapshot, indent=2, sort_keys=True))
            return
        output_path = snapshot_output_path(snapshot, output_dir=args.output_dir)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(snapshot, indent=2, sort_keys=True) + "\n")
        print(output_path)
        return

    report = build_vision_snapshots_from_directory(
        page_images_dir=args.page_images_dir,
        output_dir=args.output_dir,
        report_path=args.report_path,
        group=args.group,
        quarter=args.quarter,
        attach_regions=args.attach_regions,
        write_debug_overlays=not args.no_debug_overlays,
        debug_output_dir=args.debug_output_dir,
    )
    if args.upsert_layout_snapshots:
        report["activity_layout_snapshots_upsert"] = upsert_activity_layout_snapshots_from_report(
            SupabaseClient(),
            report,
        )
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(args.report_path)


if __name__ == "__main__":
    main()
