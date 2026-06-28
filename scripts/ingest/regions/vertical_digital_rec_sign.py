"""Vertical digital recreation sign region parser scaffold."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class VerticalDigitalRecSignParser:
    document_family: str = "vertical_digital_rec_sign"
    allow_auto_publish: bool = True
    major_region_types: tuple[str, ...] = (
        "header",
        "day_banner",
        "vertical_activity_row",
        "footer",
    )
