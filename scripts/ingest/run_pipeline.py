#!/usr/bin/env python3
"""End-to-end activity ingest pipeline: discover → fetch → extract → validate → publish."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent


def run(script: str, *args: str) -> None:
    cmd = [sys.executable, str(SCRIPTS / script), *args]
    print(f"\n>>> {' '.join(cmd)}")
    if subprocess.run(cmd, cwd=SCRIPTS, env=os.environ.copy()).returncode != 0:
        raise SystemExit(1)


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
    run("validate.py")

    if not args.local_only and os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        run("publish.py")
        run("enrichment.py")
    else:
        print("Skipping publish/enrichment (no service role key or local-only mode)")


if __name__ == "__main__":
    main()
