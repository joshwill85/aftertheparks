"""Controlled location dictionary contract for vision v3 extraction."""

from __future__ import annotations

from typing import Any

try:
    from normalization_v3 import CONTROLLED_LOCATIONS, normalize_location_text
except ImportError:  # pragma: no cover - supports package-style imports
    from .normalization_v3 import CONTROLLED_LOCATIONS, normalize_location_text


def lookup_location(value: object) -> dict[str, Any]:
    return normalize_location_text(value)


__all__ = ["CONTROLLED_LOCATIONS", "lookup_location"]
