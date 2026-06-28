"""Field evidence object builders for vision v3 extraction."""

from __future__ import annotations

from typing import Any


def _engine_payload(engine: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(engine, dict):
        return None
    return {
        "engine": engine.get("engine"),
        "text": engine.get("text"),
        "confidence": engine.get("confidence"),
    }


def build_field_evidence(
    *,
    field: str,
    raw_value: Any,
    normalized_value: Any,
    content_sha256: str,
    region: dict[str, Any],
    primary_engine: dict[str, Any] | None = None,
    secondary_engine: dict[str, Any] | None = None,
    agreement: str = "not_evaluated",
    review_status: str = "required",
) -> dict[str, Any]:
    engines = [
        payload
        for payload in (
            _engine_payload(primary_engine),
            _engine_payload(secondary_engine),
        )
        if payload is not None
    ]
    return {
        "field": field,
        "raw_value": raw_value,
        "normalized_value": normalized_value,
        "source": {
            "content_sha256": content_sha256,
            "page_number": region.get("page_number"),
            "region_id": region.get("region_id"),
            "bbox_px": region.get("bbox_px"),
            "crop_sha256": region.get("crop_sha256"),
            "crop_storage_path": region.get("crop_path") or region.get("crop_storage_path"),
            "page_image_sha256": region.get("page_image_sha256"),
            "page_image_path": region.get("page_image_path"),
        },
        "engines": engines,
        "agreement": agreement,
        "review_status": review_status,
    }
