"""Gate 0 field-level evaluation inventory for the vision v3 migration.

This command is intentionally read-only by default. It inventories existing v2
review blockers, manual-review records, and expected-unextractable fixture rows
so v3 work starts from known failures instead of neutral samples.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FIXTURES_DIR = ROOT / "data/golden/activities"
DEFAULT_REVIEW_QUEUE_PATH = ROOT / "data/processed/activity_review_queue_v2_preview.json"
DEFAULT_MANUAL_REVIEW_PATH = ROOT / "data/processed/manual_review_report.json"
DEFAULT_OUTPUT_PATH = ROOT / "data/processed/eval/baseline_v2_report.json"

FORMAT_COVERAGE_SAMPLES = [
    {
        "calendar_group_key": "boardwalk",
        "source_path": "data/raw/pdfs/BW_Aframe_Recreation-0526_DIGITAL.pdf",
        "document_family": "aframe_recreation_pdf",
    },
    {
        "calendar_group_key": "art-of-animation",
        "source_path": "data/raw/pdfs/DAAR_CKS-Digital-Rec-Sign_052626-FINAL.jpg",
        "document_family": "vertical_digital_rec_sign_image",
    },
    {
        "calendar_group_key": "all-star-sports",
        "source_path": "data/raw/pdfs/All-Star-Sports_Aframe_Recreation-0526_DIGITAL.pdf",
        "document_family": "aframe_recreation_pdf",
    },
]


def _read_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        return fallback


def _reason_list(record: dict[str, Any]) -> list[str]:
    reasons = record.get("all_reasons")
    if isinstance(reasons, list) and reasons:
        return [str(reason) for reason in reasons if str(reason)]
    warnings = record.get("warnings")
    if isinstance(warnings, list) and warnings:
        return [str(warning) for warning in warnings if str(warning)]
    reason = record.get("reason")
    if isinstance(reason, str) and reason:
        if reason.startswith("parser_warning:"):
            reason = reason.removeprefix("parser_warning:")
        return [part for part in reason.split(",") if part]
    return ["unspecified"]


def _failure_record(
    *,
    source: str,
    calendar_group_key: str | None,
    activity_slug: str | None,
    title: str | None,
    reason: str,
    severity: str,
    fixture: str | None = None,
    source_path: str | None = None,
    source_sha256: str | None = None,
) -> dict[str, Any]:
    return {
        "source": source,
        "calendar_group_key": calendar_group_key,
        "activity_slug": activity_slug,
        "title": title,
        "reason": reason,
        "severity": severity,
        "fixture": fixture,
        "source_path": source_path,
        "source_sha256": source_sha256,
        "publication_safe": False,
    }


def _review_queue_failures(path: Path) -> list[dict[str, Any]]:
    payload = _read_json(path, [])
    if not isinstance(payload, list):
        return []
    failures: list[dict[str, Any]] = []
    for record in payload:
        if not isinstance(record, dict):
            continue
        reasons = _reason_list(record)
        failures.append(
            _failure_record(
                source="activity_review_queue_v2_preview",
                calendar_group_key=str(record.get("calendar_group_key") or ""),
                activity_slug=str(record.get("activity_slug") or ""),
                title=None,
                reason=reasons[0],
                severity=str(record.get("severity") or "error"),
            )
        )
    return failures


def _manual_review_failures(path: Path) -> list[dict[str, Any]]:
    payload = _read_json(path, {})
    records = payload.get("records") if isinstance(payload, dict) else []
    if not isinstance(records, list):
        return []
    failures: list[dict[str, Any]] = []
    for record in records:
        if not isinstance(record, dict):
            continue
        failures.append(
            _failure_record(
                source="manual_review_report",
                calendar_group_key=str(record.get("calendar_group_key") or ""),
                activity_slug=str(record.get("slug") or ""),
                title=str(record.get("title") or ""),
                reason=str(record.get("reason") or "manual_review_required"),
                severity="manual_review",
                fixture=str(record.get("fixture") or ""),
                source_sha256=str(record.get("source_sha256") or ""),
            )
        )
    return failures


def _unextractable_failures(fixtures_dir: Path) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    for fixture_path in sorted(fixtures_dir.glob("*.json")):
        fixture = _read_json(fixture_path, {})
        if not isinstance(fixture, dict):
            continue
        records = fixture.get("expected_unextractable_records")
        if not isinstance(records, list):
            continue
        for record in records:
            if not isinstance(record, dict):
                continue
            for reason in _reason_list(record):
                failures.append(
                    _failure_record(
                        source="expected_unextractable_records",
                        calendar_group_key=str(fixture.get("calendar_group_key") or ""),
                        activity_slug=str(record.get("slug") or ""),
                        title=str(record.get("title") or ""),
                        reason=reason,
                        severity="unextractable",
                        fixture=fixture_path.name,
                        source_path=str(fixture.get("source_pdf") or fixture.get("source_web_snapshot") or ""),
                    )
                )
    return failures


def build_evaluation_report(
    *,
    fixtures_dir: Path = DEFAULT_FIXTURES_DIR,
    review_queue_path: Path = DEFAULT_REVIEW_QUEUE_PATH,
    manual_review_path: Path = DEFAULT_MANUAL_REVIEW_PATH,
) -> dict[str, Any]:
    review_queue_failures = _review_queue_failures(review_queue_path)
    manual_review_failures = _manual_review_failures(manual_review_path)
    unextractable_failures = _unextractable_failures(fixtures_dir)
    known_failures = [
        *review_queue_failures,
        *manual_review_failures,
        *unextractable_failures,
    ]

    reason_counts = Counter()
    group_counts = Counter()
    for failure in known_failures:
        reason_counts[str(failure.get("reason") or "unspecified")] += 1
        group_counts[str(failure.get("calendar_group_key") or "unknown")] += 1

    return {
        "pipeline_version": "vision_v3_gate0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "publication_behavior": "read_only_no_publish",
        "format_coverage_samples": FORMAT_COVERAGE_SAMPLES,
        "summary": {
            "known_failure_candidate_count": len(known_failures),
            "review_queue_count": len(review_queue_failures),
            "manual_review_count": len(manual_review_failures),
            "expected_unextractable_count": len(unextractable_failures),
            "format_coverage_sample_count": len(FORMAT_COVERAGE_SAMPLES),
        },
        "reason_counts": dict(sorted(reason_counts.items())),
        "calendar_group_counts": dict(sorted(group_counts.items())),
        "known_failures": known_failures,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Gate 0 v2 field-level failure inventory")
    parser.add_argument("--fixtures-dir", type=Path, default=DEFAULT_FIXTURES_DIR)
    parser.add_argument("--review-queue", type=Path, default=DEFAULT_REVIEW_QUEUE_PATH)
    parser.add_argument("--manual-review", type=Path, default=DEFAULT_MANUAL_REVIEW_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--json", action="store_true", help="Print report JSON to stdout")
    args = parser.parse_args()

    report = build_evaluation_report(
        fixtures_dir=args.fixtures_dir,
        review_queue_path=args.review_queue,
        manual_review_path=args.manual_review,
    )
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
