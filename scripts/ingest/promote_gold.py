"""Promote validated Silver v2 candidates into Gold/public records."""

from __future__ import annotations

import argparse
import hashlib
import json
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    from contracts import validate_public_record
    from extract_v2 import (
        expected_public_slugs_for_fixture,
        extract_publishable_candidates_for_fixture,
    )
    from magical_resort_guide import (
        load_mrg_payload,
        merge_mrg_facts_into_gold,
        merge_mrg_validity_into_gold,
    )
    from review_queue import load_review_decisions
    from source_manifest import ACTIVITY_SOURCES
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .contracts import validate_public_record
    from .extract_v2 import (
        expected_public_slugs_for_fixture,
        extract_publishable_candidates_for_fixture,
    )
    from .magical_resort_guide import (
        load_mrg_payload,
        merge_mrg_facts_into_gold,
        merge_mrg_validity_into_gold,
    )
    from .review_queue import load_review_decisions
    from .source_manifest import ACTIVITY_SOURCES


@dataclass
class PromotionResult:
    gold_records: list[dict[str, Any]] = field(default_factory=list)
    review_queue: list[dict[str, Any]] = field(default_factory=list)


def _spans(field: dict[str, Any]) -> list[dict[str, Any]]:
    spans = field.get("spans") if isinstance(field, dict) else None
    return spans if isinstance(spans, list) else []


def _public_record_from_candidate(candidate: dict[str, Any]) -> dict[str, Any]:
    normalized = candidate["normalized_fields"]
    return {
        "slug": normalized["slug"],
        "title": {
            "value": normalized["title"]["value"],
            "source": normalized["title"].get("source", "pdf_layout"),
            "spans": _spans(normalized["title"]),
        },
        "schedule": {
            "text": normalized["schedule"]["text"],
            "start_time": normalized["schedule"].get("start_time"),
            "end_time": normalized["schedule"].get("end_time"),
            "source": normalized["schedule"].get("source", "pdf_layout"),
            "spans": _spans(normalized["schedule"]),
        },
        "location": {
            "value": normalized["location"]["value"],
            "source": normalized["location"].get("source", "pdf_layout"),
            "spans": _spans(normalized["location"]),
        },
        "description": {
            "value": normalized["description"]["value"],
            "source": normalized["description"].get("source", "pdf_layout"),
            "spans": _spans(normalized["description"]),
        },
        "claims": _claims_from_candidate(candidate),
    }


def _claims_from_candidate(candidate: dict[str, Any]) -> list[dict[str, Any]]:
    normalized = candidate["normalized_fields"]
    is_fee_based = bool(normalized.get("is_fee_based"))
    fee_value = "fee" if is_fee_based else "unknown"
    fee_evidence = normalized.get("fee_evidence") if is_fee_based else []
    return [
        {
            "kind": "fee",
            "value": fee_value,
            "evidence": fee_evidence if isinstance(fee_evidence, list) else [],
        },
        {
            "kind": "walkability",
            "value": "unknown",
            "evidence": [],
        },
        {
            "kind": "transportation",
            "value": "unknown",
            "evidence": [],
        },
    ]


