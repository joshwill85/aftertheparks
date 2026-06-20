"""Bootstrap backfill: fetch, extract, validate, and publish existing ingest into temporal model."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent


def run_step(script: str, *args: str, env: dict | None = None) -> None:
    cmd = [sys.executable, str(SCRIPTS / script), *args]
    print(f"\n>>> {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=SCRIPTS, env=env)
    if result.returncode != 0:
        raise SystemExit(f"Step failed: {script} (exit {result.returncode})")


def main() -> None:
    import argparse
    import os

    parser = argparse.ArgumentParser(description="Full bootstrap backfill pipeline")
    parser.add_argument("--local-only", action="store_true", help="Fetch without Supabase")
    parser.add_argument("--skip-fetch", action="store_true")
    parser.add_argument("--skip-publish", action="store_true")
    args = parser.parse_args()

    env = os.environ.copy()

    if not args.skip_fetch:
        fetch_args = ["--local-only"] if args.local_only else []
        run_step("fetch.py", *fetch_args)

    run_step("extract.py", *(["--persist-db"] if not args.local_only else []))
    run_step("validate.py")

    if not args.skip_publish and not args.local_only:
        if not env.get("SUPABASE_URL") and not env.get("NEXT_PUBLIC_SUPABASE_URL"):
            print("Skipping publish: SUPABASE_URL not set")
        elif not env.get("SUPABASE_SERVICE_ROLE_KEY"):
            print("Skipping publish: SUPABASE_SERVICE_ROLE_KEY not set")
        else:
            run_step("publish.py")

    print("\nBackfill complete.")


if __name__ == "__main__":
    main()
