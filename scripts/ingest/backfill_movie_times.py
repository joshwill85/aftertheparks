#!/usr/bin/env python3
"""Backfill movie_nights.show_time with correct 24-hour values (PM-aware)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from config import PROCESSED_DIR  # noqa: E402
from db import SupabaseClient  # noqa: E402
from publish import movie_id, parse_time  # noqa: E402

INGEST_PATH = PROCESSED_DIR / "activities_ingest.json"


def main() -> None:
    if not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        raise SystemExit("SUPABASE_SERVICE_ROLE_KEY required")

    data = json.loads(INGEST_PATH.read_text())
    db = SupabaseClient()
    updated = 0

    for act in data.get("activities", []):
        group = act["calendar_group_key"]
        norm = act["normalized_name"]
        if not act.get("movie_nights"):
            continue

        for movie in act["movie_nights"]:
            raw = movie.get("show_time") or act.get("schedule_text")
            show_time = parse_time(raw, evening_default=True)
            if not show_time:
                continue

            row_id = movie_id(group, norm, movie["day_of_week"])
            db.update(
                "movie_nights",
                {"id": f"eq.{row_id}"},
                {"show_time": show_time},
            )
            updated += 1
            print(f"  {group} {movie['day_of_week']}: {raw!r} -> {show_time}")

    print(f"Updated {updated} movie_nights rows.")


if __name__ == "__main__":
    main()