def _field_provenance(public_record: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    return {
        "title": public_record["title"]["spans"],
        "schedule": public_record["schedule"]["spans"],
        "location": public_record["location"]["spans"],
        "description": public_record["description"]["spans"],
    }


def _stable_uuid(key: str) -> str:
    return str(uuid.UUID(bytes=bytes.fromhex(hashlib.md5(key.encode()).hexdigest())))


def _activity_catalog_id(calendar_group_key: str, canonical_slug: str) -> str:
    return _stable_uuid(f"act:{calendar_group_key}:{canonical_slug}")


def _source_for_group(calendar_group_key: str) -> Any:
    return next(
        (
            source
            for source in ACTIVITY_SOURCES
            if source.calendar_group_key == calendar_group_key
        ),
        None,
    )


def _gold_record(candidate: dict[str, Any], public_record: dict[str, Any]) -> dict[str, Any]:
    source = _source_for_group(candidate["calendar_group_key"])
    normalized = candidate["normalized_fields"]
    candidate_source_url = candidate.get("source_url") or candidate.get("source_pdf")
    source_url = (
        source.pdf_url
        if source and source.pdf_url
        else candidate_source_url or (source.recreation_page_url if source else "")
    )
    return {
        "candidate_id": candidate["candidate_id"],
        "activity_catalog_id": _activity_catalog_id(
            candidate["calendar_group_key"],
            public_record["slug"],
        ),
        "calendar_group_key": candidate["calendar_group_key"],
        "resort_slugs": list(source.resort_slugs) if source else [],
        "canonical_slug": public_record["slug"],
        "title": public_record["title"]["value"],
        "category": normalized.get("category", "other"),
        "section": normalized.get("section", "Resort Activities"),
        "schedule": {
            "text": public_record["schedule"]["text"],
            "start_time": public_record["schedule"]["start_time"],
            "end_time": public_record["schedule"]["end_time"],
        },
        "location": {
            "label": public_record["location"]["value"],
        },
        "description": public_record["description"]["value"],
        "price": {"state": "fee" if normalized.get("is_fee_based") else "unknown"},
        "claims": public_record["claims"],
        "field_provenance": _field_provenance(public_record),
        "source_url": source_url,
        "source_sha256": candidate["content_sha256"],
        "source_pdf_edition": source.pdf_edition if source else None,
        "source": {
            "path": candidate.get("source_pdf") or candidate.get("source_path"),
            "url": source_url,
            "documentHash": candidate["content_sha256"],
            "edition": source.pdf_edition if source else None,
            "documentKeyLegends": normalized.get("document_key_legends", []),
        },
        "trust_state": "source_backed",
    }


def _review_decision_for(
    review_decisions: dict[str, dict[str, Any]] | None,
    candidate_id: str,
) -> dict[str, Any] | None:
    if not review_decisions:
        return None
    decision = review_decisions.get(candidate_id)
    return decision if isinstance(decision, dict) else None


def promote_candidates(
    candidates: list[dict[str, Any]],
    *,
    review_decisions: dict[str, dict[str, Any]] | None = None,
) -> PromotionResult:
    result = PromotionResult()

    for candidate in candidates:
        public_record = _public_record_from_candidate(candidate)
        validation = validate_public_record(public_record)
        candidate_warnings = candidate.get("warnings") or []
        review_decision = _review_decision_for(review_decisions, candidate["candidate_id"])
        is_approved = (review_decision or {}).get("decision") == "approved"
        is_rejected = (review_decision or {}).get("decision") == "rejected"

        if not validation.publishable or is_rejected or (candidate_warnings and not is_approved):
            reasons = validation.errors or [f"candidate_warning:{warning}" for warning in candidate_warnings]
            if is_rejected and not validation.errors:
                reasons = ["review:rejected"]
            result.review_queue.append(
                {
                    "candidate_id": candidate["candidate_id"],
                    "calendar_group_key": candidate["calendar_group_key"],
                    "activity_slug": candidate["normalized_fields"]["slug"],
                    "reason": reasons[0],
                    "all_reasons": reasons,
                    "severity": "blocker" if validation.errors else "error",
                }
            )
            continue

        result.gold_records.append(_gold_record(candidate, public_record))

    return result


def fixture_paths(fixtures_dir: Path) -> list[Path]:
    if not fixtures_dir.exists():
        return []
    return sorted(fixtures_dir.glob("*.json"))


def promote_fixtures(
    fixtures_dir: Path,
    *,
    review_decisions: dict[str, dict[str, Any]] | None = None,
) -> PromotionResult:
    candidates_by_id: dict[str, dict[str, Any]] = {}
    review_queue: list[dict[str, Any]] = []
    paths = fixture_paths(fixtures_dir)

    if not paths:
        return PromotionResult(
            review_queue=[
                {
                    "candidate_id": None,
                    "calendar_group_key": None,
                    "activity_slug": None,
                    "reason": "fixtures:missing",
                    "all_reasons": ["fixtures:missing"],
                    "severity": "blocker",
                    "fixture": str(fixtures_dir),
                }
            ]
        )

    for fixture_path in paths:
        extracted = extract_publishable_candidates_for_fixture(fixture_path)
        if not extracted:
            fixture = json.loads(fixture_path.read_text())
            if isinstance(fixture.get("expected_records"), list) and not expected_public_slugs_for_fixture(fixture):
                continue
            review_queue.append(
                {
                    "candidate_id": None,
                    "calendar_group_key": fixture.get("calendar_group_key"),
                    "activity_slug": fixture.get("expected", {}).get("slug"),
                    "reason": "candidate_missing",
                    "all_reasons": ["candidate_missing"],
                    "severity": "blocker",
                    "fixture": str(fixture_path),
                }
            )
            continue
        for candidate in extracted:
            candidates_by_id[candidate["candidate_id"]] = candidate

    promoted = promote_candidates(
        list(candidates_by_id.values()),
        review_decisions=review_decisions,
    )
    promoted.review_queue.extend(review_queue)
    return promoted


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Promote Silver v2 candidates into local Gold preview output")
    parser.add_argument(
        "--fixtures-dir",
        type=Path,
        default=Path("data/golden/activities"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/processed/activity_gold_v2_preview.json"),
    )
    parser.add_argument(
        "--review-output",
        type=Path,
        default=Path("data/processed/activity_review_queue_v2_preview.json"),
    )
    parser.add_argument(
        "--review-decisions",
        type=Path,
        default=Path("data/processed/activity_review_decisions_v2.json"),
    )
    parser.add_argument(
        "--mrg-facts",
        type=Path,
        default=Path("data/processed/magical_resort_guide_facts.json"),
        help="Optional Magical Resort Guide factual enrichment artifact",
    )
    parser.add_argument(
        "--no-mrg-facts",
        action="store_true",
        help="Skip third-party factual enrichment merge even when the artifact exists",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate promotion without writing preview files",
    )
    parser.add_argument(
        "--fail-on-review",
        action="store_true",
        help="Exit nonzero if any candidate is sent to review",
    )
    args = parser.parse_args()

    result = promote_fixtures(
        args.fixtures_dir,
        review_decisions=load_review_decisions(args.review_decisions),
    )
    mrg_facts_count = 0
    if not args.no_mrg_facts and args.mrg_facts.exists():
        mrg_payload = load_mrg_payload(args.mrg_facts)
        mrg_facts = mrg_payload.get("facts") if isinstance(mrg_payload.get("facts"), list) else []
        mrg_facts_count = len(mrg_facts)
        result.gold_records = merge_mrg_facts_into_gold(result.gold_records, mrg_facts)
        result.gold_records = merge_mrg_validity_into_gold(
            result.gold_records,
            mrg_payload.get("validity") if isinstance(mrg_payload, dict) else None,
        )

    summary = {
        "gold_records": len(result.gold_records),
        "review_queue": len(result.review_queue),
        "mrg_facts": mrg_facts_count,
    }

    if not args.dry_run:
        _write_json(args.output, result.gold_records)
        _write_json(args.review_output, result.review_queue)

    print(json.dumps(summary, indent=2))
    if args.fail_on_review and result.review_queue:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
