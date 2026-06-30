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
        _parse_time_range,
        extract_candidates_for_pdf,
        expected_public_slugs_for_fixture,
        extract_publishable_candidates_for_fixture,
    )
    from magical_resort_guide import (
        load_mrg_payload,
        merge_mrg_facts_into_gold,
        merge_mrg_validity_into_gold,
    )
    from review_queue import load_review_decisions
    from source_manifest import ACTIVITY_SOURCES, ActivitySource, apply_pdf_source_overrides
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .contracts import validate_public_record
    from .extract_v2 import (
        _parse_time_range,
        extract_candidates_for_pdf,
        expected_public_slugs_for_fixture,
        extract_publishable_candidates_for_fixture,
    )
    from .magical_resort_guide import (
        load_mrg_payload,
        merge_mrg_facts_into_gold,
        merge_mrg_validity_into_gold,
    )
    from .review_queue import load_review_decisions
    from .source_manifest import ACTIVITY_SOURCES, ActivitySource, apply_pdf_source_overrides


@dataclass
class PromotionResult:
    gold_records: list[dict[str, Any]] = field(default_factory=list)
    review_queue: list[dict[str, Any]] = field(default_factory=list)


CAMPFIRE_PRICE_MATRIX_PATH = Path("data/quality/campfire_price_matrix.json")
DISNEY_VISUAL_PRICE_EVIDENCE_PATH = Path("data/quality/disney_visual_price_evidence.json")
DEFAULT_SOURCE_OVERRIDES_PATH = Path("data/processed/resort_pdf_source_overrides.json")
DEFAULT_FORT_WILDERNESS_VISUAL_SOURCES_PATH = Path("data/processed/fort_wilderness_visual_sources.json")
SOURCE_DOCUMENT_DIR = Path("data/raw/pdfs")
IMAGE_SOURCE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
PARSER_VERSION = "promotion-v1"


def _spans(field: dict[str, Any]) -> list[dict[str, Any]]:
    spans = field.get("spans") if isinstance(field, dict) else None
    return spans if isinstance(spans, list) else []


def _repair_public_text(value: str) -> str:
    value = re.sub(r"\bages\s+I2\b", "ages 12", value)
    value = value.replace("407-WWDW-PLAY", "407-WDW-PLAY")
    value = re.sub(r"\bRecreation\s+Coa:\s*", "Recreation Cast Member.", value)
    value = re.sub(r"\s*WI!\s*LD\s*Ww\s*ILDERNESS\s*BINGO\s*", " ", value, flags=re.I)
    value = value.replace(
        "complimentary kits available for purchase. marshmallows.",
        "complimentary marshmallows. Kits available for purchase.",
    )
    value = value.replace(
        "complimentary marshmallows. kits available for purchase.",
        "complimentary marshmallows. Kits available for purchase.",
    )
    value = re.sub(
        r"^joy the warm glow of the campfire",
        "Enjoy the warm glow of the campfire",
        value,
        flags=re.I,
    )
    return re.sub(r"\s+", " ", value).strip()


def _public_spans(field: dict[str, Any]) -> list[dict[str, Any]]:
    public_spans: list[dict[str, Any]] = []
    for span in _spans(field):
        if not isinstance(span, dict):
            continue
        repaired = dict(span)
        repaired_text = _repair_public_text(str(repaired.get("text") or ""))
        if not repaired_text:
            continue
        repaired["text"] = repaired_text
        public_spans.append(repaired)
    return public_spans


