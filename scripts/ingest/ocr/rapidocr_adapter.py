"""RapidOCR adapter scaffold for vision v3."""

from __future__ import annotations

from typing import Any

from .base import UnavailableOcrAdapter


class RapidOcrAdapter(UnavailableOcrAdapter):
    def __init__(self) -> None:
        super().__init__(
            engine="rapidocr",
            module_name="rapidocr",
            role="secondary_ocr_comparator",
        )

    def run_page(self, page: dict[str, Any]) -> dict[str, Any]:
        if not self.available:
            return self.unavailable_result(page)
        return {
            **self.unavailable_result(page),
            "status": "not_configured",
            "error": "ocr_engine_not_configured:rapidocr",
        }
