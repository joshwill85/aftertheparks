#!/usr/bin/env python3
"""Fix activity_schedules and activity_occurrence_rules times using meridiem-aware parsing."""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from db import SupabaseClient  # noqa: E402
from publish import require_legacy_temporal_publish_enabled  # noqa: E402
from time_utils import parse_time_24h  # noqa: E402

DAY_TO_INT = {
    "sunday": 0,
    "monday": 1,
    "tuesday": 2,
    "wednesday": 3,
    "thursday": 4,
    "friday": 5,
    "saturday": 6,
}


def schedule_has_pm(notes: str | None) -> bool:
    return bool(notes and re.search(r"\d{1,2}:\d{2}\s*p\.?m\.?", notes, re.I))


def needs_fix(start_time: str | None, notes: str | None) -> bool:
    if not start_time or not notes:
        return False
    if not schedule_has_pm(notes):
        return False
    hour = int(start_time.split(":")[0])
    return hour < 12


def main() -> None:
    require_legacy_temporal_publish_enabled("legacy_time_backfill_disabled")

    if not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        raise SystemExit("SUPABASE_SERVICE_ROLE_KEY required")

    db = SupabaseClient()
    schedules = db.select(
        "activity_schedules",
        columns="id,activity_catalog_id,edition_id,day_of_week,start_time,end_time,schedule_notes,is_daily",
        limit=2000,
    )

    schedule_updates = 0
    rule_updates = 0

    for row in schedules:
        notes = row.get("schedule_notes")
        if not needs_fix(row.get("start_time"), notes):
            end_notes = notes
            if needs_fix(row.get("end_time"), notes):
                end_notes = notes
            # still try end_time fix below
            if not needs_fix(row.get("start_time"), notes):
                if row.get("end_time") and notes:
                    new_end = parse_time_24h(notes.split("-")[-1] if "-" in notes else notes)
                    if new_end and new_end != row.get("end_time"):
                        db.update(
                            "activity_schedules",
                            {"id": f"eq.{row['id']}"},
                            {"end_time": new_end},
                        )
                continue

        new_start = parse_time_24h(notes, evening_default=True)
        new_end = None
        if notes and "-" in notes:
            end_part = notes.split("-", 1)[1]
            new_end = parse_time_24h(end_part, evening_default=True)

        patch: dict[str, str | None] = {}
        if new_start:
            patch["start_time"] = new_start
        if new_end:
            patch["end_time"] = new_end

        if not patch:
            continue

        db.update("activity_schedules", {"id": f"eq.{row['id']}"}, patch)
        schedule_updates += 1

        catalog_id = row.get("activity_catalog_id")
        edition_id = row.get("edition_id")
        if not catalog_id:
            continue

        filters: dict[str, str] = {
            "activity_catalog_id": f"eq.{catalog_id}",
        }
        if edition_id:
            filters["edition_id"] = f"eq.{edition_id}"

        if row.get("is_daily"):
            filters["is_daily"] = "eq.true"
        elif row.get("day_of_week"):
            dow = DAY_TO_INT.get(row["day_of_week"])
            if dow is not None:
                filters["day_of_week"] = f"eq.{dow}"

        rules = db.select(
            "activity_occurrence_rules",
            columns="id",
            filters=filters,
            limit=50,
        )
        for rule in rules:
            db.update(
                "activity_occurrence_rules",
                {"id": f"eq.{rule['id']}"},
                patch,
            )
            rule_updates += 1

    # Movie nights without meridiem in stored time
    movies = db.select(
        "movie_nights",
        columns="id,show_time",
        limit=500,
    )
    movie_updates = 0
    for mn in movies:
        st = mn.get("show_time") or ""
        if st and int(st.split(":")[0]) < 12:
            fixed = parse_time_24h(st, evening_default=True)
            if fixed:
                db.update(
                    "movie_nights",
                    {"id": f"eq.{mn['id']}"},
                    {"show_time": fixed},
                )
                movie_updates += 1

    print(
        f"Fixed {schedule_updates} schedules, {rule_updates} occurrence rules, "
        f"{movie_updates} movie nights."
    )

    # Pass 2: rules can stay stale when schedules were fixed in an earlier run.
    rules = db.select(
        "activity_occurrence_rules",
        columns="id,start_time,end_time,schedule_notes",
        limit=5000,
    )
    rule_only_updates = 0
    for rule in rules:
        notes = rule.get("schedule_notes")
        if not needs_fix(rule.get("start_time"), notes):
            if not needs_fix(rule.get("end_time"), notes):
                continue
            new_end = parse_time_24h(
                notes.split("-", 1)[1] if notes and "-" in notes else notes,
                evening_default=True,
            )
            if new_end and new_end != rule.get("end_time"):
                db.update(
                    "activity_occurrence_rules",
                    {"id": f"eq.{rule['id']}"},
                    {"end_time": new_end},
                )
                rule_only_updates += 1
            continue

        new_start = parse_time_24h(notes, evening_default=True)
        new_end = None
        if notes and "-" in notes:
            new_end = parse_time_24h(notes.split("-", 1)[1], evening_default=True)

        patch: dict[str, str | None] = {}
        if new_start:
            patch["start_time"] = new_start
        if new_end:
            patch["end_time"] = new_end
        if not patch:
            continue

        db.update("activity_occurrence_rules", {"id": f"eq.{rule['id']}"}, patch)
        rule_only_updates += 1

    if rule_only_updates:
        print(f"Additional occurrence rule fixes: {rule_only_updates}.")


if __name__ == "__main__":
    main()
