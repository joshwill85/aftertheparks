"""Vision v3 candidate extraction scaffolding."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
from typing import Any

try:
    from config import PROCESSED_DIR
    from fee_validator import reconcile_fee_evidence
    from field_evidence import build_field_evidence
    from normalization_v3 import evaluate_field_agreement, normalize_location_text, normalize_schedule_text
    from source_manifest import edition_matches_quarter
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR
    from .fee_validator import reconcile_fee_evidence
    from .field_evidence import build_field_evidence
    from .normalization_v3 import evaluate_field_agreement, normalize_location_text, normalize_schedule_text
    from .source_manifest import edition_matches_quarter


DEFAULT_OUTPUT_DIR = PROCESSED_DIR / "activity_candidates_v3"
DEFAULT_SNAPSHOTS_DIR = PROCESSED_DIR / "vision_snapshots"
DEFAULT_REPORT_PATH = PROCESSED_DIR / "eval" / "v3_extract_report.json"
PUBLISHABLE_REGION_TYPES = {
    "resort_activities_section": "activity",
    "wellness_section": "activity",
    "vertical_activity_row": "activity",
    "movie_section": "movie",
}
GENERIC_REVIEW_REGION_TYPES = {"unknown"}
SOURCE_METADATA_FIELDS = (
    "source_kind",
    "source_role",
    "canonical_url",
    "fetched_url",
    "http_status",
    "currentness",
    "captured_at",
)
DAY_NAMES = {
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
}
TIME_RE = re.compile(r"\b\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?\b", re.IGNORECASE)
DEFAULT_PRIMARY_ENGINE = "paddleocr_ppstructurev3"
DEFAULT_SECONDARY_ENGINE = "rapidocr"


def _canonical_page_image_sha256s(snapshot: dict[str, Any]) -> list[str]:
    source_pages = snapshot.get("source_pages")
    if not isinstance(source_pages, list):
        return []
    page_hashes: list[str] = []
    for page in source_pages:
        if not isinstance(page, dict):
            continue
        page_hash = str(page.get("canonical_image_sha256") or page.get("page_image_sha256") or "").strip()
        if page_hash and page_hash not in page_hashes:
            page_hashes.append(page_hash)
    return page_hashes


def _region_evidence(snapshot: dict[str, Any], region: dict[str, Any]) -> dict[str, Any]:
    return build_field_evidence(
        field="region",
        raw_value=None,
        normalized_value=None,
        content_sha256=str(snapshot.get("source_sha256") or ""),
        region=region,
        agreement="not_evaluated",
        review_status="required",
    )


def _region_tokens(tokens: list[dict[str, Any]], region: dict[str, Any]) -> list[dict[str, Any]]:
    region_id = region.get("region_id")
    page_number = region.get("page_number")
    region_bbox = region.get("bbox_px")
    return [
        token for token in tokens
        if isinstance(token, dict)
        and (
            (region_id and token.get("region_id") == region_id)
            or (not token.get("region_id") and _bbox_contains(region_bbox, token.get("bbox_px")))
            or (not region_id and _bbox_contains(region_bbox, token.get("bbox_px")))
        )
        and (not page_number or token.get("page_number") == page_number)
    ]


def _bbox_contains(container: object, inner: object) -> bool:
    if not (
        isinstance(container, list)
        and isinstance(inner, list)
        and len(container) == 4
        and len(inner) == 4
    ):
        return False
    cx1, cy1, cx2, cy2 = [float(value) for value in container]
    ix1, iy1, ix2, iy2 = [float(value) for value in inner]
    center_x = (ix1 + ix2) / 2.0
    center_y = (iy1 + iy2) / 2.0
    return cx1 <= center_x <= cx2 and cy1 <= center_y <= cy2


def _token_for_field(tokens: list[dict[str, Any]], field_hint: str, engine: str) -> dict[str, Any] | None:
    matching = [
        token for token in tokens
        if token.get("field_hint") == field_hint and token.get("engine") == engine
    ]
    matching.sort(key=lambda token: int(token.get("reading_order") or 0))
    if not matching:
        return None
    token = matching[0]
    return {
        "engine": engine,
        "text": token.get("text") or token.get("token_text"),
        "confidence": token.get("confidence"),
        "bbox_px": token.get("bbox_px"),
        "page_image_sha256": token.get("page_image_sha256"),
        "page_number": token.get("page_number"),
    }


def _token_text(token: dict[str, Any]) -> str:
    return str(token.get("text") or token.get("token_text") or "").strip()


def _bbox_union(tokens: list[dict[str, Any]]) -> list[int] | None:
    boxes = [
        token.get("bbox_px")
        for token in tokens
        if isinstance(token.get("bbox_px"), list) and len(token["bbox_px"]) == 4
    ]
    if not boxes:
        return None
    return [
        min(int(float(box[0])) for box in boxes),
        min(int(float(box[1])) for box in boxes),
        max(int(float(box[2])) for box in boxes),
        max(int(float(box[3])) for box in boxes),
    ]


def _bbox_center_y(token: dict[str, Any]) -> float:
    bbox = token.get("bbox_px")
    if not (isinstance(bbox, list) and len(bbox) == 4):
        return 0.0
    return (float(bbox[1]) + float(bbox[3])) / 2.0


def _clean_day_text(text: str) -> str:
    return re.sub(r"[^a-z]", "", text.lower())


def _is_day_text(text: str) -> bool:
    return _clean_day_text(text) in DAY_NAMES


def _day_label(text: str) -> str:
    clean = _clean_day_text(text)
    return clean.capitalize() if clean in DAY_NAMES else text.strip()


def _repair_ocr_time_text(text: str) -> str:
    repaired = re.sub(r"(?<=\d:)O(?=\d)", "0", text, flags=re.IGNORECASE)
    repaired = re.sub(r"(?<=\d:\d)O(?=\s*[ap]\.?m\.?)", "0", repaired, flags=re.IGNORECASE)
    return repaired


def _has_time(text: str) -> bool:
    return bool(TIME_RE.search(_repair_ocr_time_text(text)))


def _looks_like_schedule(text: str) -> bool:
    lowered = text.lower()
    return _has_time(text) or "dawn to dusk" in lowered


def _uppercase_ratio(text: str) -> float:
    letters = [char for char in text if char.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for char in letters if char.isupper()) / len(letters)


def _looks_like_title(text: str) -> bool:
    cleaned = text.strip()
    if not cleaned or _is_day_text(cleaned) or _looks_like_schedule(cleaned):
        return False
    return _uppercase_ratio(cleaned) >= 0.65 and len(re.sub(r"[^A-Za-z]", "", cleaned)) >= 3


def _looks_like_location(text: str) -> bool:
    cleaned = text.strip()
    if not cleaned or _is_day_text(cleaned) or _looks_like_schedule(cleaned):
        return False
    return not _looks_like_title(cleaned)


def _field_token_from_parts(
    *,
    tokens: list[dict[str, Any]],
    text: str,
    field_hint: str,
    engine: str,
    region: dict[str, Any],
) -> dict[str, Any] | None:
    if not text.strip() or not tokens:
        return None
    first = tokens[0]
    bbox = _bbox_union(tokens) or first.get("bbox_px")
    return {
        **first,
        "engine": engine,
        "text": text.strip(),
        "token_text": text.strip(),
        "field_hint": field_hint,
        "bbox_px": bbox,
        "region_id": region.get("region_id"),
        "page_number": first.get("page_number") or region.get("page_number"),
        "page_image_sha256": first.get("page_image_sha256") or region.get("page_image_sha256"),
    }


def _nearest_engine_token(
    tokens: list[dict[str, Any]],
    *,
    target_y: float,
    predicate: Any,
    max_distance: float = 140.0,
) -> dict[str, Any] | None:
    matches = [
        token for token in tokens
        if predicate(_token_text(token))
    ]
    if not matches:
        matches = tokens
    if not matches:
        return None
    matches.sort(key=lambda token: abs(_bbox_center_y(token) - target_y))
    if abs(_bbox_center_y(matches[0]) - target_y) > max_distance:
        return None
    return matches[0]


def _secondary_field_token(
    secondary_tokens: list[dict[str, Any]],
    *,
    primary_token: dict[str, Any],
    field_hint: str,
    engine: str,
    region: dict[str, Any],
    max_distance: float = 140.0,
) -> dict[str, Any] | None:
    if field_hint == "schedule":
        predicate = _looks_like_schedule
    elif field_hint == "day_banner":
        predicate = _is_day_text
    elif field_hint == "location":
        predicate = _looks_like_location
        target_y = _bbox_center_y(primary_token)
        primary_location_id = normalize_location_text(_token_text(primary_token))["location_id"]
        controlled_matches = [
            token for token in secondary_tokens
            if normalize_location_text(_token_text(token))["location_id"] != "unknown"
            and abs(_bbox_center_y(token) - target_y) <= max_distance
        ]
        same_location_matches = [
            token for token in controlled_matches
            if primary_location_id != "unknown"
            and normalize_location_text(_token_text(token))["location_id"] == primary_location_id
        ]
        if same_location_matches:
            match = sorted(same_location_matches, key=lambda token: abs(_bbox_center_y(token) - target_y))[0]
            return _field_token_from_parts(
                tokens=[match],
                text=_token_text(match),
                field_hint=field_hint,
                engine=engine,
                region=region,
            )
        if controlled_matches:
            match = sorted(controlled_matches, key=lambda token: abs(_bbox_center_y(token) - target_y))[0]
            return _field_token_from_parts(
                tokens=[match],
                text=_token_text(match),
                field_hint=field_hint,
                engine=engine,
                region=region,
            )
    else:
        predicate = _looks_like_title
    match = _nearest_engine_token(
        secondary_tokens,
        target_y=_bbox_center_y(primary_token),
        predicate=predicate,
        max_distance=max_distance,
    )
    if not match:
        return None
    return _field_token_from_parts(
        tokens=[match],
        text=_token_text(match),
        field_hint=field_hint,
        engine=engine,
        region=region,
    )


def _looks_like_fee_legend(text: str) -> bool:
    lowered = text.lower()
    return "($)" in text and "fee" in lowered and "associated" in lowered


def _fee_marker_present(text: str) -> bool:
    return "($)" in text


def _fee_legend_token(snapshot: dict[str, Any], engine: str) -> dict[str, Any] | None:
    matches = [
        token for token in snapshot.get("tokens") or []
        if isinstance(token, dict)
        and token.get("engine") == engine
        and _looks_like_fee_legend(_token_text(token))
    ]
    matches.sort(key=lambda token: (int(token.get("page_number") or 0), _bbox_center_y(token)))
    if not matches:
        return None
    token = matches[-1]
    return {
        "engine": engine,
        "text": _token_text(token),
        "confidence": token.get("confidence"),
        "bbox_px": token.get("bbox_px"),
        "page_image_sha256": token.get("page_image_sha256"),
        "page_number": token.get("page_number"),
    }


def _fee_engine_token_from_title(title: dict[str, Any] | None, *, field_text: str) -> dict[str, Any] | None:
    if not isinstance(title, dict):
        return None
    return {
        **title,
        "text": field_text,
        "token_text": field_text,
    }


def _heuristic_aframe_activity_token_groups(
    *,
    snapshot: dict[str, Any],
    region: dict[str, Any],
    region_tokens: list[dict[str, Any]],
) -> list[list[dict[str, Any]]]:
    if str(region.get("region_type") or "") not in {"resort_activities_section", "wellness_section", "movie_section"}:
        return []
    if any(token.get("field_hint") for token in region_tokens if isinstance(token, dict)):
        return []

    primary_engine, secondary_engine = _configured_engine_pair(snapshot)
    primary_tokens = sorted(
        [token for token in region_tokens if token.get("engine") == primary_engine],
        key=lambda token: (float((token.get("bbox_px") or [0, 0, 0, 0])[1]), int(token.get("reading_order") or 0)),
    )
    secondary_tokens = sorted(
        [token for token in region_tokens if token.get("engine") == secondary_engine],
        key=lambda token: (float((token.get("bbox_px") or [0, 0, 0, 0])[1]), int(token.get("reading_order") or 0)),
    )
    if not primary_tokens or not secondary_tokens:
        return []

    groups: list[list[dict[str, Any]]] = []
    index = 0
    while index < len(primary_tokens):
        title_token = primary_tokens[index]
        if not _looks_like_title(_token_text(title_token)):
            index += 1
            continue
        if index + 2 >= len(primary_tokens):
            break
        location_token = primary_tokens[index + 1]
        schedule_token = primary_tokens[index + 2]
        if not _looks_like_location(_token_text(location_token)) or not _looks_like_schedule(_token_text(schedule_token)):
            index += 1
            continue

        primary_title = _field_token_from_parts(
            tokens=[title_token],
            text=_token_text(title_token),
            field_hint="title",
            engine=primary_engine,
            region=region,
        )
        primary_location = _field_token_from_parts(
            tokens=[location_token],
            text=_token_text(location_token),
            field_hint="location",
            engine=primary_engine,
            region=region,
        )
        primary_schedule = _field_token_from_parts(
            tokens=[schedule_token],
            text=_token_text(schedule_token),
            field_hint="schedule",
            engine=primary_engine,
            region=region,
        )
        group = [token for token in (primary_title, primary_location, primary_schedule) if token]
        for primary_field in list(group):
            field_hint = str(primary_field.get("field_hint") or "")
            secondary = _secondary_field_token(
                secondary_tokens,
                primary_token=primary_field,
                field_hint=field_hint,
                engine=secondary_engine,
                region=region,
                max_distance=380.0,
            )
            if secondary:
                group.append(secondary)
        if {token.get("field_hint") for token in group} >= {"title", "schedule", "location"}:
            groups.append(group)
        index += 3
    return groups


def _movie_location_schedule_tokens(
    *,
    token: dict[str, Any],
    engine: str,
    region: dict[str, Any],
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    text = _token_text(token)
    if "|" in text:
        location_text, schedule_text = [part.strip() for part in text.split("|", 1)]
    else:
        repaired = _repair_ocr_time_text(text)
        match = TIME_RE.search(repaired)
        if not match:
            return None, None
        location_text = repaired[: match.start()].strip(" |")
        schedule_text = repaired[match.start() :].strip(" |")
    if not location_text or not schedule_text:
        return None, None
    location = _field_token_from_parts(
        tokens=[token],
        text=location_text,
        field_hint="location",
        engine=engine,
        region=region,
    )
    schedule = _field_token_from_parts(
        tokens=[token],
        text=schedule_text,
        field_hint="schedule",
        engine=engine,
        region=region,
    )
    return location, schedule


def _movie_title_text(text: str) -> str:
    cleaned = text.strip(" .")
    cleaned = re.sub(r"\s*\[(?:G|PG|PG-13)\]\s*$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+(?:G|PG|PG-13)\s*$", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip(" .")


def _looks_like_movie_title(text: str) -> bool:
    cleaned = _movie_title_text(text)
    if not cleaned:
        return False
    if cleaned.upper() in {"G", "PG", "PG-13"}:
        return False
    return not _is_day_text(cleaned.strip(" .")) and not _looks_like_schedule(cleaned) and "|" not in cleaned


def _same_row_movie_title(tokens: list[dict[str, Any]], day_token: dict[str, Any]) -> dict[str, Any] | None:
    day_bbox = day_token.get("bbox_px") or [0, 0, 0, 0]
    day_y = _bbox_center_y(day_token)
    day_x = (float(day_bbox[0]) + float(day_bbox[2])) / 2.0
    candidates = []
    for token in tokens:
        if token is day_token or not _looks_like_movie_title(_token_text(token)):
            continue
        bbox = token.get("bbox_px") or [0, 0, 0, 0]
        token_x = (float(bbox[0]) + float(bbox[2])) / 2.0
        if token_x <= day_x:
            continue
        distance = abs(_bbox_center_y(token) - day_y)
        if distance <= 450.0:
            candidates.append((distance, token_x, token))
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: (item[0], item[1]))[0][2]


def _heuristic_aframe_movie_token_groups(
    *,
    snapshot: dict[str, Any],
    region: dict[str, Any],
    region_tokens: list[dict[str, Any]],
) -> list[list[dict[str, Any]]]:
    if str(region.get("region_type") or "") != "movie_section":
        return []
    if any(token.get("field_hint") for token in region_tokens if isinstance(token, dict)):
        return []

    primary_engine, secondary_engine = _configured_engine_pair(snapshot)
    primary_tokens = sorted(
        [token for token in region_tokens if token.get("engine") == primary_engine],
        key=lambda token: (float((token.get("bbox_px") or [0, 0, 0, 0])[1]), float((token.get("bbox_px") or [0, 0, 0, 0])[0])),
    )
    secondary_tokens = sorted(
        [token for token in region_tokens if token.get("engine") == secondary_engine],
        key=lambda token: (float((token.get("bbox_px") or [0, 0, 0, 0])[1]), float((token.get("bbox_px") or [0, 0, 0, 0])[0])),
    )
    if not primary_tokens or not secondary_tokens:
        return []

    primary_title_source = next(
        (token for token in primary_tokens if "movie" in _token_text(token).lower() and "star" in _token_text(token).lower()),
        None,
    )
    primary_location_schedule = next((token for token in primary_tokens if "|" in _token_text(token)), None)
    if not primary_title_source or not primary_location_schedule:
        return []
    primary_location, primary_schedule = _movie_location_schedule_tokens(
        token=primary_location_schedule,
        engine=primary_engine,
        region=region,
    )
    if not primary_location or not primary_schedule:
        return []

    secondary_title_source = _nearest_engine_token(
        secondary_tokens,
        target_y=_bbox_center_y(primary_title_source),
        predicate=lambda text: bool(re.search(r"\bmovie\s*under\s*the\s*stars\b|\bunder\s*the\s*stars\b|\bthe\s*stars\b", text, flags=re.IGNORECASE)),
        max_distance=300.0,
    )
    secondary_location_schedule = _nearest_engine_token(
        secondary_tokens,
        target_y=_bbox_center_y(primary_location_schedule),
        predicate=lambda text: "|" in text or _has_time(text),
        max_distance=450.0,
    )
    if not secondary_title_source or not secondary_location_schedule:
        return []
    secondary_location, secondary_schedule = _movie_location_schedule_tokens(
        token=secondary_location_schedule,
        engine=secondary_engine,
        region=region,
    )
    if not secondary_location or not secondary_schedule:
        return []

    groups: list[list[dict[str, Any]]] = []
    primary_days = [token for token in primary_tokens if _is_day_text(_token_text(token).strip(" ."))]
    for day_token in primary_days:
        day_y = _bbox_center_y(day_token)
        movie_title_token = _same_row_movie_title(primary_tokens, day_token) or _nearest_engine_token(
            primary_tokens,
            target_y=day_y,
            predicate=_looks_like_movie_title,
            max_distance=180.0,
        )
        if not movie_title_token or movie_title_token is day_token or movie_title_token is primary_title_source:
            continue
        day_label = _day_label(_token_text(day_token))
        secondary_day = next(
            (
                token for token in secondary_tokens
                if _day_label(_token_text(token)) == day_label
            ),
            None,
        )
        secondary_movie_title = _same_row_movie_title(secondary_tokens, secondary_day) or _nearest_engine_token(
            secondary_tokens,
            target_y=_bbox_center_y(movie_title_token),
            predicate=_looks_like_movie_title,
            max_distance=450.0,
        )
        if not secondary_day or not secondary_movie_title:
            continue

        primary_title = _field_token_from_parts(
            tokens=[primary_title_source],
            text=_token_text(primary_title_source),
            field_hint="title",
            engine=primary_engine,
            region=region,
        )
        secondary_title = _field_token_from_parts(
            tokens=[secondary_title_source],
            text=_token_text(secondary_title_source),
            field_hint="title",
            engine=secondary_engine,
            region=region,
        )
        primary_day = _field_token_from_parts(
            tokens=[day_token],
            text=_day_label(_token_text(day_token)),
            field_hint="day_banner",
            engine=primary_engine,
            region=region,
        )
        secondary_day_token = _field_token_from_parts(
            tokens=[secondary_day],
            text=_day_label(_token_text(secondary_day)),
            field_hint="day_banner",
            engine=secondary_engine,
            region=region,
        )
        primary_movie = _field_token_from_parts(
            tokens=[movie_title_token],
            text=_movie_title_text(_token_text(movie_title_token)),
            field_hint="movie_title",
            engine=primary_engine,
            region=region,
        )
        secondary_movie = _field_token_from_parts(
            tokens=[secondary_movie_title],
            text=_movie_title_text(_token_text(secondary_movie_title)),
            field_hint="movie_title",
            engine=secondary_engine,
            region=region,
        )
        group = [
            token for token in (
                primary_title,
                secondary_title,
                primary_location,
                secondary_location,
                primary_schedule,
                secondary_schedule,
                primary_day,
                secondary_day_token,
                primary_movie,
                secondary_movie,
            )
            if token
        ]
        if {token.get("field_hint") for token in group} >= {"title", "schedule", "location", "movie_title"}:
            groups.append(group)
    return groups


def _heuristic_vertical_activity_token_groups(
    *,
    snapshot: dict[str, Any],
    region: dict[str, Any],
    region_tokens: list[dict[str, Any]],
) -> list[list[dict[str, Any]]]:
    if str(region.get("region_type") or "") != "vertical_activity_row":
        return []
    if any(token.get("field_hint") for token in region_tokens if isinstance(token, dict)):
        return []

    primary_engine, secondary_engine = _configured_engine_pair(snapshot)
    primary_tokens = sorted(
        [token for token in region_tokens if token.get("engine") == primary_engine],
        key=lambda token: (float((token.get("bbox_px") or [0, 0, 0, 0])[1]), int(token.get("reading_order") or 0)),
    )
    secondary_tokens = sorted(
        [token for token in region_tokens if token.get("engine") == secondary_engine],
        key=lambda token: (float((token.get("bbox_px") or [0, 0, 0, 0])[1]), int(token.get("reading_order") or 0)),
    )
    if not primary_tokens or not secondary_tokens:
        return []

    page_number = region.get("page_number")
    page_primary_day_tokens = sorted(
        [
            token for token in snapshot.get("tokens") or []
            if isinstance(token, dict)
            and token.get("engine") == primary_engine
            and (not page_number or token.get("page_number") == page_number)
            and _is_day_text(_token_text(token))
        ],
        key=lambda token: _bbox_center_y(token),
    )

    def previous_day_token(before_y: float) -> dict[str, Any] | None:
        previous = [
            token for token in page_primary_day_tokens
            if _bbox_center_y(token) <= before_y
        ]
        return previous[-1] if previous else None

    groups: list[list[dict[str, Any]]] = []
    current_day: dict[str, Any] | None = None
    index = 0
    while index < len(primary_tokens):
        token = primary_tokens[index]
        text = _token_text(token)
        if _is_day_text(text):
            current_day = token
            index += 1
            continue
        if not _looks_like_title(text):
            index += 1
            continue
        current_day = current_day or previous_day_token(_bbox_center_y(token))

        title_tokens = [token]
        index += 1
        while index < len(primary_tokens) and _looks_like_title(_token_text(primary_tokens[index])):
            title_tokens.append(primary_tokens[index])
            index += 1

        if index >= len(primary_tokens) or not _looks_like_location(_token_text(primary_tokens[index])):
            continue
        location_token = primary_tokens[index]
        index += 1
        if index >= len(primary_tokens) or not _has_time(_token_text(primary_tokens[index])):
            continue
        schedule_token = primary_tokens[index]
        index += 1

        primary_title = _field_token_from_parts(
            tokens=title_tokens,
            text=" ".join(_token_text(part) for part in title_tokens),
            field_hint="title",
            engine=primary_engine,
            region=region,
        )
        primary_location = _field_token_from_parts(
            tokens=[location_token],
            text=_token_text(location_token),
            field_hint="location",
            engine=primary_engine,
            region=region,
        )
        primary_schedule = _field_token_from_parts(
            tokens=[schedule_token],
            text=_token_text(schedule_token),
            field_hint="schedule",
            engine=primary_engine,
            region=region,
        )
        group = [token for token in (primary_title, primary_location, primary_schedule) if token]
        if current_day:
            day = _field_token_from_parts(
                tokens=[current_day],
                text=_day_label(_token_text(current_day)),
                field_hint="day_banner",
                engine=primary_engine,
                region=region,
            )
            if day:
                group.append(day)

        for primary_field in list(group):
            field_hint = str(primary_field.get("field_hint") or "")
            secondary = _secondary_field_token(
                secondary_tokens,
                primary_token=primary_field,
                field_hint=field_hint,
                engine=secondary_engine,
                region=region,
            )
            if secondary:
                group.append(secondary)

        if {token.get("field_hint") for token in group} >= {"title", "schedule", "location"}:
            groups.append(group)
    return groups


def _configured_engine_name(ocr_config: dict[str, Any], role: str) -> str:
    engine_config = ocr_config.get(role)
    if isinstance(engine_config, dict):
        return str(engine_config.get("engine") or "").strip()
    if isinstance(engine_config, str):
        return engine_config.strip()
    return ""


def _configured_engine_pair(snapshot: dict[str, Any]) -> tuple[str, str]:
    config_sources: list[dict[str, Any]] = []
    runtime_lineage = snapshot.get("runtime_lineage")
    if isinstance(runtime_lineage, dict) and isinstance(runtime_lineage.get("config"), dict):
        config_sources.append(runtime_lineage["config"])
    if isinstance(snapshot.get("config"), dict):
        config_sources.append(snapshot["config"])

    for config in config_sources:
        ocr_config = config.get("ocr")
        if not isinstance(ocr_config, dict):
            continue
        primary = _configured_engine_name(ocr_config, "primary")
        secondary = _configured_engine_name(ocr_config, "secondary")
        if primary and secondary:
            return primary, secondary
    return DEFAULT_PRIMARY_ENGINE, DEFAULT_SECONDARY_ENGINE


def _field_region(region: dict[str, Any], primary: dict[str, Any] | None, secondary: dict[str, Any] | None) -> dict[str, Any]:
    bbox = None
    if isinstance(primary, dict):
        bbox = primary.get("bbox_px")
    if bbox is None and isinstance(secondary, dict):
        bbox = secondary.get("bbox_px")
    return {
        **region,
        "bbox_px": bbox or region.get("bbox_px"),
    }


def _raw_text(token: dict[str, Any] | None) -> str:
    return str((token or {}).get("text") or "")


def _source_span(
    field: str,
    token: dict[str, Any] | None,
    *,
    text: str | None = None,
    region: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    if not isinstance(token, dict):
        return []
    span_text = str(text if text is not None else token.get("text") or token.get("token_text") or "").strip()
    if not span_text:
        return []
    return [
        {
            "field": field,
            "page": token.get("page_number"),
            "text": span_text,
            "bbox_px": token.get("bbox_px"),
            "page_image_sha256": token.get("page_image_sha256"),
            "engine": token.get("engine"),
            "region_id": (region or {}).get("region_id"),
        }
    ]


def _stable_candidate_id(candidate: dict[str, Any]) -> str:
    identity = {
        "source_document_id": candidate.get("source_document_id"),
        "content_sha256": candidate.get("content_sha256"),
        "document_family": candidate.get("document_family"),
        "calendar_group_key": candidate.get("calendar_group_key"),
        "candidate_type": candidate.get("candidate_type"),
        "region_id": candidate.get("region_id"),
        "region_type": candidate.get("region_type"),
        "source_title": candidate.get("source_title"),
        "movie_title": candidate.get("movie_title"),
        "schedule_raw": candidate.get("schedule_raw"),
        "location_text": candidate.get("location_text"),
        "fee_required": candidate.get("fee_required"),
        "source_spans": candidate.get("source_spans"),
    }
    digest = hashlib.sha256(json.dumps(identity, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return f"vision-v3-{digest[:24]}"


def _compose_schedule_text(schedule_token: dict[str, Any] | None, day_token: dict[str, Any] | None) -> str:
    schedule_text = _raw_text(schedule_token)
    day_text = _raw_text(day_token)
    if day_text and schedule_text and not any(day.lower() in schedule_text.lower() for day in (
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
        "daily",
        "nightly",
    )):
        return f"{day_text} at {schedule_text}"
    return schedule_text


def _schedule_time_signature(value: object) -> tuple[str | None, str | None]:
    normalized = normalize_schedule_text(f"Daily at {value}")
    if normalized.get("schedule_type") != "recurring":
        return None, None
    return normalized.get("start_time"), normalized.get("end_time")


def _reconcile_composed_schedule_agreement(
    agreement: dict[str, Any],
    *,
    primary_schedule_text: str,
    secondary_schedule_text: str,
    primary_schedule: dict[str, Any] | None,
    secondary_schedule: dict[str, Any] | None,
    primary_day: dict[str, Any] | None,
    secondary_day: dict[str, Any] | None,
) -> dict[str, Any]:
    if agreement.get("agreement") == "exact_after_normalization" or not primary_day:
        return agreement
    primary_normalized = normalize_schedule_text(primary_schedule_text)
    if primary_normalized.get("schedule_type") != "recurring" or not primary_normalized.get("days_of_week"):
        return agreement
    primary_signature = _schedule_time_signature(_raw_text(primary_schedule))
    secondary_signature = _schedule_time_signature(_raw_text(secondary_schedule))
    if primary_signature == (None, None) or primary_signature != secondary_signature:
        return agreement
    return {
        **agreement,
        "agreement": "exact_after_normalization",
        "normalized_value": primary_normalized,
    }


def _extracted_candidate(
    snapshot: dict[str, Any],
    region: dict[str, Any],
    region_tokens: list[dict[str, Any]],
    *,
    candidate_type: str,
) -> dict[str, Any] | None:
    primary_engine, secondary_engine = _configured_engine_pair(snapshot)
    primary_title = _token_for_field(region_tokens, "title", primary_engine)
    secondary_title = _token_for_field(region_tokens, "title", secondary_engine)
    primary_schedule = _token_for_field(region_tokens, "schedule", primary_engine)
    secondary_schedule = _token_for_field(region_tokens, "schedule", secondary_engine)
    primary_day = _token_for_field(region_tokens, "day_banner", primary_engine)
    secondary_day = _token_for_field(region_tokens, "day_banner", secondary_engine)
    primary_location = _token_for_field(region_tokens, "location", primary_engine)
    secondary_location = _token_for_field(region_tokens, "location", secondary_engine)
    primary_movie_title = _token_for_field(region_tokens, "movie_title", primary_engine)
    secondary_movie_title = _token_for_field(region_tokens, "movie_title", secondary_engine)
    primary_legend = _token_for_field(region_tokens, "fee_legend", primary_engine) or _fee_legend_token(snapshot, primary_engine)
    secondary_legend = _token_for_field(region_tokens, "fee_legend", secondary_engine) or _fee_legend_token(snapshot, secondary_engine)
    if not all([primary_title, secondary_title, primary_schedule, secondary_schedule, primary_location, secondary_location]):
        return None
    if candidate_type == "movie" and not all([primary_movie_title, secondary_movie_title]):
        return None

    primary_schedule_text = _compose_schedule_text(primary_schedule, primary_day)
    secondary_schedule_text = _compose_schedule_text(secondary_schedule, secondary_day)
    title_agreement = evaluate_field_agreement(
        "title",
        primary_text=_raw_text(primary_title),
        secondary_text=_raw_text(secondary_title),
    )
    schedule_agreement = evaluate_field_agreement(
        "schedule",
        primary_text=primary_schedule_text,
        secondary_text=secondary_schedule_text,
    )
    schedule_agreement = _reconcile_composed_schedule_agreement(
        schedule_agreement,
        primary_schedule_text=primary_schedule_text,
        secondary_schedule_text=secondary_schedule_text,
        primary_schedule=primary_schedule,
        secondary_schedule=secondary_schedule,
        primary_day=primary_day,
        secondary_day=secondary_day,
    )
    location_agreement = evaluate_field_agreement(
        "location",
        primary_text=_raw_text(primary_location),
        secondary_text=_raw_text(secondary_location),
    )
    movie_title_agreement = None
    if candidate_type == "movie":
        movie_title_agreement = evaluate_field_agreement(
            "title",
            primary_text=_raw_text(primary_movie_title),
            secondary_text=_raw_text(secondary_movie_title),
        )
    fee = reconcile_fee_evidence(
        title_text=_raw_text(primary_title),
        body_text="",
        legend_text=" ".join(text for text in (_raw_text(primary_legend), _raw_text(secondary_legend)) if text),
    )
    primary_fee_text = "($)" if _fee_marker_present(_raw_text(primary_title)) else "no fee marker"
    secondary_fee_text = "($)" if _fee_marker_present(_raw_text(secondary_title)) else "no fee marker"
    primary_fee_engine = _fee_engine_token_from_title(primary_title, field_text=primary_fee_text)
    secondary_fee_engine = _fee_engine_token_from_title(secondary_title, field_text=secondary_fee_text)
    fee_agreement = evaluate_field_agreement(
        "fee",
        primary_text=primary_fee_text,
        secondary_text=secondary_fee_text,
    )
    if (
        fee["status"] != "validated"
        and fee_agreement["agreement"] == "exact_after_normalization"
        and primary_fee_text == "no fee marker"
        and secondary_fee_text == "no fee marker"
    ):
        fee = {
            **fee,
            "fee_required": False,
            "status": "validated",
            "findings": [],
            "signals": {
                **dict(fee.get("signals") or {}),
                "two_engine_no_fee_marker": True,
            },
        }
    schedule_normalized = normalize_schedule_text(primary_schedule_text)
    location_normalized = normalize_location_text(_raw_text(primary_location))
    findings: list[str] = []
    if fee["status"] != "validated":
        findings.extend(str(finding) for finding in fee.get("findings", []))

    content_sha256 = str(snapshot.get("source_sha256") or "")
    field_evidence = {
        "region": _region_evidence(snapshot, region),
        "title": build_field_evidence(
            field="title",
            raw_value=_raw_text(primary_title),
            normalized_value=title_agreement["normalized_value"],
            content_sha256=content_sha256,
            region=_field_region(region, primary_title, secondary_title),
            primary_engine=primary_title,
            secondary_engine=secondary_title,
            agreement=title_agreement["agreement"],
            review_status="not_required" if title_agreement["agreement"] == "exact_after_normalization" else "required",
        ),
        "schedule": build_field_evidence(
            field="schedule",
            raw_value=primary_schedule_text,
            normalized_value=schedule_normalized,
            content_sha256=content_sha256,
            region=_field_region(region, primary_schedule, secondary_schedule),
            primary_engine=primary_schedule,
            secondary_engine=secondary_schedule,
            agreement=schedule_agreement["agreement"],
            review_status="not_required" if schedule_agreement["agreement"] == "exact_after_normalization" else "required",
        ),
        "location": build_field_evidence(
            field="location",
            raw_value=_raw_text(primary_location),
            normalized_value=location_normalized["location_id"],
            content_sha256=content_sha256,
            region=_field_region(region, primary_location, secondary_location),
            primary_engine=primary_location,
            secondary_engine=secondary_location,
            agreement=location_agreement["agreement"],
            review_status="not_required" if location_agreement["agreement"] == "exact_after_normalization" else "required",
        ),
        "fee": build_field_evidence(
            field="fee",
            raw_value=(
                "no fee marker"
                if fee.get("signals", {}).get("two_engine_no_fee_marker")
                else " ".join(
                    text for text in (_raw_text(primary_title), _raw_text(primary_legend), _raw_text(secondary_legend)) if text
                ).strip()
            ),
            normalized_value=fee["fee_required"],
            content_sha256=content_sha256,
            region=_field_region(region, primary_fee_engine, secondary_fee_engine),
            primary_engine=primary_fee_engine,
            secondary_engine=secondary_fee_engine,
            agreement=fee_agreement["agreement"],
            review_status="not_required" if fee_agreement["agreement"] == "exact_after_normalization" else "required",
        ),
    }
    movie_title = None
    normalized_movie_title = None
    if candidate_type == "movie" and movie_title_agreement is not None:
        movie_title = _raw_text(primary_movie_title)
        normalized_movie_title = movie_title_agreement["normalized_value"]
        field_evidence["movie_title"] = build_field_evidence(
            field="movie_title",
            raw_value=movie_title,
            normalized_value=normalized_movie_title,
            content_sha256=content_sha256,
            region=_field_region(region, primary_movie_title, secondary_movie_title),
            primary_engine=primary_movie_title,
            secondary_engine=secondary_movie_title,
            agreement=movie_title_agreement["agreement"],
            review_status="not_required" if movie_title_agreement["agreement"] == "exact_after_normalization" else "required",
        )

    source_spans = {
        "title": _source_span("title", primary_title, region=region),
        "schedule": _source_span("schedule", primary_schedule, text=primary_schedule_text, region=region),
        "location": _source_span("location", primary_location, region=region),
        "fee": _source_span("fee", primary_legend or primary_title, region=region),
    }
    if candidate_type == "movie":
        source_spans["movie_title"] = _source_span("movie_title", primary_movie_title, region=region)

    return {
        "source_title": _raw_text(primary_title),
        "normalized_title": title_agreement["normalized_value"],
        "movie_title": movie_title,
        "normalized_movie_title": normalized_movie_title,
        "location_text": _raw_text(primary_location),
        "normalized_location_id": location_normalized["location_id"],
        "schedule_raw": primary_schedule_text,
        "schedule_normalized": schedule_normalized,
        "fee_required": fee["fee_required"],
        "validation_findings": findings,
        "field_evidence": field_evidence,
        "source_spans": source_spans,
    }


def extract_candidates_from_snapshot(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    regions = snapshot.get("regions") if isinstance(snapshot.get("regions"), list) else []
    tokens = snapshot.get("tokens") if isinstance(snapshot.get("tokens"), list) else []
    canonical_page_image_sha256s = _canonical_page_image_sha256s(snapshot)
    document_family = str(snapshot.get("document_family") or "unknown_visual_schedule")
    derived_source_links = (
        snapshot.get("derived_source_links")
        if isinstance(snapshot.get("derived_source_links"), list)
        else []
    )
    candidates: list[dict[str, Any]] = []

    for region in regions:
        if not isinstance(region, dict):
            continue
        region_type = str(region.get("region_type") or "")
        candidate_type = PUBLISHABLE_REGION_TYPES.get(region_type)
        generic_review_only = document_family == "unknown_visual_schedule" and region_type in GENERIC_REVIEW_REGION_TYPES
        if generic_review_only:
            candidate_type = "generic_visual_review"
        if candidate_type is None:
            continue

        findings: list[str] = []
        if generic_review_only:
            findings.extend(["unknown_document_family", "generic_visual_schedule_review_required"])
        if not tokens:
            findings.append("ocr_text_missing")
        region_tokens = _region_tokens(tokens, region)
        movie_token_groups = _heuristic_aframe_movie_token_groups(
            snapshot=snapshot,
            region=region,
            region_tokens=region_tokens,
        )
        activity_token_groups = [
            *_heuristic_vertical_activity_token_groups(
                snapshot=snapshot,
                region=region,
                region_tokens=region_tokens,
            ),
            *_heuristic_aframe_activity_token_groups(
                snapshot=snapshot,
                region=region,
                region_tokens=region_tokens,
            ),
        ]
        if region_type == "movie_section" and movie_token_groups:
            heuristic_token_groups = movie_token_groups
            extracted_candidate_type = "movie"
        elif region_type == "movie_section" and activity_token_groups:
            heuristic_token_groups = activity_token_groups
            extracted_candidate_type = "activity"
        else:
            heuristic_token_groups = [*activity_token_groups, *movie_token_groups]
            extracted_candidate_type = candidate_type
        extracted_group_results = [
            _extracted_candidate(
                snapshot,
                region,
                token_group,
                candidate_type=extracted_candidate_type,
            )
            for token_group in heuristic_token_groups
        ]
        extracted_group_results = [result for result in extracted_group_results if result is not None]
        if not extracted_group_results and tokens:
            extracted = _extracted_candidate(
                snapshot,
                region,
                region_tokens,
                candidate_type=extracted_candidate_type,
            )
            if extracted is not None:
                extracted_group_results = [extracted]
        if not extracted_group_results:
            extracted_group_results = [{
            "source_title": None,
            "normalized_title": None,
            "movie_title": None,
            "normalized_movie_title": None,
            "location_text": None,
            "normalized_location_id": None,
            "schedule_raw": None,
            "schedule_normalized": None,
            "fee_required": None,
            "validation_findings": findings or ["field_extraction_not_implemented"],
            "field_evidence": {
                "region": _region_evidence(snapshot, region),
            },
            "source_spans": {},
        }]

        for extracted_fields in extracted_group_results:
            candidate = {
                "pipeline_version": snapshot.get("pipeline_version", "vision_v3_001"),
                "config_hash": snapshot.get("config_hash"),
                "runtime_lineage": snapshot.get("runtime_lineage"),
                "document_family": document_family,
                "source_document_id": snapshot.get("source_document_id"),
                "content_sha256": snapshot.get("source_sha256"),
                "canonical_page_image_sha256s": canonical_page_image_sha256s,
                "calendar_group_key": snapshot.get("calendar_group_key"),
                "edition": snapshot.get("edition"),
                "source_type": snapshot.get("source_type"),
                "candidate_type": extracted_candidate_type,
                "region_id": region.get("region_id"),
                "region_type": region_type,
                "source_title": extracted_fields["source_title"],
                "normalized_title": extracted_fields["normalized_title"],
                "movie_title": extracted_fields["movie_title"],
                "normalized_movie_title": extracted_fields["normalized_movie_title"],
                "location_text": extracted_fields["location_text"],
                "normalized_location_id": extracted_fields["normalized_location_id"],
                "schedule_raw": extracted_fields["schedule_raw"],
                "schedule_normalized": extracted_fields["schedule_normalized"],
                "description": None,
                "fee_required": extracted_fields["fee_required"],
                "registration_required": None,
                "weather_note": None,
                "validation_status": "needs_review",
                "validation_findings": extracted_fields["validation_findings"],
                "field_evidence": extracted_fields["field_evidence"],
                "source_spans": extracted_fields["source_spans"],
                "derived_source_links": derived_source_links,
            }
            candidate["candidate_id"] = _stable_candidate_id(candidate)
            candidates.append(candidate)
            for field in SOURCE_METADATA_FIELDS:
                if field in snapshot:
                    candidates[-1][field] = snapshot[field]

    return candidates


def _snapshot_paths(snapshots_dir: Path) -> list[Path]:
    if not snapshots_dir.exists():
        return []
    return sorted(snapshots_dir.glob("*.vision.json"))


def _snapshot_matches_filters(
    snapshot: dict[str, Any],
    *,
    group: str | None,
    quarter: str | None,
) -> bool:
    if group and snapshot.get("calendar_group_key") != group:
        return False
    edition = str(snapshot.get("edition") or "")
    if not edition_matches_quarter(edition, quarter):
        return False
    return True


def candidates_output_path(snapshot: dict[str, Any], *, output_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    source_hash = str(snapshot.get("source_sha256") or "unknown")
    return output_dir / f"{source_hash}.candidates.json"


def extract_candidates_from_directory(
    *,
    snapshots_dir: Path = DEFAULT_SNAPSHOTS_DIR,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    report_path: Path | None = DEFAULT_REPORT_PATH,
    group: str | None = None,
    quarter: str | None = None,
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    for snapshot_path in _snapshot_paths(snapshots_dir):
        try:
            snapshot = json.loads(snapshot_path.read_text())
            if not _snapshot_matches_filters(snapshot, group=group, quarter=quarter):
                continue
            candidates = extract_candidates_from_snapshot(snapshot)
            output_path = candidates_output_path(snapshot, output_dir=output_dir)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(candidates, indent=2, sort_keys=True) + "\n")
            results.append(
                {
                    "status": "extracted",
                    "snapshot_path": str(snapshot_path),
                    "candidates_path": str(output_path),
                    "source_sha256": snapshot.get("source_sha256"),
                    "calendar_group_key": snapshot.get("calendar_group_key"),
                    "edition": snapshot.get("edition"),
                    "candidate_count": len(candidates),
                    "error": None,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "status": "parser_error",
                    "snapshot_path": str(snapshot_path),
                    "candidates_path": None,
                    "source_sha256": None,
                    "calendar_group_key": None,
                    "edition": None,
                    "candidate_count": 0,
                    "error": str(exc),
                }
            )

    report = {
        "report_kind": "v3_extract",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "snapshots_dir": str(snapshots_dir),
        "output_dir": str(output_dir),
        "quarter": quarter,
        "group": group,
        "summary": {
            "snapshot_count": len(results),
            "candidate_count": sum(int(result["candidate_count"]) for result in results),
            "parser_error_count": sum(1 for result in results if result["status"] == "parser_error"),
        },
        "results": results,
    }
    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract v3 candidates from a vision snapshot")
    parser.add_argument("snapshot", type=Path, nargs="?")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--snapshots-dir", type=Path, default=DEFAULT_SNAPSHOTS_DIR)
    parser.add_argument("--report-path", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--group")
    parser.add_argument("--quarter")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.snapshot:
        snapshot = json.loads(args.snapshot.read_text())
        candidates = extract_candidates_from_snapshot(snapshot)
        if args.json:
            print(json.dumps(candidates, indent=2, sort_keys=True))
            return
        output_path = candidates_output_path(snapshot, output_dir=args.output_dir)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(candidates, indent=2, sort_keys=True) + "\n")
        print(output_path)
        return

    report = extract_candidates_from_directory(
        snapshots_dir=args.snapshots_dir,
        output_dir=args.output_dir,
        report_path=args.report_path,
        group=args.group,
        quarter=args.quarter,
    )
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(args.report_path)


if __name__ == "__main__":
    main()
