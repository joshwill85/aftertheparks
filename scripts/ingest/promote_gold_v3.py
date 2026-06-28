"""Preview-only Gold v3 promotion for gated vision candidates."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
    from scripts.ingest.build_review_queue_v3 import review_approval_is_current
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR
    from .build_review_queue_v3 import review_approval_is_current


DEFAULT_OUTPUT_PATH = PROCESSED_DIR / "activity_gold_v3_preview.json"
DEFAULT_VALIDATED_CANDIDATES_PATH = PROCESSED_DIR / "validated_candidates_v3"
DEFAULT_REVIEW_DECISIONS_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_decisions.json"
PROMOTABLE_STATUSES = {"auto_publishable", "manually_approved"}


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "untitled"


def _candidate_page_image_sha256(candidate: dict[str, Any]) -> str | None:
    field_evidence = candidate.get("field_evidence")
    if not isinstance(field_evidence, dict):
        return None
    for field_name in ("title", "schedule", "location", "fee", "movie_title"):
        evidence = field_evidence.get(field_name)
        source = evidence.get("source") if isinstance(evidence, dict) else {}
        page_hash = source.get("page_image_sha256") if isinstance(source, dict) else None
        if page_hash:
            return str(page_hash)
    return None


def _review_decision_map(review_decisions: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    decisions_by_candidate: dict[str, dict[str, Any]] = {}
    for decision in review_decisions:
        if decision.get("decision") not in {"approve", "edit"}:
            continue
        candidate_id = str(decision.get("candidate_id") or decision.get("task_id") or "").strip()
        if not candidate_id:
            continue
        previous = decisions_by_candidate.get(candidate_id)
        if previous and str(previous.get("decided_at") or "") > str(decision.get("decided_at") or ""):
            continue
        decisions_by_candidate[candidate_id] = decision
    return decisions_by_candidate


def _candidate_with_review(candidate: dict[str, Any], decision: dict[str, Any]) -> dict[str, Any]:
    original_findings = list(candidate.get("validation_findings") or [])
    reviewed = {**candidate, "validation_status": "manually_approved", "validation_findings": []}
    approved_fields = decision.get("approved_fields") if isinstance(decision.get("approved_fields"), dict) else {}
    schedule = approved_fields.get("schedule")
    if isinstance(schedule, dict):
        if "raw_value" in schedule:
            reviewed["schedule_raw"] = schedule["raw_value"]
        if isinstance(schedule.get("normalized_value"), dict):
            reviewed["schedule_normalized"] = schedule["normalized_value"]
    title = approved_fields.get("title")
    if isinstance(title, dict):
        if "raw_value" in title:
            reviewed["source_title"] = title["raw_value"]
        if "normalized_value" in title:
            reviewed["normalized_title"] = title["normalized_value"]
    location = approved_fields.get("location")
    if isinstance(location, dict):
        if "raw_value" in location:
            reviewed["location_text"] = location["raw_value"]
        if "normalized_value" in location:
            reviewed["normalized_location_id"] = location["normalized_value"]
    fee = approved_fields.get("fee")
    if isinstance(fee, dict) and "normalized_value" in fee:
        reviewed["fee_required"] = fee["normalized_value"]
    reviewed["review_status"] = "manual_review_approved"
    reviewed["review_decision"] = {
        "schema_version": decision.get("schema_version"),
        "task_id": decision.get("task_id"),
        "candidate_id": decision.get("candidate_id"),
        "decision": decision.get("decision"),
        "reviewer": decision.get("reviewer"),
        "reason": decision.get("reason"),
        "decided_at": decision.get("decided_at"),
        "content_sha256": decision.get("content_sha256"),
        "page_image_sha256": decision.get("page_image_sha256"),
        "field_crop_sha256": decision.get("field_crop_sha256"),
        "original_validation_findings": original_findings,
        "approved_fields": approved_fields,
    }
    return reviewed


def _gold_row(candidate: dict[str, Any]) -> dict[str, Any]:
    title = str(candidate.get("normalized_title") or candidate.get("source_title") or "Untitled")
    schedule = candidate.get("schedule_normalized") if isinstance(candidate.get("schedule_normalized"), dict) else {}
    canonical_url = candidate.get("canonical_url") or candidate.get("source_url")
    fetched_url = candidate.get("fetched_url")
    return {
        "publication_mode": "vision_v3_preview",
        "pipeline_version": candidate.get("pipeline_version", "vision_v3_001"),
        "calendar_group_key": candidate.get("calendar_group_key"),
        "document_family": candidate.get("document_family"),
        "edition": candidate.get("edition"),
        "source_type": candidate.get("source_type"),
        "resort_slug": candidate.get("resort_slug"),
        "canonical_slug": candidate.get("canonical_slug") or _slugify(title),
        "title": title,
        "category": candidate.get("category"),
        "location": {
            "id": candidate.get("normalized_location_id"),
            "label": candidate.get("location_text") or candidate.get("normalized_location_id"),
        },
        "schedule": {
            "text": candidate.get("schedule_raw"),
            "normalized": schedule,
        },
        "price": {
            "state": "fee" if candidate.get("fee_required") is True else "free"
            if candidate.get("fee_required") is False
            else "unknown"
        },
        "candidate_type": candidate.get("candidate_type"),
        "source_document_id": candidate.get("source_document_id"),
        "source_sha256": candidate.get("content_sha256"),
        "source_url": canonical_url,
        "fetched_url": fetched_url,
        "source": {
            "documentId": candidate.get("source_document_id"),
            "documentHash": candidate.get("content_sha256"),
            "canonicalUrl": canonical_url,
            "fetchedUrl": fetched_url,
        },
        "field_evidence": candidate.get("field_evidence", {}),
        "validation_status": candidate.get("validation_status"),
        "validation_findings": candidate.get("validation_findings") or [],
        "review_status": candidate.get("review_status"),
        "review_decision": candidate.get("review_decision"),
    }


def build_gold_v3_preview(
    candidates: list[dict[str, Any]],
    *,
    review_decisions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    skipped = 0
    skipped_stale_review = 0
    skipped_validation_findings = 0
    manually_approved_by_review = 0
    decisions_by_candidate = _review_decision_map(review_decisions or [])
    for candidate in candidates:
        promotable_candidate = candidate
        has_findings = bool(candidate.get("validation_findings"))
        if candidate.get("validation_status") == "auto_publishable" and has_findings:
            skipped_validation_findings += 1
            skipped += 1
            continue
        if candidate.get("validation_status") not in PROMOTABLE_STATUSES:
            candidate_id = str(candidate.get("candidate_id") or "").strip()
            decision = decisions_by_candidate.get(candidate_id)
            if decision and review_approval_is_current(
                decision,
                current_content_sha256=str(candidate.get("content_sha256") or ""),
                current_page_image_sha256=_candidate_page_image_sha256(candidate),
            ):
                promotable_candidate = _candidate_with_review(candidate, decision)
                manually_approved_by_review += 1
            else:
                if decision:
                    skipped_stale_review += 1
                skipped += 1
                continue
        if promotable_candidate.get("validation_status") not in PROMOTABLE_STATUSES:
            skipped += 1
            continue
        rows.append(_gold_row(promotable_candidate))
    return {
        "pipeline_version": "vision_v3_001",
        "publication_mode": "vision_v3_preview",
        "summary": {
            "input_candidates": len(candidates),
            "gold_rows": len(rows),
            "skipped_not_publishable": skipped,
            "skipped_validation_findings": skipped_validation_findings,
            "manually_approved_by_review": manually_approved_by_review,
            "skipped_stale_review_decision": skipped_stale_review,
        },
        "rows": rows,
    }


def _load_json_list(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    if path.is_dir():
        rows: list[dict[str, Any]] = []
        for child in sorted(path.glob("*.json")):
            rows.extend(_load_json_list(child))
        return rows
    payload = json.loads(path.read_text())
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build preview-only Gold v3 rows from validated candidates")
    parser.add_argument("validated_candidates", type=Path, nargs="?", default=DEFAULT_VALIDATED_CANDIDATES_PATH)
    parser.add_argument("--preview", action="store_true", help="Accepted for runbook compatibility; v3 promotion is preview-only")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument(
        "--include-approved-review",
        action="store_true",
        help="Include hash-current approve/edit review decisions for otherwise blocked candidates",
    )
    parser.add_argument("--review-decisions", type=Path, default=DEFAULT_REVIEW_DECISIONS_PATH)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    candidates = _load_json_list(args.validated_candidates)
    review_decisions = _load_json_list(args.review_decisions) if args.include_approved_review else []
    preview = build_gold_v3_preview(candidates, review_decisions=review_decisions)
    if args.json:
        print(json.dumps(preview, indent=2, sort_keys=True))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(preview, indent=2, sort_keys=True) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
