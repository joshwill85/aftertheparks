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
            _require_text(task.get("page_image"), "page_image_sha256")
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
    return str(new_record.get("content_sha256") or "").strip()


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
    reviewed_status_transition_keys: set[str] = set()
    reviewed_diff_reviews: dict[str, dict[str, Any]] = {}
    reviewed_new_record_reviews: dict[str, dict[str, Any]] = {}
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
        "reviewed_status_transition_keys": sorted(reviewed_status_transition_keys),
        "reviewed_diff_reviews": [
            reviewed_diff_reviews[key]
            for key in sorted(reviewed_diff_reviews)
        ],
        "reviewed_new_record_reviews": [
            reviewed_new_record_reviews[key]
            for key in sorted(reviewed_new_record_reviews)
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
    parser = argparse.ArgumentParser(description="Export approved v3 review decisions as fixture candidates")
    parser.add_argument("decisions", type=Path, nargs="?", default=DEFAULT_REVIEW_DECISIONS_PATH)
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

    if args.export == "parser-rule-requests":
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
