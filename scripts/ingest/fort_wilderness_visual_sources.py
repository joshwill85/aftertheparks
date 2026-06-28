"""Reviewed Fort Wilderness visual schedule sources."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import date
from pathlib import Path
from typing import Any


DEFAULT_MANIFEST = Path(
    "data/manual_sources/fort-wilderness/2026-05-26-to-2026-09-08/manifest.json"
)
DEFAULT_OUTPUT = Path("data/processed/fort_wilderness_visual_sources.json")
DEFAULT_CANONICAL_URL = "manual://fort-wilderness/2026-05-26-to-2026-09-08/recreation-activities"


def _slugify(value: str) -> str:
    import re

    return re.sub(r"[^a-z0-9]+", "-", value.lower().replace("'", "")).strip("-")


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _span(page: int, text: str, *, line_no: int | None = None) -> dict[str, Any]:
    return {
        "page": page,
        "line_no": line_no if line_no is not None else 1,
        "text": text,
        "source": "reviewed_visual_schedule_image",
    }


def _record(
    *,
    title: str,
    page: int,
    category: str,
    location: str | None,
    schedule_text: str | None,
    description: str | None,
    is_fee_based: bool | None = None,
    movie_nights: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    record = {
        "title": title,
        "slug": _slugify(title),
        "category": category,
        "location": location,
        "schedule_text": schedule_text,
        "description": description,
        "is_fee_based": is_fee_based,
        "profile_key": "reviewed_visual_schedule_image",
        "source_spans": {
            "title": [_span(page, title, line_no=1)],
        },
    }
    if location:
        record["source_spans"]["location"] = [_span(page, location, line_no=2)]
    if schedule_text:
        record["source_spans"]["schedule"] = [_span(page, schedule_text, line_no=3)]
    if description:
        record["source_spans"]["description"] = [_span(page, description, line_no=4)]
    if movie_nights:
        record["movie_nights"] = movie_nights
    return record


def reviewed_records() -> list[dict[str, Any]]:
    campfire_area = "Campfire Area Presented by OFF! Repellents"
    return [
        _record(
            title="Morning Crafts",
            page=1,
            category="arts_crafts",
            location="Bike Barn",
            schedule_text="Daily from 10:00 AM-11:00 AM",
            description=(
                "Sunday, Tuesday, Thursday: Build-A-Button; Monday, Saturday: "
                "Make Your Own Nature Jar; Wednesday, Friday: Color Your Own Pillowcase."
            ),
            is_fee_based=True,
        ),
        _record(
            title="Poolside Activities",
            page=1,
            category="poolside",
            location="Meadow Swimmin' Pool",
            schedule_text="Daily from 11:45 AM-1:15 PM and 3:00 PM-4:00 PM",
            description="Family-friendly poolside activities.",
            is_fee_based=False,
        ),
        _record(
            title="Afternoon Crafts",
            page=1,
            category="arts_crafts",
            location="Bike Barn",
            schedule_text="Daily from 4:00 PM-5:00 PM",
            description=(
                "Sunday, Wednesday, Friday: Mickey Tie-Dye; Monday: Color Your Own Plushie; "
                "Tuesday: Make Your Pixie Dust; Thursday: Make Your Own Camping Bag; "
                "Saturday: Make Your Own Slime. Please arrive 10 minutes before the end."
            ),
            is_fee_based=True,
        ),
        _record(
            title="Crockett's Craft Corner: Wine & Woodshop",
            page=1,
            category="arts_crafts",
            location="Pioneer Hall",
            schedule_text="Every Tuesday at 11:30 AM",
            description="To book a reservation, call 407-WDW-PLAY. For more information, visit the Bike Barn.",
            is_fee_based=True,
        ),
        _record(
            title="Campfire Games",
            page=1,
            category="campfire",
            location=campfire_area,
            schedule_text="Sunday, Monday, Wednesday, Thursday, Saturday at 7:00 PM",
            description="Participate in a fun activity prior to the campfire lighting.",
            is_fee_based=False,
        ),
        _record(
            title="Campfire Bingo",
            page=1,
            category="campfire",
            location=campfire_area,
            schedule_text="Tuesdays and Fridays at 7:00 PM",
            description="Bring the family together for a bingo night full of fun, joy, and prizes.",
            is_fee_based=False,
        ),
        _record(
            title="Country Campfire",
            page=1,
            category="campfire",
            location=campfire_area,
            schedule_text="Nightly from 7:30 PM-9:30 PM",
            description="Enjoy the warm glow of the campfire.",
            is_fee_based=False,
        ),
        _record(
            title="Chip 'n Dale's Campfire Sing-A-Long",
            page=1,
            category="campfire",
            location=campfire_area,
            schedule_text="Nightly at 8:00 PM",
            description=(
                "Croon along to old-time favorites led by a guitar-playing cowpoke, "
                "with a visit from Chip 'n Dale."
            ),
            is_fee_based=False,
        ),
        _record(
            title="Movie Under the Stars",
            page=1,
            category="movies_under_stars",
            location=campfire_area,
            schedule_text="Nightly at 8:40 PM",
            description="Cozy up for a classic Disney movie.",
            is_fee_based=False,
            movie_nights=[
                {"day": "Sunday", "odd_days": "Tangled", "even_days": "Teen Beach Movie"},
                {"day": "Monday", "odd_days": "Finding Nemo", "even_days": "Monsters, Inc."},
                {"day": "Tuesday", "odd_days": "Turning Red", "even_days": "Cinderella"},
                {"day": "Wednesday", "odd_days": "Cars 2", "even_days": "The Lion King"},
                {"day": "Thursday", "odd_days": "The Parent Trap", "even_days": "Heavyweights"},
                {"day": "Friday", "odd_days": "Toy Story 2", "even_days": "Mulan"},
                {"day": "Saturday", "odd_days": "High School Musical 2", "even_days": "Lilo & Stitch"},
            ],
        ),
        _record(
            title="Bike Barn",
            page=2,
            category="rental",
            location="Bike Barn",
            schedule_text="Sports equipment check-out from 9:00 AM-7:00 PM",
            description="Bike, canoe, kayak, gem mining, basketball, tennis, and shuffleboard rentals or equipment.",
            is_fee_based=True,
        ),
        _record(
            title="Wilderness Back Trail Adventure",
            page=2,
            category="resort_activity",
            location="Disney's Fort Wilderness Resort & Campground",
            schedule_text="Friday-Tuesday at 8:30 AM",
            description="Segway journey through the Florida landscape around Disney's Fort Wilderness Resort & Campground.",
            is_fee_based=True,
        ),
        _record(
            title="Storytime Yoga",
            page=2,
            category="fitness_wellness",
            location="Behind the Movie Screen",
            schedule_text="Each Friday morning at 10:30 AM; arrive by 10:15 AM",
            description="Complimentary beginner yoga class with an AdventHealth professional.",
            is_fee_based=False,
        ),
        _record(
            title="Guided Fishing Excursions",
            page=2,
            category="resort_activity",
            location="Fort Wilderness lake",
            schedule_text="Available at 7:00 AM, 10:00 AM, and 1:30 PM",
            description="Catch-and-release fishing excursion for largemouth bass with an expert guide.",
            is_fee_based=True,
        ),
        _record(
            title="Find-A-Friend Scavenger Hunt",
            page=2,
            category="scavenger_hunt",
            location="Meadow Recreation Area",
            schedule_text="Time not posted; confirm at the Bike Barn",
            description="Explore the Meadow Recreation Area, capture a photo with the chipmunk duo, then head to the Bike Barn.",
            is_fee_based=False,
        ),
        _record(
            title="Visit Chip and Dale",
            page=2,
            category="character",
            location="Campfire Theater and surrounding areas",
            schedule_text="5:00 PM-5:20 PM and 6:00 PM-6:20 PM, weather permitting",
            description="Visit Chip and Dale for smiles and fun.",
            is_fee_based=False,
        ),
        _record(
            title="Ready, Aim, Archery",
            page=2,
            category="sports_games",
            location="Behind the Bike Barn",
            schedule_text="Friday-Tuesday at 11:30 AM and 2:45 PM",
            description="Archery guides lead a short training session, then offer tips during range time.",
            is_fee_based=True,
        ),
        _record(
            title="Visit Tri-Circle-D Ranch",
            page=2,
            category="resort_activity",
            location="Tri-Circle-D Ranch",
            schedule_text="Explore the Ranch 10:00 AM-5:00 PM",
            description="See horses including Belgians, Clydesdales, Percherons, and Shetland ponies.",
            is_fee_based=False,
        ),
        _record(
            title="Carriage Rides",
            page=2,
            category="resort_activity",
            location="Across from Crockett's Tavern near Pioneer Hall",
            schedule_text="5:30 PM-9:30 PM",
            description="Relaxing carriage ride through Fort Wilderness landscapes.",
            is_fee_based=True,
        ),
    ]


def visual_source_is_current(payload: dict[str, Any], *, current_date: date | None = None) -> bool:
    current_date = current_date or date.today()
    valid_from = date.fromisoformat(str(payload["valid_from"]))
    valid_to = date.fromisoformat(str(payload["valid_to"]))
    return valid_from <= current_date <= valid_to


def visual_source_content_hash(payload: dict[str, Any]) -> str:
    source_payload = {
        "canonical_url": payload.get("canonical_url"),
        "valid_from": payload.get("valid_from"),
        "valid_to": payload.get("valid_to"),
        "image_hashes": [
            image.get("sha256")
            for image in payload.get("images", [])
            if isinstance(image, dict)
        ],
        "records": payload.get("records"),
    }
    return hashlib.sha256(
        json.dumps(source_payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def build_visual_source_payload(manifest_path: Path = DEFAULT_MANIFEST) -> dict[str, Any]:
    manifest = json.loads(manifest_path.read_text())
    images = manifest.get("images")
    if not isinstance(images, list):
        raise RuntimeError("visual_source_images_missing")
    for image in images:
        path = Path(image["path"])
        expected = image["sha256"]
        actual = _sha256(path)
        if actual != expected:
            raise RuntimeError(f"source_hash_mismatch:{path}:{actual}")
    payload = {
        "source_kind": "reviewed_visual_schedule_image",
        "calendar_group_key": manifest["calendar_group_key"],
        "canonical_url": manifest.get("canonical_url") or DEFAULT_CANONICAL_URL,
        "resort_slugs": manifest.get("resort_slugs", []),
        "valid_from": manifest["valid_from"],
        "valid_to": manifest["valid_to"],
        "images": images,
        "manifest": manifest,
        "records": reviewed_records(),
    }
    payload["content_sha256"] = visual_source_content_hash(payload)
    payload["currentness"] = "current" if visual_source_is_current(payload) else "expired"
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Build reviewed Fort Wilderness visual source records")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    payload = build_visual_source_payload(args.manifest)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"output": str(args.out), "records": len(payload["records"])}, indent=2))


if __name__ == "__main__":
    main()
