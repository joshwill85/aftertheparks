"""PaddleOCR adapter scaffold for vision v3."""

from __future__ import annotations

from typing import Any

from .base import UnavailableOcrAdapter


class PaddleOcrAdapter(UnavailableOcrAdapter):
    def __init__(self) -> None:
        super().__init__(
            engine="paddleocr_ppstructurev3",
            module_name="paddleocr",
            role="primary_ocr_layout",
        )

    def run_page(self, page: dict[str, Any]) -> dict[str, Any]:
        if not self.available:
            return self.unavailable_result(page)
        return {
            **self.unavailable_result(page),
            "status": "not_configured",
            "error": "ocr_engine_not_configured:paddleocr_ppstructurev3",
        }
