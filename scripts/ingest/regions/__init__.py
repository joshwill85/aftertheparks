"""Region segmentation scaffolding for vision v3 document families."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, Callable

from PIL import Image

try:
    from qr_decoder import decode_qr_targets
except ImportError:  # pragma: no cover - supports package-style imports
    from ..qr_decoder import decode_qr_targets


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _bbox(width: int, height: int, x1: float, y1: float, x2: float, y2: float) -> list[int]:
    return [
        max(0, min(width, round(width * x1))),
        max(0, min(height, round(height * y1))),
        max(0, min(width, round(width * x2))),
        max(0, min(height, round(height * y2))),
    ]


def _region_specs(document_family: str, width: int, height: int) -> list[tuple[str, list[int]]]:
    if document_family == "aframe_recreation":
        return [
            ("header", _bbox(width, height, 0.00, 0.00, 1.00, 0.13)),
            ("qr_callout", _bbox(width, height, 0.00, 0.13, 0.36, 0.31)),
            ("wellness_section", _bbox(width, height, 0.00, 0.30, 0.50, 0.55)),
            ("resort_activities_section", _bbox(width, height, 0.48, 0.13, 1.00, 0.72)),
            ("movie_section", _bbox(width, height, 0.00, 0.54, 0.62, 0.90)),
            ("footer", _bbox(width, height, 0.00, 0.90, 1.00, 1.00)),
        ]
    if document_family == "vertical_digital_rec_sign":
        return [
            ("header", _bbox(width, height, 0.00, 0.00, 1.00, 0.08)),
            ("day_banner", _bbox(width, height, 0.00, 0.08, 1.00, 0.16)),
            ("vertical_activity_row", _bbox(width, height, 0.00, 0.16, 1.00, 0.92)),
            ("footer", _bbox(width, height, 0.00, 0.92, 1.00, 1.00)),
        ]
    return [
        ("unknown", _bbox(width, height, 0.00, 0.00, 1.00, 1.00)),
    ]


def _first_page(snapshot: dict[str, Any]) -> dict[str, Any]:
    pages = snapshot.get("source_pages")
    if isinstance(pages, list) and pages and isinstance(pages[0], dict):
        return pages[0]
    return {}


def segment_major_regions(
    *,
    snapshot: dict[str, Any],
    classification: dict[str, Any],
    output_dir: Path,
    qr_decoder: Callable[[Path], list[dict[str, Any]]] | None = None,
) -> dict[str, Any]:
    page = _first_page(snapshot)
    page_path = Path(str(page.get("page_image_path") or ""))
    if not page_path.exists():
        raise FileNotFoundError(page_path)

    document_family = str(classification.get("document_family") or "unknown_visual_schedule")
    output_dir.mkdir(parents=True, exist_ok=True)
    regions: list[dict[str, Any]] = []
    with Image.open(page_path) as image:
        width, height = image.size
        for index, (region_type, bbox_px) in enumerate(
            _region_specs(document_family, width, height),
            start=1,
        ):
            crop = image.crop(tuple(bbox_px))
            crop_path = output_dir / f"page_001-region_{index:02d}-{region_type}.png"
            crop.save(crop_path, "PNG")
            crop_sha256 = _sha256_file(crop_path)
            qr_targets: list[dict[str, Any]] = []
            qr_decode_status = None
            if region_type == "qr_callout":
                decoder = qr_decoder or decode_qr_targets
                qr_targets = [
                    {**target, "source_crop_sha256": crop_sha256}
                    for target in decoder(crop_path)
                    if isinstance(target, dict) and target.get("target_url")
                ]
                qr_decode_status = "decoded" if qr_targets else "not_found"
            regions.append(
                {
                    "region_id": f"page-001-region-{index:02d}",
                    "region_type": region_type,
                    "region_family": document_family,
                    "page_number": page.get("page_number", 1),
                    "page_image_sha256": page.get("page_image_sha256"),
                    "bbox_px": bbox_px,
                    "crop_path": str(crop_path),
                    "crop_sha256": crop_sha256,
                    "reading_order": index,
                    "detection_method": "vision_v3_static_family_region_scaffold",
                    "detection_confidence": 0.5 if document_family == "unknown_visual_schedule" else 0.8,
                    "allow_auto_publish": bool(classification.get("allow_auto_publish"))
                    and document_family != "unknown_visual_schedule",
                    **(
                        {
                            "qr_decode_status": qr_decode_status,
                            "qr_targets": qr_targets,
                        }
                        if region_type == "qr_callout"
                        else {}
                    ),
                }
            )

    return {
        "document_family": document_family,
        "allow_auto_publish": bool(classification.get("allow_auto_publish"))
        and document_family != "unknown_visual_schedule",
        "regions": regions,
    }
