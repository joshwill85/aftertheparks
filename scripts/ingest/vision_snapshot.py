"""Build v3 vision snapshot envelopes from canonical page manifests."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
from typing import Any

try:
    from config import PROCESSED_DIR
    from family_classifier import classify_document_family
    from normalization_v3 import build_runtime_lineage
    from ocr.base import package_version
    from ocr.docling_adapter import DoclingAdapter
    from ocr.paddle_adapter import PaddleOcrAdapter
    from ocr.rapidocr_adapter import RapidOcrAdapter
    from quality_metrics import compute_snapshot_quality
    from regions import segment_major_regions
    from render_source_pages import stable_config_hash
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR
    from .family_classifier import classify_document_family
    from .normalization_v3 import build_runtime_lineage
    from .ocr.base import package_version
    from .ocr.docling_adapter import DoclingAdapter
    from .ocr.paddle_adapter import PaddleOcrAdapter
    from .ocr.rapidocr_adapter import RapidOcrAdapter
    from .quality_metrics import compute_snapshot_quality
    from .regions import segment_major_regions
    from .render_source_pages import stable_config_hash


DEFAULT_OUTPUT_DIR = PROCESSED_DIR / "vision_snapshots"
PIPELINE_VERSION = "vision_v3_001"
PRIMARY_ENGINE = "paddleocr_ppstructurev3"
SECONDARY_ENGINE = "rapidocr"


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


def build_vision_snapshot(
    *,
    page_manifest: dict[str, Any],
    attach_regions: bool = False,
    region_output_dir: Path | None = None,
) -> dict[str, Any]:
    config = {
        "pipeline_version": PIPELINE_VERSION,
        "primary_engine": PRIMARY_ENGINE,
        "secondary_engine": SECONDARY_ENGINE,
        "docling_snapshot_enabled": True,
        "surya_enabled": False,
        "engine_choice": "fixed_config",
    }
    config["config_hash"] = stable_config_hash(config)
    runtime_lineage = build_runtime_lineage(
        config=config,
        package_versions=_package_versions(),
        model_asset_hashes={},
        git_sha=_git_sha(),
        container_image_digest=os.environ.get("CONTAINER_IMAGE_DIGEST"),
    )

    engine_runs = [
        PaddleOcrAdapter().run_page(page)
        for page in _source_pages(page_manifest)
    ]
    engine_runs.extend(RapidOcrAdapter().run_page(page) for page in _source_pages(page_manifest))
    if config["docling_snapshot_enabled"]:
        engine_runs.extend(DoclingAdapter().run_page(page) for page in _source_pages(page_manifest))
    errors = [
        run["error"]
        for run in engine_runs
        if isinstance(run.get("error"), str) and run["error"]
    ]
    tokens = _canonical_tokens(engine_runs)
    status = "ocr_unavailable" if errors else "ocr_complete"

    classification = classify_document_family(page_manifest)
    regions: list[dict[str, Any]] = []
    if attach_regions:
        output_dir = region_output_dir or (PROCESSED_DIR / "vision_debug" / str(page_manifest.get("source_sha256")))
        region_result = segment_major_regions(
            snapshot={
                "source_sha256": page_manifest.get("source_sha256"),
                "source_pages": _source_pages(page_manifest),
            },
            classification=classification,
            output_dir=output_dir,
        )
        regions = region_result["regions"]

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
        "tokens": tokens,
        "errors": errors,
    }
    snapshot_quality = compute_snapshot_quality(snapshot)
    snapshot_quality.update(
        {
            "ocr_success": any(run.get("status") == "success" for run in engine_runs),
            "structured_error_count": len(errors),
        }
    )
    snapshot["quality"] = snapshot_quality
    return snapshot


def snapshot_output_path(snapshot: dict[str, Any], *, output_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    source_sha256 = str(snapshot.get("source_sha256") or "unknown")
    return output_dir / f"{source_sha256}.vision.json"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build v3 vision snapshot envelope")
    parser.add_argument("page_manifest", type=Path)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    page_manifest = json.loads(args.page_manifest.read_text())
    snapshot = build_vision_snapshot(page_manifest=page_manifest)
    if args.json:
        print(json.dumps(snapshot, indent=2, sort_keys=True))
        return
    output_path = snapshot_output_path(snapshot, output_dir=args.output_dir)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(snapshot, indent=2, sort_keys=True) + "\n")
    print(output_path)


if __name__ == "__main__":
    main()
