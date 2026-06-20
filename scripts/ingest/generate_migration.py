"""Generate SQL migration from processed activity ingest JSON."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INGEST = ROOT / "data" / "processed" / "activities_ingest.json"
MIGRATION = ROOT / "supabase" / "migrations" / "20260620210000_create_resort_activities.sql"


def sql_str(value: str | None) -> str:
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


def parse_time(value: str | None) -> str:
    if not value:
        return "null"
    match = re.search(r"(\d{1,2}:\d{2})", value)
    if not match:
        return "null"
    return f"{sql_str(match.group(1))}::time"


def main() -> None:
    data = json.loads(INGEST.read_text())
    ingested_at = data["ingested_at"]
    lines: list[str] = [
        "-- Resort recreation activity schema and one-time ingest",
        "-- Sources: official Disney recreation pages + parksmedia A-frame PDF calendars",
        "",
        "create type public.activity_category as enum (",
        "  'poolside', 'campfire', 'movies_under_stars', 'fitness_wellness',",
        "  'arts_crafts', 'signature', 'resort_activity', 'arcade',",
        "  'character_experience', 'nighttime_entertainment', 'rental', 'other'",
        ");",
        "",
        "create type public.day_of_week as enum (",
        "  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'",
        ");",
        "",
        "create table public.activity_calendar_groups (",
        "  calendar_group_key text primary key,",
        "  recreation_page_url text not null,",
        "  pdf_url text,",
        "  pdf_edition text,",
        "  notes text,",
        "  ingested_at timestamptz not null,",
        "  created_at timestamptz not null default now()",
        ");",
        "",
        "create table public.resort_activity_sources (",
        "  id uuid primary key default gen_random_uuid(),",
        "  resort_id uuid not null references public.resorts(id) on delete cascade,",
        "  calendar_group_key text not null references public.activity_calendar_groups(calendar_group_key) on delete cascade,",
        "  recreation_page_url text not null,",
        "  is_primary_source boolean not null default true,",
        "  unique (resort_id)",
        ");",
        "",
        "create table public.resort_activities (",
        "  id uuid primary key,",
        "  calendar_group_key text not null references public.activity_calendar_groups(calendar_group_key) on delete cascade,",
        "  name text not null,",
        "  normalized_name text not null,",
        "  category public.activity_category not null,",
        "  section text not null,",
        "  location text,",
        "  schedule_text text,",
        "  description text,",
        "  is_fee_based boolean not null default false,",
        "  is_daily boolean not null default false,",
        "  source_pdf_url text,",
        "  unique (calendar_group_key, normalized_name)",
        ");",
        "",
        "create table public.activity_schedules (",
        "  id uuid primary key,",
        "  activity_id uuid not null references public.resort_activities(id) on delete cascade,",
        "  day_of_week public.day_of_week,",
        "  start_time time,",
        "  end_time time,",
        "  schedule_notes text,",
        "  is_daily boolean not null default false",
        ");",
        "",
        "create table public.movie_nights (",
        "  id uuid primary key,",
        "  activity_id uuid not null references public.resort_activities(id) on delete cascade,",
        "  day_of_week public.day_of_week not null,",
        "  movie_title text not null,",
        "  show_time time,",
        "  location text,",
        "  unique (activity_id, day_of_week)",
        ");",
        "",
        "create index resort_activities_category_idx on public.resort_activities (category);",
        "create index resort_activity_sources_group_idx on public.resort_activity_sources (calendar_group_key);",
        "",
        "alter table public.activity_calendar_groups enable row level security;",
        "alter table public.resort_activity_sources enable row level security;",
        "alter table public.resort_activities enable row level security;",
        "alter table public.activity_schedules enable row level security;",
        "alter table public.movie_nights enable row level security;",
        "",
        "create policy \"Activity calendar groups are publicly readable\"",
        "  on public.activity_calendar_groups for select to anon, authenticated using (true);",
        "create policy \"Resort activity sources are publicly readable\"",
        "  on public.resort_activity_sources for select to anon, authenticated using (true);",
        "create policy \"Resort activities are publicly readable\"",
        "  on public.resort_activities for select to anon, authenticated using (true);",
        "create policy \"Activity schedules are publicly readable\"",
        "  on public.activity_schedules for select to anon, authenticated using (true);",
        "create policy \"Movie nights are publicly readable\"",
        "  on public.movie_nights for select to anon, authenticated using (true);",
        "",
    ]

    for src in data["sources"]:
        lines.append(
            "insert into public.activity_calendar_groups "
            "(calendar_group_key, recreation_page_url, pdf_url, pdf_edition, notes, ingested_at) values ("
            f"{sql_str(src['calendar_group_key'])}, {sql_str(src['recreation_page_url'])}, "
            f"{sql_str(src.get('pdf_url'))}, {sql_str(src.get('pdf_edition'))}, "
            f"{sql_str(src.get('notes'))}, {sql_str(ingested_at)}::timestamptz);"
        )

    lines.append("")
    lines.append("-- Link all 31 resorts to their official activity source")
    src_by_group = {s["calendar_group_key"]: s for s in data["sources"]}
    slug_to_group: dict[str, str] = {}
    for src in data["sources"]:
        for slug in src["resort_slugs"]:
            slug_to_group[slug] = src["calendar_group_key"]

    for slug in sorted(slug_to_group):
        group = slug_to_group[slug]
        rec = src_by_group[group]["recreation_page_url"]
        lines.append(
            "insert into public.resort_activity_sources (resort_id, calendar_group_key, recreation_page_url) "
            f"select id, {sql_str(group)}, {sql_str(rec)} from public.resorts where slug = {sql_str(slug)};"
        )

    lines.append("")
    lines.append("-- Activities")
    for act in data["activities"]:
        uid = f"act:{act['calendar_group_key']}:{act['normalized_name']}"
        lines.append(
            "insert into public.resort_activities "
            "(id, calendar_group_key, name, normalized_name, category, section, location, schedule_text, "
            "description, is_fee_based, is_daily, source_pdf_url) values ("
            f"md5({sql_str(uid)})::uuid, {sql_str(act['calendar_group_key'])}, {sql_str(act['name'])}, "
            f"{sql_str(act['normalized_name'])}, {sql_str(act['category'])}::public.activity_category, "
            f"{sql_str(act['section'])}, {sql_str(act.get('location'))}, {sql_str(act.get('schedule_text'))}, "
            f"{sql_str(act.get('description'))}, {'true' if act['is_fee_based'] else 'false'}, "
            f"{'true' if act['is_daily'] else 'false'}, {sql_str(act.get('pdf_url'))}"
            ");"
        )

        if act.get("is_daily") or act.get("days_of_week") or act.get("start_time"):
            sched_uid = f"sched:{uid}"
            if act.get("is_daily"):
                lines.append(
                    "insert into public.activity_schedules "
                    "(id, activity_id, is_daily, start_time, end_time, schedule_notes) values ("
                    f"md5({sql_str(sched_uid)})::uuid, md5({sql_str(uid)})::uuid, true, "
                    f"{parse_time(act.get('start_time') or act.get('schedule_text'))}, "
                    f"{parse_time(act.get('end_time'))}, {sql_str(act.get('schedule_text'))}"
                    ");"
                )
            for day in act.get("days_of_week") or []:
                day_uid = f"sched:{uid}:{day}"
                lines.append(
                    "insert into public.activity_schedules "
                    "(id, activity_id, day_of_week, start_time, end_time, schedule_notes) values ("
                    f"md5({sql_str(day_uid)})::uuid, md5({sql_str(uid)})::uuid, {sql_str(day)}::public.day_of_week, "
                    f"{parse_time(act.get('start_time') or act.get('schedule_text'))}, "
                    f"{parse_time(act.get('end_time'))}, {sql_str(act.get('schedule_text'))}"
                    ");"
                )

        for movie in act.get("movie_nights") or []:
            movie_uid = f"movie:{uid}:{movie['day_of_week']}"
            lines.append(
                "insert into public.movie_nights "
                "(id, activity_id, day_of_week, movie_title, show_time, location) values ("
                f"md5({sql_str(movie_uid)})::uuid, md5({sql_str(uid)})::uuid, "
                f"{sql_str(movie['day_of_week'])}::public.day_of_week, {sql_str(movie['movie_title'])}, "
                f"{parse_time(movie.get('show_time') or act.get('schedule_text'))}, {sql_str(act.get('location'))}"
                ");"
            )

    MIGRATION.write_text("\n".join(lines) + "\n")
    print(f"Wrote {MIGRATION} ({len(data['activities'])} activities)")


if __name__ == "__main__":
    main()
