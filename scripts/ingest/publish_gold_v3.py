"""Guarded v3 publisher entrypoint.

By default this module only verifies the v3 preview and feature flag state.
It writes public tables only when invoked with the explicit --publish flag.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from typing import Any
import uuid
from urllib.parse import urlparse

try:
    from config import PROCESSED_DIR, ROOT
    from engine_agreement import evaluate_engine_agreement
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR, ROOT
    from .engine_agreement import evaluate_engine_agreement

try:
    from db import SupabaseClient
except ImportError:  # pragma: no cover - supports package-style imports
    try:
        from .db import SupabaseClient
    except ImportError:  # pragma: no cover
        SupabaseClient = None  # type: ignore[assignment]


DEFAULT_FLAGS_PATH = ROOT / "config" / "publish_flags.yaml"
DEFAULT_PREVIEW_PATH = PROCESSED_DIR / "activity_gold_v3_preview.json"
DEFAULT_DUAL_RUN_REPORT_PATH = PROCESSED_DIR / "eval" / "v3_dual_run_report.json"
DEFAULT_SOURCE_DRIFT_REPORT_PATH = PROCESSED_DIR / "source_drift_report.json"
DEFAULT_MONITORING_REPORT_PATH = PROCESSED_DIR / "source_trust_monitoring_report.json"
CRITICAL_FIELD_EVIDENCE = ("title", "schedule", "location", "fee")
MOVIE_CRITICAL_FIELD_EVIDENCE = ("movie_title",)
RAW_VALUE_MATCH_FIELDS = {"title", "schedule", "location", "movie_title"}
REQUIRED_OCR_ENGINE_NAMES = ("paddleocr_ppstructurev3", "rapidocr")
PROMOTABLE_ROW_STATUSES = {"auto_publishable", "manually_approved"}
ACTIVITY_CANDIDATE_CONFLICT = "candidate_id"
ACTIVITY_FIELD_PROVENANCE_CONFLICT = "candidate_id,field_name"


def _stable_uuid(key: str) -> str:
    return str(uuid.UUID(bytes=bytes.fromhex(hashlib.md5(key.encode()).hexdigest())))


def _db_category(row: dict[str, Any]) -> str:
    category = str(row.get("category") or "resort_activity")
    return {
        "character": "character_experience",
        "scavenger_hunt": "resort_activity",
        "sports_games": "resort_activity",
    }.get(category, category)


def _is_public_source_url(value: Any) -> bool:
    parsed = urlparse(str(value or "").strip())
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _list_flag(value: Any) -> list[str]:
    if value in {None, "", False}:
        return []
    if isinstance(value, list):
        raw_items = value
    else:
        raw = str(value).strip()
        if raw.startswith("[") and raw.endswith("]"):
            raw = raw[1:-1]
        raw_items = raw.split(",")
    return [str(item).strip() for item in raw_items if str(item).strip()]


def _parse_iso_datetime(value: Any) -> datetime | None:
    text = str(value or "").strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _field_page_hashes(row: dict[str, Any]) -> set[str]:
    evidence = row.get("field_evidence")
    if not isinstance(evidence, dict):
        return set()
    page_hashes: set[str] = set()
    for field_evidence in evidence.values():
        if not isinstance(field_evidence, dict):
            continue
        source = field_evidence.get("source")
        page_hash = source.get("page_image_sha256") if isinstance(source, dict) else None
        if page_hash:
            page_hashes.add(str(page_hash))
    return page_hashes


def _field_crop_hashes(row: dict[str, Any], *, field_names: set[str] | None = None) -> set[str]:
    evidence = row.get("field_evidence")
    if not isinstance(evidence, dict):
        return set()
    crop_hashes: set[str] = set()
    items = (
        ((field_name, evidence.get(field_name)) for field_name in field_names)
        if field_names is not None
        else evidence.items()
    )
    for _field_name, field_evidence in items:
        if not isinstance(field_evidence, dict):
            continue
        source = field_evidence.get("source")
        crop_hash = source.get("crop_sha256") if isinstance(source, dict) else None
        if crop_hash:
            crop_hashes.add(str(crop_hash))
    return crop_hashes


def _canonical_page_hashes(row: dict[str, Any]) -> set[str]:
    hashes: set[str] = set()
    canonical_hashes = row.get("canonical_page_image_sha256s")
    if isinstance(canonical_hashes, list):
        hashes.update(str(value) for value in canonical_hashes if str(value).strip())
    source_pages = row.get("source_pages")
    if isinstance(source_pages, list):
        for page in source_pages:
            if not isinstance(page, dict):
                continue
            for key in ("page_image_sha256", "canonical_image_sha256"):
                value = str(page.get(key) or "").strip()
                if value:
                    hashes.add(value)
    return hashes


def _critical_field_names(row: dict[str, Any]) -> tuple[str, ...]:
    fields = list(CRITICAL_FIELD_EVIDENCE)
    if row.get("candidate_type") == "movie" or row.get("movie_title"):
        fields.extend(MOVIE_CRITICAL_FIELD_EVIDENCE)
    return tuple(fields)


def _has_source_span(row: dict[str, Any], field_name: str) -> bool:
    source_spans = row.get("source_spans")
    if not isinstance(source_spans, dict):
        return False
    spans = source_spans.get(field_name)
    if not isinstance(spans, list) or not spans:
        return False
    for span in spans:
        if not isinstance(span, dict):
            continue
        if str(span.get("text") or "").strip() and span.get("page") not in {None, ""}:
            return True
    return False


def _schedule_normalized_ok(schedule: Any) -> bool:
    if not isinstance(schedule, dict):
        return False
    if schedule.get("schedule_type") == "phrase":
        return bool(schedule.get("raw_text"))
    return bool(schedule.get("days_of_week") and (schedule.get("start_time") or schedule.get("raw_text")))


def _row_normalized_value(row: dict[str, Any], field_name: str) -> Any:
    if field_name == "title":
        return row.get("title")
    if field_name == "schedule":
        schedule = row.get("schedule") if isinstance(row.get("schedule"), dict) else {}
        return schedule.get("normalized")
    if field_name == "location":
        location = row.get("location") if isinstance(row.get("location"), dict) else {}
        return location.get("id")
    if field_name == "fee":
        price = row.get("price") if isinstance(row.get("price"), dict) else {}
        if price.get("state") == "fee":
            return True
        if price.get("state") == "free":
            return False
        return None
    if field_name == "movie_title":
        return row.get("movie_title")
    return row.get(field_name)


def _row_raw_value(row: dict[str, Any], field_name: str) -> Any:
    if field_name == "title":
        return row.get("title")
    if field_name == "schedule":
        schedule = row.get("schedule") if isinstance(row.get("schedule"), dict) else {}
        return schedule.get("text") or schedule.get("raw_text")
    if field_name == "location":
        location = row.get("location") if isinstance(row.get("location"), dict) else {}
        return location.get("label") or location.get("value") or location.get("id")
    if field_name == "movie_title":
        return row.get("movie_title")
    return row.get(field_name)


def _has_field_value(value: Any) -> bool:
    if isinstance(value, bool):
        return True
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (dict, list, tuple, set)):
        return bool(value)
    return True


def _has_two_engine_text_records(field_evidence: dict[str, Any]) -> bool:
    return len(_engine_texts(field_evidence)) >= 2


def _configured_engine_name(ocr_config: dict[str, Any], role: str) -> str:
    engine_config = ocr_config.get(role)
    if isinstance(engine_config, dict):
        return str(engine_config.get("engine") or "").strip()
    if isinstance(engine_config, str):
        return engine_config.strip()
    return ""


def _required_ocr_engine_names(row: dict[str, Any]) -> tuple[str, ...]:
    config_sources: list[dict[str, Any]] = []
    runtime_lineage = row.get("runtime_lineage")
    if isinstance(runtime_lineage, dict) and isinstance(runtime_lineage.get("config"), dict):
        config_sources.append(runtime_lineage["config"])
    if isinstance(row.get("config"), dict):
        config_sources.append(row["config"])

    for config in config_sources:
        ocr_config = config.get("ocr")
        if not isinstance(ocr_config, dict):
            continue
        engine_names = tuple(
            engine_name
            for engine_name in (
                _configured_engine_name(ocr_config, "primary"),
                _configured_engine_name(ocr_config, "secondary"),
            )
            if engine_name
        )
        if engine_names:
            return engine_names
    return REQUIRED_OCR_ENGINE_NAMES


def _engine_texts(
    field_evidence: dict[str, Any],
    *,
    required_engine_names: tuple[str, ...] | None = None,
) -> list[str]:
    if required_engine_names is not None:
        required_records = _required_engine_records(field_evidence, required_engine_names)
        if required_records is None:
            return []
        return [str(record.get("text") or "").strip() for record in required_records]

    engines = field_evidence.get("engines")
    if not isinstance(engines, list):
        return []
    engine_names: set[str] = set()
    texts: list[str] = []
    for engine_record in engines:
        if not isinstance(engine_record, dict):
            continue
        engine_name = str(engine_record.get("engine") or "").strip()
        engine_text = str(engine_record.get("text") or "").strip()
        if engine_name and engine_text and engine_name not in engine_names:
            engine_names.add(engine_name)
            texts.append(engine_text)
    return texts


def _required_engine_records(
    field_evidence: dict[str, Any],
    required_engine_names: tuple[str, ...],
) -> list[dict[str, Any]] | None:
    records = _engine_records(field_evidence)
    records_by_name = {
        str(record.get("engine") or "").strip(): record
        for record in records
    }
    required_records: list[dict[str, Any]] = []
    for engine_name in required_engine_names:
        record = records_by_name.get(engine_name)
        if record is None:
            return None
        required_records.append(record)
    return required_records


def _has_required_engine_records(field_evidence: dict[str, Any], required_engine_names: tuple[str, ...]) -> bool:
    return _required_engine_records(field_evidence, required_engine_names) is not None


def _engine_records(field_evidence: dict[str, Any]) -> list[dict[str, Any]]:
    engines = field_evidence.get("engines")
    if not isinstance(engines, list):
        return []
    engine_names: set[str] = set()
    records: list[dict[str, Any]] = []
    for engine_record in engines:
        if not isinstance(engine_record, dict):
            continue
        engine_name = str(engine_record.get("engine") or "").strip()
        engine_text = str(engine_record.get("text") or "").strip()
        if engine_name and engine_text and engine_name not in engine_names:
            engine_names.add(engine_name)
            records.append(engine_record)
    return records


def _has_engine_confidence(field_evidence: dict[str, Any], required_engine_names: tuple[str, ...]) -> bool:
    records = _required_engine_records(field_evidence, required_engine_names)
    if records is None:
        return False
    for record in records:
        try:
            float(record.get("confidence"))
        except (TypeError, ValueError):
            return False
    return True


def _engine_text_agreement_ok(
    field_name: str,
    field_evidence: dict[str, Any],
    required_engine_names: tuple[str, ...],
) -> bool:
    agreement = _engine_text_agreement(field_name, field_evidence, required_engine_names)
    if agreement is None:
        return False
    return agreement.get("agreement") == "exact_after_normalization"


def _engine_text_agreement(
    field_name: str,
    field_evidence: dict[str, Any],
    required_engine_names: tuple[str, ...],
) -> dict[str, Any] | None:
    texts = _engine_texts(field_evidence, required_engine_names=required_engine_names)
    if len(texts) < 2:
        return None
    return evaluate_engine_agreement(
        field_name,
        primary_text=texts[0],
        secondary_text=texts[1],
    )


def _schedule_signature(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    return {
        key: value[key]
        for key in ("schedule_type", "days_of_week", "start_time", "end_time", "phrase", "timezone")
        if key in value
    }


def _field_values_match(field_name: str, left: Any, right: Any) -> bool:
    if field_name == "schedule":
        return _schedule_signature(left) == _schedule_signature(right)
    return _normalized_values_match(left, right)


def _engine_text_value_matches_row(
    field_name: str,
    field_evidence: dict[str, Any],
    row: dict[str, Any],
) -> bool:
    agreement = _engine_text_agreement(field_name, field_evidence, _required_ocr_engine_names(row))
    if agreement is None or agreement.get("agreement") != "exact_after_normalization":
        return False
    return _field_values_match(
        field_name,
        agreement.get("normalized_value"),
        _row_normalized_value(row, field_name),
    )


def _normalized_values_match(left: Any, right: Any) -> bool:
    if isinstance(left, str) or isinstance(right, str):
        return " ".join(str(left or "").strip().lower().split()) == " ".join(
            str(right or "").strip().lower().split()
        )
    return left == right


def _manual_review_field_mismatches(row: dict[str, Any], approved_fields: dict[str, Any]) -> list[str]:
    mismatches: list[str] = []
    for field_name, approved_field in approved_fields.items():
        if not isinstance(approved_field, dict) or "normalized_value" not in approved_field:
            mismatches.append(str(field_name))
            continue
        if approved_field.get("normalized_value") != _row_normalized_value(row, str(field_name)):
            mismatches.append(str(field_name))
    return mismatches


def _source_drift_report_errors(source_drift_report: dict[str, Any], preview: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    generated_at = _parse_iso_datetime(source_drift_report.get("generated_at"))
    preview_generated_at = _parse_iso_datetime(preview.get("generated_at"))
    if generated_at is None:
        errors.append("source_drift_report_missing_generated_at")
    elif preview_generated_at is not None and generated_at < preview_generated_at:
        errors.append("source_drift_report_stale")

    status = source_drift_report.get("status")
    if status == "reviewed":
        review_decision = source_drift_report.get("review_decision")
        decision = review_decision.get("decision") if isinstance(review_decision, dict) else None
        if source_drift_report.get("review_status") != "manual_review_approved" or decision not in {"approve", "edit"}:
            errors.append("source_drift_report_missing_review_approval")
        reviewed_task_ids = source_drift_report.get("reviewed_source_drift_task_ids")
        missing_task_ids = source_drift_report.get("missing_source_drift_task_ids")
        if not isinstance(reviewed_task_ids, list) or not isinstance(missing_task_ids, list):
            errors.append("source_drift_report_missing_review_manifest")
        elif not reviewed_task_ids:
            errors.append("source_drift_report_missing_reviewed_tasks")
        elif sorted(str(task_id) for task_id in reviewed_task_ids) != _required_source_drift_task_ids(
            source_drift_report
        ):
            errors.append("source_drift_report_review_manifest_mismatch")
        if isinstance(missing_task_ids, list) and missing_task_ids:
            errors.append("source_drift_report_missing_reviewed_tasks")
        if not isinstance(review_decision, dict):
            errors.append("source_drift_report_missing_review_decision")
            return errors
        if not str(review_decision.get("reviewer") or "").strip():
            errors.append("source_drift_report_missing_reviewer")
        if not str(review_decision.get("decided_at") or "").strip():
            errors.append("source_drift_report_missing_decided_at")
        if not str(review_decision.get("reason") or "").strip():
            errors.append("source_drift_report_missing_reason")
        return errors

    if status not in {None, "clean"}:
        errors.append("source_drift_report_blocked")
    for blocker in source_drift_report.get("publish_blockers") or []:
        errors.append(str(blocker))
    return errors


def _monitoring_report_errors(monitoring_report: dict[str, Any], preview: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    generated_at = _parse_iso_datetime(monitoring_report.get("generated_at"))
    preview_generated_at = _parse_iso_datetime(preview.get("generated_at"))
    if generated_at is None:
        errors.append("monitoring_report_missing_generated_at")
    elif preview_generated_at is not None and generated_at < preview_generated_at:
        errors.append("monitoring_report_stale")
    status = str(monitoring_report.get("status") or "").strip()
    if status not in {"pass", "attention", "blocked"}:
        errors.append("monitoring_report_invalid_status")
    if status == "blocked" or monitoring_report.get("recommended_action") == "withhold_publish":
        errors.append("monitoring_report_blocked")
    changed_sources = monitoring_report.get("changed_sources")
    if isinstance(changed_sources, list) and changed_sources:
        errors.append("monitoring_changed_sources")
    affected_rows = monitoring_report.get("affected_rows")
    if isinstance(affected_rows, list) and affected_rows:
        errors.append("monitoring_affected_rows")
    return errors


def _int_value(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _preview_row_source_hash(row: dict[str, Any]) -> str:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    for value in (
        row.get("source_sha256"),
        row.get("content_sha256"),
        source.get("documentHash"),
        source.get("document_hash"),
    ):
        text = str(value or "").strip()
        if text:
            return text
    return ""


def _preview_source_hashes(preview: dict[str, Any]) -> list[str]:
    rows = preview.get("rows")
    if not isinstance(rows, list):
        return []
    return sorted(
        {
            source_hash
            for row in rows
            if isinstance(row, dict)
            if (source_hash := _preview_row_source_hash(row))
        }
    )


def _row_key(row: dict[str, Any]) -> str:
    return f"{row.get('calendar_group_key') or ''}:{row.get('canonical_slug') or row.get('activity_slug') or row.get('slug') or ''}"


def _fingerprint_field_value(row: dict[str, Any], field_name: str) -> Any:
    if field_name == "price":
        price = row.get("price") if isinstance(row.get("price"), dict) else {}
        return price.get("state") if price else row.get("fee_required")
    return _row_raw_value(row, field_name)


def _field_evidence_fingerprint(row: dict[str, Any]) -> dict[str, Any]:
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


def _dual_run_preview_fingerprint(preview: dict[str, Any]) -> str:
    rows = preview.get("rows")
    if not isinstance(rows, list):
        rows = []
    row_fingerprints = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        row_fingerprints.append(
            {
                "row_key": _row_key(row),
                "validation_status": row.get("validation_status"),
                "source_hash": _preview_row_source_hash(row),
                "critical_fields": {
                    field_name: _fingerprint_field_value(row, field_name)
                    for field_name in ("title", "schedule", "location", "price")
                },
                "movie_title": _row_raw_value(row, "movie_title"),
                "field_evidence": _field_evidence_fingerprint(row),
            }
        )
    payload = json.dumps(sorted(row_fingerprints, key=lambda item: str(item["row_key"])), sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _dual_run_report_errors(dual_run_report: dict[str, Any], preview: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    generated_at = _parse_iso_datetime(dual_run_report.get("generated_at"))
    preview_generated_at = _parse_iso_datetime(preview.get("generated_at"))
    if generated_at is None:
        errors.append("dual_run_missing_generated_at")
    elif preview_generated_at is not None and generated_at < preview_generated_at:
        errors.append("dual_run_report_stale")

    if dual_run_report.get("status") != "clean":
        errors.append("dual_run_report_blocked")
    for blocker in dual_run_report.get("publish_blockers") or []:
        errors.append(str(blocker))
    for diff_key in dual_run_report.get("unreviewed_diff_keys") or []:
        errors.append(f"unreviewed_diff:{diff_key}")

    if "v3_count" not in dual_run_report:
        errors.append("dual_run_missing_v3_count")
    elif _int_value(dual_run_report.get("v3_count")) != len(preview.get("rows") or []):
        errors.append("dual_run_preview_row_count_mismatch")

    report_hashes = dual_run_report.get("v3_source_hashes")
    if not isinstance(report_hashes, list) or not [hash_value for hash_value in report_hashes if str(hash_value).strip()]:
        errors.append("dual_run_missing_v3_source_hashes")
    elif sorted({str(hash_value).strip() for hash_value in report_hashes if str(hash_value).strip()}) != _preview_source_hashes(preview):
        errors.append("dual_run_preview_source_hash_mismatch")

    report_fingerprint = str(dual_run_report.get("v3_preview_fingerprint") or "").strip()
    if not report_fingerprint:
        errors.append("dual_run_missing_preview_fingerprint")
    elif report_fingerprint != _dual_run_preview_fingerprint(preview):
        errors.append("dual_run_preview_fingerprint_mismatch")

    source_coverage = dual_run_report.get("source_coverage")
    if not isinstance(source_coverage, dict):
        errors.append("dual_run_missing_source_coverage")
        return errors

    expected_source_count = _int_value(source_coverage.get("expected_source_count"))
    processed_source_count = _int_value(source_coverage.get("processed_source_count"))
    source_error_count = _int_value(source_coverage.get("source_error_count"))
    parser_error_ids = source_coverage.get("parser_error_ids")
    parser_error_count = len(parser_error_ids) if isinstance(parser_error_ids, list) else 0
    if expected_source_count <= 0:
        errors.append("dual_run_missing_expected_sources")
    elif processed_source_count + source_error_count + parser_error_count < expected_source_count:
        errors.append("dual_run_source_coverage_incomplete")

    source_coverage_blockers = {
        "unprocessed_source_ids": "dual_run_unprocessed_sources",
        "stale_source_status_ids": "dual_run_stale_source_status_hash",
        "stale_source_status_config_ids": "dual_run_stale_source_status_config_hash",
        "stale_source_status_pipeline_ids": "dual_run_stale_source_status_pipeline_version",
        "parser_error_without_review_task_ids": "dual_run_parser_error_without_review_task",
        "source_error_without_review_task_ids": "dual_run_source_error_without_review_task",
    }
    for field_name, error_name in source_coverage_blockers.items():
        values = source_coverage.get(field_name)
        if isinstance(values, list) and values:
            errors.append(error_name)
    return errors


def _required_source_drift_task_ids(source_drift_report: dict[str, Any]) -> list[str]:
    try:
        from scripts.ingest.build_review_queue_v3 import build_review_tasks
    except ImportError:  # pragma: no cover - supports package-style imports
        from .build_review_queue_v3 import build_review_tasks

    return sorted(
        str(task.get("task_id"))
        for task in build_review_tasks([], source_drift_report=source_drift_report)
        if str(task.get("task_id") or "").strip()
    )


def _lineage_errors(row: dict[str, Any], index: int) -> list[str]:
    errors: list[str] = []
    pipeline_version = str(row.get("pipeline_version") or "").strip()
    config_hash = str(row.get("config_hash") or "").strip()
    runtime_lineage = row.get("runtime_lineage")

    if not pipeline_version:
        errors.append(f"row_missing_pipeline_version:{index}")
    if not config_hash:
        errors.append(f"row_missing_config_hash:{index}")
    if not isinstance(runtime_lineage, dict):
        errors.append(f"row_missing_runtime_lineage:{index}")
        return errors

    lineage_config_hash = str(runtime_lineage.get("config_hash") or "").strip()
    if not lineage_config_hash:
        errors.append(f"row_missing_runtime_lineage_config_hash:{index}")
    elif config_hash and lineage_config_hash != config_hash:
        errors.append(f"row_runtime_lineage_config_hash_mismatch:{index}")
    if not str(runtime_lineage.get("lineage_hash") or "").strip():
        errors.append(f"row_missing_runtime_lineage_hash:{index}")
    if not str(runtime_lineage.get("git_sha") or "").strip():
        errors.append(f"row_missing_git_sha:{index}")
    if not isinstance(runtime_lineage.get("config"), dict) or not runtime_lineage.get("config"):
        errors.append(f"row_missing_runtime_config:{index}")
    if not isinstance(runtime_lineage.get("package_versions"), dict) or not runtime_lineage.get("package_versions"):
        errors.append(f"row_missing_package_versions:{index}")
    if not isinstance(runtime_lineage.get("model_asset_hashes"), dict) or not runtime_lineage.get("model_asset_hashes"):
        errors.append(f"row_missing_model_asset_hashes:{index}")
    if not isinstance(runtime_lineage.get("ocr_engine_configs"), dict) or not runtime_lineage.get("ocr_engine_configs"):
        errors.append(f"row_missing_ocr_engine_configs:{index}")
    return errors


def _source_provenance_errors(row: dict[str, Any], index: int) -> list[str]:
    errors: list[str] = []
    source_kind = str(row.get("source_kind") or "").strip()
    if not source_kind:
        errors.append(f"row_missing_source_kind:{index}")
    elif not source_kind.startswith("official_"):
        errors.append(f"row_non_official_source:{index}")

    http_status = row.get("http_status")
    try:
        status_code = int(http_status)
    except (TypeError, ValueError):
        status_code = 0
    if status_code < 200 or status_code >= 300:
        errors.append(f"row_source_fetch_not_successful:{index}")

    if str(row.get("currentness") or "").strip().lower() != "current":
        errors.append(f"row_source_not_current:{index}")
    if not str(row.get("captured_at") or "").strip():
        errors.append(f"row_missing_source_captured_at:{index}")
    return errors


def _region_errors(row: dict[str, Any], index: int) -> list[str]:
    errors: list[str] = []
    if not str(row.get("region_id") or "").strip():
        errors.append(f"row_missing_region_id:{index}")
    if not str(row.get("region_type") or "").strip():
        errors.append(f"row_missing_region_type:{index}")

    evidence = row.get("field_evidence")
    region_evidence = evidence.get("region") if isinstance(evidence, dict) else None
    region_source = region_evidence.get("source") if isinstance(region_evidence, dict) else None
    if not isinstance(region_source, dict):
        errors.append(f"row_missing_region_evidence:{index}")
        return errors
    if not region_source.get("content_sha256"):
        errors.append(f"row_missing_region_content_sha256:{index}")
    if not region_source.get("page_image_sha256"):
        errors.append(f"row_missing_region_page_image_sha256:{index}")
    elif region_source.get("page_image_sha256") not in _canonical_page_hashes(row):
        errors.append(f"row_region_page_image_not_canonical:{index}")
    if region_source.get("page_number") in {None, ""}:
        errors.append(f"row_missing_region_page_number:{index}")
    if not region_source.get("bbox_px"):
        errors.append(f"row_missing_region_bbox_px:{index}")
    if not region_source.get("crop_sha256"):
        errors.append(f"row_missing_region_crop_sha256:{index}")
    if not region_source.get("crop_storage_path") and not region_source.get("crop_path"):
        errors.append(f"row_missing_region_crop_path:{index}")
    return errors


def load_publish_flags(path: Path = DEFAULT_FLAGS_PATH) -> dict[str, Any]:
    flags: dict[str, Any] = {
        "public_gold_source": "v2",
        "v3_publish_enabled": False,
    }
    if not path.exists():
        return flags
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        normalized = value.strip()
        if normalized.lower() in {"true", "false"}:
            flags[key.strip()] = normalized.lower() == "true"
        else:
            flags[key.strip()] = normalized
    return flags


def _source_url(row: dict[str, Any]) -> str:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    return str(row.get("source_url") or row.get("target_url") or source.get("canonicalUrl") or source.get("canonical_url") or "")


def _source_hash(row: dict[str, Any]) -> str:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    return str(row.get("source_sha256") or row.get("content_sha256") or source.get("documentHash") or source.get("document_hash") or "")


def _source_type(row: dict[str, Any]) -> str:
    source_type = str(row.get("source_type") or "").strip()
    if source_type in {"pdf", "image", "html"}:
        return source_type
    source_kind = str(row.get("source_kind") or "").strip()
    if source_kind == "official_pdf":
        return "pdf"
    if source_kind == "official_image":
        return "image"
    extension = str(row.get("file_extension") or "").strip().lower()
    if extension == ".pdf":
        return "pdf"
    if extension in {".jpg", ".jpeg", ".png"}:
        return "image"
    return "html"


def _source_document_row_from_v3(row: dict[str, Any]) -> dict[str, Any]:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    source_url = _source_url(row)
    result = {
        "source_type": _source_type(row),
        "canonical_url": source_url,
        "fetched_url": row.get("fetched_url") or source.get("fetchedUrl") or source_url,
        "content_sha256": _source_hash(row),
        "etag": row.get("etag") or source.get("etag"),
        "content_length": row.get("content_length") or source.get("contentLength"),
        "storage_path": row.get("storage_path") or source.get("path"),
        "http_status": row.get("http_status") or source.get("httpStatus") or 200,
        "calendar_group_key": row.get("calendar_group_key"),
        "fetched_at": row.get("fetched_at") or row.get("captured_at") or source.get("fetchedAt") or datetime.now(timezone.utc).isoformat(),
    }
    for field_name in (
        "mime_type",
        "http_content_type",
        "detected_content_type",
        "file_extension",
        "raw_page_count",
        "raw_width",
        "raw_height",
    ):
        if row.get(field_name) is not None:
            result[field_name] = row.get(field_name)
    return result


def _source_document_rows_by_hash(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    source_rows: dict[str, dict[str, Any]] = {}
    for row in rows:
        source_hash = _source_hash(row)
        if not source_hash:
            raise RuntimeError(f"gold_v3_source_hash_missing:{_row_key(row)}")
        source_rows.setdefault(source_hash, _source_document_row_from_v3(row))
        for link in _derived_source_links(row):
            link_hash = _source_hash(link)
            if link_hash:
                source_rows.setdefault(link_hash, _source_document_row_from_v3(link))
    return source_rows


def _source_document_ids_by_hash(source_documents: list[dict[str, Any]]) -> dict[str, str]:
    ids_by_hash: dict[str, str] = {}
    for source_document in source_documents:
        source_hash = str(source_document.get("content_sha256") or "").strip()
        source_id = str(source_document.get("id") or "").strip()
        if source_hash and source_id:
            ids_by_hash[source_hash] = source_id
    return ids_by_hash


def _row_with_source_document_id(row: dict[str, Any], source_document_id: str) -> dict[str, Any]:
    result = dict(row)
    source = dict(result.get("source") or {})
    result["source_document_id"] = source_document_id
    source["documentId"] = source_document_id
    result["source"] = source
    return result


def _source_currentness_check_row_from_v3(row: dict[str, Any], source_document_id: str) -> dict[str, Any]:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    source_url = _source_url(row)
    source_hash = _source_hash(row)
    return {
        "source_document_id": source_document_id,
        "canonical_url": source_url,
        "fetched_url": row.get("fetched_url") or source.get("fetchedUrl") or source_url,
        "live_content_sha256": row.get("live_content_sha256") or source.get("liveContentSha256") or source_hash,
        "stored_content_sha256": source_hash,
        "http_status": row.get("http_status") or source.get("httpStatus") or 200,
        "currentness": row.get("currentness") or source.get("currentness") or "current",
        "detail": {
            "calendar_group_key": row.get("calendar_group_key"),
            "canonical_slug": row.get("canonical_slug") or row.get("activity_slug"),
            "source_role": row.get("source_role"),
            "source_kind": row.get("source_kind"),
            "source_pdf_edition": row.get("source_pdf_edition") or row.get("edition"),
            "document_family": row.get("document_family"),
            "pipeline_version": row.get("pipeline_version"),
            "method": "vision_v3_publish",
        },
    }


def _derived_source_links(row: dict[str, Any]) -> list[dict[str, Any]]:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    raw_links = row.get("derived_source_links")
    if not isinstance(raw_links, list):
        raw_links = source.get("derivedSourceLinks")
    if not isinstance(raw_links, list):
        return []
    return [link for link in raw_links if isinstance(link, dict)]


def _source_relationship_rows_from_v3(
    rows: list[dict[str, Any]],
    *,
    source_ids_by_hash: dict[str, str],
) -> list[dict[str, Any]]:
    relationships: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for row in rows:
        parent_hash = _source_hash(row)
        parent_source_document_id = source_ids_by_hash.get(parent_hash)
        if not parent_source_document_id:
            continue
        for link in _derived_source_links(row):
            child_hash = _source_hash(link)
            if not child_hash:
                continue
            child_source_document_id = source_ids_by_hash.get(child_hash)
            if not child_source_document_id:
                raise RuntimeError(f"derived_source_document_missing:{child_hash}")
            relationship_type = "qr_links_derived_source"
            key = (parent_source_document_id, child_source_document_id, relationship_type)
            if key in seen:
                continue
            seen.add(key)
            relationships.append(
                {
                    "parent_source_document_id": parent_source_document_id,
                    "child_source_document_id": child_source_document_id,
                    "relationship_type": relationship_type,
                    "relationship_evidence": {
                        "calendar_group_key": row.get("calendar_group_key"),
                        "canonical_slug": row.get("canonical_slug") or row.get("activity_slug"),
                        "target_url": link.get("target_url") or _source_url(link),
                        "source_crop_sha256": link.get("source_crop_sha256"),
                        "parent_content_sha256": link.get("parent_content_sha256") or parent_hash,
                        "child_content_sha256": child_hash,
                        "is_official_source": link.get("is_official_source"),
                        "source_authority": link.get("source_authority"),
                        "method": "vision_v3_qr_decode",
                    },
                }
            )
    return relationships


def _candidate_activity_slug(row: dict[str, Any]) -> str:
    return str(row.get("activity_slug") or row.get("canonical_slug") or row.get("slug") or "")


def _candidate_id(row: dict[str, Any]) -> str:
    candidate_id = str(row.get("candidate_id") or "").strip()
    if candidate_id:
        return candidate_id
    key = ":".join(
        (
            str(row.get("calendar_group_key") or ""),
            _candidate_activity_slug(row),
            _source_hash(row),
        )
    )
    return _stable_uuid(f"candidate-v3:{key}")


def _resort_slugs(row: dict[str, Any]) -> list[str]:
    resort_slugs = row.get("resort_slugs")
    if isinstance(resort_slugs, list):
        return [str(slug) for slug in resort_slugs if str(slug).strip()]
    resort_slug = str(row.get("resort_slug") or "").strip()
    return [resort_slug] if resort_slug else []


def _public_gold_row_from_v3(row: dict[str, Any], *, promoted_at: str) -> dict[str, Any]:
    calendar_group_key = str(row.get("calendar_group_key") or "")
    canonical_slug = str(row.get("canonical_slug") or "")
    source = dict(row.get("source") or {})
    source_url = _source_url(row)
    source_sha256 = _source_hash(row)
    source.setdefault("url", source_url)
    source.setdefault("documentHash", source_sha256)
    source.setdefault("documentId", row.get("source_document_id"))
    source.setdefault("canonicalUrl", source_url)
    source["canonicalPageImageSha256s"] = row.get("canonical_page_image_sha256s") or []
    source["sourcePages"] = row.get("source_pages") or []
    source["fieldEvidence"] = row.get("field_evidence") or {}
    source["sourceSpans"] = row.get("source_spans") or {}
    source["runtimeLineage"] = row.get("runtime_lineage") or {}
    source["documentFamily"] = row.get("document_family")
    source["pipelineVersion"] = row.get("pipeline_version")
    source["configHash"] = row.get("config_hash")
    source["candidateType"] = row.get("candidate_type")
    source["movieTitle"] = row.get("movie_title")
    source["normalizedMovieTitle"] = row.get("normalized_movie_title")
    source["region"] = {
        "regionId": row.get("region_id"),
        "regionType": row.get("region_type"),
    }
    return {
        "id": _stable_uuid(f"gold-v3:{calendar_group_key}:{canonical_slug}"),
        "activity_catalog_id": row.get("activity_catalog_id")
        or _stable_uuid(f"activity-catalog:{calendar_group_key}:{canonical_slug}"),
        "calendar_group_key": calendar_group_key,
        "resort_slugs": _resort_slugs(row),
        "canonical_slug": canonical_slug,
        "title": row.get("title"),
        "category": _db_category(row),
        "schedule": row.get("schedule") or {},
        "location": row.get("location") or {},
        "description": row.get("description"),
        "price": row.get("price") or {"state": "unknown"},
        "claims": row.get("claims") or {},
        "field_provenance": row.get("source_spans") or {},
        "source": source,
        "source_document_id": row.get("source_document_id"),
        "source_url": source_url,
        "source_sha256": source_sha256,
        "source_pdf_edition": row.get("source_pdf_edition") or row.get("edition"),
        "trust_state": row.get("trust_state") or (
            "reviewed_source_backed" if row.get("validation_status") == "manually_approved" else "source_backed"
        ),
        "valid_from": row.get("valid_from"),
        "valid_until": row.get("valid_until"),
        "is_current": True,
        "promoted_from_candidate_id": row.get("candidate_id"),
        "promoted_at": promoted_at,
        "enrichment": row.get("enrichment") or {},
        "external_facts": row.get("external_facts") or [],
    }


def build_public_gold_rows_from_preview(
    preview: dict[str, Any],
    *,
    promoted_at: str | None = None,
) -> list[dict[str, Any]]:
    if preview.get("publication_mode") != "vision_v3_preview":
        raise RuntimeError("invalid_preview_mode")
    rows = preview.get("rows")
    if not isinstance(rows, list):
        raise RuntimeError("preview_rows_missing")
    timestamp = promoted_at or datetime.now(timezone.utc).isoformat()
    return [
        _public_gold_row_from_v3(row, promoted_at=timestamp)
        for row in rows
        if isinstance(row, dict)
    ]


def _catalog_row_from_public_gold(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["activity_catalog_id"],
        "calendar_group_key": row["calendar_group_key"],
        "canonical_name": row["title"],
        "normalized_name": row["canonical_slug"],
        "default_category": row["category"],
    }


def _json_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value in {None, ""}:
        return []
    return [value]


def _candidate_raw_fields(row: dict[str, Any]) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    for field_name in _critical_field_names(row):
        value = _row_raw_value(row, field_name)
        if _has_field_value(value):
            fields[field_name] = value
    return fields


def _candidate_normalized_fields(row: dict[str, Any]) -> dict[str, Any]:
    fields: dict[str, Any] = {
        "canonical_slug": row.get("canonical_slug"),
        "category": _db_category(row),
    }
    for field_name in _critical_field_names(row):
        value = _row_normalized_value(row, field_name)
        if _has_field_value(value):
            fields[field_name] = value
    return {key: value for key, value in fields.items() if _has_field_value(value)}


def _field_confidence(field_evidence: dict[str, Any], spans: list[Any]) -> float:
    confidences: list[float] = []
    for engine_record in _engine_records(field_evidence):
        try:
            confidences.append(float(engine_record.get("confidence")))
        except (TypeError, ValueError):
            continue
    if confidences:
        return max(0.0, min(1.0, min(confidences)))
    return 1.0 if field_evidence or spans else 0.0


def _candidate_confidence(row: dict[str, Any]) -> float:
    evidence = row.get("field_evidence") if isinstance(row.get("field_evidence"), dict) else {}
    source_spans = row.get("source_spans") if isinstance(row.get("source_spans"), dict) else {}
    confidences = []
    for field_name in _critical_field_names(row):
        field_evidence = evidence.get(field_name) if isinstance(evidence.get(field_name), dict) else {}
        spans = source_spans.get(field_name) if isinstance(source_spans.get(field_name), list) else []
        confidences.append(_field_confidence(field_evidence, spans))
    if confidences:
        return max(0.0, min(1.0, min(confidences)))
    return 1.0 if row.get("validation_status") in PROMOTABLE_ROW_STATUSES else 0.0


def _candidate_row_from_v3(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "candidate_id": _candidate_id(row),
        "layout_snapshot_id": row.get("layout_snapshot_id"),
        "source_document_id": row.get("source_document_id"),
        "ingest_run_id": row.get("ingest_run_id"),
        "calendar_group_key": row.get("calendar_group_key"),
        "content_sha256": _source_hash(row),
        "activity_slug": _candidate_activity_slug(row),
        "parser_version": row.get("pipeline_version") or "vision_v3_001",
        "profile_key": row.get("document_family") or row.get("candidate_type") or row.get("source_kind") or "vision_v3",
        "raw_fields": _candidate_raw_fields(row),
        "normalized_fields": _candidate_normalized_fields(row),
        "source_spans": row.get("source_spans") if isinstance(row.get("source_spans"), dict) else {},
        "confidence": _candidate_confidence(row),
        "warnings": _json_list(row.get("warnings")),
        "validation_errors": _json_list(row.get("validation_errors") or row.get("validation_findings")),
        "status": "promoted",
    }


def _observed_value(row: dict[str, Any], field_name: str) -> str:
    if field_name == "fee":
        value = row.get("price")
        if isinstance(value, dict):
            return str(value.get("state") or "")
    elif field_name == "schedule":
        value = row.get("schedule")
        if isinstance(value, dict):
            return str(value.get("text") or value.get("raw_text") or "")
    elif field_name == "location":
        value = row.get("location")
        if isinstance(value, dict):
            return str(value.get("label") or value.get("id") or value.get("value") or "")
    elif field_name == "movie_title":
        source = row.get("source") if isinstance(row.get("source"), dict) else {}
        return str(source.get("movieTitle") or "")
    else:
        value = row.get(field_name)
    if isinstance(value, (dict, list)):
        return json.dumps(value, sort_keys=True, ensure_ascii=False)
    return str(value or "")


def _field_provenance_rows_from_v3(row: dict[str, Any], public_row: dict[str, Any]) -> list[dict[str, Any]]:
    field_evidence = row.get("field_evidence") if isinstance(row.get("field_evidence"), dict) else {}
    source_spans = row.get("source_spans") if isinstance(row.get("source_spans"), dict) else {}
    provenance_rows: list[dict[str, Any]] = []
    for field_name in _critical_field_names(row):
        spans = source_spans.get(field_name)
        if not isinstance(spans, list):
            spans = []
        evidence_for_field = (
            field_evidence.get(field_name)
            if isinstance(field_evidence.get(field_name), dict)
            else {}
        )
        provenance_rows.append(
            {
                "candidate_id": _candidate_id(row),
                "field_name": field_name,
                "field_value": _observed_value(public_row, field_name),
                "source_type": "vision_layout_v3",
                "source_spans": spans,
                "transformation": evidence_for_field.get("agreement"),
                "confidence": _field_confidence(evidence_for_field, spans),
                "is_required": True,
            }
        )
    return provenance_rows


def _field_audit_observation_rows(public_row: dict[str, Any]) -> list[dict[str, Any]]:
    source = public_row.get("source") if isinstance(public_row.get("source"), dict) else {}
    field_evidence = source.get("fieldEvidence") if isinstance(source.get("fieldEvidence"), dict) else {}
    source_spans = public_row.get("field_provenance") if isinstance(public_row.get("field_provenance"), dict) else {}
    row_key = f"{public_row['calendar_group_key']}:{public_row['canonical_slug']}"
    field_names = list(CRITICAL_FIELD_EVIDENCE)
    if source.get("candidateType") == "movie" or source.get("movieTitle"):
        field_names.extend(MOVIE_CRITICAL_FIELD_EVIDENCE)
    observations: list[dict[str, Any]] = []
    for field_name in field_names:
        spans = source_spans.get(field_name)
        if not isinstance(spans, list):
            spans = []
        field_evidence_for_name = (
            field_evidence.get(field_name)
            if isinstance(field_evidence.get(field_name), dict)
            else {}
        )
        observations.append(
            {
                "published_row_id": public_row["id"],
                "source_document_id": public_row.get("source_document_id"),
                "row_kind": "gold_activity",
                "row_key": row_key,
                "field_name": field_name,
                "observed_value": _observed_value(public_row, field_name),
                "method": "manual_visual_review"
                if public_row.get("trust_state") == "reviewed_source_backed"
                else "deterministic_parser",
                "confidence": "high" if spans or field_evidence_for_name else "unknown",
                "evidence": {
                    "spans": spans,
                    "field_evidence": field_evidence_for_name,
                },
            }
        )
    return observations


def _check_activity_pipeline_v3_health(db: Any) -> None:
    health = db.rpc("check_activity_pipeline_v3_health")
    if health:
        details = ", ".join(
            f"{row.get('check_name')}:{row.get('detail')}"
            for row in health
            if isinstance(row, dict)
        )
        raise RuntimeError(f"activity_pipeline_v3_health_failed:{details}")


def publish_gold_v3_preview(
    db: Any,
    preview: dict[str, Any],
    *,
    promoted_at: str | None = None,
) -> dict[str, int]:
    raw_preview_rows = [row for row in preview.get("rows") or [] if isinstance(row, dict)]
    source_document_rows_by_hash = _source_document_rows_by_hash(raw_preview_rows)
    preview_rows_by_source_hash: dict[str, dict[str, Any]] = {}
    for row in raw_preview_rows:
        preview_rows_by_source_hash.setdefault(_source_hash(row), row)
        for link in _derived_source_links(row):
            link_hash = _source_hash(link)
            if link_hash:
                preview_rows_by_source_hash.setdefault(link_hash, link)
    source_documents = db.upsert(
        "source_documents",
        list(source_document_rows_by_hash.values()),
        on_conflict="content_sha256",
    )
    source_ids_by_hash = _source_document_ids_by_hash(source_documents)
    missing_source_ids = sorted(set(source_document_rows_by_hash) - set(source_ids_by_hash))
    if missing_source_ids:
        raise RuntimeError(f"source_document_upsert_missing_id:{','.join(missing_source_ids)}")

    preview_rows = [
        _row_with_source_document_id(row, source_ids_by_hash[_source_hash(row)])
        for row in raw_preview_rows
    ]
    currentness_rows = [
        _source_currentness_check_row_from_v3(preview_rows_by_source_hash[source_hash], source_ids_by_hash[source_hash])
        for source_hash in source_document_rows_by_hash
    ]
    if currentness_rows:
        db.insert("source_currentness_checks", currentness_rows)
    relationship_rows = _source_relationship_rows_from_v3(
        raw_preview_rows,
        source_ids_by_hash=source_ids_by_hash,
    )
    if relationship_rows:
        db.upsert(
            "source_relationships",
            relationship_rows,
            on_conflict="parent_source_document_id,child_source_document_id,relationship_type",
        )

    publish_preview = {**preview, "rows": preview_rows}
    public_rows = build_public_gold_rows_from_preview(publish_preview, promoted_at=promoted_at)
    if not public_rows:
        raise RuntimeError("gold_v3_rows_empty")
    candidate_rows = [_candidate_row_from_v3(row) for row in preview_rows]
    field_provenance_rows = [
        provenance_row
        for row, public_row in zip(preview_rows, public_rows)
        for provenance_row in _field_provenance_rows_from_v3(row, public_row)
    ]
    catalog_rows = [_catalog_row_from_public_gold(row) for row in public_rows]
    db.upsert("activity_extraction_candidates", candidate_rows, on_conflict=ACTIVITY_CANDIDATE_CONFLICT)
    db.upsert(
        "activity_field_provenance",
        field_provenance_rows,
        on_conflict=ACTIVITY_FIELD_PROVENANCE_CONFLICT,
    )
    db.upsert("activity_catalog", catalog_rows, on_conflict="id")
    db.upsert("public_activity_gold", public_rows, on_conflict="id")
    field_observation_rows = [
        observation
        for row in public_rows
        for observation in _field_audit_observation_rows(row)
    ]
    if field_observation_rows:
        db.insert("field_audit_observations", field_observation_rows)
    _check_activity_pipeline_v3_health(db)
    return {
        "source_documents": len(source_documents),
        "source_currentness_checks": len(currentness_rows),
        "source_relationships": len(relationship_rows),
        "activity_extraction_candidates": len(candidate_rows),
        "activity_field_provenance": len(field_provenance_rows),
        "activity_catalog": len(catalog_rows),
        "public_activity_gold": len(public_rows),
        "field_audit_observations": len(field_observation_rows),
    }


def evaluate_publish_readiness(
    preview: dict[str, Any],
    *,
    flags: dict[str, Any],
    require_clean_preview: bool = True,
    dual_run_report: dict[str, Any] | None = None,
    source_drift_report: dict[str, Any] | None = None,
    require_source_drift_report: bool = False,
    monitoring_report: dict[str, Any] | None = None,
    require_monitoring_report: bool = False,
) -> dict[str, Any]:
    errors: list[str] = []
    publish_v3_enabled = flags.get("public_gold_source") == "v3" and flags.get("v3_publish_enabled") is True
    if not publish_v3_enabled:
        errors.append("v3_publish_disabled")
    if preview.get("publication_mode") != "vision_v3_preview":
        errors.append("invalid_preview_mode")
    if _parse_iso_datetime(preview.get("generated_at")) is None:
        errors.append("preview_missing_generated_at")
    rows = preview.get("rows")
    if not isinstance(rows, list):
        errors.append("preview_rows_missing")
        rows = []
    summary = preview.get("summary")
    if not isinstance(summary, dict):
        errors.append("preview_summary_missing")
        summary = {}
    elif "gold_rows" not in summary:
        errors.append("preview_summary_missing_gold_rows")
    elif _int_value(summary.get("gold_rows")) != len(rows):
        errors.append("preview_summary_gold_rows_mismatch")
    if isinstance(preview.get("gold_conflicts"), list) and preview["gold_conflicts"]:
        errors.append("preview_has_unresolved_gold_conflicts")
    if int(summary.get("skipped_gold_conflicts") or 0):
        errors.append("preview_has_skipped_gold_conflicts")
    if require_clean_preview and int(summary.get("skipped_not_publishable") or 0):
        errors.append("preview_has_skipped_candidates")
    allowed_groups = set(_list_flag(flags.get("v3_allowed_calendar_groups")))
    allowed_families = set(_list_flag(flags.get("v3_allowed_document_families")))
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            errors.append(f"invalid_row:{index}")
            continue
        errors.extend(_lineage_errors(row, index))
        errors.extend(_source_provenance_errors(row, index))
        errors.extend(_region_errors(row, index))
        if not row.get("source_document_id"):
            errors.append(f"row_missing_source_document_id:{index}")
        if row.get("validation_findings"):
            errors.append(f"row_has_validation_findings:{index}")
        if row.get("validation_status") not in PROMOTABLE_ROW_STATUSES:
            errors.append(f"row_unpromotable_validation_status:{index}")
        source = row.get("source")
        source_hash = row.get("source_sha256")
        if isinstance(source, dict):
            source_hash = source_hash or source.get("documentHash") or source.get("document_hash")
        if not source_hash:
            errors.append(f"row_missing_source_sha256:{index}")
        if row.get("validation_status") == "manually_approved":
            review_decision = row.get("review_decision")
            decision = review_decision.get("decision") if isinstance(review_decision, dict) else None
            if row.get("review_status") != "manual_review_approved" or decision not in {"approve", "edit"}:
                errors.append(f"row_missing_manual_review_approval:{index}")
            elif str(review_decision.get("content_sha256") or "") != str(source_hash or ""):
                errors.append(f"row_stale_manual_review_source_hash:{index}")
            else:
                original_task = (
                    review_decision.get("original_task")
                    if isinstance(review_decision.get("original_task"), dict)
                    else {}
                )
                for review_source in (review_decision, original_task):
                    review_source_document_id = str(review_source.get("source_document_id") or "").strip()
                    if review_source_document_id and review_source_document_id != str(row.get("source_document_id") or "").strip():
                        errors.append(f"row_stale_manual_review_source_document_id:{index}")
                        break
                for review_source in (review_decision, original_task):
                    review_calendar_group = str(review_source.get("calendar_group_key") or "").strip()
                    if review_calendar_group and review_calendar_group != str(row.get("calendar_group_key") or "").strip():
                        errors.append(f"row_stale_manual_review_calendar_group:{index}")
                        break
                if not str(review_decision.get("reviewer") or "").strip():
                    errors.append(f"row_missing_manual_review_reviewer:{index}")
                if not str(review_decision.get("decided_at") or "").strip():
                    errors.append(f"row_missing_manual_review_decided_at:{index}")
                if not str(review_decision.get("reason") or "").strip():
                    errors.append(f"row_missing_manual_review_reason:{index}")
                if not isinstance(review_decision.get("approved_fields"), dict) or not review_decision.get("approved_fields"):
                    errors.append(f"row_missing_manual_review_approved_fields:{index}")
                elif isinstance(review_decision.get("approved_fields"), dict):
                    for field_name in _manual_review_field_mismatches(row, review_decision["approved_fields"]):
                        errors.append(f"row_manual_review_approved_field_mismatch:{index}:{field_name}")
                reviewed_page_hash = str(review_decision.get("page_image_sha256") or "")
                reviewed_crop_hash = str(review_decision.get("field_crop_sha256") or "")
                if not reviewed_page_hash:
                    errors.append(f"row_missing_manual_review_page_image:{index}")
                elif reviewed_page_hash not in _field_page_hashes(row):
                    errors.append(f"row_stale_manual_review_page_image:{index}")
                if not reviewed_crop_hash:
                    errors.append(f"row_missing_manual_review_field_crop:{index}")
                elif reviewed_crop_hash not in _field_crop_hashes(row):
                    errors.append(f"row_stale_manual_review_field_crop:{index}")
                elif (
                    isinstance(review_decision.get("approved_fields"), dict)
                    and reviewed_crop_hash not in _field_crop_hashes(
                        row,
                        field_names=set(review_decision["approved_fields"]),
                    )
                ):
                    errors.append(f"row_manual_review_approved_field_crop_mismatch:{index}")
        if allowed_groups and row.get("calendar_group_key") not in allowed_groups:
            errors.append(f"row_calendar_group_not_enabled_for_v3:{index}")
        if allowed_families and row.get("document_family") not in allowed_families:
            errors.append(f"row_document_family_not_enabled_for_v3:{index}")
        source_url = row.get("source_url")
        if isinstance(source, dict):
            source_url = source_url or source.get("canonicalUrl") or source.get("canonical_url")
        if not source_url:
            errors.append(f"row_missing_source_url:{index}")
        elif not _is_public_source_url(source_url):
            errors.append(f"row_non_public_source_url:{index}")
        schedule = row.get("schedule") if isinstance(row.get("schedule"), dict) else {}
        if not _schedule_normalized_ok(schedule.get("normalized")):
            errors.append(f"row_unparsed_schedule:{index}")
        location = row.get("location") if isinstance(row.get("location"), dict) else {}
        location_id = str(location.get("id") or "").strip().lower()
        if not location_id or location_id == "unknown":
            errors.append(f"row_unknown_location:{index}")
        price = row.get("price") if isinstance(row.get("price"), dict) else {}
        if price.get("state") not in {"free", "fee"}:
            errors.append(f"row_unresolved_fee_state:{index}")
        evidence = row.get("field_evidence")
        if not isinstance(evidence, dict) or not evidence:
            errors.append(f"row_missing_field_evidence:{index}")
            continue
        for field_name in _critical_field_names(row):
            if not _has_source_span(row, field_name):
                errors.append(f"row_missing_critical_field_source_span:{index}:{field_name}")
            field_evidence = evidence.get(field_name)
            if not isinstance(field_evidence, dict):
                errors.append(f"row_missing_critical_field_evidence:{index}:{field_name}")
                continue
            review_decision = row.get("review_decision")
            approved_fields = (
                review_decision.get("approved_fields")
                if isinstance(review_decision, dict) and isinstance(review_decision.get("approved_fields"), dict)
                else {}
            )
            approved_field = approved_fields.get(field_name) if isinstance(approved_fields, dict) else None
            if not _has_field_value(field_evidence.get("raw_value")) and not (
                isinstance(approved_field, dict) and _has_field_value(approved_field.get("raw_value"))
            ):
                errors.append(f"row_missing_critical_field_raw_value:{index}:{field_name}")
            if (
                field_name in RAW_VALUE_MATCH_FIELDS
                and not isinstance(approved_field, dict)
                and _has_field_value(field_evidence.get("raw_value"))
                and not _normalized_values_match(field_evidence.get("raw_value"), _row_raw_value(row, field_name))
            ):
                errors.append(f"row_critical_field_raw_value_mismatch:{index}:{field_name}")
            if not _has_field_value(field_evidence.get("normalized_value")) and not (
                isinstance(approved_field, dict) and _has_field_value(approved_field.get("normalized_value"))
            ):
                errors.append(f"row_missing_critical_field_normalized_value:{index}:{field_name}")
            if (
                not isinstance(approved_field, dict)
                and _has_field_value(field_evidence.get("normalized_value"))
                and not _normalized_values_match(
                    field_evidence.get("normalized_value"),
                    _row_normalized_value(row, field_name),
                )
            ):
                errors.append(f"row_critical_field_normalized_value_mismatch:{index}:{field_name}")
            field_source = field_evidence.get("source")
            if not isinstance(field_source, dict):
                errors.append(f"row_missing_critical_field_source:{index}:{field_name}")
                continue
            field_source_hash = str(field_source.get("content_sha256") or "")
            if not field_source_hash:
                errors.append(f"row_missing_critical_field_content_sha256:{index}:{field_name}")
            elif source_hash and field_source_hash != str(source_hash):
                errors.append(f"row_field_source_hash_mismatch:{index}:{field_name}")
            if not field_source.get("page_image_sha256"):
                errors.append(f"row_missing_critical_field_page_image_sha256:{index}:{field_name}")
            elif field_source.get("page_image_sha256") not in _canonical_page_hashes(row):
                errors.append(f"row_field_page_image_not_canonical:{index}:{field_name}")
            if field_source.get("page_number") in {None, ""}:
                errors.append(f"row_missing_critical_field_page_number:{index}:{field_name}")
            if not field_source.get("bbox_px"):
                errors.append(f"row_missing_critical_field_bbox_px:{index}:{field_name}")
            if not field_source.get("crop_sha256"):
                errors.append(f"row_missing_critical_field_crop_sha256:{index}:{field_name}")
            if not field_source.get("crop_storage_path") and not field_source.get("crop_path"):
                errors.append(f"row_missing_critical_field_crop_path:{index}:{field_name}")
            manually_approved_field = row.get("review_status") == "manual_review_approved" and field_name in approved_fields
            required_engine_names = _required_ocr_engine_names(row)
            if not manually_approved_field and not _has_two_engine_text_records(field_evidence):
                errors.append(f"row_missing_critical_field_engine_evidence:{index}:{field_name}")
            elif not manually_approved_field and not _has_required_engine_records(field_evidence, required_engine_names):
                errors.append(f"row_missing_required_engine_evidence:{index}:{field_name}")
            elif not manually_approved_field and not _has_engine_confidence(field_evidence, required_engine_names):
                errors.append(f"row_missing_critical_field_engine_confidence:{index}:{field_name}")
            if (
                not manually_approved_field
                and (
                    field_evidence.get("agreement") != "exact_after_normalization"
                    or not _engine_text_agreement_ok(field_name, field_evidence, required_engine_names)
                )
            ):
                errors.append(f"row_unresolved_engine_disagreement:{index}:{field_name}")
            elif not manually_approved_field and not _engine_text_value_matches_row(field_name, field_evidence, row):
                errors.append(f"row_critical_field_engine_value_mismatch:{index}:{field_name}")
    if dual_run_report is None and require_clean_preview and publish_v3_enabled:
        errors.append("missing_dual_run_report")
    if dual_run_report is not None:
        errors.extend(_dual_run_report_errors(dual_run_report, preview))
    if require_source_drift_report and publish_v3_enabled and source_drift_report is None:
        errors.append("missing_source_drift_report")
    if source_drift_report is not None:
        errors.extend(_source_drift_report_errors(source_drift_report, preview))
    if require_monitoring_report and publish_v3_enabled:
        if monitoring_report is None:
            errors.append("missing_monitoring_report")
        else:
            errors.extend(_monitoring_report_errors(monitoring_report, preview))
    return {
        "ready": not errors,
        "errors": errors,
        "row_count": len(rows),
        "mode": flags.get("public_gold_source"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Check whether Gold v3 preview is publish-ready")
    parser.add_argument("preview", type=Path, nargs="?", default=DEFAULT_PREVIEW_PATH)
    parser.add_argument("--flags", type=Path, default=DEFAULT_FLAGS_PATH)
    parser.add_argument("--require-clean-preview", action="store_true")
    parser.add_argument("--dual-run-report", type=Path, default=DEFAULT_DUAL_RUN_REPORT_PATH)
    parser.add_argument("--source-drift-report", type=Path, default=DEFAULT_SOURCE_DRIFT_REPORT_PATH)
    parser.add_argument("--monitoring-report", type=Path, default=DEFAULT_MONITORING_REPORT_PATH)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--publish", action="store_true", help="Write ready v3 preview rows to public Gold tables")
    args = parser.parse_args()

    if args.publish and not args.require_clean_preview:
        print("blocked")
        print("publish_requires_clean_preview")
        raise SystemExit(1)

    preview = json.loads(args.preview.read_text())
    dual_run_report = json.loads(args.dual_run_report.read_text()) if args.dual_run_report.exists() else None
    source_drift_report = (
        json.loads(args.source_drift_report.read_text()) if args.source_drift_report.exists() else None
    )
    monitoring_report = (
        json.loads(args.monitoring_report.read_text()) if args.monitoring_report.exists() else None
    )
    readiness = evaluate_publish_readiness(
        preview,
        flags=load_publish_flags(args.flags),
        require_clean_preview=args.require_clean_preview,
        dual_run_report=dual_run_report,
        source_drift_report=source_drift_report,
        require_source_drift_report=True,
        monitoring_report=monitoring_report,
        require_monitoring_report=True,
    )
    if args.json:
        print(json.dumps(readiness, indent=2, sort_keys=True))
    else:
        print("ready" if readiness["ready"] else "blocked")
        for error in readiness["errors"]:
            print(error)
    if not readiness["ready"]:
        raise SystemExit(1)
    if args.publish:
        if SupabaseClient is None:
            raise RuntimeError("SupabaseClient unavailable")
        result = publish_gold_v3_preview(SupabaseClient(), preview)
        print(json.dumps({"published": result}, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
