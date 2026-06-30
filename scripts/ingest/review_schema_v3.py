"""Review decision schema helpers for vision v3 candidates."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR


VALID_DECISIONS = {"approve", "edit", "reject"}
APPROVABLE_FIELDS = {"title", "schedule", "location", "fee", "movie_title"}
DEFAULT_REVIEW_DECISIONS_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_decisions.json"
DEFAULT_FIXTURE_CANDIDATES_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_fixture_candidates.json"
DEFAULT_PARSER_RULE_REQUESTS_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_parser_rule_update_requests.json"
DEFAULT_DUAL_RUN_REVIEW_KEYS_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_dual_run_review_keys.json"
DEFAULT_REVIEWED_SOURCE_DRIFT_REPORT_PATH = (
    PROCESSED_DIR / "review_queue" / "vision_v3_reviewed_source_drift_report.json"
)
DEFAULT_SOURCE_DRIFT_REPORT_PATH = PROCESSED_DIR / "source_drift_report.json"
DEFAULT_REVIEW_QUEUE_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_queue.json"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _require_text(value: object, field_name: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError(f"missing_{field_name}")
    return text


def _has_normalized_value(value: object) -> bool:
    if isinstance(value, bool):
        return True
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (dict, list, tuple, set)):
        return bool(value)
    return True


def _validate_approved_fields(approved_fields: dict[str, Any]) -> None:
    for field_name, field in approved_fields.items():
        if field_name not in APPROVABLE_FIELDS:
            raise ValueError(f"unknown_approved_field:{field_name}")
        if not isinstance(field, dict) or not _has_normalized_value(field.get("normalized_value")):
            raise ValueError(f"missing_approved_field_normalized_value:{field_name}")


def _validate_approved_fields_match_task(decision_or_task: dict[str, Any], approved_fields: dict[str, Any]) -> None:
    original_task = (
        decision_or_task.get("original_task")
        if isinstance(decision_or_task.get("original_task"), dict)
        else decision_or_task
    )
    if not isinstance(original_task, dict):
        return
    task_field = str(original_task.get("field") or "").strip()
    if task_field in APPROVABLE_FIELDS and set(approved_fields) != {task_field}:
        raise ValueError(f"approved_fields_do_not_match_task_field:{task_field}")


def _task_page_image_sha256(task: dict[str, Any]) -> Any:
    return task.get("page_image_sha256") or task.get("page_image")


def _is_non_field_review_approval(decision_or_task: dict[str, Any]) -> bool:
    original_task = (
        decision_or_task.get("original_task")
        if isinstance(decision_or_task.get("original_task"), dict)
        else decision_or_task
    )
    if not isinstance(original_task, dict):
        return False
    if (
        original_task.get("candidate_type") == "dual_run_status_transition"
        and original_task.get("field") == "status_transition"
        and isinstance(original_task.get("dual_run_status_transition"), dict)
    ):
        return True
    if (
        original_task.get("candidate_type") == "dual_run_new_record"
        and original_task.get("field") == "new_record"
        and isinstance(original_task.get("dual_run_new_record"), dict)
    ):
        return True
    if (
        original_task.get("candidate_type") == "dual_run_missing_v2_record"
        and original_task.get("field") == "missing_v2_record"
        and isinstance(original_task.get("dual_run_missing_v2_record"), dict)
    ):
        return True
    return (
        original_task.get("candidate_type") == "source_drift"
        and original_task.get("task_type") == "source_changed"
        and isinstance(original_task.get("source_drift"), dict)
        and isinstance(original_task.get("source_drift_report"), dict)
    )


def validate_review_decision(decision: dict[str, Any]) -> None:
    if not isinstance(decision, dict):
        raise ValueError("invalid_review_decision_shape")
    decision_value = decision.get("decision")
    if decision_value not in VALID_DECISIONS:
        raise ValueError(f"invalid_review_decision:{decision_value}")
    _require_text(decision.get("task_id"), "task_id")
    _require_text(decision.get("candidate_id"), "candidate_id")
    _require_text(decision.get("content_sha256"), "content_sha256")
    _require_text(decision.get("reviewer"), "reviewer")
    _require_text(decision.get("reason"), "reason")
    _require_text(decision.get("decided_at"), "decided_at")
    if decision_value in {"approve", "edit"}:
        if _is_non_field_review_approval(decision):
            return
        approved_fields = decision.get("approved_fields")
        if not isinstance(approved_fields, dict) or not approved_fields:
            raise ValueError("missing_approved_fields")
        _require_text(decision.get("page_image_sha256"), "page_image_sha256")
        _require_text(decision.get("field_crop"), "field_crop")
        _require_text(decision.get("field_crop_sha256"), "field_crop_sha256")
        _validate_approved_fields(approved_fields)
        _validate_approved_fields_match_task(decision, approved_fields)


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
    if decision in {"approve", "edit"}:
        non_field_approval = _is_non_field_review_approval(task)
        if not approved_fields and not non_field_approval:
            raise ValueError("missing_approved_fields")
        if not non_field_approval:
            _require_text(_task_page_image_sha256(task), "page_image_sha256")
            _require_text(task.get("field_crop"), "field_crop")
            _require_text(task.get("field_crop_sha256"), "field_crop_sha256")
        _validate_approved_fields(approved_fields or {})

    candidate = task.get("candidate") if isinstance(task.get("candidate"), dict) else {}
    review_decision = {
        "schema_version": "review_decision_v3_001",
        "task_id": _require_text(task.get("task_id"), "task_id"),
        "task_type": task.get("task_type"),
        "candidate_id": candidate.get("candidate_id") or task.get("task_id"),
        "candidate_type": candidate.get("candidate_type") or task.get("candidate_type"),
        "calendar_group_key": candidate.get("calendar_group_key") or task.get("calendar_group_key"),
        "source_document_id": task.get("source_document_id"),
        "content_sha256": _require_text(task.get("content_sha256"), "content_sha256"),
        "page_image_sha256": _task_page_image_sha256(task),
        "field_crop": task.get("field_crop"),
        "field_crop_sha256": task.get("field_crop_sha256"),
        "reviewer": _require_text(reviewer, "reviewer"),
        "decision": decision,
        "approved_fields": approved_fields or {},
        "reason": _require_text(reason, "reason"),
        "decided_at": decided_at or _now_iso(),
        "original_task": task,
    }
    validate_review_decision(review_decision)
    return review_decision


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


def review_decision_creates_parser_rule_update_request(decision: dict[str, Any]) -> dict[str, Any]:
    original_task = decision.get("original_task") if isinstance(decision.get("original_task"), dict) else {}
    return {
        "request_kind": "parser_rule_update_request_v3",
        "schema_version": "parser_rule_update_request_v3_001",
        "candidate_id": decision.get("candidate_id"),
        "task_id": decision.get("task_id"),
        "task_type": decision.get("task_type"),
        "field": original_task.get("field"),
        "calendar_group_key": decision.get("calendar_group_key"),
        "candidate_type": decision.get("candidate_type"),
        "source_document_id": decision.get("source_document_id"),
        "content_sha256": decision.get("content_sha256"),
        "page_image_sha256": decision.get("page_image_sha256"),
        "field_crop": decision.get("field_crop"),
        "field_crop_sha256": decision.get("field_crop_sha256"),
        "validation_findings": original_task.get("validation_findings") or [],
        "existing_gold_comparison": original_task.get("existing_gold_comparison"),
        "snapshot_path": original_task.get("snapshot_path"),
        "source_metadata": original_task.get("source_metadata"),
        "source_status": original_task.get("source_status"),
        "decision": decision.get("decision"),
        "approved_fields": decision.get("approved_fields") or {},
        "reviewer": decision.get("reviewer"),
        "review_reason": decision.get("reason"),
        "review_decided_at": decision.get("decided_at"),
        "suggested_action": "update_parser_rule_or_fixture",
    }


def _is_minimally_valid_dual_run_review_decision(decision: dict[str, Any]) -> bool:
    if not isinstance(decision, dict) or decision.get("decision") not in {"approve", "edit", "reject"}:
        return False
    for field_name in ("task_id", "candidate_id", "content_sha256", "reviewer", "reason", "decided_at"):
        if not str(decision.get(field_name) or "").strip():
            return False
    return isinstance(decision.get("original_task"), dict)


def _dual_run_review_key(decision: dict[str, Any]) -> tuple[str, str] | None:
    original_task = decision.get("original_task") if isinstance(decision.get("original_task"), dict) else {}
    dual_run_diff = original_task.get("dual_run_diff") if isinstance(original_task.get("dual_run_diff"), dict) else {}
    diff_key = str(dual_run_diff.get("diff_key") or "").strip()
    if diff_key:
        return ("diff", diff_key)

    status_transition = (
        original_task.get("dual_run_status_transition")
        if isinstance(original_task.get("dual_run_status_transition"), dict)
        else {}
    )
    transition_key = str(status_transition.get("transition_key") or "").strip()
    if transition_key:
        return ("status_transition", transition_key)

    new_record = (
        original_task.get("dual_run_new_record")
        if isinstance(original_task.get("dual_run_new_record"), dict)
        else {}
    )
    new_record_key = str(new_record.get("review_key") or "").strip()
    if new_record_key:
        return ("new_record", new_record_key)

    missing_record = (
        original_task.get("dual_run_missing_v2_record")
        if isinstance(original_task.get("dual_run_missing_v2_record"), dict)
        else {}
    )
    missing_record_key = str(missing_record.get("review_key") or "").strip()
    if missing_record_key:
        return ("missing_v2_record", missing_record_key)
    return None


def _dual_run_required_content_hash(decision: dict[str, Any]) -> str:
    original_task = decision.get("original_task") if isinstance(decision.get("original_task"), dict) else {}
    task_hash = str(original_task.get("content_sha256") or "").strip()
    if task_hash:
        return task_hash

    dual_run_diff = original_task.get("dual_run_diff") if isinstance(original_task.get("dual_run_diff"), dict) else {}
    evidence = (
        dual_run_diff.get("v3_field_evidence")
        if isinstance(dual_run_diff.get("v3_field_evidence"), dict)
        else {}
    )
    source = evidence.get("source") if isinstance(evidence.get("source"), dict) else {}
    evidence_hash = str(source.get("content_sha256") or "").strip()
    if evidence_hash:
        return evidence_hash

    status_transition = (
        original_task.get("dual_run_status_transition")
        if isinstance(original_task.get("dual_run_status_transition"), dict)
        else {}
    )
    status_hash = str(status_transition.get("content_sha256") or "").strip()
    if status_hash:
        return status_hash

    new_record = (
        original_task.get("dual_run_new_record")
        if isinstance(original_task.get("dual_run_new_record"), dict)
        else {}
    )
    new_record_hash = str(new_record.get("content_sha256") or "").strip()
    if new_record_hash:
        return new_record_hash

    missing_record = (
        original_task.get("dual_run_missing_v2_record")
        if isinstance(original_task.get("dual_run_missing_v2_record"), dict)
        else {}
    )
    return str(missing_record.get("content_sha256") or "").strip()


def _dual_run_review_manifest(decision: dict[str, Any], key_value: str, required_hash: str) -> dict[str, Any]:
    return {
        "key": key_value,
        "task_id": decision.get("task_id"),
        "content_sha256": required_hash,
        "reviewer": decision.get("reviewer"),
        "decided_at": decision.get("decided_at"),
        "decision": decision.get("decision"),
        "reason": decision.get("reason"),
    }


def _is_source_drift_review_decision(decision: dict[str, Any]) -> bool:
    original_task = decision.get("original_task") if isinstance(decision.get("original_task"), dict) else {}
    return (
        original_task.get("candidate_type") == "source_drift"
        and original_task.get("task_type") == "source_changed"
        and isinstance(original_task.get("source_drift"), dict)
    )


def _source_drift_review_matches_required_task(decision: dict[str, Any], required_task: dict[str, Any]) -> bool:
    original_task = decision.get("original_task") if isinstance(decision.get("original_task"), dict) else {}
    for key in ("task_id", "content_sha256", "source_document_id", "calendar_group_key"):
        expected = str(required_task.get(key) or "").strip()
        if not expected:
            continue
        decision_value = str(decision.get(key) or "").strip()
        original_value = str(original_task.get(key) or "").strip()
        if decision_value != expected or original_value != expected:
            return False
    return True


def _load_json_list(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    payload = json.loads(path.read_text())
    if isinstance(payload, dict) and isinstance(payload.get("decisions"), list):
        payload = payload["decisions"]
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def _load_json_dict(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    payload = json.loads(path.read_text())
    return payload if isinstance(payload, dict) else {}


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def _load_review_decisions_payload(path: Path) -> tuple[list[dict[str, Any]], str]:
    if not path.exists():
        return [], "list"
    payload = json.loads(path.read_text())
    if isinstance(payload, dict) and isinstance(payload.get("decisions"), list):
        return [item for item in payload["decisions"] if isinstance(item, dict)], "dict"
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)], "list"
    raise ValueError("invalid_review_decisions_file")


def _write_review_decisions_payload(path: Path, decisions: list[dict[str, Any]], payload_shape: str) -> None:
    if payload_shape == "dict":
        _write_json(path, {"decisions": decisions})
        return
    _write_json(path, decisions)


def _load_review_task(queue_path: Path, task_id: str) -> dict[str, Any]:
    tasks = _load_json_list(queue_path)
    matches = [task for task in tasks if str(task.get("task_id") or "").strip() == task_id]
    if not matches:
        raise ValueError(f"review_task_not_found:{task_id}")
    if len(matches) > 1:
        raise ValueError(f"review_task_not_unique:{task_id}")
    return matches[0]


def _parse_approved_fields_json(value: str | None) -> dict[str, Any] | None:
    if value is None:
        return None
    parsed = json.loads(value)
    if not isinstance(parsed, dict):
        raise ValueError("approved_fields_json_must_be_object")
    return parsed


def _default_approved_fields_from_task(task: dict[str, Any]) -> dict[str, Any]:
    field_name = str(task.get("field") or "").strip()
    if field_name == "price":
        field_name = "fee"
    if field_name not in APPROVABLE_FIELDS:
        return {}
    normalized_value = task.get("normalized_value")
    if not _has_normalized_value(normalized_value):
        return {}
    approved_field: dict[str, Any] = {"normalized_value": normalized_value}
    if task.get("candidate_value") is not None:
        approved_field["raw_value"] = task.get("candidate_value")
    return {field_name: approved_field}


def record_review_decision_from_queue(
    *,
    queue_path: Path = DEFAULT_REVIEW_QUEUE_PATH,
    decisions_path: Path = DEFAULT_REVIEW_DECISIONS_PATH,
    task_id: str,
    reviewer: str,
    decision: str,
    reason: str,
    approved_fields: dict[str, Any] | None = None,
    decided_at: str | None = None,
    fixture_candidates_path: Path | None = None,
    parser_rule_requests_path: Path | None = None,
) -> dict[str, Any]:
    task = _load_review_task(queue_path, task_id)
    normalized_decision = decision.strip().lower()
    selected_approved_fields = approved_fields
    if normalized_decision in {"approve", "edit"} and selected_approved_fields is None:
        selected_approved_fields = _default_approved_fields_from_task(task)
    review_decision = build_review_decision(
        task,
        reviewer=reviewer,
        decision=normalized_decision,
        approved_fields=selected_approved_fields,
        reason=reason,
        decided_at=decided_at,
    )
    decisions, payload_shape = _load_review_decisions_payload(decisions_path)
    decisions_by_task_id = {
        str(existing.get("task_id") or ""): index
        for index, existing in enumerate(decisions)
        if str(existing.get("task_id") or "").strip()
    }
    existing_index = decisions_by_task_id.get(review_decision["task_id"])
    if existing_index is None:
        decisions.append(review_decision)
    else:
        decisions[existing_index] = review_decision
    _write_review_decisions_payload(decisions_path, decisions, payload_shape)
    fixture_output = fixture_candidates_path or decisions_path.parent / DEFAULT_FIXTURE_CANDIDATES_PATH.name
    parser_output = parser_rule_requests_path or decisions_path.parent / DEFAULT_PARSER_RULE_REQUESTS_PATH.name
    export_review_fixture_candidates(decisions_path=decisions_path, output_path=fixture_output)
    export_parser_rule_update_requests(decisions_path=decisions_path, output_path=parser_output)
    return {
        "report_kind": "review_decision_v3_record",
        "decisions_path": str(decisions_path),
        "fixture_candidates_path": str(fixture_output),
        "parser_rule_requests_path": str(parser_output),
        "task_id": review_decision["task_id"],
        "decision": review_decision["decision"],
        "content_sha256": review_decision["content_sha256"],
        "page_image_sha256": review_decision.get("page_image_sha256"),
        "field_crop_sha256": review_decision.get("field_crop_sha256"),
        "approved_field_names": sorted(review_decision.get("approved_fields") or {}),
        "decision_count": len(decisions),
    }


def export_review_fixture_candidates(
    *,
    decisions_path: Path = DEFAULT_REVIEW_DECISIONS_PATH,
    output_path: Path = DEFAULT_FIXTURE_CANDIDATES_PATH,
) -> dict[str, Any]:
    decisions = _load_json_list(decisions_path)
    approved: list[dict[str, Any]] = []
    skipped_non_approval = 0
    skipped_non_fixture_approval = 0
    skipped_invalid_review = 0
    for decision in decisions:
        if not isinstance(decision, dict) or decision.get("decision") not in VALID_DECISIONS:
            skipped_invalid_review += 1
            continue
        if decision.get("decision") not in {"approve", "edit"}:
            skipped_non_approval += 1
            continue
        try:
            validate_review_decision(decision)
        except ValueError:
            skipped_invalid_review += 1
            continue
        if _is_non_field_review_approval(decision):
            skipped_non_fixture_approval += 1
            continue
        approved.append(decision)
    candidates = [review_decision_creates_fixture_candidate(decision) for decision in approved]
    payload = {
        "fixture_kind": "review_fixture_candidates_v3",
        "schema_version": "review_fixture_candidates_v3_001",
        "generated_at": _now_iso(),
        "source_decisions_path": str(decisions_path),
        "candidates": candidates,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    return {
        "report_kind": "review_fixture_candidates_v3_export",
        "output_path": str(output_path),
        "summary": {
            "decision_count": len(decisions),
            "fixture_candidate_count": len(candidates),
            "skipped_non_approval_count": skipped_non_approval,
            "skipped_non_fixture_approval_count": skipped_non_fixture_approval,
            "skipped_invalid_review_decision_count": skipped_invalid_review,
        },
    }


def export_parser_rule_update_requests(
    *,
    decisions_path: Path = DEFAULT_REVIEW_DECISIONS_PATH,
    output_path: Path = DEFAULT_PARSER_RULE_REQUESTS_PATH,
) -> dict[str, Any]:
    decisions = _load_json_list(decisions_path)
    requests: list[dict[str, Any]] = []
    skipped_non_parser_rule_decision = 0
    skipped_invalid_review = 0
    for decision in decisions:
        try:
            validate_review_decision(decision)
        except ValueError:
            skipped_invalid_review += 1
            continue
        if _is_non_field_review_approval(decision):
            skipped_non_parser_rule_decision += 1
            continue
        requests.append(review_decision_creates_parser_rule_update_request(decision))
    payload = {
        "request_kind": "parser_rule_update_requests_v3",
        "schema_version": "parser_rule_update_requests_v3_001",
        "generated_at": _now_iso(),
        "source_decisions_path": str(decisions_path),
        "requests": requests,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    return {
        "report_kind": "parser_rule_update_requests_v3_export",
        "output_path": str(output_path),
        "summary": {
            "decision_count": len(decisions),
            "parser_rule_update_request_count": len(requests),
            "skipped_non_parser_rule_decision_count": skipped_non_parser_rule_decision,
            "skipped_invalid_review_decision_count": skipped_invalid_review,
        },
    }


def export_dual_run_review_keys(
    *,
    decisions_path: Path = DEFAULT_REVIEW_DECISIONS_PATH,
    output_path: Path = DEFAULT_DUAL_RUN_REVIEW_KEYS_PATH,
) -> dict[str, Any]:
    decisions = _load_json_list(decisions_path)
    reviewed_diff_keys: set[str] = set()
    reviewed_new_record_keys: set[str] = set()
    reviewed_missing_v2_record_keys: set[str] = set()
    reviewed_status_transition_keys: set[str] = set()
    reviewed_diff_reviews: dict[str, dict[str, Any]] = {}
    reviewed_new_record_reviews: dict[str, dict[str, Any]] = {}
    reviewed_missing_v2_record_reviews: dict[str, dict[str, Any]] = {}
    reviewed_status_transition_reviews: dict[str, dict[str, Any]] = {}
    skipped_non_approval = 0
    skipped_invalid_review = 0
    skipped_stale_review = 0
    skipped_missing_review_hash = 0
    for decision in decisions:
        if not isinstance(decision, dict) or decision.get("decision") not in VALID_DECISIONS:
            skipped_invalid_review += 1
            continue
        if decision.get("decision") not in {"approve", "edit"}:
            skipped_non_approval += 1
            continue
        try:
            validate_review_decision(decision)
            valid = True
        except ValueError:
            valid = _is_minimally_valid_dual_run_review_decision(decision)
        if not valid:
            skipped_invalid_review += 1
            continue
        key = _dual_run_review_key(decision)
        if key is None:
            continue
        required_hash = _dual_run_required_content_hash(decision)
        decision_hash = str(decision.get("content_sha256") or "").strip()
        if not required_hash:
            skipped_missing_review_hash += 1
            continue
        if decision_hash != required_hash:
            skipped_stale_review += 1
            continue
        key_kind, key_value = key
        review_manifest = _dual_run_review_manifest(decision, key_value, required_hash)
        if key_kind == "diff":
            reviewed_diff_keys.add(key_value)
            reviewed_diff_reviews[key_value] = review_manifest
        elif key_kind == "new_record":
            reviewed_new_record_keys.add(key_value)
            reviewed_new_record_reviews[key_value] = review_manifest
        elif key_kind == "missing_v2_record":
            reviewed_missing_v2_record_keys.add(key_value)
            reviewed_missing_v2_record_reviews[key_value] = review_manifest
        elif key_kind == "status_transition":
            reviewed_status_transition_keys.add(key_value)
            reviewed_status_transition_reviews[key_value] = review_manifest
    payload = {
        "review_kind": "dual_run_review_keys_v3",
        "schema_version": "dual_run_review_keys_v3_001",
        "generated_at": _now_iso(),
        "source_decisions_path": str(decisions_path),
        "reviewed_diff_keys": sorted(reviewed_diff_keys),
        "reviewed_new_record_keys": sorted(reviewed_new_record_keys),
        "reviewed_missing_v2_record_keys": sorted(reviewed_missing_v2_record_keys),
        "reviewed_status_transition_keys": sorted(reviewed_status_transition_keys),
        "reviewed_diff_reviews": [
            reviewed_diff_reviews[key]
            for key in sorted(reviewed_diff_reviews)
        ],
        "reviewed_new_record_reviews": [
            reviewed_new_record_reviews[key]
            for key in sorted(reviewed_new_record_reviews)
        ],
        "reviewed_missing_v2_record_reviews": [
            reviewed_missing_v2_record_reviews[key]
            for key in sorted(reviewed_missing_v2_record_reviews)
        ],
        "reviewed_status_transition_reviews": [
            reviewed_status_transition_reviews[key]
            for key in sorted(reviewed_status_transition_reviews)
        ],
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    return {
        "report_kind": "dual_run_review_keys_v3_export",
        "output_path": str(output_path),
        "summary": {
            "decision_count": len(decisions),
            "reviewed_diff_key_count": len(reviewed_diff_keys),
            "reviewed_new_record_key_count": len(reviewed_new_record_keys),
            "reviewed_missing_v2_record_key_count": len(reviewed_missing_v2_record_keys),
            "reviewed_status_transition_key_count": len(reviewed_status_transition_keys),
            "skipped_non_approval_count": skipped_non_approval,
            "skipped_invalid_review_decision_count": skipped_invalid_review,
            "skipped_stale_review_decision_count": skipped_stale_review,
            "skipped_missing_review_hash_count": skipped_missing_review_hash,
        },
    }


def export_reviewed_source_drift_report(
    *,
    decisions_path: Path = DEFAULT_REVIEW_DECISIONS_PATH,
    source_drift_report_path: Path = DEFAULT_SOURCE_DRIFT_REPORT_PATH,
    output_path: Path = DEFAULT_REVIEWED_SOURCE_DRIFT_REPORT_PATH,
) -> dict[str, Any]:
    try:
        from scripts.ingest.build_review_queue_v3 import build_review_tasks
    except ImportError:  # pragma: no cover - supports package-style imports
        try:
            from build_review_queue_v3 import build_review_tasks
        except ImportError:  # pragma: no cover - supports package-style imports
            from .build_review_queue_v3 import build_review_tasks

    source_drift_report = _load_json_dict(source_drift_report_path)
    required_tasks = build_review_tasks([], source_drift_report=source_drift_report)
    required_task_ids = [str(task.get("task_id")) for task in required_tasks if str(task.get("task_id") or "").strip()]
    required_tasks_by_id = {
        str(task.get("task_id")): task
        for task in required_tasks
        if str(task.get("task_id") or "").strip()
    }
    decisions = _load_json_list(decisions_path)
    reviewed_decisions: dict[str, dict[str, Any]] = {}
    skipped_non_approval = 0
    skipped_invalid_review = 0
    skipped_stale_review = 0
    for decision in decisions:
        if not isinstance(decision, dict) or decision.get("decision") not in VALID_DECISIONS:
            skipped_invalid_review += 1
            continue
        if decision.get("decision") not in {"approve", "edit"}:
            skipped_non_approval += 1
            continue
        try:
            validate_review_decision(decision)
        except ValueError:
            skipped_invalid_review += 1
            continue
        if not _is_source_drift_review_decision(decision):
            continue
        task_id = str(decision.get("task_id") or "").strip()
        required_task = required_tasks_by_id.get(task_id)
        required_hash = str((required_task or {}).get("content_sha256") or "").strip()
        decision_hash = str(decision.get("content_sha256") or "").strip()
        if required_task is not None and required_hash and decision_hash != required_hash:
            skipped_stale_review += 1
            continue
        if required_task is not None and not _source_drift_review_matches_required_task(decision, required_task):
            skipped_stale_review += 1
            continue
        if task_id:
            reviewed_decisions[task_id] = decision

    reviewed_task_ids = [task_id for task_id in required_task_ids if task_id in reviewed_decisions]
    missing_task_ids = [task_id for task_id in required_task_ids if task_id not in reviewed_decisions]
    latest_decision = (
        max((reviewed_decisions[task_id] for task_id in reviewed_task_ids), key=lambda item: str(item.get("decided_at") or ""))
        if reviewed_task_ids
        else None
    )
    reviewed_report = dict(source_drift_report)
    reviewed_report["reviewed_source_drift_task_ids"] = reviewed_task_ids
    reviewed_report["missing_source_drift_task_ids"] = missing_task_ids
    if required_task_ids and not missing_task_ids and latest_decision is not None:
        reviewed_report["status"] = "reviewed"
        reviewed_report["review_status"] = "manual_review_approved"
        reviewed_report["review_decision"] = {
            "decision": latest_decision.get("decision"),
            "reviewer": latest_decision.get("reviewer"),
            "decided_at": latest_decision.get("decided_at"),
            "reason": f"Reviewed {len(reviewed_task_ids)} source drift task(s).",
        }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(reviewed_report, indent=2, sort_keys=True) + "\n")
    return {
        "report_kind": "reviewed_source_drift_report_v3_export",
        "output_path": str(output_path),
        "summary": {
            "decision_count": len(decisions),
            "required_source_drift_task_count": len(required_task_ids),
            "reviewed_source_drift_task_count": len(reviewed_task_ids),
            "missing_source_drift_task_count": len(missing_task_ids),
            "skipped_non_approval_count": skipped_non_approval,
            "skipped_invalid_review_decision_count": skipped_invalid_review,
            "skipped_stale_review_decision_count": skipped_stale_review,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Record or export v3 review decisions")
    parser.add_argument("decisions", type=Path, nargs="?", default=DEFAULT_REVIEW_DECISIONS_PATH)
    parser.add_argument("--record-task-id", help="Append or replace a hash-bound review decision for this task id")
    parser.add_argument("--queue", type=Path, default=DEFAULT_REVIEW_QUEUE_PATH)
    parser.add_argument("--decision", choices=sorted(VALID_DECISIONS), default="approve")
    parser.add_argument("--reviewer")
    parser.add_argument("--reason")
    parser.add_argument(
        "--approved-fields-json",
        help='Optional approved fields object, for example {"schedule":{"raw_value":"Daily at 1:30pm","normalized_value":{"start_time":"13:30"}}}',
    )
    parser.add_argument("--decided-at")
    parser.add_argument(
        "--export",
        choices=(
            "fixture-candidates",
            "parser-rule-requests",
            "dual-run-review-keys",
            "reviewed-source-drift-report",
        ),
        default="fixture-candidates",
    )
    parser.add_argument(
        "--source-drift-report",
        type=Path,
        default=DEFAULT_SOURCE_DRIFT_REPORT_PATH,
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_FIXTURE_CANDIDATES_PATH)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.record_task_id:
        report = record_review_decision_from_queue(
            queue_path=args.queue,
            decisions_path=args.decisions,
            task_id=args.record_task_id,
            reviewer=_require_text(args.reviewer, "reviewer"),
            decision=args.decision,
            reason=_require_text(args.reason, "reason"),
            approved_fields=_parse_approved_fields_json(args.approved_fields_json),
            decided_at=args.decided_at,
        )
    elif args.export == "parser-rule-requests":
        report = export_parser_rule_update_requests(
            decisions_path=args.decisions,
            output_path=args.output,
        )
    elif args.export == "dual-run-review-keys":
        report = export_dual_run_review_keys(
            decisions_path=args.decisions,
            output_path=args.output,
        )
    elif args.export == "reviewed-source-drift-report":
        report = export_reviewed_source_drift_report(
            decisions_path=args.decisions,
            source_drift_report_path=args.source_drift_report,
            output_path=args.output,
        )
    else:
        report = export_review_fixture_candidates(
            decisions_path=args.decisions,
            output_path=args.output,
        )
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(args.output)


if __name__ == "__main__":
    main()
