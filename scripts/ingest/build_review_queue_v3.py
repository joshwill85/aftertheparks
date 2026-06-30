"""Build review tasks for non-publishable vision v3 candidates."""

from __future__ import annotations

import argparse
import html
import json
import os
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR


DEFAULT_OUTPUT_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_queue.json"
DEFAULT_VALIDATED_CANDIDATES_PATH = PROCESSED_DIR / "validated_candidates_v3"
DEFAULT_SOURCE_STATUSES_PATH = PROCESSED_DIR / "eval" / "v3_source_statuses.json"
DEFAULT_EXISTING_GOLD_PATH = PROCESSED_DIR / "activity_gold_v2_preview.json"
DEFAULT_GOLD_CONFLICTS_PATH = PROCESSED_DIR / "activity_gold_v3_preview.json"
DEFAULT_SOURCE_DRIFT_REPORT_PATH = PROCESSED_DIR / "source_drift_report.json"
DEFAULT_DUAL_RUN_REPORT_PATH = PROCESSED_DIR / "eval" / "v3_dual_run_report.json"
DEFAULT_REPORT_PATH = PROCESSED_DIR / "eval" / "v3_review_queue_report.json"
DEFAULT_HTML_OUTPUT_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_queue.html"
SOURCE_STATUS_REVIEW_TASK_TYPES = {"parser_error", "source_error"}


def _task_type(findings: list[str]) -> str:
    if not findings:
        return "needs_review"
    first = findings[0]
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
        ):
            return finding.split(":", 1)[1]
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


def _slug_fragment(value: Any) -> str:
    fragment = "".join(char.lower() if char.isalnum() else "-" for char in str(value or "").strip())
    return "-".join(part for part in fragment.split("-") if part) or "unknown"


def _has_review_artifacts(source: dict[str, Any]) -> bool:
    return bool(
        source.get("page_image_sha256")
        and (source.get("crop_storage_path") or source.get("crop_path"))
        and source.get("crop_sha256")
    )


def _unreviewable_candidate_task(
    candidate: dict[str, Any],
    *,
    index: int,
    findings: list[str],
    field_name: str | None,
) -> dict[str, Any]:
    visible_findings = list(dict.fromkeys([*findings, "missing_reviewable_evidence"]))
    return {
        "task_id": str(candidate.get("candidate_id") or f"vision-v3-unreviewable-{index:04d}"),
        "candidate_id": candidate.get("candidate_id"),
        "task_type": "unreviewable_candidate",
        "field": field_name,
        "source_document_id": candidate.get("source_document_id"),
        "content_sha256": candidate.get("content_sha256"),
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
        "source_document_id": candidate.get("source_document_id"),
        "content_sha256": candidate.get("content_sha256"),
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
        "candidate": candidate,
    }


def _source_status_review_tasks(source_statuses: list[dict[str, Any]]) -> list[dict[str, Any]]:
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
                "source_metadata": _source_metadata(status),
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


def _dual_run_field_diff_review_tasks(dual_run_report: dict[str, Any]) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for index, diff in enumerate(dual_run_report.get("field_diffs") or [], start=1):
        if not isinstance(diff, dict) or diff.get("reviewed") is True:
            continue
        diff_key = str(diff.get("diff_key") or f"diff-{index}").strip()
        field_name = str(diff.get("field") or "").strip() or None
        evidence = diff.get("v3_field_evidence") if isinstance(diff.get("v3_field_evidence"), dict) else {}
        source = evidence.get("source") if isinstance(evidence.get("source"), dict) else {}
        field_crop = source.get("crop_storage_path") or source.get("crop_path")
        task_suffix = "-".join(_slug_fragment(part) for part in diff_key.split(":"))
        tasks.append(
            {
                "task_id": f"dual-run-diff-{task_suffix}",
                "task_type": "gold_conflict",
                "field": field_name,
                "source_document_id": diff.get("source_document_id"),
                "content_sha256": source.get("content_sha256"),
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
                "source_drift": {"old": diff.get("v2_value"), "new": diff.get("v3_value")},
                "dual_run_diff": diff,
                "dual_run_report": dual_run_report,
            }
        )
    return tasks


def _dual_run_status_transition_review_tasks(dual_run_report: dict[str, Any]) -> list[dict[str, Any]]:
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
                "dual_run_status_transition": transition,
                "dual_run_report": dual_run_report,
            }
        )
    return tasks


