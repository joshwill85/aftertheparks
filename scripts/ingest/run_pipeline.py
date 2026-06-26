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
    ]


def publish_steps(*, local_only: bool, has_service_role: bool) -> list[tuple[str, ...]]:
    if local_only or not has_service_role:
        return []
    return [
        ("publish_gold_v2.py",),
        ("publish_official_offerings.py",),
        ("enrichment.py",),
    ]


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Run full activity ingest pipeline")
    parser.add_argument("--skip-discover", action="store_true")
    parser.add_argument("--local-only", action="store_true")
    parser.add_argument("--no-playwright", action="store_true")
    args = parser.parse_args()

    if not args.skip_discover:
        discover_args = ["--no-playwright"] if args.no_playwright else ["--compare-db"]
        if args.local_only:
            discover_args = ["--no-playwright"]
        run("discover.py", *discover_args)

    fetch_args = ["--local-only"] if args.local_only else []
    run("fetch.py", *fetch_args)

    extract_args = [] if args.local_only else ["--persist-db"]
    run("extract.py", *extract_args)
    for step in validation_gate_steps(local_only=args.local_only):
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
