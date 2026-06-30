"""Compare v2 Gold output with v3 preview output before cutover."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
    from normalization_v3 import normalize_location_text
    from source_manifest import edition_matches_quarter
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR
    from .normalization_v3 import normalize_location_text
    from .source_manifest import edition_matches_quarter


DEFAULT_OUTPUT = PROCESSED_DIR / "eval" / "v3_dual_run_report.json"
CRITICAL_FIELDS = ("title", "schedule", "location", "price")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _rows_from_preview(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, dict) and isinstance(value.get("rows"), list):
        return [row for row in value["rows"] if isinstance(row, dict)]
    if isinstance(value, list):
        return [row for row in value if isinstance(row, dict)]
    return []


def _json_list_from_file(path: Path | None) -> list[dict[str, Any]]:
    if path is None or not path.exists():
        return []
    payload = json.loads(path.read_text())
    if isinstance(payload, dict) and isinstance(payload.get("rows"), list):
        return [row for row in payload["rows"] if isinstance(row, dict)]
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    return []


def _review_records_from_file(path: Path | None, field_name: str) -> list[dict[str, Any]]:
    if path is None or not path.exists():
        return []
    payload = json.loads(path.read_text())
    values = payload.get(field_name) if isinstance(payload, dict) else None
    if not isinstance(values, list):
        return []
    return [value for value in values if isinstance(value, dict)]


def _reviewed_diff_reviews_from_file(path: Path | None) -> list[dict[str, Any]]:
    return _review_records_from_file(path, "reviewed_diff_reviews")


def _reviewed_status_transition_reviews_from_file(path: Path | None) -> list[dict[str, Any]]:
    return _review_records_from_file(path, "reviewed_status_transition_reviews")


def _reviewed_new_record_reviews_from_file(path: Path | None) -> list[dict[str, Any]]:
    return _review_records_from_file(path, "reviewed_new_record_reviews")


def _reviewed_missing_v2_record_reviews_from_file(path: Path | None) -> list[dict[str, Any]]:
    return _review_records_from_file(path, "reviewed_missing_v2_record_reviews")


def _slug(row: dict[str, Any]) -> str:
    return str(row.get("canonical_slug") or row.get("activity_slug") or row.get("slug") or "")


def _calendar_group(row: dict[str, Any]) -> str:
    return str(row.get("calendar_group_key") or "")


def _row_key(row: dict[str, Any]) -> str:
    return f"{_calendar_group(row)}:{_slug(row)}"


def _field_value(row: dict[str, Any], field: str) -> Any:
    if field == "schedule":
        schedule = row.get("schedule") if isinstance(row.get("schedule"), dict) else {}
        return schedule.get("text") or row.get("schedule_raw") or row.get("schedule_text")
    if field == "location":
        location = row.get("location") if isinstance(row.get("location"), dict) else {}
        return location.get("label") or location.get("value") or row.get("location_text")
    if field == "price":
        price = row.get("price") if isinstance(row.get("price"), dict) else {}
        return price.get("state") if price else row.get("fee_required")
    return row.get(field)


def _field_evidence(row: dict[str, Any], field: str) -> dict[str, Any] | None:
    evidence = row.get("field_evidence") if isinstance(row.get("field_evidence"), dict) else {}
    if isinstance(evidence.get(field), dict):
        return evidence[field]
    if field == "price" and isinstance(evidence.get("fee"), dict):
        return evidence["fee"]
    return None


def _repair_ocr_time_text(value: str) -> str:
    repaired = re.sub(r"(?<=\d:)O(?=\d)", "0", value, flags=re.IGNORECASE)
    repaired = re.sub(r"(?<=\d:\d)O(?=\s*[ap]\.?m\.?)", "0", repaired, flags=re.IGNORECASE)
    return repaired


def _normalize(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _normalize_for_field(field: str, value: Any) -> str:
    text = str(value or "").replace("’", "'").replace("–", "-").replace("—", "-")
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    if field == "schedule":
        text = _repair_ocr_time_text(text)
        text = re.sub(r"^\s*[-|]+\s*", "", text)
        text = re.sub(r"(?i)^\s*unday\b", "Sunday", text)
    if field == "title":
        text = re.sub(r"\s*\(\$\)\s*", " ", text)
    normalized = _normalize(text)
    if field == "location":
        normalized = normalized.replace("'", "")
    return normalized


def _location_comparison_key(value: Any) -> str:
    normalized = normalize_location_text(value)
    location_id = str(normalized.get("location_id") or "")
    if location_id and location_id != "unknown":
        return f"id:{location_id}"
    return f"text:{_normalize_for_field('location', value)}"


def _time_only_schedule_key(value: Any) -> str:
    text = _repair_ocr_time_text(str(value or ""))
    text = text.replace(".", "")
    if not re.match(r"^\s*\d{1,2}:\d{2}\s*[ap]m\s*$", text, flags=re.IGNORECASE):
        return ""
    return re.sub(r"\s+", "", text).lower()


def _legacy_location_time_schedule_equivalent(
    v2_row: dict[str, Any],
    v3_row: dict[str, Any],
    v2_value: Any,
    v3_value: Any,
) -> bool:
    v2_text = str(v2_value or "")
    if "|" not in v2_text:
        return False
    v2_location_text, v2_schedule_text = [part.strip() for part in v2_text.rsplit("|", 1)]
    if not v2_location_text or not v2_schedule_text:
        return False
    if _location_comparison_key(v2_location_text) != _location_comparison_key(_field_value(v3_row, "location")):
        return False
    return bool(_time_only_schedule_key(v2_schedule_text)) and (
        _time_only_schedule_key(v2_schedule_text) == _time_only_schedule_key(v3_value)
    )


def _legacy_unknown_price_equivalent(v2_value: Any, v3_value: Any) -> bool:
    legacy_value = _normalize_for_field("price", v2_value)
    current_value = _normalize_for_field("price", v3_value)
    return legacy_value in {"", "unknown", "none"} and current_value in {"free", "fee"}


def _fields_equivalent(
    field: str,
    v2_row: dict[str, Any],
    v3_row: dict[str, Any],
    v2_value: Any,
    v3_value: Any,
) -> bool:
    if _normalize_for_field(field, v2_value) == _normalize_for_field(field, v3_value):
        return True
    if field == "location":
        return _location_comparison_key(v2_value) == _location_comparison_key(v3_value)
    if field == "schedule":
        return _legacy_location_time_schedule_equivalent(v2_row, v3_row, v2_value, v3_value)
    if field == "price":
        return _legacy_unknown_price_equivalent(v2_value, v3_value)
    return False


def _title_words(value: Any) -> list[str]:
    normalized = _normalize_for_field("title", value)
    return re.findall(r"[a-z0-9]+", normalized)


def _orphan_titles_related(v2_title: Any, v3_title: Any) -> bool:
    v2_words = _title_words(v2_title)
    v3_words = _title_words(v3_title)
    if not v2_words or not v3_words:
        return False
    shorter, longer = (v2_words, v3_words) if len(v2_words) <= len(v3_words) else (v3_words, v2_words)
    if len(shorter) < 2:
        return False
    return longer[-len(shorter):] == shorter


def _orphan_locations_related(v2_location: Any, v3_location: Any) -> bool:
    if _location_comparison_key(v2_location) == _location_comparison_key(v3_location):
        return True
    v2_words = re.findall(r"[a-z0-9]+", _normalize_for_field("location", v2_location))
    v3_words = re.findall(r"[a-z0-9]+", _normalize_for_field("location", v3_location))
    if not v2_words or not v3_words:
        return False
    shorter, longer = (v2_words, v3_words) if len(v2_words) <= len(v3_words) else (v3_words, v2_words)
    if len(shorter) < 2:
        return False
    return longer[-len(shorter):] == shorter


def _orphan_rows_equivalent(v2_row: dict[str, Any], v3_row: dict[str, Any]) -> bool:
    if _calendar_group(v2_row) != _calendar_group(v3_row):
        return False
    if not _orphan_titles_related(_field_value(v2_row, "title"), _field_value(v3_row, "title")):
        return False
    if not _fields_equivalent("schedule", v2_row, v3_row, _field_value(v2_row, "schedule"), _field_value(v3_row, "schedule")):
        return False
    if not _fields_equivalent("price", v2_row, v3_row, _field_value(v2_row, "price"), _field_value(v3_row, "price")):
        return False
    return _orphan_locations_related(_field_value(v2_row, "location"), _field_value(v3_row, "location"))


def _rekey_unique_orphan_matches(
    *,
    v2_by_key: dict[str, dict[str, Any]],
    v3_by_key: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    direct_common = set(v2_by_key) & set(v3_by_key)
    missing_keys = sorted(set(v2_by_key) - direct_common)
    new_keys = sorted(set(v3_by_key) - direct_common)
    candidate_pairs: list[tuple[str, str]] = []
    for v2_key in missing_keys:
        for v3_key in new_keys:
            if _orphan_rows_equivalent(v2_by_key[v2_key], v3_by_key[v3_key]):
                candidate_pairs.append((v2_key, v3_key))
    v2_counts: dict[str, int] = {}
    v3_counts: dict[str, int] = {}
    for v2_key, v3_key in candidate_pairs:
        v2_counts[v2_key] = v2_counts.get(v2_key, 0) + 1
        v3_counts[v3_key] = v3_counts.get(v3_key, 0) + 1
    rekeyed = dict(v3_by_key)
    for v2_key, v3_key in candidate_pairs:
        if v2_counts[v2_key] != 1 or v3_counts[v3_key] != 1:
            continue
        rekeyed[v2_key] = rekeyed.pop(v3_key)
    return rekeyed


def _title(row: dict[str, Any]) -> str:
    return str(row.get("title") or row.get("normalized_title") or _slug(row))


def _not_publishable(row: dict[str, Any]) -> bool:
    status = str(row.get("validation_status") or "")
    if status and status not in {"auto_publishable", "manually_approved"}:
        return True
    return False


def _validation_status(row: dict[str, Any]) -> str:
    return str(row.get("validation_status") or row.get("status") or "").strip()


def _evidence_fingerprint(row: dict[str, Any]) -> dict[str, Any]:
    evidence = row.get("field_evidence")
    if not isinstance(evidence, dict):
        return {}
    fingerprint: dict[str, Any] = {}
    for field_name in sorted(evidence):
        field_evidence = evidence.get(field_name)
        if not isinstance(field_evidence, dict):
            continue
        source = field_evidence.get("source")
        if not isinstance(source, dict):
            continue
        fingerprint[field_name] = {
            "content_sha256": source.get("content_sha256"),
            "page_image_sha256": source.get("page_image_sha256"),
            "crop_sha256": source.get("crop_sha256"),
            "bbox_px": source.get("bbox_px"),
        }
    return fingerprint


def _first_content_hash_from_fingerprint(fingerprint: dict[str, Any]) -> str:
    for field_name in sorted(fingerprint):
        field = fingerprint.get(field_name)
        if not isinstance(field, dict):
            continue
        value = str(field.get("content_sha256") or "").strip()
        if value:
            return value
    return ""


def _row_content_hash(row: dict[str, Any]) -> str:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    for value in (row.get("content_sha256"), row.get("source_sha256"), source.get("documentHash")):
        text = str(value or "").strip()
        if text:
            return text
    return _first_content_hash_from_fingerprint(_evidence_fingerprint(row))


def _first_v2_field_provenance(row: dict[str, Any]) -> dict[str, Any]:
    provenance = row.get("field_provenance") if isinstance(row.get("field_provenance"), dict) else {}
    for field_name in ("title", "schedule", "location", "price"):
        values = provenance.get(field_name)
        if not isinstance(values, list):
            continue
        for value in values:
            if isinstance(value, dict):
                return value
    return {}


def _v2_page_image_path(row: dict[str, Any]) -> str | None:
    source_hash = _row_content_hash(row)
    provenance = _first_v2_field_provenance(row)
    page = provenance.get("page")
    try:
        page_number = int(page)
    except (TypeError, ValueError):
        page_number = 1
    if not source_hash:
        return None
    canonical_page_image = PROCESSED_DIR / "page_images" / source_hash / f"page_{page_number:03d}.png"
    if canonical_page_image.exists():
        return str(canonical_page_image)
    return str(PROCESSED_DIR / "pdf_page_images" / f"{source_hash}-page-{page_number:03d}.png")


def _preview_fingerprint(rows: list[dict[str, Any]]) -> str:
    row_fingerprints = []
    for row in rows:
        row_fingerprints.append(
            {
                "row_key": _row_key(row),
                "validation_status": _validation_status(row),
                "source_hash": _row_content_hash(row),
                "critical_fields": {
                    field_name: _field_value(row, field_name)
                    for field_name in CRITICAL_FIELDS
                },
                "movie_title": row.get("movie_title") or row.get("normalized_movie_title"),
                "field_evidence": _evidence_fingerprint(row),
            }
        )
    payload = json.dumps(sorted(row_fingerprints, key=lambda item: item["row_key"]), sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _review_records_by_key(records: list[dict[str, Any]] | None) -> dict[str, dict[str, Any]]:
    by_key: dict[str, dict[str, Any]] = {}
    for record in records or []:
        key = str(record.get("key") or "").strip()
        if key and key not in by_key:
            by_key[key] = record
    return by_key


def _review_record_matches_hash(record: dict[str, Any] | None, content_sha256: str) -> bool:
    if not isinstance(record, dict):
        return False
    return bool(content_sha256) and str(record.get("content_sha256") or "").strip() == content_sha256


def _status_transition_key(row_key: str) -> str:
    return f"{row_key}:needs_review_to_auto_publishable"


def _source_id(row: dict[str, Any]) -> str:
    return str(
        row.get("source_document_id") or row.get("source_id") or row.get("id") or row.get("document_id") or ""
    ).strip()


def _source_hash(row: dict[str, Any]) -> str:
    return str(row.get("content_sha256") or row.get("source_sha256") or row.get("documentHash") or "").strip()


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


def _is_v3_visual_source(row: dict[str, Any]) -> bool:
    if str(row.get("currentness") or "current") != "current":
        return False
    source_type = str(row.get("source_type") or "").strip().lower()
    source_kind = str(row.get("source_kind") or "").strip()
    source_role = str(row.get("source_role") or "").strip()
    if not source_type and not source_kind and not source_role:
        return True
    return source_role in {"resort_pdf", "supporting_price_image"} and source_type in {"pdf", "image"} and source_kind in {
        "official_pdf",
        "official_image",
    }


def _source_matches_quarter(row: dict[str, Any], quarter: str | None) -> bool:
    if not quarter:
        return True
    edition = _source_edition(row)
    if not edition:
        return True
    return edition_matches_quarter(edition, quarter)


def _filter_expected_v3_sources(
    expected_sources: list[dict[str, Any]] | None,
    *,
    quarter: str | None = None,
) -> list[dict[str, Any]]:
    sources = [source for source in expected_sources or [] if _is_v3_visual_source(source)]
    if quarter:
        sources = [source for source in sources if _source_matches_quarter(source, quarter)]
    return sources


def _expected_v3_source_hashes(
    expected_sources: list[dict[str, Any]] | None,
    *,
    quarter: str | None = None,
) -> set[str]:
    return {
        source_hash
        for source in _filter_expected_v3_sources(expected_sources, quarter=quarter)
        if (source_hash := _source_hash(source))
    }


def _v2_comparable_rows(
    rows: list[dict[str, Any]],
    *,
    expected_sources: list[dict[str, Any]] | None = None,
    quarter: str | None = None,
) -> list[dict[str, Any]]:
    expected_hashes = _expected_v3_source_hashes(expected_sources, quarter=quarter)
    if not expected_hashes:
        return rows
    return [row for row in rows if _row_content_hash(row) in expected_hashes]


def _source_coverage(
    expected_sources: list[dict[str, Any]] | None,
    v3_source_statuses: list[dict[str, Any]] | None,
    review_tasks: list[dict[str, Any]] | None = None,
    quarter: str | None = None,
) -> dict[str, Any]:
    expected_sources = _filter_expected_v3_sources(expected_sources, quarter=quarter)
    expected_ids = sorted({_source_id(source) for source in expected_sources or [] if _source_id(source)})
    statuses_by_id = {
        _source_id(status): status
        for status in v3_source_statuses or []
        if _source_id(status)
    }
    statuses_by_hash = {
        _source_hash(status): status
        for status in v3_source_statuses or []
        if _source_hash(status)
    }
    expected_by_id = {
        _source_id(source): source
        for source in expected_sources or []
        if _source_id(source)
    }
    def status_for_expected(source_id: str) -> dict[str, Any]:
        expected_source = expected_by_id.get(source_id, {})
        return statuses_by_id.get(source_id) or statuses_by_hash.get(_source_hash(expected_source)) or {}

    stale_source_status_ids = sorted(
        source_id
        for source_id in expected_ids
        if (
            (expected_source := expected_by_id.get(source_id, {}))
            and _source_hash(expected_source)
            and source_id in statuses_by_id
            and _source_hash(statuses_by_id[source_id]) != _source_hash(expected_source)
        )
    )
    stale_source_status_config_ids = sorted(
        source_id
        for source_id in expected_ids
        if (
            source_id in statuses_by_id
            and str(statuses_by_id[source_id].get("message") or "") == "stale_v3_snapshot_config_hash"
        )
    )
    stale_source_status_pipeline_ids = sorted(
        source_id
        for source_id in expected_ids
        if (
            source_id in statuses_by_id
            and str(statuses_by_id[source_id].get("message") or "") == "stale_v3_snapshot_pipeline_version"
        )
    )
    stale_id_set = set(stale_source_status_ids)
    processed_ids = sorted(
        source_id for source_id in expected_ids
        if source_id not in stale_id_set and str(status_for_expected(source_id).get("status") or "") == "processed"
    )
    source_error_ids = sorted(
        source_id for source_id in expected_ids
        if source_id not in stale_id_set and str(status_for_expected(source_id).get("status") or "") == "source_error"
    )
    parser_error_ids = sorted(
        source_id for source_id in expected_ids
        if source_id not in stale_id_set and str(status_for_expected(source_id).get("status") or "") == "parser_error"
    )
    handled = set(processed_ids) | set(source_error_ids) | set(parser_error_ids)
    unprocessed_ids = sorted(source_id for source_id in expected_ids if source_id not in handled)
    expected_id_set = set(expected_ids)
    expected_parser_error_ids = [source_id for source_id in parser_error_ids if source_id in expected_id_set]
    expected_source_error_ids = [source_id for source_id in source_error_ids if source_id in expected_id_set]

    def without_review_task(source_ids: list[str], task_type: str) -> list[str]:
        missing: list[str] = []
        for source_id in source_ids:
            status_hash = _source_hash(status_for_expected(source_id))
            matching_review_task = False
            for task in review_tasks or []:
                if _source_id(task) != source_id and (not status_hash or _source_hash(task) != status_hash):
                    continue
                if str(task.get("task_type") or "") != task_type:
                    continue
                task_hash = _source_hash(task)
                if status_hash and task_hash != status_hash:
                    continue
                matching_review_task = True
                break
            if not matching_review_task:
                missing.append(source_id)
        return missing

    parser_error_without_review_task_ids = without_review_task(expected_parser_error_ids, "parser_error")
    source_error_without_review_task_ids = without_review_task(expected_source_error_ids, "source_error")
    return {
        "expected_source_count": len(expected_ids),
        "expected_source_hashes": sorted(
            {
                _source_hash(source)
                for source in expected_sources
                if _source_hash(source)
            }
        ),
        "processed_source_count": len([source_id for source_id in expected_ids if source_id in set(processed_ids)]),
        "source_error_count": len([source_id for source_id in expected_ids if source_id in set(source_error_ids)]),
        "unprocessed_source_ids": unprocessed_ids,
        "source_error_ids": [source_id for source_id in source_error_ids if source_id in set(expected_ids)],
        "parser_error_ids": expected_parser_error_ids,
        "stale_source_status_ids": stale_source_status_ids,
        "stale_source_status_config_ids": stale_source_status_config_ids,
        "stale_source_status_pipeline_ids": stale_source_status_pipeline_ids,
        "parser_error_without_review_task_ids": parser_error_without_review_task_ids,
        "source_error_without_review_task_ids": source_error_without_review_task_ids,
    }


def build_dual_run_report(
    *,
    v2_rows: list[dict[str, Any]],
    v3_preview: dict[str, Any] | list[dict[str, Any]],
    reviewed_diff_keys: list[str] | None = None,
    reviewed_diff_reviews: list[dict[str, Any]] | None = None,
    reviewed_new_record_reviews: list[dict[str, Any]] | None = None,
    reviewed_missing_v2_record_reviews: list[dict[str, Any]] | None = None,
    previous_v3_rows: list[dict[str, Any]] | None = None,
    reviewed_status_transition_keys: list[str] | None = None,
    reviewed_status_transition_reviews: list[dict[str, Any]] | None = None,
    expected_sources: list[dict[str, Any]] | None = None,
    v3_source_statuses: list[dict[str, Any]] | None = None,
    review_tasks: list[dict[str, Any]] | None = None,
    quarter: str | None = None,
) -> dict[str, Any]:
    v3_rows = _v2_comparable_rows(_rows_from_preview(v3_preview), expected_sources=expected_sources, quarter=quarter)
    comparable_v2_rows = _v2_comparable_rows(v2_rows, expected_sources=expected_sources, quarter=quarter)
    reviewed_diff_reviews_by_key = _review_records_by_key(reviewed_diff_reviews)
    reviewed_new_record_reviews_by_key = _review_records_by_key(reviewed_new_record_reviews)
    reviewed_missing_v2_record_reviews_by_key = _review_records_by_key(reviewed_missing_v2_record_reviews)
    reviewed_status_transition_reviews_by_key = _review_records_by_key(reviewed_status_transition_reviews)
    v2_by_key = {_row_key(row): row for row in comparable_v2_rows if _row_key(row)}
    v3_by_key = {_row_key(row): row for row in v3_rows if _row_key(row)}
    v3_by_key = _rekey_unique_orphan_matches(v2_by_key=v2_by_key, v3_by_key=v3_by_key)
    previous_v3_by_key = {_row_key(row): row for row in previous_v3_rows or [] if _row_key(row)}

    new_keys = sorted(set(v3_by_key) - set(v2_by_key))
    missing_keys = sorted(set(v2_by_key) - set(v3_by_key))
    common_keys = sorted(set(v2_by_key) & set(v3_by_key))
    new_review_keys = {key: f"{key}:new_record" for key in new_keys}
    missing_review_keys = {key: f"{key}:missing_v2_record" for key in missing_keys}
    new_v3_records: list[dict[str, Any]] = []
    for key in new_keys:
        row = v3_by_key[key]
        review_key = new_review_keys[key]
        content_hash = _row_content_hash(row)
        reviewed_new_record = _review_record_matches_hash(
            reviewed_new_record_reviews_by_key.get(review_key),
            content_hash,
        )
        new_v3_records.append(
            {
                "review_key": review_key,
                "row_key": key,
                "canonical_slug": _slug(row),
                "calendar_group_key": _calendar_group(row),
                "title": row.get("title"),
                "content_sha256": content_hash or None,
                "source_document_id": _source_id(row) or None,
                "v3_field_evidence": row.get("field_evidence") if isinstance(row.get("field_evidence"), dict) else {},
                "reviewed": reviewed_new_record,
            }
        )
    unreviewed_new_keys = [
        record["row_key"] for record in new_v3_records if not record.get("reviewed")
    ]
    missing_v2_records: list[dict[str, Any]] = []
    for key in missing_keys:
        row = v2_by_key[key]
        source_hash = _row_content_hash(row)
        provenance = _first_v2_field_provenance(row)
        review_key = missing_review_keys[key]
        reviewed_missing_record = _review_record_matches_hash(
            reviewed_missing_v2_record_reviews_by_key.get(review_key),
            source_hash,
        )
        missing_v2_records.append(
            {
                "review_key": review_key,
                "row_key": key,
                "canonical_slug": _slug(row),
                "calendar_group_key": _calendar_group(row),
                "title": row.get("title"),
                "content_sha256": source_hash or None,
                "source_url": row.get("source_url") or (row.get("source") or {}).get("url"),
                "source_pdf_edition": row.get("source_pdf_edition") or (row.get("source") or {}).get("edition"),
                "page_number": provenance.get("page") or 1,
                "page_image_path": _v2_page_image_path(row),
                "field_bbox": provenance.get("bbox"),
                "v2_value": {
                    "title": _field_value(row, "title"),
                    "schedule": _field_value(row, "schedule"),
                    "location": _field_value(row, "location"),
                    "price": _field_value(row, "price"),
                },
                "reviewed": reviewed_missing_record,
            }
        )
    unreviewed_missing_v2_keys = [
        record["row_key"] for record in missing_v2_records if not record.get("reviewed")
    ]

    field_diffs: list[dict[str, Any]] = []
    for key in common_keys:
        v2_row = v2_by_key[key]
        v3_row = v3_by_key[key]
        for field in CRITICAL_FIELDS:
            v2_value = _field_value(v2_row, field)
            v3_value = _field_value(v3_row, field)
            if _fields_equivalent(field, v2_row, v3_row, v2_value, v3_value):
                continue
            diff_key = f"{key}:{field}"
            v3_field_evidence = _field_evidence(v3_row, field)
            v3_source = v3_field_evidence.get("source") if isinstance(v3_field_evidence, dict) else {}
            v3_content_hash = str(v3_source.get("content_sha256") or "").strip() if isinstance(v3_source, dict) else ""
            reviewed_diff = _review_record_matches_hash(
                reviewed_diff_reviews_by_key.get(diff_key),
                v3_content_hash,
            )
            field_diffs.append(
                {
                    "diff_key": diff_key,
                    "review_key": diff_key,
                    "row_key": key,
                    "canonical_slug": _slug(v3_row) or _slug(v2_row),
                    "calendar_group_key": _calendar_group(v3_row) or _calendar_group(v2_row),
                    "field": field,
                    "v2_value": v2_value,
                    "v3_value": v3_value,
                    "reviewed": reviewed_diff,
                    "v3_field_evidence": v3_field_evidence,
                }
            )

    publish_blockers = [
        f"v3_candidate_not_publishable:{_slug(row)}"
        for row in v3_rows
        if _not_publishable(row)
    ]
    unreviewed_diff_keys = [
        diff["diff_key"] for diff in field_diffs if not diff["reviewed"]
    ]
    if unreviewed_diff_keys:
        publish_blockers.append("unreviewed_v2_v3_field_diffs")
    if unreviewed_new_keys:
        publish_blockers.append("unreviewed_new_v3_rows")
    if unreviewed_missing_v2_keys:
        publish_blockers.append("v3_missing_v2_rows")
    status_transitions: list[dict[str, Any]] = []
    for key in sorted(set(previous_v3_by_key) & set(v3_by_key)):
        previous_row = previous_v3_by_key[key]
        current_row = v3_by_key[key]
        if _validation_status(previous_row) != "needs_review" or _validation_status(current_row) != "auto_publishable":
            continue
        transition_key = _status_transition_key(key)
        previous_evidence = _evidence_fingerprint(previous_row)
        current_evidence = _evidence_fingerprint(current_row)
        evidence_changed = previous_evidence != current_evidence
        current_content_hash = _first_content_hash_from_fingerprint(current_evidence)
        reviewed_transition = _review_record_matches_hash(
            reviewed_status_transition_reviews_by_key.get(transition_key),
            current_content_hash,
        )
        status_transitions.append(
            {
                "transition_key": transition_key,
                "row_key": key,
                "canonical_slug": _slug(current_row) or _slug(previous_row),
                "calendar_group_key": _calendar_group(current_row) or _calendar_group(previous_row),
                "from_status": "needs_review",
                "to_status": "auto_publishable",
                "evidence_changed": evidence_changed,
                "reviewed": reviewed_transition,
                "content_sha256": current_content_hash or None,
            }
        )
    unreviewed_status_transition_keys = [
        transition["transition_key"]
        for transition in status_transitions
        if not transition["evidence_changed"] and not transition["reviewed"]
    ]
    if unreviewed_status_transition_keys:
        publish_blockers.append("unreviewed_v3_status_transitions")
    source_coverage = _source_coverage(
        expected_sources,
        v3_source_statuses,
        review_tasks=review_tasks,
        quarter=quarter,
    )
    if source_coverage["unprocessed_source_ids"]:
        publish_blockers.append("v3_unprocessed_sources")
    if source_coverage["stale_source_status_ids"]:
        publish_blockers.append("v3_stale_source_status_hash")
    if source_coverage["stale_source_status_config_ids"]:
        publish_blockers.append("v3_stale_source_status_config_hash")
    if source_coverage["stale_source_status_pipeline_ids"]:
        publish_blockers.append("v3_stale_source_status_pipeline_version")
    if source_coverage["parser_error_without_review_task_ids"]:
        publish_blockers.append("parser_error_without_review_task")
    if source_coverage["source_error_without_review_task_ids"]:
        publish_blockers.append("source_error_without_review_task")

    return {
        "report_version": "v3_dual_run_report_001",
        "generated_at": _now_iso(),
        "status": "blocked" if publish_blockers else "clean",
        "v2_count": len(v2_rows),
        "v2_compared_count": len(comparable_v2_rows),
        "v2_out_of_scope_count": len(v2_rows) - len(comparable_v2_rows),
        "v3_count": len(v3_rows),
        "v3_source_hashes": sorted(
            {
                source_hash
                for row in v3_rows
                if (source_hash := _row_content_hash(row))
            }
        ),
        "v3_preview_fingerprint": _preview_fingerprint(v3_rows),
        "new_in_v3": [_slug(v3_by_key[key]) for key in new_keys],
        "new_v3_review_keys": [new_review_keys[key] for key in new_keys],
        "new_v3_records": new_v3_records,
        "unreviewed_new_keys": unreviewed_new_keys,
        "reviewed_new_record_keys": [
            record["review_key"] for record in new_v3_records if record.get("reviewed")
        ],
        "missing_in_v3": [_slug(v2_by_key[key]) for key in missing_keys],
        "missing_v2_review_keys": [missing_review_keys[key] for key in missing_keys],
        "missing_v2_records": missing_v2_records,
        "unreviewed_missing_v2_keys": unreviewed_missing_v2_keys,
        "reviewed_missing_v2_record_keys": [
            record["review_key"] for record in missing_v2_records if record.get("reviewed")
        ],
        "field_diffs": field_diffs,
        "source_coverage": source_coverage,
        "status_transitions": status_transitions,
        "reviewed_status_transition_keys": sorted(
            {
                *[
                    transition["transition_key"]
                    for transition in status_transitions
                    if transition.get("reviewed")
                ],
            }
        ),
        "unreviewed_status_transition_keys": unreviewed_status_transition_keys,
        "reviewed_diff_keys": sorted(
            {
                *[diff["diff_key"] for diff in field_diffs if diff.get("reviewed")],
            }
        ),
        "unreviewed_diff_keys": unreviewed_diff_keys,
        "publish_blockers": list(dict.fromkeys(publish_blockers)),
        "manual_review_backlog": len(unreviewed_diff_keys)
        + len(unreviewed_new_keys)
        + len(unreviewed_missing_v2_keys)
        + len(unreviewed_status_transition_keys)
        + len(source_coverage["parser_error_without_review_task_ids"])
        + len(source_coverage["source_error_without_review_task_ids"])
        + sum(1 for row in v3_rows if _not_publishable(row)),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build v2/v3 dual-run diff report")
    parser.add_argument("--v2", type=Path, required=True)
    parser.add_argument("--v3", type=Path, required=True)
    parser.add_argument("--reviewed-diff-keys", nargs="*", default=[])
    parser.add_argument("--reviewed-diff-keys-file", type=Path)
    parser.add_argument("--previous-v3", type=Path)
    parser.add_argument("--reviewed-status-transition-keys", nargs="*", default=[])
    parser.add_argument("--reviewed-status-transition-keys-file", type=Path)
    parser.add_argument("--expected-sources", type=Path)
    parser.add_argument("--source-statuses", type=Path)
    parser.add_argument("--review-tasks", type=Path)
    parser.add_argument("--quarter")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    v2_payload = json.loads(args.v2.read_text())
    v3_payload = json.loads(args.v3.read_text())
    v2_rows = v2_payload if isinstance(v2_payload, list) else _rows_from_preview(v2_payload)
    report = build_dual_run_report(
        v2_rows=v2_rows,
        v3_preview=v3_payload,
        reviewed_diff_keys=[
            *args.reviewed_diff_keys,
        ],
        reviewed_diff_reviews=_reviewed_diff_reviews_from_file(args.reviewed_diff_keys_file),
        reviewed_new_record_reviews=_reviewed_new_record_reviews_from_file(args.reviewed_diff_keys_file),
        reviewed_missing_v2_record_reviews=_reviewed_missing_v2_record_reviews_from_file(args.reviewed_diff_keys_file),
        previous_v3_rows=_json_list_from_file(args.previous_v3),
        reviewed_status_transition_keys=[
            *args.reviewed_status_transition_keys,
        ],
        reviewed_status_transition_reviews=_reviewed_status_transition_reviews_from_file(
            args.reviewed_status_transition_keys_file
        ),
        expected_sources=_json_list_from_file(args.expected_sources),
        v3_source_statuses=_json_list_from_file(args.source_statuses),
        review_tasks=_json_list_from_file(args.review_tasks),
        quarter=args.quarter,
    )
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
