"""Deterministic normalization and agreement helpers for vision v3."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any


ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

_DAY_ALIASES = {
    "mon": "Monday",
    "monday": "Monday",
    "tue": "Tuesday",
    "tues": "Tuesday",
    "tuesday": "Tuesday",
    "wed": "Wednesday",
    "wednesday": "Wednesday",
    "thu": "Thursday",
    "thur": "Thursday",
    "thurs": "Thursday",
    "thursday": "Thursday",
    "fri": "Friday",
    "friday": "Friday",
    "sat": "Saturday",
    "saturday": "Saturday",
    "sun": "Sunday",
    "sunday": "Sunday",
}

CONTROLLED_LOCATIONS = {
    "village green lawn": "village_green_lawn",
    "luna park pool deck": "luna_park_pool_deck",
    "surfboard bay pool deck": "surfboard_bay_pool_deck",
    "inside stadium hall": "inside_stadium_hall",
    "game point arcade": "game_point_arcade",
    "community hall": "community_hall",
    "croquet lawn": "croquet_lawn",
    "boardwalk tennis and pickleball court": "boardwalk_tennis_and_pickleball_court",
    "touchdown football field": "touchdown_football_field",
    "outside stadium hall near touchdown buildings": "outside_stadium_hall_near_touchdown_buildings",
}

_TIME_PATTERN = re.compile(r"\b(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)\b", re.IGNORECASE)


def _stable_hash(payload: dict[str, Any]) -> str:
    data = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def _clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("–", "-").replace("—", "-").strip())


def _dictionary_key(value: object) -> str:
    text = _clean_text(value).lower()
    text = text.replace("!", "")
    text = re.sub(r"[^\w\s&-]", "", text)
    text = text.replace("&", " and ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _parse_time(value: re.Match[str]) -> str:
    hour = int(value.group(1))
    minute = int(value.group(2) or "0")
    period = value.group(3).lower().replace(".", "")
    if period == "pm" and hour != 12:
        hour += 12
    if period == "am" and hour == 12:
        hour = 0
    return f"{hour:02d}:{minute:02d}"


def _days_from_text(text: str) -> list[str]:
    lowered = text.lower()
    if re.search(r"\bdaily\b|\bnightly\b", lowered):
        return list(ALL_DAYS)

    prefix = re.split(r"\bfrom\b|\bat\b", lowered, maxsplit=1)[0]
    normalized = prefix.replace("&", ",").replace(" and ", ",")
    days: list[str] = []
    for token in re.split(r"[\s,]+", normalized):
        day = _DAY_ALIASES.get(token.strip("."))
        if day and day not in days:
            days.append(day)
    return days


def normalize_schedule_text(value: object) -> dict[str, Any]:
    raw_text = _clean_text(value)
    lowered = raw_text.lower()
    if lowered == "dawn to dusk":
        return {
            "schedule_type": "phrase",
            "phrase": "dawn_to_dusk",
            "timezone": "America/New_York",
            "raw_text": raw_text,
            "parser": "schedule_parser_v3",
            "confidence": "validated",
        }

    days = _days_from_text(raw_text)
    times = [_parse_time(match) for match in _TIME_PATTERN.finditer(raw_text)]
    if not days or not times:
        return {
            "schedule_type": "unparsed",
            "timezone": "America/New_York",
            "raw_text": raw_text,
            "parser": "schedule_parser_v3",
            "confidence": "needs_review",
        }

    normalized = {
        "schedule_type": "recurring",
        "days_of_week": days,
        "start_time": times[0],
        "timezone": "America/New_York",
        "raw_text": raw_text,
        "parser": "schedule_parser_v3",
        "confidence": "validated",
    }
    if len(times) > 1:
        normalized["end_time"] = times[1]
    return normalized


def normalize_location_text(value: object) -> dict[str, Any]:
    raw_text = _clean_text(value)
    key = _dictionary_key(raw_text)
    location_id = CONTROLLED_LOCATIONS.get(key, "unknown")
    return {
        "raw_text": raw_text,
        "normalized_text": key,
        "location_id": location_id,
        "manual_review_required": location_id == "unknown",
    }


def _normalize_title(value: object) -> str:
    return _clean_text(value).lower()


def _normalize_fee(value: object) -> bool:
    text = _clean_text(value).lower()
    return "($)" in text or "fee associated" in text or "fees may apply" in text


def _schedule_signature(schedule: dict[str, Any]) -> dict[str, Any]:
    return {
        key: schedule[key]
        for key in ("schedule_type", "days_of_week", "start_time", "end_time", "phrase", "timezone")
        if key in schedule
    }


def evaluate_field_agreement(
    field: str,
    *,
    primary_text: object,
    secondary_text: object,
) -> dict[str, Any]:
    if field == "schedule":
        primary = normalize_schedule_text(primary_text)
        secondary = normalize_schedule_text(secondary_text)
        agreement = (
            "exact_after_normalization"
            if primary.get("schedule_type") != "unparsed"
            and _schedule_signature(primary) == _schedule_signature(secondary)
            else "disagreement"
        )
        normalized_value: Any = primary
    elif field == "location":
        primary = normalize_location_text(primary_text)
        secondary = normalize_location_text(secondary_text)
        agreement = (
            "exact_after_normalization"
            if primary["location_id"] != "unknown" and primary["location_id"] == secondary["location_id"]
            else "disagreement"
        )
        normalized_value = primary["location_id"]
    elif field == "fee":
        primary = _normalize_fee(primary_text)
        secondary = _normalize_fee(secondary_text)
        agreement = "exact_after_normalization" if primary == secondary else "disagreement"
        normalized_value = primary
    else:
        primary = _normalize_title(primary_text)
        secondary = _normalize_title(secondary_text)
        agreement = "exact_after_normalization" if primary == secondary else "disagreement"
        normalized_value = primary

    return {
        "field": field,
        "primary_text": _clean_text(primary_text),
        "secondary_text": _clean_text(secondary_text),
        "normalized_value": normalized_value,
        "agreement": agreement,
    }


def build_runtime_lineage(
    *,
    config: dict[str, Any],
    package_versions: dict[str, str | None] | None = None,
    model_asset_hashes: dict[str, str] | None = None,
    git_sha: str | None = None,
    container_image_digest: str | None = None,
) -> dict[str, Any]:
    config_for_hash = {key: value for key, value in config.items() if key != "config_hash"}
    lineage = {
        "config": config,
        "config_hash": _stable_hash(config_for_hash),
        "package_versions": dict(sorted((package_versions or {}).items())),
        "model_asset_hashes": dict(sorted((model_asset_hashes or {}).items())),
        "git_sha": git_sha,
        "container_image_digest": container_image_digest,
    }
    lineage["lineage_hash"] = _stable_hash(lineage)
    return lineage
