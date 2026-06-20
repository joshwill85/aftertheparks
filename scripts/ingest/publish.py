"""Publish validated activity data to Supabase temporal model."""

from __future__ import annotations

import hashlib
import json
import re
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from config import CONFIDENCE_PUBLISH_THRESHOLD, PROCESSED_DIR
from db import SupabaseClient
from source_manifest import ACTIVITY_SOURCES

INGEST_PATH = PROCESSED_DIR / "activities_ingest.json"

CROSS_RESORT_RULES: list[dict[str, Any]] = [
    {
        "host_calendar_group_key": "port-orleans-french-quarter",
        "guest_slugs": ["port-orleans-resort-riverside"],
        "rule_type": "full_access",
        "notes": "Guests may participate in activities at Riverside and French Quarter.",
    },
    {
        "host_calendar_group_key": "port-orleans-riverside",
        "guest_slugs": ["port-orleans-resort-french-quarter"],
        "rule_type": "full_access",
        "notes": "Guests may participate in activities at Riverside and French Quarter.",
    },
]


def _md5_uuid(key: str) -> str:
    return str(uuid.UUID(bytes=bytes.fromhex(hashlib.md5(key.encode()).hexdigest())))


def catalog_id(group: str, normalized_name: str) -> str:
    return _md5_uuid(f"act:{group}:{normalized_name}")


def schedule_id(group: str, normalized_name: str, suffix: str = "") -> str:
    return _md5_uuid(f"sched:act:{group}:{normalized_name}{suffix}")


def movie_id(group: str, normalized_name: str, day: str) -> str:
    return _md5_uuid(f"movie:act:{group}:{normalized_name}:{day}")


def parse_time(value: str | None) -> str | None:
    if not value:
        return None
    match = re.search(r"(\d{1,2}:\d{2})", value)
    return match.group(1) if match else None


def get_resort_id_map(db: SupabaseClient) -> dict[str, str]:
    rows = db.select("resorts", columns="id,slug")
    return {r["slug"]: r["id"] for r in rows}


def close_current_edition(db: SupabaseClient, group_key: str) -> str | None:
    rows = db.select(
        "calendar_editions",
        columns="id",
        filters={"calendar_group_key": f"eq.{group_key}", "is_current": "eq.true"},
        limit=1,
    )
    if not rows:
        return None
    edition_id = rows[0]["id"]
    db.update("calendar_editions", {"id": f"eq.{edition_id}"}, {
        "is_current": False,
        "valid_until": date.today().isoformat(),
    })
    db.update("resort_activity_editions", {"edition_id": f"eq.{edition_id}"}, {
        "is_active": False,
        "valid_until": date.today().isoformat(),
    })
    return edition_id


def publish_group(
    db: SupabaseClient,
    group_key: str,
    source_meta: dict,
    activities: list[dict],
    *,
    source_document_id: str | None = None,
) -> dict[str, Any]:
    edition_code = source_meta.get("pdf_edition") or f"manual-{date.today().strftime('%Y%m%d')}"
    existing = db.select(
        "calendar_editions",
        filters={
            "calendar_group_key": f"eq.{group_key}",
            "edition_code": f"eq.{edition_code}",
        },
        limit=1,
    )
    if existing:
        edition_id = existing[0]["id"]
        db.update("calendar_editions", {"id": f"eq.{edition_id}"}, {
            "is_current": True,
            "source_document_id": source_document_id,
        })
        prior_id = None
    else:
        prior_id = close_current_edition(db, group_key)
        edition_row = {
            "calendar_group_key": group_key,
            "edition_code": edition_code,
            "valid_from": date.today().isoformat(),
            "valid_until": None,
            "source_document_id": source_document_id,
            "is_current": True,
            "supersedes_edition_id": prior_id,
        }
        editions = db.insert("calendar_editions", edition_row)
        edition_id = editions[0]["id"]

    db.update("activity_calendar_groups", {"calendar_group_key": f"eq.{group_key}"}, {
        "current_edition_id": edition_id,
        "pdf_url": source_meta.get("pdf_url"),
        "pdf_edition": edition_code,
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    })

    published = 0
    for act in activities:
        conf = act.get("confidence", 1.0)
        needs_review = conf < CONFIDENCE_PUBLISH_THRESHOLD or bool(act.get("warnings"))

        cat_id = catalog_id(group_key, act["normalized_name"])
        db.upsert("activity_catalog", {
            "id": cat_id,
            "calendar_group_key": group_key,
            "canonical_name": act["name"],
            "normalized_name": act["normalized_name"],
            "default_category": act["category"],
        }, on_conflict="calendar_group_key,normalized_name")

        db.upsert("resort_activity_editions", {
            "activity_catalog_id": cat_id,
            "edition_id": edition_id,
            "name": act["name"],
            "category": act["category"],
            "section": act["section"],
            "location": act.get("location"),
            "schedule_text": act.get("schedule_text"),
            "description": act.get("description"),
            "is_fee_based": act.get("is_fee_based", False),
            "is_daily": act.get("is_daily", False),
            "parse_confidence": conf,
            "needs_review": needs_review,
            "valid_from": date.today().isoformat(),
            "is_active": not needs_review,
        }, on_conflict="activity_catalog_id,edition_id")

        # Legacy projection: resort_activities
        legacy_id = cat_id
        db.upsert("resort_activities", {
            "id": legacy_id,
            "calendar_group_key": group_key,
            "name": act["name"],
            "normalized_name": act["normalized_name"],
            "category": act["category"],
            "section": act["section"],
            "location": act.get("location"),
            "schedule_text": act.get("schedule_text"),
            "description": act.get("description"),
            "is_fee_based": act.get("is_fee_based", False),
            "is_daily": act.get("is_daily", False),
            "source_pdf_url": source_meta.get("pdf_url"),
        }, on_conflict="calendar_group_key,normalized_name")

        # Schedules
        if act.get("is_daily"):
            db.upsert("activity_schedules", {
                "id": schedule_id(group_key, act["normalized_name"]),
                "activity_id": legacy_id,
                "edition_id": edition_id,
                "activity_catalog_id": cat_id,
                "is_daily": True,
                "start_time": parse_time(act.get("start_time") or act.get("schedule_text")),
                "end_time": parse_time(act.get("end_time")),
                "schedule_notes": act.get("schedule_text"),
            }, on_conflict="id")
        for day in act.get("days_of_week") or []:
            db.upsert("activity_schedules", {
                "id": schedule_id(group_key, act["normalized_name"], f":{day}"),
                "activity_id": legacy_id,
                "edition_id": edition_id,
                "activity_catalog_id": cat_id,
                "day_of_week": day,
                "start_time": parse_time(act.get("start_time") or act.get("schedule_text")),
                "end_time": parse_time(act.get("end_time")),
                "schedule_notes": act.get("schedule_text"),
            }, on_conflict="id")

        for movie in act.get("movie_nights") or []:
            title = movie.get("movie_title", "")
            garbage = sum(not c.isalpha() for c in title) / max(len(title), 1)
            movie_needs_review = garbage > 0.2
            db.upsert("movie_nights", {
                "id": movie_id(group_key, act["normalized_name"], movie["day_of_week"]),
                "activity_id": legacy_id,
                "edition_id": edition_id,
                "activity_catalog_id": cat_id,
                "day_of_week": movie["day_of_week"],
                "movie_title": title,
                "show_time": parse_time(movie.get("show_time") or act.get("schedule_text")),
                "location": act.get("location"),
                "rain_backup_location": movie.get("rain_backup_location"),
                "parse_confidence": 0.3 if movie_needs_review else 0.9,
            }, on_conflict="activity_id,day_of_week")

        published += 1

    return {"edition_id": edition_id, "activities_published": published}


