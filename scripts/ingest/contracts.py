"""Fail-closed contracts for source-backed public activity data."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    from web_snapshot import web_snapshot_file_content_hash
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .web_snapshot import web_snapshot_file_content_hash


@dataclass
class ValidationResult:
    publishable: bool = True
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def error(self, code: str) -> None:
        self.errors.append(code)
        self.publishable = False

    def merge(self, other: "ValidationResult") -> None:
        self.errors.extend(other.errors)
        self.warnings.extend(other.warnings)
        if not other.publishable:
            self.publishable = False


REQUIRED_PUBLIC_FIELDS = ("title", "schedule", "location")
SOURCE_DERIVED_FIELDS = ("title", "schedule", "location", "description")
REQUIRED_FIXTURE_EXPECTED_FIELDS = (
    "title",
    "slug",
    "schedule_text",
    "start_time",
    "end_time",
    "location",
    "description",
    "is_fee_based",
)
REQUIRED_FULL_FIXTURE_RECORD_FIELDS = (
    "title",
    "slug",
    "category",
    "schedule_text",
    "start_time",
    "location",
    "description",
    "is_fee_based",
)
REQUIRED_MANUAL_REVIEW_FIELDS = ("reviewer", "reviewed_at", "notes")


def _field_value(field: Any) -> str:
    if not isinstance(field, dict):
        return ""
    value = field.get("value", field.get("text", ""))
    return value.strip() if isinstance(value, str) else ""


def _schedule_has_clock_time(value: Any) -> bool:
    return isinstance(value, str) and bool(re.search(r"\d{1,2}:\d{2}\s*(?:am|pm)", value, flags=re.I))


def validate_source_spans(field_name: str, spans: list[dict[str, Any]] | None) -> list[str]:
    if not spans:
        return [f"{field_name}:missing_source_span"]

    errors: list[str] = []
    for index, span in enumerate(spans):
        if not isinstance(span, dict):
            errors.append(f"{field_name}:invalid_source_span:{index}")
            continue
        if "page" not in span:
            errors.append(f"{field_name}:span_missing_page:{index}")
        if not any(key in span for key in ("line", "line_no", "bbox", "word_range")):
            errors.append(f"{field_name}:span_missing_locator:{index}")
    return errors


def validate_claims(record: dict[str, Any]) -> ValidationResult:
    result = ValidationResult()
    claims = record.get("claims") or []

    for claim in claims:
        if not isinstance(claim, dict):
            result.error("claim:invalid")
            continue
        kind = str(claim.get("kind", "")).strip()
        value = str(claim.get("value", "")).strip()
        evidence = claim.get("evidence") or []
        if value and value.lower() not in {"unknown", "not_applicable"} and not evidence:
            result.error(f"{kind or 'claim'}:missing_evidence")

    return result


def validate_public_record(record: dict[str, Any]) -> ValidationResult:
    result = ValidationResult()

    slug = record.get("slug")
    if not isinstance(slug, str) or not slug.strip():
        result.error("slug:missing")

    for field_name in REQUIRED_PUBLIC_FIELDS:
        field = record.get(field_name)
        if not isinstance(field, dict) or not _field_value(field):
            result.error(f"{field_name}:missing")
            continue

    for field_name in SOURCE_DERIVED_FIELDS:
        field = record.get(field_name)
        if not isinstance(field, dict) or not _field_value(field):
            continue
        for error in validate_source_spans(field_name, field.get("spans")):
            result.error(error)

    result.merge(validate_claims(record))
    return result


def validate_golden_fixture(path: Path) -> ValidationResult:
    result = ValidationResult()
    fixture = json.loads(path.read_text())

    source_kind = str(fixture.get("source_kind", "pdf"))
    if source_kind == "official_web":
        source_path = Path(str(fixture.get("source_web_snapshot", "")))
        expected_hash = str(fixture.get("source_web_sha256", ""))
        if not source_path.exists():
            result.error("fixture:source_web_snapshot_missing")
        elif web_snapshot_file_content_hash(source_path) != expected_hash:
            result.error("fixture:source_web_hash_mismatch")
        if not str(fixture.get("source_url", "")).strip():
            result.error("fixture:source_url_missing")
        detail_pages = fixture.get("source_detail_pages")
        if detail_pages is not None:
            if not isinstance(detail_pages, list):
                result.error("fixture:source_detail_pages_invalid")
            else:
                for index, detail_page in enumerate(detail_pages):
                    if not isinstance(detail_page, dict):
                        result.error(f"fixture:source_detail_page_invalid:{index}")
                        continue
                    slug = str(detail_page.get("slug") or index)
                    detail_path = Path(str(detail_page.get("source_web_snapshot", "")))
                    detail_hash = str(detail_page.get("source_web_sha256", ""))
                    if not str(detail_page.get("source_url", "")).strip():
                        result.error(f"fixture:source_detail_page_url_missing:{slug}")
                    if not detail_path.exists():
                        result.error(f"fixture:source_detail_page_snapshot_missing:{slug}")
                    elif web_snapshot_file_content_hash(detail_path) != detail_hash:
                        result.error(f"fixture:source_detail_page_hash_mismatch:{slug}")
    else:
        source_pdf = Path(str(fixture.get("source_pdf", "")))
        expected_hash = str(fixture.get("source_pdf_sha256", ""))
        if not source_pdf.exists():
            result.error("fixture:source_pdf_missing")
        elif hashlib.sha256(source_pdf.read_bytes()).hexdigest() != expected_hash:
            result.error("fixture:source_pdf_hash_mismatch")

    expected_records = fixture.get("expected_records")
    if isinstance(expected_records, list):
        has_known_non_public_records = bool(
            fixture.get("expected_quarantine_records")
            or fixture.get("expected_unextractable_records")
            or fixture.get("reviewed_manual_records")
        )
        if not expected_records and not has_known_non_public_records:
            result.error("fixture:expected_records_empty")
        for record_index, expected in enumerate(expected_records):
            if not isinstance(expected, dict):
                result.error(f"fixture:expected_record_invalid:{record_index}")
                continue
            for field_name in REQUIRED_FULL_FIXTURE_RECORD_FIELDS:
                if field_name not in expected:
                    result.error(f"fixture:expected_record_missing:{record_index}:{field_name}")
                elif (
                    field_name == "start_time"
                    and expected[field_name] is None
                    and not _schedule_has_clock_time(expected.get("schedule_text"))
                ):
                    continue
                elif field_name not in {"is_fee_based", "description"} and expected[field_name] is None:
                    result.error(f"fixture:expected_record_blank:{record_index}:{field_name}")
                elif field_name not in {"is_fee_based", "description"} and not str(expected[field_name]).strip():
                    result.error(f"fixture:expected_record_blank:{record_index}:{field_name}")

            required_spans = expected.get("required_spans")
            if not isinstance(required_spans, dict):
                result.error(f"fixture:required_spans_missing:{record_index}")
                continue
            for field_name in ("title", "location", "schedule"):
                for error in validate_source_spans(field_name, required_spans.get(field_name)):
                    result.error(f"fixture:{record_index}:{error}")
            if str(expected.get("description", "")).strip():
                for error in validate_source_spans("description", required_spans.get("description")):
                    result.error(f"fixture:{record_index}:{error}")
            if expected.get("movie_nights"):
                for error in validate_source_spans("movie_nights", required_spans.get("movie_nights")):
                    result.error(f"fixture:{record_index}:{error}")

        expected_quarantine_records = fixture.get("expected_quarantine_records")
        if expected_quarantine_records is not None:
            if not isinstance(expected_quarantine_records, list):
                result.error("fixture:expected_quarantine_records_invalid")
            else:
                for record_index, expected in enumerate(expected_quarantine_records):
                    if not isinstance(expected, dict):
                        result.error(f"fixture:expected_quarantine_record_invalid:{record_index}")
                        continue
                    for field_name in ("title", "slug"):
                        if field_name not in expected:
                            result.error(
                                f"fixture:expected_quarantine_record_missing:{record_index}:{field_name}"
                            )
                        elif not str(expected[field_name]).strip():
                            result.error(
                                f"fixture:expected_quarantine_record_blank:{record_index}:{field_name}"
                            )
                    warnings = expected.get("warnings")
                    if not isinstance(warnings, list) or not warnings:
                        result.error(f"fixture:expected_quarantine_warnings_missing:{record_index}")

                    required_spans = expected.get("required_spans")
                    if not isinstance(required_spans, dict):
                        result.error(f"fixture:expected_quarantine_required_spans_missing:{record_index}")
                        continue
                    for error in validate_source_spans("title", required_spans.get("title")):
                        result.error(f"fixture:expected_quarantine:{record_index}:{error}")

        expected_unextractable_records = fixture.get("expected_unextractable_records")
        if expected_unextractable_records is not None:
            if not isinstance(expected_unextractable_records, list):
                result.error("fixture:expected_unextractable_records_invalid")
            else:
                for record_index, expected in enumerate(expected_unextractable_records):
                    if not isinstance(expected, dict):
                        result.error(f"fixture:expected_unextractable_record_invalid:{record_index}")
                        continue
                    for field_name in ("title", "slug", "reason"):
                        if field_name not in expected:
                            result.error(
                                f"fixture:expected_unextractable_record_missing:{record_index}:{field_name}"
                            )
                        elif not str(expected[field_name]).strip():
                            result.error(
                                f"fixture:expected_unextractable_record_blank:{record_index}:{field_name}"
                            )

                    required_spans = expected.get("required_spans")
                    if not isinstance(required_spans, dict):
                        result.error(f"fixture:expected_unextractable_required_spans_missing:{record_index}")
                        continue
                    for error in validate_source_spans("title", required_spans.get("title")):
                        result.error(f"fixture:expected_unextractable:{record_index}:{error}")

        reviewed_manual_records = fixture.get("reviewed_manual_records")
        if reviewed_manual_records is not None:
            if not isinstance(reviewed_manual_records, list):
                result.error("fixture:reviewed_manual_records_invalid")
            else:
                for record_index, expected in enumerate(reviewed_manual_records):
                    if not isinstance(expected, dict):
                        result.error(f"fixture:reviewed_manual_record_invalid:{record_index}")
                        continue
                    for field_name in REQUIRED_FULL_FIXTURE_RECORD_FIELDS:
                        if field_name not in expected:
                            result.error(f"fixture:reviewed_manual_record_missing:{record_index}:{field_name}")
                        elif (
                            field_name == "start_time"
                            and expected[field_name] is None
                            and not _schedule_has_clock_time(expected.get("schedule_text"))
                        ):
                            continue
                        elif field_name not in {"is_fee_based", "description"} and expected[field_name] is None:
                            result.error(f"fixture:reviewed_manual_record_blank:{record_index}:{field_name}")
                        elif field_name not in {"is_fee_based", "description"} and not str(expected[field_name]).strip():
                            result.error(f"fixture:reviewed_manual_record_blank:{record_index}:{field_name}")

                    manual_review = expected.get("manual_review")
                    if not isinstance(manual_review, dict):
                        result.error(f"fixture:reviewed_manual_record_review_missing:{record_index}")
                    else:
                        for field_name in REQUIRED_MANUAL_REVIEW_FIELDS:
                            if not str(manual_review.get(field_name, "")).strip():
                                result.error(
                                    f"fixture:reviewed_manual_record_review_missing:{record_index}:{field_name}"
                                )

                    required_spans = expected.get("required_spans")
                    if not isinstance(required_spans, dict):
                        result.error(f"fixture:reviewed_manual_required_spans_missing:{record_index}")
                        continue
                    for field_name in ("title", "location", "schedule"):
                        for error in validate_source_spans(field_name, required_spans.get(field_name)):
                            result.error(f"fixture:reviewed_manual:{record_index}:{error}")
                    if str(expected.get("description", "")).strip():
                        for error in validate_source_spans("description", required_spans.get("description")):
                            result.error(f"fixture:reviewed_manual:{record_index}:{error}")
    else:
        expected = fixture.get("expected")
        if not isinstance(expected, dict):
            result.error("fixture:expected_missing")
        else:
            for field_name in REQUIRED_FIXTURE_EXPECTED_FIELDS:
                if field_name not in expected:
                    result.error(f"fixture:expected_missing:{field_name}")
                elif field_name != "is_fee_based" and not str(expected[field_name]).strip():
                    result.error(f"fixture:expected_blank:{field_name}")

        required_spans = fixture.get("required_spans")
        if not isinstance(required_spans, dict):
            result.error("fixture:required_spans_missing")
        else:
            for field_name in ("title", "location", "schedule", "description"):
                for error in validate_source_spans(field_name, required_spans.get(field_name)):
                    result.error(f"fixture:{error}")

    return result
