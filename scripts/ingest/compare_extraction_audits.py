"""Compare deterministic Gold extraction to visual PDF audit observations."""

from __future__ import annotations

import argparse
import json
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover
    from .config import PROCESSED_DIR


DEFAULT_GOLD_PATH = PROCESSED_DIR / "activity_gold_v2_preview.json"
DEFAULT_VISUAL_AUDIT_DIR = PROCESSED_DIR / "pdf_visual_audits"
DEFAULT_COMPARISON_REPORT = PROCESSED_DIR / "pdf_visual_audit_report.json"
DEFAULT_FIELD_REPORT = PROCESSED_DIR / "field_audit_report.json"
SEED_MODEL = "source_provenance_visual_seed_v1"
SEED_AUDIT_MODE = "source_provenance_seed"
INDEPENDENT_AUDIT_MODE = "independent_gpt_visual"
INDEPENDENT_CODEX_AUDIT_MODE = "independent_codex_visual"

BLOCKING_MISMATCHES = {
    "title_missing_in_one_extractor",
    "title_disagrees",
    "price_state_disagrees",
    "fee_marker_disagrees",
    "schedule_time_disagrees",
    "location_disagrees",
    "date_or_validity_disagrees",
    "optional_add_on_disagrees",
}


def _normalize(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def _title_similarity(left: Any, right: Any) -> float:
    return SequenceMatcher(None, _normalize(left), _normalize(right)).ratio()


def _row_key(row: dict[str, Any]) -> str:
    return f"{row.get('calendar_group_key')}:{row.get('canonical_slug')}"


def _visual_activities_by_title(visual_audits: dict[str, dict[str, Any]]) -> dict[tuple[str, str], dict[str, Any]]:
    result: dict[tuple[str, str], dict[str, Any]] = {}
    for source_hash, audit in visual_audits.items():
        activities = audit.get("activities")
        if not isinstance(activities, list):
            continue
        for activity in activities:
            if not isinstance(activity, dict):
                continue
            result[(source_hash, _normalize(activity.get("title")))] = activity
    return result


def _visual_match(row: dict[str, Any], visual_by_title: dict[tuple[str, str], dict[str, Any]]) -> dict[str, Any] | None:
    source_hash = str(row.get("source_sha256") or "")
    direct = visual_by_title.get((source_hash, _normalize(row.get("title"))))
    if direct:
        return direct
    candidates = [
        activity
        for (candidate_hash, _), activity in visual_by_title.items()
        if candidate_hash == source_hash
    ]
    scored = [
        (_title_similarity(row.get("title"), activity.get("title")), activity)
        for activity in candidates
    ]
    if not scored:
        return None
    score, activity = max(scored, key=lambda item: item[0])
    return activity if score >= 0.9 else None


def compare_gold_rows_to_visual_audits(
    gold_rows: list[dict[str, Any]],
    visual_audits: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    blocking: list[dict[str, Any]] = []
    review: list[dict[str, Any]] = []
    warnings: list[str] = []
    expected_pdf_hashes = {
        str(row.get("source_sha256") or "")
        for row in gold_rows
        if isinstance(row, dict)
        and str(row.get("source_url") or (row.get("source") or {}).get("url") or "").endswith(".pdf")
        and row.get("source_sha256")
    }
    independent_hashes = {
        str(source_hash)
        for source_hash, audit in visual_audits.items()
        if audit.get("audit_mode") in {INDEPENDENT_AUDIT_MODE, INDEPENDENT_CODEX_AUDIT_MODE}
        and audit.get("model") != SEED_MODEL
    }
    seed_hashes = {
        str(source_hash)
        for source_hash, audit in visual_audits.items()
        if audit.get("audit_mode") == SEED_AUDIT_MODE
        or audit.get("model") == SEED_MODEL
    }
    missing_independent_hashes = sorted(expected_pdf_hashes - independent_hashes)
    if seed_hashes:
        warnings.append("independent_gpt_visual_review_not_run")
    visual_by_title = _visual_activities_by_title(visual_audits)
    compared = 0

    for row in gold_rows:
        if not str(row.get("source_url") or "").endswith(".pdf"):
            continue
        visual = _visual_match(row, visual_by_title)
        if not visual:
            review.append({"kind": "visual_activity_missing", "row_key": _row_key(row), "title": row.get("title")})
            continue
        compared += 1
        visual_title = visual.get("title")
        if _title_similarity(row.get("title"), visual_title) < 0.9:
            blocking.append({"kind": "title_disagrees", "row_key": _row_key(row), "gold": row.get("title"), "visual": visual_title})
        gold_price = row.get("price") if isinstance(row.get("price"), dict) else {}
        gold_state = str(gold_price.get("state") or "unknown")
        visual_state = str(visual.get("price_state") or "unknown")
        if gold_state != visual_state:
            blocking.append({"kind": "price_state_disagrees", "row_key": _row_key(row), "gold": gold_state, "visual": visual_state})

    report = {
        "passed": not blocking,
        "summary": {
            "pdfs_audited": len(visual_audits),
            "expected_current_pdf_hashes": len(expected_pdf_hashes),
            "independent_pdfs_audited": len(independent_hashes),
            "seed_pdfs_audited": len(seed_hashes),
            "missing_independent_pdf_hashes": missing_independent_hashes,
            "independent_visual_ocr_coverage": "high"
            if expected_pdf_hashes
            and not missing_independent_hashes
            and not blocking
            else "low",
            "activities_compared": compared,
            "blocking_mismatches": len(blocking),
            "review_mismatches": len(review),
        },
        "blocking_mismatches": blocking,
        "review_mismatches": review,
        "warnings": warnings,
    }
    return report


def _has_provenance(row: dict[str, Any], field: str) -> bool:
    provenance = row.get("field_provenance")
    spans = provenance.get(field) if isinstance(provenance, dict) else None
    return isinstance(spans, list) and bool(spans)


def _required_fields(row: dict[str, Any]) -> list[str]:
    fields = ["title", "schedule", "location"]
    price = row.get("price") if isinstance(row.get("price"), dict) else {}
    if price.get("state") in {"free", "fee"}:
        fields.append("price")
    if row.get("description"):
        fields.append("description")
    return fields


def _field_value(row: dict[str, Any], field: str) -> str:
    if field == "title":
        return str(row.get("title") or "")
    if field == "schedule":
        schedule = row.get("schedule") if isinstance(row.get("schedule"), dict) else {}
        return str(schedule.get("text") or "")
    if field == "location":
        location = row.get("location") if isinstance(row.get("location"), dict) else {}
        return str(location.get("label") or "")
    if field == "price":
        price = row.get("price") if isinstance(row.get("price"), dict) else {}
        return str(price.get("state") or "unknown")
    if field == "description":
        return str(row.get("description") or "")
    return str(row.get(field) or "")


def build_field_audit_report(
    gold_rows: list[dict[str, Any]],
    visual_audits: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    visual_audits = visual_audits or {}
    visual_by_title = _visual_activities_by_title(visual_audits)
    fields: list[dict[str, Any]] = []
    errors: list[str] = []

    for row in gold_rows:
        row_key = _row_key(row)
        source_url = str(row.get("source_url") or (row.get("source") or {}).get("url") or "")
        source_hash = str(row.get("source_sha256") or (row.get("source") or {}).get("documentHash") or "")
        visual = _visual_match(row, visual_by_title)
        visual_support = visual is not None

        for field in _required_fields(row):
            deterministic_support = _has_provenance(row, field)
            field_errors: list[str] = []
            if not source_url:
                field_errors.append("field_missing_source_url")
            if not source_hash:
                field_errors.append("field_missing_source_hash")
            if not deterministic_support:
                field_errors.append("field_missing_provenance")
            confidence = "high" if deterministic_support and visual_support else "medium" if deterministic_support else "low"
            field_row = {
                "row_key": row_key,
                "field": field,
                "published_value": _field_value(row, field),
                "source_url": source_url,
                "source_sha256": source_hash,
                "deterministic_support": deterministic_support,
                "visual_support": visual_support,
                "manual_support": False,
                "confidence": confidence,
                "errors": field_errors,
            }
            fields.append(field_row)
            errors.extend(f"{row_key}:{field}:{error}" for error in field_errors)

    return {
        "passed": not errors,
        "summary": {
            "rows_audited": len(gold_rows),
            "fields_audited": len(fields),
            "errors": len(errors),
            "high_confidence_fields": sum(1 for row in fields if row["confidence"] == "high"),
            "medium_confidence_fields": sum(1 for row in fields if row["confidence"] == "medium"),
            "low_confidence_fields": sum(1 for row in fields if row["confidence"] == "low"),
        },
        "errors": errors,
        "fields": fields,
    }


def load_visual_audits(path: Path = DEFAULT_VISUAL_AUDIT_DIR) -> dict[str, dict[str, Any]]:
    audits: dict[str, dict[str, Any]] = {}
    if not path.exists():
        return audits
    for audit_path in sorted(path.glob("*.json")):
        audit = json.loads(audit_path.read_text())
        if isinstance(audit, dict) and audit.get("source_pdf_sha256"):
            audits[str(audit["source_pdf_sha256"])] = audit
    return audits


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare Gold extraction to visual PDF audits")
    parser.add_argument("--gold-path", type=Path, default=DEFAULT_GOLD_PATH)
    parser.add_argument("--visual-audit-dir", type=Path, default=DEFAULT_VISUAL_AUDIT_DIR)
    parser.add_argument("--comparison-output", type=Path, default=DEFAULT_COMPARISON_REPORT)
    parser.add_argument("--field-output", type=Path, default=DEFAULT_FIELD_REPORT)
    parser.add_argument("--json", action="store_true", help="print full JSON report instead of summary")
    args = parser.parse_args()

    gold_rows = json.loads(args.gold_path.read_text())
    visual_audits = load_visual_audits(args.visual_audit_dir)
    comparison = compare_gold_rows_to_visual_audits(gold_rows, visual_audits)
    field_report = build_field_audit_report(gold_rows, visual_audits)
    args.comparison_output.parent.mkdir(parents=True, exist_ok=True)
    args.comparison_output.write_text(json.dumps(comparison, indent=2, ensure_ascii=False) + "\n")
    args.field_output.write_text(json.dumps(field_report, indent=2, ensure_ascii=False) + "\n")
    report = {
        "comparison": comparison,
        "field_audit": {
            "passed": field_report["passed"],
            "summary": field_report["summary"],
            "errors": field_report["errors"][:20],
        },
    }
    compact_visual_summary = dict(comparison["summary"])
    missing_hashes = compact_visual_summary.pop("missing_independent_pdf_hashes", [])
    compact_visual_summary["missing_independent_pdf_hashes_count"] = (
        len(missing_hashes) if isinstance(missing_hashes, list) else 0
    )
    summary = {
        "passed": comparison["passed"] and field_report["passed"],
        "visual_summary": compact_visual_summary,
        "field_summary": field_report["summary"],
        "errors": [*comparison.get("blocking_mismatches", []), *field_report.get("errors", [])][:20],
        "warnings": comparison.get("warnings", []),
    }
    print(json.dumps(report if args.json else summary, indent=2, ensure_ascii=False))
    if not comparison["passed"] or not field_report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
