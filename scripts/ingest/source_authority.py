"""Shared source authority rules for Disney activity trust audits."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


POLICY_PATH = Path("data/quality/source_authority_policy.json")


@lru_cache(maxsize=1)
def load_source_authority_policy(path: Path = POLICY_PATH) -> dict[str, Any]:
    policy = json.loads(path.read_text())
    if not isinstance(policy.get("sourcePrecedence"), list):
        raise ValueError("source_authority_policy_missing_sourcePrecedence")
    if not isinstance(policy.get("priceRules"), dict):
        raise ValueError("source_authority_policy_missing_priceRules")
    return policy


def _policy_row(source_kind: str) -> dict[str, Any] | None:
    for row in load_source_authority_policy()["sourcePrecedence"]:
        if row.get("sourceKind") == source_kind:
            return row
    return None


def source_kind_authority(source_kind: str) -> str:
    row = _policy_row(source_kind)
    if row is None:
        return "unknown"
    return str(row.get("authority") or "")


def can_source_set_public_price(source_kind: str) -> bool:
    row = _policy_row(source_kind)
    if row is None:
        return False
    forbidden = set(row.get("forbiddenFields") or [])
    return "public_price_state" not in forbidden and "public_price_amount" not in forbidden


def third_party_can_override_disney_free(source_kind: str) -> bool:
    row = _policy_row(source_kind)
    if row is None:
        return False
    return "disney_free_price_state" not in set(row.get("cannotOverride") or [])
