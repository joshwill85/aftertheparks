#!/usr/bin/env python3
"""End-to-end activity ingest pipeline: discover → fetch → extract → validate → publish."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parents[1]


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
    return [
        ("validate.py", "--strict"),
        ("validate_v2.py",),
        ("magical_resort_guide.py",),
        ("promote_gold.py", "--fail-on-review"),
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


def vision_v3_report_steps(*, local_only: bool, quarter: str | None = None) -> list[tuple[str, ...]]:
    if not local_only and not quarter:
        raise ValueError("vision_v3_quarter_required")
    steps: list[tuple[str, ...]] = [
        ("evaluate_activity_extraction.py",),
        _with_quarter(("render_source_pages.py",), quarter),
        _with_quarter(("vision_snapshot.py", "--attach-regions"), quarter),
        _with_quarter(("extract_v3.py",), quarter),
        _with_quarter(("validate_v3.py",), quarter),
        ("source_status_v3.py",),
        ("source_metrics_v3.py",),
    ]
    if quarter:
        steps.append(("source_drift_report.py", "--quarter", quarter))
    steps.extend(
        [
            ("build_review_queue_v3.py",),
            ("promote_gold_v3.py", "--preview", "--include-approved-review"),
        ]
    )
    steps.extend([
        (
            "v3_dual_run_report.py",
            "--v2",
            "data/processed/activity_gold_v2_preview.json",
            "--v3",
            "data/processed/activity_gold_v3_preview.json",
            "--review-tasks",
            "data/processed/review_queue/vision_v3_review_queue.json",
        ),
        ("trust_report.py",),
    ])
    if not local_only:
        steps.append(("publish_gold_v3.py", "--require-clean-preview", "--json"))
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
