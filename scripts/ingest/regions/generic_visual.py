"""Generic visual schedule fallback parser scaffold."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class GenericVisualScheduleParser:
    document_family: str = "unknown_visual_schedule"
    allow_auto_publish: bool = False
    major_region_types: list[str] = field(default_factory=lambda: ["unknown"])