def publish_cross_resort_rules(db: SupabaseClient, resort_map: dict[str, str]) -> None:
    for rule in CROSS_RESORT_RULES:
        host = rule["host_calendar_group_key"]
        editions = db.select(
            "calendar_editions",
            filters={"calendar_group_key": f"eq.{host}", "is_current": "eq.true"},
            limit=1,
        )
        if not editions:
            continue
        edition_id = editions[0]["id"]
        for slug in rule["guest_slugs"]:
            resort_id = resort_map.get(slug)
            if not resort_id:
                continue
            db.upsert("activity_cross_resort_access", {
                "edition_id": edition_id,
                "host_calendar_group_key": host,
                "guest_resort_id": resort_id,
                "rule_type": rule["rule_type"],
                "notes": rule.get("notes"),
            }, on_conflict="edition_id,host_calendar_group_key,guest_resort_id")


def publish_all(input_path: Path = INGEST_PATH) -> dict[str, Any]:
    data = json.loads(input_path.read_text())
    db = SupabaseClient()

    runs = db.insert("ingest_runs", {
        "parser_version": data.get("parser_version", "2.0.0"),
        "trigger": "manual",
        "status": "running",
    })
    run_id = runs[0]["id"]

    resort_map = get_resort_id_map(db)
    by_group: dict[str, list[dict]] = {}
    source_by_group = {s["calendar_group_key"]: s for s in data.get("sources", [])}

    for act in data.get("activities", []):
        by_group.setdefault(act["calendar_group_key"], []).append(act)

    results: list[dict] = []
    for source in ACTIVITY_SOURCES:
        group = source.calendar_group_key
        acts = by_group.get(group, [])
        source_meta = source_by_group.get(group, {
            "calendar_group_key": group,
            "pdf_url": source.pdf_url,
            "pdf_edition": source.pdf_edition,
        })

        doc_id = None
        if source.pdf_url:
            docs = db.select("source_documents", filters={"canonical_url": f"eq.{source.pdf_url}"}, limit=1)
            if docs:
                doc_id = docs[0]["id"]

        print(f"Publishing {group} ({len(acts)} activities)...")
        result = publish_group(db, group, source_meta, acts, source_document_id=doc_id)
        results.append({"calendar_group_key": group, **result})

    publish_cross_resort_rules(db, resort_map)

    summary = {"groups": results, "total_activities": sum(r["activities_published"] for r in results)}
    db.update("ingest_runs", {"id": f"eq.{run_id}"}, {
        "status": "success",
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "summary_json": summary,
    })

    health = db.rpc("check_activity_data_health")
    if health:
        print(f"Health check warnings: {len(health)} issues")
        for row in health:
            print(f"  {row.get('check_name')}: {row.get('detail')}")

    return summary


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Publish activities to Supabase")
    parser.add_argument("--input", type=Path, default=INGEST_PATH)
    args = parser.parse_args()
    summary = publish_all(args.input)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
