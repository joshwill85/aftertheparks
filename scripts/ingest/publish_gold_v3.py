"""Guarded v3 publisher entrypoint.

This module intentionally does not write public tables yet. It verifies the v3
preview and feature flag state so production publication cannot happen by
accident while the v3 pipeline is still in dual-run/report-only mode.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    from config import PROCESSED_DIR, ROOT
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR, ROOT


DEFAULT_FLAGS_PATH = ROOT / "config" / "publish_flags.yaml"
DEFAULT_DUAL_RUN_REPORT_PATH = PROCESSED_DIR / "eval" / "v3_dual_run_report.json"
DEFAULT_SOURCE_DRIFT_REPORT_PATH = PROCESSED_DIR / "source_drift_report.json"
CRITICAL_FIELD_EVIDENCE = ("title", "schedule", "location", "fee")
PROMOTABLE_ROW_STATUSES = {"auto_publishable", "manually_approved"}


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


def evaluate_publish_readiness(
    preview: dict[str, Any],
    *,
    flags: dict[str, Any],
    require_clean_preview: bool = True,
    dual_run_report: dict[str, Any] | None = None,
    source_drift_report: dict[str, Any] | None = None,
) -> dict[str, Any]:
    errors: list[str] = []
    publish_v3_enabled = flags.get("public_gold_source") == "v3" and flags.get("v3_publish_enabled") is True
    if not publish_v3_enabled:
        errors.append("v3_publish_disabled")
    if preview.get("publication_mode") != "vision_v3_preview":
        errors.append("invalid_preview_mode")
    rows = preview.get("rows")
    if not isinstance(rows, list):
        errors.append("preview_rows_missing")
        rows = []
    if require_clean_preview and int(preview.get("summary", {}).get("skipped_not_publishable") or 0):
        errors.append("preview_has_skipped_candidates")
    allowed_groups = set(_list_flag(flags.get("v3_allowed_calendar_groups")))
    allowed_families = set(_list_flag(flags.get("v3_allowed_document_families")))
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            errors.append(f"invalid_row:{index}")
            continue
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
                reviewed_page_hash = str(review_decision.get("page_image_sha256") or "")
                if reviewed_page_hash and reviewed_page_hash not in _field_page_hashes(row):
                    errors.append(f"row_stale_manual_review_page_image:{index}")
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
        if not isinstance(schedule.get("normalized"), dict) or not schedule.get("normalized"):
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
        for field_name in CRITICAL_FIELD_EVIDENCE:
            field_evidence = evidence.get(field_name)
            if not isinstance(field_evidence, dict):
                errors.append(f"row_missing_critical_field_evidence:{index}:{field_name}")
                continue
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
            if not field_source.get("bbox_px"):
                errors.append(f"row_missing_critical_field_bbox_px:{index}:{field_name}")
            if not field_source.get("crop_sha256"):
                errors.append(f"row_missing_critical_field_crop_sha256:{index}:{field_name}")
            if not field_source.get("crop_storage_path") and not field_source.get("crop_path"):
                errors.append(f"row_missing_critical_field_crop_path:{index}:{field_name}")
            if (
                field_evidence.get("agreement") == "disagreement"
                and row.get("review_status") != "manual_review_approved"
            ):
                errors.append(f"row_unresolved_engine_disagreement:{index}:{field_name}")
    if dual_run_report is None and require_clean_preview and publish_v3_enabled:
        errors.append("missing_dual_run_report")
    if dual_run_report is not None:
        if dual_run_report.get("status") != "clean":
            errors.append("dual_run_report_blocked")
        for blocker in dual_run_report.get("publish_blockers") or []:
            errors.append(str(blocker))
        for diff_key in dual_run_report.get("unreviewed_diff_keys") or []:
            errors.append(f"unreviewed_diff:{diff_key}")
    if source_drift_report is not None:
        if source_drift_report.get("status") not in {None, "clean"}:
            errors.append("source_drift_report_blocked")
        for blocker in source_drift_report.get("publish_blockers") or []:
            errors.append(str(blocker))
    return {
        "ready": not errors,
        "errors": errors,
        "row_count": len(rows),
        "mode": flags.get("public_gold_source"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Check whether Gold v3 preview is publish-ready")
    parser.add_argument("preview", type=Path)
    parser.add_argument("--flags", type=Path, default=DEFAULT_FLAGS_PATH)
    parser.add_argument("--require-clean-preview", action="store_true")
    parser.add_argument("--dual-run-report", type=Path, default=DEFAULT_DUAL_RUN_REPORT_PATH)
    parser.add_argument("--source-drift-report", type=Path, default=DEFAULT_SOURCE_DRIFT_REPORT_PATH)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    preview = json.loads(args.preview.read_text())
    dual_run_report = json.loads(args.dual_run_report.read_text()) if args.dual_run_report.exists() else None
    source_drift_report = (
        json.loads(args.source_drift_report.read_text()) if args.source_drift_report.exists() else None
    )
    readiness = evaluate_publish_readiness(
        preview,
        flags=load_publish_flags(args.flags),
        require_clean_preview=args.require_clean_preview,
        dual_run_report=dual_run_report,
        source_drift_report=source_drift_report,
    )
    if args.json:
        print(json.dumps(readiness, indent=2, sort_keys=True))
    else:
        print("ready" if readiness["ready"] else "blocked")
        for error in readiness["errors"]:
            print(error)
    if not readiness["ready"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