def _public_description_value(candidate: dict[str, Any]) -> str:
    normalized = candidate["normalized_fields"]
    description = _repair_public_text(str(normalized["description"]["value"] or ""))
    slug = str(normalized.get("slug") or "")

    if slug == "tasteful-artistry-at-disneys-wilderness-lodge":
        description = re.sub(r"\s*To book, please call\s*$", "", description, flags=re.I)

    return description.strip()


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
            "spans": _public_spans(normalized["title"]),
        },
        "schedule": {
            "text": normalized["schedule"]["text"],
            "start_time": normalized["schedule"].get("start_time"),
            "end_time": normalized["schedule"].get("end_time"),
            "source": normalized["schedule"].get("source", "pdf_layout"),
            "spans": _public_spans(normalized["schedule"]),
        },
        "location": {
            "value": normalized["location"]["value"],
            "source": normalized["location"].get("source", "pdf_layout"),
            "spans": _public_spans(normalized["location"]),
        },
        "description": {
            "value": _public_description_value(candidate),
            "source": normalized["description"].get("source", "pdf_layout"),
            "spans": _public_spans(normalized["description"]),
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


def _movie_night_day(row: dict[str, Any]) -> str:
    return str(row.get("day_of_week") or row.get("day") or "").strip().lower()


def _movie_night_show_time(row: dict[str, Any], normalized: dict[str, Any]) -> str:
    schedule = normalized.get("schedule")
    schedule_start = schedule.get("start_time") if isinstance(schedule, dict) else None
    return str(row.get("show_time") or schedule_start or "").strip()


def _source_for_group(
    calendar_group_key: str,
    activity_sources: list[ActivitySource] | None = None,
) -> Any:
    sources = activity_sources or ACTIVITY_SOURCES
    return next(
        (
            source
            for source in sources
            if source.calendar_group_key == calendar_group_key
        ),
        None,
    )


def _gold_record(
    candidate: dict[str, Any],
    public_record: dict[str, Any],
    *,
    activity_sources: list[ActivitySource] | None = None,
) -> dict[str, Any]:
    source = _source_for_group(candidate["calendar_group_key"], activity_sources)
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
                "day_of_week": _movie_night_day(row),
                "movie_title": str(row.get("movie_title") or ""),
                "show_time": _movie_night_show_time(row, normalized),
            }
            for row in movie_nights
            if isinstance(row, dict)
        ]
    if candidate.get("valid_from"):
        record["valid_from"] = candidate.get("valid_from")
    if candidate.get("valid_to"):
        record["valid_until"] = candidate.get("valid_to")
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
    activity_sources: list[ActivitySource] | None = None,
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

        result.gold_records.append(_gold_record(candidate, public_record, activity_sources=activity_sources))

    return result


def fixture_paths(fixtures_dir: Path) -> list[Path]:
    if not fixtures_dir.exists():
        return []
    return sorted(fixtures_dir.glob("*.json"))


def promote_fixtures(
    fixtures_dir: Path,
    *,
    review_decisions: dict[str, dict[str, Any]] | None = None,
    activity_sources: list[ActivitySource] | None = None,
    exclude_calendar_groups: set[str] | None = None,
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
        if fixture.get("calendar_group_key") in (exclude_calendar_groups or set()):
            continue
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
        activity_sources=activity_sources,
    )
    promoted.review_queue.extend(review_queue)
    return promoted


def _load_source_overrides(path: Path | None) -> dict[str, dict[str, Any]]:
    if path is None or not path.exists():
        return {}
    payload = json.loads(path.read_text())
    return payload if isinstance(payload, dict) else {}


def _activity_sources_with_overrides(overrides: dict[str, dict[str, Any]]) -> list[ActivitySource]:
    if not overrides:
        return ACTIVITY_SOURCES
    return apply_pdf_source_overrides(ACTIVITY_SOURCES, overrides)


def _local_source_path_for_url(source_url: str) -> Path:
    return SOURCE_DOCUMENT_DIR / source_url.rsplit("/", 1)[-1]


def _reviewed_image_span(page: int, line_no: int, text: str) -> dict[str, Any]:
    return {
        "page": page,
        "line_no": line_no,
        "text": text,
        "source": "reviewed_visual_schedule_image",
    }


