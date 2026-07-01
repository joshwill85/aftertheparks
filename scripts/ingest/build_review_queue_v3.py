"""Build review tasks for non-publishable vision v3 candidates."""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import io
import json
import os
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR, ROOT
    from review_schema_v3 import (
        DEFAULT_DUAL_RUN_REVIEW_KEYS_PATH,
        DEFAULT_FIXTURE_CANDIDATES_PATH,
        DEFAULT_PARSER_RULE_REQUESTS_PATH,
    )
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR, ROOT
    from .review_schema_v3 import (
        DEFAULT_DUAL_RUN_REVIEW_KEYS_PATH,
        DEFAULT_FIXTURE_CANDIDATES_PATH,
        DEFAULT_PARSER_RULE_REQUESTS_PATH,
    )


DEFAULT_OUTPUT_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_queue.json"
DEFAULT_VALIDATED_CANDIDATES_PATH = PROCESSED_DIR / "validated_candidates_v3"
DEFAULT_SOURCE_STATUSES_PATH = PROCESSED_DIR / "eval" / "v3_source_statuses.json"
DEFAULT_SOURCE_INVENTORY_PATH = PROCESSED_DIR / "source_inventory.json"
DEFAULT_REVIEW_DECISIONS_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_decisions.json"
DEFAULT_EXISTING_GOLD_PATH = PROCESSED_DIR / "activity_gold_v2_preview.json"
DEFAULT_GOLD_CONFLICTS_PATH = PROCESSED_DIR / "activity_gold_v3_preview.json"
DEFAULT_SOURCE_DRIFT_REPORT_PATH = PROCESSED_DIR / "source_drift_report.json"
DEFAULT_REVIEWED_SOURCE_DRIFT_REPORT_PATH = (
    PROCESSED_DIR / "review_queue" / "vision_v3_reviewed_source_drift_report.json"
)
DEFAULT_DUAL_RUN_REPORT_PATH = PROCESSED_DIR / "eval" / "v3_dual_run_report.json"
DEFAULT_REPORT_PATH = PROCESSED_DIR / "eval" / "v3_review_queue_report.json"
DEFAULT_HTML_OUTPUT_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_queue.html"
DEFAULT_CHECKLIST_OUTPUT_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_publish_blocker_checklist.csv"
SOURCE_STATUS_REVIEW_TASK_TYPES = {"parser_error", "source_error"}
PLACEHOLDER_REVIEW_REASONS = {
    "approved",
    "ok",
    "reason",
    "reviewed",
    "source-backed rationale for this decision",
    "tbd",
    "todo",
    "verified against source crop",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _task_type(findings: list[str]) -> str:
    if not findings:
        return "needs_review"
    first = findings[0]
    if any(finding.startswith("engine_disagreement:") for finding in findings):
        disagreement_fields = {
            finding.split(":", 1)[1]
            for finding in findings
            if finding.startswith("engine_disagreement:") and ":" in finding
        }
        selected_field = _field_from_findings(findings)
        if selected_field in disagreement_fields:
            return "ocr_disagreement"
    if first in {
        "fee_legend_missing_for_unmarked_title",
        "fee_marker_without_legend",
        "fee_marker_conflict",
    } or first.startswith("missing_field_normalized_value:") or first.startswith("field_engine_value_mismatch:"):
        return "manual_review_required"
    if first.startswith("missing_required_field:"):
        return "missing_required_field"
    if first == "unknown_location":
        return "unknown_location"
    if first == "unparsed_schedule":
        return "unparsed_schedule"
    if first.startswith("engine_disagreement:"):
        return "ocr_disagreement"
    if first.startswith("manual_review_required:"):
        return "manual_review_required"
    if first.startswith("non_activity_title:"):
        return "manual_review_required"
    if first == "partial_movie_row_review_required":
        return "missing_required_field"
    if first == "unknown_document_family":
        return "unknown_document_family"
    if first.startswith("low_quality_image"):
        return "low_quality_image"
    if first.startswith("source_changed"):
        return "source_changed"
    if first.startswith("gold_conflict"):
        return "gold_conflict"
    return first


def _field_from_findings(findings: list[str]) -> str | None:
    if (
        "fee_legend_missing_for_unmarked_title" in findings
        or "fee_marker_without_legend" in findings
        or "fee_marker_conflict" in findings
    ):
        return "fee"
    for finding in findings:
        if ":" in finding and (
            finding.startswith("missing_required_field:")
            or finding.startswith("engine_disagreement:")
            or finding.startswith("manual_review_required:")
            or finding.startswith("missing_field_normalized_value:")
            or finding.startswith("field_engine_value_mismatch:")
            or finding.startswith("field_normalized_value_mismatch:")
            or finding.startswith("field_raw_value_mismatch:")
            or finding.startswith("non_activity_title:")
        ):
            return finding.split(":", 1)[1]
        if finding == "partial_movie_row_review_required":
            return "title"
    if "unknown_location" in findings:
        return "location"
    if "unparsed_schedule" in findings:
        return "schedule"
    if "fee_marker_conflict" in findings:
        return "fee"
    return None


def _field_specific_findings(findings: list[str]) -> list[tuple[str, list[str]]]:
    grouped: dict[str, list[str]] = {}
    for finding in findings:
        if ":" not in finding:
            return []
        field_name = _field_from_findings([finding])
        if not field_name or _task_type([finding]) not in {
            "ocr_disagreement",
            "missing_required_field",
            "manual_review_required",
            "unparsed_schedule",
            "unknown_location",
        }:
            return []
        grouped.setdefault(field_name, []).append(finding)
    if len(grouped) <= 1:
        return []
    return sorted(grouped.items())


def _field_evidence(candidate: dict[str, Any], field_name: str | None) -> dict[str, Any]:
    evidence = candidate.get("field_evidence") if isinstance(candidate.get("field_evidence"), dict) else {}
    if field_name and isinstance(evidence.get(field_name), dict):
        return evidence[field_name]
    if isinstance(evidence.get("region"), dict):
        return evidence["region"]
    return {}


def _region_source(candidate: dict[str, Any], field_name: str | None = None) -> dict[str, Any]:
    evidence = candidate.get("field_evidence") if isinstance(candidate.get("field_evidence"), dict) else {}
    selected = _field_evidence(candidate, field_name)
    source = selected.get("source") if isinstance(selected.get("source"), dict) else {}
    if not source:
        region = evidence.get("region") if isinstance(evidence.get("region"), dict) else {}
        source = region.get("source") if isinstance(region.get("source"), dict) else {}
    return source


def _source_metadata(candidate: dict[str, Any]) -> dict[str, Any]:
    keys = (
        "source_kind",
        "source_role",
        "canonical_url",
        "fetched_url",
        "http_status",
        "currentness",
        "captured_at",
    )
    return {key: candidate.get(key) for key in keys if candidate.get(key) not in {None, ""}}


def _source_inventory_by_hash(source_inventory: list[dict[str, Any]] | None) -> dict[str, dict[str, Any]]:
    by_hash: dict[str, dict[str, Any]] = {}
    for source in source_inventory or []:
        source_hash = _source_hash(source)
        if source_hash:
            by_hash[source_hash] = source
    return by_hash


def _source_metadata_for_hash(source_hash: Any, source_inventory_by_hash: dict[str, dict[str, Any]]) -> dict[str, Any]:
    return _source_metadata(source_inventory_by_hash.get(str(source_hash or "").strip(), {}))


def _merged_source_metadata(status: dict[str, Any], source_inventory_by_hash: dict[str, dict[str, Any]]) -> dict[str, Any]:
    inventory_metadata = _source_metadata_for_hash(_source_hash(status), source_inventory_by_hash)
    return {**inventory_metadata, **_source_metadata(status)}


def _page_image_path(candidate: dict[str, Any], page_image_sha256: Any) -> str | None:
    requested_hash = str(page_image_sha256 or "").strip()
    if not requested_hash:
        return None
    for page in candidate.get("source_pages") or []:
        if not isinstance(page, dict):
            continue
        page_hash = str(
            page.get("page_image_sha256")
            or page.get("canonical_image_sha256")
            or ""
        ).strip()
        if page_hash != requested_hash:
            continue
        page_path = (
            page.get("page_image_path")
            or page.get("canonical_image_path")
            or page.get("canonical_image_storage_path")
        )
        return str(page_path) if page_path else None
    return None


def _comparison_key(row: dict[str, Any]) -> str:
    calendar_group_key = str(row.get("calendar_group_key") or "").strip()
    canonical_slug = str(row.get("canonical_slug") or row.get("activity_slug") or row.get("slug") or "").strip()
    return f"{calendar_group_key}:{canonical_slug}" if calendar_group_key and canonical_slug else ""


def _schedule_value(row: dict[str, Any]) -> str:
    schedule = row.get("schedule")
    if isinstance(schedule, dict):
        return str(schedule.get("text") or schedule.get("raw_text") or "").strip()
    return str(row.get("schedule_raw") or row.get("schedule_text") or "").strip()


def _location_value(row: dict[str, Any]) -> str:
    location = row.get("location")
    if isinstance(location, dict):
        return str(location.get("label") or location.get("id") or location.get("value") or "").strip()
    return str(row.get("location_text") or row.get("normalized_location_id") or "").strip()


def _price_value(row: dict[str, Any]) -> str:
    price = row.get("price")
    if isinstance(price, dict):
        return str(price.get("state") or "").strip()
    fee_required = row.get("fee_required")
    if fee_required is True:
        return "fee"
    if fee_required is False:
        return "free"
    return ""


def _candidate_title(candidate: dict[str, Any]) -> str:
    return str(candidate.get("normalized_title") or candidate.get("source_title") or "").strip()


def _candidate_movie_title(candidate: dict[str, Any]) -> str:
    return str(candidate.get("movie_title") or candidate.get("normalized_movie_title") or "").strip()


def _candidate_summary(candidate: dict[str, Any]) -> dict[str, Any]:
    title = _candidate_title(candidate)
    movie_title = _candidate_movie_title(candidate)
    schedule = _schedule_value(candidate)
    location = _location_value(candidate)
    display_label = (
        title
        or movie_title
        or schedule
        or location
        or str(candidate.get("candidate_id") or "").strip()
    )
    return {
        "candidate_display_label": display_label or None,
        "candidate_title": title or None,
        "title": title or None,
        "candidate_movie_title": movie_title or None,
        "candidate_schedule": schedule or None,
        "candidate_location": location or None,
        "candidate_fee_required": candidate.get("fee_required"),
    }


def _existing_gold_by_key(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_key: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = _comparison_key(row)
        if key and key not in by_key:
            by_key[key] = row
    return by_key


def _field_comparison(candidate_value: str, existing_value: str) -> dict[str, Any]:
    return {
        "candidate": candidate_value,
        "existing": existing_value,
        "changed": " ".join(candidate_value.lower().split()) != " ".join(existing_value.lower().split()),
    }


def _existing_gold_comparison(
    candidate: dict[str, Any],
    existing_gold_by_key: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    key = _comparison_key(candidate)
    existing = existing_gold_by_key.get(key)
    if not key or existing is None:
        return {"matched": False, "match_key": key or None, "fields": {}}
    return {
        "matched": True,
        "match_key": key,
        "fields": {
            "title": _field_comparison(_candidate_title(candidate), str(existing.get("title") or "").strip()),
            "schedule": _field_comparison(_schedule_value(candidate), _schedule_value(existing)),
            "location": _field_comparison(_location_value(candidate), _location_value(existing)),
            "price": _field_comparison(_price_value(candidate), _price_value(existing)),
        },
    }


def _engine_text(evidence: dict[str, Any], index: int) -> str | None:
    engines = evidence.get("engines")
    if not isinstance(engines, list) or len(engines) <= index or not isinstance(engines[index], dict):
        return None
    return engines[index].get("text")


def _first_reviewable_evidence(evidence_by_field: dict[str, Any]) -> dict[str, Any]:
    for field_name in ("title", "movie_title", "schedule", "location", "price", "fee", "region"):
        evidence = evidence_by_field.get(field_name)
        if not isinstance(evidence, dict):
            continue
        source = evidence.get("source") if isinstance(evidence.get("source"), dict) else {}
        if _has_review_artifacts(source):
            return evidence
    return {}


def _source_id(row: dict[str, Any]) -> str:
    return str(
        row.get("source_document_id") or row.get("source_id") or row.get("id") or row.get("document_id") or ""
    ).strip()


def _source_hash(row: dict[str, Any]) -> str:
    return str(row.get("content_sha256") or row.get("source_sha256") or row.get("documentHash") or "").strip()


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _local_path(path: Any) -> Path | None:
    path_text = str(path or "").strip()
    if not path_text or "://" in path_text or path_text.startswith("data:"):
        return None
    candidate_path = Path(path_text)
    return candidate_path if candidate_path.is_absolute() else Path.cwd() / candidate_path


def _slug_fragment(value: Any) -> str:
    fragment = "".join(char.lower() if char.isalnum() else "-" for char in str(value or "").strip())
    return "-".join(part for part in fragment.split("-") if part) or "unknown"


def _has_review_artifacts(source: dict[str, Any]) -> bool:
    return bool(
        source.get("page_image_sha256")
        and (source.get("crop_storage_path") or source.get("crop_path"))
        and source.get("crop_sha256")
    )


def _lineage_fields(source: dict[str, Any]) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    for key in ("pipeline_version", "config_hash", "runtime_lineage", "snapshot_path"):
        value = source.get(key)
        if value not in (None, ""):
            fields[key] = value
    return fields


def _unreviewable_candidate_task(
    candidate: dict[str, Any],
    *,
    index: int,
    findings: list[str],
    field_name: str | None,
) -> dict[str, Any]:
    visible_findings = list(dict.fromkeys([*findings, "missing_reviewable_evidence"]))
    selected_evidence = _field_evidence(candidate, field_name)
    return {
        "task_id": str(candidate.get("candidate_id") or f"vision-v3-unreviewable-{index:04d}"),
        "candidate_id": candidate.get("candidate_id"),
        "task_type": "unreviewable_candidate",
        "field": field_name,
        **_candidate_summary(candidate),
        "source_document_id": candidate.get("source_document_id"),
        "content_sha256": candidate.get("content_sha256"),
        **_lineage_fields(candidate),
        "calendar_group_key": candidate.get("calendar_group_key"),
        "candidate_type": candidate.get("candidate_type"),
        "page_number": None,
        "page_image": None,
        "page_image_sha256": None,
        "field_crop": None,
        "field_crop_sha256": None,
        "field_bbox": None,
        "primary_text": None,
        "secondary_text": None,
        "candidate_value": candidate.get("source_title") or candidate.get("schedule_raw"),
        "normalized_value": None,
        "validation_findings": visible_findings,
        "source_metadata": _source_metadata(candidate),
        "selected_field_evidence": selected_evidence,
        "candidate": candidate,
    }


def _candidate_review_task(
    candidate: dict[str, Any],
    *,
    index: int,
    findings: list[str],
    field_name: str | None,
    task_id: str | None = None,
) -> dict[str, Any]:
    evidence = _field_evidence(candidate, field_name)
    source = _region_source(candidate, field_name)
    region_source = _region_source(candidate, "region")
    if not _has_review_artifacts(source):
        return _unreviewable_candidate_task(
            candidate,
            index=index,
            findings=findings,
            field_name=field_name,
        )
    page_image_sha256 = source.get("page_image_sha256") or region_source.get("page_image_sha256")
    page_image_path = (
        source.get("page_image_path")
        or region_source.get("page_image_path")
        or _page_image_path(candidate, page_image_sha256)
    )
    return {
        "task_id": task_id or str(candidate.get("candidate_id") or f"vision-v3-review-{index:04d}"),
        "candidate_id": candidate.get("candidate_id"),
        "task_type": _task_type(findings),
        "field": field_name,
        **_candidate_summary(candidate),
        "source_document_id": candidate.get("source_document_id"),
        "content_sha256": candidate.get("content_sha256"),
        **_lineage_fields(candidate),
        "calendar_group_key": candidate.get("calendar_group_key"),
        "candidate_type": candidate.get("candidate_type"),
        "page_number": source.get("page_number"),
        "page_image": page_image_sha256,
        "page_image_sha256": page_image_sha256,
        "page_image_path": page_image_path,
        "region_crop": region_source.get("crop_storage_path") or region_source.get("crop_path"),
        "region_crop_sha256": region_source.get("crop_sha256"),
        "field_crop": source.get("crop_storage_path") or source.get("crop_path"),
        "field_crop_sha256": source.get("crop_sha256"),
        "field_bbox": source.get("bbox_px"),
        "primary_text": _engine_text(evidence, 0),
        "secondary_text": _engine_text(evidence, 1),
        "candidate_value": evidence.get("raw_value") or candidate.get("source_title") or candidate.get("schedule_raw"),
        "normalized_value": evidence.get("normalized_value"),
        "validation_findings": findings,
        "source_metadata": _source_metadata(candidate),
        "selected_field_evidence": evidence,
        "candidate": candidate,
    }


def _source_status_review_tasks(
    source_statuses: list[dict[str, Any]],
    *,
    source_inventory_by_hash: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for index, status in enumerate(source_statuses, start=1):
        task_type = str(status.get("status") or "")
        if task_type not in SOURCE_STATUS_REVIEW_TASK_TYPES:
            continue
        source_id = _source_id(status)
        source_hash = _source_hash(status)
        identifier = source_id or source_hash or f"{index:04d}"
        message = str(status.get("message") or task_type)
        tasks.append(
            {
                "task_id": f"source-{task_type.replace('_', '-')}-{identifier}",
                "task_type": task_type,
                "field": None,
                "source_document_id": source_id or None,
                "content_sha256": source_hash or None,
                **_lineage_fields(status),
                "calendar_group_key": status.get("calendar_group_key"),
                "candidate_type": "source",
                "page_number": None,
                "page_image": None,
                "field_crop": None,
                "field_crop_sha256": None,
                "field_bbox": None,
                "primary_text": None,
                "secondary_text": None,
                "candidate_value": None,
                "normalized_value": None,
                "validation_findings": [message],
                "source_metadata": _merged_source_metadata(status, source_inventory_by_hash),
                "snapshot_path": status.get("snapshot_path"),
                "source_status": status,
            }
        )
    return tasks


def _gold_conflict_review_tasks(
    gold_conflicts: list[dict[str, Any]],
    *,
    existing_gold_by_key: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for index, conflict in enumerate(gold_conflicts, start=1):
        calendar_group_key = str(conflict.get("calendar_group_key") or "").strip()
        canonical_slug = str(conflict.get("canonical_slug") or "").strip()
        source_hash = str(conflict.get("source_sha256") or "").strip()
        identifier = "-".join(
            part for part in (calendar_group_key, canonical_slug, source_hash[:12] or f"{index:04d}") if part
        )
        fields = [str(field) for field in conflict.get("fields") or [] if str(field)]
        comparison_row = {
            "calendar_group_key": calendar_group_key,
            "canonical_slug": canonical_slug,
            "source_sha256": source_hash,
        }
        tasks.append(
            {
                "task_id": f"gold-conflict-{identifier}",
                "task_type": "gold_conflict",
                "field": None,
                "source_document_id": conflict.get("source_document_id"),
                "content_sha256": source_hash or None,
                "calendar_group_key": calendar_group_key or None,
                "candidate_type": "gold_conflict",
                "page_number": None,
                "page_image": None,
                "field_crop": None,
                "field_crop_sha256": None,
                "field_bbox": None,
                "primary_text": None,
                "secondary_text": None,
                "candidate_value": None,
                "normalized_value": None,
                "validation_findings": [f"gold_conflict:{field}" for field in fields] or ["gold_conflict"],
                "existing_gold_comparison": _existing_gold_comparison(comparison_row, existing_gold_by_key),
                "gold_conflict": conflict,
            }
        )
    return tasks


def _source_drift_source_reports(source_drift_report: dict[str, Any]) -> list[dict[str, Any]]:
    source_reports = source_drift_report.get("source_reports")
    if isinstance(source_reports, list):
        return [report for report in source_reports if isinstance(report, dict)]
    return [source_drift_report]


def _source_drift_task(
    *,
    source_report: dict[str, Any],
    task_suffix: str,
    field: str | None,
    finding: str,
    candidate_value: Any = None,
    normalized_value: Any = None,
    source_drift: dict[str, Any] | None = None,
) -> dict[str, Any]:
    calendar_group_key = str(source_report.get("calendar_group_key") or "unknown").strip()
    source_document_id = _source_id(source_report)
    source_fragment = f"-{_slug_fragment(source_document_id)}" if source_document_id else ""
    new_hash = str(source_report.get("new_hash") or "").strip()
    source_drift_evidence = source_drift if isinstance(source_drift, dict) else {}
    page_image_sha256 = (
        source_drift_evidence.get("page_image_sha256")
        or source_drift_evidence.get("canonical_image_sha256")
    )
    page_image_path = (
        source_drift_evidence.get("page_image_path")
        or source_drift_evidence.get("canonical_image_path")
        or source_drift_evidence.get("canonical_image_storage_path")
    )
    field_crop = (
        source_drift_evidence.get("field_crop")
        or source_drift_evidence.get("crop_storage_path")
        or source_drift_evidence.get("crop_path")
    )
    field_crop_sha256 = (
        source_drift_evidence.get("field_crop_sha256")
        or source_drift_evidence.get("crop_sha256")
    )
    return {
        "task_id": f"source-drift-{_slug_fragment(calendar_group_key)}{source_fragment}-{task_suffix}",
        "task_type": "source_changed",
        "field": field,
        "source_document_id": source_document_id or None,
        "content_sha256": new_hash or None,
        "calendar_group_key": calendar_group_key or None,
        "candidate_type": "source_drift",
        "page_number": source_drift_evidence.get("page_number"),
        "page_image": page_image_sha256,
        "page_image_sha256": page_image_sha256,
        "page_image_path": page_image_path,
        "field_crop": field_crop,
        "field_crop_sha256": field_crop_sha256,
        "field_bbox": source_drift_evidence.get("bbox_px"),
        "primary_text": source_drift_evidence.get("text"),
        "secondary_text": None,
        "candidate_value": candidate_value,
        "normalized_value": normalized_value,
        "validation_findings": [finding],
        "source_metadata": _source_metadata(source_report),
        "source_drift": source_drift,
        "source_drift_report": source_report,
    }


def _source_drift_blocker_context(source_report: dict[str, Any], blocker_name: str) -> dict[str, Any]:
    context: dict[str, Any] = {"publish_blocker": blocker_name}
    for key in (
        "old_activity_count",
        "new_activity_count",
        "old_movie_count",
        "new_movie_count",
        "old_document_family",
        "new_document_family",
    ):
        value = source_report.get(key)
        if value is not None and value != "":
            context[key] = value
    if blocker_name == "activity_count_drift":
        context["old_count"] = source_report.get("old_activity_count")
        context["new_count"] = source_report.get("new_activity_count")
    elif blocker_name == "movie_count_drift":
        context["old_count"] = source_report.get("old_movie_count")
        context["new_count"] = source_report.get("new_movie_count")
    elif blocker_name == "recognized_family_changed":
        context["old_family"] = source_report.get("old_document_family")
        context["new_family"] = source_report.get("new_document_family")
    elif blocker_name in {"source_hash_changed", "hash_changed"}:
        context["old_hash"] = source_report.get("old_hash")
        context["new_hash"] = source_report.get("new_hash")
    return {key: value for key, value in context.items() if value is not None and value != ""}


def _source_drift_blocker_normalized_value(blocker_context: dict[str, Any]) -> dict[str, Any]:
    if "old_count" in blocker_context or "new_count" in blocker_context:
        return {
            "old_count": blocker_context.get("old_count"),
            "new_count": blocker_context.get("new_count"),
        }
    if "old_family" in blocker_context or "new_family" in blocker_context:
        return {
            "old_family": blocker_context.get("old_family"),
            "new_family": blocker_context.get("new_family"),
        }
    if "old_hash" in blocker_context or "new_hash" in blocker_context:
        return {
            "old_hash": blocker_context.get("old_hash"),
            "new_hash": blocker_context.get("new_hash"),
        }
    return {"publish_blocker": blocker_context.get("publish_blocker")}


def _source_drift_review_tasks(source_drift_report: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not source_drift_report or source_drift_report.get("status") in {None, "clean"}:
        return []
    tasks: list[dict[str, Any]] = []
    for source_report in _source_drift_source_reports(source_drift_report):
        if source_report.get("status") in {None, "clean"} and not source_report.get("publish_blockers"):
            continue
        first_v3_baseline = source_report.get("baseline_mode") == "first_v3_baseline"
        for field_name, report_key in (
            ("schedule", "changed_schedules"),
            ("location", "changed_locations"),
            ("price", "changed_fees"),
        ):
            changes = source_report.get(report_key)
            if not isinstance(changes, list):
                continue
            for index, change in enumerate(changes, start=1):
                if not isinstance(change, dict):
                    continue
                canonical_slug = str(change.get("canonical_slug") or f"{field_name}-{index}").strip()
                tasks.append(
                    _source_drift_task(
                        source_report=source_report,
                        task_suffix=f"{field_name}-{_slug_fragment(canonical_slug)}",
                        field=field_name,
                        finding=f"source_changed:{field_name}",
                        candidate_value=change.get("new"),
                        normalized_value=change.get("new"),
                        source_drift=change,
                    )
                )
        detailed_new_titles: set[str] = set()
        for title_detail in source_report.get("new_title_details") or []:
            if not isinstance(title_detail, dict):
                continue
            title = str(title_detail.get("title") or title_detail.get("canonical_slug") or "").strip()
            if not title:
                continue
            detailed_new_titles.add(title)
            if not first_v3_baseline:
                tasks.append(
                    _source_drift_task(
                        source_report=source_report,
                        task_suffix=f"new-title-{_slug_fragment(title)}",
                        field="title",
                        finding="source_changed:new_title",
                        candidate_value=title,
                        normalized_value=title,
                        source_drift=title_detail,
                    )
                )
        for title in source_report.get("new_titles") or []:
            if title in detailed_new_titles:
                continue
            if not first_v3_baseline:
                tasks.append(
                    _source_drift_task(
                        source_report=source_report,
                        task_suffix=f"new-title-{_slug_fragment(title)}",
                        field="title",
                        finding="source_changed:new_title",
                        candidate_value=title,
                        normalized_value=title,
                        source_drift={"title": title},
                    )
                )
        detailed_removed_titles: set[str] = set()
        for title_detail in source_report.get("removed_title_details") or []:
            if not isinstance(title_detail, dict):
                continue
            title = str(title_detail.get("title") or title_detail.get("canonical_slug") or "").strip()
            if not title:
                continue
            detailed_removed_titles.add(title)
            tasks.append(
                _source_drift_task(
                    source_report=source_report,
                    task_suffix=f"removed-title-{_slug_fragment(title)}",
                    field="title",
                    finding="source_changed:removed_title",
                    candidate_value=None,
                    normalized_value=None,
                    source_drift=title_detail,
                )
            )
        for title in source_report.get("removed_titles") or []:
            if title in detailed_removed_titles:
                continue
            tasks.append(
                _source_drift_task(
                    source_report=source_report,
                    task_suffix=f"removed-title-{_slug_fragment(title)}",
                    field="title",
                    finding="source_changed:removed_title",
                    candidate_value=None,
                    normalized_value=None,
                    source_drift={"title": title},
                )
            )
        for region in source_report.get("new_unknown_regions") or []:
            if not isinstance(region, dict):
                continue
            region_id = region.get("region_id") or len(tasks) + 1
            tasks.append(
                _source_drift_task(
                    source_report=source_report,
                    task_suffix=f"unknown-region-{_slug_fragment(region_id)}",
                    field=None,
                    finding="source_changed:new_unknown_region",
                    candidate_value=region.get("text"),
                    source_drift=region,
                )
            )
        validation_failures = source_report.get("validation_failures") or []
        for failure in validation_failures:
            if not isinstance(failure, dict):
                continue
            candidate_id = failure.get("candidate_id") or failure.get("canonical_slug") or len(tasks) + 1
            findings = [str(finding) for finding in failure.get("validation_findings") or []]
            tasks.append(
                _source_drift_task(
                    source_report=source_report,
                    task_suffix=f"validation-failure-{_slug_fragment(candidate_id)}",
                    field=None,
                    finding="source_changed:validation_failure",
                    candidate_value=failure.get("title"),
                    normalized_value=findings,
                    source_drift=failure,
                )
            )
        for blocker in source_report.get("publish_blockers") or []:
            blocker_name = str(blocker)
            if blocker_name == "validation_failures" and validation_failures:
                continue
            blocker_context = _source_drift_blocker_context(source_report, blocker_name)
            tasks.append(
                _source_drift_task(
                    source_report=source_report,
                    task_suffix=f"blocker-{_slug_fragment(blocker_name)}",
                    field=None,
                    finding=f"source_changed:{blocker_name}",
                    candidate_value=blocker_name,
                    normalized_value=_source_drift_blocker_normalized_value(blocker_context),
                    source_drift=blocker_context,
                )
            )
    return tasks


def _dual_run_field_diff_review_tasks(
    dual_run_report: dict[str, Any],
    *,
    source_inventory_by_hash: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for index, diff in enumerate(dual_run_report.get("field_diffs") or [], start=1):
        if not isinstance(diff, dict) or diff.get("reviewed") is True:
            continue
        diff_key = str(diff.get("diff_key") or f"diff-{index}").strip()
        field_name = str(diff.get("field") or "").strip() or None
        evidence = diff.get("v3_field_evidence") if isinstance(diff.get("v3_field_evidence"), dict) else {}
        source = evidence.get("source") if isinstance(evidence.get("source"), dict) else {}
        content_sha256 = source.get("content_sha256") or diff.get("content_sha256")
        field_crop = source.get("crop_storage_path") or source.get("crop_path")
        task_suffix = "-".join(_slug_fragment(part) for part in diff_key.split(":"))
        tasks.append(
            {
                "task_id": f"dual-run-diff-{task_suffix}",
                "task_type": "gold_conflict",
                "field": field_name,
                "source_document_id": diff.get("source_document_id"),
                "content_sha256": content_sha256,
                **_lineage_fields(diff),
                "calendar_group_key": diff.get("calendar_group_key"),
                "canonical_slug": diff.get("canonical_slug"),
                "review_key": diff_key,
                "candidate_type": "dual_run_diff",
                "page_number": source.get("page_number"),
                "page_image": source.get("page_image_sha256"),
                "page_image_sha256": source.get("page_image_sha256"),
                "page_image_path": source.get("page_image_path"),
                "field_crop": field_crop,
                "field_crop_sha256": source.get("crop_sha256"),
                "field_bbox": source.get("bbox_px"),
                "primary_text": _engine_text(evidence, 0),
                "secondary_text": _engine_text(evidence, 1),
                "candidate_value": diff.get("v3_value"),
                "normalized_value": diff.get("v3_value"),
                "validation_findings": [f"gold_conflict:v2_v3:{field_name or 'field'}"],
                "publish_gate_blocker": True,
                "publish_gate_blocker_reason": "unreviewed_v2_v3_field_diffs",
                "source_metadata": _source_metadata_for_hash(content_sha256, source_inventory_by_hash),
                "source_drift": {"old": diff.get("v2_value"), "new": diff.get("v3_value")},
                "dual_run_diff": diff,
                "dual_run_report": dual_run_report,
            }
        )
    return tasks


def _dual_run_status_transition_review_tasks(
    dual_run_report: dict[str, Any],
    *,
    source_inventory_by_hash: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    unreviewed = {
        str(key)
        for key in dual_run_report.get("unreviewed_status_transition_keys") or []
        if str(key).strip()
    }
    tasks: list[dict[str, Any]] = []
    for index, transition in enumerate(dual_run_report.get("status_transitions") or [], start=1):
        if not isinstance(transition, dict):
            continue
        transition_key = str(transition.get("transition_key") or f"transition-{index}").strip()
        if transition.get("reviewed") is True or (unreviewed and transition_key not in unreviewed):
            continue
        task_suffix = "-".join(_slug_fragment(part) for part in transition_key.split(":"))
        tasks.append(
            {
                "task_id": f"dual-run-status-{task_suffix}",
                "task_type": "manual_review_required",
                "field": "status_transition",
                "source_document_id": transition.get("source_document_id"),
                "content_sha256": transition.get("content_sha256"),
                **_lineage_fields(transition),
                "calendar_group_key": transition.get("calendar_group_key"),
                "canonical_slug": transition.get("canonical_slug"),
                "review_key": transition_key,
                "candidate_type": "dual_run_status_transition",
                "page_number": None,
                "page_image": None,
                "field_crop": None,
                "field_crop_sha256": None,
                "field_bbox": None,
                "primary_text": transition.get("from_status"),
                "secondary_text": transition.get("to_status"),
                "candidate_value": transition.get("to_status"),
                "normalized_value": transition_key,
                "validation_findings": ["manual_review_required:status_transition"],
                "publish_gate_blocker": True,
                "publish_gate_blocker_reason": "unreviewed_v3_status_transitions",
                "source_metadata": _source_metadata_for_hash(transition.get("content_sha256"), source_inventory_by_hash),
                "dual_run_status_transition": transition,
                "dual_run_report": dual_run_report,
            }
        )
    return tasks


def _dual_run_new_record_review_tasks(
    dual_run_report: dict[str, Any],
    *,
    source_inventory_by_hash: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    unreviewed = {
        str(key)
        for key in dual_run_report.get("unreviewed_new_keys") or []
        if str(key).strip()
    }
    tasks: list[dict[str, Any]] = []
    for index, record in enumerate(dual_run_report.get("new_v3_records") or [], start=1):
        if not isinstance(record, dict):
            continue
        row_key = str(record.get("row_key") or "").strip()
        review_key = str(record.get("review_key") or f"{row_key}:new_record" or f"new-record-{index}").strip()
        if record.get("reviewed") is True or (unreviewed and row_key not in unreviewed):
            continue
        evidence_by_field = record.get("v3_field_evidence") if isinstance(record.get("v3_field_evidence"), dict) else {}
        evidence = _first_reviewable_evidence(evidence_by_field)
        source = evidence.get("source") if isinstance(evidence.get("source"), dict) else {}
        page_image_sha256 = source.get("page_image_sha256")
        field_crop = source.get("crop_storage_path") or source.get("crop_path")
        task_suffix = "-".join(_slug_fragment(part) for part in review_key.split(":"))
        tasks.append(
            {
                "task_id": f"dual-run-new-{task_suffix}",
                "task_type": "manual_review_required",
                "field": "new_record",
                "source_document_id": record.get("source_document_id"),
                "content_sha256": record.get("content_sha256"),
                **_lineage_fields(record),
                "calendar_group_key": record.get("calendar_group_key"),
                "canonical_slug": record.get("canonical_slug"),
                "review_key": review_key,
                "candidate_type": "dual_run_new_record",
                "page_number": source.get("page_number"),
                "page_image": page_image_sha256,
                "page_image_sha256": page_image_sha256,
                "page_image_path": source.get("page_image_path"),
                "field_crop": field_crop,
                "field_crop_sha256": source.get("crop_sha256"),
                "field_bbox": source.get("bbox_px"),
                "primary_text": _engine_text(evidence, 0) or record.get("title"),
                "secondary_text": record.get("canonical_slug"),
                "candidate_value": record.get("title") or record.get("canonical_slug"),
                "normalized_value": review_key,
                "validation_findings": ["manual_review_required:new_record"],
                "publish_gate_blocker": True,
                "publish_gate_blocker_reason": "unreviewed_new_v3_rows",
                "source_metadata": _source_metadata_for_hash(record.get("content_sha256"), source_inventory_by_hash),
                "dual_run_new_record": record,
                "dual_run_report": dual_run_report,
            }
        )
    return tasks


def _missing_v2_visual_artifacts(record: dict[str, Any]) -> dict[str, Any]:
    page_image_path = str(record.get("page_image_path") or "").strip()
    page_path = _local_path(page_image_path)
    artifacts: dict[str, Any] = {
        "page_image_sha256": record.get("page_image_sha256"),
        "field_crop": record.get("field_crop"),
        "field_crop_sha256": record.get("field_crop_sha256"),
    }
    if page_path is None or not page_path.exists():
        return artifacts
    if not artifacts["page_image_sha256"]:
        artifacts["page_image_sha256"] = _sha256_file(page_path)
    if artifacts["field_crop"] and artifacts["field_crop_sha256"]:
        return artifacts
    bbox = record.get("field_bbox")
    if not isinstance(bbox, list) or len(bbox) != 4:
        artifacts["field_crop"] = page_image_path
        artifacts["field_crop_sha256"] = artifacts["page_image_sha256"]
        return artifacts
    try:
        left, top, right, bottom = [float(value) for value in bbox]
    except (TypeError, ValueError):
        artifacts["field_crop"] = page_image_path
        artifacts["field_crop_sha256"] = artifacts["page_image_sha256"]
        return artifacts
    try:
        from PIL import Image
    except ImportError:
        return artifacts
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=Image.DecompressionBombWarning)
        image_context = Image.open(page_path)
    with image_context as image:
        width, height = image.size
        crop_box = (
            max(0, min(width, int(left))),
            max(0, min(height, int(top))),
            max(0, min(width, int(right))),
            max(0, min(height, int(bottom))),
        )
        if crop_box[2] <= crop_box[0] or crop_box[3] <= crop_box[1]:
            artifacts["field_crop"] = page_image_path
            artifacts["field_crop_sha256"] = artifacts["page_image_sha256"]
            return artifacts
        source_hash = str(record.get("content_sha256") or "unknown-source").strip() or "unknown-source"
        crop_slug = _slug_fragment(record.get("review_key") or record.get("row_key") or record.get("canonical_slug"))
        crop_path = PROCESSED_DIR / "field_crops_v3" / source_hash / "missing-v2" / f"{crop_slug}.png"
        crop_path.parent.mkdir(parents=True, exist_ok=True)
        image.crop(crop_box).save(crop_path)
    artifacts["field_crop"] = str(crop_path)
    artifacts["field_crop_sha256"] = _sha256_file(crop_path)
    return artifacts


def _dual_run_missing_v2_record_review_tasks(
    dual_run_report: dict[str, Any],
    *,
    source_inventory_by_hash: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for index, record in enumerate(dual_run_report.get("missing_v2_records") or [], start=1):
        if not isinstance(record, dict):
            continue
        if record.get("reviewed") is True:
            continue
        row_key = str(record.get("row_key") or "").strip()
        review_key = str(record.get("review_key") or f"{row_key}:missing_v2_record" or f"missing-v2-{index}").strip()
        task_suffix = "-".join(_slug_fragment(part) for part in review_key.split(":"))
        v2_value = record.get("v2_value") if isinstance(record.get("v2_value"), dict) else {}
        visual_artifacts = _missing_v2_visual_artifacts(record)
        tasks.append(
            {
                "task_id": f"dual-run-missing-v2-{task_suffix}",
                "task_type": "manual_review_required",
                "field": "missing_v2_record",
                "source_document_id": record.get("source_document_id"),
                "content_sha256": record.get("content_sha256"),
                **_lineage_fields(record),
                "calendar_group_key": record.get("calendar_group_key"),
                "canonical_slug": record.get("canonical_slug"),
                "review_key": review_key,
                "candidate_type": "dual_run_missing_v2_record",
                "page_number": record.get("page_number"),
                "page_image": visual_artifacts.get("page_image_sha256"),
                "page_image_sha256": visual_artifacts.get("page_image_sha256"),
                "page_image_path": record.get("page_image_path"),
                "field_crop": visual_artifacts.get("field_crop"),
                "field_crop_sha256": visual_artifacts.get("field_crop_sha256"),
                "field_bbox": record.get("field_bbox"),
                "primary_text": record.get("title") or v2_value.get("title"),
                "secondary_text": record.get("canonical_slug"),
                "candidate_value": record.get("title") or record.get("canonical_slug"),
                "normalized_value": review_key,
                "validation_findings": ["manual_review_required:missing_v2_record"],
                "publish_gate_blocker": True,
                "publish_gate_blocker_reason": "v3_missing_v2_rows",
                "source_metadata": _source_metadata_for_hash(record.get("content_sha256"), source_inventory_by_hash)
                or _source_metadata({"canonical_url": record.get("source_url"), "fetched_url": record.get("source_url")}),
                "source_drift": {"old": v2_value, "new": None},
                "dual_run_missing_v2_record": record,
                "dual_run_report": dual_run_report,
            }
        )
    return tasks


def _dual_run_review_tasks(
    dual_run_report: dict[str, Any] | None,
    *,
    source_inventory_by_hash: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    if not dual_run_report or dual_run_report.get("status") in {None, "clean"}:
        return []
    return [
        *_dual_run_field_diff_review_tasks(dual_run_report, source_inventory_by_hash=source_inventory_by_hash),
        *_dual_run_status_transition_review_tasks(dual_run_report, source_inventory_by_hash=source_inventory_by_hash),
        *_dual_run_new_record_review_tasks(dual_run_report, source_inventory_by_hash=source_inventory_by_hash),
        *_dual_run_missing_v2_record_review_tasks(dual_run_report, source_inventory_by_hash=source_inventory_by_hash),
    ]


def _current_review_decisions_by_task(review_decisions: list[dict[str, Any]] | None) -> dict[str, dict[str, Any]]:
    decisions_by_task: dict[str, dict[str, Any]] = {}
    for decision in review_decisions or []:
        if not isinstance(decision, dict) or decision.get("decision") not in {"approve", "edit", "reject"}:
            continue
        task_id = str(decision.get("task_id") or "").strip()
        if not task_id:
            continue
        current = decisions_by_task.get(task_id)
        if current is None or str(decision.get("decided_at") or "") >= str(current.get("decided_at") or ""):
            decisions_by_task[task_id] = decision
    return decisions_by_task


def _review_decision_stale_reasons(task: dict[str, Any], decision: dict[str, Any]) -> list[str]:
    stale_reasons: list[str] = []
    schema_version = str(decision.get("schema_version") or "").strip()
    if not schema_version:
        stale_reasons.append("missing_review_decision_schema_version")
    elif schema_version != "review_decision_v3_001":
        stale_reasons.append("invalid_review_decision_schema_version")
    reason = " ".join(str(decision.get("reason") or "").strip().lower().split())
    if reason in PLACEHOLDER_REVIEW_REASONS:
        stale_reasons.append("placeholder_review_reason")
    if decision.get("decision") in {"approve", "edit"} and task.get("field"):
        approved_fields = decision.get("approved_fields")
        if not isinstance(approved_fields, dict) or not approved_fields:
            stale_reasons.append("missing_approved_fields")
    checks = (
        ("content_sha256", "content_sha256"),
        ("page_image_sha256", "page_image_sha256"),
        ("field_crop_sha256", "field_crop_sha256"),
    )
    for task_key, decision_key in checks:
        task_value = str(task.get(task_key) or "").strip()
        if not task_value:
            continue
        decision_value = str(decision.get(decision_key) or "").strip()
        if not decision_value:
            stale_reasons.append(f"missing_review_{decision_key}")
        elif decision_value != task_value:
            stale_reasons.append(f"mismatched_review_{decision_key}")
    return stale_reasons


def _review_decision_summary(decision: dict[str, Any]) -> dict[str, Any]:
    return {
        "decision": decision.get("decision"),
        "reviewer": decision.get("reviewer"),
        "reason": decision.get("reason"),
        "decided_at": decision.get("decided_at"),
        "content_sha256": decision.get("content_sha256"),
        "page_image_sha256": decision.get("page_image_sha256"),
        "field_crop_sha256": decision.get("field_crop_sha256"),
    }


def _apply_review_decision_status(tasks: list[dict[str, Any]], review_decisions: list[dict[str, Any]] | None) -> None:
    decisions_by_task = _current_review_decisions_by_task(review_decisions)
    for task in tasks:
        task.setdefault("status", "pending")
        task_id = str(task.get("task_id") or "").strip()
        decision = decisions_by_task.get(task_id)
        if not decision:
            continue
        stale_reasons = _review_decision_stale_reasons(task, decision)
        if stale_reasons:
            task["stale_review_decision"] = {
                **_review_decision_summary(decision),
                "stale_reasons": stale_reasons,
            }
            continue
        task["status"] = "reviewed"
        task["review_decision_status"] = decision.get("decision")
        task["review_decision"] = _review_decision_summary(decision)


def build_review_tasks(
    candidates: list[dict[str, Any]],
    *,
    source_statuses: list[dict[str, Any]] | None = None,
    existing_gold_rows: list[dict[str, Any]] | None = None,
    gold_conflicts: list[dict[str, Any]] | None = None,
    source_drift_report: dict[str, Any] | None = None,
    dual_run_report: dict[str, Any] | None = None,
    source_inventory: list[dict[str, Any]] | None = None,
    review_decisions: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    source_inventory_by_hash = _source_inventory_by_hash(source_inventory)
    existing_gold_by_key = _existing_gold_by_key(existing_gold_rows or [])
    for index, candidate in enumerate(candidates, start=1):
        if candidate.get("validation_status") not in {"needs_review", "parser_error", "source_error"}:
            continue
        findings = [str(finding) for finding in candidate.get("validation_findings") or []]
        split_findings = _field_specific_findings(findings)
        if split_findings:
            base_task_id = str(candidate.get("candidate_id") or f"vision-v3-review-{index:04d}")
            for field_name, field_findings in split_findings:
                task = _candidate_review_task(
                    candidate,
                    index=index,
                    findings=field_findings,
                    field_name=field_name,
                    task_id=f"{base_task_id}-{_slug_fragment(field_name)}",
                )
                task["existing_gold_comparison"] = _existing_gold_comparison(candidate, existing_gold_by_key)
                tasks.append(task)
            continue

        field_name = _field_from_findings(findings)
        task = _candidate_review_task(
            candidate,
            index=index,
            findings=findings,
            field_name=field_name,
        )
        task["existing_gold_comparison"] = _existing_gold_comparison(candidate, existing_gold_by_key)
        tasks.append(task)
    tasks.extend(_source_status_review_tasks(source_statuses or [], source_inventory_by_hash=source_inventory_by_hash))
    tasks.extend(_gold_conflict_review_tasks(gold_conflicts or [], existing_gold_by_key=existing_gold_by_key))
    tasks.extend(_source_drift_review_tasks(source_drift_report))
    tasks.extend(_dual_run_review_tasks(dual_run_report, source_inventory_by_hash=source_inventory_by_hash))
    _attach_task_source_urls(tasks)
    _apply_review_decision_status(tasks, review_decisions)
    return tasks


def _count_by_key(tasks: list[dict[str, Any]], key: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for task in tasks:
        value = str(task.get(key) or "").strip()
        if value:
            counts[value] = counts.get(value, 0) + 1
    return dict(sorted(counts.items()))


def _count_by_primary_finding(tasks: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for task in tasks:
        findings = task.get("validation_findings")
        finding = str(findings[0] if isinstance(findings, list) and findings else "").strip()
        if finding:
            counts[finding] = counts.get(finding, 0) + 1
    return dict(sorted(counts.items()))


def _task_ids(tasks: list[dict[str, Any]]) -> list[str]:
    return [
        str(task.get("task_id") or "")
        for task in tasks
        if str(task.get("task_id") or "").strip()
    ]


def _source_url(task: dict[str, Any]) -> str:
    task_source_url = str(task.get("source_url") or "").strip()
    if task_source_url:
        return task_source_url
    source_metadata = task.get("source_metadata") if isinstance(task.get("source_metadata"), dict) else {}
    return str(source_metadata.get("canonical_url") or source_metadata.get("fetched_url") or "").strip()


def _attach_task_source_urls(tasks: list[dict[str, Any]]) -> None:
    for task in tasks:
        source_url = _source_url(task)
        if source_url:
            task["source_url"] = source_url


def _count_by_source_url(tasks: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for task in tasks:
        source_url = _source_url(task)
        if source_url:
            counts[source_url] = counts.get(source_url, 0) + 1
    return dict(sorted(counts.items()))


def _top_calendar_group_blockers(tasks: list[dict[str, Any]], *, limit: int = 10) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for task in tasks:
        calendar_group_key = str(task.get("calendar_group_key") or "").strip()
        if calendar_group_key:
            grouped.setdefault(calendar_group_key, []).append(task)
    rows: list[dict[str, Any]] = []
    for calendar_group_key, group_tasks in grouped.items():
        source_urls = sorted({source_url for task in group_tasks if (source_url := _source_url(task))})
        rows.append(
            {
                "calendar_group_key": calendar_group_key,
                "task_count": len(group_tasks),
                "task_count_by_type": _count_by_key(group_tasks, "task_type"),
                "task_count_by_field": _count_by_key(group_tasks, "field"),
                "source_urls": source_urls,
            }
        )
    rows.sort(key=lambda row: (-int(row["task_count"]), str(row["calendar_group_key"])))
    return rows[:limit]


def _review_workstream(task: dict[str, Any]) -> str:
    field_name = str(task.get("field") or "").strip()
    task_type = str(task.get("task_type") or "").strip()
    findings = task.get("validation_findings") if isinstance(task.get("validation_findings"), list) else []
    primary_finding = str(findings[0] if findings else "").strip()
    if task_type == "gold_conflict" or primary_finding.startswith("gold_conflict:v2_v3:"):
        return "dual_run_field_diff"
    if field_name == "new_record" or primary_finding == "manual_review_required:new_record":
        return "new_v3_record"
    if field_name == "missing_v2_record" or primary_finding == "manual_review_required:missing_v2_record":
        return "missing_v2_record"
    if task_type in {"source_changed", "source_error", "parser_error"} or primary_finding.startswith("source_changed"):
        return "source_or_drift_review"
    return "ocr_or_parser_review"


def _review_workstreams(tasks: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for task in tasks:
        grouped.setdefault(_review_workstream(task), []).append(task)
    rows: dict[str, dict[str, Any]] = {}
    for workstream in (
        "dual_run_field_diff",
        "new_v3_record",
        "missing_v2_record",
        "ocr_or_parser_review",
        "source_or_drift_review",
    ):
        group_tasks = grouped.get(workstream, [])
        if not group_tasks:
            continue
        rows[workstream] = {
            "task_count": len(group_tasks),
            "task_ids": [str(task.get("task_id") or "") for task in group_tasks if str(task.get("task_id") or "").strip()],
            "task_count_by_field": _count_by_key(group_tasks, "field"),
        }
    return rows


def _publish_blocker_batch_key(task: dict[str, Any]) -> str:
    source_url = _source_url(task)
    reason = str(task.get("publish_gate_blocker_reason") or "").strip()
    return f"{source_url} | {reason}" if source_url and reason else ""


def _sorted_publish_blocker_tasks(tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    checklist_tasks = [
        task
        for task in tasks
        if task.get("publish_gate_blocker") is True and task.get("status") != "reviewed"
    ]
    return sorted(
        checklist_tasks,
        key=lambda task: (
            _source_url(task),
            str(task.get("calendar_group_key") or ""),
            str(task.get("publish_gate_blocker_reason") or ""),
            str(task.get("task_id") or ""),
        ),
    )


def _publish_blocker_batches(tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for task in _sorted_publish_blocker_tasks(tasks):
        batch_key = _publish_blocker_batch_key(task)
        if batch_key:
            grouped.setdefault(batch_key, []).append(task)
    rows: list[dict[str, Any]] = []
    for batch_key, batch_tasks in grouped.items():
        source_url, reason = batch_key.split(" | ", 1)
        rows.append(
            {
                "review_batch_key": batch_key,
                "source_url": source_url,
                "publish_gate_blocker_reason": reason,
                "pending_task_count": len(batch_tasks),
                "calendar_group_keys": sorted(
                    {
                        str(task.get("calendar_group_key") or "")
                        for task in batch_tasks
                        if str(task.get("calendar_group_key") or "").strip()
                    }
                ),
                "fields": sorted(
                    {
                        str(task.get("field") or "")
                        for task in batch_tasks
                        if str(task.get("field") or "").strip()
                    }
                ),
                "task_ids": [
                    str(task.get("task_id") or "")
                    for task in batch_tasks
                    if str(task.get("task_id") or "").strip()
                ],
            }
        )
    rows.sort(key=lambda row: (-int(row["pending_task_count"]), str(row["review_batch_key"])))
    return rows


def _has_publish_blocker_review_artifacts(task: dict[str, Any]) -> bool:
    return bool(
        task.get("content_sha256")
        and task.get("page_image_path")
        and (task.get("page_image_sha256") or task.get("page_image"))
        and task.get("field_crop")
        and task.get("field_crop_sha256")
    )


def _publish_gate_blockers(tasks: list[dict[str, Any]]) -> dict[str, Any]:
    blocker_tasks = [task for task in tasks if task.get("publish_gate_blocker") is True]
    pending_blocker_tasks = [task for task in blocker_tasks if task.get("status") != "reviewed"]
    reviewed_blocker_tasks = [task for task in blocker_tasks if task.get("status") == "reviewed"]
    pending_missing_review_artifact_tasks = [
        task for task in pending_blocker_tasks if not _has_publish_blocker_review_artifacts(task)
    ]
    pending_task_ids_by_reason: dict[str, list[str]] = {}
    pending_task_ids_by_source_url: dict[str, list[str]] = {}
    pending_task_count_by_source_url_and_reason: dict[str, dict[str, int]] = {}
    for task in pending_blocker_tasks:
        reason = str(task.get("publish_gate_blocker_reason") or "").strip()
        task_id = str(task.get("task_id") or "").strip()
        if reason and task_id:
            pending_task_ids_by_reason.setdefault(reason, []).append(task_id)
        source_url = _source_url(task)
        if source_url and task_id:
            pending_task_ids_by_source_url.setdefault(source_url, []).append(task_id)
        if source_url and reason:
            by_reason = pending_task_count_by_source_url_and_reason.setdefault(source_url, {})
            by_reason[reason] = by_reason.get(reason, 0) + 1
    return {
        "total_task_count": len(blocker_tasks),
        "pending_task_count": len(pending_blocker_tasks),
        "reviewed_task_count": len(reviewed_blocker_tasks),
        "pending_task_ids": [
            str(task.get("task_id") or "")
            for task in pending_blocker_tasks
            if str(task.get("task_id") or "").strip()
        ],
        "reviewed_task_ids": [
            str(task.get("task_id") or "")
            for task in reviewed_blocker_tasks
            if str(task.get("task_id") or "").strip()
        ],
        "pending_review_artifact_missing_count": len(pending_missing_review_artifact_tasks),
        "pending_review_artifact_missing_task_ids": _task_ids(pending_missing_review_artifact_tasks),
        "all_pending_tasks_have_review_artifacts": not pending_missing_review_artifact_tasks,
        "pending_task_count_by_reason": _count_by_key(pending_blocker_tasks, "publish_gate_blocker_reason"),
        "pending_task_ids_by_reason": pending_task_ids_by_reason,
        "pending_task_count_by_source_url": _count_by_source_url(pending_blocker_tasks),
        "pending_task_ids_by_source_url": dict(sorted(pending_task_ids_by_source_url.items())),
        "pending_task_count_by_source_url_and_reason": {
            source_url: dict(sorted(reason_counts.items()))
            for source_url, reason_counts in sorted(pending_task_count_by_source_url_and_reason.items())
        },
        "total_task_count_by_reason": _count_by_key(blocker_tasks, "publish_gate_blocker_reason"),
    }


def _json_fingerprint_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(key): _json_fingerprint_value(child_value)
            for key, child_value in sorted(value.items(), key=lambda item: str(item[0]))
        }
    if isinstance(value, list):
        return [_json_fingerprint_value(item) for item in value]
    if isinstance(value, tuple):
        return [_json_fingerprint_value(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def review_queue_fingerprint(tasks: list[dict[str, Any]]) -> str:
    normalized_tasks = [
        _json_fingerprint_value(task)
        for task in sorted(
            tasks,
            key=lambda task: (
                str(task.get("task_id") or ""),
                str(task.get("content_sha256") or ""),
                str(task.get("page_image_sha256") or ""),
                str(task.get("field_crop_sha256") or ""),
            ),
        )
    ]
    payload = json.dumps(
        normalized_tasks,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def build_review_queue_report(tasks: list[dict[str, Any]]) -> dict[str, Any]:
    pending_tasks = [task for task in tasks if task.get("status") != "reviewed"]
    publish_gate_blocker_tasks = [task for task in tasks if task.get("publish_gate_blocker") is True]
    pending_publish_gate_blocker_tasks = [
        task for task in publish_gate_blocker_tasks if task.get("status") != "reviewed"
    ]
    reviewed_publish_gate_blocker_tasks = [
        task for task in publish_gate_blocker_tasks if task.get("status") == "reviewed"
    ]
    publish_blocker_checklist_tasks = _sorted_publish_blocker_tasks(tasks)
    publish_blocker_checklist_batch_count = len(
        {
            batch_key
            for batch_key in (
                _publish_blocker_batch_key(task) for task in publish_blocker_checklist_tasks
            )
            if batch_key
        }
    )
    source_url_missing_task_ids = [
        str(task.get("task_id") or "")
        for task in tasks
        if not _source_url(task)
    ]
    source_url_missing_task_ids = [
        task_id for task_id in source_url_missing_task_ids if task_id
    ]
    missing_visual_artifact_task_ids = [
        str(task.get("task_id") or "")
        for task in tasks
        if not (task.get("field_crop") or task.get("page_image_path"))
    ]
    missing_visual_artifact_task_ids = [
        task_id for task_id in missing_visual_artifact_task_ids if task_id
    ]
    missing_visual_artifact_file_task_ids = [
        str(task.get("task_id") or "")
        for task in tasks
        if not _task_has_existing_visual_artifact(task)
    ]
    missing_visual_artifact_file_task_ids = [
        task_id for task_id in missing_visual_artifact_file_task_ids if task_id
    ]
    stale_review_decision_task_ids = [
        str(task.get("task_id") or "")
        for task in tasks
        if isinstance(task.get("stale_review_decision"), dict)
    ]
    stale_review_decision_task_ids = [
        task_id for task_id in stale_review_decision_task_ids if task_id
    ]
    return {
        "report_kind": "review_queue_v3_report",
        "schema_version": "review_queue_v3_report_001",
        "generated_at": _now_iso(),
        "review_queue_fingerprint": review_queue_fingerprint(tasks),
        "summary": {
            "task_count": len(tasks),
            "pending_task_count": sum(1 for task in tasks if task.get("status") == "pending"),
            "reviewed_task_count": sum(1 for task in tasks if task.get("status") == "reviewed"),
            "task_count_by_type": _count_by_key(tasks, "task_type"),
            "task_count_by_status": _count_by_key(tasks, "status"),
            "review_count_by_decision": _count_by_key(tasks, "review_decision_status"),
            "task_count_by_finding": _count_by_primary_finding(tasks),
            "task_count_by_calendar_group": _count_by_key(tasks, "calendar_group_key"),
            "task_count_by_field": _count_by_key(tasks, "field"),
            "task_count_by_source_url": _count_by_source_url(tasks),
            "source_url_missing_count": len(source_url_missing_task_ids),
            "all_tasks_have_source_urls": not source_url_missing_task_ids,
            "visual_artifact_missing_count": len(missing_visual_artifact_task_ids),
            "visual_artifact_missing_file_count": len(missing_visual_artifact_file_task_ids),
            "all_tasks_have_visual_artifacts": not missing_visual_artifact_task_ids,
            "all_tasks_have_existing_visual_artifacts": not missing_visual_artifact_file_task_ids,
            "stale_review_decision_count": len(stale_review_decision_task_ids),
            "publish_gate_blocker_task_count": len(publish_gate_blocker_tasks),
            "pending_publish_gate_blocker_task_count": len(pending_publish_gate_blocker_tasks),
            "reviewed_publish_gate_blocker_task_count": len(reviewed_publish_gate_blocker_tasks),
            "publish_blocker_checklist_row_count": len(publish_blocker_checklist_tasks),
            "publish_blocker_checklist_batch_count": publish_blocker_checklist_batch_count,
            "pending_publish_gate_blocker_count_by_reason": _count_by_key(
                pending_publish_gate_blocker_tasks,
                "publish_gate_blocker_reason",
            ),
        },
        "top_calendar_group_blockers": _top_calendar_group_blockers(pending_tasks),
        "review_workstreams": _review_workstreams(pending_tasks),
        "publish_gate_blockers": _publish_gate_blockers(tasks),
        "publish_blocker_batches": _publish_blocker_batches(tasks),
        "source_url_missing_task_ids": source_url_missing_task_ids,
        "visual_artifact_missing_task_ids": missing_visual_artifact_task_ids,
        "visual_artifact_missing_file_task_ids": missing_visual_artifact_file_task_ids,
        "stale_review_decision_task_ids": stale_review_decision_task_ids,
    }


def build_review_checklist_csv(tasks: list[dict[str, Any]]) -> str:
    output = io.StringIO()
    fieldnames = [
        "checklist_total_pending_task_count",
        "checklist_total_batch_count",
        "source_url",
        "source_pending_task_count",
        "calendar_group_key",
        "publish_gate_blocker_reason",
        "reason_pending_task_count",
        "source_reason_pending_task_count",
        "review_batch_key",
        "review_batch_index",
        "review_batch_task_count",
        "source_task_index",
        "task_id",
        "task_type",
        "field",
        "candidate_title",
        "review_key",
        "content_sha256",
        "page_image_path",
        "page_image_sha256",
        "field_crop",
        "field_crop_sha256",
        "v2_value",
        "v3_value",
        "record_summary",
        "approve_command",
        "edit_command",
        "reject_command",
        "task_anchor",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    checklist_tasks = _sorted_publish_blocker_tasks(tasks)
    checklist_total_pending_task_count = len(checklist_tasks)
    checklist_total_batch_count = len(
        {
            batch_key
            for batch_key in (_publish_blocker_batch_key(task) for task in checklist_tasks)
            if batch_key
        }
    )
    source_counts = _count_by_source_url(checklist_tasks)
    reason_counts = _count_by_key(checklist_tasks, "publish_gate_blocker_reason")
    source_reason_counts: dict[tuple[str, str], int] = {}
    for task in checklist_tasks:
        source_url = _source_url(task)
        reason = str(task.get("publish_gate_blocker_reason") or "").strip()
        if source_url and reason:
            key = (source_url, reason)
            source_reason_counts[key] = source_reason_counts.get(key, 0) + 1
    batch_seen: dict[str, int] = {}
    source_seen: dict[str, int] = {}
    for task in checklist_tasks:
        task_id = str(task.get("task_id") or "").strip()
        source_url = _source_url(task)
        reason = str(task.get("publish_gate_blocker_reason") or "").strip()
        batch_key = _publish_blocker_batch_key(task)
        if batch_key:
            batch_seen[batch_key] = batch_seen.get(batch_key, 0) + 1
        if source_url:
            source_seen[source_url] = source_seen.get(source_url, 0) + 1
        writer.writerow(
            {
                "checklist_total_pending_task_count": checklist_total_pending_task_count,
                "checklist_total_batch_count": checklist_total_batch_count,
                "source_url": source_url,
                "source_pending_task_count": source_counts.get(source_url, 0) if source_url else 0,
                "calendar_group_key": str(task.get("calendar_group_key") or ""),
                "publish_gate_blocker_reason": reason,
                "reason_pending_task_count": reason_counts.get(reason, 0) if reason else 0,
                "source_reason_pending_task_count": source_reason_counts.get((source_url, reason), 0),
                "review_batch_key": batch_key,
                "review_batch_index": batch_seen.get(batch_key, 0) if batch_key else "",
                "review_batch_task_count": source_reason_counts.get((source_url, reason), 0),
                "source_task_index": source_seen.get(source_url, 0) if source_url else "",
                "task_id": task_id,
                "task_type": str(task.get("task_type") or ""),
                "field": str(task.get("field") or ""),
                "candidate_title": _review_task_label(task),
                "review_key": str(task.get("review_key") or ""),
                "content_sha256": str(task.get("content_sha256") or ""),
                "page_image_path": str(task.get("page_image_path") or ""),
                "page_image_sha256": str(task.get("page_image_sha256") or task.get("page_image") or ""),
                "field_crop": str(task.get("field_crop") or ""),
                "field_crop_sha256": str(task.get("field_crop_sha256") or ""),
                "v2_value": _checklist_dual_run_value(task, "v2_value"),
                "v3_value": _checklist_dual_run_value(task, "v3_value"),
                "record_summary": _checklist_record_summary(task),
                "approve_command": _review_command(task, "approve"),
                "edit_command": _review_command(task, "edit"),
                "reject_command": _review_command(task, "reject"),
                "task_anchor": f"#task-{_slug_fragment(task_id)}" if task_id else "",
            }
        )
    return output.getvalue()


def _checklist_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        for key in ("text", "label", "state", "title", "name", "id"):
            nested = value.get(key)
            if nested is not None and str(nested).strip():
                return str(nested)
        return json.dumps(value, sort_keys=True)
    if isinstance(value, list):
        return json.dumps(value, sort_keys=True)
    return str(value)


def _checklist_dual_run_value(task: dict[str, Any], key: str) -> str:
    diff = task.get("dual_run_diff") if isinstance(task.get("dual_run_diff"), dict) else {}
    return _checklist_text(diff.get(key))


def _checklist_record_summary(task: dict[str, Any]) -> str:
    diff = task.get("dual_run_diff") if isinstance(task.get("dual_run_diff"), dict) else {}
    if diff:
        parts: list[str] = []
        title = str(task.get("candidate_title") or task.get("candidate_display_label") or "").strip()
        field = str(task.get("field") or diff.get("field") or "").strip()
        v2_value = _checklist_text(diff.get("v2_value")).strip()
        v3_value = _checklist_text(diff.get("v3_value")).strip()
        for label, text in (("title", title), ("field", field), ("v2", v2_value), ("v3", v3_value)):
            if text:
                parts.append(f"{label}={text}")
        return "; ".join(parts)
    record = None
    for key in ("dual_run_new_record", "dual_run_missing_v2_record"):
        value = task.get(key)
        if isinstance(value, dict):
            record = value
            break
    if not isinstance(record, dict):
        return ""
    parts: list[str] = []
    for label, key in (
        ("calendar_group", "calendar_group_key"),
        ("slug", "canonical_slug"),
    ):
        text = _checklist_text(record.get(key) or task.get(key)).strip()
        if text:
            parts.append(f"{label}={text}")
    for label, key in (
        ("title", "title"),
        ("schedule", "schedule"),
        ("location", "location"),
        ("price", "price"),
    ):
        text = _checklist_text(record.get(key)).strip()
        if text:
            parts.append(f"{label}={text}")
    return "; ".join(parts)


def _review_task_label(task: dict[str, Any]) -> str:
    for key in ("candidate_title", "candidate_display_label", "candidate_value", "canonical_slug", "review_key"):
        value = task.get(key)
        if value is not None and str(value).strip():
            return str(value)
    return ""


def _html_text(value: Any) -> str:
    if isinstance(value, (dict, list)):
        value = json.dumps(value, indent=2, sort_keys=True)
    return html.escape("" if value is None else str(value))


def _html_artifact_path(path: Any, *, relative_to: Path | None = None) -> str:
    path_text = str(path or "").strip()
    if not path_text:
        return ""
    if "://" in path_text or path_text.startswith("#") or path_text.startswith("data:"):
        return path_text
    candidate_path = Path(path_text)
    if relative_to is None:
        return path_text
    target_path = candidate_path if candidate_path.is_absolute() else Path.cwd() / candidate_path
    try:
        return os.path.relpath(target_path.resolve(), relative_to.resolve())
    except Exception:
        return path_text


def _local_artifact_exists(path: Any) -> bool:
    path_text = str(path or "").strip()
    if not path_text:
        return False
    if "://" in path_text or path_text.startswith("data:"):
        return True
    candidate_path = Path(path_text)
    target_path = candidate_path if candidate_path.is_absolute() else Path.cwd() / candidate_path
    return target_path.exists()


def _task_has_existing_visual_artifact(task: dict[str, Any]) -> bool:
    return any(_local_artifact_exists(task.get(key)) for key in ("field_crop", "region_crop", "page_image_path"))


def _html_media(path: Any, label: str, *, relative_to: Path | None = None) -> str:
    href = _html_artifact_path(path, relative_to=relative_to)
    if not href:
        return '<span class="missing">missing</span>'
    escaped_href = html.escape(href, quote=True)
    escaped_label = html.escape(label)
    if not _local_artifact_exists(path):
        return (
            f'<a class="missing media-link" href="{escaped_href}">'
            f"<span>{escaped_label}</span>"
            "<span>file not found locally</span>"
            "</a>"
        )
    return (
        f'<a class="media-link" href="{escaped_href}">'
        f'<img src="{escaped_href}" alt="{escaped_label}" loading="lazy">'
        f"<span>{escaped_label}</span>"
        "</a>"
    )


def _repo_relative_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def _review_command(task: dict[str, Any], decision: str) -> str:
    task_id = str(task.get("task_id") or "").replace('"', '\\"')
    fixture_candidates_path = _repo_relative_path(DEFAULT_FIXTURE_CANDIDATES_PATH)
    parser_rule_requests_path = _repo_relative_path(DEFAULT_PARSER_RULE_REQUESTS_PATH)
    dual_run_review_keys_path = _repo_relative_path(DEFAULT_DUAL_RUN_REVIEW_KEYS_PATH)
    command = (
        "python scripts/ingest/review_schema_v3.py "
        "data/processed/review_queue/vision_v3_review_decisions.json "
        f'--record-task-id "{task_id}" '
        f"--decision {decision} "
        '--reviewer "${VISION_V3_REVIEWER:?Set VISION_V3_REVIEWER}" '
        '--reason "${VISION_V3_REVIEW_REASON:?Set VISION_V3_REVIEW_REASON}" '
        f"--fixture-candidates-output {fixture_candidates_path} "
        f"--parser-rule-requests-output {parser_rule_requests_path} "
        f"--dual-run-review-keys-output {dual_run_review_keys_path}"
    )
    if decision in {"approve", "edit"}:
        approved_fields = _review_command_approved_fields(task)
        if approved_fields:
            command = f"{command} --approved-fields-json {_shell_single_quote(json.dumps(approved_fields, sort_keys=True))}"
    uses_source_drift = _is_source_drift_review_task(task)
    queue_rebuild_command = _queue_rebuild_command()
    if uses_source_drift:
        command = f"{command} && {_reviewed_source_drift_export_command()}"
    return f"{command} && {queue_rebuild_command} && {_dual_run_refresh_command()} && {queue_rebuild_command}"


def _is_source_drift_review_task(task: dict[str, Any]) -> bool:
    return (
        task.get("candidate_type") == "source_drift"
        and task.get("task_type") == "source_changed"
        and isinstance(task.get("source_drift_report"), dict)
    )


def _reviewed_source_drift_export_command() -> str:
    return (
        "python scripts/ingest/review_schema_v3.py "
        f"{_repo_relative_path(DEFAULT_REVIEW_DECISIONS_PATH)} "
        "--export reviewed-source-drift-report "
        f"--source-drift-report {_repo_relative_path(DEFAULT_SOURCE_DRIFT_REPORT_PATH)} "
        f"--output {_repo_relative_path(DEFAULT_REVIEWED_SOURCE_DRIFT_REPORT_PATH)}"
    )


def _queue_rebuild_command(*, use_reviewed_source_drift: bool = True) -> str:
    source_drift_path = (
        DEFAULT_REVIEWED_SOURCE_DRIFT_REPORT_PATH
        if use_reviewed_source_drift
        else DEFAULT_SOURCE_DRIFT_REPORT_PATH
    )
    return (
        "python scripts/ingest/build_review_queue_v3.py "
        f"--source-drift-report {_repo_relative_path(source_drift_path)} "
        f"--dual-run-report {_repo_relative_path(DEFAULT_DUAL_RUN_REPORT_PATH)} "
        f"--output {_repo_relative_path(DEFAULT_OUTPUT_PATH)} "
        f"--report-output {_repo_relative_path(DEFAULT_REPORT_PATH)} "
        f"--html-output {_repo_relative_path(DEFAULT_HTML_OUTPUT_PATH)} "
        f"--checklist-output {_repo_relative_path(DEFAULT_CHECKLIST_OUTPUT_PATH)}"
    )


def _dual_run_refresh_command() -> str:
    dual_run_review_keys_path = _repo_relative_path(DEFAULT_DUAL_RUN_REVIEW_KEYS_PATH)
    return (
        "python scripts/ingest/v3_dual_run_report.py "
        "--v2 data/processed/activity_gold_v2_preview.json "
        "--v3 data/processed/activity_gold_v3_preview.json "
        "--expected-sources data/processed/source_inventory.json "
        "--source-statuses data/processed/eval/v3_source_statuses.json "
        "--review-tasks data/processed/review_queue/vision_v3_review_queue.json "
        f"--reviewed-diff-keys-file {dual_run_review_keys_path} "
        f"--reviewed-status-transition-keys-file {dual_run_review_keys_path} "
        "--output data/processed/eval/v3_dual_run_report.json"
    )


def _html_review_controls(task: dict[str, Any]) -> str:
    task_fragment = _slug_fragment(task.get("task_id"))
    commands = {
        "approve": _review_command(task, "approve"),
        "edit": _review_command(task, "edit"),
        "reject": _review_command(task, "reject"),
    }
    buttons = " ".join(
        (
            f'<button type="button" data-copy-command="{html.escape(f"{task_fragment}-{decision}", quote=True)}">'
            f"{decision.title()}</button>"
        )
        for decision in commands
    )
    command_blocks = "\n\n".join(
        (
            f'<pre id="{html.escape(f"{task_fragment}-{decision}", quote=True)}">'
            f"{_html_text(command)}</pre>"
        )
        for decision, command in commands.items()
    )
    return "\n".join(
        [
            '<div class="review-controls">',
            buttons,
            "</div>",
            command_blocks,
        ]
    )


def _shell_single_quote(value: str) -> str:
    return "'" + value.replace("'", "'\"'\"'") + "'"


def _review_command_approved_fields(task: dict[str, Any]) -> dict[str, Any]:
    field_name = str(task.get("field") or "").strip()
    if field_name == "price":
        field_name = "fee"
    if field_name not in {"title", "schedule", "location", "fee", "movie_title"}:
        return {}
    normalized_value = task.get("normalized_value")
    if not _has_review_value(normalized_value):
        return {}
    approved_field: dict[str, Any] = {"normalized_value": normalized_value}
    if task.get("candidate_value") is not None:
        approved_field["raw_value"] = task.get("candidate_value")
    return {field_name: approved_field}


def _has_review_value(value: Any) -> bool:
    if isinstance(value, bool):
        return True
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (dict, list, tuple, set)):
        return bool(value)
    return True


def _html_top_blockers(report: dict[str, Any]) -> str:
    blockers = report.get("top_calendar_group_blockers")
    if not isinstance(blockers, list) or not blockers:
        return ""
    rows: list[str] = []
    for blocker in blockers[:10]:
        if not isinstance(blocker, dict):
            continue
        calendar_group_key = str(blocker.get("calendar_group_key") or "").strip()
        group_anchor = _slug_fragment(calendar_group_key)
        task_count = int(blocker.get("task_count") or 0)
        task_label = "task" if task_count == 1 else "tasks"
        source_links: list[str] = []
        for source_url in blocker.get("source_urls") or []:
            source_url_text = str(source_url or "").strip()
            if not source_url_text:
                continue
            source_links.append(
                f'<a href="{html.escape(source_url_text, quote=True)}">{_html_text(source_url_text)}</a>'
            )
        rows.append(
            "\n".join(
                [
                    "<tr>",
                    f'<td><a href="#group-{html.escape(group_anchor, quote=True)}"><strong>{_html_text(calendar_group_key)}</strong></a></td>',
                    f"<td>{task_count} {task_label}</td>",
                    f"<td><code>{_html_text(blocker.get('task_count_by_field') or {})}</code></td>",
                    f"<td><code>{_html_text(blocker.get('task_count_by_type') or {})}</code></td>",
                    f"<td>{'<br>'.join(source_links) if source_links else 'n/a'}</td>",
                    "</tr>",
                ]
            )
        )
    if not rows:
        return ""
    return "\n".join(
        [
            '<section class="top-blockers">',
            "<h2>Top Blockers</h2>",
            "<table>",
            "<thead><tr><th>Calendar Group</th><th>Tasks</th><th>Fields</th><th>Types</th><th>Source URL</th></tr></thead>",
            "<tbody>",
            *rows,
            "</tbody>",
            "</table>",
            "</section>",
        ]
    )


def _html_review_workstreams(report: dict[str, Any]) -> str:
    workstreams = report.get("review_workstreams")
    if not isinstance(workstreams, dict) or not workstreams:
        return ""
    rows: list[str] = []
    for workstream, details in workstreams.items():
        if not isinstance(details, dict):
            continue
        task_count = int(details.get("task_count") or 0)
        task_label = "task" if task_count == 1 else "tasks"
        rows.append(
            "\n".join(
                [
                    "<tr>",
                    f"<td><strong>{_html_text(workstream)}</strong></td>",
                    f"<td>{task_count} {task_label}</td>",
                    f"<td><code>{_html_text(details.get('task_count_by_field') or {})}</code></td>",
                    "</tr>",
                ]
            )
        )
    if not rows:
        return ""
    return "\n".join(
        [
            '<section class="review-workstreams">',
            "<h2>Review Workstreams</h2>",
            "<table>",
            "<thead><tr><th>Workstream</th><th>Tasks</th><th>Fields</th></tr></thead>",
            "<tbody>",
            *rows,
            "</tbody>",
            "</table>",
            "</section>",
        ]
    )


def _html_publish_gate_blockers(report: dict[str, Any]) -> str:
    blockers = report.get("publish_gate_blockers")
    if not isinstance(blockers, dict):
        return ""
    pending_task_count = int(blockers.get("pending_task_count") or 0)
    total_task_count = int(blockers.get("total_task_count") or 0)
    if total_task_count <= 0:
        return ""
    reason_counts = (
        blockers.get("pending_task_count_by_reason")
        if isinstance(blockers.get("pending_task_count_by_reason"), dict)
        else {}
    )
    pending_ids_by_reason = (
        blockers.get("pending_task_ids_by_reason")
        if isinstance(blockers.get("pending_task_ids_by_reason"), dict)
        else {}
    )
    source_counts = (
        blockers.get("pending_task_count_by_source_url")
        if isinstance(blockers.get("pending_task_count_by_source_url"), dict)
        else {}
    )
    pending_ids_by_source_url = (
        blockers.get("pending_task_ids_by_source_url")
        if isinstance(blockers.get("pending_task_ids_by_source_url"), dict)
        else {}
    )
    source_reason_counts = (
        blockers.get("pending_task_count_by_source_url_and_reason")
        if isinstance(blockers.get("pending_task_count_by_source_url_and_reason"), dict)
        else {}
    )
    reason_rows = [
        "\n".join(
            [
                "<tr>",
                f"<td>{_html_publish_gate_reason_link(reason, pending_ids_by_reason)}</td>",
                f"<td>{int(count)} {'task' if int(count) == 1 else 'tasks'}</td>",
                f"<td>{_html_task_links(pending_ids_by_reason.get(reason))}</td>",
                "</tr>",
            ]
        )
        for reason, count in reason_counts.items()
    ]
    source_rows = [
        "\n".join(
            [
                "<tr>",
                f'<td><a href="{html.escape(str(source_url), quote=True)}">{_html_text(source_url)}</a></td>',
                f"<td>{int(count)} {'task' if int(count) == 1 else 'tasks'}</td>",
                f"<td><code>{_html_text(source_reason_counts.get(source_url) or {})}</code></td>",
                f"<td>{_html_task_links(pending_ids_by_source_url.get(source_url))}</td>",
                "</tr>",
            ]
        )
        for source_url, count in sorted(source_counts.items(), key=lambda item: (-int(item[1]), str(item[0])))
    ]
    source_table = ""
    if source_rows:
        source_table = "\n".join(
            [
                "<h3>Publish Gate Source URLs</h3>",
                "<table>",
                "<thead><tr><th>Source URL</th><th>Tasks</th><th>Reasons</th><th>Task Links</th></tr></thead>",
                "<tbody>",
                *source_rows,
                "</tbody>",
                "</table>",
            ]
        )
    return "\n".join(
        [
            '<section class="publish-gate-blockers">',
            "<h2>Publish Gate Blockers</h2>",
            f"<p>{pending_task_count} of {total_task_count} publish-blocking review tasks still pending.</p>",
            "<table>",
            "<thead><tr><th>Pending Gate Reason</th><th>Tasks</th><th>Task Links</th></tr></thead>",
            "<tbody>",
            *reason_rows,
            "</tbody>",
            "</table>",
            source_table,
            "</section>",
        ]
    )


def _html_publish_blocker_batches(report: dict[str, Any]) -> str:
    batches = report.get("publish_blocker_batches")
    if not isinstance(batches, list) or not batches:
        return ""
    rows: list[str] = []
    for batch in batches:
        if not isinstance(batch, dict):
            continue
        source_url = str(batch.get("source_url") or "").strip()
        source_html = (
            f'<a href="{html.escape(source_url, quote=True)}">{_html_text(source_url)}</a>'
            if source_url
            else "n/a"
        )
        task_count = int(batch.get("pending_task_count") or 0)
        task_label = "task" if task_count == 1 else "tasks"
        rows.append(
            "\n".join(
                [
                    "<tr>",
                    f"<td><strong>{_html_text(batch.get('review_batch_key'))}</strong></td>",
                    f"<td>{task_count} {task_label}</td>",
                    f"<td>{source_html}</td>",
                    f"<td><code>{_html_text(batch.get('publish_gate_blocker_reason'))}</code></td>",
                    f"<td><code>{_html_text(batch.get('calendar_group_keys') or [])}</code></td>",
                    f"<td><code>{_html_text(batch.get('fields') or [])}</code></td>",
                    f"<td>{_html_task_links(batch.get('task_ids'))}</td>",
                    "</tr>",
                ]
            )
        )
    if not rows:
        return ""
    return "\n".join(
        [
            '<section class="publish-gate-batches">',
            "<h2>Publish Gate Review Batches</h2>",
            "<table>",
            "<thead><tr><th>Batch</th><th>Tasks</th><th>Source URL</th><th>Reason</th><th>Groups</th><th>Fields</th><th>Task Links</th></tr></thead>",
            "<tbody>",
            *rows,
            "</tbody>",
            "</table>",
            "</section>",
        ]
    )


def _html_publish_gate_summary(summary: dict[str, Any]) -> str:
    total_count = int(summary.get("publish_gate_blocker_task_count") or 0)
    if total_count <= 0:
        return ""
    pending_count = int(summary.get("pending_publish_gate_blocker_task_count") or 0)
    reviewed_count = int(summary.get("reviewed_publish_gate_blocker_task_count") or 0)
    reason_counts = (
        summary.get("pending_publish_gate_blocker_count_by_reason")
        if isinstance(summary.get("pending_publish_gate_blocker_count_by_reason"), dict)
        else {}
    )
    return "\n".join(
        [
            '<section class="publish-gate-summary">',
            "<h2>Publish Gate Summary</h2>",
            '<div class="summary">',
            f"<span><strong>{total_count}</strong> publish blockers</span>",
            f"<span><strong>{pending_count}</strong> pending publish blockers</span>",
            f"<span><strong>{reviewed_count}</strong> reviewed publish blockers</span>",
            f"<span>Pending by reason: <code>{_html_text(reason_counts)}</code></span>",
            "</div>",
            "</section>",
        ]
    )


def _html_review_artifacts(output_path: Path | None) -> str:
    if output_path is None:
        return ""
    checklist_path = output_path.parent / DEFAULT_CHECKLIST_OUTPUT_PATH.name
    if not checklist_path.exists():
        return ""
    checklist_href = html.escape(checklist_path.name, quote=True)
    return "\n".join(
        [
            '<section class="review-artifacts">',
            "<h2>Review Artifacts</h2>",
            f'<a href="{checklist_href}">Publish blocker checklist CSV</a>',
            "</section>",
        ]
    )


def _html_publish_gate_reason_link(reason: str, pending_ids_by_reason: dict[str, Any]) -> str:
    pending_ids = pending_ids_by_reason.get(reason)
    if not isinstance(pending_ids, list) or not pending_ids:
        return f"<strong>{_html_text(reason)}</strong>"
    task_id = str(pending_ids[0] or "").strip()
    if not task_id:
        return f"<strong>{_html_text(reason)}</strong>"
    task_anchor = html.escape(f"task-{_slug_fragment(task_id)}", quote=True)
    return f'<a href="#{task_anchor}"><strong>{_html_text(reason)}</strong></a>'


def _html_task_links(pending_ids: Any, *, limit: int = 5) -> str:
    if not isinstance(pending_ids, list) or not pending_ids:
        return "n/a"
    links: list[str] = []
    for task_id_value in pending_ids[:limit]:
        task_id = str(task_id_value or "").strip()
        if not task_id:
            continue
        task_anchor = html.escape(f"task-{_slug_fragment(task_id)}", quote=True)
        links.append(f'<a href="#{task_anchor}">{_html_text(task_id)}</a>')
    remaining_count = len(pending_ids) - len(links)
    if remaining_count > 0:
        links.append(f"+{remaining_count} more")
    return "<br>".join(links) if links else "n/a"


def build_review_queue_html(
    tasks: list[dict[str, Any]],
    report: dict[str, Any] | None = None,
    *,
    output_path: Path | None = None,
) -> str:
    """Render a static local review page for the v3 review queue."""
    report = report or build_review_queue_report(tasks)
    summary = report.get("summary") if isinstance(report.get("summary"), dict) else {}
    top_blockers_html = _html_top_blockers(report)
    review_workstreams_html = _html_review_workstreams(report)
    review_artifacts_html = _html_review_artifacts(output_path)
    publish_gate_summary_html = _html_publish_gate_summary(summary)
    publish_gate_blockers_html = _html_publish_gate_blockers(report)
    publish_blocker_batches_html = _html_publish_blocker_batches(report)
    relative_to = output_path.parent if output_path else None
    rows: list[str] = []
    task_count_by_calendar_group = (
        summary.get("task_count_by_calendar_group")
        if isinstance(summary.get("task_count_by_calendar_group"), dict)
        else {}
    )
    source_urls_by_calendar_group: dict[str, list[str]] = {}
    for blocker in report.get("top_calendar_group_blockers") or []:
        if not isinstance(blocker, dict):
            continue
        calendar_group_key = str(blocker.get("calendar_group_key") or "").strip()
        source_urls = [str(source_url) for source_url in blocker.get("source_urls") or [] if str(source_url).strip()]
        if calendar_group_key and source_urls:
            source_urls_by_calendar_group[calendar_group_key] = source_urls
    current_group_anchor: str | None = None
    for task in tasks:
        findings = task.get("validation_findings") if isinstance(task.get("validation_findings"), list) else []
        source_metadata = task.get("source_metadata") if isinstance(task.get("source_metadata"), dict) else {}
        calendar_group_key = str(task.get("calendar_group_key") or "Unknown source").strip()
        group_anchor = _slug_fragment(task.get("calendar_group_key"))
        if group_anchor != current_group_anchor:
            if current_group_anchor is not None:
                rows.append("</section>")
            current_group_anchor = group_anchor
            group_task_count = int(task_count_by_calendar_group.get(calendar_group_key) or 0)
            if group_task_count <= 0:
                group_task_count = sum(
                    1
                    for candidate_task in tasks
                    if str(candidate_task.get("calendar_group_key") or "Unknown source").strip() == calendar_group_key
                )
            group_task_label = "task" if group_task_count == 1 else "tasks"
            group_source_urls = source_urls_by_calendar_group.get(calendar_group_key)
            if group_source_urls is None:
                group_source_urls = [
                    str(url)
                    for candidate_task in tasks
                    if str(candidate_task.get("calendar_group_key") or "Unknown source").strip() == calendar_group_key
                    for url in [
                        (
                            candidate_task.get("source_metadata")
                            if isinstance(candidate_task.get("source_metadata"), dict)
                            else {}
                        ).get("canonical_url")
                        or (
                            candidate_task.get("source_metadata")
                            if isinstance(candidate_task.get("source_metadata"), dict)
                            else {}
                        ).get("fetched_url")
                    ]
                    if str(url or "").strip()
                ]
            group_source_links = [
                f'<a href="{html.escape(source_url, quote=True)}">{_html_text(source_url)}</a>'
                for source_url in sorted(set(group_source_urls))
            ]
            rows.append(
                "\n".join(
                    [
                        f'<section class="task-group" id="group-{html.escape(group_anchor, quote=True)}">',
                        '<div class="task-group-heading">',
                        f"<h2>{_html_text(calendar_group_key)} · {group_task_count} {group_task_label}</h2>",
                        f"<div>{'<br>'.join(group_source_links) if group_source_links else 'No source URL recorded'}</div>",
                        "</div>",
                    ]
                )
            )
        existing_comparison = (
            task.get("existing_gold_comparison")
            if isinstance(task.get("existing_gold_comparison"), dict)
            else {}
        )
        stale_review_decision_html = ""
        if isinstance(task.get("stale_review_decision"), dict):
            stale_review_decision_html = (
                f"<section><h3>Stale Review Decision</h3>"
                f"<pre>{_html_text(task.get('stale_review_decision'))}</pre></section>"
            )
        rows.append(
            "\n".join(
                [
                    f'<article class="task" id="task-{html.escape(_slug_fragment(task.get("task_id")), quote=True)}">',
                    '<div class="task-heading">',
                    f'<h2>{_html_text(task.get("candidate_display_label") or task.get("candidate_title") or task.get("candidate_value") or task.get("calendar_group_key") or "Unknown source")} / {_html_text(task.get("task_type"))}</h2>',
                    f'<code>{_html_text(task.get("task_id"))}</code>',
                    "</div>",
                    '<div class="meta">',
                    f"<span>Status: <strong>{_html_text(task.get('status') or 'pending')}</strong></span>",
                    f"<span>Review decision: <strong>{_html_text(task.get('review_decision_status') or 'n/a')}</strong></span>",
                    f"<span>Field: <strong>{_html_text(task.get('field') or 'source')}</strong></span>",
                    f"<span>Candidate: <strong>{_html_text(task.get('candidate_type'))}</strong></span>",
                    f"<span>Title: <strong>{_html_text(task.get('candidate_title') or 'n/a')}</strong></span>",
                    f"<span>Schedule: <strong>{_html_text(task.get('candidate_schedule') or 'n/a')}</strong></span>",
                    f"<span>Location: <strong>{_html_text(task.get('candidate_location') or 'n/a')}</strong></span>",
                    f"<span>Fee required: <strong>{_html_text(task.get('candidate_fee_required'))}</strong></span>",
                    f"<span>Slug: <strong>{_html_text(task.get('canonical_slug') or 'n/a')}</strong></span>",
                    f"<span>Review key: <code>{_html_text(task.get('review_key') or 'n/a')}</code></span>",
                    f"<span>Page: <strong>{_html_text(task.get('page_number') or 'n/a')}</strong></span>",
                    f"<span>Content SHA: <code>{_html_text(task.get('content_sha256'))}</code></span>",
                    f"<span>Page image SHA: <code>{_html_text(task.get('page_image_sha256') or task.get('page_image'))}</code></span>",
                    f"<span>Field crop SHA: <code>{_html_text(task.get('field_crop_sha256'))}</code></span>",
                    "</div>",
                    '<div class="evidence">',
                    f"<section><h3>Field Crop</h3>{_html_media(task.get('field_crop'), 'open field crop', relative_to=relative_to)}</section>",
                    f"<section><h3>Region Crop</h3>{_html_media(task.get('region_crop'), 'open region crop', relative_to=relative_to)}</section>",
                    f"<section><h3>Page Image</h3>{_html_media(task.get('page_image_path'), 'open page image', relative_to=relative_to)}</section>",
                    "</div>",
                    '<div class="grid">',
                    f"<section><h3>Findings</h3><pre>{_html_text(findings)}</pre></section>",
                    f"<section><h3>Candidate Value</h3><pre>{_html_text(task.get('candidate_value'))}</pre></section>",
                    f"<section><h3>Normalized Value</h3><pre>{_html_text(task.get('normalized_value'))}</pre></section>",
                    f"<section><h3>Primary OCR</h3><pre>{_html_text(task.get('primary_text'))}</pre></section>",
                    f"<section><h3>Secondary OCR</h3><pre>{_html_text(task.get('secondary_text'))}</pre></section>",
                    f"<section><h3>Existing Gold Comparison</h3><pre>{_html_text(existing_comparison)}</pre></section>",
                    f"<section><h3>Source Metadata</h3><pre>{_html_text(source_metadata)}</pre></section>",
                    stale_review_decision_html,
                    f"<section><h3>Decision Commands</h3>{_html_review_controls(task)}</section>",
                    "</div>",
                    "</article>",
                ]
            )
        )
    if rows:
        rows.append("</section>")
    return "\n".join(
        [
            "<!doctype html>",
            '<html lang="en">',
            "<head>",
            '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1">',
            "<title>Vision v3 Review Queue</title>",
            "<style>",
            "body{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;background:#f7f7f4;color:#1e2329}",
            "header{position:sticky;top:0;background:#ffffff;border-bottom:1px solid #d8d6ce;padding:16px 24px;z-index:1}",
            "main{max-width:1180px;margin:0 auto;padding:24px}",
            "h1{font-size:24px;margin:0 0 8px} h2{font-size:18px;margin:0} h3{font-size:13px;margin:0 0 8px;color:#48515a}",
            ".summary{display:flex;gap:16px;flex-wrap:wrap;font-size:14px}.summary strong{font-size:18px}",
            ".command-setup{margin-top:10px;padding:8px 10px;border:1px solid #eceae3;background:#fbfbf8;font-size:12px}.command-setup h2{font-size:14px;margin:0 0 6px}.command-setup pre{margin-top:4px}",
            ".review-artifacts{margin-top:10px;padding:8px 10px;border:1px solid #eceae3;background:#fbfbf8;font-size:12px}.review-artifacts h2{font-size:14px;margin:0 0 6px}",
            ".top-blockers{margin-top:12px}.top-blockers table{width:100%;border-collapse:collapse;font-size:12px;background:#fbfbf8}.top-blockers th,.top-blockers td{border:1px solid #eceae3;padding:6px;text-align:left;vertical-align:top}.top-blockers h2{font-size:14px;margin:0 0 6px}",
            ".review-workstreams{margin-top:12px}.review-workstreams table{width:100%;border-collapse:collapse;font-size:12px;background:#fbfbf8}.review-workstreams th,.review-workstreams td{border:1px solid #eceae3;padding:6px;text-align:left;vertical-align:top}.review-workstreams h2{font-size:14px;margin:0 0 6px}",
            ".publish-gate-summary{margin-top:12px;padding:8px 10px;border:1px solid #eceae3;background:#fbfbf8}.publish-gate-summary h2{font-size:14px;margin:0 0 6px}",
            ".publish-gate-blockers{margin-top:12px}.publish-gate-blockers table{width:100%;border-collapse:collapse;font-size:12px;background:#fbfbf8}.publish-gate-blockers th,.publish-gate-blockers td{border:1px solid #eceae3;padding:6px;text-align:left;vertical-align:top}.publish-gate-blockers h2{font-size:14px;margin:0 0 6px}",
            ".publish-gate-batches{margin-top:12px}.publish-gate-batches table{width:100%;border-collapse:collapse;font-size:12px;background:#fbfbf8}.publish-gate-batches th,.publish-gate-batches td{border:1px solid #eceae3;padding:6px;text-align:left;vertical-align:top}.publish-gate-batches h2{font-size:14px;margin:0 0 6px}",
            ".task{background:#fff;border:1px solid #d8d6ce;border-radius:8px;margin:0 0 18px;padding:16px}",
            ".task-heading{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:1px solid #eceae3;padding-bottom:12px}",
            ".meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin:12px 0;font-size:13px}",
            ".evidence{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:12px 0}",
            ".evidence section,.grid section{border:1px solid #eceae3;border-radius:6px;padding:10px;background:#fbfbf8}",
            ".media-link{display:grid;gap:8px;text-decoration:none;color:#185abc}.media-link img{display:block;width:100%;max-height:260px;object-fit:contain;background:#fff;border:1px solid #d8d6ce;border-radius:4px}",
            ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}",
            ".review-controls{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px}.review-controls button{border:1px solid #b9b6ad;background:#fff;border-radius:6px;padding:6px 10px;cursor:pointer;font:inherit}.review-controls button:hover{background:#f0eee7}",
            "pre{white-space:pre-wrap;word-break:break-word;margin:0;font-size:12px;line-height:1.4}",
            "code{font-size:12px}.missing{color:#8b2f2f}a{color:#185abc}",
            "</style>",
            "</head>",
            "<body>",
            "<header>",
            "<h1>Vision v3 Review Queue</h1>",
            '<div class="summary">',
            f"<span><strong>{_html_text(summary.get('task_count', len(tasks)))}</strong> tasks</span>",
            f"<span><strong>{_html_text(summary.get('visual_artifact_missing_count', 0))}</strong> missing visual artifacts</span>",
            f"<span>Types: <code>{_html_text(summary.get('task_count_by_type', {}))}</code></span>",
            "</div>",
            '<section class="command-setup">',
            "<h2>Review Command Setup</h2>",
            "<pre>export VISION_V3_REVIEWER=\"your-name\"\nexport VISION_V3_REVIEW_REASON=\"source-backed rationale for this decision\"</pre>",
            "</section>",
            review_artifacts_html,
            review_workstreams_html,
            publish_gate_summary_html,
            publish_gate_blockers_html,
            publish_blocker_batches_html,
            top_blockers_html,
            "</header>",
            "<main>",
            *rows,
            "</main>",
            "<script>",
            "document.addEventListener('click', async function(event) {",
            "  const button = event.target.closest('[data-copy-command]');",
            "  if (!button) return;",
            "  const command = document.getElementById(button.dataset.copyCommand);",
            "  if (!command) return;",
            "  await navigator.clipboard.writeText(command.textContent);",
            "  const label = button.textContent;",
            "  button.textContent = 'Copied';",
            "  setTimeout(function() { button.textContent = label; }, 1200);",
            "});",
            "</script>",
            "</body>",
            "</html>",
        ]
    ) + "\n"


def review_approval_is_current(
    approval: dict[str, Any],
    *,
    current_content_sha256: str,
    current_page_image_sha256: str | None,
) -> bool:
    if not current_content_sha256:
        return False
    if approval.get("content_sha256") != current_content_sha256:
        return False
    if not current_page_image_sha256:
        return False
    if approval.get("page_image_sha256") != current_page_image_sha256:
        return False
    return True


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
    if isinstance(payload, dict) and isinstance(payload.get("gold_conflicts"), list):
        return [item for item in payload["gold_conflicts"] if isinstance(item, dict)]
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def _load_gold_conflicts(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    payload = json.loads(path.read_text())
    if isinstance(payload, dict):
        conflicts = payload.get("gold_conflicts")
        return [item for item in conflicts if isinstance(item, dict)] if isinstance(conflicts, list) else []
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    return []


def _load_json_dict(path: Path) -> dict[str, Any] | None:
    if not path.exists() or path.is_dir():
        return None
    payload = json.loads(path.read_text())
    return payload if isinstance(payload, dict) else None


def main() -> None:
    parser = argparse.ArgumentParser(description="Build v3 review queue tasks")
    parser.add_argument("validated_candidates", type=Path, nargs="?", default=DEFAULT_VALIDATED_CANDIDATES_PATH)
    parser.add_argument("--source-statuses", type=Path, default=DEFAULT_SOURCE_STATUSES_PATH)
    parser.add_argument("--source-inventory", type=Path, default=DEFAULT_SOURCE_INVENTORY_PATH)
    parser.add_argument("--review-decisions", type=Path, default=DEFAULT_REVIEW_DECISIONS_PATH)
    parser.add_argument("--existing-gold", type=Path, default=DEFAULT_EXISTING_GOLD_PATH)
    parser.add_argument("--gold-conflicts", type=Path, default=DEFAULT_GOLD_CONFLICTS_PATH)
    parser.add_argument("--source-drift-report", type=Path, default=DEFAULT_SOURCE_DRIFT_REPORT_PATH)
    parser.add_argument("--dual-run-report", type=Path, default=DEFAULT_DUAL_RUN_REPORT_PATH)
    parser.add_argument(
        "--no-dual-run-report",
        action="store_true",
        help="Do not load a dual-run report, even if the default report path exists.",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--report-output", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--html-output", type=Path, default=DEFAULT_HTML_OUTPUT_PATH)
    parser.add_argument("--checklist-output", type=Path, default=DEFAULT_CHECKLIST_OUTPUT_PATH)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    candidates = _load_json_list(args.validated_candidates)
    tasks = build_review_tasks(
        candidates,
        source_statuses=_load_json_list(args.source_statuses),
        existing_gold_rows=_load_json_list(args.existing_gold),
        gold_conflicts=_load_gold_conflicts(args.gold_conflicts),
        source_drift_report=_load_json_dict(args.source_drift_report),
        dual_run_report=None if args.no_dual_run_report else _load_json_dict(args.dual_run_report),
        source_inventory=_load_json_list(args.source_inventory),
        review_decisions=_load_json_list(args.review_decisions),
    )
    if args.json:
        print(json.dumps(tasks, indent=2, sort_keys=True))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(tasks, indent=2, sort_keys=True) + "\n")
    report = build_review_queue_report(tasks)
    args.report_output.parent.mkdir(parents=True, exist_ok=True)
    args.report_output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    args.html_output.parent.mkdir(parents=True, exist_ok=True)
    args.html_output.write_text(build_review_queue_html(tasks, report, output_path=args.html_output))
    args.checklist_output.parent.mkdir(parents=True, exist_ok=True)
    args.checklist_output.write_text(build_review_checklist_csv(tasks))
    print(args.output)


if __name__ == "__main__":
    main()
