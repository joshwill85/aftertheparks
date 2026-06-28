"""Fee marker and legend reconciliation for vision v3 candidates."""

from __future__ import annotations

import re
from typing import Any


FEE_MARKER = "($)"
FEE_PHRASE_RE = re.compile(r"\bfees?\s+may\s+apply\b|\bfee\s+associated\b", re.IGNORECASE)


def _text(value: object) -> str:
    return " ".join(str(value or "").split())


def _has_fee_marker(value: object) -> bool:
    return FEE_MARKER in _text(value)


def _has_fee_phrase(value: object) -> bool:
    return bool(FEE_PHRASE_RE.search(_text(value)))


def reconcile_fee_evidence(
    *,
    title_text: object,
    body_text: object,
    legend_text: object,
) -> dict[str, Any]:
    title_has_marker = _has_fee_marker(title_text)
    body_has_fee_phrase = _has_fee_phrase(body_text)
    legend_explains_marker = _has_fee_marker(legend_text) and _has_fee_phrase(legend_text)
    findings: list[str] = []

    if title_has_marker and not legend_explains_marker:
        findings.append("fee_marker_without_legend")
    if title_has_marker or body_has_fee_phrase:
        return {
            "fee_required": True,
            "status": "needs_review" if findings else "validated",
            "findings": findings,
            "signals": {
                "title_has_marker": title_has_marker,
                "body_has_fee_phrase": body_has_fee_phrase,
                "legend_explains_marker": legend_explains_marker,
            },
        }
    if legend_explains_marker:
        return {
            "fee_required": False,
            "status": "validated",
            "findings": [],
            "signals": {
                "title_has_marker": False,
                "body_has_fee_phrase": False,
                "legend_explains_marker": True,
            },
        }
    return {
        "fee_required": None,
        "status": "needs_review",
        "findings": ["fee_legend_missing_for_unmarked_title"],
        "signals": {
            "title_has_marker": False,
            "body_has_fee_phrase": False,
            "legend_explains_marker": False,
        },
    }
