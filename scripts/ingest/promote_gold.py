"""Promote validated Silver v2 candidates into Gold/public records."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
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


CAMPFIRE_PRICE_MATRIX_PATH = Path("data/quality/campfire_price_matrix.json")
DISNEY_VISUAL_PRICE_EVIDENCE_PATH = Path("data/quality/disney_visual_price_evidence.json")


def _spans(field: dict[str, Any]) -> list[dict[str, Any]]:
    spans = field.get("spans") if isinstance(field, dict) else None
    return spans if isinstance(spans, list) else []


def _complimentary_activity_price_evidence(normalized: dict[str, Any]) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    seen: set[tuple[Any, Any, str]] = set()
    for field_name in ("description", "schedule", "location", "title"):
        field = normalized.get(field_name)
        for span in _spans(field if isinstance(field, dict) else {}):
            text = str(span.get("text") or "")
            lower = text.lower()
            if "complimentary" not in lower:
                continue
            if re.search(r"\b(towels?|life\s*jacket|sodas?|water|helmets?|child seats?|beverages?)\b", lower):
                continue
            if not re.search(r"\b(activity|activities|movie|movies|screening|screenings|entertainment)\b", lower):
                continue
            key = (span.get("page"), span.get("line"), text)
            if key in seen:
                continue
            seen.add(key)
            price_span = dict(span)
            price_span["field"] = "source_official_web_complimentary_language"
            evidence.append(price_span)
    return evidence


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
    raw_fee_evidence = normalized.get("fee_evidence")
    fee_evidence = raw_fee_evidence if isinstance(raw_fee_evidence, list) else []
    has_fee_marker_absence = any(
        evidence.get("field") in {"source_pdf_fee_marker_absent", "source_disney_image_fee_marker_absent"}
        for evidence in fee_evidence
        if isinstance(evidence, dict)
    )
    if is_fee_based:
        fee_value = "fee"
    elif has_fee_marker_absence:
        fee_value = "free"
    elif not is_fee_based:
        fee_evidence = _complimentary_activity_price_evidence(normalized)
        fee_value = "free" if fee_evidence else "unknown"
    else:
        fee_value = "unknown"
        fee_evidence = []
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
    fee_claim = next(
        (
            claim
            for claim in public_record.get("claims", [])
            if isinstance(claim, dict) and claim.get("kind") == "fee"
        ),
        {},
    )
    fee_evidence = fee_claim.get("evidence") if isinstance(fee_claim, dict) else []
    price_spans = fee_evidence if isinstance(fee_evidence, list) else []
    return {
        "title": public_record["title"]["spans"],
        "schedule": public_record["schedule"]["spans"],
        "location": public_record["location"]["spans"],
        "description": public_record["description"]["spans"],
        **({"price": price_spans} if price_spans else {}),
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
    trust_state = (
        "confirm_before_going"
        if public_record["schedule"].get("start_time") is None
        else "source_backed"
    )
    fee_claim = next(
        (
            claim
            for claim in public_record.get("claims", [])
            if isinstance(claim, dict) and claim.get("kind") == "fee"
        ),
        {},
    )
    fee_value = fee_claim.get("value") if isinstance(fee_claim, dict) else None
    price_state = fee_value if fee_value in {"free", "fee"} else "unknown"
    record = {
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
        "price": {"state": price_state},
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
        "trust_state": trust_state,
    }
    movie_nights = normalized.get("movie_nights")
    if isinstance(movie_nights, list):
        record["movie_nights"] = [
            {
                "day_of_week": str(row.get("day_of_week") or ""),
                "movie_title": str(row.get("movie_title") or ""),
                "show_time": str(row.get("show_time") or ""),
            }
            for row in movie_nights
            if isinstance(row, dict)
        ]
    return record


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
        fixture = json.loads(fixture_path.read_text())
        if str(fixture.get("publication_scope") or "").strip() == "historical_regression":
            continue
        extracted = extract_publishable_candidates_for_fixture(fixture_path)
        if not extracted:
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


def load_campfire_price_matrix(path: Path = CAMPFIRE_PRICE_MATRIX_PATH) -> dict[str, Any]:
    if not path.exists():
        return {}
    payload = json.loads(path.read_text())
    return payload if isinstance(payload, dict) else {}


def _claim_value(record: dict[str, Any], kind: str) -> str:
    claims = record.get("claims")
    if isinstance(claims, dict):
        claim = claims.get(kind)
        return str((claim or {}).get("value") or "").lower() if isinstance(claim, dict) else ""
    if isinstance(claims, list):
        for claim in claims:
            if isinstance(claim, dict) and claim.get("kind") == kind:
                return str(claim.get("value") or "").lower()
    return ""


def _claim_has_evidence(record: dict[str, Any], kind: str) -> bool:
    claims = record.get("claims")
    if isinstance(claims, dict):
        claim = claims.get(kind)
        evidence = claim.get("evidence") if isinstance(claim, dict) else None
        return isinstance(evidence, list) and bool(evidence)
    if isinstance(claims, list):
        for claim in claims:
            if isinstance(claim, dict) and claim.get("kind") == kind:
                evidence = claim.get("evidence")
                return isinstance(evidence, list) and bool(evidence)
    return False


def _is_campfire_record(record: dict[str, Any]) -> bool:
    haystack = " ".join(
        str(record.get(key) or "")
        for key in ("canonical_slug", "title", "category")
    ).lower()
    return "campfire" in haystack


def _has_standard_campfire_purchase_language(record: dict[str, Any]) -> bool:
    text = str(record.get("description") or "").lower().replace("’", "'")
    return (
        "complimentary" in text
        and re.search(r"\bs'?mores?\b", text) is not None
        and "purchase" in text
    )


def _is_fort_wilderness_campfire(record: dict[str, Any]) -> bool:
    if str(record.get("calendar_group_key") or "") == "fort-wilderness":
        return True
    resort_slugs = record.get("resort_slugs") or []
    if isinstance(resort_slugs, list) and any("fort-wilderness" in str(slug) for slug in resort_slugs):
        return True
    return "chip" in str(record.get("title") or "").lower() and "campfire" in str(record.get("title") or "").lower()


def _matrix_optional_options(matrix_section: dict[str, Any]) -> list[dict[str, Any]]:
    supplies = matrix_section.get("supplies") if isinstance(matrix_section, dict) else []
    if not isinstance(supplies, list):
        return []
    return [
        copy.deepcopy(option)
        for option in supplies
        if isinstance(option, dict) and option.get("priceBasis") == "optional_add_on"
    ]


def _option_key(option: dict[str, Any]) -> tuple[str, str]:
    return (str(option.get("optionName") or option.get("option_name") or ""), str(option.get("priceBasis") or option.get("price_basis") or ""))


def _append_price_option_provenance(record: dict[str, Any], option: dict[str, Any]) -> None:
    source_url = option.get("sourceUrl") or option.get("source_url")
    source_label = option.get("sourceLabel") or option.get("source_label")
    if not source_url and not source_label:
        return
    provenance = dict(record.get("field_provenance") or {})
    price_spans = list(provenance.get("price") or [])
    price_spans.append(
        {
            "source_url": source_url,
            "source": source_label,
            "text": option.get("notes") or option.get("optionName") or "Campfire optional purchase price",
        }
    )
    provenance["price"] = price_spans
    record["field_provenance"] = provenance


def apply_campfire_price_matrix(
    records: list[dict[str, Any]],
    matrix: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    price_matrix = matrix if isinstance(matrix, dict) else load_campfire_price_matrix()
    enriched_records = [copy.deepcopy(record) for record in records]
    if not price_matrix:
        return enriched_records

    default_options = _matrix_optional_options(price_matrix.get("defaultResortCampfire") or {})
    fort_options = _matrix_optional_options(price_matrix.get("fort-wilderness") or {})

    for record in enriched_records:
        price = dict(record.get("price") or {})
        if price.get("state") != "free":
            continue
        if _claim_value(record, "fee") != "free" or not _claim_has_evidence(record, "fee"):
            continue
        if not _is_campfire_record(record):
            continue

        options_to_add: list[dict[str, Any]] = []
        if _is_fort_wilderness_campfire(record):
            options_to_add = fort_options
        elif _has_standard_campfire_purchase_language(record):
            options_to_add = default_options
        if not options_to_add:
            continue

        existing_options = list(price.get("options") or [])
        existing_keys = {_option_key(option) for option in existing_options if isinstance(option, dict)}
        for option in options_to_add:
            if _option_key(option) in existing_keys:
                continue
            existing_options.append(copy.deepcopy(option))
            _append_price_option_provenance(record, option)
        if existing_options:
            price["options"] = existing_options
        price["state"] = "free"
        record["price"] = price

    return enriched_records


def load_disney_visual_price_evidence(
    path: Path = DISNEY_VISUAL_PRICE_EVIDENCE_PATH,
) -> dict[str, Any]:
    if not path.exists():
        return {"sources": [], "evidence": []}
    payload = json.loads(path.read_text())
    return payload if isinstance(payload, dict) else {"sources": [], "evidence": []}


def _visual_price_span(
    evidence: dict[str, Any],
    source: dict[str, Any],
) -> dict[str, Any]:
    source_label = "disney_visual_pdf" if source.get("source_kind") == "official_pdf" else "disney_visual_image"
    return {
        "page": 1,
        "text": evidence["text"],
        "field": evidence["field"],
        "source": source_label,
        "source_url": source["canonical_url"],
        "source_sha256": source["content_sha256"],
        "source_path": source.get("storage_path"),
        "legend_text": evidence.get("legend_text"),
    }


def apply_disney_visual_price_evidence(
    records: list[dict[str, Any]],
    *,
    evidence_payload: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    payload = evidence_payload if isinstance(evidence_payload, dict) else load_disney_visual_price_evidence()
    sources = {
        str(source.get("source_id") or ""): source
        for source in payload.get("sources", [])
        if isinstance(source, dict)
    }
    evidence_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    for evidence in payload.get("evidence", []):
        if not isinstance(evidence, dict):
            continue
        key = (str(evidence.get("calendar_group_key") or ""), str(evidence.get("canonical_slug") or ""))
        source = sources.get(str(evidence.get("source_id") or ""))
        if not key[0] or not key[1] or not source:
            continue
        evidence_by_key[key] = evidence

    enriched: list[dict[str, Any]] = []
    for record in records:
        row = copy.deepcopy(record)
        key = (str(row.get("calendar_group_key") or ""), str(row.get("canonical_slug") or ""))
        evidence = evidence_by_key.get(key)
        if not evidence:
            enriched.append(row)
            continue
        state = str(evidence.get("price_state") or "")
        if state not in {"free", "fee"}:
            enriched.append(row)
            continue
        source = sources[str(evidence["source_id"])]
        span = _visual_price_span(evidence, source)
        row["price"] = {**(row.get("price") if isinstance(row.get("price"), dict) else {}), "state": state}
        claims = row.get("claims")
        if isinstance(claims, list):
            updated_claims: list[dict[str, Any]] = []
            found_fee = False
            for claim in claims:
                if isinstance(claim, dict) and claim.get("kind") == "fee":
                    updated_claims.append({**claim, "value": state, "evidence": [span]})
                    found_fee = True
                elif isinstance(claim, dict):
                    updated_claims.append(claim)
            if not found_fee:
                updated_claims.append({"kind": "fee", "value": state, "evidence": [span]})
            row["claims"] = updated_claims
        else:
            claims_dict = claims if isinstance(claims, dict) else {}
            fee_claim = claims_dict.get("fee") if isinstance(claims_dict.get("fee"), dict) else {}
            claims_dict["fee"] = {**fee_claim, "value": state, "evidence": [span]}
            row["claims"] = claims_dict
        provenance = row.get("field_provenance") if isinstance(row.get("field_provenance"), dict) else {}
        provenance["price"] = [span]
        row["field_provenance"] = provenance
        source_payload = row.get("source") if isinstance(row.get("source"), dict) else {}
        supporting = list(source_payload.get("supportingDocuments") or [])
        supporting.append(
            {
                "kind": "price_evidence",
                "url": source["canonical_url"],
                "documentHash": source["content_sha256"],
                "path": source.get("storage_path"),
                "field": evidence["field"],
            }
        )
        source_payload["supportingDocuments"] = supporting
        row["source"] = source_payload
        enriched.append(row)
    return enriched


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")


def generate_gold_records(
    *,
    fixtures_dir: Path = Path("data/golden/activities"),
    review_decisions_path: Path = Path("data/processed/activity_review_decisions_v2.json"),
    mrg_facts_path: Path = Path("data/processed/magical_resort_guide_facts.json"),
    include_mrg_facts: bool = True,
) -> PromotionResult:
    result = promote_fixtures(
        fixtures_dir,
        review_decisions=load_review_decisions(review_decisions_path),
    )
    if include_mrg_facts and mrg_facts_path.exists():
        mrg_payload = load_mrg_payload(mrg_facts_path)
        mrg_facts = mrg_payload.get("facts") if isinstance(mrg_payload.get("facts"), list) else []
        result.gold_records = merge_mrg_facts_into_gold(result.gold_records, mrg_facts)
        result.gold_records = merge_mrg_validity_into_gold(
            result.gold_records,
            mrg_payload.get("validity") if isinstance(mrg_payload, dict) else None,
        )
    result.gold_records = apply_disney_visual_price_evidence(result.gold_records)
    result.gold_records = apply_campfire_price_matrix(result.gold_records)
    return result


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

    result = generate_gold_records(
        fixtures_dir=args.fixtures_dir,
        review_decisions_path=args.review_decisions,
        mrg_facts_path=args.mrg_facts,
        include_mrg_facts=not args.no_mrg_facts,
    )
    mrg_facts_count = 0
    if not args.no_mrg_facts and args.mrg_facts.exists():
        mrg_payload = load_mrg_payload(args.mrg_facts)
        mrg_facts = mrg_payload.get("facts") if isinstance(mrg_payload.get("facts"), list) else []
        mrg_facts_count = len(mrg_facts)

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
