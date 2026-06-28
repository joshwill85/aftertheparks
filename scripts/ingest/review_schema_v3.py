"""Review decision schema helpers for vision v3 candidates."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


VALID_DECISIONS = {"approve", "edit", "reject"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _require_text(value: object, field_name: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError(f"missing_{field_name}")
    return text


def build_review_decision(
    task: dict[str, Any],
    *,
    reviewer: str,
    decision: str,
    approved_fields: dict[str, Any] | None = None,
    reason: str,
    decided_at: str | None = None,
) -> dict[str, Any]:
    if decision not in VALID_DECISIONS:
        raise ValueError(f"invalid_review_decision:{decision}")
    if decision in {"approve", "edit"} and not approved_fields:
        raise ValueError("missing_approved_fields")

    candidate = task.get("candidate") if isinstance(task.get("candidate"), dict) else {}
    return {
        "schema_version": "review_decision_v3_001",
        "task_id": _require_text(task.get("task_id"), "task_id"),
        "task_type": task.get("task_type"),
        "candidate_id": candidate.get("candidate_id") or task.get("task_id"),
        "candidate_type": candidate.get("candidate_type") or task.get("candidate_type"),
        "calendar_group_key": candidate.get("calendar_group_key") or task.get("calendar_group_key"),
        "source_document_id": task.get("source_document_id"),
        "content_sha256": _require_text(task.get("content_sha256"), "content_sha256"),
        "page_image_sha256": task.get("page_image"),
        "field_crop": task.get("field_crop"),
        "field_crop_sha256": task.get("field_crop_sha256"),
        "reviewer": _require_text(reviewer, "reviewer"),
        "decision": decision,
        "approved_fields": approved_fields or {},
        "reason": _require_text(reason, "reason"),
        "decided_at": decided_at or _now_iso(),
        "original_task": task,
    }


def review_decision_creates_fixture_candidate(decision: dict[str, Any]) -> dict[str, Any]:
    return {
        "fixture_kind": "review_fixture_candidate_v3",
        "schema_version": "review_fixture_candidate_v3_001",
        "candidate_id": decision.get("candidate_id"),
        "task_id": decision.get("task_id"),
        "calendar_group_key": decision.get("calendar_group_key"),
        "candidate_type": decision.get("candidate_type"),
        "source_document_id": decision.get("source_document_id"),
        "content_sha256": decision.get("content_sha256"),
        "page_image_sha256": decision.get("page_image_sha256"),
        "field_crop": decision.get("field_crop"),
        "field_crop_sha256": decision.get("field_crop_sha256"),
        "approved_fields": decision.get("approved_fields") or {},
        "reviewer": decision.get("reviewer"),
        "review_reason": decision.get("reason"),
        "review_decided_at": decision.get("decided_at"),
    }
