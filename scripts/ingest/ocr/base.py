"""Shared OCR adapter helpers."""

from __future__ import annotations

import importlib.metadata
import importlib.util
from dataclasses import dataclass
from typing import Any


def module_available(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


def package_version(package_name: str) -> str | None:
    try:
        return importlib.metadata.version(package_name)
    except importlib.metadata.PackageNotFoundError:
        return None


@dataclass(frozen=True)
class UnavailableOcrAdapter:
    engine: str
    module_name: str
    role: str

    @property
    def available(self) -> bool:
        return module_available(self.module_name)

    @property
    def version(self) -> str | None:
        return package_version(self.module_name)

    def unavailable_result(self, page: dict[str, Any]) -> dict[str, Any]:
        return {
            "engine": self.engine,
            "module": self.module_name,
            "role": self.role,
            "status": "unavailable",
            "version": self.version,
            "page_number": page.get("page_number"),
            "page_image_sha256": page.get("page_image_sha256"),
            "tokens": [],
            "lines": [],
            "regions": [],
            "error": f"ocr_engine_unavailable:{self.engine}",
        }