def _dual_run_new_record_review_tasks(dual_run_report: dict[str, Any]) -> list[dict[str, Any]]:
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
                "dual_run_new_record": record,
                "dual_run_report": dual_run_report,
            }
        )
    return tasks


def _dual_run_missing_v2_record_review_tasks(dual_run_report: dict[str, Any]) -> list[dict[str, Any]]:
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
        tasks.append(
            {
                "task_id": f"dual-run-missing-v2-{task_suffix}",
                "task_type": "manual_review_required",
                "field": "missing_v2_record",
                "source_document_id": record.get("source_document_id"),
                "content_sha256": record.get("content_sha256"),
                "calendar_group_key": record.get("calendar_group_key"),
                "canonical_slug": record.get("canonical_slug"),
                "review_key": review_key,
                "candidate_type": "dual_run_missing_v2_record",
                "page_number": record.get("page_number"),
                "page_image": record.get("page_image_sha256"),
                "page_image_sha256": record.get("page_image_sha256"),
                "page_image_path": record.get("page_image_path"),
                "field_crop": record.get("field_crop"),
                "field_crop_sha256": record.get("field_crop_sha256"),
                "field_bbox": record.get("field_bbox"),
                "primary_text": record.get("title") or v2_value.get("title"),
                "secondary_text": record.get("canonical_slug"),
                "candidate_value": record.get("title") or record.get("canonical_slug"),
                "normalized_value": review_key,
                "validation_findings": ["manual_review_required:missing_v2_record"],
                "source_drift": {"old": v2_value, "new": None},
                "dual_run_missing_v2_record": record,
                "dual_run_report": dual_run_report,
            }
        )
    return tasks


