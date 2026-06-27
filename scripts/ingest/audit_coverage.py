"""Coverage audit for source-backed activity pipeline cutover readiness."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from collections import Counter
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR, RAW_DIR
    from source_manifest import ACTIVITY_SOURCES
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .config import PROCESSED_DIR, RAW_DIR
    from .source_manifest import ACTIVITY_SOURCES


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FIXTURES_DIR = ROOT / "data/golden/activities"
DEFAULT_GOLD_PATH = PROCESSED_DIR / "activity_gold_v2_preview.json"
DEFAULT_INGEST_PATH = PROCESSED_DIR / "activities_ingest.json"
DEFAULT_OFFICIAL_OFFERINGS_PATH = PROCESSED_DIR / "official_recreation_offerings.json"
DEFAULT_SOURCE_FRESHNESS_REPORT_PATH = PROCESSED_DIR / "source_freshness_report.json"
DEFAULT_VISUAL_AUDIT_REPORT_PATH = PROCESSED_DIR / "pdf_visual_audit_report.json"
DEFAULT_FIELD_AUDIT_REPORT_PATH = PROCESSED_DIR / "field_audit_report.json"
DEFAULT_MANUAL_REVIEW_REPORT_PATH = PROCESSED_DIR / "manual_review_report.json"
SHA256_HEX = re.compile(r"^[a-f0-9]{64}$", re.I)
OFFICIAL_QUARANTINE_OFFERING_ALIASES = {
    ("fort-wilderness", "daniel-boones-wilderness-arcade"): "arcades",
    ("fort-wilderness", "davy-crocketts-wilderness-arcade"): "arcades",
    ("fort-wilderness", "fishing"): "fishing-excursions",
    (
        "fort-wilderness",
        "horse-drawn-excursion-carriage-ride-at-disneys-fort-wilderness-resort-campground",
    ): "horse-drawn-carriage-rides",
    ("fort-wilderness", "holiday-sleigh-rides"): "horse-drawn-excursion-holiday-sleigh-rides",
    ("fort-wilderness", "jogging-trails"): "running-trails",
    ("fort-wilderness", "wagon-rides"): "horse-drawn-excursion-wagon-ride",
}


@dataclass
class CoverageAudit:
    summary: dict[str, Any]
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return not self.errors


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _is_historical_regression_fixture(fixture: dict[str, Any]) -> bool:
    return str(fixture.get("publication_scope") or "").strip() == "historical_regression"


def _pdf_sources() -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    for source in ACTIVITY_SOURCES:
        if not source.pdf_url:
            continue
        filename = source.pdf_url.rsplit("/", 1)[-1]
        local_path = RAW_DIR / filename
        sources.append(
            {
                "calendar_group_key": source.calendar_group_key,
                "resort_slugs": list(source.resort_slugs),
                "pdf_url": source.pdf_url,
                "pdf_edition": source.pdf_edition,
                "local_path": str(local_path),
                "cached": local_path.exists(),
                "content_sha256": _sha256(local_path) if local_path.exists() else None,
            }
        )
    return sources


def _fixture_source_hash(fixture: dict[str, Any], expected: dict[str, Any] | None = None) -> str | None:
    source_kind = str(fixture.get("source_kind", "pdf"))
    if source_kind != "official_web":
        return fixture.get("source_pdf_sha256")

    slug = expected.get("slug") if isinstance(expected, dict) else None
    detail_pages = fixture.get("source_detail_pages")
    if slug and isinstance(detail_pages, list):
        for detail_page in detail_pages:
            if not isinstance(detail_page, dict):
                continue
            if detail_page.get("slug") == slug and detail_page.get("source_web_sha256"):
                return detail_page.get("source_web_sha256")
    return fixture.get("source_web_sha256")


def _fixture_rows(fixtures_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not fixtures_dir.exists():
        return rows

    for path in sorted(fixtures_dir.glob("*.json")):
        fixture = json.loads(path.read_text())
        if _is_historical_regression_fixture(fixture):
            continue
        expected_records = fixture.get("expected_records")
        if isinstance(expected_records, list):
            for expected in expected_records:
                rows.append(
                    {
                        "path": str(path),
                        "calendar_group_key": fixture.get("calendar_group_key"),
                        "source_sha256": _fixture_source_hash(fixture, expected),
                        "slug": expected.get("slug"),
                        "title": expected.get("title"),
                        "fixture_kind": "full_calendar",
                    }
                )
            reviewed_manual_records = fixture.get("reviewed_manual_records")
            if isinstance(reviewed_manual_records, list):
                for expected in reviewed_manual_records:
                    if not isinstance(expected, dict):
                        continue
                    rows.append(
                        {
                            "path": str(path),
                            "calendar_group_key": fixture.get("calendar_group_key"),
                            "source_sha256": _fixture_source_hash(fixture, expected),
                            "slug": expected.get("slug"),
                            "title": expected.get("title"),
                            "fixture_kind": "full_calendar",
                        }
                    )
        else:
            expected = fixture.get("expected", {})
            rows.append(
                {
                    "path": str(path),
                    "calendar_group_key": fixture.get("calendar_group_key"),
                    "source_sha256": _fixture_source_hash(fixture, expected),
                    "slug": expected.get("slug"),
                    "title": expected.get("title"),
                    "fixture_kind": "single_record",
                }
            )
    return rows


def _fixture_quarantine_rows(fixtures_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not fixtures_dir.exists():
        return rows

    for path in sorted(fixtures_dir.glob("*.json")):
        fixture = json.loads(path.read_text())
        if _is_historical_regression_fixture(fixture):
            continue
        expected_records = fixture.get("expected_quarantine_records")
        if not isinstance(expected_records, list):
            continue
        for expected in expected_records:
            if not isinstance(expected, dict):
                continue
            rows.append(
                {
                    "path": str(path),
                    "calendar_group_key": fixture.get("calendar_group_key"),
                    "source_kind": fixture.get("source_kind", "pdf"),
                    "source_sha256": _fixture_source_hash(fixture, expected),
                    "slug": expected.get("slug"),
                    "title": expected.get("title"),
                    "fixture_kind": "expected_quarantine",
                }
            )
    return rows


def _fixture_unextractable_rows(fixtures_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not fixtures_dir.exists():
        return rows

    for path in sorted(fixtures_dir.glob("*.json")):
        fixture = json.loads(path.read_text())
        if _is_historical_regression_fixture(fixture):
            continue
        expected_records = fixture.get("expected_unextractable_records")
        if not isinstance(expected_records, list):
            continue
        for expected in expected_records:
            if not isinstance(expected, dict):
                continue
            rows.append(
                {
                    "path": str(path),
                    "calendar_group_key": fixture.get("calendar_group_key"),
                    "source_kind": fixture.get("source_kind", "pdf"),
                    "source_sha256": _fixture_source_hash(fixture, expected),
                    "slug": expected.get("slug"),
                    "title": expected.get("title"),
                    "reason": expected.get("reason"),
                    "fixture_kind": "expected_unextractable",
                }
            )
    return rows


def _manual_review_records(fixtures_dir: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    if not fixtures_dir.exists():
        return records
    for path in sorted(fixtures_dir.glob("*.json")):
        fixture = _read_json(path, {})
        if not isinstance(fixture, dict) or _is_historical_regression_fixture(fixture):
            continue
        reviewed_manual_records = fixture.get("reviewed_manual_records")
        if not isinstance(reviewed_manual_records, list):
            continue
        for index, expected in enumerate(reviewed_manual_records):
            if not isinstance(expected, dict):
                continue
            records.append(
                {
                    "fixture": str(path),
                    "fixture_name": path.name,
                    "record_index": index,
                    "calendar_group_key": fixture.get("calendar_group_key"),
                    "slug": expected.get("slug"),
                    "title": expected.get("title"),
                    "source_sha256": _fixture_source_hash(fixture, expected),
                    "manual_review": expected.get("manual_review"),
                    "required_spans": expected.get("required_spans"),
                }
            )
    return records


def _spans_have_source_text_or_bbox(spans_by_field: Any) -> bool:
    if not isinstance(spans_by_field, dict):
        return False
    for spans in spans_by_field.values():
        if not isinstance(spans, list):
            continue
        for span in spans:
            if not isinstance(span, dict):
                continue
            if str(span.get("text") or "").strip() or span.get("bbox"):
                return True
    return False


def manual_review_errors(
    review: dict[str, Any] | None,
    *,
    fallback_source_sha256: str | None = None,
    fallback_required_spans: dict[str, Any] | None = None,
    fallback_decision: str | None = None,
) -> list[str]:
    errors: list[str] = []
    if not isinstance(review, dict):
        return ["manual_review:missing"]

    source_sha256 = str(review.get("source_sha256") or fallback_source_sha256 or "")
    if not SHA256_HEX.match(source_sha256):
        errors.append("manual_review:source_sha256")

    has_source_text = bool(str(review.get("source_text") or "").strip())
    has_bbox = isinstance(review.get("bbox"), dict) or bool(review.get("bbox"))
    if not (has_source_text or has_bbox or _spans_have_source_text_or_bbox(fallback_required_spans)):
        errors.append("manual_review:source_text_or_bbox")

    if not str(review.get("decision") or fallback_decision or "").strip():
        errors.append("manual_review:decision")
    if not str(review.get("reason") or review.get("notes") or "").strip():
        errors.append("manual_review:reason")
    return errors


def build_manual_review_report(fixtures_dir: Path = DEFAULT_FIXTURES_DIR) -> dict[str, Any]:
    records = _manual_review_records(fixtures_dir)
    audited_records: list[dict[str, Any]] = []
    error_counts: Counter[str] = Counter()
    for record in records:
        errors = manual_review_errors(
            record.get("manual_review"),
            fallback_source_sha256=record.get("source_sha256"),
            fallback_required_spans=record.get("required_spans"),
            fallback_decision="publish",
        )
        for error in errors:
            error_counts[error] += 1
        audited_records.append(
            {
                "fixture": record["fixture_name"],
                "calendar_group_key": record.get("calendar_group_key"),
                "slug": record.get("slug"),
                "title": record.get("title"),
                "reviewer": (record.get("manual_review") or {}).get("reviewer")
                if isinstance(record.get("manual_review"), dict)
                else None,
                "reviewed_at": (record.get("manual_review") or {}).get("reviewed_at")
                if isinstance(record.get("manual_review"), dict)
                else None,
                "source_sha256": record.get("source_sha256"),
                "decision": (record.get("manual_review") or {}).get("decision", "publish")
                if isinstance(record.get("manual_review"), dict)
                else None,
                "reason": (record.get("manual_review") or {}).get("reason")
                or (record.get("manual_review") or {}).get("notes")
                if isinstance(record.get("manual_review"), dict)
                else None,
                "has_source_text_or_bbox": _spans_have_source_text_or_bbox(record.get("required_spans")),
                "errors": errors,
            }
        )
    return {
        "passed": not error_counts,
        "summary": {
            "manual_review_record_count": len(records),
            "manual_review_error_count": sum(error_counts.values()),
            "manual_review_errors_by_code": dict(sorted(error_counts.items())),
        },
        "records": audited_records,
    }


def _gold_rows(gold_path: Path) -> list[dict[str, Any]]:
    data = _read_json(gold_path, [])
    return data if isinstance(data, list) else []


def _source_freshness_errors(path: Path) -> list[str]:
    if not path.exists():
        return []
    report = _read_json(path, {})
    if not isinstance(report, dict):
        return [f"source_freshness:invalid_report:{path}"]
    errors = report.get("errors")
    if isinstance(errors, list):
        return [str(error) for error in errors if str(error).strip()]
    if report.get("passed") is False:
        return [f"source_freshness:failed_without_errors:{path}"]
    return []


def _visual_audit_errors(path: Path) -> list[str]:
    if not path.exists():
        return [f"visual_audit:missing_report:{path}"]
    report = _read_json(path, {})
    if not isinstance(report, dict):
        return [f"visual_audit:invalid_report:{path}"]
    blocking = report.get("blocking_mismatches")
    blocking_count = len(blocking) if isinstance(blocking, list) else int((report.get("summary") or {}).get("blocking_mismatches") or 0)
    if blocking_count:
        return [f"visual_audit:blocking_mismatches:{blocking_count}"]
    if report.get("passed") is False:
        return [f"visual_audit:failed_without_blocking_count:{path}"]
    return []


def _field_audit_errors(path: Path) -> list[str]:
    if not path.exists():
        return [f"field_audit:missing_report:{path}"]
    report = _read_json(path, {})
    if not isinstance(report, dict):
        return [f"field_audit:invalid_report:{path}"]
    errors = report.get("errors")
    error_count = len(errors) if isinstance(errors, list) else int((report.get("summary") or {}).get("errors") or 0)
    if error_count:
        return [f"field_audit:errors:{error_count}"]
    if report.get("passed") is False:
        return [f"field_audit:failed_without_error_count:{path}"]
    return []


def _report_summary(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    report = _read_json(path, {})
    if not isinstance(report, dict):
        return {}
    summary = report.get("summary")
    return summary if isinstance(summary, dict) else {}


def _legacy_counts(ingest_path: Path) -> Counter[str]:
    data = _read_json(ingest_path, {})
    counts: Counter[str] = Counter()
    for activity in data.get("activities", []) if isinstance(data, dict) else []:
        group = activity.get("calendar_group_key")
        if group:
            counts[str(group)] += 1
    return counts


def _resort_group_map() -> dict[str, set[str]]:
    resort_groups: dict[str, set[str]] = {}
    for source in ACTIVITY_SOURCES:
        for resort_slug in source.resort_slugs:
            resort_groups.setdefault(resort_slug, set()).add(source.calendar_group_key)
    return resort_groups


def _official_offering_group_slug_keys(path: Path) -> set[tuple[str, str]]:
    data = _read_json(path, {})
    if not isinstance(data, dict):
        return set()

    resort_groups = _resort_group_map()
    keys: set[tuple[str, str]] = set()
    offerings = data.get("offerings")
    if not isinstance(offerings, list):
        return keys

    for offering in offerings:
        if not isinstance(offering, dict):
            continue
        program_key = str(offering.get("program_key") or "").strip()
        resort_slug = str(offering.get("resort_slug") or "").strip()
        if not program_key or not resort_slug:
            continue
        for group in resort_groups.get(resort_slug, set()):
            keys.add((group, program_key))
    return keys


def _official_offering_covers_quarantine(
    row: dict[str, Any],
    official_offering_keys: set[tuple[str, str]],
) -> bool:
    group = str(row.get("calendar_group_key") or "")
    slug = str(row.get("slug") or "")
    program_key = OFFICIAL_QUARANTINE_OFFERING_ALIASES.get((group, slug), slug)
    return (
        row.get("source_kind") == "official_web"
        and (group, program_key) in official_offering_keys
    )


def _official_offering_alias_covers_quarantine(
    row: dict[str, Any],
    official_offering_keys: set[tuple[str, str]],
) -> bool:
    group = str(row.get("calendar_group_key") or "")
    slug = str(row.get("slug") or "")
    alias = OFFICIAL_QUARANTINE_OFFERING_ALIASES.get((group, slug))
    return (
        row.get("source_kind") == "official_web"
        and alias is not None
        and (group, alias) in official_offering_keys
    )


def _claims_for(row: dict[str, Any]) -> list[dict[str, Any]]:
    claims = row.get("claims") or []
    if isinstance(claims, dict):
        return [
            {"kind": kind, **claim}
            for kind, claim in claims.items()
            if isinstance(claim, dict)
        ]
    return [claim for claim in claims if isinstance(claim, dict)]


def _format_group_counts(group_counts: dict[str, dict[str, int]]) -> str:
    return ",".join(
        f"{group}={counts['gold']}<{counts['legacy']}"
        for group, counts in sorted(group_counts.items())
    )


def _format_required_group_counts(group_counts: dict[str, dict[str, Any]]) -> str:
    return ",".join(
        f"{group}={counts['gold']}<{counts['required']}({counts['basis']})"
        for group, counts in sorted(group_counts.items())
    )


def _format_legacy_overcount_groups(group_counts: dict[str, dict[str, int]]) -> str:
    return ",".join(
        f"{group}=legacy:{counts['legacy']}>fixture:{counts['fixture']}"
        for group, counts in sorted(group_counts.items())
    )


def _format_legacy_undercount_groups(group_counts: dict[str, dict[str, int]]) -> str:
    return ",".join(
        f"{group}=legacy:{counts['legacy']}<fixture:{counts['fixture']}"
        for group, counts in sorted(group_counts.items())
    )


def _slugify_title(value: str) -> str:
    value = value.replace("’", "").replace("'", "")
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _title_slug_matches(title: str, slug: str) -> bool:
    expected = _slugify_title(title)
    if slug == expected:
        return True
    return title.lower() == "movies under the stars" and slug == "movie-under-the-stars"


def _title_tokens(value: str) -> list[str]:
    normalized = (
        value.replace("($)", " ")
        .replace("&", " and ")
        .replace("+", "h")
        .replace("|", "i")
    )
    return re.findall(r"[a-z0-9]+", normalized.lower())


def _compact_title(value: str) -> str:
    return "".join(_title_tokens(value))


def _source_span_looks_ocr_fragmented(value: str) -> bool:
    tokens = _title_tokens(value)
    if not tokens:
        return False
    short_tokens = sum(1 for token in tokens if len(token) <= 2)
    has_single_letter_shard = len(tokens) >= 3 and any(len(token) == 1 for token in tokens)
    return short_tokens / len(tokens) >= (1 / 3) or has_single_letter_shard or bool(re.search(r"[|+]", value))


def _title_span_supports_title(title: str, spans: list[dict[str, Any]]) -> bool:
    span_text = " ".join(str(span.get("text") or "") for span in spans if isinstance(span, dict))
    title_tokens = _title_tokens(title)
    span_tokens = _title_tokens(span_text)
    if not title_tokens or not span_tokens:
        return False

    span_token_set = set(span_tokens)
    if all(token in span_token_set for token in title_tokens):
        return True

    if not _source_span_looks_ocr_fragmented(span_text):
        return False

    title_compact = _compact_title(title)
    span_compact = _compact_title(span_text)
    if not title_compact or not span_compact:
        return False
    if title_compact in span_compact or span_compact in title_compact:
        return True
    return SequenceMatcher(None, title_compact, span_compact).ratio() >= 0.92


def _field_span_supports_text(value: str, spans: list[dict[str, Any]], *, min_ratio: float = 0.82) -> bool:
    span_text = " ".join(str(span.get("text") or "") for span in spans if isinstance(span, dict))
    value_compact = _compact_title(value)
    span_compact = _compact_title(span_text)
    if not value_compact or not span_compact:
        return False
    if value_compact in span_compact or span_compact in value_compact:
        return True
    return SequenceMatcher(None, value_compact, span_compact).ratio() >= min_ratio


def _field_span_text(spans: list[dict[str, Any]]) -> str:
    return " ".join(str(span.get("text") or "") for span in spans if isinstance(span, dict))


def _normalize_schedule_time(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip().lower().replace(" ", "")
    match = re.match(r"^(\d{1,2})(?::(\d{2}))?(am|pm)$", text)
    if not match:
        return text or None
    hour, minute, meridiem = match.groups()
    return f"{int(hour)}:{minute or '00'}{meridiem}"


def _explicit_schedule_range(schedule_text: str) -> tuple[str, str] | None:
    text = schedule_text.replace("—", "-").replace("–", "-")
    time_pattern = r"(\d{1,2})(?::(\d{2}))?\s*([ap]m)"
    range_pattern = re.compile(
        rf"\bfrom\s+{time_pattern}\s*(?:-|to)\s*{time_pattern}\b|"
        rf"\b{time_pattern}\s*(?:-|to)\s*{time_pattern}\b",
        flags=re.I,
    )
    match = range_pattern.search(text)
    if not match:
        return None
    groups = [group for group in match.groups() if group is not None]
    if len(groups) != 6:
        return None
    start = _normalize_schedule_time(f"{groups[0]}:{groups[1] or '00'}{groups[2]}")
    end = _normalize_schedule_time(f"{groups[3]}:{groups[4] or '00'}{groups[5]}")
    if not start or not end:
        return None
    return start, end


def _schedule_span_supports_text(value: str, spans: list[dict[str, Any]]) -> bool:
    if _field_span_supports_text(value, spans, min_ratio=0.74):
        return True

    span_text = _field_span_text(spans)
    value_tokens = set(_title_tokens(value))
    span_tokens = set(_title_tokens(span_text))
    ignorable = {
        "a",
        "activities",
        "activity",
        "am",
        "and",
        "at",
        "available",
        "code",
        "digitally",
        "from",
        "information",
        "no",
        "pdf",
        "pm",
        "posted",
        "qr",
        "schedule",
        "scan",
        "select",
        "the",
        "this",
        "time",
        "to",
        "view",
    }
    meaningful_tokens = value_tokens - ignorable
    if meaningful_tokens and meaningful_tokens.issubset(span_tokens):
        return True

    if "no posted time in pdf" in value.lower():
        span_lower = span_text.lower()
        if "activities schedule" in span_lower and "digitally" in span_lower:
            return True
        if "self-guided" in span_lower or "self guided" in span_lower:
            return True

    explicit_range = _explicit_schedule_range(value)
    if explicit_range:
        source_times = set(
            _normalize_schedule_time(f"{match.group(1)}:{match.group(2) or '00'}{match.group(3)}")
            for match in re.finditer(r"(\d{1,2})(?::(\d{2}))?\s*([ap]m)", span_text, flags=re.I)
        )
        return set(explicit_range).issubset(source_times) and bool(
            {"daily", "hours"} & span_tokens
        )

    return False


def _gold_title_fidelity_errors(row: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    title = str(row.get("title") or "").strip()
    slug = str(row.get("canonical_slug") or "").strip()
    provenance = row.get("field_provenance") or {}
    title_spans = provenance.get("title")
    if not title or not slug or not isinstance(title_spans, list) or not title_spans:
        return errors

    if not _title_slug_matches(title, slug):
        errors.append("title_slug_mismatch")
    if not _title_span_supports_title(title, title_spans):
        errors.append("title_not_supported_by_source_span")
    return errors


def _gold_schedule_fidelity_errors(row: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    schedule = row.get("schedule") or {}
    if not isinstance(schedule, dict):
        return errors

    schedule_text = str(schedule.get("text") or "").strip()
    provenance = row.get("field_provenance") or {}
    schedule_spans = provenance.get("schedule")
    if (
        schedule_text
        and isinstance(schedule_spans, list)
        and schedule_spans
        and not _schedule_span_supports_text(schedule_text, schedule_spans)
    ):
        errors.append("schedule_not_supported_by_source_span")

    explicit_range = _explicit_schedule_range(schedule_text)
    if not explicit_range:
        return errors

    expected_start, expected_end = explicit_range
    start_time = _normalize_schedule_time(schedule.get("start_time"))
    end_time = _normalize_schedule_time(schedule.get("end_time"))
    if not start_time:
        errors.append("schedule_explicit_range_missing_start_time")
    elif start_time != expected_start:
        errors.append("schedule_explicit_range_start_time_mismatch")
    if not end_time:
        errors.append("schedule_explicit_range_missing_end_time")
    elif end_time != expected_end:
        errors.append("schedule_explicit_range_end_time_mismatch")
    return errors


def _gold_row_errors(row: dict[str, Any], index: int) -> list[str]:
    prefix = f"gold_row:{index}:{row.get('calendar_group_key', '<missing-group>')}/{row.get('canonical_slug', '<missing-slug>')}"
    errors: list[str] = []

    if not row.get("calendar_group_key"):
        errors.append(f"{prefix}:missing_group")
    if not row.get("canonical_slug"):
        errors.append(f"{prefix}:missing_slug")
    if not row.get("source_sha256") and not (row.get("source") or {}).get("documentHash"):
        errors.append(f"{prefix}:missing_source_hash")
    if not row.get("source_url") and not (row.get("source") or {}).get("url"):
        errors.append(f"{prefix}:missing_source_url")

    provenance = row.get("field_provenance") or {}
    for field_name in ("title", "schedule", "location"):
        spans = provenance.get(field_name)
        if not isinstance(spans, list) or not spans:
            errors.append(f"{prefix}:missing_{field_name}_provenance")
    if row.get("description"):
        spans = provenance.get("description")
        if not isinstance(spans, list) or not spans:
            errors.append(f"{prefix}:missing_description_provenance")
        elif not _field_span_supports_text(str(row.get("description") or ""), spans):
            errors.append(f"{prefix}:description_not_supported_by_source_span")

    errors.extend(f"{prefix}:{error}" for error in _gold_title_fidelity_errors(row))
    errors.extend(f"{prefix}:{error}" for error in _gold_schedule_fidelity_errors(row))

    for claim in _claims_for(row):
        value = str(claim.get("value", "")).strip().lower()
        if value and value not in {"unknown", "not_applicable"} and not claim.get("evidence"):
            errors.append(f"{prefix}:claim_without_evidence:{claim.get('kind', 'claim')}")

    return errors


def build_coverage_audit(
    *,
    fixtures_dir: Path = DEFAULT_FIXTURES_DIR,
    gold_path: Path = DEFAULT_GOLD_PATH,
    ingest_path: Path = DEFAULT_INGEST_PATH,
    official_offerings_path: Path = DEFAULT_OFFICIAL_OFFERINGS_PATH,
    source_freshness_report_path: Path = DEFAULT_SOURCE_FRESHNESS_REPORT_PATH,
    visual_audit_report_path: Path = DEFAULT_VISUAL_AUDIT_REPORT_PATH,
    field_audit_report_path: Path = DEFAULT_FIELD_AUDIT_REPORT_PATH,
    require_production_ready: bool = False,
    expected_ui_mode: str = "gold-v2",
) -> CoverageAudit:
    errors: list[str] = []
    warnings: list[str] = []
    pdf_sources = _pdf_sources()
    fixtures = _fixture_rows(fixtures_dir)
    fixture_quarantines = _fixture_quarantine_rows(fixtures_dir)
    fixture_unextractables = _fixture_unextractable_rows(fixtures_dir)
    gold = _gold_rows(gold_path)
    source_freshness_errors = (
        _source_freshness_errors(source_freshness_report_path)
        if require_production_ready
        else []
    )
    visual_audit_errors = (
        _visual_audit_errors(visual_audit_report_path)
        if require_production_ready
        else []
    )
    field_audit_errors = (
        _field_audit_errors(field_audit_report_path)
        if require_production_ready
        else []
    )
    visual_audit_summary = _report_summary(visual_audit_report_path)
    field_audit_summary = _report_summary(field_audit_report_path)
    manual_review_report = build_manual_review_report(fixtures_dir)
    manual_review_errors_list = [
        f"manual_review:{record['calendar_group_key']}/{record['slug']}:{error}"
        for record in manual_review_report["records"]
        for error in record["errors"]
    ]
    legacy_counts = _legacy_counts(ingest_path)
    official_offering_keys = _official_offering_group_slug_keys(official_offerings_path)
    official_offering_covered_quarantines = [
        row
        for row in fixture_quarantines
        if _official_offering_covers_quarantine(row, official_offering_keys)
    ]
    official_offering_alias_covered_quarantines = [
        row
        for row in fixture_quarantines
        if _official_offering_alias_covers_quarantine(row, official_offering_keys)
    ]
    blocking_fixture_quarantines = [
        row
        for row in fixture_quarantines
        if not _official_offering_covers_quarantine(row, official_offering_keys)
    ]

    pdf_groups = {source["calendar_group_key"] for source in pdf_sources}
    cached_groups = {source["calendar_group_key"] for source in pdf_sources if source["cached"]}
    fixture_keys = {
        (row["calendar_group_key"], row["slug"], row["source_sha256"])
        for row in fixtures
    }
    fixture_groups = {row["calendar_group_key"] for row in fixtures}
    full_fixture_groups = {
        row["calendar_group_key"]
        for row in fixtures
        if row.get("fixture_kind") == "full_calendar"
    }
    fixture_counts_by_group = Counter(
        str(group)
        for group, _, _ in fixture_keys
        if group
    )
    fixture_hashes_by_group: dict[str, set[str]] = {}
    for row in fixtures:
        group = row.get("calendar_group_key")
        source_hash = row.get("source_sha256")
        if group and source_hash:
            fixture_hashes_by_group.setdefault(str(group), set()).add(str(source_hash))
    gold_keys = {
        (
            row.get("calendar_group_key"),
            row.get("canonical_slug"),
            row.get("source_sha256") or (row.get("source") or {}).get("documentHash"),
        )
        for row in gold
    }
    gold_groups = {row.get("calendar_group_key") for row in gold if row.get("calendar_group_key")}
    gold_counts = Counter(str(row.get("calendar_group_key")) for row in gold if row.get("calendar_group_key"))
    gold_identity_counts = Counter(
        (str(row.get("calendar_group_key") or ""), str(row.get("canonical_slug") or ""))
        for row in gold
        if row.get("calendar_group_key") and row.get("canonical_slug")
    )
    duplicate_gold_identities = {
        f"{group}/{slug}": count
        for (group, slug), count in sorted(gold_identity_counts.items())
        if count > 1
    }
    legacy_total = sum(legacy_counts.values())
    coverage_requirements: dict[str, dict[str, Any]] = {}
    legacy_overcount_groups: dict[str, dict[str, int]] = {}
    legacy_undercount_groups: dict[str, dict[str, int]] = {}
    for group in sorted(set(legacy_counts) | fixture_groups):
        legacy_count = legacy_counts.get(group, 0)
        fixture_count = fixture_counts_by_group.get(group, 0)
        if group in full_fixture_groups and fixture_count:
            coverage_requirements[group] = {
                "required": fixture_count,
                "basis": "fixture",
            }
            if legacy_count > fixture_count and gold_counts.get(group, 0) >= fixture_count:
                legacy_overcount_groups[group] = {
                    "gold": gold_counts.get(group, 0),
                    "fixture": fixture_count,
                    "legacy": legacy_count,
                }
            if legacy_count < fixture_count and gold_counts.get(group, 0) >= fixture_count:
                legacy_undercount_groups[group] = {
                    "gold": gold_counts.get(group, 0),
                    "fixture": fixture_count,
                    "legacy": legacy_count,
                }
        elif legacy_count:
            coverage_requirements[group] = {
                "required": legacy_count,
                "basis": "legacy",
            }
    coverage_required_count = sum(
        int(requirement["required"])
        for requirement in coverage_requirements.values()
    )
    undercovered_gold_groups = {
        group: {
            "gold": gold_counts.get(group, 0),
            "required": int(requirement["required"]),
            "basis": str(requirement["basis"]),
        }
        for group, requirement in sorted(coverage_requirements.items())
        if gold_counts.get(group, 0) < int(requirement["required"])
    }

    missing_cached_groups = sorted(pdf_groups - cached_groups)
    missing_fixture_groups = sorted(pdf_groups - fixture_groups)
    missing_gold_groups = sorted(pdf_groups - gold_groups)
    missing_gold_fixture_keys = sorted(fixture_keys - gold_keys)
    stale_fixture_groups = {
        str(source["calendar_group_key"]): {
            "current_pdf_sha256": str(source["content_sha256"]),
            "fixture_sha256": sorted(fixture_hashes_by_group.get(str(source["calendar_group_key"]), set())),
            "pdf_edition": source.get("pdf_edition"),
        }
        for source in pdf_sources
        if source.get("cached")
        and source.get("content_sha256")
        and str(source["calendar_group_key"]) in full_fixture_groups
        and str(source["content_sha256"]) not in fixture_hashes_by_group.get(str(source["calendar_group_key"]), set())
    }

    if missing_cached_groups:
        errors.append(f"bronze:missing_cached_pdfs:{','.join(missing_cached_groups)}")

    if missing_gold_fixture_keys:
        errors.append(
            "gold:missing_fixture_records:"
            + ",".join(f"{group}/{slug}" for group, slug, _ in missing_gold_fixture_keys)
        )

    for index, row in enumerate(gold):
        errors.extend(_gold_row_errors(row, index))
    if duplicate_gold_identities:
        errors.append(
            "gold:duplicate_current_identity:"
            + ",".join(f"{key}={count}" for key, count in duplicate_gold_identities.items())
        )

    if missing_fixture_groups:
        warnings.append(f"coverage:missing_fixture_groups:{len(missing_fixture_groups)}")
    if missing_gold_groups:
        warnings.append(f"coverage:missing_gold_groups:{len(missing_gold_groups)}")
    if stale_fixture_groups:
        warnings.append(
            "coverage:stale_fixture_sources:"
            + ",".join(sorted(stale_fixture_groups))
        )
    if coverage_required_count and len(gold) < coverage_required_count:
        warnings.append(f"coverage:gold_rows_below_required_count:{len(gold)}<{coverage_required_count}")
    if undercovered_gold_groups:
        warnings.append(
            "coverage:gold_rows_below_required_by_group:"
            + _format_required_group_counts(undercovered_gold_groups)
        )
    if legacy_overcount_groups:
        warnings.append(
            "coverage:legacy_overcount_groups:"
            + _format_legacy_overcount_groups(legacy_overcount_groups)
        )
    if legacy_undercount_groups:
        warnings.append(
            "coverage:legacy_undercount_groups:"
            + _format_legacy_undercount_groups(legacy_undercount_groups)
        )
    if fixture_quarantines:
        warnings.append(f"coverage:fixture_quarantine_records:{len(fixture_quarantines)}")
    if official_offering_covered_quarantines:
        warnings.append(
            f"coverage:official_offering_covered_quarantine_records:{len(official_offering_covered_quarantines)}"
        )
    if official_offering_alias_covered_quarantines:
        warnings.append(
            f"coverage:official_offering_alias_covered_quarantine_records:{len(official_offering_alias_covered_quarantines)}"
        )
    if blocking_fixture_quarantines:
        warnings.append(f"coverage:blocking_fixture_quarantine_records:{len(blocking_fixture_quarantines)}")
    if fixture_unextractables:
        warnings.append(f"coverage:fixture_unextractable_records:{len(fixture_unextractables)}")

    ui_mode = os.environ.get("ACTIVITY_DATA_PIPELINE") or os.environ.get(
        "NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE", "gold-v2"
    )
    production_ready = (
        not errors
        and not blocking_fixture_quarantines
        and not missing_fixture_groups
        and not missing_gold_groups
        and not stale_fixture_groups
        and (not coverage_required_count or len(gold) >= coverage_required_count)
        and not undercovered_gold_groups
        and ui_mode == expected_ui_mode
    )

    if require_production_ready:
        if missing_fixture_groups:
            errors.append(f"coverage:missing_fixture_groups:{','.join(missing_fixture_groups)}")
        if missing_gold_groups:
            errors.append(f"coverage:missing_gold_groups:{','.join(missing_gold_groups)}")
        if stale_fixture_groups:
            errors.append(f"coverage:stale_fixture_sources:{','.join(sorted(stale_fixture_groups))}")
        if coverage_required_count and len(gold) < coverage_required_count:
            errors.append(f"coverage:gold_rows_below_required_count:{len(gold)}<{coverage_required_count}")
        if undercovered_gold_groups:
            errors.append(
                "coverage:gold_rows_below_required_by_group:"
                + _format_required_group_counts(undercovered_gold_groups)
            )
        if blocking_fixture_quarantines:
            errors.append(f"coverage:blocking_fixture_quarantine_records:{len(blocking_fixture_quarantines)}")
        if ui_mode != expected_ui_mode:
            errors.append(f"coverage:ui_pipeline_not_{expected_ui_mode}:{ui_mode}")
        errors.extend(source_freshness_errors)
        errors.extend(visual_audit_errors)
        errors.extend(field_audit_errors)
        errors.extend(manual_review_errors_list)

    summary = {
        "pdf_source_count": len(pdf_sources),
        "cached_pdf_count": len(cached_groups),
        "fixture_count": len(fixtures),
        "fixture_quarantine_count": len(fixture_quarantines),
        "official_offering_covered_quarantine_count": len(official_offering_covered_quarantines),
        "official_offering_covered_quarantine_unique_count": len(
            {
                (row.get("calendar_group_key"), row.get("slug"))
                for row in official_offering_covered_quarantines
            }
        ),
        "official_offering_alias_covered_quarantine_count": len(
            official_offering_alias_covered_quarantines
        ),
        "official_offering_alias_covered_quarantine_unique_count": len(
            {
                (row.get("calendar_group_key"), row.get("slug"))
                for row in official_offering_alias_covered_quarantines
            }
        ),
        "source_freshness_error_count": len(source_freshness_errors),
        "visual_audit_error_count": len(visual_audit_errors),
        "visual_audit_summary": visual_audit_summary,
        "field_audit_error_count": len(field_audit_errors),
        "field_audit_summary": field_audit_summary,
        "manual_review_summary": manual_review_report["summary"],
        "blocking_fixture_quarantine_count": len(blocking_fixture_quarantines),
        "blocking_fixture_quarantine_unique_count": len(
            {
                (row.get("calendar_group_key"), row.get("slug"))
                for row in blocking_fixture_quarantines
            }
        ),
        "fixture_unextractable_count": len(fixture_unextractables),
        "fixture_group_count": len(fixture_groups),
        "gold_record_count": len(gold),
        "gold_group_count": len(gold_groups),
        "legacy_activity_count": legacy_total,
        "coverage_required_count": coverage_required_count,
        "ui_pipeline": ui_mode,
        "production_ready": production_ready,
        "missing_cached_groups": missing_cached_groups,
        "missing_fixture_groups": missing_fixture_groups,
        "missing_gold_groups": missing_gold_groups,
        "stale_fixture_groups": stale_fixture_groups,
        "undercovered_gold_groups": undercovered_gold_groups,
        "legacy_overcount_groups": legacy_overcount_groups,
        "legacy_undercount_groups": legacy_undercount_groups,
        "duplicate_gold_identities": duplicate_gold_identities,
        "coverage_requirements_by_group": coverage_requirements,
        "legacy_counts_by_group": dict(sorted(legacy_counts.items())),
        "gold_counts_by_group": dict(sorted(gold_counts.items())),
    }
    return CoverageAudit(summary=summary, errors=errors, warnings=warnings)


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit v2 source-to-Gold coverage")
    parser.add_argument("--fixtures-dir", type=Path, default=DEFAULT_FIXTURES_DIR)
    parser.add_argument("--gold-path", type=Path, default=DEFAULT_GOLD_PATH)
    parser.add_argument("--ingest-path", type=Path, default=DEFAULT_INGEST_PATH)
    parser.add_argument("--require-production-ready", action="store_true")
    parser.add_argument("--json", action="store_true", help="Print machine-readable audit JSON")
    args = parser.parse_args()

    audit = build_coverage_audit(
        fixtures_dir=args.fixtures_dir,
        gold_path=args.gold_path,
        ingest_path=args.ingest_path,
        require_production_ready=args.require_production_ready,
    )

    payload = {
        "passed": audit.passed,
        "summary": audit.summary,
        "warnings": audit.warnings,
        "errors": audit.errors,
    }
    DEFAULT_MANUAL_REVIEW_REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    DEFAULT_MANUAL_REVIEW_REPORT_PATH.write_text(
        json.dumps(build_manual_review_report(args.fixtures_dir), indent=2, ensure_ascii=False) + "\n"
    )
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        for warning in audit.warnings:
            print(f"[WARNING] {warning}")
        for error in audit.errors:
            print(f"[ERROR] {error}")
        print(
            "Coverage audit "
            f"{'PASSED' if audit.passed else 'FAILED'} "
            f"({audit.summary['gold_record_count']} Gold rows, "
            f"{audit.summary['fixture_count']} fixtures, "
            f"{audit.summary['pdf_source_count']} PDF sources, "
            f"production_ready={audit.summary['production_ready']})"
        )

    raise SystemExit(0 if audit.passed else 1)


if __name__ == "__main__":
    main()
