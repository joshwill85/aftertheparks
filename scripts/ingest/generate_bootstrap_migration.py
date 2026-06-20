"""Generate SQL bootstrap migration for temporal activity editions from ingest JSON."""

from __future__ import annotations

import json
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INGEST = ROOT / "data" / "processed" / "activities_ingest.json"
OUT = ROOT / "supabase" / "migrations" / "20260620220100_bootstrap_activity_editions.sql"


def sql_str(value: str | None) -> str:
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


def md5_uuid(key: str) -> str:
    import hashlib
    return str(uuid.UUID(bytes=bytes.fromhex(hashlib.md5(key.encode()).hexdigest())))


def main() -> None:
    data = json.loads(INGEST.read_text())
    today = date.today().isoformat()
    lines = [
        "-- Bootstrap temporal editions from initial ingest",
        "",
    ]

    source_by_group = {s["calendar_group_key"]: s for s in data["sources"]}
    by_group: dict[str, list[dict]] = {}
    for act in data["activities"]:
        by_group.setdefault(act["calendar_group_key"], []).append(act)

    for group_key, source in source_by_group.items():
        edition_code = source.get("pdf_edition") or f"bootstrap-{today}"
        edition_id = md5_uuid(f"edition:{group_key}:{edition_code}")
        lines.append(f"-- {group_key}")
        lines.append(
            f"insert into public.calendar_editions "
            f"(id, calendar_group_key, edition_code, valid_from, is_current) values ("
            f"{sql_str(edition_id)}::uuid, {sql_str(group_key)}, {sql_str(edition_code)}, "
            f"{sql_str(today)}::date, true) on conflict (calendar_group_key, edition_code) do update "
            f"set is_current = true;"
        )
        lines.append(
            f"update public.activity_calendar_groups set current_edition_id = {sql_str(edition_id)}::uuid "
            f"where calendar_group_key = {sql_str(group_key)};"
        )

        for act in by_group.get(group_key, []):
            cat_id = md5_uuid(f"act:{group_key}:{act['normalized_name']}")
            conf = act.get("confidence", 1.0)
            needs_review = "true" if conf < 0.5 or act.get("warnings") else "false"
            lines.append(
                f"insert into public.activity_catalog "
                f"(id, calendar_group_key, canonical_name, normalized_name, default_category) values ("
                f"{sql_str(cat_id)}::uuid, {sql_str(group_key)}, {sql_str(act['name'])}, "
                f"{sql_str(act['normalized_name'])}, {sql_str(act['category'])}::public.activity_category) "
                f"on conflict (calendar_group_key, normalized_name) do nothing;"
            )
            lines.append(
                f"insert into public.resort_activity_editions "
                f"(activity_catalog_id, edition_id, name, category, section, location, schedule_text, "
                f"description, is_fee_based, is_daily, parse_confidence, needs_review, valid_from, is_active) "
                f"select {sql_str(cat_id)}::uuid, {sql_str(edition_id)}::uuid, {sql_str(act['name'])}, "
                f"{sql_str(act['category'])}::public.activity_category, {sql_str(act['section'])}, "
                f"{sql_str(act.get('location'))}, {sql_str(act.get('schedule_text'))}, "
                f"{sql_str(act.get('description'))}, {'true' if act.get('is_fee_based') else 'false'}, "
                f"{'true' if act.get('is_daily') else 'false'}, {conf}, {needs_review}, "
                f"{sql_str(today)}::date, {'false' if needs_review == 'true' else 'true'} "
                f"on conflict (activity_catalog_id, edition_id) do update set "
                f"name = excluded.name, parse_confidence = excluded.parse_confidence;"
            )
            # Link schedules
            legacy_id = cat_id
            lines.append(
                f"update public.activity_schedules set edition_id = {sql_str(edition_id)}::uuid, "
                f"activity_catalog_id = {sql_str(cat_id)}::uuid "
                f"where activity_id = {sql_str(legacy_id)}::uuid;"
            )
            lines.append(
                f"update public.movie_nights set edition_id = {sql_str(edition_id)}::uuid, "
                f"activity_catalog_id = {sql_str(cat_id)}::uuid "
                f"where activity_id = {sql_str(legacy_id)}::uuid;"
            )

    # Cross-resort access
    lines.extend([
        "",
        "-- Cross-resort participation",
        "insert into public.activity_cross_resort_access (edition_id, host_calendar_group_key, guest_resort_id, rule_type, notes)",
        "select ce.id, 'port-orleans-french-quarter', r.id, 'full_access', 'Guests may participate in activities at Riverside and French Quarter.'",
        "from public.calendar_editions ce",
        "join public.resorts r on r.slug = 'port-orleans-resort-riverside'",
        "where ce.calendar_group_key = 'port-orleans-french-quarter' and ce.is_current = true",
        "on conflict do nothing;",
        "",
        "insert into public.activity_cross_resort_access (edition_id, host_calendar_group_key, guest_resort_id, rule_type, notes)",
        "select ce.id, 'port-orleans-riverside', r.id, 'full_access', 'Guests may participate in activities at Riverside and French Quarter.'",
        "from public.calendar_editions ce",
        "join public.resorts r on r.slug = 'port-orleans-resort-french-quarter'",
        "where ce.calendar_group_key = 'port-orleans-riverside' and ce.is_current = true",
        "on conflict do nothing;",
        "",
        "-- Seasonal overlay",
        "insert into public.seasonal_overlays (name, slug, valid_from, valid_until, disney_url, description) values",
        "('Cool Kid Summer 2026', 'cool-kid-summer-2026', '2026-05-26', '2026-09-08',",
        "'https://disneyworld.disney.go.com/events-tours/summer/',",
        "'Seasonal resort activity overlay from official Disney summer events page.')",
        "on conflict (slug) do nothing;",
        "",
        "insert into public.calendar_edition_overlays (edition_id, overlay_id)",
        "select ce.id, so.id from public.calendar_editions ce",
        "cross join public.seasonal_overlays so where so.slug = 'cool-kid-summer-2026' and ce.is_current = true",
        "on conflict do nothing;",
        "",
        "update public.calendar_editions ce set valid_until = '2026-09-08'",
        "from public.calendar_edition_overlays ceo",
        "join public.seasonal_overlays so on so.id = ceo.overlay_id",
        "where ceo.edition_id = ce.id and so.slug = 'cool-kid-summer-2026' and ce.valid_until is null;",
    ])

    OUT.write_text("\n".join(lines) + "\n")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
