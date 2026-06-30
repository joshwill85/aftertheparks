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
    "ol man island": "ol_man_island",
    "ol man island pool deck": "ol_man_island_pool_deck",
    "throughout disneys all-star resorts": "throughout_all_star_resorts",
    "throughout disney's all-star resorts": "throughout_all_star_resorts",
    "across from buttons and bells game arcade": "across_from_buttons_and_bells_game_arcade",
    "arusha savanna overlook": "arusha_savanna_overlook",
    "bay lake tower sports court": "bay_lake_tower_sports_court",
    "bayside marina": "bayside_marina",
    "beach pool deck": "beach_pool_deck",
    "calypso pool deck": "calypso_pool_deck",
    "campfire pit between buildings 5 and 6": "campfire_pit_between_buildings_5_and_6",
    "caribbean cay island movie lawn": "caribbean_cay_island_movie_lawn",
    "congress park-overlooking disney springs": "congress_park_overlooking_disney_springs",
    "contemporary feature pool": "contemporary_feature_pool",
    "copper creek springs pool": "copper_creek_springs_pool",
    "copper creek springs pool deck": "copper_creek_springs_pool_deck",
    "courtyard lawn": "courtyard_lawn",
    "dahlia lounge": "dahlia_lounge",
    "disney vacation club courtyard at franklin square": "disney_vacation_club_courtyard_at_franklin_square",
    "doubloon lagoon pool deck": "doubloon_lagoon_pool_deck",
    "fantasia pool deck": "fantasia_pool_deck",
    "fire pit near riviera feature pool waterfront": "fire_pit_near_riviera_feature_pool_waterfront",
    "fuentes del morro pool deck": "fuentes_del_morro_pool_deck",
    "great ceremonial house lawn": "great_ceremonial_house_lawn",
    "gran destino lawn": "gran_destino_lawn",
    "hakuna matata playground": "hakuna_matata_playground",
    "high rock spring pool deck": "high_rock_spring_pool_deck",
    "hospitality house": "hospitality_house",
    "inside cinema hall": "inside_cinema_hall",
    "inside melody hall": "inside_melody_hall",
    "lava pool deck": "lava_pool_deck",
    "lobby entrance": "lobby_entrance",
    "marthas vineyard lounge": "marthas_vineyard_lounge",
    "martinique beach": "martinique_beach",
    "meet near resort lobby fireplace": "meet_near_resort_lobby_fireplace",
    "movie lawn": "movie_lawn",
    "movie lawn near the big blue pool": "movie_lawn_near_the_big_blue_pool",
    "near the sandcastle pool area": "near_the_sandcastle_pool_area",
    "near the sandcastle pool area tennis courts": "near_the_sandcastle_pool_area_tennis_courts",
    "near wilderness lodge mercantile": "near_wilderness_lodge_mercantile",
    "noteable games arcade": "noteable_games_arcade",
    "old port royale lobby": "old_port_royale_lobby",
    "outside of community hall at bay lake tower": "outside_of_community_hall_at_bay_lake_tower",
    "palace library": "palace_library",
    "papas den near the lobby": "papas_den_near_the_lobby",
    "pembe savanna overlook": "pembe_savanna_overlook",
    "reel fun arcade": "reel_fun_arcade",
    "reunion station lawn": "reunion_station_lawn",
    "riviera feature pool deck": "riviera_feature_pool_deck",
    "samawati springs pool deck": "samawati_springs_pool_deck",
    "sandcastle pool": "sandcastle_pool",
    "sandcastle pool deck": "sandcastle_pool_deck",
    "shipwreck beach": "shipwreck_beach",
    "stormalong bay": "stormalong_bay",
    "stormalong bay pool": "stormalong_bay_pool",
    "tennis courts near hospitality house": "tennis_courts_near_hospitality_house",
    "the big blue pool deck": "the_big_blue_pool_deck",
    "the boat nook marina": "the_boat_nook_marina",
    "throughout disneys riviera resort": "throughout_disneys_riviera_resort",
    "throughout disneys saratoga springs resort": "throughout_disneys_saratoga_springs_resort",
    "throughout the main building": "throughout_the_main_building",
    "toledo - tapas steak and seafood": "toledo_tapas_steak_and_seafood",
    "uzima springs pool deck": "uzima_springs_pool_deck",
}

_TIME_PATTERN = re.compile(r"\b(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)\b", re.IGNORECASE)


def _stable_hash(payload: dict[str, Any]) -> str:
    data = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def _clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("–", "-").replace("—", "-").strip())


def _repair_ocr_time_text(value: str) -> str:
    value = re.sub(r"(?i)(?:=|\b)ro(?=\d)", "from ", value)
    value = re.sub(r"\b(\d{1,2})\.(\d{2})(\s*[ap]\.?m\.?)", r"\1:\2\3", value, flags=re.IGNORECASE)
    repaired = re.sub(
        r"\b(\d{1,2}):([0-9O]{2})(\s*[ap]\.?m\.?)",
        lambda match: f"{match.group(1)}:{match.group(2).replace('O', '0').replace('o', '0')}{match.group(3)}",
        value,
        flags=re.IGNORECASE,
    )
    repaired = re.sub(r"(?<=\d:)O(?=\d)", "0", repaired, flags=re.IGNORECASE)
    repaired = re.sub(r"(?<=\d:\d)O(?=\s*[ap]\.?m\.?)", "0", repaired, flags=re.IGNORECASE)
    return repaired


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
    raw_text = _repair_ocr_time_text(_clean_text(value))
    lowered = raw_text.lower()
    if "dawn to dusk" in lowered:
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
    normalized = _clean_text(value).lower()
    compact = re.sub(r"[^a-z0-9]+", "", normalized)
    if compact in {"movieunderthestars", "underthestars", "thestars"}:
        return "movie under the stars"
    if compact == "nighttimetrivia":
        return "nighttime trivia"
    normalized = re.sub(r"!\s*\(\$\)", "! ($)", normalized)
    normalized = re.sub(r"\s*[\[\(]\s*(?:g|pg|pg-13)\s*[\]\)]?\s*$", "", normalized)
    normalized = re.sub(r"(?<=\))\s*(?:g|pg|pg-13)\s*$", "", normalized)
    normalized = re.sub(r"(?<=\d)\s*(?:g|pg|pg-13)\s*$", "", normalized)
    normalized = re.sub(r"\s+&\s*$", "", normalized)
    return normalized


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
    ocr_engine_configs: dict[str, Any] | None = None,
    git_sha: str | None = None,
    container_image_digest: str | None = None,
) -> dict[str, Any]:
    config_for_hash = {key: value for key, value in config.items() if key != "config_hash"}
    lineage = {
        "config": config,
        "config_hash": _stable_hash(config_for_hash),
        "package_versions": dict(sorted((package_versions or {}).items())),
        "model_asset_hashes": dict(sorted((model_asset_hashes or {}).items())),
        "ocr_engine_configs": dict(sorted((ocr_engine_configs or {}).items())),
        "git_sha": git_sha,
        "container_image_digest": container_image_digest,
    }
    lineage["lineage_hash"] = _stable_hash(lineage)
    return lineage
