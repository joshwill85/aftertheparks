"""A-frame recreation flyer region parser scaffold."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AframeRecreationParser:
    document_family: str = "aframe_recreation"
    allow_auto_publish: bool = True
    major_region_types: tuple[str, ...] = (
        "header",
        "qr_callout",
        "wellness_section",
        "resort_activities_section",
        "movie_section",
        "footer",
    )
