"""Source drift report for v3 quarterly review gates."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR


DEFAULT_OUTPUT_PATH = PROCESSED_DIR / "source_drift_report.json"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
DEFAULT_OLD_CANDIDATES_DIR = PROCESSED_DIR / "validated_candidates_v3_previous"
DEFAULT_NEW_CANDIDATES_DIR = PROCESSED_DIR / "validated_candidates_v3"


def _index_by_slug(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {
        str(row.get("canonical_slug") or row.get("normalized_title") or row.get("title")): row
        for row in rows
        if isinstance(row, dict)
    }


def _field(row: dict[str, Any], field_name: str) -> Any:
    value = row.get(field_name)
    if isinstance(value, dict):
        return value.get("text") or value.get("label") or value.get("state") or value
    return value


def _field_evidence(row: dict[str, Any], field_name: str) -> dict[str, Any]:
    evidence = row.get("field_evidence") if isinstance(row.get("field_evidence"), dict) else {}
    evidence_keys = [field_name]
    if field_name == "price":
        evidence_keys.append("fee")
    for key in evidence_keys:
        value = evidence.get(key)
        if isinstance(value, dict):
            return value
    return {}


def _changed_field_visual_evidence(row: dict[str, Any], field_name: str) -> dict[str, Any]:
    evidence = _field_evidence(row, field_name)
    source = evidence.get("source") if isinstance(evidence.get("source"), dict) else {}
    text = (
        evidence.get("raw_value")
        or source.get("text")
        or source.get("raw_text")
    )
    values = {
        "page_number": source.get("page_number"),
        "page_image_sha256": source.get("page_image_sha256") or source.get("canonical_image_sha256"),
        "page_image_path": (
            source.get("page_image_path")
            or source.get("canonical_image_path")
            or source.get("canonical_image_storage_path")
        ),
        "crop_storage_path": source.get("crop_storage_path") or source.get("field_crop") or source.get("crop_path"),
        "crop_sha256": source.get("crop_sha256") or source.get("field_crop_sha256"),
        "bbox_px": source.get("bbox_px"),
        "text": text,
    }
    return {key: value for key, value in values.items() if value is not None and value != ""}


def _changed(old_by_slug: dict[str, dict[str, Any]], new_by_slug: dict[str, dict[str, Any]], field_name: str) -> list[dict[str, Any]]:
    changes: list[dict[str, Any]] = []
    for slug in sorted(set(old_by_slug) & set(new_by_slug)):
        old_value = _field(old_by_slug[slug], field_name)
        new_value = _field(new_by_slug[slug], field_name)
        if old_value != new_value:
            changes.append(
                {
                    "canonical_slug": slug,
                    "title": new_by_slug[slug].get("title") or old_by_slug[slug].get("title"),
                    "old": old_value,
                    "new": new_value,
                    **_changed_field_visual_evidence(new_by_slug[slug], field_name),
                }
            )
    return changes


def _title_details(indexed_rows: dict[str, dict[str, Any]], slugs: list[str]) -> list[dict[str, Any]]:
    details: list[dict[str, Any]] = []
    for slug in slugs:
        row = indexed_rows[slug]
        title = str(row.get("title") or slug)
        details.append(
            {
                "title": title,
                "canonical_slug": slug,
                **_changed_field_visual_evidence(row, "title"),
            }
        )
    return details


def _is_movie_row(row: dict[str, Any]) -> bool:
    return (
        row.get("candidate_type") == "movie"
        or bool(row.get("movie_title"))
        or row.get("category") == "movie"
    )


def _activity_count(rows: list[dict[str, Any]]) -> int:
    return sum(1 for row in rows if not _is_movie_row(row))


def _movie_count(rows: list[dict[str, Any]]) -> int:
    return sum(1 for row in rows if _is_movie_row(row))


def _field_from_validation_findings(findings: list[Any]) -> str | None:
    for finding in findings:
        value = str(finding)
        for prefix in (
            "missing_required_field:",
            "engine_disagreement:",
            "manual_review_required:",
        ):
            if value.startswith(prefix):
                return value.split(":", 1)[1]
        if value == "unknown_location":
            return "location"
        if value == "unparsed_schedule":
            return "schedule"
        if value == "fee_marker_conflict":
            return "price"
    return None


def _validation_failure_visual_evidence(row: dict[str, Any], findings: list[Any]) -> dict[str, Any]:
    field_name = _field_from_validation_findings(findings)
    if field_name:
        evidence = _changed_field_visual_evidence(row, field_name)
        if evidence:
            return evidence
    field_evidence = row.get("field_evidence") if isinstance(row.get("field_evidence"), dict) else {}
    for candidate_field in ("title", "schedule", "location", "price", "fee", "movie_title"):
        if isinstance(field_evidence.get(candidate_field), dict):
            evidence = _changed_field_visual_evidence(row, candidate_field)
            if evidence:
                return evidence
    return {}


def _validation_failures(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    for row in rows:
        findings = row.get("validation_findings")
        if not isinstance(findings, list) or not findings:
            continue
        failures.append(
            {
                "candidate_id": row.get("candidate_id"),
                "canonical_slug": row.get("canonical_slug"),
                "title": row.get("title") or row.get("normalized_title"),
                "validation_findings": [str(finding) for finding in findings],
                **_validation_failure_visual_evidence(row, findings),
            }
        )
    return failures


def _region_visual_evidence(region: dict[str, Any]) -> dict[str, Any]:
    values = {
        "page_image_sha256": region.get("page_image_sha256") or region.get("canonical_image_sha256"),
        "page_image_path": (
            region.get("page_image_path")
            or region.get("canonical_image_path")
            or region.get("canonical_image_storage_path")
        ),
        "crop_storage_path": region.get("crop_storage_path") or region.get("field_crop") or region.get("crop_path"),
        "crop_sha256": region.get("crop_sha256") or region.get("field_crop_sha256"),
    }
    return {key: value for key, value in values.items() if value is not None and value != ""}


def _unknown_regions(regions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unknown: list[dict[str, Any]] = []
    for region in regions:
        family = str(region.get("region_family") or region.get("family") or "").strip().lower()
        if family not in {"unknown", "unknown_document_family", "unclassified"}:
            continue
        unknown.append(
            {
                "region_id": region.get("region_id"),
                "region_family": region.get("region_family") or region.get("family"),
                "page_number": region.get("page_number"),
                **_region_visual_evidence(region),
                "bbox_px": region.get("bbox_px"),
                "text": region.get("text"),
            }
        )
    return unknown


def build_source_drift_report(
    *,
    old_source_hash: str,
    new_source_hash: str,
    old_rows: list[dict[str, Any]],
    new_rows: list[dict[str, Any]],
    new_regions: list[dict[str, Any]] | None = None,
    old_document_family: str | None = None,
    new_document_family: str | None = None,
    activity_count_threshold: int = 0,
    movie_count_threshold: int = 0,
    baseline_mode: str | None = None,
) -> dict[str, Any]:
    old_by_slug = _index_by_slug(old_rows)
    new_by_slug = _index_by_slug(new_rows)
    added = sorted(set(new_by_slug) - set(old_by_slug))
    removed = sorted(set(old_by_slug) - set(new_by_slug))
    changed_schedules = _changed(old_by_slug, new_by_slug, "schedule")
    changed_locations = _changed(old_by_slug, new_by_slug, "location")
    changed_fees = _changed(old_by_slug, new_by_slug, "price")
    old_activity_count = _activity_count(old_rows)
    new_activity_count = _activity_count(new_rows)
    old_movie_count = _movie_count(old_rows)
    new_movie_count = _movie_count(new_rows)
    validation_failures = _validation_failures(new_rows)
    new_unknown_regions = _unknown_regions(new_regions or [])
    publish_blockers: list[str] = []
    first_v3_baseline = baseline_mode == "first_v3_baseline"
    if not first_v3_baseline and old_document_family and new_document_family and old_document_family != new_document_family:
        publish_blockers.append("recognized_family_changed")
    if not first_v3_baseline and abs(new_activity_count - old_activity_count) > activity_count_threshold:
        publish_blockers.append("activity_count_drift")
    if not first_v3_baseline and abs(new_movie_count - old_movie_count) > movie_count_threshold:
        publish_blockers.append("movie_count_drift")
    if validation_failures:
        publish_blockers.append("validation_failures")
    if new_unknown_regions:
        publish_blockers.append("new_unknown_regions")
    manual_review_required = bool(
        (not first_v3_baseline and old_source_hash != new_source_hash)
        or (not first_v3_baseline and added)
        or (not first_v3_baseline and removed)
        or (not first_v3_baseline and changed_schedules)
        or (not first_v3_baseline and changed_locations)
        or (not first_v3_baseline and changed_fees)
        or publish_blockers
    )
    return {
        "generated_at": _now_iso(),
        "baseline_mode": baseline_mode,
        "status": "review_required" if manual_review_required else "clean",
        "old_hash": old_source_hash,
        "new_hash": new_source_hash,
        "old_document_family": old_document_family,
        "new_document_family": new_document_family,
        "old_activity_count": old_activity_count,
        "new_activity_count": new_activity_count,
        "old_movie_count": old_movie_count,
        "new_movie_count": new_movie_count,
        "new_titles": [str(new_by_slug[slug].get("title") or slug) for slug in added],
        "new_title_details": _title_details(new_by_slug, added),
        "removed_titles": [str(old_by_slug[slug].get("title") or slug) for slug in removed],
        "removed_title_details": _title_details(old_by_slug, removed),
        "changed_schedules": changed_schedules,
        "changed_locations": changed_locations,
        "changed_fees": changed_fees,
        "new_unknown_regions": new_unknown_regions,
        "validation_failures": validation_failures,
        "publish_blockers": publish_blockers,
        "manual_review_required": manual_review_required,
    }


def _candidate_rows_from_payload(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if isinstance(payload, dict):
        for key in ("candidates", "rows", "validated_candidates"):
            value = payload.get(key)
            if isinstance(value, list):
                return [row for row in value if isinstance(row, dict)]
    return []


def load_candidate_rows_from_directory(candidates_dir: Path) -> list[dict[str, Any]]:
    if not candidates_dir.exists():
        return []
    rows: list[dict[str, Any]] = []
    for path in sorted(candidates_dir.glob("*.json")):
        try:
            rows.extend(_candidate_rows_from_payload(json.loads(path.read_text())))
        except Exception:
            continue
    return rows


def _calendar_group_key(row: dict[str, Any]) -> str:
    return str(row.get("calendar_group_key") or row.get("group") or "unknown")


def _source_document_id(row: dict[str, Any]) -> str:
    return str(
        row.get("source_document_id")
        or row.get("source_id")
        or row.get("document_id")
        or ""
    ).strip()


def _source_group_key(row: dict[str, Any]) -> str:
    source_document_id = _source_document_id(row)
    if source_document_id:
        return f"source:{source_document_id}"
    return f"calendar_group:{_calendar_group_key(row)}"


def _group_rows_by_source(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(_source_group_key(row), []).append(row)
    return grouped


def _source_hash_for(rows: list[dict[str, Any]]) -> str:
    for row in rows:
        value = row.get("content_sha256") or row.get("source_sha256") or row.get("source_hash")
        if value:
            return str(value)
    return ""


def _document_family_for(rows: list[dict[str, Any]]) -> str | None:
    for row in rows:
        value = row.get("document_family")
        if value:
            return str(value)
    return None


def _first_non_empty(rows: list[dict[str, Any]], field_name: str) -> str | None:
    for row in rows:
        value = str(row.get(field_name) or "").strip()
        if value:
            return value
    return None


def _source_metadata_from_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    keys = (
        "source_kind",
        "source_role",
        "canonical_url",
        "fetched_url",
        "http_status",
        "currentness",
        "captured_at",
    )
    metadata: dict[str, Any] = {}
    for key in keys:
        for row in rows:
            value = row.get(key)
            if value not in {None, ""}:
                metadata[key] = value
                break
    return metadata


def _source_document_id_from_rows(rows: list[dict[str, Any]]) -> str | None:
    for row in rows:
        value = _source_document_id(row)
        if value:
            return value
    return None


def build_quarter_source_drift_report(
    *,
    old_rows: list[dict[str, Any]],
    new_rows: list[dict[str, Any]],
    quarter: str | None,
    activity_count_threshold: int = 0,
    movie_count_threshold: int = 0,
) -> dict[str, Any]:
    old_by_group = _group_rows_by_source(old_rows)
    new_by_group = _group_rows_by_source(new_rows)
    first_v3_baseline = not old_by_group and bool(new_by_group)
    source_reports: list[dict[str, Any]] = []
    aggregate_blockers: set[str] = set()

    for group in sorted(set(old_by_group) | set(new_by_group)):
        old_group_rows = old_by_group.get(group, [])
        new_group_rows = new_by_group.get(group, [])
        old_hash = _source_hash_for(old_group_rows)
        new_hash = _source_hash_for(new_group_rows)
        report = build_source_drift_report(
            old_source_hash=old_hash,
            new_source_hash=new_hash,
            old_rows=old_group_rows,
            new_rows=new_group_rows,
            old_document_family=_document_family_for(old_group_rows),
            new_document_family=_document_family_for(new_group_rows),
            activity_count_threshold=activity_count_threshold,
            movie_count_threshold=movie_count_threshold,
            baseline_mode="first_v3_baseline" if first_v3_baseline else None,
        )
        report["source_key"] = group
        report["source_document_id"] = _source_document_id_from_rows(new_group_rows) or _source_document_id_from_rows(
            old_group_rows
        )
        report["calendar_group_key"] = _first_non_empty(new_group_rows, "calendar_group_key") or _first_non_empty(
            old_group_rows, "calendar_group_key"
        ) or group.removeprefix("calendar_group:")
        report.update(_source_metadata_from_rows(new_group_rows) or _source_metadata_from_rows(old_group_rows))
        if not first_v3_baseline and old_hash != new_hash:
            aggregate_blockers.add("source_hash_changed")
        if old_group_rows and not new_group_rows:
            aggregate_blockers.add("missing_new_source")
        if not first_v3_baseline and new_group_rows and not old_group_rows:
            aggregate_blockers.add("missing_old_source")
        for blocker in report.get("publish_blockers") or []:
            aggregate_blockers.add(str(blocker))
        source_reports.append(report)

    review_required_count = sum(1 for report in source_reports if report.get("status") != "clean")
    status = "review_required" if review_required_count or aggregate_blockers else "clean"
    return {
        "report_kind": "v3_quarter_source_drift",
        "generated_at": _now_iso(),
        "quarter": quarter,
        "baseline_mode": "first_v3_baseline" if first_v3_baseline else None,
        "status": status,
        "summary": {
            "source_count": len(source_reports),
            "clean_count": len(source_reports) - review_required_count,
            "review_required_count": review_required_count,
        },
        "publish_blockers": sorted(aggregate_blockers),
        "manual_review_required": status != "clean",
        "source_reports": source_reports,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build v3 source drift report")
    parser.add_argument("--old", type=Path)
    parser.add_argument("--new", type=Path)
    parser.add_argument("--old-candidates-dir", type=Path, default=DEFAULT_OLD_CANDIDATES_DIR)
    parser.add_argument("--new-candidates-dir", type=Path, default=DEFAULT_NEW_CANDIDATES_DIR)
    parser.add_argument("--quarter")
    parser.add_argument("--new-regions", type=Path)
    parser.add_argument("--old-source-hash")
    parser.add_argument("--new-source-hash")
    parser.add_argument("--old-document-family")
    parser.add_argument("--new-document-family")
    parser.add_argument("--activity-count-threshold", type=int, default=0)
    parser.add_argument("--movie-count-threshold", type=int, default=0)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.quarter and not (args.old or args.new):
        report = build_quarter_source_drift_report(
            old_rows=load_candidate_rows_from_directory(args.old_candidates_dir),
            new_rows=load_candidate_rows_from_directory(args.new_candidates_dir),
            quarter=args.quarter,
            activity_count_threshold=args.activity_count_threshold,
            movie_count_threshold=args.movie_count_threshold,
        )
        if args.json:
            print(json.dumps(report, indent=2, sort_keys=True))
            return
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
        print(args.output)
        return

    missing = [
        flag
        for flag, value in (
            ("--old", args.old),
            ("--new", args.new),
            ("--old-source-hash", args.old_source_hash),
            ("--new-source-hash", args.new_source_hash),
        )
        if not value
    ]
    if missing:
        parser.error(f"single-source mode requires {', '.join(missing)}")

    old_rows = json.loads(args.old.read_text())
    new_rows = json.loads(args.new.read_text())
    new_regions = json.loads(args.new_regions.read_text()) if args.new_regions and args.new_regions.exists() else []
    report = build_source_drift_report(
        old_source_hash=str(args.old_source_hash),
        new_source_hash=str(args.new_source_hash),
        old_rows=old_rows if isinstance(old_rows, list) else [],
        new_rows=new_rows if isinstance(new_rows, list) else [],
        new_regions=new_regions if isinstance(new_regions, list) else [],
        old_document_family=args.old_document_family,
        new_document_family=args.new_document_family,
        activity_count_threshold=args.activity_count_threshold,
        movie_count_threshold=args.movie_count_threshold,
    )
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