def _dual_run_review_tasks(dual_run_report: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not dual_run_report or dual_run_report.get("status") in {None, "clean"}:
        return []
    return [
        *_dual_run_field_diff_review_tasks(dual_run_report),
        *_dual_run_status_transition_review_tasks(dual_run_report),
        *_dual_run_new_record_review_tasks(dual_run_report),
        *_dual_run_missing_v2_record_review_tasks(dual_run_report),
    ]


def build_review_tasks(
    candidates: list[dict[str, Any]],
    *,
    source_statuses: list[dict[str, Any]] | None = None,
    existing_gold_rows: list[dict[str, Any]] | None = None,
    gold_conflicts: list[dict[str, Any]] | None = None,
    source_drift_report: dict[str, Any] | None = None,
    dual_run_report: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
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
    tasks.extend(_source_status_review_tasks(source_statuses or []))
    tasks.extend(_gold_conflict_review_tasks(gold_conflicts or [], existing_gold_by_key=existing_gold_by_key))
    tasks.extend(_source_drift_review_tasks(source_drift_report))
    tasks.extend(_dual_run_review_tasks(dual_run_report))
    for task in tasks:
        task.setdefault("status", "pending")
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


def build_review_queue_report(tasks: list[dict[str, Any]]) -> dict[str, Any]:
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
    return {
        "report_kind": "review_queue_v3_report",
        "schema_version": "review_queue_v3_report_001",
        "summary": {
            "task_count": len(tasks),
            "task_count_by_type": _count_by_key(tasks, "task_type"),
            "task_count_by_finding": _count_by_primary_finding(tasks),
            "visual_artifact_missing_count": len(missing_visual_artifact_task_ids),
            "visual_artifact_missing_file_count": len(missing_visual_artifact_file_task_ids),
            "all_tasks_have_visual_artifacts": not missing_visual_artifact_task_ids,
            "all_tasks_have_existing_visual_artifacts": not missing_visual_artifact_file_task_ids,
        },
        "visual_artifact_missing_task_ids": missing_visual_artifact_task_ids,
        "visual_artifact_missing_file_task_ids": missing_visual_artifact_file_task_ids,
    }


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


def _review_command(task: dict[str, Any], decision: str) -> str:
    task_id = str(task.get("task_id") or "").replace('"', '\\"')
    command = (
        "python scripts/ingest/review_schema_v3.py "
        "data/processed/review_queue/vision_v3_review_decisions.json "
        f'--record-task-id "{task_id}" '
        f"--decision {decision} "
        '--reviewer "reviewer-name" '
        '--reason "Verified against source crop"'
    )
    if decision == "edit":
        approved_fields = _review_command_approved_fields(task)
        if approved_fields:
            command = f"{command} --approved-fields-json {_shell_single_quote(json.dumps(approved_fields, sort_keys=True))}"
    return command


def _shell_single_quote(value: str) -> str:
    return "'" + value.replace("'", "'\"'\"'") + "'"


def _review_command_approved_fields(task: dict[str, Any]) -> dict[str, Any]:
    field_name = str(task.get("field") or "").strip()
    if field_name == "price":
        field_name = "fee"
    if field_name not in {"title", "schedule", "location", "fee", "movie_title"}:
        return {}
    approved_field: dict[str, Any] = {"normalized_value": task.get("normalized_value")}
    if task.get("candidate_value") is not None:
        approved_field["raw_value"] = task.get("candidate_value")
    return {field_name: approved_field}


def build_review_queue_html(
    tasks: list[dict[str, Any]],
    report: dict[str, Any] | None = None,
    *,
    output_path: Path | None = None,
) -> str:
    """Render a static local review page for the v3 review queue."""
    report = report or build_review_queue_report(tasks)
    summary = report.get("summary") if isinstance(report.get("summary"), dict) else {}
    relative_to = output_path.parent if output_path else None
    rows: list[str] = []
    for task in tasks:
        findings = task.get("validation_findings") if isinstance(task.get("validation_findings"), list) else []
        source_metadata = task.get("source_metadata") if isinstance(task.get("source_metadata"), dict) else {}
        existing_comparison = (
            task.get("existing_gold_comparison")
            if isinstance(task.get("existing_gold_comparison"), dict)
            else {}
        )
        rows.append(
            "\n".join(
                [
                    '<article class="task">',
                    '<div class="task-heading">',
                    f'<h2>{_html_text(task.get("calendar_group_key") or "Unknown source")} / {_html_text(task.get("task_type"))}</h2>',
                    f'<code>{_html_text(task.get("task_id"))}</code>',
                    "</div>",
                    '<div class="meta">',
                    f"<span>Field: <strong>{_html_text(task.get('field') or 'source')}</strong></span>",
                    f"<span>Candidate: <strong>{_html_text(task.get('candidate_type'))}</strong></span>",
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
                    f"<section><h3>Decision Commands</h3><pre>{_html_text(_review_command(task, 'approve'))}\n\n{_html_text(_review_command(task, 'edit'))}\n\n{_html_text(_review_command(task, 'reject'))}</pre></section>",
                    "</div>",
                    "</article>",
                ]
            )
        )
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
            ".task{background:#fff;border:1px solid #d8d6ce;border-radius:8px;margin:0 0 18px;padding:16px}",
            ".task-heading{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:1px solid #eceae3;padding-bottom:12px}",
            ".meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin:12px 0;font-size:13px}",
            ".evidence{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:12px 0}",
            ".evidence section,.grid section{border:1px solid #eceae3;border-radius:6px;padding:10px;background:#fbfbf8}",
            ".media-link{display:grid;gap:8px;text-decoration:none;color:#185abc}.media-link img{display:block;width:100%;max-height:260px;object-fit:contain;background:#fff;border:1px solid #d8d6ce;border-radius:4px}",
            ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}",
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
            "</header>",
            "<main>",
            *rows,
            "</main>",
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
    parser.add_argument("--existing-gold", type=Path, default=DEFAULT_EXISTING_GOLD_PATH)
    parser.add_argument("--gold-conflicts", type=Path, default=DEFAULT_GOLD_CONFLICTS_PATH)
    parser.add_argument("--source-drift-report", type=Path, default=DEFAULT_SOURCE_DRIFT_REPORT_PATH)
    parser.add_argument("--dual-run-report", type=Path, default=DEFAULT_DUAL_RUN_REPORT_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--report-output", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--html-output", type=Path, default=DEFAULT_HTML_OUTPUT_PATH)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    candidates = _load_json_list(args.validated_candidates)
    tasks = build_review_tasks(
        candidates,
        source_statuses=_load_json_list(args.source_statuses),
        existing_gold_rows=_load_json_list(args.existing_gold),
        gold_conflicts=_load_gold_conflicts(args.gold_conflicts),
        source_drift_report=_load_json_dict(args.source_drift_report),
        dual_run_report=_load_json_dict(args.dual_run_report),
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
    print(args.output)


if __name__ == "__main__":
    main()