def _reviewed_image_record(
    *,
    title: str,
    category: str,
    location: str,
    schedule_text: str,
    description: str,
    is_fee_based: bool = False,
    line_no: int = 1,
    movie_nights: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    source_spans = {
        "title": [_reviewed_image_span(1, line_no, title)],
        "location": [_reviewed_image_span(1, line_no + 1, location)],
        "schedule": [_reviewed_image_span(1, line_no + 2, schedule_text)],
        "description": [_reviewed_image_span(1, line_no + 3, description)],
    }
    record = {
        "title": title,
        "slug": re.sub(r"[^a-z0-9]+", "-", title.lower().replace("'", "")).strip("-"),
        "category": category,
        "location": location,
        "schedule_text": schedule_text,
        "description": description,
        "is_fee_based": is_fee_based,
        "source_spans": source_spans,
    }
    if movie_nights:
        record["movie_nights"] = movie_nights
    return record


def _reviewed_official_image_records(calendar_group_key: str) -> list[dict[str, Any]]:
    records: dict[str, list[dict[str, Any]]] = {
        "art-of-animation": [
            _reviewed_image_record(
                title="Disney Character Greetings",
                category="character",
                location="Animation Hall",
                schedule_text="Daily from 11:05am-11:25am and 2:00pm-2:20pm",
                description="Disney character greetings.",
                line_no=10,
            ),
            _reviewed_image_record(
                title="Pool Party",
                category="poolside",
                location="The Big Blue Pool Deck",
                schedule_text="Daily from 1:00pm-2:00pm",
                description="Family-friendly pool party activities.",
                line_no=20,
            ),
            _reviewed_image_record(
                title="Craft Activity",
                category="arts_crafts",
                location="Recreation Activities Room inside Animation Hall or outside Animation Hall",
                schedule_text="Daily; craft title and exact spot vary by day schedule",
                description="Daily craft activity; some craft options have a fee.",
                is_fee_based=True,
                line_no=30,
            ),
            _reviewed_image_record(
                title="Campfire at Pride Rock",
                category="campfire",
                location="Between Lion King Buildings 6 and 10",
                schedule_text="Daily from 6:30pm-7:30pm",
                description="Evening campfire activity.",
                line_no=40,
            ),
            _reviewed_image_record(
                title="Movie Under the Stars",
                category="movies_under_stars",
                location="Movie Lawn near The Big Blue Pool",
                schedule_text="Daily at 8:30pm",
                description="Outdoor Disney movie screening.",
                line_no=50,
                movie_nights=[
                    {"day": "Sunday", "movie_title": "The Lion King"},
                    {"day": "Monday", "movie_title": "Monsters, Inc."},
                    {"day": "Tuesday", "movie_title": "Ratatouille"},
                    {"day": "Wednesday", "movie_title": "Toy Story 2"},
                    {"day": "Thursday", "movie_title": "Teen Beach Movie"},
                    {"day": "Friday", "movie_title": "Cinderella"},
                    {"day": "Saturday", "movie_title": "Cars"},
                ],
            ),
        ],
        "pop-century": [
            _reviewed_image_record(
                title="Disney Character Greetings",
                category="character",
                location="Classic Hall",
                schedule_text="Daily from 10:15am-10:35am and 1:15pm-1:35pm",
                description="Disney character greetings.",
                line_no=10,
            ),
            _reviewed_image_record(
                title="Pool Party",
                category="poolside",
                location="Hippy Dippy Pool Deck",
                schedule_text="Daily from 1:30pm-2:30pm",
                description="Family-friendly pool party activities.",
                line_no=20,
            ),
            _reviewed_image_record(
                title="Craft Activity",
                category="arts_crafts",
                location="90s Sign near Classic Hall",
                schedule_text="Daily from 3:00pm-4:00pm",
                description="Daily craft activity; craft title varies by day schedule.",
                is_fee_based=True,
                line_no=30,
            ),
            _reviewed_image_record(
                title="Groovy Campfire",
                category="campfire",
                location="Between 60s and 70s Buildings",
                schedule_text="Daily from 6:30pm-7:30pm",
                description="Evening campfire activity.",
                line_no=40,
            ),
            _reviewed_image_record(
                title="Nighttime Activities",
                category="other",
                location="Hippy Dippy Pool Deck or Classic Hall",
                schedule_text="Evenings; activity and exact time vary by day schedule",
                description="Nighttime activities include pajama parties and pool-deck activities.",
                line_no=50,
            ),
            _reviewed_image_record(
                title="Movie Under the Stars",
                category="movies_under_stars",
                location="Hippy Dippy Pool Deck",
                schedule_text="Daily at 8:30pm",
                description="Outdoor Disney movie screening; title varies by day schedule.",
                line_no=60,
            ),
        ],
        "caribbean-beach": [
            _reviewed_image_record(
                title="Disney Character Greetings",
                category="character",
                location="Old Port Royale Lobby",
                schedule_text="Daily from 9:30am-9:50am and 2:40pm-3:00pm",
                description="Disney character greetings.",
                line_no=10,
            ),
            _reviewed_image_record(
                title="Pool Party",
                category="poolside",
                location="Fuentes del Morro Pool Deck",
                schedule_text="Daily from 1:30pm-2:30pm",
                description="Family-friendly pool party activities.",
                line_no=20,
            ),
            _reviewed_image_record(
                title="Craft Activity",
                category="arts_crafts",
                location="Near Pineapple Fountain behind Old Port Royale",
                schedule_text="Daily from 3:00pm-4:00pm",
                description="Daily craft activity; craft title varies by day schedule.",
                is_fee_based=True,
                line_no=30,
            ),
            _reviewed_image_record(
                title="Caribbean Campfire",
                category="campfire",
                location="Martinique Beach",
                schedule_text="Daily from 6:30pm-7:30pm",
                description="Evening campfire activity.",
                line_no=40,
            ),
            _reviewed_image_record(
                title="Movie Under the Stars",
                category="movies_under_stars",
                location="Caribbean Cay Island Movie Lawn",
                schedule_text="Daily at 8:30pm",
                description="Outdoor Disney movie screening.",
                line_no=50,
                movie_nights=[
                    {"day": "Sunday", "movie_title": "Mulan"},
                    {"day": "Monday", "movie_title": "Lilo & Stitch"},
                    {"day": "Tuesday", "movie_title": "Finding Nemo"},
                    {"day": "Wednesday", "movie_title": "The Lion King"},
                    {"day": "Thursday", "movie_title": "Moana 2"},
                    {"day": "Friday", "movie_title": "Toy Story"},
                    {"day": "Saturday", "movie_title": "Zootopia 2"},
                ],
            ),
        ],
        "port-orleans-riverside": [
            _reviewed_image_record(
                title="Disney Character Greetings",
                category="character",
                location="Inside and outside the Lobby Area",
                schedule_text="Daily from 8:45am-9:05am and 3:30pm-3:50pm",
                description="Disney character greetings.",
                line_no=10,
            ),
            _reviewed_image_record(
                title="Craft Activity",
                category="arts_crafts",
                location="The River Roost or Ol' Man Island Pool Deck",
                schedule_text="Daily at 1:00pm",
                description="Daily craft activity; craft title varies by day schedule.",
                is_fee_based=True,
                line_no=20,
            ),
            _reviewed_image_record(
                title="Pool Party",
                category="poolside",
                location="Ol' Man Island Pool Deck",
                schedule_text="Daily from 2:30pm-3:30pm",
                description="Family-friendly pool party activities.",
                line_no=30,
            ),
            _reviewed_image_record(
                title="Poolside Activities",
                category="poolside",
                location="Ol' Man Island Pool Deck",
                schedule_text="Daily from 3:30pm-4:30pm",
                description="Family-friendly poolside games and activities.",
                line_no=40,
            ),
            _reviewed_image_record(
                title="Campfire on de' Bayou",
                category="campfire",
                location="Ol' Man Island",
                schedule_text="Daily from 6:30pm-7:30pm",
                description="Evening campfire activity.",
                line_no=50,
            ),
            _reviewed_image_record(
                title="Nighttime Activities",
                category="other",
                location="Ol' Man Island Pool Deck or Lobby",
                schedule_text="Evenings; activity and exact time vary by day schedule",
                description="Nighttime activities include trivia, Glow with the Flow, and pajama parties.",
                line_no=60,
            ),
            _reviewed_image_record(
                title="Movie Under the Stars",
                category="movies_under_stars",
                location="Oak Manor Lawn near Building 90",
                schedule_text="Select nights at 8:30pm",
                description="Outdoor Disney movie screening; title varies by day schedule.",
                line_no=70,
            ),
        ],
    }
    return records.get(calendar_group_key, [])


def promote_current_replacement_sources(
    overrides: dict[str, dict[str, Any]],
    *,
    review_decisions: dict[str, dict[str, Any]] | None = None,
    activity_sources: list[ActivitySource] | None = None,
) -> PromotionResult:
    if not overrides:
        return PromotionResult()

    candidates_by_id: dict[str, dict[str, Any]] = {}
    review_queue: list[dict[str, Any]] = []
    for calendar_group_key, override in sorted(overrides.items()):
        source_url = str(override.get("pdf_url") or "")
        source_path = _local_source_path_for_url(source_url)
        suffix = source_path.suffix.lower()
        if suffix in IMAGE_SOURCE_EXTENSIONS:
            if not source_path.exists():
                review_queue.append(
                    {
                        "candidate_id": None,
                        "calendar_group_key": calendar_group_key,
                        "activity_slug": None,
                        "reason": "replacement_source_missing",
                        "all_reasons": ["replacement_source_missing"],
                        "severity": "blocker",
                        "source_url": source_url,
                        "source_path": str(source_path),
                    }
                )
                continue
            image_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
            image_records = _reviewed_official_image_records(calendar_group_key)
            if not image_records:
                review_queue.append(
                    {
                        "candidate_id": None,
                        "calendar_group_key": calendar_group_key,
                        "activity_slug": None,
                        "reason": "replacement_image_requires_reviewed_ingest",
                        "all_reasons": ["replacement_image_requires_reviewed_ingest"],
                        "severity": "blocker",
                        "source_url": source_url,
                        "source_path": str(source_path),
                    }
                )
                continue
            payload = {
                "calendar_group_key": calendar_group_key,
                "canonical_url": source_url,
                "content_sha256": image_hash,
                "valid_from": None,
                "valid_to": None,
            }
            for record in image_records:
                candidate = _visual_candidate(payload=payload, record=record, source_path=source_path)
                candidates_by_id[candidate["candidate_id"]] = candidate
            continue
        if suffix != ".pdf":
            review_queue.append(
                {
                    "candidate_id": None,
                    "calendar_group_key": calendar_group_key,
                    "activity_slug": None,
                    "reason": "replacement_source_type_unsupported",
                    "all_reasons": ["replacement_source_type_unsupported"],
                    "severity": "blocker",
                    "source_url": source_url,
                    "source_path": str(source_path),
                }
            )
            continue
        if not source_path.exists():
            review_queue.append(
                {
                    "candidate_id": None,
                    "calendar_group_key": calendar_group_key,
                    "activity_slug": None,
                    "reason": "replacement_source_missing",
                    "all_reasons": ["replacement_source_missing"],
                    "severity": "blocker",
                    "source_url": source_url,
                    "source_path": str(source_path),
                }
            )
            continue

        for candidate in extract_candidates_for_pdf(
            pdf_path=source_path,
            calendar_group_key=calendar_group_key,
        ):
            candidate["source_url"] = source_url
            candidates_by_id[candidate["candidate_id"]] = candidate

    promoted = promote_candidates(
        list(candidates_by_id.values()),
        review_decisions=review_decisions,
        activity_sources=activity_sources,
    )
    promoted.review_queue.extend(review_queue)
    return promoted


def _visual_field(record: dict[str, Any], field_name: str, value: str) -> dict[str, Any]:
    source_spans = record.get("source_spans") if isinstance(record.get("source_spans"), dict) else {}
    spans = source_spans.get(field_name) if isinstance(source_spans, dict) else None
    return {
        "value": value,
        "source": "reviewed_visual_schedule_image",
        "spans": spans if isinstance(spans, list) else [],
    }


def _visual_candidate(
    *,
    payload: dict[str, Any],
    record: dict[str, Any],
    source_path: Path,
) -> dict[str, Any]:
    schedule_text = str(record.get("schedule_text") or "")
    start_time, end_time = _parse_time_range(schedule_text)
    title_field = _visual_field(record, "title", str(record["title"]))
    fee_evidence = []
    if bool(record.get("is_fee_based")):
        fee_evidence = [
            {
                **span,
                "field": "reviewed_visual_fee_marker",
                "text": f"{span.get('text', record['title'])} ($)",
            }
            for span in title_field.get("spans", [])
            if isinstance(span, dict)
        ]
    normalized_fields = {
        "title": title_field,
        "slug": str(record["slug"]),
        "category": str(record.get("category") or "other"),
        "section": "Resort Activities",
        "location": _visual_field(record, "location", str(record.get("location") or "")),
        "schedule": {
            "text": schedule_text,
            "start_time": start_time,
            "end_time": end_time,
            "source": "reviewed_visual_schedule_image",
            "spans": (
                record.get("source_spans", {}).get("schedule")
                if isinstance(record.get("source_spans"), dict)
                and isinstance(record.get("source_spans", {}).get("schedule"), list)
                else []
            ),
        },
        "description": _visual_field(record, "description", str(record.get("description") or "")),
        "is_fee_based": bool(record.get("is_fee_based")),
        "fee_evidence": fee_evidence,
        "document_key_legends": [],
    }
    if isinstance(record.get("movie_nights"), list):
        normalized_fields["movie_nights"] = [
            {
                "day_of_week": _movie_night_day(row),
                "movie_title": str(row.get("movie_title") or ""),
                "show_time": _movie_night_show_time(row, normalized_fields),
            }
            for row in record["movie_nights"]
            if isinstance(row, dict)
        ]
    return {
        "candidate_id": f"{payload['content_sha256']}:{payload['calendar_group_key']}:{record['slug']}:reviewed_visual",
        "calendar_group_key": str(payload["calendar_group_key"]),
        "source_path": str(source_path),
        "source_url": str(payload["canonical_url"]),
        "content_sha256": str(payload["content_sha256"]),
        "parser_version": PARSER_VERSION,
        "profile_key": "reviewed_visual_schedule_image",
        "raw_fields": {
            "title": normalized_fields["title"],
            "location": normalized_fields["location"],
            "schedule": normalized_fields["schedule"],
            "description": normalized_fields["description"],
        },
        "normalized_fields": normalized_fields,
        "confidence": 1.0,
        "warnings": [],
        "valid_from": payload.get("valid_from"),
        "valid_to": payload.get("valid_to"),
    }


def promote_reviewed_visual_sources(
    visual_sources_path: Path,
    *,
    review_decisions: dict[str, dict[str, Any]] | None = None,
    activity_sources: list[ActivitySource] | None = None,
) -> PromotionResult:
    if not visual_sources_path.exists():
        return PromotionResult()
    payload = json.loads(visual_sources_path.read_text())
    if not isinstance(payload, dict):
        return PromotionResult(
            review_queue=[
                {
                    "candidate_id": None,
                    "calendar_group_key": None,
                    "activity_slug": None,
                    "reason": "reviewed_visual_source_invalid",
                    "all_reasons": ["reviewed_visual_source_invalid"],
                    "severity": "blocker",
                    "source_path": str(visual_sources_path),
                }
            ]
        )
    if payload.get("currentness") != "current":
        return PromotionResult(
            review_queue=[
                {
                    "candidate_id": None,
                    "calendar_group_key": payload.get("calendar_group_key"),
                    "activity_slug": None,
                    "reason": "reviewed_visual_source_not_current",
                    "all_reasons": ["reviewed_visual_source_not_current"],
                    "severity": "blocker",
                    "source_url": payload.get("canonical_url"),
                    "source_path": str(visual_sources_path),
                }
            ]
        )
    records = payload.get("records")
    if not isinstance(records, list):
        return PromotionResult()
    candidates = [
        _visual_candidate(payload=payload, record=record, source_path=visual_sources_path)
        for record in records
        if isinstance(record, dict)
    ]
    return promote_candidates(
        candidates,
        review_decisions=review_decisions,
        activity_sources=activity_sources,
    )


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
    source_overrides_path: Path | None = DEFAULT_SOURCE_OVERRIDES_PATH,
    reviewed_visual_sources_path: Path | None = DEFAULT_FORT_WILDERNESS_VISUAL_SOURCES_PATH,
) -> PromotionResult:
    source_overrides = _load_source_overrides(source_overrides_path)
    activity_sources = _activity_sources_with_overrides(source_overrides)
    review_decisions = load_review_decisions(review_decisions_path)
    excluded_groups = set(source_overrides)
    if reviewed_visual_sources_path and reviewed_visual_sources_path.exists():
        visual_payload = json.loads(reviewed_visual_sources_path.read_text())
        if isinstance(visual_payload, dict) and visual_payload.get("currentness") == "current":
            visual_group = str(visual_payload.get("calendar_group_key") or "")
            if visual_group:
                excluded_groups.add(visual_group)
    result = promote_fixtures(
        fixtures_dir,
        review_decisions=review_decisions,
        activity_sources=activity_sources,
        exclude_calendar_groups=excluded_groups,
    )
    replacement_result = promote_current_replacement_sources(
        source_overrides,
        review_decisions=review_decisions,
        activity_sources=activity_sources,
    )
    result.gold_records.extend(replacement_result.gold_records)
    result.review_queue.extend(replacement_result.review_queue)
    if reviewed_visual_sources_path:
        visual_result = promote_reviewed_visual_sources(
            reviewed_visual_sources_path,
            review_decisions=review_decisions,
            activity_sources=activity_sources,
        )
        result.gold_records.extend(visual_result.gold_records)
        result.review_queue.extend(visual_result.review_queue)
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
        "--source-overrides",
        type=Path,
        default=DEFAULT_SOURCE_OVERRIDES_PATH,
        help="Generated resort source replacements; replacement groups are extracted from current fetched sources.",
    )
    parser.add_argument(
        "--no-source-overrides",
        action="store_true",
        help="Ignore generated resort source replacements and promote fixture sources as-is.",
    )
    parser.add_argument(
        "--reviewed-visual-sources",
        type=Path,
        default=DEFAULT_FORT_WILDERNESS_VISUAL_SOURCES_PATH,
        help="Reviewed visual schedule source payloads, currently Fort Wilderness.",
    )
    parser.add_argument(
        "--no-reviewed-visual-sources",
        action="store_true",
        help="Ignore reviewed visual schedule payloads.",
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
        source_overrides_path=None if args.no_source_overrides else args.source_overrides,
        reviewed_visual_sources_path=None
        if args.no_reviewed_visual_sources
        else args.reviewed_visual_sources,
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
