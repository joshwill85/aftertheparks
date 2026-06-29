"""Document-family classification for vision v3 source snapshots."""

from __future__ import annotations

from pathlib import Path
import re
from typing import Any


AFRAME_FILENAME_MARKERS = (
    "aframe_recreation",
    "bw_aframe_recreation",
    "all-star-sports_aframe_recreation",
    "all-star-movies_aframe_recreation",
    "all-star-music_aframe_recreation",
    "csr_aframe_recreation",
    "ctr_aframe_recreation",
    "drr_aframe_recreation",
    "gf_aframe_recreation",
    "okwr_aframe_recreation",
    "pofq_aframe_recreation",
    "polynesian_aframe_recreation",
    "ssr_aframe_recreation",
    "wl_aframe_recreation",
    "yb_aframe_recreation",
    "dakl_aframe_recreation",
)

VERTICAL_SIGN_FILENAME_MARKERS = (
    "cks-digital-rec-sign",
    "digital-rec-sign",
)


def _first_page(manifest: dict[str, Any]) -> dict[str, Any]:
    pages = manifest.get("pages") or manifest.get("source_pages")
    if isinstance(pages, list) and pages and isinstance(pages[0], dict):
        return pages[0]
    return {}


def _page_dimensions(manifest: dict[str, Any]) -> tuple[int, int]:
    page = _first_page(manifest)
    return int(page.get("width_px") or 0), int(page.get("height_px") or 0)


def _source_name(manifest: dict[str, Any]) -> str:
    path = str(manifest.get("source_path") or manifest.get("page_image_path") or "")
    return Path(path).name.lower()


def _text_items(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or item.get("line_text") or item.get("token_text") or "").strip()
        if text:
            items.append(text)
    return items


def _visible_text(manifest: dict[str, Any]) -> str:
    text_parts: list[str] = []
    text_parts.extend(_text_items(manifest.get("lines")))
    text_parts.extend(_text_items(manifest.get("tokens")))
    engine_runs = manifest.get("engine_runs") if isinstance(manifest.get("engine_runs"), list) else []
    for run in engine_runs:
        if not isinstance(run, dict):
            continue
        text_parts.extend(_text_items(run.get("lines")))
        text_parts.extend(_text_items(run.get("tokens")))
    return " ".join(text_parts).lower()


def _has_day_banner_text(text: str) -> bool:
    day_matches = re.findall(
        r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        text,
    )
    return len(set(day_matches)) >= 2


def classify_document_family(manifest: dict[str, Any]) -> dict[str, Any]:
    source_name = _source_name(manifest)
    source_type = str(manifest.get("source_type") or "")
    width, height = _page_dimensions(manifest)
    aspect_ratio = (height / width) if width else 0
    visible_text = _visible_text(manifest)
    signals: list[str] = []

    if any(marker in source_name for marker in AFRAME_FILENAME_MARKERS):
        signals.append("filename:aframe_recreation")
        return {
            "document_family": "aframe_recreation",
            "parser": "AframeRecreationParser",
            "confidence": "high",
            "allow_auto_publish": True,
            "signals": signals,
        }

    if any(marker in source_name for marker in VERTICAL_SIGN_FILENAME_MARKERS):
        signals.append("filename:vertical_digital_rec_sign")
        return {
            "document_family": "vertical_digital_rec_sign",
            "parser": "VerticalDigitalRecSignParser",
            "confidence": "high",
            "allow_auto_publish": True,
            "signals": signals,
        }

    if "resort activities" in visible_text and "movie under the stars" in visible_text:
        signals.extend(["text:resort_activities", "text:movie_under_the_stars"])
        if "qr" in visible_text:
            signals.append("text:qr_callout")
        return {
            "document_family": "aframe_recreation",
            "parser": "AframeRecreationParser",
            "confidence": "medium",
            "allow_auto_publish": False,
            "signals": signals,
        }

    if source_type == "image" and _has_day_banner_text(visible_text):
        signals.append("text:day_banners")
        return {
            "document_family": "vertical_digital_rec_sign",
            "parser": "VerticalDigitalRecSignParser",
            "confidence": "medium",
            "allow_auto_publish": False,
            "signals": signals,
        }

    if source_type == "image" and aspect_ratio >= 4:
        signals.append("aspect_ratio:vertical_image")
        return {
            "document_family": "vertical_digital_rec_sign",
            "parser": "VerticalDigitalRecSignParser",
            "confidence": "medium",
            "allow_auto_publish": False,
            "signals": signals,
        }

    return {
        "document_family": "unknown_visual_schedule",
        "parser": "GenericVisualScheduleParser",
        "confidence": "low",
        "allow_auto_publish": False,
        "signals": signals or ["no_known_family_signal"],
    }
