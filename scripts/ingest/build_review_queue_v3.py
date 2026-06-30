"""Build review tasks for non-publishable vision v3 candidates."""

from __future__ import annotations

import argparse
import json
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
        for failure in source_report.get("validation_failures") or []:
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
                "candidate_type": "dual_run_diff",
                "page_number": source.get("page_number"),
                "page_image": source.get("page_image_sha256"),
                "page_image_sha256": source.get("page_image_sha256"),
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
        task_suffix = "-".join(_slug_fragment(part) for part in review_key.split(":"))
        tasks.append(
            {
                "task_id": f"dual-run-new-{task_suffix}",
                "task_type": "manual_review_required",
                "field": "new_record",
                "source_document_id": record.get("source_document_id"),
                "content_sha256": record.get("content_sha256"),
                "calendar_group_key": record.get("calendar_group_key"),
                "candidate_type": "dual_run_new_record",
                "page_number": None,
                "page_image": None,
                "field_crop": None,
                "field_crop_sha256": None,
                "field_bbox": None,
                "primary_text": record.get("title"),
                "secondary_text": record.get("canonical_slug"),
                "candidate_value": record.get("title") or record.get("canonical_slug"),
                "normalized_value": review_key,
                "validation_findings": ["manual_review_required:new_record"],
                "dual_run_new_record": record,
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
        field_name = _field_from_findings(findings)
        evidence = _field_evidence(candidate, field_name)
        source = _region_source(candidate, field_name)
        region_source = _region_source(candidate, "region")
        if not _has_review_artifacts(source):
            tasks.append(
                _unreviewable_candidate_task(
                    candidate,
                    index=index,
                    findings=findings,
                    field_name=field_name,
                )
            )
            continue
        page_image_sha256 = source.get("page_image_sha256") or region_source.get("page_image_sha256")
        page_image_path = (
            source.get("page_image_path")
            or region_source.get("page_image_path")
            or _page_image_path(candidate, page_image_sha256)
        )
        tasks.append(
            {
                "task_id": str(candidate.get("candidate_id") or f"vision-v3-review-{index:04d}"),
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
                "existing_gold_comparison": _existing_gold_comparison(candidate, existing_gold_by_key),
                "candidate": candidate,
            }
        )
    tasks.extend(_source_status_review_tasks(source_statuses or []))
    tasks.extend(_gold_conflict_review_tasks(gold_conflicts or [], existing_gold_by_key=existing_gold_by_key))
    tasks.extend(_source_drift_review_tasks(source_drift_report))
    tasks.extend(_dual_run_review_tasks(dual_run_report))
    return tasks


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
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    candidates = _load_json_list(args.validated_candidates)
    tasks = build_review_tasks(
        candidates,
        source_statuses=_load_json_list(args.source_statuses),
        existing_gold_rows=_load_json_list(args.existing_gold),
        gold_conflicts=_load_json_list(args.gold_conflicts),
        source_drift_report=_load_json_dict(args.source_drift_report),
        dual_run_report=_load_json_dict(args.dual_run_report),
    )
    if args.json:
        print(json.dumps(tasks, indent=2, sort_keys=True))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(tasks, indent=2, sort_keys=True) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
