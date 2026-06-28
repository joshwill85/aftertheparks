"""Quality metrics for v3 vision snapshot envelopes."""

from __future__ import annotations

from collections import Counter
from typing import Any


MIN_REVIEWABLE_WIDTH = 800
MIN_REVIEWABLE_HEIGHT = 800


def _list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _page_quality(page: dict[str, Any], findings: list[str]) -> dict[str, Any]:
    page_number = int(page.get("page_number") or 0)
    width = int(page.get("width_px") or 0)
    height = int(page.get("height_px") or 0)
    if not page.get("page_image_sha256"):
        findings.append(f"missing_page_image_hash:page_{page_number}")
    if width < MIN_REVIEWABLE_WIDTH or height < MIN_REVIEWABLE_HEIGHT:
        findings.append(f"low_quality_image:page_{page_number}")
    return {
        "page_number": page_number,
        "page_image_sha256": page.get("page_image_sha256"),
        "width_px": width,
        "height_px": height,
        "reviewable_resolution": width >= MIN_REVIEWABLE_WIDTH and height >= MIN_REVIEWABLE_HEIGHT,
        "coordinate_contract": {
            "units": "pixels",
            "origin": "top_left",
            "bbox_format": "[x1,y1,x2,y2]",
            "bbox_reference": "canonical_page_image",
        },
    }


def compute_snapshot_quality(snapshot: dict[str, Any]) -> dict[str, Any]:
    findings: list[str] = []
    pages = [page for page in _list(snapshot.get("source_pages")) if isinstance(page, dict)]
    engine_runs = [run for run in _list(snapshot.get("engine_runs")) if isinstance(run, dict)]
    regions = _list(snapshot.get("regions"))
    tokens = _list(snapshot.get("tokens"))

    engine_status_counts = Counter(str(run.get("status") or "unknown") for run in engine_runs)
    engine_token_counts = {
        str(run.get("engine") or "unknown"): len(_list(run.get("tokens")))
        for run in engine_runs
    }

    if not pages:
        findings.append("missing_source_pages")
    if not regions:
        findings.append("missing_regions")
    if not tokens and not any(engine_token_counts.values()):
        findings.append("missing_ocr_tokens")

    return {
        "page_count": len(pages),
        "region_count": len(regions),
        "token_count": len(tokens),
        "engine_status_counts": dict(sorted(engine_status_counts.items())),
        "engine_token_counts": dict(sorted(engine_token_counts.items())),
        "pages": [_page_quality(page, findings) for page in pages],
        "findings": list(dict.fromkeys(findings)),
    }
