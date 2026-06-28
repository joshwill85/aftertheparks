"""Generate deterministic debug overlay images for v3 review artifacts."""

from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw


REGION_COLOR = (217, 95, 2)
ENGINE_COLORS = {
    "paddleocr_ppstructurev3": (27, 94, 170),
    "rapidocr": (35, 132, 67),
    "docling_snapshot": (117, 79, 150),
}


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _safe_name(value: object) -> str:
    text = re.sub(r"[^a-zA-Z0-9_-]+", "_", str(value or "unknown")).strip("_")
    return text or "unknown"


def _bbox(value: Any) -> tuple[int, int, int, int] | None:
    if isinstance(value, list) and len(value) == 4 and all(isinstance(item, (int, float)) for item in value):
        x1, y1, x2, y2 = [round(float(item)) for item in value]
        if x1 < x2 and y1 < y2:
            return (x1, y1, x2, y2)
    return None


def _pages(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    pages = snapshot.get("source_pages")
    return [page for page in pages if isinstance(page, dict)] if isinstance(pages, list) else []


def _draw_boxes(
    *,
    page: dict[str, Any],
    boxes: list[dict[str, Any]],
    output_path: Path,
    color: tuple[int, int, int],
    label_key: str,
) -> dict[str, Any]:
    page_path = Path(str(page.get("page_image_path") or ""))
    if not page_path.exists():
        raise FileNotFoundError(page_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(page_path) as image:
        canvas = image.convert("RGB")
        draw = ImageDraw.Draw(canvas)
        for item in boxes:
            bbox = _bbox(item.get("bbox_px"))
            if bbox is None:
                continue
            draw.rectangle(bbox, outline=color, width=2)
            label = str(item.get(label_key) or item.get("text") or item.get("region_type") or "")
            if label:
                draw.text((bbox[0] + 2, bbox[1] + 2), label[:40], fill=color)
        canvas.save(output_path, "PNG")
    return {
        "page_number": page.get("page_number"),
        "page_image_sha256": page.get("page_image_sha256"),
        "overlay_path": str(output_path),
        "overlay_sha256": _sha256_file(output_path),
        "box_count": len(boxes),
    }


def _items_for_page(items: list[dict[str, Any]], page_number: int) -> list[dict[str, Any]]:
    return [item for item in items if int(item.get("page_number") or 0) == page_number]


def build_debug_overlays(snapshot: dict[str, Any], *, output_dir: Path) -> dict[str, Any]:
    output_dir = Path(output_dir)
    pages = _pages(snapshot)
    regions = [
        region for region in snapshot.get("regions", [])
        if isinstance(region, dict)
    ]
    engine_runs = [
        run for run in snapshot.get("engine_runs", [])
        if isinstance(run, dict)
    ]

    region_overlays: list[dict[str, Any]] = []
    engine_overlays: dict[str, list[dict[str, Any]]] = {}
    for page in pages:
        page_number = int(page.get("page_number") or 0)
        region_overlays.append(
            _draw_boxes(
                page=page,
                boxes=_items_for_page(regions, page_number),
                output_path=output_dir / f"page_{page_number:03d}_regions.png",
                color=REGION_COLOR,
                label_key="region_type",
            )
        )
        for run in engine_runs:
            engine = str(run.get("engine") or "unknown")
            tokens = [
                token for token in run.get("tokens", [])
                if isinstance(token, dict)
            ]
            engine_overlays.setdefault(engine, []).append(
                _draw_boxes(
                    page=page,
                    boxes=_items_for_page(tokens, page_number),
                    output_path=output_dir / f"page_{page_number:03d}_{_safe_name(engine)}.png",
                    color=ENGINE_COLORS.get(engine, (90, 90, 90)),
                    label_key="text",
                )
            )

    return {
        "source_sha256": snapshot.get("source_sha256"),
        "regions": region_overlays,
        "engines": engine_overlays,
    }
