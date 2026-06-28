"""Normalized OCR schema helpers for vision v3."""

from __future__ import annotations

import re
from typing import Any


def normalize_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip()).lower()


def _bbox_px(value: Any) -> list[int] | None:
    if isinstance(value, list) and len(value) == 4 and all(isinstance(item, (int, float)) for item in value):
        x1, y1, x2, y2 = value
        return [round(x1), round(y1), round(x2), round(y2)]
    if isinstance(value, list) and value and all(isinstance(point, (list, tuple)) and len(point) >= 2 for point in value):
        xs = [float(point[0]) for point in value]
        ys = [float(point[1]) for point in value]
        return [round(min(xs)), round(min(ys)), round(max(xs)), round(max(ys))]
    return None


def normalize_ocr_tokens(
    raw_tokens: list[dict[str, Any]],
    *,
    engine: str,
    page_number: int,
    page_image_sha256: str,
) -> list[dict[str, Any]]:
    tokens: list[dict[str, Any]] = []
    for index, raw in enumerate(raw_tokens, start=1):
        if not isinstance(raw, dict):
            continue
        text = str(raw.get("text") or "").strip()
        bbox = _bbox_px(raw.get("bbox") or raw.get("bbox_px"))
        if not text or bbox is None:
            continue
        tokens.append(
            {
                "engine": engine,
                "page_number": page_number,
                "page_image_sha256": page_image_sha256,
                "token_text": text,
                "text": text,
                "normalized_text": normalize_text(text),
                "bbox_px": bbox,
                "confidence": raw.get("confidence"),
                "line_number": raw.get("line_number"),
                "reading_order": raw.get("reading_order", index),
            }
        )
    return tokens
