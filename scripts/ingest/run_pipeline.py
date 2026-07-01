#!/usr/bin/env python3
"""End-to-end activity ingest pipeline: discover → fetch → extract → validate → publish."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parents[1]
SOURCE_INVENTORY_PATH = "data/processed/source_inventory.json"
SOURCE_OVERRIDES_PATH = "data/processed/resort_pdf_source_overrides.json"
RESORT_PDF_DATE_AUDIT_PATH = "data/processed/resort_pdf_date_audit.json"
V3_PUBLISH_FLAGS_PATH = "config/publish_flags.yaml"
V3_REVIEW_DECISIONS_PATH = "data/processed/review_queue/vision_v3_review_decisions.json"
V3_DUAL_RUN_REVIEW_KEYS_PATH = "data/processed/review_queue/vision_v3_dual_run_review_keys.json"
V3_REVIEW_FIXTURE_CANDIDATES_PATH = "data/processed/review_queue/vision_v3_review_fixture_candidates.json"
V3_PARSER_RULE_REQUESTS_PATH = "data/processed/review_queue/vision_v3_parser_rule_update_requests.json"
V3_GOLD_PREVIEW_PATH = "data/processed/activity_gold_v3_preview.json"
V3_VISION_SNAPSHOTS_PATH = "data/processed/vision_snapshots"
V3_SOURCE_DRIFT_REPORT_PATH = "data/processed/source_drift_report.json"
V3_SOURCE_METRICS_REPORT_PATH = "data/processed/eval/v3_source_metrics.json"
V3_DUAL_RUN_REPORT_PATH = "data/processed/eval/v3_dual_run_report.json"
V3_MONITORING_REPORT_PATH = "data/processed/source_trust_monitoring_report.json"
V3_REVIEW_QUEUE_PATH = "data/processed/review_queue/vision_v3_review_queue.json"
V3_REVIEW_QUEUE_REPORT_PATH = "data/processed/eval/v3_review_queue_report.json"
V3_REVIEW_QUEUE_HTML_PATH = "data/processed/review_queue/vision_v3_review_queue.html"
V3_REVIEW_QUEUE_CHECKLIST_PATH = "data/processed/review_queue/vision_v3_publish_blocker_checklist.csv"
V3_REVIEWED_SOURCE_DRIFT_REPORT_PATH = (
    "data/processed/review_queue/vision_v3_reviewed_source_drift_report.json"
)


def run(script: str, *args: str) -> None:
    cmd = [sys.executable, str(SCRIPTS / script), *args]
    print(f"\n>>> {' '.join(cmd)}")
    if subprocess.run(cmd, cwd=ROOT, env=os.environ.copy()).returncode != 0:
        raise SystemExit(1)


def validation_gate_steps(*, local_only: bool) -> list[tuple[str, ...]]:
    coverage_gate = (
        ("audit_coverage.py",)
        if local_only
        else ("audit_coverage.py", "--require-production-ready")
    )
    promote_step = ("promote_gold.py",) if local_only else ("promote_gold.py", "--fail-on-review")
    return [
        ("validate.py", "--strict"),
        ("validate_v2.py",),
        ("magical_resort_guide.py",),
        promote_step,
        coverage_gate,
        ("trust_report.py",),
    ]


def publish_steps(*, local_only: bool, has_service_role: bool) -> list[tuple[str, ...]]:
    if local_only or not has_service_role:
        return []
    return [
        ("publish_gold_v2.py",),
        ("publish_official_offerings.py",),
        ("enrichment.py",),
    ]


def _with_quarter(step: tuple[str, ...], quarter: str | None) -> tuple[str, ...]:
    return (*step, "--quarter", quarter) if quarter else step


def _promote_gold_v3_step(*, quarter: str | None) -> tuple[str, ...]:
    step = ("promote_gold_v3.py", "--preview", "--include-approved-review")
    if quarter:
        step = (*step, "--expected-sources", SOURCE_INVENTORY_PATH, "--quarter", quarter)
    return step


def _build_review_queue_v3_step(*, quarter: str | None, include_dual_run_report: bool) -> tuple[str, ...]:
    step = (
        "build_review_queue_v3.py",
        "--output",
        V3_REVIEW_QUEUE_PATH,
        "--report-output",
        V3_REVIEW_QUEUE_REPORT_PATH,
        "--html-output",
        V3_REVIEW_QUEUE_HTML_PATH,
        "--checklist-output",
        V3_REVIEW_QUEUE_CHECKLIST_PATH,
    )
    if quarter:
        step = (
            *step,
            "--source-drift-report",
            V3_REVIEWED_SOURCE_DRIFT_REPORT_PATH,
        )
    if include_dual_run_report:
        step = (*step, "--dual-run-report", V3_DUAL_RUN_REPORT_PATH)
    else:
        step = (*step, "--no-dual-run-report")
    return step


def vision_v3_report_steps(*, local_only: bool, quarter: str | None = None) -> list[tuple[str, ...]]:
    if not local_only and not quarter:
        raise ValueError("vision_v3_quarter_required")
    render_step = (
        "render_source_pages.py",
        "--source-inventory",
        SOURCE_INVENTORY_PATH,
        *(() if local_only else ("--upsert-source-document-pages",)),
    )
    snapshot_step = (
        "vision_snapshot.py",
        "--attach-regions",
        *(() if local_only else ("--upsert-layout-snapshots",)),
    )
    steps: list[tuple[str, ...]] = [
        ("evaluate_activity_extraction.py",),
        (
            "build_source_inventory.py",
            "--source-overrides",
            SOURCE_OVERRIDES_PATH,
            "--resort-pdf-date-audit",
            RESORT_PDF_DATE_AUDIT_PATH,
        ),
        _with_quarter(render_step, quarter),
        _with_quarter(snapshot_step, quarter),
        _with_quarter(("extract_v3.py",), quarter),
        _with_quarter(("validate_v3.py",), quarter),
        _with_quarter(("source_status_v3.py", "--v3-visual-only"), quarter),
    ]
    if quarter:
        steps.append(
            (
                "source_drift_report.py",
                "--quarter",
                quarter,
                "--new-regions",
                V3_VISION_SNAPSHOTS_PATH,
                "--output",
                V3_SOURCE_DRIFT_REPORT_PATH,
            )
        )
        steps.append(
            (
                "review_schema_v3.py",
                V3_REVIEW_DECISIONS_PATH,
                "--export",
                "reviewed-source-drift-report",
                "--source-drift-report",
                V3_SOURCE_DRIFT_REPORT_PATH,
                "--output",
                V3_REVIEWED_SOURCE_DRIFT_REPORT_PATH,
            )
        )
    steps.extend(
        [
            _build_review_queue_v3_step(quarter=quarter, include_dual_run_report=False),
            (
                "review_schema_v3.py",
                V3_REVIEW_DECISIONS_PATH,
                "--export",
                "fixture-candidates",
                "--output",
                V3_REVIEW_FIXTURE_CANDIDATES_PATH,
            ),
            (
                "review_schema_v3.py",
                V3_REVIEW_DECISIONS_PATH,
                "--export",
                "parser-rule-requests",
                "--output",
                V3_PARSER_RULE_REQUESTS_PATH,
            ),
            _promote_gold_v3_step(quarter=quarter),
            _with_quarter(
                (
                    "source_metrics_v3.py",
                    "--v3-visual-only",
                    "--preview",
                    V3_GOLD_PREVIEW_PATH,
                    "--output",
                    V3_SOURCE_METRICS_REPORT_PATH,
                ),
                quarter,
            ),
            (
                "review_schema_v3.py",
                V3_REVIEW_DECISIONS_PATH,
                "--export",
                "dual-run-review-keys",
                "--output",
                V3_DUAL_RUN_REVIEW_KEYS_PATH,
            ),
        ]
    )
    steps.extend([
        (
            "v3_dual_run_report.py",
            "--v2",
            "data/processed/activity_gold_v2_preview.json",
            "--v3",
            "data/processed/activity_gold_v3_preview.json",
            "--expected-sources",
            "data/processed/source_inventory.json",
            "--source-statuses",
            "data/processed/eval/v3_source_statuses.json",
            "--review-tasks",
            "data/processed/review_queue/vision_v3_review_queue.json",
            "--reviewed-diff-keys-file",
            V3_DUAL_RUN_REVIEW_KEYS_PATH,
            "--reviewed-status-transition-keys-file",
            V3_DUAL_RUN_REVIEW_KEYS_PATH,
            "--output",
            V3_DUAL_RUN_REPORT_PATH,
            *(() if not quarter else ("--quarter", quarter)),
        ),
        _build_review_queue_v3_step(quarter=quarter, include_dual_run_report=True),
        ("trust_report.py",),
    ])
    if not local_only:
        publish_step: tuple[str, ...] = (
            "publish_gold_v3.py",
            V3_GOLD_PREVIEW_PATH,
            "--flags",
            V3_PUBLISH_FLAGS_PATH,
            "--require-clean-preview",
            "--json",
            "--monitoring-report",
            V3_MONITORING_REPORT_PATH,
            "--review-queue",
            V3_REVIEW_QUEUE_PATH,
            "--review-queue-report",
            V3_REVIEW_QUEUE_REPORT_PATH,
            "--dual-run-report",
            V3_DUAL_RUN_REPORT_PATH,
        )
        if quarter:
            publish_step = (
                *publish_step,
                "--source-metrics-report",
                V3_SOURCE_METRICS_REPORT_PATH,
                "--source-drift-report",
                V3_REVIEWED_SOURCE_DRIFT_REPORT_PATH,
            )
        steps.append(publish_step)
    return steps


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Run full activity ingest pipeline")
    parser.add_argument("--skip-discover", action="store_true")
    parser.add_argument("--local-only", action="store_true")
    parser.add_argument("--no-playwright", action="store_true")
    parser.add_argument("--quarter", help="Limit supported source-aware stages to one source quarter, e.g. fy26-q4")
    parser.add_argument(
        "--vision-v3",
        action="store_true",
        help="Also generate v3 vision/report-only artifacts; public writes still require publish_gold_v3.py --publish",
    )
    args = parser.parse_args()

    if not args.skip_discover:
        discover_args = ["--no-playwright"] if args.no_playwright else ["--compare-db"]
        if args.local_only:
            discover_args = ["--no-playwright"]
        if args.quarter:
            discover_args.extend(["--quarter", args.quarter])
        run("discover.py", *discover_args)

    fetch_args = ["--local-only"] if args.local_only else []
    if args.quarter:
        fetch_args.extend(["--quarter", args.quarter])
    run("fetch.py", *fetch_args)

    extract_args = [] if args.local_only else ["--persist-db"]
    run("extract.py", *extract_args)
    for step in validation_gate_steps(local_only=args.local_only):
        run(*step)
    if args.vision_v3:
        for step in vision_v3_report_steps(local_only=args.local_only, quarter=args.quarter):
            run(*step)

    steps = publish_steps(
        local_only=args.local_only,
        has_service_role=bool(os.environ.get("SUPABASE_SERVICE_ROLE_KEY")),
    )
    if steps:
        for step in steps:
            run(*step)
    else:
        print("Skipping publish/enrichment (no service role key or local-only mode)")


if __name__ == "__main__":
    main()
