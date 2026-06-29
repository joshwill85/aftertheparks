"""Engine agreement contract for vision v3 critical-field validation."""

from __future__ import annotations

from typing import Any

try:
    from normalization_v3 import evaluate_field_agreement
except ImportError:  # pragma: no cover - supports package-style imports
    from .normalization_v3 import evaluate_field_agreement


def evaluate_engine_agreement(
    field: str,
    *,
    primary_text: object,
    secondary_text: object,
) -> dict[str, Any]:
    return evaluate_field_agreement(
        field,
        primary_text=primary_text,
        secondary_text=secondary_text,
    )


__all__ = ["evaluate_engine_agreement"]
