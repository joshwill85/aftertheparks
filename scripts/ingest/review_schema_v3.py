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
DEFAULT_REVIEW_DECISIONS_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_decisions.json"
DEFAULT_FIXTURE_CANDIDATES_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_fixture_candidates.json"


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


def _load_json_list(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    payload = json.loads(path.read_text())
    if isinstance(payload, dict) and isinstance(payload.get("decisions"), list):
        payload = payload["decisions"]
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def export_review_fixture_candidates(
    *,
    decisions_path: Path = DEFAULT_REVIEW_DECISIONS_PATH,
    output_path: Path = DEFAULT_FIXTURE_CANDIDATES_PATH,
) -> dict[str, Any]:
    decisions = _load_json_list(decisions_path)
    approved = [
        decision for decision in decisions
        if decision.get("decision") in {"approve", "edit"}
    ]
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
            "skipped_non_approval_count": len(decisions) - len(candidates),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Export approved v3 review decisions as fixture candidates")
    parser.add_argument("decisions", type=Path, nargs="?", default=DEFAULT_REVIEW_DECISIONS_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_FIXTURE_CANDIDATES_PATH)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

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
