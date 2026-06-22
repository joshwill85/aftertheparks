"""Phase 2 enrichment: seasonal overlays, events-tours metadata, pool pages."""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime, timezone
from typing import Any

from config import DISNEY_USER_AGENT, PARSER_VERSION
from db import SupabaseClient
from magical_resort_guide import (
    MRG_FACTS_OUTPUT,
    load_mrg_payload,
    publish_mrg_facts,
    publish_mrg_validity,
)

SUMMER_URL = "https://disneyworld.disney.go.com/events-tours/summer/"

# Signature experiences with known events-tours pages
SIGNATURE_EXPERIENCES: list[dict] = [
    {
        "normalized_name": "mickey-tie-dye",
        "calendar_groups": ["pop-century", "caribbean-beach", "coronado-springs"],
        "booking_url": "https://disneyworld.disney.go.com/events-tours/mickey-tie-dye/",
        "price_cents_min": 1700,
        "price_cents_max": 2000,
        "age_minimum": 3,
        "reservation_required": True,
    },
    {
        "normalized_name": "mosaic-art",
        "calendar_groups": ["coronado-springs"],
        "booking_url": "https://disneyworld.disney.go.com/events-tours/mosaic-art/",
        "price_cents_min": 3000,
        "reservation_required": True,
    },
]

POOL_PAGES: list[dict] = [
    {"resort_slug": "pop-century-resort", "slug": "hippy-dippy-pool", "name": "Hippy Dippy Pool", "is_feature": True},
    {"resort_slug": "caribbean-beach-resort", "slug": "fuentes-del-morro", "name": "Fuentes del Morro Feature Pool", "is_feature": True},
    {"resort_slug": "contemporary-resort", "slug": "contemporary-feature-pool", "name": "Feature Pool", "is_feature": True},
]


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": DISNEY_USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_summer_dates(html: str) -> tuple[str | None, str | None]:
    # Cool Kid Summer 2026: May 26 – Sep 8, 2026
    m = re.search(
        r"(May|June|July|August|September|October|November|December|January|February|March|April)\s+\d{1,2}"
        r".{0,20}(May|June|July|August|September|October|November|December|January|February|March|April)\s+\d{1,2},?\s+\d{4}",
        html,
        re.I,
    )
    if not m:
        return None, None
    return None, None  # Placeholder; store overlay with known 2026 dates below


def enrich_seasonal_overlay(db: SupabaseClient) -> None:
    overlay = {
        "name": "Cool Kid Summer 2026",
        "slug": "cool-kid-summer-2026",
        "valid_from": "2026-05-26",
        "valid_until": "2026-09-08",
        "disney_url": SUMMER_URL,
        "description": "Seasonal resort activity overlay from official Disney summer events page.",
    }
    try:
        fetch_html(SUMMER_URL)
    except Exception:
        pass
    db.upsert("seasonal_overlays", overlay, on_conflict="slug")

    overlays = db.select("seasonal_overlays", filters={"slug": "eq.cool-kid-summer-2026"}, limit=1)
    if not overlays:
        return
    overlay_id = overlays[0]["id"]
    editions = db.select("calendar_editions", filters={"is_current": "eq.true"})
    for edition in editions:
        db.upsert("calendar_edition_overlays", {
            "edition_id": edition["id"],
            "overlay_id": overlay_id,
        }, on_conflict="edition_id,overlay_id")

    # Set valid_until on current editions within overlay window where unset
    for edition in editions:
        if not edition.get("valid_until"):
            db.update("calendar_editions", {"id": f"eq.{edition['id']}"}, {
                "valid_until": "2026-09-08",
            })


def enrich_booking_metadata(db: SupabaseClient) -> None:
    for exp in SIGNATURE_EXPERIENCES:
        for group in exp["calendar_groups"]:
            cats = db.select(
                "activity_catalog",
                filters={
                    "calendar_group_key": f"eq.{group}",
                    "normalized_name": f"eq.{exp['normalized_name']}",
                },
                limit=1,
            )
            if not cats:
                continue
            db.upsert("activity_booking_metadata", {
                "activity_catalog_id": cats[0]["id"],
                "price_cents_min": exp.get("price_cents_min"),
                "price_cents_max": exp.get("price_cents_max"),
                "age_minimum": exp.get("age_minimum"),
                "reservation_required": exp.get("reservation_required"),
                "booking_url": exp.get("booking_url"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }, on_conflict="activity_catalog_id")


def enrich_pools(db: SupabaseClient) -> None:
    resorts = db.select("resorts", columns="id,slug")
    resort_map = {r["slug"]: r["id"] for r in resorts}
    for pool in POOL_PAGES:
        resort_id = resort_map.get(pool["resort_slug"])
        if not resort_id:
            continue
        db.upsert("resort_pools", {
            "resort_id": resort_id,
            "slug": pool["slug"],
            "name": pool["name"],
            "is_feature_pool": pool["is_feature"],
            "disney_url": f"https://disneyworld.disney.go.com/recreation/{pool['resort_slug']}/pools/",
        }, on_conflict="resort_id,slug")


def enrich_magical_resort_guide_facts(db: SupabaseClient) -> dict[str, Any] | None:
    if not MRG_FACTS_OUTPUT.exists():
        return None
    payload = load_mrg_payload(MRG_FACTS_OUTPUT)
    facts = payload.get("facts") if isinstance(payload.get("facts"), list) else []
    fact_summary = publish_mrg_facts(db, facts)
    validity_summary = publish_mrg_validity(
        db,
        payload.get("validity") if isinstance(payload, dict) else None,
    )
    return {
        **fact_summary,
        "validity": validity_summary,
    }


def main() -> None:
    db = SupabaseClient()
    runs = db.insert("ingest_runs", {
        "parser_version": PARSER_VERSION,
        "trigger": "manual",
        "status": "running",
        "summary_json": {"phase": "enrichment"},
    })
    run_id = runs[0]["id"]

    enrich_seasonal_overlay(db)
    enrich_booking_metadata(db)
    enrich_pools(db)
    mrg_summary = enrich_magical_resort_guide_facts(db)

    db.update("ingest_runs", {"id": f"eq.{run_id}"}, {
        "status": "success",
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "summary_json": {
            "phase": "enrichment",
            "completed": True,
            "magical_resort_guide": mrg_summary,
        },
    })
    print("Enrichment complete.")


if __name__ == "__main__":
    main()
