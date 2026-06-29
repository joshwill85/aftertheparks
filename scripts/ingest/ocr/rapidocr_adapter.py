"""RapidOCR adapter for vision v3."""

from __future__ import annotations

import importlib
from typing import Any

from .base import UnavailableOcrAdapter, module_available
from .schema import normalize_ocr_tokens


def _rapid_ocr_class() -> Any:
    module = importlib.import_module("rapidocr")
    return getattr(module, "RapidOCR")


def _make_rapid_ocr() -> Any:
    return _rapid_ocr_class()()


def _number(value: Any) -> float | None:
    return value if isinstance(value, (int, float)) else None


def _looks_like_bbox(value: Any) -> bool:
    if hasattr(value, "tolist"):
        value = value.tolist()
    if not isinstance(value, list):
        return False
    if len(value) == 4 and all(isinstance(item, (int, float)) for item in value):
        return True
    return bool(
        value
        and all(isinstance(point, (list, tuple)) and len(point) >= 2 for point in value)
        and all(isinstance(point[0], (int, float)) and isinstance(point[1], (int, float)) for point in value)
    )


def _append_raw_token(raw_tokens: list[dict[str, Any]], *, bbox: Any, text: Any, confidence: Any) -> None:
    if not str(text or "").strip():
        return
    raw_tokens.append({"bbox": bbox, "text": text, "confidence": _number(confidence)})


def _first_present(payload: dict[str, Any], keys: tuple[str, ...]) -> Any:
    for key in keys:
        if key in payload and payload[key] is not None:
            return payload[key]
    return None


def _extract_result_payload(payload: Any) -> Any:
    if isinstance(payload, tuple) and payload:
        return payload[0]
    if hasattr(payload, "to_json"):
        return payload.to_json()
    return payload


def _extract_elapsed_seconds(payload: Any) -> float | None:
    if isinstance(payload, tuple) and len(payload) >= 2 and isinstance(payload[1], (int, float)):
        return float(payload[1])
    return None


def _extract_dict_tokens(payload: dict[str, Any], raw_tokens: list[dict[str, Any]]) -> bool:
    texts = _first_present(payload, ("txts", "texts", "rec_texts"))
    if isinstance(texts, list):
        boxes = _first_present(payload, ("boxes", "dt_boxes", "rec_polys")) or []
        scores = _first_present(payload, ("scores", "rec_scores")) or []
        for index, text in enumerate(texts):
            bbox = boxes[index] if isinstance(boxes, list) and index < len(boxes) else None
            confidence = scores[index] if isinstance(scores, list) and index < len(scores) else None
            _append_raw_token(raw_tokens, bbox=bbox, text=text, confidence=confidence)
        return True

    text = _first_present(payload, ("text", "txt", "rec_text"))
    bbox = _first_present(payload, ("bbox", "bbox_px", "box", "points"))
    confidence = _first_present(payload, ("confidence", "score", "rec_score"))
    if text and bbox is not None:
        _append_raw_token(raw_tokens, bbox=bbox, text=text, confidence=confidence)
        return True
    return False


def _extract_raw_tokens(payload: Any) -> list[dict[str, Any]]:
    raw_tokens: list[dict[str, Any]] = []

    def visit(value: Any) -> None:
        value = _extract_result_payload(value)
        if isinstance(value, dict):
            if _extract_dict_tokens(value, raw_tokens):
                return
            for child_key in ("result", "results", "data"):
                if child_key in value:
                    visit(value[child_key])
            return
        if not isinstance(value, list):
            return
        if len(value) >= 3 and _looks_like_bbox(value[0]) and isinstance(value[1], str):
            _append_raw_token(raw_tokens, bbox=value[0], text=value[1], confidence=value[2])
            return
        if len(value) >= 2 and _looks_like_bbox(value[0]) and isinstance(value[1], (list, tuple)):
            if len(value[1]) >= 2:
                _append_raw_token(raw_tokens, bbox=value[0], text=value[1][0], confidence=value[1][1])
                return
        for child in value:
            visit(child)

    visit(payload)
    return raw_tokens


class RapidOcrAdapter(UnavailableOcrAdapter):
    def __init__(self) -> None:
        super().__init__(
            engine="rapidocr",
            module_name="rapidocr",
            role="secondary_ocr_comparator",
        )

    @property
    def available(self) -> bool:
        return module_available(self.module_name)

    def run_page(self, page: dict[str, Any]) -> dict[str, Any]:
        if not self.available:
            return self.unavailable_result(page)
        image_path = str(page.get("page_image_path") or "").strip()
        if not image_path:
            return {
                **self.unavailable_result(page),
                "status": "error",
                "error": "ocr_engine_error:rapidocr:missing_page_image_path",
            }
        raw_result = _make_rapid_ocr()(image_path)
        tokens = normalize_ocr_tokens(
            _extract_raw_tokens(raw_result),
            engine=self.engine,
            page_number=int(page.get("page_number") or 0),
            page_image_sha256=str(page.get("page_image_sha256") or ""),
        )
        result = {
            "engine": self.engine,
            "module": self.module_name,
            "role": self.role,
            "status": "success",
            "version": self.version,
            "page_number": page.get("page_number"),
            "page_image_sha256": page.get("page_image_sha256"),
            "tokens": tokens,
            "lines": tokens,
            "regions": [],
        }
        elapsed_seconds = _extract_elapsed_seconds(raw_result)
        if elapsed_seconds is not None:
            result["elapsed_seconds"] = elapsed_seconds
        return {
            **result,
        }
