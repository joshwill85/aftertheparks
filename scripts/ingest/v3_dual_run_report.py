"""Compare v2 Gold output with v3 preview output before cutover."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR


DEFAULT_OUTPUT = PROCESSED_DIR / "eval" / "v3_dual_run_report.json"
CRITICAL_FIELDS = ("title", "schedule", "location", "price")


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


def _reviewed_diff_keys_from_file(path: Path | None) -> list[str]:
    if path is None or not path.exists():
        return []
    payload = json.loads(path.read_text())
    if isinstance(payload, dict):
        values = payload.get("reviewed_diff_keys")
        if values is None:
            values = payload.get("diff_keys")
    else:
        values = payload
    if not isinstance(values, list):
        return []
    return [str(value) for value in values if str(value).strip()]


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


def _normalize(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _title(row: dict[str, Any]) -> str:
    return str(row.get("title") or row.get("normalized_title") or _slug(row))


def _not_publishable(row: dict[str, Any]) -> bool:
    status = str(row.get("validation_status") or "")
    if status and status not in {"auto_publishable", "manually_approved"}:
        return True
    return False


def _source_id(row: dict[str, Any]) -> str:
    return str(row.get("source_document_id") or row.get("id") or row.get("document_id") or "").strip()


def _source_hash(row: dict[str, Any]) -> str:
    return str(row.get("content_sha256") or row.get("source_sha256") or row.get("documentHash") or "").strip()


def _source_coverage(
    expected_sources: list[dict[str, Any]] | None,
    v3_source_statuses: list[dict[str, Any]] | None,
    review_tasks: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    expected_ids = sorted({_source_id(source) for source in expected_sources or [] if _source_id(source)})
    statuses_by_id = {
        _source_id(status): status
        for status in v3_source_statuses or []
        if _source_id(status)
    }
    expected_by_id = {
        _source_id(source): source
        for source in expected_sources or []
        if _source_id(source)
    }
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
        source_id
        for source_id, status in statuses_by_id.items()
        if source_id not in stale_id_set and str(status.get("status") or "") == "processed"
    )
    source_error_ids = sorted(
        source_id
        for source_id, status in statuses_by_id.items()
        if source_id not in stale_id_set and str(status.get("status") or "") == "source_error"
    )
    parser_error_ids = sorted(
        source_id
        for source_id, status in statuses_by_id.items()
        if source_id not in stale_id_set and str(status.get("status") or "") == "parser_error"
    )
    handled = set(processed_ids) | set(source_error_ids) | set(parser_error_ids)
    unprocessed_ids = sorted(source_id for source_id in expected_ids if source_id not in handled)
    expected_id_set = set(expected_ids)
    expected_parser_error_ids = [source_id for source_id in parser_error_ids if source_id in expected_id_set]
    parser_error_without_review_task_ids: list[str] = []
    for source_id in expected_parser_error_ids:
        status_hash = _source_hash(statuses_by_id.get(source_id, {}))
        matching_review_task = False
        for task in review_tasks or []:
            if _source_id(task) != source_id:
                continue
            task_hash = _source_hash(task)
            if status_hash and task_hash != status_hash:
                continue
            matching_review_task = True
            break
        if not matching_review_task:
            parser_error_without_review_task_ids.append(source_id)
    return {
        "expected_source_count": len(expected_ids),
        "processed_source_count": len([source_id for source_id in expected_ids if source_id in set(processed_ids)]),
        "source_error_count": len([source_id for source_id in expected_ids if source_id in set(source_error_ids)]),
        "unprocessed_source_ids": unprocessed_ids,
        "source_error_ids": [source_id for source_id in source_error_ids if source_id in set(expected_ids)],
        "parser_error_ids": expected_parser_error_ids,
        "stale_source_status_ids": stale_source_status_ids,
        "stale_source_status_config_ids": stale_source_status_config_ids,
        "stale_source_status_pipeline_ids": stale_source_status_pipeline_ids,
        "parser_error_without_review_task_ids": parser_error_without_review_task_ids,
    }


def build_dual_run_report(
    *,
    v2_rows: list[dict[str, Any]],
    v3_preview: dict[str, Any] | list[dict[str, Any]],
    reviewed_diff_keys: list[str] | None = None,
    expected_sources: list[dict[str, Any]] | None = None,
    v3_source_statuses: list[dict[str, Any]] | None = None,
    review_tasks: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    v3_rows = _rows_from_preview(v3_preview)
    reviewed = set(reviewed_diff_keys or [])
    v2_by_key = {_row_key(row): row for row in v2_rows if _row_key(row)}
    v3_by_key = {_row_key(row): row for row in v3_rows if _row_key(row)}

    new_keys = sorted(set(v3_by_key) - set(v2_by_key))
    missing_keys = sorted(set(v2_by_key) - set(v3_by_key))
    common_keys = sorted(set(v2_by_key) & set(v3_by_key))
    new_review_keys = {key: f"{key}:new_record" for key in new_keys}
    unreviewed_new_keys = [key for key in new_keys if new_review_keys[key] not in reviewed]

    field_diffs: list[dict[str, Any]] = []
    for key in common_keys:
        v2_row = v2_by_key[key]
        v3_row = v3_by_key[key]
        for field in CRITICAL_FIELDS:
            v2_value = _field_value(v2_row, field)
            v3_value = _field_value(v3_row, field)
            if _normalize(v2_value) == _normalize(v3_value):
                continue
            diff_key = f"{key}:{field}"
            field_diffs.append(
                {
                    "diff_key": diff_key,
                    "row_key": key,
                    "canonical_slug": _slug(v3_row) or _slug(v2_row),
                    "calendar_group_key": _calendar_group(v3_row) or _calendar_group(v2_row),
                    "field": field,
                    "v2_value": v2_value,
                    "v3_value": v3_value,
                    "reviewed": diff_key in reviewed,
                    "v3_field_evidence": (v3_row.get("field_evidence") or {}).get(field)
                    if isinstance(v3_row.get("field_evidence"), dict)
                    else None,
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
    if missing_keys:
        publish_blockers.append("v3_missing_v2_rows")
    source_coverage = _source_coverage(expected_sources, v3_source_statuses, review_tasks=review_tasks)
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

    return {
        "report_version": "v3_dual_run_report_001",
        "status": "blocked" if publish_blockers else "clean",
        "v2_count": len(v2_rows),
        "v3_count": len(v3_rows),
        "new_in_v3": [_slug(v3_by_key[key]) for key in new_keys],
        "new_v3_review_keys": [new_review_keys[key] for key in new_keys],
        "unreviewed_new_keys": unreviewed_new_keys,
        "missing_in_v3": [_slug(v2_by_key[key]) for key in missing_keys],
        "field_diffs": field_diffs,
        "source_coverage": source_coverage,
        "reviewed_diff_keys": sorted(reviewed),
        "unreviewed_diff_keys": unreviewed_diff_keys,
        "publish_blockers": list(dict.fromkeys(publish_blockers)),
        "manual_review_backlog": len(unreviewed_diff_keys)
        + len(unreviewed_new_keys)
        + sum(1 for row in v3_rows if _not_publishable(row)),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build v2/v3 dual-run diff report")
    parser.add_argument("--v2", type=Path, required=True)
    parser.add_argument("--v3", type=Path, required=True)
    parser.add_argument("--reviewed-diff-keys", nargs="*", default=[])
    parser.add_argument("--reviewed-diff-keys-file", type=Path)
    parser.add_argument("--expected-sources", type=Path)
    parser.add_argument("--source-statuses", type=Path)
    parser.add_argument("--review-tasks", type=Path)
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
            *_reviewed_diff_keys_from_file(args.reviewed_diff_keys_file),
        ],
        expected_sources=_json_list_from_file(args.expected_sources),
        v3_source_statuses=_json_list_from_file(args.source_statuses),
        review_tasks=_json_list_from_file(args.review_tasks),
    )
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
