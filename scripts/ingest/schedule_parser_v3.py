"""Schedule parser contract for vision v3 extraction."""

from __future__ import annotations

from typing import Any

try:
    from normalization_v3 import normalize_schedule_text
except ImportError:  # pragma: no cover - supports package-style imports
    from .normalization_v3 import normalize_schedule_text


def parse_schedule_text(value: object) -> dict[str, Any]:
    return normalize_schedule_text(value)


__all__ = ["parse_schedule_text"]
