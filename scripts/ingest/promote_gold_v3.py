"""Preview-only Gold v3 promotion for gated vision candidates."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
    from build_review_queue_v3 import review_approval_is_current
    from review_schema_v3 import validate_review_decision
    from source_manifest import edition_matches_quarter
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR
    from .build_review_queue_v3 import review_approval_is_current
    from .review_schema_v3 import validate_review_decision
    from .source_manifest import edition_matches_quarter


DEFAULT_OUTPUT_PATH = PROCESSED_DIR / "activity_gold_v3_preview.json"
DEFAULT_VALIDATED_CANDIDATES_PATH = PROCESSED_DIR / "validated_candidates_v3"
DEFAULT_REVIEW_DECISIONS_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_decisions.json"
PROMOTABLE_STATUSES = {"auto_publishable", "manually_approved"}
GOLD_CONFLICT_FIELDS = ("title", "schedule", "location", "price")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    normalized = normalized.encode("ascii", "ignore").decode("ascii").lower()
    normalized = re.sub(r"\s*\(\$\)\s*", " ", normalized)
    normalized = re.sub(r"(?<=[a-z0-9])[''](?=[a-z0-9])", "", normalized)
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
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


def _candidate_field_crop_sha256s(
    candidate: dict[str, Any],
    *,
    field_names: set[str] | None = None,
) -> set[str]:
    hashes: set[str] = set()
    field_evidence = candidate.get("field_evidence")
    if not isinstance(field_evidence, dict):
        return hashes
    items = (
        ((field_name, field_evidence.get(field_name)) for field_name in field_names)
        if field_names is not None
        else field_evidence.items()
    )
    for _field_name, evidence in items:
        source = evidence.get("source") if isinstance(evidence, dict) else {}
        crop_hash = source.get("crop_sha256") if isinstance(source, dict) else None
        if crop_hash:
            hashes.add(str(crop_hash))
    return hashes


def _review_decision_map(review_decisions: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    decisions_by_candidate: dict[str, list[dict[str, Any]]] = {}
    for decision in review_decisions:
        if decision.get("decision") not in {"approve", "edit"}:
            continue
        candidate_id = str(decision.get("candidate_id") or decision.get("task_id") or "").strip()
        if not candidate_id:
            continue
        decisions_by_candidate.setdefault(candidate_id, []).append(decision)
    for decisions in decisions_by_candidate.values():
        decisions.sort(key=lambda decision: str(decision.get("decided_at") or ""))
    return decisions_by_candidate


def _finding_review_field(finding: str) -> str | None:
    if finding.startswith((
        "engine_disagreement:",
        "manual_review_required:",
        "missing_required_field:",
        "missing_field_normalized_value:",
        "field_engine_value_mismatch:",
        "field_normalized_value_mismatch:",
        "field_raw_value_mismatch:",
    )):
        return finding.split(":", 1)[1]
    if finding == "unparsed_schedule":
        return "schedule"
    if finding == "unknown_location":
        return "location"
    if finding in {"fee_legend_missing_for_unmarked_title", "fee_marker_without_legend", "fee_marker_conflict"}:
        return "fee"
    return None


def _required_review_fields(candidate: dict[str, Any]) -> set[str]:
    fields: set[str] = set()
    for finding in candidate.get("validation_findings") or []:
        field_name = _finding_review_field(str(finding))
        if field_name:
            fields.add(field_name)
    return fields


def _merged_review_decision(decisions: list[dict[str, Any]]) -> dict[str, Any]:
    merged = {**decisions[-1]}
    approved_fields: dict[str, Any] = {}
    for decision in decisions:
        fields = decision.get("approved_fields") if isinstance(decision.get("approved_fields"), dict) else {}
        approved_fields.update(fields)
    merged["approved_fields"] = approved_fields
    return merged


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
        "field_crop": decision.get("field_crop"),
        "field_crop_sha256": decision.get("field_crop_sha256"),
        "original_validation_findings": original_findings,
        "approved_fields": approved_fields,
    }
    return reviewed


def _edition(row: dict[str, Any]) -> str:
    return str(row.get("edition") or row.get("source_pdf_edition") or row.get("source_edition") or "").strip()


def _source_hash(row: dict[str, Any]) -> str:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    return str(row.get("content_sha256") or row.get("source_sha256") or source.get("documentHash") or "").strip()


def _source_edition(row: dict[str, Any]) -> str | None:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    return (
        row.get("edition")
        or row.get("source_pdf_edition")
        or row.get("pdf_edition")
        or row.get("source_edition")
        or source.get("edition")
        or source.get("pdfEdition")
    )


def _source_matches_quarter(row: dict[str, Any], quarter: str | None) -> bool:
    if not quarter:
        return True
    edition = _source_edition(row)
    if not edition:
        return True
    return edition_matches_quarter(edition, quarter)


def _is_v3_visual_source(row: dict[str, Any]) -> bool:
    if str(row.get("currentness") or "current") != "current":
        return False
    source_type = str(row.get("source_type") or "").strip().lower()
    source_kind = str(row.get("source_kind") or "").strip()
    source_role = str(row.get("source_role") or "").strip()
    if not source_type and not source_kind and not source_role:
        return True
    if source_kind == "reviewed_visual_schedule_image" and source_role == "reviewed_visual_schedule":
        return True
    return source_role in {"resort_pdf", "supporting_price_image"} and source_type in {"pdf", "image"} and source_kind in {
        "official_pdf",
        "official_image",
    }


def _expected_source_hashes(
    expected_sources: list[dict[str, Any]] | None,
    *,
    quarter: str | None = None,
) -> set[str]:
    return {
        source_hash
        for source in expected_sources or []
        if _is_v3_visual_source(source)
        and _source_matches_quarter(source, quarter)
        if (source_hash := _source_hash(source))
    }


def _filter_candidates_to_expected_sources(
    candidates: list[dict[str, Any]],
    *,
    expected_sources: list[dict[str, Any]] | None = None,
    quarter: str | None = None,
) -> list[dict[str, Any]]:
    expected_hashes = _expected_source_hashes(expected_sources, quarter=quarter)
    if not expected_hashes:
        return candidates
    return [candidate for candidate in candidates if _source_hash(candidate) in expected_hashes]


def _gold_identity(row: dict[str, Any]) -> tuple[str, str, str, str] | None:
    source_hash = _source_hash(row)
    edition = _edition(row)
    calendar_group_key = str(row.get("calendar_group_key") or "").strip()
    canonical_slug = str(row.get("canonical_slug") or row.get("activity_slug") or row.get("slug") or "").strip()
    if not (source_hash and edition and calendar_group_key and canonical_slug):
        return None
    return (source_hash, edition, calendar_group_key, canonical_slug)


def _field_value(row: dict[str, Any], field_name: str) -> Any:
    if field_name == "schedule":
        schedule = row.get("schedule") if isinstance(row.get("schedule"), dict) else {}
        return schedule.get("text") or row.get("schedule_raw") or row.get("schedule_text")
    if field_name == "location":
        location = row.get("location") if isinstance(row.get("location"), dict) else {}
        return location.get("label") or location.get("id") or location.get("value") or row.get("location_text")
    if field_name == "price":
        price = row.get("price") if isinstance(row.get("price"), dict) else {}
        return price.get("state") if price else row.get("fee_required")
    return row.get(field_name)


def _normalize_field_value(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _gold_conflict(row: dict[str, Any], existing_gold: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    identity = _gold_identity(row)
    if identity is None:
        return None
    existing = existing_gold.get("|".join(identity))
    if existing is None:
        return None
    fields = [
        field_name
        for field_name in GOLD_CONFLICT_FIELDS
        if _normalize_field_value(_field_value(row, field_name))
        != _normalize_field_value(_field_value(existing, field_name))
    ]
    if not fields:
        return None
    source_hash, edition, calendar_group_key, canonical_slug = identity
    return {
        "conflict_type": "existing_gold_field_mismatch",
        "calendar_group_key": calendar_group_key,
        "canonical_slug": canonical_slug,
        "source_sha256": source_hash,
        "edition": edition,
        "fields": fields,
    }


def _existing_gold_by_identity(existing_gold_rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    rows_by_identity: dict[str, dict[str, Any]] = {}
    for row in existing_gold_rows:
        identity = _gold_identity(row)
        if identity is not None:
            rows_by_identity["|".join(identity)] = row
    return rows_by_identity


def _public_location_label(candidate: dict[str, Any]) -> str:
    label = str(candidate.get("location_text") or candidate.get("normalized_location_id") or "").strip()
    field_evidence = candidate.get("field_evidence")
    location_evidence = field_evidence.get("location") if isinstance(field_evidence, dict) else {}
    if isinstance(location_evidence, dict) and location_evidence.get("inferred_location_from_title") is True:
        cleaned = re.sub(r"\s*\(\$\)\s*", " ", label).strip()
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned or label
    return label


def _gold_row(candidate: dict[str, Any]) -> dict[str, Any]:
    title = str(candidate.get("normalized_title") or candidate.get("source_title") or "Untitled")
    schedule = candidate.get("schedule_normalized") if isinstance(candidate.get("schedule_normalized"), dict) else {}
    location_label = _public_location_label(candidate)
    canonical_url = candidate.get("canonical_url") or candidate.get("source_url")
    fetched_url = candidate.get("fetched_url")
    derived_source_links = (
        candidate.get("derived_source_links")
        if isinstance(candidate.get("derived_source_links"), list)
        else []
    )
    return {
        "publication_mode": "vision_v3_preview",
        "pipeline_version": candidate.get("pipeline_version", "vision_v3_001"),
        "config_hash": candidate.get("config_hash"),
        "runtime_lineage": candidate.get("runtime_lineage"),
        "calendar_group_key": candidate.get("calendar_group_key"),
        "document_family": candidate.get("document_family"),
        "canonical_page_image_sha256s": candidate.get("canonical_page_image_sha256s") or [],
        "source_pages": candidate.get("source_pages") or [],
        "edition": candidate.get("edition"),
        "source_type": candidate.get("source_type"),
        "source_kind": candidate.get("source_kind"),
        "source_role": candidate.get("source_role"),
        "http_status": candidate.get("http_status"),
        "currentness": candidate.get("currentness"),
        "captured_at": candidate.get("captured_at"),
        "resort_slug": candidate.get("resort_slug"),
        "region_id": candidate.get("region_id"),
        "region_type": candidate.get("region_type"),
        "canonical_slug": candidate.get("canonical_slug") or _slugify(title),
        "title": title,
        "category": candidate.get("category"),
        "location": {
            "id": candidate.get("normalized_location_id"),
            "label": location_label,
        },
        "schedule": {
            "text": schedule.get("raw_text") or candidate.get("schedule_raw"),
            "normalized": schedule,
        },
        "price": {
            "state": "fee" if candidate.get("fee_required") is True else "free"
            if candidate.get("fee_required") is False
            else "unknown"
        },
        "candidate_type": candidate.get("candidate_type"),
        "movie_title": candidate.get("movie_title"),
        "normalized_movie_title": candidate.get("normalized_movie_title"),
        "source_document_id": candidate.get("source_document_id"),
        "source_sha256": candidate.get("content_sha256"),
        "source_url": canonical_url,
        "fetched_url": fetched_url,
        "derived_source_links": derived_source_links,
        "source": {
            "documentId": candidate.get("source_document_id"),
            "documentHash": candidate.get("content_sha256"),
            "canonicalUrl": canonical_url,
            "fetchedUrl": fetched_url,
            "derivedSourceLinks": derived_source_links,
        },
        "field_evidence": candidate.get("field_evidence", {}),
        "source_spans": candidate.get("source_spans", {}),
        "validation_status": candidate.get("validation_status"),
        "validation_findings": candidate.get("validation_findings") or [],
        "review_status": candidate.get("review_status"),
        "review_decision": candidate.get("review_decision"),
    }


def build_gold_v3_preview(
    candidates: list[dict[str, Any]],
    *,
    review_decisions: list[dict[str, Any]] | None = None,
    existing_gold_rows: list[dict[str, Any]] | None = None,
    expected_sources: list[dict[str, Any]] | None = None,
    quarter: str | None = None,
) -> dict[str, Any]:
    candidates = _filter_candidates_to_expected_sources(candidates, expected_sources=expected_sources, quarter=quarter)
    rows: list[dict[str, Any]] = []
    gold_conflicts: list[dict[str, Any]] = []
    skipped = 0
    skipped_stale_review = 0
    skipped_invalid_review = 0
    skipped_incomplete_review = 0
    skipped_validation_findings = 0
    skipped_gold_conflicts = 0
    manually_approved_by_review = 0
    decisions_by_candidate = _review_decision_map(review_decisions or [])
    existing_gold = _existing_gold_by_identity(existing_gold_rows or [])
    for candidate in candidates:
        promotable_candidate = candidate
        has_findings = bool(candidate.get("validation_findings"))
        if candidate.get("validation_status") == "auto_publishable" and has_findings:
            skipped_validation_findings += 1
            skipped += 1
            continue
        if candidate.get("validation_status") not in PROMOTABLE_STATUSES:
            candidate_id = str(candidate.get("candidate_id") or "").strip()
            decisions = decisions_by_candidate.get(candidate_id, [])
            if decisions:
                try:
                    for decision in decisions:
                        validate_review_decision(decision)
                except ValueError:
                    skipped_invalid_review += 1
                    skipped += 1
                    continue
            current_decisions = [
                decision for decision in decisions
                if review_approval_is_current(
                    decision,
                    current_content_sha256=str(candidate.get("content_sha256") or ""),
                    current_page_image_sha256=_candidate_page_image_sha256(candidate),
                )
                and str(decision.get("field_crop_sha256") or "") in _candidate_field_crop_sha256s(
                    candidate,
                    field_names=set(decision.get("approved_fields") or {}),
                )
            ]
            if current_decisions:
                merged_decision = _merged_review_decision(current_decisions)
                required_fields = _required_review_fields(candidate)
                approved_fields = set(merged_decision.get("approved_fields") or {})
                if required_fields and not required_fields <= approved_fields:
                    skipped_incomplete_review += 1
                    skipped += 1
                    continue
                promotable_candidate = _candidate_with_review(candidate, merged_decision)
                manually_approved_by_review += 1
            else:
                if decisions:
                    skipped_stale_review += 1
                skipped += 1
                continue
        if promotable_candidate.get("validation_status") not in PROMOTABLE_STATUSES:
            skipped += 1
            continue
        row = _gold_row(promotable_candidate)
        conflict = _gold_conflict(row, existing_gold)
        if conflict:
            gold_conflicts.append(conflict)
            skipped_gold_conflicts += 1
            skipped += 1
            continue
        rows.append(row)
    return {
        "pipeline_version": "vision_v3_001",
        "publication_mode": "vision_v3_preview",
        "generated_at": _now_iso(),
        "summary": {
            "input_candidates": len(candidates),
            "gold_rows": len(rows),
            "skipped_not_publishable": skipped,
            "skipped_validation_findings": skipped_validation_findings,
            "skipped_invalid_review_decision": skipped_invalid_review,
            "skipped_incomplete_review_decision": skipped_incomplete_review,
            "manually_approved_by_review": manually_approved_by_review,
            "skipped_stale_review_decision": skipped_stale_review,
            "skipped_gold_conflicts": skipped_gold_conflicts,
        },
        "gold_conflicts": gold_conflicts,
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
    if isinstance(payload, dict) and isinstance(payload.get("rows"), list):
        return [item for item in payload["rows"] if isinstance(item, dict)]
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
    parser.add_argument("--existing-gold", type=Path, help="Optional existing Gold preview/list for same-source conflict checks")
    parser.add_argument("--expected-sources", type=Path, help="Optional source inventory used to scope preview rows")
    parser.add_argument("--quarter", help="Optional quarter scope for expected source inventory")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    candidates = _load_json_list(args.validated_candidates)
    review_decisions = _load_json_list(args.review_decisions) if args.include_approved_review else []
    existing_gold_rows = _load_json_list(args.existing_gold) if args.existing_gold else []
    expected_sources = _load_json_list(args.expected_sources) if args.expected_sources else []
    preview = build_gold_v3_preview(
        candidates,
        review_decisions=review_decisions,
        existing_gold_rows=existing_gold_rows,
        expected_sources=expected_sources,
        quarter=args.quarter,
    )
    if args.json:
        print(json.dumps(preview, indent=2, sort_keys=True))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(preview, indent=2, sort_keys=True) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
