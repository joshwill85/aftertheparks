"""Shared title fidelity checks for activity ingest."""

from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPAIRS_PATH = ROOT / "data" / "quality" / "activity_title_repairs.json"
FIELD_REPAIRS_PATH = ROOT / "data" / "quality" / "activity_field_repairs.json"


@lru_cache(maxsize=1)
def _repair_data() -> dict:
    return json.loads(REPAIRS_PATH.read_text())


@lru_cache(maxsize=1)
def _field_repair_data() -> dict:
    if not FIELD_REPAIRS_PATH.exists():
        return {"knownFieldRepairs": []}
    return json.loads(FIELD_REPAIRS_PATH.read_text())


def activity_title_repair_key(raw: str) -> str:
    text = unicodedata.normalize("NFKD", raw)
    return re.sub(r"[^A-Za-z0-9]+", "", text).upper()


def _field_repair_key(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def repair_known_activity_title(raw: str) -> str | None:
    return _repair_data()["knownTitleRepairs"].get(activity_title_repair_key(raw))


def repair_known_context_activity_title(
    *,
    calendar_group_key: str,
    raw: str,
) -> str | None:
    raw_key = activity_title_repair_key(raw)
    for repair in _repair_data().get("knownContextTitleRepairs", []):
        if not isinstance(repair, dict):
            continue
        if repair.get("calendar_group_key") != calendar_group_key:
            continue
        if activity_title_repair_key(str(repair.get("raw_value", ""))) != raw_key:
            continue
        value = repair.get("value")
        return str(value) if isinstance(value, str) and value.strip() else None
    return None


def repair_known_activity_field(
    *,
    calendar_group_key: str,
    slug: str,
    field: str,
    raw_value: str,
) -> str | None:
    raw_key = _field_repair_key(raw_value)
    for repair in _field_repair_data().get("knownFieldRepairs", []):
        if not isinstance(repair, dict):
            continue
        if repair.get("calendar_group_key") != calendar_group_key:
            continue
        if repair.get("slug") != slug:
            continue
        if repair.get("field") != field:
            continue
        if _field_repair_key(str(repair.get("raw_value", ""))) != raw_key:
            continue
        value = repair.get("value")
        return str(value) if isinstance(value, str) and value.strip() else None
    return None


def is_blocked_activity_title(raw: str) -> bool:
    return activity_title_repair_key(raw) in set(_repair_data()["blockedTitleKeys"])


def is_ocr_spaced_title(raw: str) -> bool:
    title = re.sub(r"\s+", " ", raw).strip()
    if not title:
        return False

    alpha_tokens = [
        re.sub(r"[^A-Za-z]", "", token)
        for token in title.split()
    ]
    alpha_tokens = [token for token in alpha_tokens if token]
    if len(alpha_tokens) < 4:
        return False

    short_tokens = sum(1 for token in alpha_tokens if len(token) <= 2)
    return short_tokens / len(alpha_tokens) >= 0.65


def looks_corrupt_activity_slug(slug: str) -> bool:
    normalized = slug.strip().lower()
    if not normalized:
        return True

    parts = [part for part in normalized.split("-") if part]
    if not parts:
        return True

    single_char_parts = sum(1 for part in parts if len(part) == 1)
    if len(parts) >= 5 and single_char_parts / len(parts) >= 0.55:
        return True

    if len(parts) >= 3 and all(len(part) <= 2 for part in parts) and len(normalized) <= 14:
        return True

    return False
