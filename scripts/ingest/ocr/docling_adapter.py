"""Docling parallel snapshot adapter scaffold for vision v3."""

from __future__ import annotations

from typing import Any

from .base import UnavailableOcrAdapter


class DoclingAdapter(UnavailableOcrAdapter):
    def __init__(self) -> None:
        super().__init__(
            engine="docling_snapshot",
            module_name="docling",
            role="parallel_structural_snapshot",
        )

    def run_page(self, page: dict[str, Any]) -> dict[str, Any]:
        if not self.available:
            return self.unavailable_result(page)
        return {
            **self.unavailable_result(page),
            "status": "not_configured",
            "error": "ocr_engine_not_configured:docling_snapshot",
        }
