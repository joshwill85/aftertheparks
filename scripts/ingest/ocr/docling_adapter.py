"""Docling parallel snapshot adapter for vision v3."""

from __future__ import annotations

import importlib
from typing import Any

from .base import UnavailableOcrAdapter, module_available
from .schema import normalize_ocr_tokens


def _document_converter_class() -> Any:
    module = importlib.import_module("docling.document_converter")
    return getattr(module, "DocumentConverter")


def _make_document_converter() -> Any:
    return _document_converter_class()()


def _number(value: Any) -> float | None:
    return value if isinstance(value, (int, float)) else None


def _bbox_from_value(value: Any) -> Any:
    if hasattr(value, "tolist"):
        value = value.tolist()
    if isinstance(value, dict):
        if all(key in value for key in ("l", "t", "r", "b")):
            return [value.get("l"), value.get("t"), value.get("r"), value.get("b")]
        if all(key in value for key in ("left", "top", "right", "bottom")):
            return [value.get("left"), value.get("top"), value.get("right"), value.get("bottom")]
        if all(key in value for key in ("x1", "y1", "x2", "y2")):
            return [value.get("x1"), value.get("y1"), value.get("x2"), value.get("y2")]
    return value


def _first_present(payload: dict[str, Any], keys: tuple[str, ...]) -> Any:
    for key in keys:
        if key in payload and payload[key] is not None:
            return payload[key]
    return None


def _bbox_from_item(item: dict[str, Any]) -> Any:
    bbox = _first_present(item, ("bbox", "bbox_px", "box"))
    if bbox is not None:
        return _bbox_from_value(bbox)
    provenance = item.get("prov") or item.get("provenance")
    if isinstance(provenance, list) and provenance:
        first = provenance[0]
        if isinstance(first, dict):
            return _bbox_from_value(first.get("bbox") or first.get("box"))
    return None


def _page_from_item(item: dict[str, Any], fallback_page: int) -> int:
    page_number = _first_present(item, ("page_number", "page_no"))
    provenance = item.get("prov") or item.get("provenance")
    if page_number is None and isinstance(provenance, list) and provenance:
        first = provenance[0]
        if isinstance(first, dict):
            page_number = first.get("page_number") or first.get("page_no")
    return int(page_number or fallback_page)


def _append_docling_token(
    raw_tokens: list[dict[str, Any]],
    *,
    item: dict[str, Any],
    fallback_page: int,
) -> None:
    text = _first_present(item, ("text", "orig", "label"))
    bbox = _bbox_from_item(item)
    if not str(text or "").strip() or bbox is None:
        return
    raw_tokens.append(
        {
            "bbox": bbox,
            "text": text,
            "confidence": _number(item.get("confidence") or item.get("score")),
            "page_number": _page_from_item(item, fallback_page),
        }
    )


def _extract_raw_tokens(payload: Any, *, fallback_page: int) -> list[dict[str, Any]]:
    raw_tokens: list[dict[str, Any]] = []

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            _append_docling_token(raw_tokens, item=value, fallback_page=fallback_page)
            for child in value.values():
                if isinstance(child, (dict, list)):
                    visit(child)
            return
        if isinstance(value, list):
            for child in value:
                visit(child)

    visit(payload)
    return raw_tokens


def _document_export(conversion_result: Any) -> dict[str, Any]:
    document = getattr(conversion_result, "document", conversion_result)
    if hasattr(document, "export_to_dict"):
        exported = document.export_to_dict()
    elif hasattr(document, "export_to_markdown"):
        exported = {"texts": [{"text": document.export_to_markdown()}]}
    else:
        exported = {}
    return exported if isinstance(exported, dict) else {}


class DoclingAdapter(UnavailableOcrAdapter):
    def __init__(self) -> None:
        super().__init__(
            engine="docling_snapshot",
            module_name="docling",
            role="parallel_structural_snapshot",
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
                "error": "ocr_engine_error:docling_snapshot:missing_page_image_path",
            }
        exported = _document_export(_make_document_converter().convert(image_path))
        fallback_page = int(page.get("page_number") or 0)
        tokens = normalize_ocr_tokens(
            _extract_raw_tokens(exported, fallback_page=fallback_page),
            engine=self.engine,
            page_number=fallback_page,
            page_image_sha256=str(page.get("page_image_sha256") or ""),
        )
        return {
            "engine": self.engine,
            "module": self.module_name,
            "role": self.role,
            "status": "success",
            "version": self.version,
            "page_number": page.get("page_number"),
            "page_image_sha256": page.get("page_image_sha256"),
            "tokens": tokens,
            "lines": tokens,
            "regions": tokens,
            "document": exported,
        }
