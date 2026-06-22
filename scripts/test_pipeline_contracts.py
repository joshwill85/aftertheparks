import unittest
from pathlib import Path
import sys
import json
import tempfile
import os

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.ingest.contracts import (
    validate_claims,
    validate_golden_fixture,
    validate_public_record,
)
from scripts.ingest.web_snapshot import web_snapshot_content_hash
from scripts.ingest.audit_coverage import build_coverage_audit
from scripts.ingest.extract_v2 import (
    compare_candidates_to_fixture,
    extract_candidates_for_fixture,
    extract_publishable_candidates_for_fixture,
    extract_candidates_for_pdf,
)
from scripts.ingest.promote_gold import promote_candidates, promote_fixtures
from scripts.ingest.publish_gold_v2 import publish_gold_rows, _stable_uuid
from scripts.ingest.disney_recreation_offerings import (
    extract_official_recreation_offerings,
    resolve_official_resort_slugs,
)
from scripts.ingest.publish_official_offerings import publish_official_offering_rows
from scripts.ingest.review_queue import (
    list_pending_reviews,
    load_review_decisions,
    record_review_decision,
)
from scripts.ingest.run_pipeline import validation_gate_steps
from scripts.ingest.validate_v2 import validate_fixture_extractions, validate_fixture_paths


WELLNESS_FIXTURES = [
    Path("data/golden/activities/all-star-movies-wellness-scavenger-hunt.json"),
    Path("data/golden/activities/all-star-music-wellness-scavenger-hunt.json"),
    Path("data/golden/activities/all-star-sports-wellness-scavenger-hunt.json"),
]
ALL_STAR_MOVIES_FULL_FIXTURE = Path("data/golden/activities/all-star-movies-full-calendar.json")
ART_OF_ANIMATION_FULL_FIXTURE = Path("data/golden/activities/art-of-animation-full-calendar.json")
BOARDWALK_FULL_FIXTURE = Path("data/golden/activities/boardwalk-full-calendar.json")
OLD_KEY_WEST_FULL_FIXTURE = Path("data/golden/activities/old-key-west-full-calendar.json")
RIVIERA_FULL_FIXTURE = Path("data/golden/activities/riviera-full-calendar.json")
POP_CENTURY_FULL_FIXTURE = Path("data/golden/activities/pop-century-full-calendar.json")
POLYNESIAN_FULL_FIXTURE = Path("data/golden/activities/polynesian-full-calendar.json")
PORT_ORLEANS_RIVERSIDE_FULL_FIXTURE = Path("data/golden/activities/port-orleans-riverside-full-calendar.json")
PORT_ORLEANS_FRENCH_QUARTER_FULL_FIXTURE = Path("data/golden/activities/port-orleans-french-quarter-full-calendar.json")
CARIBBEAN_BEACH_FULL_FIXTURE = Path("data/golden/activities/caribbean-beach-full-calendar.json")
CORONADO_SPRINGS_FULL_FIXTURE = Path("data/golden/activities/coronado-springs-full-calendar.json")
SARATOGA_SPRINGS_FULL_FIXTURE = Path("data/golden/activities/saratoga-springs-full-calendar.json")
CONTEMPORARY_FULL_FIXTURE = Path("data/golden/activities/contemporary-full-calendar.json")
WILDERNESS_LODGE_FULL_FIXTURE = Path("data/golden/activities/wilderness-lodge-full-calendar.json")
FORT_WILDERNESS_WEB_FIXTURE = Path("data/golden/activities/fort-wilderness-official-recreation-page.json")
GOLD_PREVIEW_PATH = Path("data/processed/activity_gold_v2_preview.json")
ACTIVITY_PIPELINE_V2_MIGRATION = Path("supabase/migrations/20260621125139_activity_pipeline_v2.sql")
MRG_FACTS_MIGRATION = Path("supabase/migrations/20260622003816_magical_resort_guide_facts.sql")
OFFICIAL_OFFERINGS_MIGRATION_GLOB = "supabase/migrations/*official_recreation_offerings*.sql"

ALL_STAR_MOVIES_PDF = Path("data/raw/pdfs/All-Star-Movies_Aframe_Recreation_1125.pdf")
ALL_STAR_MUSIC_PDF = Path("data/raw/pdfs/All-Star-Music_Aframe_Recreation_0126-V3_DRAFT.pdf")
ALL_STAR_SPORTS_PDF = Path("data/raw/pdfs/All-Star-Sports_Aframe_Recreation_0126_V3_DRAFT.pdf")
BEACH_YACHT_PDF = Path("data/raw/pdfs/YB_Aframe_Recreation-1125.pdf")
BOARDWALK_PDF = Path("data/raw/pdfs/BW_Aframe_Recreation-0326.pdf")
ART_OF_ANIMATION_PDF = Path("data/raw/pdfs/DAAR_Aframe_Recreation-0525_DIGITAL.pdf")
PORT_ORLEANS_FRENCH_QUARTER_PDF = Path("data/raw/pdfs/POFQ_Aframe_Recreation-0326.pdf")
PORT_ORLEANS_RIVERSIDE_PDF = Path("data/raw/pdfs/PORS_Aframe_Recreation-0326.pdf")
CARIBBEAN_BEACH_PDF = Path("data/raw/pdfs/CBR_Aframe_Recreation-0326.pdf")
SARATOGA_SPRINGS_PDF = Path("data/raw/pdfs/SSR_Aframe_Recreation-0326.pdf")
CONTEMPORARY_PDF = Path("data/raw/pdfs/CTR_Aframe_Recreation-0326.pdf")
ANIMAL_KINGDOM_JAMBO_PDF = Path("data/raw/pdfs/DAKL_Aframe_Recreation_0126_Jambo.pdf")
ANIMAL_KINGDOM_KIDANI_PDF = Path("data/raw/pdfs/DAKL_Aframe_Recreation_0126_Kidani.pdf")
GRAND_FLORIDIAN_PDF = Path("data/raw/pdfs/GF_Aframe_Recreation-1125.pdf")
OLD_KEY_WEST_PDF = Path("data/raw/pdfs/OKWR_Aframe_Recreation-0326.pdf")
RIVIERA_PDF = Path("data/raw/pdfs/DRR_Aframe_Recreation-0326.pdf")
WILDERNESS_LODGE_PDF = Path("data/raw/pdfs/WL_Aframe_Recreation-0326.pdf")
POP_CENTURY_PDF = Path("data/raw/pdfs/POP_Aframe_Recreation-0326.pdf")
CONTEMPORARY_PDF = Path("data/raw/pdfs/CTR_Aframe_Recreation-0326.pdf")
ALL_STAR_MOVIES_EXPECTED_SLUGS = {
    "wellness-scavenger-hunt",
    "find-a-friend",
    "movie-under-the-stars",
    "reel-fun-arcade",
    "poolside-activities",
    "arts-crafts",
    "mickey-tie-dye",
    "arcade-tournament",
    "sorcerers-campfire",
    "winter-themed-activities",
    "all-star-lobby-party",
}
ALL_STAR_SPORTS_EXPECTED_SLUGS = {
    "wellness-scavenger-hunt",
    "game-point-arcade",
    "find-a-friend",
    "poolside-activities",
    "arts-crafts",
    "movie-under-the-stars",
    "mickey-tie-dye",
    "arcade-tournament",
    "touchdown-campfire",
    "all-star-lobby-party",
    "winter-themed-activities",
}
CARIBBEAN_BEACH_EXPECTED_SLUGS = {
    "find-a-friend",
    "nature-walk",
    "movie-under-the-stars",
    "poolside-activities",
    "under-the-seashell-painting",
    "mickey-tie-dye",
    "caribbean-campfire",
    "island-party",
    "caribbean-glow-festival",
}
SARATOGA_SPRINGS_EXPECTED_SLUGS = {
    "purple-martin-nest-checks",
    "community-hall",
    "disney-fit-yoga",
    "poolside-activities",
    "storytime-yoga",
    "mickey-tie-dye",
    "find-a-friend",
    "campfire",
    "glow-with-the-flow",
    "bicycle-rentals",
    "nighttime-bingo",
    "movie-under-the-stars",
    "winners-circle-mosaics",
    "win-paint-show",
}
CONTEMPORARY_EXPECTED_SLUGS = {
    "cabana-rentals",
    "motorized-boat-rentals",
    "poolside-activities",
    "olympiad-fitness-center",
    "mickey-tie-dye",
    "pickleball-clinic",
    "campfire",
    "silent-disco",
    "disney-fit-yoga",
    "movie-under-the-stars",
    "the-magic-of-mosaics",
}
WILDERNESS_LODGE_EXPECTED_SLUGS = {
    "buttons-and-bells-game-arcade",
    "wonders-of-the-lodge-art-architecture-tour",
    "find-a-friend",
    "family-activities-and-crafts",
    "storytime-yoga",
    "poolside-activities",
    "nature-walk",
    "mickey-tie-dye",
    "tasteful-artistry-at-disneys-wilderness-lodge",
    "campfire",
    "nighttime-pool-party",
    "movie-under-the-stars",
    "wild-wilderness-bingo",
}
FORT_WILDERNESS_EXPECTED_WEB_QUARANTINE_SLUGS = {
    "pools",
    "chip-n-dales-campfire-sing-a-long",
    "tri-circle-d-ranch",
    "holiday-sleigh-rides",
    "wagon-rides",
    "fishing",
    "electrical-water-pageant",
    "bike-rentals",
    "basketball-courts",
    "jogging-trails",
    "volleyball",
    "playgrounds",
    "davy-crocketts-wilderness-arcade",
    "daniel-boones-wilderness-arcade",
    "wilderness-back-trail-adventure",
    "horse-drawn-excursion-carriage-ride-at-disneys-fort-wilderness-resort-campground",
}
FORT_WILDERNESS_EXPECTED_WEB_PUBLIC_SLUGS = {
    "canoe-rentals",
    "fort-wilderness-archery-experience",
    "kayak-rentals",
    "pony-rides",
}


class FakeGoldV2Db:
    def __init__(self) -> None:
        self.upserts: list[tuple[str, dict, str]] = []
        self.upserted_by_table: dict[str, list[dict]] = {}
        self.source_ids: dict[str, str] = {}
        self.health: list[dict] = []
        self.select_rows: dict[str, list[dict]] = {}
        self.updates: list[tuple[str, dict, dict]] = []

    def select(
        self,
        table: str,
        columns: str = "*",
        filters=None,
        limit=None,
    ) -> list[dict]:
        rows = list(self.select_rows.get(table, []))
        if filters:
            for key, value in filters.items():
                if value.startswith("eq."):
                    expected = value[3:]
                    rows = [row for row in rows if str(row.get(key)).lower() == expected.lower()]
        return rows[:limit] if limit is not None else rows

    def upsert(self, table: str, rows, on_conflict: str) -> list[dict]:
        payload = rows if isinstance(rows, list) else [rows]
        returned: list[dict] = []
        for row in payload:
            stored = dict(row)
            if table == "source_documents":
                key = stored["content_sha256"]
                stored["id"] = self.source_ids.setdefault(key, f"source-{len(self.source_ids) + 1}")
            self.upserts.append((table, stored, on_conflict))
            self.upserted_by_table.setdefault(table, []).append(stored)
            returned.append(stored)
        return returned

    def rpc(self, fn: str, args=None) -> list[dict]:
        self.upserts.append((f"rpc:{fn}", args or {}, ""))
        return self.health

    def update(self, table: str, match: dict[str, str], values: dict) -> None:
        self.updates.append((table, match, values))


def _official_offerings_migration_text() -> str:
    migrations = sorted(Path().glob(OFFICIAL_OFFERINGS_MIGRATION_GLOB))
    if not migrations:
        return ""
    return "\n".join(path.read_text() for path in migrations)


class PipelineContractsTest(unittest.TestCase):
    def test_public_field_without_source_span_is_blocked(self) -> None:
        record = {
            "title": {
                "value": "Wellness Scavenger Hunt",
                "source": "pdf",
                "spans": [],
            },
            "slug": "wellness-scavenger-hunt",
            "schedule": {
                "text": "Daily from 7:00am–11:00pm",
                "spans": [{"page": 1, "line": 3}],
            },
            "location": {
                "value": "Throughout Disney’s All-Star Resorts",
                "spans": [{"page": 1, "line": 2}],
            },
        }

        result = validate_public_record(record)

        self.assertFalse(result.publishable)
        self.assertIn("title:missing_source_span", result.errors)

    def test_source_derived_required_fields_with_spans_are_publishable(self) -> None:
        record = {
            "title": {
                "value": "Wellness Scavenger Hunt",
                "source": "pdf",
                "spans": [{"page": 1, "line": 1}],
            },
            "slug": "wellness-scavenger-hunt",
            "schedule": {
                "text": "Daily from 7:00am–11:00pm",
                "spans": [{"page": 1, "line": 3}],
            },
            "location": {
                "value": "Throughout Disney’s All-Star Resorts",
                "spans": [{"page": 1, "line": 2}],
            },
            "description": {
                "value": "Find hidden wellness challenges and partake in a scavenger hunt.",
                "source": "pdf",
                "spans": [{"page": 1, "line": 4}],
            },
            "claims": [
                {
                    "kind": "fee",
                    "value": "free",
                    "evidence": [{"field": "source_pdf_fee_marker_absent"}],
                }
            ],
        }

        result = validate_public_record(record)

        self.assertTrue(result.publishable)
        self.assertEqual([], result.errors)

    def test_unsupported_walkability_claim_is_blocked(self) -> None:
        record = {
            "claims": [
                {"kind": "walkability", "value": "walkable", "evidence": []}
            ]
        }

        result = validate_claims(record)

        self.assertFalse(result.publishable)
        self.assertIn("walkability:missing_evidence", result.errors)

    def test_wellness_golden_fixture_is_valid(self) -> None:
        for fixture_path in WELLNESS_FIXTURES:
            with self.subTest(fixture=fixture_path.name):
                result = validate_golden_fixture(fixture_path)

                self.assertTrue(result.publishable)
                self.assertEqual([], result.errors)

    def test_validate_v2_accepts_valid_fixture_paths(self) -> None:
        report = validate_fixture_paths(WELLNESS_FIXTURES)

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_matching_extractions(self) -> None:
        report = validate_fixture_extractions(WELLNESS_FIXTURES)

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_all_star_movies_full_calendar_fixture(self) -> None:
        report = validate_fixture_extractions([ALL_STAR_MOVIES_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_art_of_animation_fixture_with_expected_quarantine(self) -> None:
        report = validate_fixture_extractions([ART_OF_ANIMATION_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_boardwalk_fixture_with_expected_quarantines(self) -> None:
        report = validate_fixture_extractions([BOARDWALK_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_old_key_west_fixture_with_expected_quarantines(self) -> None:
        report = validate_fixture_extractions([OLD_KEY_WEST_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_riviera_fixture_with_quarantine_and_reviewed_manual_record(self) -> None:
        report = validate_fixture_extractions([RIVIERA_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_pop_century_fixture_with_reviewed_repairs_and_manual_record(self) -> None:
        report = validate_fixture_extractions([POP_CENTURY_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_polynesian_fixture_with_quarantines_and_reviewed_manual_record(self) -> None:
        report = validate_fixture_extractions([POLYNESIAN_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_port_orleans_riverside_fixture_with_quarantines_and_reviewed_manual_records(self) -> None:
        report = validate_fixture_extractions([PORT_ORLEANS_RIVERSIDE_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_port_orleans_french_quarter_fixture_with_quarantines(self) -> None:
        report = validate_fixture_extractions([PORT_ORLEANS_FRENCH_QUARTER_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_caribbean_beach_full_calendar_fixture(self) -> None:
        report = validate_fixture_extractions([CARIBBEAN_BEACH_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_coronado_springs_fixture_with_quarantines(self) -> None:
        report = validate_fixture_extractions([CORONADO_SPRINGS_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_saratoga_springs_full_calendar_fixture(self) -> None:
        report = validate_fixture_extractions([SARATOGA_SPRINGS_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_contemporary_fixture_with_quarantine(self) -> None:
        report = validate_fixture_extractions([CONTEMPORARY_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_wilderness_lodge_full_calendar_fixture(self) -> None:
        report = validate_fixture_extractions([WILDERNESS_LODGE_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_fort_wilderness_official_web_fixture_with_quarantines(self) -> None:
        report = validate_fixture_extractions([FORT_WILDERNESS_WEB_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_caribbean_beach_extraction_keeps_real_activity_titles_only(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=CARIBBEAN_BEACH_PDF,
            calendar_group_key="caribbean-beach",
        )

        self.assertEqual(
            CARIBBEAN_BEACH_EXPECTED_SLUGS,
            {candidate["normalized_fields"]["slug"] for candidate in candidates},
        )

    def test_caribbean_beach_extraction_keeps_source_descriptions_and_schedule_boundaries(self) -> None:
        candidates = {
            candidate["normalized_fields"]["slug"]: candidate["normalized_fields"]
            for candidate in extract_candidates_for_pdf(
                pdf_path=CARIBBEAN_BEACH_PDF,
                calendar_group_key="caribbean-beach",
            )
        }

        self.assertEqual(
            "Enjoy a self-led nature walk around Barefoot Bay. Pick up a Nature Guide at the front desk to get started.",
            candidates["nature-walk"]["description"]["value"],
        )
        self.assertEqual(
            "Get in touch with your inner artist in this unique painting experience.",
            candidates["under-the-seashell-painting"]["description"]["value"],
        )
        self.assertEqual(
            "Get creative with a Disney twist on this arts and crafts favorite.",
            candidates["mickey-tie-dye"]["description"]["value"],
        )
        self.assertEqual(
            "Nightly from 6:30pm-7:30pm",
            candidates["caribbean-campfire"]["schedule"]["text"],
        )
        self.assertEqual(
            "Enjoy the warm glow of the campfire with complimentary marshmallows. S’mores kits available for purchase.",
            candidates["caribbean-campfire"]["description"]["value"],
        )

    def test_saratoga_springs_extraction_keeps_lower_page_and_punctuated_signature_titles(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=SARATOGA_SPRINGS_PDF,
            calendar_group_key="saratoga-springs",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertEqual(SARATOGA_SPRINGS_EXPECTED_SLUGS, set(by_slug))
        self.assertNotIn("saratoga-springs", by_slug)
        self.assertNotIn("activites", by_slug)
        self.assertNotIn("le-rentals", by_slug)

        yoga = by_slug["disney-fit-yoga"]["normalized_fields"]
        self.assertEqual(
            "Congress Park—Overlooking Disney Springs®",
            yoga["location"]["value"],
        )
        self.assertEqual("Tuesday at 9:00am", yoga["schedule"]["text"])

        glow = by_slug["glow-with-the-flow"]["normalized_fields"]
        self.assertEqual("High Rock Spring Pool Deck", glow["location"]["value"])
        self.assertEqual(
            "Sunday and Thursday from 7:30pm-8:30pm",
            glow["schedule"]["text"],
        )

        bicycle_rentals = by_slug["bicycle-rentals"]["normalized_fields"]
        self.assertEqual("Bicycle Rentals", bicycle_rentals["title"]["value"])
        self.assertTrue(bicycle_rentals["is_fee_based"])

        mosaics = by_slug["winners-circle-mosaics"]["normalized_fields"]
        self.assertNotIn("WIN, PAINT, SHOW", mosaics["description"]["value"])
        self.assertIn("win-paint-show", by_slug)

    def test_contemporary_extraction_blocks_qr_helpers_and_preserves_source_visible_fields(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=CONTEMPORARY_PDF,
            calendar_group_key="contemporary",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertEqual(CONTEMPORARY_EXPECTED_SLUGS | {"sports-courts"}, set(by_slug))
        self.assertNotIn("disneys-contemporary-resort", by_slug)
        self.assertNotIn("activities-schedule-to-view-bay-lake", by_slug)
        self.assertNotIn("tower-at-disneys-contemporary", by_slug)

        cabana = by_slug["cabana-rentals"]["normalized_fields"]
        self.assertEqual("Daily from 10:00am-7:00pm", cabana["schedule"]["text"])
        self.assertEqual("7:00pm", cabana["schedule"]["end_time"])
        self.assertEqual(
            "To make a reservation, please call 407-WDW-PLAY.",
            cabana["description"]["value"],
        )

        poolside = by_slug["poolside-activities"]["normalized_fields"]
        self.assertEqual("Contemporary Feature Pool", poolside["location"]["value"])
        self.assertEqual(
            "Sunday, Tuesday, Wednesday, Thursday and Saturday at 1:00pm; Monday and Friday at 2:30pm",
            poolside["schedule"]["text"],
        )

        campfire = by_slug["campfire"]["normalized_fields"]
        self.assertEqual(
            "Courtyard Campfire Pit between Contemporary Tower and Bay Lake Tower",
            campfire["location"]["value"],
        )

        yoga = by_slug["disney-fit-yoga"]["normalized_fields"]
        self.assertEqual(
            "The Lawn between Contemporary Tower and Bay Lake Tower",
            yoga["location"]["value"],
        )

        movie = by_slug["movie-under-the-stars"]["normalized_fields"]
        self.assertEqual(
            ["Frozen 2", "A Goofy Movie", "The Little Mermaid (1989)"],
            [night["movie_title"] for night in movie["movie_nights"]],
        )

        sports = by_slug["sports-courts"]
        self.assertIn("schedule:missing_source_span", sports["warnings"])
        self.assertIn("location:missing_source_span", sports["warnings"])

    def test_wilderness_lodge_extraction_recovers_bottom_activity_and_source_visible_fields(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=WILDERNESS_LODGE_PDF,
            calendar_group_key="wilderness-lodge",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertEqual(WILDERNESS_LODGE_EXPECTED_SLUGS, set(by_slug))

        wonders = by_slug["wonders-of-the-lodge-art-architecture-tour"]["normalized_fields"]
        self.assertEqual("Daily at 9:00am", wonders["schedule"]["text"])

        find_a_friend = by_slug["find-a-friend"]["normalized_fields"]
        self.assertEqual("Throughout the Main Building", find_a_friend["location"]["value"])
        self.assertIn("photo prop. Once located", find_a_friend["description"]["value"])

        family = by_slug["family-activities-and-crafts"]["normalized_fields"]
        self.assertEqual(
            "Humphrey’s Hideout at Disney’s Wilderness Lodge (Near Copper Creek Springs Pool)",
            family["location"]["value"],
        )
        self.assertEqual(
            "Daily from 12:00pm-1:30pm; Additional activities and crafts on Monday, Tuesday, Thursday and Saturday from 3:30pm-4:30pm",
            family["schedule"]["text"],
        )

        storytime = by_slug["storytime-yoga"]
        self.assertNotIn("description:text_quality_low", storytime["warnings"])
        self.assertIn(
            "Please arrive by 8:45am to fill out a waiver",
            storytime["normalized_fields"]["description"]["value"],
        )

        poolside = by_slug["poolside-activities"]["normalized_fields"]
        self.assertEqual("Daily at 2:00pm", poolside["schedule"]["text"])

        mickey = by_slug["mickey-tie-dye"]["normalized_fields"]
        self.assertEqual(
            "Humphrey’s Hideout at Disney’s Wilderness Lodge (Near Copper Creek Springs Pool)",
            mickey["location"]["value"],
        )
        self.assertEqual(
            "Get creative with a Disney twist on this arts and crafts favorite!",
            mickey["description"]["value"],
        )

        campfire = by_slug["campfire"]["normalized_fields"]
        self.assertEqual("Near Geyser Point Bar & Grill", campfire["location"]["value"])
        self.assertEqual("Nightly from 6:30pm-7:30pm", campfire["schedule"]["text"])
        self.assertEqual(
            "Enjoy the warm glow of the campfire with complimentary marshmallows. S’mores kits available for purchase.",
            campfire["description"]["value"],
        )

        movie = by_slug["movie-under-the-stars"]["normalized_fields"]
        self.assertEqual(
            [
                "The Many Adventures of Winnie the Pooh",
                "The Little Mermaid (1989)",
                "Frozen 2",
                "Big Hero 6",
            ],
            [night["movie_title"] for night in movie["movie_nights"]],
        )

    def test_fort_wilderness_official_web_fixture_quarantines_incomplete_source_records(self) -> None:
        candidates = extract_candidates_for_fixture(FORT_WILDERNESS_WEB_FIXTURE)
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertEqual(
            FORT_WILDERNESS_EXPECTED_WEB_QUARANTINE_SLUGS
            | FORT_WILDERNESS_EXPECTED_WEB_PUBLIC_SLUGS,
            set(by_slug),
        )
        self.assertEqual(
            "official_web",
            by_slug["chip-n-dales-campfire-sing-a-long"]["normalized_fields"]["title"]["source"],
        )
        self.assertEqual(
            "Join nutty friends Chip ‘n’ Dale for some old-fashioned family fun as you roast marshmallows around a crackling fire.",
            by_slug["chip-n-dales-campfire-sing-a-long"]["normalized_fields"]["description"]["value"],
        )
        for slug in FORT_WILDERNESS_EXPECTED_WEB_QUARANTINE_SLUGS:
            candidate = by_slug[slug]
            with self.subTest(slug=slug):
                self.assertEqual(
                    ["location:missing_source_span", "schedule:missing_source_span"],
                    sorted(candidate["warnings"]),
                )
        for slug in FORT_WILDERNESS_EXPECTED_WEB_PUBLIC_SLUGS:
            candidate = by_slug[slug]
            with self.subTest(slug=slug):
                self.assertEqual([], candidate["warnings"])
                if slug == "fort-wilderness-archery-experience":
                    self.assertEqual(
                        "Bike Barn at Disney's Fort Wilderness Resort",
                        candidate["normalized_fields"]["location"]["value"],
                    )
                    self.assertEqual(
                        "Operating Hours: 11:30 AM, 2:45 PM",
                        candidate["normalized_fields"]["schedule"]["text"],
                    )
                elif slug == "pony-rides":
                    self.assertEqual(
                        "the stable near Pioneer Hall",
                        candidate["normalized_fields"]["location"]["value"],
                    )
                    self.assertEqual(
                        "Pony rides are offered daily at Disney’s Fort Wilderness Resort & Campground with the last ride of the day 30 minutes prior to close.",
                        candidate["normalized_fields"]["schedule"]["text"],
                    )
                else:
                    self.assertEqual(
                        "The Bike Barn at the Meadow Recreation Area",
                        candidate["normalized_fields"]["location"]["value"],
                    )
                    self.assertEqual(
                        "Daily from 9:00 AM–5:00 PM",
                        candidate["normalized_fields"]["schedule"]["text"],
                    )

        promotion = promote_fixtures(FORT_WILDERNESS_WEB_FIXTURE.parent)
        fort_rows = [
            row
            for row in promotion.gold_records
            if row["calendar_group_key"] == "fort-wilderness"
        ]
        self.assertEqual(
            FORT_WILDERNESS_EXPECTED_WEB_PUBLIC_SLUGS,
            {row["canonical_slug"] for row in fort_rows},
        )
        source_url_by_slug = {
            row["canonical_slug"]: row["source_url"]
            for row in fort_rows
        }
        self.assertEqual(
            "https://disneyworld.disney.go.com/recreation/canoes/",
            source_url_by_slug["canoe-rentals"],
        )
        self.assertEqual(
            "https://disneyworld.disney.go.com/recreation/kayaks/",
            source_url_by_slug["kayak-rentals"],
        )
        self.assertEqual(
            "https://disneyworld.disney.go.com/recreation/fort-wilderness-archery-experience/",
            source_url_by_slug["fort-wilderness-archery-experience"],
        )
        self.assertEqual(
            "https://disneyworld.disney.go.com/recreation/campsites-at-fort-wilderness-resort/pony-rides/",
            source_url_by_slug["pony-rides"],
        )

    def test_official_web_detail_snapshot_can_supply_required_public_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            overview = {
                "source_kind": "official_web",
                "source_url": "https://example.test/resort/recreation/",
                "lines": [
                    {"line": 10, "text": "* ## Canoe Rentals"},
                    {
                        "line": 12,
                        "text": "Set off on your own excursion along the tranquil waters of Disney’s Fort Wilderness Resort.",
                    },
                ],
            }
            detail = {
                "source_kind": "official_web_detail",
                "source_url": "https://example.test/recreation/canoes/",
                "lines": [
                    {"line": 200, "text": "# Canoe Rentals at Disney's Fort Wilderness Resort and Campground"},
                    {
                        "line": 201,
                        "text": "Set off on your own excursion along the tranquil waters of Disney’s Fort Wilderness Resort.",
                    },
                    {"line": 202, "text": "## Canoe Rentals"},
                    {
                        "line": 203,
                        "text": "Rental location: The Bike Barn at the Meadow Recreation Area",
                    },
                    {"line": 204, "text": "Hours: 9:00 AM and 5:00 PM daily"},
                    {"line": 205, "text": "Price: $10 per 30 minutes (taxes not included)"},
                ],
            }
            overview_path = tmp_path / "overview.snapshot.json"
            detail_path = tmp_path / "canoes.snapshot.json"
            overview_path.write_text(json.dumps(overview))
            detail_path.write_text(json.dumps(detail))

            fixture = {
                "calendar_group_key": "fort-wilderness-test",
                "source_kind": "official_web",
                "source_url": overview["source_url"],
                "source_web_snapshot": str(overview_path),
                "source_web_sha256": web_snapshot_content_hash(overview),
                "source_detail_pages": [
                    {
                        "slug": "canoe-rentals",
                        "source_url": detail["source_url"],
                        "source_web_snapshot": str(detail_path),
                        "source_web_sha256": web_snapshot_content_hash(detail),
                    }
                ],
                "expected_records": [
                    {
                        "title": "Canoe Rentals",
                        "slug": "canoe-rentals",
                        "category": "rental",
                        "schedule_text": "Daily from 9:00 AM–5:00 PM",
                        "start_time": "9:00 AM",
                        "end_time": "5:00 PM",
                        "location": "The Bike Barn at the Meadow Recreation Area",
                        "description": "Set off on your own excursion along the tranquil waters of Disney’s Fort Wilderness Resort.",
                        "is_fee_based": True,
                        "required_spans": {
                            "title": [{"page": 1, "line": 202, "text": "## Canoe Rentals"}],
                            "description": [
                                {
                                    "page": 1,
                                    "line": 201,
                                    "text": "Set off on your own excursion along the tranquil waters of Disney’s Fort Wilderness Resort.",
                                }
                            ],
                            "location": [
                                {
                                    "page": 1,
                                    "line": 203,
                                    "text": "Rental location: The Bike Barn at the Meadow Recreation Area",
                                }
                            ],
                            "schedule": [
                                {
                                    "page": 1,
                                    "line": 204,
                                    "text": "Hours: 9:00 AM and 5:00 PM daily",
                                }
                            ],
                        },
                    }
                ],
            }
            fixture_path = tmp_path / "fixture.json"
            fixture_path.write_text(json.dumps(fixture))

            validation = validate_golden_fixture(fixture_path)
            self.assertTrue(validation.publishable, validation.errors)

            candidates = extract_candidates_for_fixture(fixture_path)
            errors = compare_candidates_to_fixture(candidates, fixture)

        self.assertEqual([], errors)

    def test_official_web_detail_snapshot_parses_operating_hours_and_prose_location(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            overview = {
                "source_kind": "official_web",
                "source_url": "https://example.test/resort/recreation/",
                "lines": [
                    {"line": 10, "text": "* ## Fort Wilderness Archery Experience"},
                    {
                        "line": 12,
                        "text": "Train like an archer as you learn to hold a bow, take aim and send an arrow soaring towards a target.",
                    },
                ],
            }
            detail = {
                "source_kind": "official_web_detail",
                "source_url": "https://example.test/recreation/fort-wilderness-archery-experience/",
                "lines": [
                    {"line": 1, "text": "Fort Wilderness Archery Experience | Walt Disney World Resort"},
                    {"line": 2, "text": "Fort Wilderness Archery Experience"},
                    {"line": 3, "text": "LocatedinWalt Disney World® Resort"},
                    {
                        "line": 4,
                        "text": "Guests 7 years of age and older can test out their skills—and experience the thrill—of archery during this 75 minute session.",
                    },
                    {"line": 9, "text": "$49 per Person (tax not included)"},
                    {"line": 11, "text": "Operating Hours –"},
                    {"line": 12, "text": "11:30 AM"},
                    {"line": 13, "text": ","},
                    {"line": 14, "text": "2:45 PM"},
                    {
                        "line": 18,
                        "text": "At the Bike Barn at Disney's Fort Wilderness Resort, Archery Guides teach Guests 7 years of age and up how to use a compound bow.",
                    },
                ],
            }
            overview_path = tmp_path / "overview.snapshot.json"
            detail_path = tmp_path / "archery.snapshot.json"
            overview_path.write_text(json.dumps(overview))
            detail_path.write_text(json.dumps(detail))

            fixture = {
                "calendar_group_key": "fort-wilderness-test",
                "source_kind": "official_web",
                "source_url": overview["source_url"],
                "source_web_snapshot": str(overview_path),
                "source_web_sha256": web_snapshot_content_hash(overview),
                "source_detail_pages": [
                    {
                        "slug": "fort-wilderness-archery-experience",
                        "source_url": detail["source_url"],
                        "source_web_snapshot": str(detail_path),
                        "source_web_sha256": web_snapshot_content_hash(detail),
                    }
                ],
                "expected_records": [
                    {
                        "title": "Fort Wilderness Archery Experience",
                        "slug": "fort-wilderness-archery-experience",
                        "category": "sports_games",
                        "schedule_text": "Operating Hours: 11:30 AM, 2:45 PM",
                        "start_time": "11:30 AM",
                        "end_time": None,
                        "location": "Bike Barn at Disney's Fort Wilderness Resort",
                        "description": "Guests 7 years of age and older can test out their skills—and experience the thrill—of archery during this 75 minute session.",
                        "is_fee_based": True,
                        "required_spans": {
                            "title": [
                                {
                                    "page": 1,
                                    "line": 2,
                                    "text": "Fort Wilderness Archery Experience",
                                }
                            ],
                            "description": [
                                {
                                    "page": 1,
                                    "line": 4,
                                    "text": "Guests 7 years of age and older can test out their skills—and experience the thrill—of archery during this 75 minute session.",
                                }
                            ],
                            "location": [
                                {
                                    "page": 1,
                                    "line": 18,
                                    "text": "At the Bike Barn at Disney's Fort Wilderness Resort, Archery Guides teach Guests 7 years of age and up how to use a compound bow.",
                                }
                            ],
                            "schedule": [
                                {"page": 1, "line": 11, "text": "Operating Hours –"},
                                {"page": 1, "line": 12, "text": "11:30 AM"},
                                {"page": 1, "line": 14, "text": "2:45 PM"},
                            ],
                        },
                    }
                ],
            }
            fixture_path = tmp_path / "fixture.json"
            fixture_path.write_text(json.dumps(fixture))

            validation = validate_golden_fixture(fixture_path)
            self.assertTrue(validation.publishable, validation.errors)

            candidates = extract_candidates_for_fixture(fixture_path)
            errors = compare_candidates_to_fixture(candidates, fixture)

        self.assertEqual([], errors)

    def test_official_web_detail_snapshot_parses_walk_in_daily_activity(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            overview = {
                "source_kind": "official_web",
                "source_url": "https://example.test/resort/recreation/",
                "lines": [
                    {"line": 10, "text": "* ## Pony Rides"},
                    {
                        "line": 12,
                        "text": "Thrill your tiny tyke with an opportunity to saddle up on a petite pony!",
                    },
                ],
            }
            detail = {
                "source_kind": "official_web_detail",
                "source_url": "https://example.test/recreation/campsites-at-fort-wilderness-resort/pony-rides/",
                "lines": [
                    {"line": 1, "text": "Pony Rides | Walt Disney World Resort"},
                    {"line": 2, "text": "Pony Rides"},
                    {"line": 3, "text": "LocatedinThe Campsites at Disney's Fort Wilderness Resort"},
                    {
                        "line": 4,
                        "text": "Introduce your junior cowboy or cowgirl to our 4-legged equine friends with an old-fashioned pony ride.",
                    },
                    {"line": 5, "text": "$10 per Child (Ages 3–9) (tax not included)"},
                    {"line": 7, "text": "Pony Rides are available at the stable near Pioneer Hall on a walk-in basis only."},
                    {
                        "line": 10,
                        "text": "Pony rides are offered daily at Disney’s Fort Wilderness Resort & Campground with the last ride of the day 30 minutes prior to close. Riders must be at least 3 years of age, under 80 pounds, no taller than 48 inches and able to hang on by themselves. A parent or guardian must lead the pony at all times.",
                    },
                ],
            }
            overview_path = tmp_path / "overview.snapshot.json"
            detail_path = tmp_path / "pony-rides.snapshot.json"
            overview_path.write_text(json.dumps(overview))
            detail_path.write_text(json.dumps(detail))

            fixture = {
                "calendar_group_key": "fort-wilderness-test",
                "source_kind": "official_web",
                "source_url": overview["source_url"],
                "source_web_snapshot": str(overview_path),
                "source_web_sha256": web_snapshot_content_hash(overview),
                "source_detail_pages": [
                    {
                        "slug": "pony-rides",
                        "source_url": detail["source_url"],
                        "source_web_snapshot": str(detail_path),
                        "source_web_sha256": web_snapshot_content_hash(detail),
                    }
                ],
                "expected_records": [
                    {
                        "title": "Pony Rides",
                        "slug": "pony-rides",
                        "category": "resort_activity",
                        "schedule_text": "Pony rides are offered daily at Disney’s Fort Wilderness Resort & Campground with the last ride of the day 30 minutes prior to close.",
                        "start_time": None,
                        "end_time": None,
                        "location": "the stable near Pioneer Hall",
                        "description": "Introduce your junior cowboy or cowgirl to our 4-legged equine friends with an old-fashioned pony ride.",
                        "is_fee_based": True,
                        "required_spans": {
                            "title": [{"page": 1, "line": 2, "text": "Pony Rides"}],
                            "description": [
                                {
                                    "page": 1,
                                    "line": 4,
                                    "text": "Introduce your junior cowboy or cowgirl to our 4-legged equine friends with an old-fashioned pony ride.",
                                }
                            ],
                            "location": [
                                {
                                    "page": 1,
                                    "line": 7,
                                    "text": "Pony Rides are available at the stable near Pioneer Hall on a walk-in basis only.",
                                }
                            ],
                            "schedule": [
                                {
                                    "page": 1,
                                    "line": 10,
                                    "text": "Pony rides are offered daily at Disney’s Fort Wilderness Resort & Campground with the last ride of the day 30 minutes prior to close. Riders must be at least 3 years of age, under 80 pounds, no taller than 48 inches and able to hang on by themselves. A parent or guardian must lead the pony at all times.",
                                }
                            ],
                        },
                    }
                ],
            }
            fixture_path = tmp_path / "fixture.json"
            fixture_path.write_text(json.dumps(fixture))

            validation = validate_golden_fixture(fixture_path)
            self.assertTrue(validation.publishable, validation.errors)

            candidates = extract_candidates_for_fixture(fixture_path)
            errors = compare_candidates_to_fixture(candidates, fixture)

        self.assertEqual([], errors)

    def test_official_web_detail_snapshot_parses_departure_sentence_with_price(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            overview = {
                "source_kind": "official_web",
                "source_url": "https://example.test/resort/recreation/",
                "lines": [
                    {"line": 10, "text": "* ## Wagon Rides"},
                    {
                        "line": 12,
                        "text": "Giddyup for an old-fashioned, horse-drawn wagon ride around the Resort.",
                    },
                ],
            }
            detail = {
                "source_kind": "official_web_detail",
                "source_url": "https://example.test/recreation/campsites-at-fort-wilderness-resort/wagon-rides/",
                "lines": [
                    {"line": 1, "text": "Wagon Rides at Fort Wilderness Resort | Walt Disney World Resort"},
                    {"line": 2, "text": "Horse Drawn Excursion - Wagon Ride"},
                    {"line": 3, "text": "LocatedinThe Campsites at Disney's Fort Wilderness Resort"},
                    {
                        "line": 4,
                        "text": "Giddy up for an old-fashioned, horse-drawn wagon ride at The Cabins and Campsites of Disney’s Fort Wilderness Resort.",
                    },
                    {"line": 9, "text": "Schedule & Pricing"},
                    {
                        "line": 10,
                        "text": "Wagon rides depart Friday, Saturday and Sunday evenings at 6:00 PM and 8:30 PM (weather permitting) from the front of Pioneer Hall. These 25-minute rides cost $15 for Guests ages 10 and up, and $10 for Guests 3 to 9 years of age. This is a group wagon ride and tickets are sold by the driver 20 minutes prior to the departure time. Cash and MagicBands are accepted as forms of payment.",
                    },
                    {
                        "line": 15,
                        "text": "The ride departs across from Pioneer Hall at Disney's Fort Wilderness Resort & Campground.",
                    },
                ],
            }
            overview_path = tmp_path / "overview.snapshot.json"
            detail_path = tmp_path / "wagon-rides.snapshot.json"
            overview_path.write_text(json.dumps(overview))
            detail_path.write_text(json.dumps(detail))

            fixture = {
                "calendar_group_key": "fort-wilderness-test",
                "source_kind": "official_web",
                "source_url": overview["source_url"],
                "source_web_snapshot": str(overview_path),
                "source_web_sha256": web_snapshot_content_hash(overview),
                "source_detail_pages": [
                    {
                        "slug": "wagon-rides",
                        "source_url": detail["source_url"],
                        "source_web_snapshot": str(detail_path),
                        "source_web_sha256": web_snapshot_content_hash(detail),
                    }
                ],
                "expected_records": [
                    {
                        "title": "Wagon Rides",
                        "slug": "wagon-rides",
                        "category": "resort_activity",
                        "schedule_text": "Wagon rides depart Friday, Saturday and Sunday evenings at 6:00 PM and 8:30 PM (weather permitting) from the front of Pioneer Hall.",
                        "start_time": "6:00 PM",
                        "end_time": None,
                        "location": "Pioneer Hall",
                        "description": "Giddy up for an old-fashioned, horse-drawn wagon ride at The Cabins and Campsites of Disney’s Fort Wilderness Resort.",
                        "is_fee_based": True,
                        "required_spans": {
                            "title": [{"page": 1, "line": 10, "text": "* ## Wagon Rides"}],
                            "description": [
                                {
                                    "page": 1,
                                    "line": 4,
                                    "text": "Giddy up for an old-fashioned, horse-drawn wagon ride at The Cabins and Campsites of Disney’s Fort Wilderness Resort.",
                                }
                            ],
                            "location": [
                                {
                                    "page": 1,
                                    "line": 15,
                                    "text": "The ride departs across from Pioneer Hall at Disney's Fort Wilderness Resort & Campground.",
                                }
                            ],
                            "schedule": [
                                {
                                    "page": 1,
                                    "line": 10,
                                    "text": "Wagon rides depart Friday, Saturday and Sunday evenings at 6:00 PM and 8:30 PM (weather permitting) from the front of Pioneer Hall. These 25-minute rides cost $15 for Guests ages 10 and up, and $10 for Guests 3 to 9 years of age. This is a group wagon ride and tickets are sold by the driver 20 minutes prior to the departure time. Cash and MagicBands are accepted as forms of payment.",
                                }
                            ],
                        },
                    }
                ],
            }
            fixture_path = tmp_path / "fixture.json"
            fixture_path.write_text(json.dumps(fixture))

            validation = validate_golden_fixture(fixture_path)
            self.assertTrue(validation.publishable, validation.errors)

            candidates = extract_candidates_for_fixture(fixture_path)
            errors = compare_candidates_to_fixture(candidates, fixture)

        self.assertEqual([], errors)

    def test_official_web_detail_snapshot_hash_drift_blocks_fixture(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            overview_path = tmp_path / "overview.snapshot.json"
            detail_path = tmp_path / "detail.snapshot.json"
            overview_path.write_text(json.dumps({"lines": [{"line": 1, "text": "* ## Canoe Rentals"}]}))
            detail_path.write_text(json.dumps({"lines": [{"line": 1, "text": "## Canoe Rentals"}]}))
            fixture_path = tmp_path / "fixture.json"
            fixture_path.write_text(
                json.dumps(
                    {
                        "calendar_group_key": "fort-wilderness-test",
                        "source_kind": "official_web",
                        "source_url": "https://example.test/resort/recreation/",
                        "source_web_snapshot": str(overview_path),
                        "source_web_sha256": web_snapshot_content_hash(json.loads(overview_path.read_text())),
                        "source_detail_pages": [
                            {
                                "slug": "canoe-rentals",
                                "source_url": "https://example.test/recreation/canoes/",
                                "source_web_snapshot": str(detail_path),
                                "source_web_sha256": "0" * 64,
                            }
                        ],
                        "expected_records": [
                            {
                                "title": "Canoe Rentals",
                                "slug": "canoe-rentals",
                                "category": "rental",
                                "schedule_text": "Daily from 9:00 AM–5:00 PM",
                                "start_time": "9:00 AM",
                                "end_time": "5:00 PM",
                                "location": "The Bike Barn at the Meadow Recreation Area",
                                "description": "",
                                "is_fee_based": True,
                                "required_spans": {
                                    "title": [{"page": 1, "line": 1, "text": "* ## Canoe Rentals"}],
                                    "location": [{"page": 1, "line": 1, "text": "* ## Canoe Rentals"}],
                                    "schedule": [{"page": 1, "line": 1, "text": "* ## Canoe Rentals"}],
                                },
                            }
                        ],
                    }
                )
            )

            validation = validate_golden_fixture(fixture_path)

        self.assertFalse(validation.publishable)
        self.assertIn("fixture:source_detail_page_hash_mismatch:canoe-rentals", validation.errors)

    def test_official_web_snapshot_hash_ignores_capture_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            overview_path = tmp_path / "overview.snapshot.json"
            snapshot = {
                "source_kind": "official_web",
                "source_url": "https://example.test/resort/recreation/",
                "captured_at": "2026-06-22T00:00:00Z",
                "lines": [
                    {"line": 1, "text": "* ## Canoe Rentals"},
                    {"line": 2, "text": "A visible source description."},
                ],
            }
            overview_path.write_text(json.dumps(snapshot))
            fixture_path = tmp_path / "fixture.json"
            fixture_path.write_text(
                json.dumps(
                    {
                        "calendar_group_key": "fort-wilderness-test",
                        "source_kind": "official_web",
                        "source_url": snapshot["source_url"],
                        "source_web_snapshot": str(overview_path),
                        "source_web_sha256": web_snapshot_content_hash(snapshot),
                        "expected_records": [],
                        "expected_quarantine_records": [
                            {
                                "title": "Canoe Rentals",
                                "slug": "canoe-rentals",
                                "warnings": ["location:missing_source_span"],
                                "required_spans": {
                                    "title": [{"page": 1, "line": 1, "text": "* ## Canoe Rentals"}],
                                },
                            }
                        ],
                    }
                )
            )

            snapshot["captured_at"] = "2026-06-23T00:00:00Z"
            overview_path.write_text(json.dumps(snapshot))
            metadata_only = validate_golden_fixture(fixture_path)

            snapshot["lines"][1]["text"] = "A changed visible source description."
            overview_path.write_text(json.dumps(snapshot))
            content_changed = validate_golden_fixture(fixture_path)

        self.assertTrue(metadata_only.publishable, metadata_only.errors)
        self.assertFalse(content_changed.publishable)
        self.assertIn("fixture:source_web_hash_mismatch", content_changed.errors)

    def test_full_calendar_fixture_detects_required_span_drift(self) -> None:
        fixture = json.loads(ALL_STAR_MOVIES_FULL_FIXTURE.read_text())
        fixture = json.loads(json.dumps(fixture))
        fixture["expected_records"][0]["required_spans"]["title"][0]["line"] = 999
        candidates = extract_candidates_for_fixture(ALL_STAR_MOVIES_FULL_FIXTURE)

        errors = compare_candidates_to_fixture(candidates, fixture)

        self.assertTrue(
            any("fixture_drift:required_spans:title" in error for error in errors),
            errors,
        )

    def test_full_calendar_validation_rejects_unaccounted_source_candidates(self) -> None:
        fixture = json.loads(ALL_STAR_MOVIES_FULL_FIXTURE.read_text())
        fixture["expected_records"] = fixture["expected_records"][:1]

        with tempfile.TemporaryDirectory() as tmp:
            fixture_path = Path(tmp) / "incomplete-full-calendar.json"
            fixture_path.write_text(json.dumps(fixture))

            report = validate_fixture_extractions([fixture_path])

        self.assertFalse(report.publishable)
        self.assertTrue(
            any("candidate_unexpected:" in error for error in report.errors),
            report.errors,
        )

    def test_expected_quarantine_records_account_for_source_visible_non_public_candidates(self) -> None:
        public_candidate = {
            "warnings": [],
            "normalized_fields": {
                "slug": "wake-up-shake-up-party",
                "title": {
                    "value": "Wake Up Shake Up Party",
                    "spans": [{"page": 1, "line": 1, "text": "WAKE UP SHAKE UP PARTY"}],
                },
            },
        }
        quarantine_candidate = {
            "warnings": ["schedule:missing_source_span", "location:missing_source_span"],
            "normalized_fields": {
                "slug": "nighttime-pool-party",
                "title": {
                    "value": "Nighttime Pool Party",
                    "spans": [{"page": 1, "line": 54, "text": "NIGHTTIME POOL PARTY"}],
                },
            },
        }
        fixture = {
            "expected_records": [
                {
                    "title": "Wake Up Shake Up Party",
                    "slug": "wake-up-shake-up-party",
                    "required_spans": {
                        "title": [{"page": 1, "line": 1, "text": "WAKE UP SHAKE UP PARTY"}]
                    },
                }
            ],
            "expected_quarantine_records": [
                {
                    "title": "Nighttime Pool Party",
                    "slug": "nighttime-pool-party",
                    "warnings": ["schedule:missing_source_span", "location:missing_source_span"],
                    "required_spans": {
                        "title": [{"page": 1, "line": 54, "text": "NIGHTTIME POOL PARTY"}]
                    },
                }
            ],
        }

        errors = compare_candidates_to_fixture([public_candidate, quarantine_candidate], fixture)

        self.assertEqual([], errors)

    def test_expected_unextractable_records_are_validated_and_audited(self) -> None:
        fixture = json.loads(ALL_STAR_MOVIES_FULL_FIXTURE.read_text())
        fixture = json.loads(json.dumps(fixture))
        fixture["expected_unextractable_records"] = [
            {
                "title": "Source Visible Missing Candidate",
                "slug": "source-visible-missing-candidate",
                "reason": "ocr_missed_title",
                "required_spans": {
                    "title": [
                        {
                            "page": 1,
                            "line": 1,
                            "text": "SOURCE VISIBLE MISSING CANDIDATE",
                        }
                    ]
                },
            }
        ]

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            fixtures_path = tmp_path / "fixtures"
            fixtures_path.mkdir()
            fixture_path = fixtures_path / "fixture.json"
            fixture_path.write_text(json.dumps(fixture))
            gold_path = tmp_path / "gold.json"
            gold_path.write_text("[]")
            ingest_path = tmp_path / "ingest.json"
            ingest_path.write_text('{"activities":[]}')

            validation = validate_golden_fixture(fixture_path)
            audit = build_coverage_audit(
                fixtures_dir=fixtures_path,
                gold_path=gold_path,
                ingest_path=ingest_path,
            )

        self.assertTrue(validation.publishable, validation.errors)
        self.assertEqual(1, audit.summary["fixture_unextractable_count"])
        self.assertTrue(
            any(
                warning == "coverage:fixture_unextractable_records:1"
                for warning in audit.warnings
            ),
            audit.warnings,
        )

    def test_unextractable_records_must_be_updated_when_extractor_finds_candidate(self) -> None:
        public_candidate = {
            "warnings": [],
            "normalized_fields": {
                "slug": "wake-up-shake-up-party",
                "title": {
                    "value": "Wake Up Shake Up Party",
                    "spans": [{"page": 1, "line": 1, "text": "WAKE UP SHAKE UP PARTY"}],
                },
            },
        }
        unextractable_candidate = {
            "warnings": [],
            "normalized_fields": {
                "slug": "source-visible-missing-candidate",
                "title": {
                    "value": "Source Visible Missing Candidate",
                    "spans": [
                        {
                            "page": 1,
                            "line": 22,
                            "text": "SOURCE VISIBLE MISSING CANDIDATE",
                        }
                    ],
                },
            },
        }
        fixture = {
            "expected_records": [
                {
                    "title": "Wake Up Shake Up Party",
                    "slug": "wake-up-shake-up-party",
                    "required_spans": {
                        "title": [{"page": 1, "line": 1, "text": "WAKE UP SHAKE UP PARTY"}]
                    },
                }
            ],
            "expected_unextractable_records": [
                {
                    "title": "Source Visible Missing Candidate",
                    "slug": "source-visible-missing-candidate",
                    "reason": "ocr_missed_title",
                    "required_spans": {
                        "title": [
                            {
                                "page": 1,
                                "line": 22,
                                "text": "SOURCE VISIBLE MISSING CANDIDATE",
                            }
                        ]
                    },
                }
            ],
        }

        errors = compare_candidates_to_fixture(
            [public_candidate, unextractable_candidate],
            fixture,
        )

        self.assertIn(
            "candidate_unextractable_became_extractable:source-visible-missing-candidate",
            errors,
        )

    def test_reviewed_manual_records_are_source_backed_public_records(self) -> None:
        fixture = json.loads(ALL_STAR_MOVIES_FULL_FIXTURE.read_text())
        fixture = json.loads(json.dumps(fixture))
        fixture["expected_records"] = []
        fixture["reviewed_manual_records"] = [
            {
                "title": "Source Visible Manual Activity",
                "slug": "source-visible-manual-activity",
                "category": "other",
                "schedule_text": "Daily from 9:00am-10:00am",
                "start_time": "9:00am",
                "end_time": "10:00am",
                "location": "Manual Review Lawn",
                "description": "Reviewed source text that OCR missed.",
                "is_fee_based": False,
                "manual_review": {
                    "reviewer": "codex-test",
                    "reviewed_at": "2026-06-22T00:00:00Z",
                    "notes": "Verified against the rendered PDF.",
                },
                "required_spans": {
                    "title": [
                        {
                            "page": 1,
                            "bbox": [100, 200, 500, 240],
                            "text": "SOURCE VISIBLE MANUAL ACTIVITY",
                            "source": "manual_visual_bbox",
                        }
                    ],
                    "location": [
                        {
                            "page": 1,
                            "bbox": [100, 250, 500, 280],
                            "text": "Manual Review Lawn",
                            "source": "manual_visual_bbox",
                        }
                    ],
                    "schedule": [
                        {
                            "page": 1,
                            "bbox": [100, 290, 500, 320],
                            "text": "Daily from 9:00am-10:00am",
                            "source": "manual_visual_bbox",
                        }
                    ],
                    "description": [
                        {
                            "page": 1,
                            "bbox": [100, 330, 500, 360],
                            "text": "Reviewed source text that OCR missed.",
                            "source": "manual_visual_bbox",
                        }
                    ],
                },
            }
        ]

        with tempfile.TemporaryDirectory() as tmp:
            fixture_path = Path(tmp) / "fixture.json"
            fixture_path.write_text(json.dumps(fixture))

            validation = validate_golden_fixture(fixture_path)
            candidates = extract_publishable_candidates_for_fixture(fixture_path)
            promotion = promote_candidates(candidates)

        self.assertTrue(validation.publishable, validation.errors)
        self.assertEqual(
            ["source-visible-manual-activity"],
            [candidate["normalized_fields"]["slug"] for candidate in candidates],
        )
        self.assertEqual([], promotion.review_queue)
        self.assertEqual(1, len(promotion.gold_records))
        gold = promotion.gold_records[0]
        self.assertEqual("Source Visible Manual Activity", gold["title"])
        self.assertEqual(
            [{"page": 1, "bbox": [100, 200, 500, 240], "text": "SOURCE VISIBLE MANUAL ACTIVITY", "source": "manual_visual_bbox"}],
            gold["field_provenance"]["title"],
        )

    def test_reviewed_manual_records_are_compared_for_fixture_drift(self) -> None:
        fixture = {
            "expected_records": [],
            "reviewed_manual_records": [
                {
                    "title": "Source Visible Manual Activity",
                    "slug": "source-visible-manual-activity",
                    "category": "other",
                    "schedule_text": "Daily from 9:00am-10:00am",
                    "start_time": "9:00am",
                    "end_time": "10:00am",
                    "location": "Manual Review Lawn",
                    "description": "Reviewed source text that OCR missed.",
                    "is_fee_based": False,
                    "required_spans": {
                        "title": [{"page": 1, "bbox": [100, 200, 500, 240], "text": "SOURCE VISIBLE MANUAL ACTIVITY"}],
                        "location": [{"page": 1, "bbox": [100, 250, 500, 280], "text": "Manual Review Lawn"}],
                        "schedule": [{"page": 1, "bbox": [100, 290, 500, 320], "text": "Daily from 9:00am-10:00am"}],
                        "description": [{"page": 1, "bbox": [100, 330, 500, 360], "text": "Reviewed source text that OCR missed."}],
                    },
                }
            ],
        }
        candidate = {
            "warnings": [],
            "normalized_fields": {
                "slug": "source-visible-manual-activity",
                "title": {
                    "value": "Source Visible Manual Activity",
                    "spans": [{"page": 1, "bbox": [100, 200, 500, 240], "text": "SOURCE VISIBLE MANUAL ACTIVITY"}],
                },
                "schedule": {
                    "text": "Daily from 9:00am-11:00am",
                    "start_time": "9:00am",
                    "end_time": "11:00am",
                    "spans": [{"page": 1, "bbox": [100, 290, 500, 320], "text": "Daily from 9:00am-11:00am"}],
                },
                "location": {
                    "value": "Manual Review Lawn",
                    "spans": [{"page": 1, "bbox": [100, 250, 500, 280], "text": "Manual Review Lawn"}],
                },
                "description": {
                    "value": "Reviewed source text that OCR missed.",
                    "spans": [{"page": 1, "bbox": [100, 330, 500, 360], "text": "Reviewed source text that OCR missed."}],
                },
                "is_fee_based": False,
            },
        }

        errors = compare_candidates_to_fixture([candidate], fixture)

        self.assertTrue(
            any("fixture_drift:schedule_text" in error for error in errors),
            errors,
        )

    def test_reviewed_manual_records_count_as_fixture_coverage(self) -> None:
        fixture = {
            "calendar_group_key": "manual-group",
            "source_pdf_sha256": "f" * 64,
            "expected_records": [],
            "reviewed_manual_records": [
                {
                    "title": "Source Visible Manual Activity",
                    "slug": "source-visible-manual-activity",
                    "category": "other",
                    "schedule_text": "Daily from 9:00am-10:00am",
                    "start_time": "9:00am",
                    "end_time": "10:00am",
                    "location": "Manual Review Lawn",
                    "description": "Reviewed source text that OCR missed.",
                    "is_fee_based": False,
                    "manual_review": {
                        "reviewer": "codex-test",
                        "reviewed_at": "2026-06-22T00:00:00Z",
                        "notes": "Verified against the rendered PDF.",
                    },
                    "required_spans": {
                        "title": [{"page": 1, "bbox": [100, 200, 500, 240], "text": "SOURCE VISIBLE MANUAL ACTIVITY"}],
                        "location": [{"page": 1, "bbox": [100, 250, 500, 280], "text": "Manual Review Lawn"}],
                        "schedule": [{"page": 1, "bbox": [100, 290, 500, 320], "text": "Daily from 9:00am-10:00am"}],
                        "description": [{"page": 1, "bbox": [100, 330, 500, 360], "text": "Reviewed source text that OCR missed."}],
                    },
                }
            ],
        }
        gold_row = {
            "calendar_group_key": "manual-group",
            "canonical_slug": "source-visible-manual-activity",
            "source_sha256": "f" * 64,
            "source_url": "https://example.com/manual.pdf",
            "field_provenance": {
                "title": [{"page": 1, "bbox": [100, 200, 500, 240]}],
                "location": [{"page": 1, "bbox": [100, 250, 500, 280]}],
                "schedule": [{"page": 1, "bbox": [100, 290, 500, 320]}],
                "description": [{"page": 1, "bbox": [100, 330, 500, 360]}],
            },
            "description": "Reviewed source text that OCR missed.",
            "claims": [{"kind": "fee", "value": "unknown", "evidence": []}],
        }

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            fixtures_path = tmp_path / "fixtures"
            fixtures_path.mkdir()
            (fixtures_path / "manual.json").write_text(json.dumps(fixture))
            gold_path = tmp_path / "gold.json"
            gold_path.write_text(json.dumps([gold_row]))
            ingest_path = tmp_path / "ingest.json"
            ingest_path.write_text('{"activities":[]}')

            audit = build_coverage_audit(
                fixtures_dir=fixtures_path,
                gold_path=gold_path,
                ingest_path=ingest_path,
            )

        self.assertTrue(audit.passed, audit.errors)
        self.assertEqual(1, audit.summary["fixture_count"])
        self.assertEqual(1, audit.summary["coverage_required_count"])

    def test_reviewed_schedule_repair_corrects_malformed_ocr_time_range(self) -> None:
        candidates = extract_candidates_for_fixture(POP_CENTURY_FULL_FIXTURE)
        poolside = next(
            candidate
            for candidate in candidates
            if candidate["normalized_fields"]["slug"] == "poolside-activities"
        )
        schedule = poolside["normalized_fields"]["schedule"]

        self.assertEqual("Daily from 1:00pm-2:30pm", schedule["text"])
        self.assertEqual("1:00pm", schedule["start_time"])
        self.assertEqual("2:30pm", schedule["end_time"])
        self.assertEqual("reviewed_field_repair", schedule["source"])
        self.assertEqual(
            "Daily from 1:;00pm-2:30pm",
            poolside["raw_fields"]["schedule"]["text"],
        )
        self.assertNotIn("schedule:text_quality_low", poolside["warnings"])

    def test_reviewed_description_repairs_correct_old_key_west_ocr_damage(self) -> None:
        candidates = extract_candidates_for_fixture(OLD_KEY_WEST_FULL_FIXTURE)
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        expected_descriptions = {
            "disney-fit-yoga": "Ground yourself with a gentle yoga session to start your day. Designed for all skill levels, this experience incorporates various poses set to your favorite Disney music!",
            "conch-crazy-bingo": "Bring the family together for an unforgettable bingo night full of fun, joy, and prizes!",
            "conch-flats-mosaics": "Design your own mosaic showpiece with a touch of Disney flair. This experience is recommended for Guests ages 12 and up. Class may take up to 2 hours. Reservations are required. Please visit Community Hall or call 407-827-1183 to reserve your spot. Space is limited. Weather permitting.",
        }

        for slug, expected_description in expected_descriptions.items():
            with self.subTest(slug=slug):
                candidate = by_slug[slug]
                description = candidate["normalized_fields"]["description"]
                self.assertEqual(expected_description, description["value"])
                self.assertEqual("reviewed_field_repair", description["source"])
                self.assertNotIn("description:text_quality_low", candidate["warnings"])

    def test_validate_v2_rejects_fixture_drift(self) -> None:
        report = validate_fixture_extractions(
            [WELLNESS_FIXTURES[0]],
            overrides={"title": "Broken"},
        )

        self.assertFalse(report.publishable)
        self.assertTrue(
            any("fixture_drift:title" in error for error in report.errors),
            report.errors,
        )

    def test_validate_v2_rejects_empty_fixture_coverage(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            report = validate_fixture_extractions(list(Path(tmp).glob("*.json")))

        self.assertFalse(report.publishable)
        self.assertIn("fixtures:missing", report.errors)

    def test_wellness_candidate_comes_from_layout_spans(self) -> None:
        for fixture_path in WELLNESS_FIXTURES:
            with self.subTest(fixture=fixture_path.name):
                expected = json.loads(fixture_path.read_text())["expected"]
                candidates = extract_candidates_for_fixture(fixture_path)
                candidate = candidates[0]

                self.assertEqual(
                    "WELLNESS SCAVENGER HUNT",
                    candidate["raw_fields"]["title"]["value"],
                )
                self.assertEqual(
                    expected["title"],
                    candidate["normalized_fields"]["title"]["value"],
                )
                self.assertEqual(
                    expected["end_time"],
                    candidate["normalized_fields"]["schedule"]["end_time"],
                )
                self.assertEqual(
                    expected["description"],
                    candidate["normalized_fields"]["description"]["value"],
                )
                self.assertNotEqual(
                    [],
                    candidate["normalized_fields"]["description"]["spans"],
                )
                self.assertEqual([], candidate["warnings"])

    def test_wellness_candidate_spans_match_fixtures(self) -> None:
        for fixture_path in WELLNESS_FIXTURES:
            with self.subTest(fixture=fixture_path.name):
                fixture = json.loads(fixture_path.read_text())
                candidate = extract_candidates_for_fixture(fixture_path)[0]
                normalized = candidate["normalized_fields"]

                actual_lines = {
                    "title": [span["line"] for span in normalized["title"]["spans"]],
                    "location": [span["line"] for span in normalized["location"]["spans"]],
                    "schedule": [span["line"] for span in normalized["schedule"]["spans"]],
                    "description": [
                        span["line"]
                        for span in normalized["description"]["spans"]
                    ],
                }
                expected_lines = {
                    field: [span["line"] for span in spans]
                    for field, spans in fixture["required_spans"].items()
                }

                self.assertEqual(expected_lines, actual_lines)

    def test_all_star_movies_v2_extracts_full_source_spanned_calendar(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=ALL_STAR_MOVIES_PDF,
            calendar_group_key="all-star-movies",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertEqual(ALL_STAR_MOVIES_EXPECTED_SLUGS, set(by_slug))
        self.assertNotIn("resort-scavenger-hunt", by_slug)
        self.assertNotIn("arcade", by_slug)
        self.assertNotIn("campfire", by_slug)

        for slug, candidate in by_slug.items():
            with self.subTest(slug=slug):
                normalized = candidate["normalized_fields"]
                self.assertNotEqual([], normalized["title"]["spans"])
                self.assertNotEqual([], normalized["schedule"]["spans"])
                self.assertNotEqual([], normalized["location"]["spans"])
                if normalized["description"]["value"]:
                    self.assertNotEqual([], normalized["description"]["spans"])
                self.assertEqual([], candidate["warnings"])

        reel = by_slug["reel-fun-arcade"]["normalized_fields"]
        self.assertEqual("11:00pm", reel["schedule"]["end_time"])
        self.assertEqual(
            "Play the latest and greatest family-friendly video games.",
            reel["description"]["value"],
        )

        movies = by_slug["movie-under-the-stars"]["normalized_fields"]
        self.assertEqual("The Reel Spot | 8:00PM", movies["schedule"]["text"])
        self.assertEqual(7, len(movies["movie_nights"]))
        self.assertEqual(
            "Beauty and the Beast (1991)",
            movies["movie_nights"][0]["movie_title"],
        )

    def test_all_star_sports_v2_ignores_qr_helper_text_as_activity(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=ALL_STAR_SPORTS_PDF,
            calendar_group_key="all-star-sports",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertEqual(ALL_STAR_SPORTS_EXPECTED_SLUGS, set(by_slug))
        self.assertNotIn("code-for-more", by_slug)
        self.assertNotIn("scan-this-qr", by_slug)

        arcade = by_slug["arcade-tournament"]["normalized_fields"]
        self.assertNotIn("Touchdown! Campfire", arcade["description"]["value"])
        self.assertNotIn("marshmallows", arcade["description"]["value"])

        campfire = by_slug["touchdown-campfire"]["normalized_fields"]
        self.assertEqual("Touchdown! Campfire", campfire["title"]["value"])
        self.assertEqual("Daily from 6:00pm–7:00pm", campfire["schedule"]["text"])
        self.assertEqual("Outside Stadium Hall near Touchdown! Buildings", campfire["location"]["value"])

        winter = by_slug["winter-themed-activities"]["normalized_fields"]
        self.assertNotIn("1125 - V3", winter["description"]["value"])

    def test_all_star_music_v2_excludes_section_headings_from_descriptions(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=ALL_STAR_MUSIC_PDF,
            calendar_group_key="all-star-music",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        find_a_friend = by_slug["find-a-friend"]["normalized_fields"]
        self.assertNotIn("SIGNATURE", find_a_friend["description"]["value"])
        self.assertNotIn("ACTIVITY", find_a_friend["description"]["value"])

        winter = by_slug["winter-themed-activities"]["normalized_fields"]
        self.assertNotIn("1125", winter["description"]["value"])

        poolside = by_slug["poolside-activities"]["normalized_fields"]
        self.assertEqual(
            "Sunday, Monday, Tuesday, Wednesday, Thursday and Friday at 12:30pm; Saturday at 2:30pm",
            poolside["schedule"]["text"],
        )
        self.assertEqual("12:30pm", poolside["schedule"]["start_time"])
        self.assertIsNone(poolside["schedule"]["end_time"])
        self.assertNotIn("Thursday and Friday", poolside["description"]["value"])

        arts = by_slug["arts-crafts"]["normalized_fields"]
        self.assertEqual(
            "Sunday, Monday, Tuesday, Wednesday, Thursday and Friday from 2:30pm–3:30pm",
            arts["schedule"]["text"],
        )
        self.assertEqual("2:30pm", arts["schedule"]["start_time"])
        self.assertEqual("3:30pm", arts["schedule"]["end_time"])

    def test_beach_yacht_v2_does_not_promote_schedule_as_location_or_footer_as_description(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=BEACH_YACHT_PDF,
            calendar_group_key="beach-yacht-club",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        lafferty = by_slug["lafferty-place-arcade"]
        self.assertEqual(
            "Daily from 8:00am–11:00pm",
            lafferty["normalized_fields"]["schedule"]["text"],
        )
        self.assertEqual(
            "Lafferty Place Arcade",
            lafferty["normalized_fields"]["location"]["value"],
        )
        self.assertEqual(
            lafferty["normalized_fields"]["title"]["spans"],
            lafferty["normalized_fields"]["location"]["spans"],
        )
        self.assertNotIn("location:missing_source_span", lafferty["warnings"])

        ship_shape = by_slug["ship-shape-fitness-center"]
        self.assertEqual(
            "Open 24 hours a day, 7 days a week",
            ship_shape["normalized_fields"]["schedule"]["text"],
        )
        self.assertEqual("12:00am", ship_shape["normalized_fields"]["schedule"]["start_time"])
        self.assertEqual("11:59pm", ship_shape["normalized_fields"]["schedule"]["end_time"])
        self.assertEqual(
            "Continue pushing towards your wellness goals in our full-service fitness center.",
            ship_shape["normalized_fields"]["description"]["value"],
        )
        self.assertEqual(
            "Ship Shape Fitness Center",
            ship_shape["normalized_fields"]["location"]["value"],
        )
        self.assertEqual(
            ship_shape["normalized_fields"]["title"]["spans"],
            ship_shape["normalized_fields"]["location"]["spans"],
        )
        self.assertNotIn("location:missing_source_span", ship_shape["warnings"])

        mickey = by_slug["mickey-tie-dye"]["normalized_fields"]
        self.assertEqual(
            "Monday, Wednesday, Friday and Saturday from 3:00pm–4:00pm",
            mickey["schedule"]["text"],
        )
        self.assertEqual("3:00pm", mickey["schedule"]["start_time"])
        self.assertEqual("4:00pm", mickey["schedule"]["end_time"])
        self.assertNotIn("from 3:00pm", mickey["description"]["value"])

        campfire = by_slug["campfire"]["normalized_fields"]
        self.assertIn("warm glow of the campfire", campfire["description"]["value"])
        self.assertIn("S’mores kits available for purchase", campfire["description"]["value"])

        trivia = by_slug["ultimate-trivia-challenge"]["normalized_fields"]
        self.assertNotIn("1125", trivia["description"]["value"])

    def test_boardwalk_v2_splits_columns_and_does_not_merge_qr_helper_into_arcade_title(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=BOARDWALK_PDF,
            calendar_group_key="boardwalk",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertIn("side-show-games-arcade", by_slug)
        self.assertNotIn("activities-schedule-to-view-side-show-games-arcade", by_slug)
        arcade = by_slug["side-show-games-arcade"]["normalized_fields"]
        self.assertEqual("Side Show Games Arcade", arcade["title"]["value"])
        self.assertEqual("Daily from 8:00am-11:00pm", arcade["schedule"]["text"])
        self.assertEqual(
            "Play the latest and greatest family-friendly video games.",
            arcade["description"]["value"],
        )

    def test_boardwalk_v2_stops_descriptions_before_orphan_schedule_location_blocks(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=BOARDWALK_PDF,
            calendar_group_key="boardwalk",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        croquet = by_slug["boardwalk-croquet"]["normalized_fields"]
        self.assertEqual(
            "Enjoy a friendly game of croquet on our lush lawn.",
            croquet["description"]["value"],
        )
        self.assertNotIn("Ground yourself", croquet["description"]["value"])
        self.assertNotIn("Village Green Lawn Monday", croquet["description"]["value"])

        poolside = by_slug["poolside-activities"]
        self.assertIn("schedule:missing_source_span", poolside["warnings"])
        self.assertEqual(
            "Luna Park Pool Deck",
            poolside["normalized_fields"]["location"]["value"],
        )
        self.assertEqual(
            "Join us for family-friendly activities, both in and out of the pool. See a Recreation Cast Member for more information.",
            poolside["normalized_fields"]["description"]["value"],
        )

        challenge = by_slug["crescent-lake-wellness-challenge"]
        self.assertIn("schedule:missing_source_span", challenge["warnings"])
        self.assertIn("location:missing_source_span", challenge["warnings"])
        self.assertEqual("", challenge["normalized_fields"]["location"]["value"])
        self.assertTrue(
            challenge["normalized_fields"]["description"]["value"].startswith(
                "Enjoy beautiful views of Crescent Lake"
            )
        )
        self.assertNotIn("—}", challenge["normalized_fields"]["description"]["value"])

    def test_old_key_west_movie_schedule_keeps_split_near_location_heading(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=OLD_KEY_WEST_PDF,
            calendar_group_key="old-key-west",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertIn("movie-under-the-stars", by_slug)
        self.assertNotIn("near", by_slug)
        movie = by_slug["movie-under-the-stars"]
        normalized = movie["normalized_fields"]

        self.assertEqual([], movie["warnings"])
        self.assertEqual("Near The Volleyball Court", normalized["location"]["value"])
        self.assertEqual("Near The Volleyball Court | 8:30PM", normalized["schedule"]["text"])
        self.assertEqual("8:30pm", normalized["schedule"]["start_time"])
        self.assertEqual([80, 82], [span["line"] for span in normalized["schedule"]["spans"]])

    def test_old_key_west_low_quality_source_text_is_quarantined_not_published(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=OLD_KEY_WEST_PDF,
            calendar_group_key="unreviewed-old-key-west",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        bingo = by_slug["conch-crazy-bingo"]
        self.assertIn("description:text_quality_low", bingo["warnings"])
        self.assertIn("toaether", bingo["normalized_fields"]["description"]["value"])

        yoga = by_slug["disney-fit-yoga"]
        self.assertIn("description:text_quality_low", yoga["warnings"])
        self.assertIn("al levels", yoga["normalized_fields"]["description"]["value"])

        mosaics = by_slug["conch-flats-mosaics"]
        self.assertIn("description:text_quality_low", mosaics["warnings"])
        self.assertIn("Disney and up", mosaics["normalized_fields"]["description"]["value"])

        bike_rentals = by_slug["bike-rentals"]
        self.assertIn("schedule:missing_source_span", bike_rentals["warnings"])

    def test_riviera_qr_helper_text_and_cross_column_heading_bleed_do_not_publish(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=RIVIERA_PDF,
            calendar_group_key="riviera",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertNotIn("this-qr-code-and-select", by_slug)
        self.assertIn("starlight-soiree", by_slug)

        eventi = by_slug["the-eventi-room"]["normalized_fields"]
        self.assertEqual("The Eventi Room", eventi["location"]["value"])
        self.assertEqual("title_as_location", eventi["location"]["source"])
        self.assertEqual(
            "Sunday, Tuesday and Thursday from 1:00pm-10:00pm; Monday, Wednesday, Friday and Saturday from 10:00am-10:00pm",
            eventi["schedule"]["text"],
        )
        self.assertEqual(
            "Gather in The Eventi Room to create arts & crafts!",
            eventi["description"]["value"],
        )

        nature = by_slug["nature-walk"]["normalized_fields"]
        self.assertEqual("Daily", nature["schedule"]["text"])
        self.assertEqual("around Barefoot Bay", nature["location"]["value"])

        painting = by_slug["painting-on-the-riviera"]["normalized_fields"]
        self.assertNotIn("STARLIGHT SOIREE", painting["description"]["value"])
        self.assertIn(
            "description:text_quality_low",
            by_slug["painting-on-the-riviera"]["warnings"],
        )

        mosaic = by_slug["art-de-la-mosaique"]["normalized_fields"]
        self.assertNotIn("marshmallows", mosaic["description"]["value"])

        campfire = by_slug["cote-dazur-campfire"]["normalized_fields"]
        self.assertIn("marshmallows", campfire["description"]["value"])

    def test_malformed_ocr_time_text_is_quarantined_instead_of_silently_published(self) -> None:
        cases = [
            (
                "unreviewed-pop-century",
                POP_CENTURY_PDF,
                "poolside-activities",
                "Daily from 1:;00pm-2:30pm",
            ),
        ]

        for group_key, pdf_path, slug, expected_schedule in cases:
            with self.subTest(group=group_key, slug=slug):
                candidates = extract_candidates_for_pdf(
                    pdf_path=pdf_path,
                    calendar_group_key=group_key,
                )
                by_slug = {
                    candidate["normalized_fields"]["slug"]: candidate
                    for candidate in candidates
                }
                candidate = by_slug[slug]

                self.assertEqual(expected_schedule, candidate["normalized_fields"]["schedule"]["text"])
                self.assertIn("schedule:text_quality_low", candidate["warnings"])

    def test_pop_century_stacked_title_and_unread_title_block_do_not_merge(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=POP_CENTURY_PDF,
            calendar_group_key="pop-century",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertIn("marble-painting-on-vinyl-records", by_slug)
        self.assertNotIn("marble-painting", by_slug)
        self.assertNotIn("on-vinyl-records", by_slug)
        self.assertNotIn("paint-your-own-bowling-pin", by_slug)

        marble = by_slug["marble-painting-on-vinyl-records"]["normalized_fields"]
        self.assertEqual("Marble Painting On Vinyl Records", marble["title"]["value"])
        self.assertEqual("arts_crafts", marble["category"])
        self.assertEqual([28, 29], [span["line"] for span in marble["title"]["spans"]])
        self.assertEqual("Monday and Friday from 3:00pm-4:00pm", marble["schedule"]["text"])
        self.assertEqual("‘90s Sign near Classic Hall", marble["location"]["value"])
        self.assertEqual(
            "Create your own groovy paint designs on a vinyl record— complete with the Disney’s Pop Century Resort logo!",
            marble["description"]["value"],
        )
        self.assertNotIn("Wednesday from 3:00pm-4:00pm", marble["description"]["value"])
        self.assertNotIn("bowling pin", marble["description"]["value"])
        self.assertTrue(marble["is_fee_based"])

    def test_pop_century_movie_table_fragments_do_not_become_activities(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=POP_CENTURY_PDF,
            calendar_group_key="pop-century",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertIn("movie-under-the-stars", by_slug)
        self.assertNotIn("encano", by_slug)
        movie = by_slug["movie-under-the-stars"]["normalized_fields"]
        self.assertEqual("Hippy Dippy Pool Deck | 8:30PM", movie["schedule"]["text"])
        self.assertEqual("Hippy Dippy Pool Deck", movie["location"]["value"])

    def test_split_movie_location_lines_are_combined_into_movie_schedule_not_fake_activity(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=PORT_ORLEANS_RIVERSIDE_PDF,
            calendar_group_key="port-orleans-riverside",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertIn("movie-under-the-stars", by_slug)
        self.assertNotIn("oak-manor-lawn", by_slug)
        movie = by_slug["movie-under-the-stars"]
        normalized = movie["normalized_fields"]

        self.assertEqual([], movie["warnings"])
        self.assertEqual("Oak Manor Lawn Near Building 90 | 8:30PM", normalized["schedule"]["text"])
        self.assertEqual("Oak Manor Lawn Near Building 90", normalized["location"]["value"])
        self.assertEqual("8:30pm", normalized["schedule"]["start_time"])
        self.assertEqual([69, 71], [span["line"] for span in normalized["schedule"]["spans"]])

    def test_port_orleans_riverside_repairs_locations_and_quarantines_partial_ocr_blocks(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=PORT_ORLEANS_RIVERSIDE_PDF,
            calendar_group_key="port-orleans-riverside",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertEqual("Ol’ Man Island", by_slug["fishin-hole"]["normalized_fields"]["location"]["value"])
        self.assertEqual("Ol’ Man Island Pool Deck", by_slug["poolside-activities"]["normalized_fields"]["location"]["value"])
        self.assertEqual("Ol’ Man Island Pool Deck", by_slug["arts-crafts"]["normalized_fields"]["location"]["value"])
        self.assertEqual("Ol’ Man Island", by_slug["campfire-on-de-bayou"]["normalized_fields"]["location"]["value"])

        self.assertIn("medicine-show-arcade", by_slug)
        self.assertNotIn("medicine-show", by_slug)
        self.assertNotIn("arcade", by_slug)
        arcade = by_slug["medicine-show-arcade"]
        self.assertEqual("Medicine Show Arcade", arcade["normalized_fields"]["title"]["value"])
        self.assertEqual([22, 24], [span["line"] for span in arcade["normalized_fields"]["title"]["spans"]])
        self.assertIn("schedule:missing_source_span", arcade["warnings"])
        self.assertIn("description:text_quality_low", arcade["warnings"])

        arts = by_slug["arts-crafts"]
        self.assertIn("description:text_quality_low", arts["warnings"])
        self.assertEqual("Wednesday and", arts["normalized_fields"]["description"]["value"])

    def test_wilderness_lodge_ocr_fallback_recovers_incomplete_schedule_phrases(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=WILDERNESS_LODGE_PDF,
            calendar_group_key="wilderness-lodge",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        tour = by_slug["wonders-of-the-lodge-art-architecture-tour"]
        self.assertNotIn("schedule:incomplete_time_phrase", tour["warnings"])
        self.assertEqual("Daily at 9:00am", tour["normalized_fields"]["schedule"]["text"])

        self.assertIn("tasteful-artistry-at-disneys-wilderness-lodge", by_slug)
        self.assertNotIn("tasteful-artistry-at", by_slug)
        self.assertNotIn("disneys-wilderness-lodge", by_slug)

        friend = by_slug["find-a-friend"]
        self.assertNotIn("location:text_quality_low", friend["warnings"])
        self.assertEqual(
            "Throughout the Main Building",
            friend["normalized_fields"]["location"]["value"],
        )

        storytime = by_slug["storytime-yoga"]
        self.assertNotIn("description:text_quality_low", storytime["warnings"])

        tie_dye = by_slug["mickey-tie-dye"]
        self.assertNotIn("description:text_quality_low", tie_dye["warnings"])

        self.assertIn("campfire", by_slug)

        self.assertNotIn("dig", by_slug)
        movie = by_slug["movie-under-the-stars"]["normalized_fields"]
        self.assertEqual(
            "Lawn Outside Reunion Station | 8:30PM",
            movie["schedule"]["text"],
        )

    def test_v2_extraction_quarantines_missing_movie_schedule_instead_of_crashing(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=PORT_ORLEANS_FRENCH_QUARTER_PDF,
            calendar_group_key="port-orleans-french-quarter",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertIn("movie-under-the-stars", by_slug)
        self.assertIn(
            "schedule:missing_source_span",
            by_slug["movie-under-the-stars"]["warnings"],
        )

    def test_animal_kingdom_combined_daily_location_lines_keep_both_fields_sourced(self) -> None:
        cases = [
            (
                "animal-kingdom-jambo",
                ANIMAL_KINGDOM_JAMBO_PDF,
                "find-a-friend",
                "throughout Jambo House",
            ),
            (
                "animal-kingdom-jambo",
                ANIMAL_KINGDOM_JAMBO_PDF,
                "poolside-activities",
                "Uzima Springs Pool",
            ),
            (
                "animal-kingdom-kidani",
                ANIMAL_KINGDOM_KIDANI_PDF,
                "find-a-friend",
                "throughout Kidani Village",
            ),
            (
                "animal-kingdom-kidani",
                ANIMAL_KINGDOM_KIDANI_PDF,
                "poolside-activities",
                "Samawati Springs Pool",
            ),
        ]

        for group_key, pdf_path, slug, location in cases:
            with self.subTest(group=group_key, slug=slug):
                candidates = extract_candidates_for_pdf(
                    pdf_path=pdf_path,
                    calendar_group_key=group_key,
                )
                candidate = next(
                    row for row in candidates if row["normalized_fields"]["slug"] == slug
                )
                normalized = candidate["normalized_fields"]

                self.assertEqual("Daily", normalized["schedule"]["text"])
                self.assertEqual(location, normalized["location"]["value"])
                self.assertEqual(
                    normalized["schedule"]["spans"],
                    normalized["location"]["spans"],
                )
                self.assertNotIn("location:missing_source_span", candidate["warnings"])

    def test_stacked_title_lines_become_one_activity_not_duplicate_orphans(self) -> None:
        kidani_candidates = extract_candidates_for_pdf(
            pdf_path=ANIMAL_KINGDOM_KIDANI_PDF,
            calendar_group_key="animal-kingdom-kidani",
        )
        kidani_by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in kidani_candidates
        }

        self.assertIn("survival-of-the-fittest-fitness-center", kidani_by_slug)
        self.assertNotIn("survival-of-the-fittest", kidani_by_slug)
        self.assertNotIn("fitness-center", kidani_by_slug)
        fitness = kidani_by_slug["survival-of-the-fittest-fitness-center"]
        self.assertEqual([], fitness["warnings"])
        self.assertEqual(
            [28, 30],
            [span["line"] for span in fitness["normalized_fields"]["title"]["spans"]],
        )
        self.assertEqual(
            "Open 24 hours a day, 7 days a week",
            fitness["normalized_fields"]["schedule"]["text"],
        )

        grand_candidates = extract_candidates_for_pdf(
            pdf_path=GRAND_FLORIDIAN_PDF,
            calendar_group_key="grand-floridian",
        )
        grand_slugs = {
            candidate["normalized_fields"]["slug"]
            for candidate in grand_candidates
        }

        self.assertIn("captains-shipyard-boat-rentals", grand_slugs)
        self.assertNotIn("captains-shipyard", grand_slugs)
        self.assertNotIn("boat-rentals", grand_slugs)
        self.assertIn("paint-your-own-animation-cel", grand_slugs)
        self.assertNotIn("paint-your-own", grand_slugs)
        self.assertNotIn("animation-cel", grand_slugs)

    def test_grand_floridian_service_titles_can_supply_location_when_pdf_has_no_location_line(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=GRAND_FLORIDIAN_PDF,
            calendar_group_key="grand-floridian",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        for slug, title in [
            ("arcadia-games", "Arcadia Games"),
            ("cabana-rentals", "Cabana Rentals"),
            ("captains-shipyard-boat-rentals", "Captain’s Shipyard Boat Rentals"),
        ]:
            with self.subTest(slug=slug):
                candidate = by_slug[slug]
                normalized = candidate["normalized_fields"]

                self.assertEqual(title, normalized["location"]["value"])
                self.assertEqual("title_as_location", normalized["location"]["source"])
                self.assertEqual(
                    normalized["title"]["spans"],
                    normalized["location"]["spans"],
                )
                self.assertNotIn("location:missing_source_span", candidate["warnings"])

    def test_art_of_animation_stacked_titles_and_inline_location_schedule_are_source_backed(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=ART_OF_ANIMATION_PDF,
            calendar_group_key="art-of-animation",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertIn("disney-character-experience", by_slug)
        self.assertNotIn("experience", by_slug)
        character = by_slug["disney-character-experience"]["normalized_fields"]
        self.assertEqual(
            "Disney Character Experience",
            character["title"]["value"],
        )
        self.assertEqual([13, 15], [span["line"] for span in character["title"]["spans"]])
        self.assertEqual("Inside and Outside the Lobby Area", character["location"]["value"])
        self.assertEqual(
            "Daily from 8:50am–9:20am and 3:35pm–3:55pm",
            character["schedule"]["text"],
        )

        self.assertIn("disney-fan-family-fun", by_slug)
        family_fun = by_slug["disney-fan-family-fun"]["normalized_fields"]
        self.assertEqual("Inside Animation Hall", family_fun["location"]["value"])
        self.assertEqual(
            "Sunday, Thursday and Saturday at 3:25pm and 5:05pm; Tuesday and Friday at 1:35pm and 6:55pm",
            family_fun["schedule"]["text"],
        )
        self.assertIn("FUNatical Disney Fan Family", family_fun["description"]["value"])

        poolside = by_slug["poolside-activities"]["normalized_fields"]
        self.assertEqual("The Big Blue Pool Deck", poolside["location"]["value"])
        self.assertEqual("Daily from 1:00pm–2:30pm", poolside["schedule"]["text"])
        self.assertEqual(
            poolside["schedule"]["spans"],
            poolside["location"]["spans"],
        )

    def test_art_of_animation_movie_location_heading_belongs_to_movie_record(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=ART_OF_ANIMATION_PDF,
            calendar_group_key="art-of-animation",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertIn("movie-under-the-stars", by_slug)
        self.assertNotIn("movie-lawn-near", by_slug)
        movie = by_slug["movie-under-the-stars"]
        normalized = movie["normalized_fields"]

        self.assertEqual([], movie["warnings"])
        self.assertEqual("Movie Lawn Near The Big Blue Pool | 8:30PM", normalized["schedule"]["text"])
        self.assertEqual("Movie Lawn Near The Big Blue Pool", normalized["location"]["value"])
        self.assertEqual("8:30pm", normalized["schedule"]["start_time"])
        self.assertEqual(6, len(normalized["movie_nights"]))
        self.assertEqual(
            ["Lilo & Stitch (2002)", "Toy Story", "Finding Nemo", "Moana 2", "Teen Beach Movie", "Cars"],
            [night["movie_title"] for night in normalized["movie_nights"]],
        )

    def test_port_orleans_french_quarter_v2_requires_reviewed_source_repairs(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=PORT_ORLEANS_FRENCH_QUARTER_PDF,
            calendar_group_key="port-orleans-french-quarter",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertEqual(
            {
                "find-a-friend",
                "south-quarter-games-arcade",
                "poolside-activities",
                "painting-on-de-bayou",
                "arts-crafts",
                "mickey-tie-dye",
                "mosaic-class",
                "cajun-campfire",
                "movie-under-the-stars",
                "nighttime-trivia-challenge",
                "glow-with-the-flow",
            },
            set(by_slug),
        )

        find_a_friend = by_slug["find-a-friend"]["normalized_fields"]
        self.assertEqual(
            "Throughout Disney’s Port Orleans Resort - French Quarter",
            find_a_friend["location"]["value"],
        )
        self.assertEqual([24, 26], [span["line"] for span in find_a_friend["location"]["spans"]])

        painting = by_slug["painting-on-de-bayou"]["normalized_fields"]
        self.assertEqual("Scat Cat’s Club - Lounge", painting["location"]["value"])
        self.assertNotIn("location:missing_source_span", by_slug["painting-on-de-bayou"]["warnings"])

        mosaic = by_slug["mosaic-class"]["normalized_fields"]
        self.assertEqual("Scat Cat’s Club - Lounge", mosaic["location"]["value"])
        self.assertNotIn("location:missing_source_span", by_slug["mosaic-class"]["warnings"])

        campfire = by_slug["cajun-campfire"]["normalized_fields"]
        self.assertEqual("Campfire Pit Between Buildings 5 and 6", campfire["location"]["value"])
        self.assertEqual("reviewed_field_repair", campfire["location"]["source"])

        trivia = by_slug["nighttime-trivia-challenge"]["normalized_fields"]
        self.assertEqual("Doubloon Lagoon Pool Deck", trivia["location"]["value"])
        self.assertEqual("reviewed_field_repair", trivia["location"]["source"])

        self.assertIn("description:text_quality_low", by_slug["arts-crafts"]["warnings"])
        self.assertIn("schedule:missing_source_span", by_slug["movie-under-the-stars"]["warnings"])

    def test_art_of_animation_signature_craft_stacked_title_does_not_bleed_into_mosaic_description(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=ART_OF_ANIMATION_PDF,
            calendar_group_key="art-of-animation",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        mosaic = by_slug["mosaic-craft"]["normalized_fields"]
        self.assertEqual("Create your own mosaic masterpiece!", mosaic["description"]["value"])

        self.assertIn("fish-are-friends-aquariums-art-of-animation-signature-craft", by_slug)
        self.assertNotIn("signature-craft", by_slug)
        signature = by_slug["fish-are-friends-aquariums-art-of-animation-signature-craft"]["normalized_fields"]
        self.assertEqual(
            "Fish Are Friends Aquariums: Art of Animation Signature Craft",
            signature["title"]["value"],
        )
        self.assertEqual([62, 64, 66], [span["line"] for span in signature["title"]["spans"]])
        self.assertEqual("Inside Animation Hall", signature["location"]["value"])
        self.assertEqual(
            "Sunday, Tuesday and Thursday from 3:00pm–4:00pm",
            signature["schedule"]["text"],
        )
        self.assertEqual("Create an original craft!", signature["description"]["value"])

    def test_gold_promotion_promotes_all_star_movies_reviewed_full_calendar(self) -> None:
        promotion = promote_fixtures(ALL_STAR_MOVIES_FULL_FIXTURE.parent)
        movies_rows = [
            row
            for row in promotion.gold_records
            if row["calendar_group_key"] == "all-star-movies"
        ]

        self.assertEqual(11, len(movies_rows))
        self.assertFalse(
            any(row["canonical_slug"] == "resort-scavenger-hunt" for row in movies_rows)
        )
        self.assertTrue(
            any(row["canonical_slug"] == "reel-fun-arcade" for row in movies_rows)
        )

    def test_gold_promotion_accepts_source_spanned_candidate(self) -> None:
        candidate = extract_candidates_for_fixture(WELLNESS_FIXTURES[0])[0]

        promotion = promote_candidates([candidate])

        self.assertEqual([], promotion.review_queue)
        self.assertEqual(1, len(promotion.gold_records))
        gold = promotion.gold_records[0]
        self.assertEqual("wellness-scavenger-hunt", gold["canonical_slug"])
        self.assertEqual("Wellness Scavenger Hunt", gold["title"])
        self.assertEqual("11:00pm", gold["schedule"]["end_time"])
        self.assertRegex(gold["activity_catalog_id"], r"^[0-9a-f-]{36}$")
        self.assertNotEqual(candidate["candidate_id"], gold["activity_catalog_id"])
        self.assertIn("title", gold["field_provenance"])
        self.assertIn("schedule", gold["field_provenance"])
        self.assertIn("location", gold["field_provenance"])
        self.assertEqual(candidate["content_sha256"], gold["source"]["documentHash"])
        self.assertEqual("unknown", gold["price"]["state"])
        fee_claim = next(claim for claim in gold["claims"] if claim["kind"] == "fee")
        self.assertEqual("unknown", fee_claim["value"])
        self.assertEqual([], fee_claim["evidence"])

    def test_gold_preview_uses_stable_catalog_ids_not_source_candidate_ids(self) -> None:
        rows = json.loads(GOLD_PREVIEW_PATH.read_text())

        self.assertTrue(rows)
        for row in rows:
            with self.subTest(slug=row.get("canonical_slug")):
                self.assertRegex(row["activity_catalog_id"], r"^[0-9a-f-]{36}$")
                self.assertNotEqual(row["candidate_id"], row["activity_catalog_id"])

    def test_activity_pipeline_v2_migration_preserves_gold_security_contract(self) -> None:
        migration = ACTIVITY_PIPELINE_V2_MIGRATION.read_text()
        mrg_migration = MRG_FACTS_MIGRATION.read_text()
        combined = f"{migration}\n{mrg_migration}"

        self.assertIn("create table public.public_activity_gold", migration)
        self.assertIn("activity_catalog_id uuid not null references public.activity_catalog(id)", migration)
        self.assertIn("source_document_id uuid not null references public.source_documents(id)", migration)
        self.assertIn("field_provenance ? 'title'", migration)
        self.assertIn("field_provenance ? 'schedule'", migration)
        self.assertIn("field_provenance ? 'location'", migration)
        self.assertIn("alter table public.public_activity_gold enable row level security", migration)
        self.assertIn("with (security_invoker = true)", combined)
        self.assertIn("grant select on public.v_public_activity_gold to anon, authenticated", combined)
        self.assertIn("revoke all on public.activity_review_queue from anon, authenticated", migration)
        self.assertIn("revoke all on public.activity_extraction_candidates from anon, authenticated", migration)
        self.assertIn("create policy \"Public can read current Gold activities\"", migration)
        self.assertIn("trust_state != 'needs_review'", combined)
        self.assertIn("create or replace function public.check_activity_pipeline_v2_health()", migration)

    def test_official_recreation_resort_aliases_skip_unsupported_locations(self) -> None:
        slugs, unresolved = resolve_official_resort_slugs(
            "Available at Disney's BoardWalk Inn, Disney's BoardWalk Villas, Walt Disney World Dolphin Hotel and Disney's Saratoga Springs Resort & Spa."
        )

        self.assertEqual(
            [
                "boardwalk-inn",
                "boardwalk-villas",
                "saratoga-springs-resort-and-spa",
            ],
            slugs,
        )
        self.assertEqual(["walt-disney-world-dolphin-hotel"], unresolved)

    def test_official_recreation_offerings_extract_multi_resort_bike_rentals(self) -> None:
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_detail",
                "slug": "bike-rentals",
                "source_url": "https://disneyworld.disney.go.com/recreation/bike-rentals/",
                "source_web_sha256": "b" * 64,
                "tags": ["Recreation", "Rentals"],
                "lines": [
                    {"line": 191, "text": "# Bike Rentals"},
                    {
                        "line": 193,
                        "text": "Explore the great outdoors from the comfort of a bicycle.",
                    },
                    {"line": 201, "text": "Five Rental Locations Available"},
                    {"line": 202, "text": "Disney's Old Key West Resort"},
                    {"line": 203, "text": "Disney's Port Orleans Resort - Riverside"},
                    {"line": 204, "text": "Disney's Saratoga Springs Resort & Spa"},
                    {"line": 205, "text": "The Cabins at Disney's Fort Wilderness Resort"},
                    {"line": 206, "text": "The Campsites at Disney's Fort Wilderness Resort"},
                    {
                        "line": 211,
                        "text": "Adult bikes, child bikes and bikes with child seats are available.",
                    },
                    {
                        "line": 214,
                        "text": "Helmets and child seats are complimentary with all bike rentals.",
                    },
                ],
            }
        )

        self.assertEqual([], result["quarantine"])
        self.assertEqual(["bike-rentals"], [program["program_key"] for program in result["programs"]])
        self.assertEqual(
            {
                "old-key-west-resort",
                "port-orleans-resort-riverside",
                "saratoga-springs-resort-and-spa",
                "cabins-at-fort-wilderness-resort",
                "campsites-at-fort-wilderness-resort",
            },
            {offering["resort_slug"] for offering in result["offerings"]},
        )
        for offering in result["offerings"]:
            with self.subTest(resort=offering["resort_slug"]):
                self.assertEqual("bike-rentals", offering["program_key"])
                self.assertEqual("source_backed", offering["trust_state"])
                self.assertEqual("evergreen_all_day", offering["availability"]["kind"])
                self.assertEqual("varies", offering["availability"]["hours_state"])
                self.assertEqual("unknown", offering["claims"]["walkability"]["value"])
                self.assertEqual("unknown", offering["claims"]["transportation"]["value"])
                self.assertTrue(offering["field_provenance"]["resort_join"])
                self.assertTrue(offering["field_provenance"]["title"])

    def test_official_recreation_offerings_keep_cabana_resort_variants(self) -> None:
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_detail",
                "slug": "cabanas",
                "source_url": "https://disneyworld.disney.go.com/recreation/cabanas/",
                "source_web_sha256": "c" * 64,
                "tags": ["Pool", "Reservations"],
                "lines": [
                    {"line": 206, "text": "# Cabanas"},
                    {
                        "line": 210,
                        "text": "Relax in a private cabana at select Walt Disney World Resort hotels.",
                    },
                    {"line": 216, "text": "Disney's Contemporary Resort"},
                    {"line": 217, "text": "Disney's Grand Floridian Resort & Spa"},
                    {
                        "line": 218,
                        "text": "Disney's Beach Club Resort and Disney's Yacht Club Resort",
                    },
                    {
                        "line": 226,
                        "text": "Cabana rentals are available only to Guests staying at the Resort hotel where the cabana is located.",
                    },
                    {
                        "line": 231,
                        "text": "Advance reservations are highly recommended.",
                    },
                    {
                        "line": 236,
                        "text": "To cancel, provide at least 24 hours notice to avoid the full price being charged.",
                    },
                    {
                        "line": 246,
                        "text": "Amenities at Disney's Contemporary Resort include padded furniture, towels, a Bluetooth speaker, television and a mini-refrigerator.",
                    },
                    {
                        "line": 252,
                        "text": "Amenities at Disney's Grand Floridian Resort & Spa include padded furniture, towels, a ceiling fan, television and a mini-refrigerator.",
                    },
                    {
                        "line": 260,
                        "text": "Amenities at Disney's Beach Club Resort and Disney's Yacht Club Resort include padded furniture, towels, a television and a mini-refrigerator.",
                    },
                ],
            }
        )

        self.assertEqual([], result["quarantine"])
        by_resort = {offering["resort_slug"]: offering for offering in result["offerings"]}
        self.assertEqual(
            {
                "contemporary-resort",
                "grand-floridian-resort-and-spa",
                "beach-club-resort",
                "yacht-club-resort",
            },
            set(by_resort),
        )
        self.assertEqual("contemporary-resort", by_resort["contemporary-resort"]["variant_key"])
        self.assertEqual("grand-floridian-resort-and-spa", by_resort["grand-floridian-resort-and-spa"]["variant_key"])
        self.assertEqual("shared-beach-yacht-club", by_resort["beach-club-resort"]["variant_key"])
        self.assertEqual("shared-beach-yacht-club", by_resort["yacht-club-resort"]["variant_key"])
        for offering in by_resort.values():
            with self.subTest(resort=offering["resort_slug"]):
                self.assertEqual("reservation_based", offering["availability"]["kind"])
                self.assertTrue(offering["eligibility"]["resort_guest_only"])
                self.assertTrue(offering["booking"]["reservation_recommended"])
                self.assertEqual(24, offering["booking"]["cancellation_notice_hours"])
                self.assertIn("mini-refrigerator", offering["amenities"])
                self.assertTrue(offering["field_provenance"]["booking"])

    def test_official_recreation_offerings_join_resort_filtered_page_cards(self) -> None:
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_resort_page",
                "resort_slug": "contemporary-resort",
                "source_url": "https://disneyworld.disney.go.com/resorts/contemporary-resort/recreation/",
                "source_web_sha256": "d" * 64,
                "lines": [
                    {"line": 242, "text": "11 Ways to Play"},
                    {"line": 252, "text": "Community Halls"},
                    {
                        "line": 253,
                        "text": "Enjoy games, crafts and family-friendly activities in a relaxed community space.",
                    },
                ],
            }
        )

        self.assertEqual([], result["quarantine"])
        self.assertEqual(["community-halls"], [program["program_key"] for program in result["programs"]])
        self.assertEqual(["contemporary-resort"], [offering["resort_slug"] for offering in result["offerings"]])
        offering = result["offerings"][0]
        self.assertEqual("evergreen_all_day", offering["availability"]["kind"])
        self.assertEqual("varies", offering["availability"]["hours_state"])
        self.assertEqual("resort_page_context", offering["field_provenance"]["resort_join"][0]["source"])

    def test_official_recreation_offerings_quarantine_unresolved_multiple_locations(self) -> None:
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_detail",
                "slug": "mystery-recreation",
                "source_url": "https://disneyworld.disney.go.com/recreation/mystery-recreation/",
                "source_web_sha256": "e" * 64,
                "lines": [
                    {"line": 1, "text": "# Mystery Recreation"},
                    {"line": 2, "text": "Multiple Locations"},
                    {
                        "line": 3,
                        "text": "Available at select Disney Resort hotels. Check back later for details.",
                    },
                ],
            }
        )

        self.assertEqual([], result["offerings"])
        self.assertEqual(["mystery-recreation"], [program["program_key"] for program in result["programs"]])
        self.assertEqual(1, len(result["quarantine"]))
        self.assertEqual("unresolved_resort_join", result["quarantine"][0]["reason_code"])
        self.assertTrue(result["quarantine"][0]["source_spans"])

    def test_official_recreation_offerings_migration_preserves_security_contract(self) -> None:
        migration = _official_offerings_migration_text()

        self.assertIn("create table public.official_activity_programs", migration)
        self.assertIn("create table public.official_activity_offerings", migration)
        self.assertIn("create table public.official_activity_ingest_quarantine", migration)
        self.assertIn("resort_slug text not null references public.resorts(slug)", migration)
        self.assertIn("source_document_id uuid not null references public.source_documents(id)", migration)
        self.assertIn("field_provenance ? 'title'", migration)
        self.assertIn("field_provenance ? 'resort_join'", migration)
        self.assertIn("alter table public.official_activity_programs enable row level security", migration)
        self.assertIn("alter table public.official_activity_offerings enable row level security", migration)
        self.assertIn("with (security_invoker = true)", migration)
        self.assertIn("grant select on public.v_public_activity_offerings to anon, authenticated", migration)
        self.assertIn("grant all on public.official_activity_offerings to service_role", migration)
        self.assertIn("create policy \"Public can read current official activity offerings\"", migration)
        self.assertIn("trust_state != 'needs_review'", migration)
        self.assertIn("create or replace function public.check_official_activity_offerings_health()", migration)

    def test_official_recreation_offering_publisher_upserts_source_program_offerings_and_quarantine(self) -> None:
        extraction = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_detail",
                "slug": "bike-rentals",
                "source_url": "https://disneyworld.disney.go.com/recreation/bike-rentals/",
                "source_web_sha256": "f" * 64,
                "lines": [
                    {"line": 1, "text": "# Bike Rentals"},
                    {"line": 2, "text": "Explore the great outdoors from the comfort of a bicycle."},
                    {"line": 3, "text": "Disney's Old Key West Resort"},
                    {"line": 4, "text": "Disney's Saratoga Springs Resort & Spa"},
                ],
            }
        )
        extraction["quarantine"].append(
            {
                "program_key": "mystery",
                "source_url": "https://example.test/mystery/",
                "source_sha256": "0" * 64,
                "reason_code": "unresolved_resort_join",
                "detail": "No supported resort names found.",
                "source_spans": [{"page": 1, "line": 9, "text": "Multiple Locations"}],
            }
        )
        db = FakeGoldV2Db()

        result = publish_official_offering_rows(db, extraction)

        self.assertEqual(
            {
                "source_documents": 2,
                "programs": 1,
                "offerings": 2,
                "quarantine": 1,
                "retired_offerings": 0,
            },
            result,
        )
        self.assertEqual(2, len(db.upserted_by_table["source_documents"]))
        self.assertEqual(1, len(db.upserted_by_table["official_activity_programs"]))
        self.assertEqual(2, len(db.upserted_by_table["official_activity_offerings"]))
        self.assertEqual(1, len(db.upserted_by_table["official_activity_ingest_quarantine"]))
        for row in db.upserted_by_table["official_activity_offerings"]:
            with self.subTest(resort=row["resort_slug"]):
                self.assertRegex(row["id"], r"^[0-9a-f-]{36}$")
                self.assertRegex(row["program_id"], r"^[0-9a-f-]{36}$")
                self.assertTrue(row["source_document_id"].startswith("source-"))
                self.assertTrue(row["is_current"])
                self.assertTrue(row["field_provenance"]["title"])
                self.assertTrue(row["field_provenance"]["resort_join"])
        self.assertIn(
            ("rpc:check_official_activity_offerings_health", {}, ""),
            db.upserts,
        )

    def test_gold_v2_publisher_upserts_source_catalog_and_public_rows(self) -> None:
        rows = json.loads(GOLD_PREVIEW_PATH.read_text())
        sample_rows = [
            next(row for row in rows if row["calendar_group_key"] == "all-star-movies"),
            next(row for row in rows if row["canonical_slug"] == "canoe-rentals"),
        ]
        db = FakeGoldV2Db()

        result = publish_gold_rows(db, sample_rows)

        self.assertEqual(
            {
                "gold_rows": 2,
                "source_documents": 2,
                "activity_catalog": 2,
                "retired_gold_rows": 0,
            },
            result,
        )
        source_rows = db.upserted_by_table["source_documents"]
        self.assertEqual({"pdf", "html"}, {row["source_type"] for row in source_rows})
        self.assertTrue(all(row["content_sha256"] for row in source_rows))
        catalog_rows = db.upserted_by_table["activity_catalog"]
        self.assertEqual(
            {row["activity_catalog_id"] for row in sample_rows},
            {row["id"] for row in catalog_rows},
        )
        public_rows = db.upserted_by_table["public_activity_gold"]
        self.assertEqual(2, len(public_rows))
        for row in public_rows:
            with self.subTest(slug=row["canonical_slug"]):
                self.assertRegex(row["id"], r"^[0-9a-f-]{36}$")
                self.assertRegex(row["activity_catalog_id"], r"^[0-9a-f-]{36}$")
                self.assertNotEqual(row["promoted_from_candidate_id"], row["activity_catalog_id"])
                self.assertTrue(row["source_document_id"].startswith("source-"))
                self.assertTrue(row["field_provenance"]["title"])
                self.assertTrue(row["field_provenance"]["schedule"])
                self.assertTrue(row["field_provenance"]["location"])
                self.assertTrue(row["is_current"])
        self.assertIn(
            ("rpc:check_activity_pipeline_v2_health", {}, ""),
            db.upserts,
        )

    def test_gold_v2_publisher_fails_when_database_health_check_reports_issues(self) -> None:
        row = json.loads(GOLD_PREVIEW_PATH.read_text())[0]
        db = FakeGoldV2Db()
        db.health = [{"check_name": "pending_blocker_review", "detail": "bad-row"}]

        with self.assertRaisesRegex(RuntimeError, "activity_pipeline_v2_health_failed"):
            publish_gold_rows(db, [row])

    def test_gold_v2_publisher_retires_current_rows_missing_from_snapshot(self) -> None:
        row = json.loads(GOLD_PREVIEW_PATH.read_text())[0]
        expected_id = _stable_uuid(
            f"gold:{row['calendar_group_key']}:{row['canonical_slug']}"
        )
        db = FakeGoldV2Db()
        db.select_rows["public_activity_gold"] = [
            {
                "id": "stale-gold-row",
                "calendar_group_key": row["calendar_group_key"],
                "canonical_slug": "stale-activity",
                "is_current": True,
            },
            {
                "id": "same-key-old-id",
                "calendar_group_key": row["calendar_group_key"],
                "canonical_slug": row["canonical_slug"],
                "is_current": True,
            },
            {
                "id": expected_id,
                "calendar_group_key": row["calendar_group_key"],
                "canonical_slug": row["canonical_slug"],
                "is_current": True,
            },
        ]

        result = publish_gold_rows(db, [row])

        self.assertEqual(2, result["retired_gold_rows"])
        self.assertIn(
            (
                "public_activity_gold",
                {"id": "eq.stale-gold-row"},
                {"is_current": False},
            ),
            db.updates,
        )
        self.assertIn(
            (
                "public_activity_gold",
                {"id": "eq.same-key-old-id"},
                {"is_current": False},
            ),
            db.updates,
        )
        self.assertNotIn(
            (
                "public_activity_gold",
                {"id": f"eq.{expected_id}"},
                {"is_current": False},
            ),
            db.updates,
        )

    def test_gold_promotion_fee_claim_uses_title_marker_and_footer_legend(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=ALL_STAR_MOVIES_PDF,
            calendar_group_key="all-star-movies",
        )
        arts_and_crafts = next(
            candidate
            for candidate in candidates
            if candidate["normalized_fields"]["slug"] == "arts-crafts"
        )

        promotion = promote_candidates([arts_and_crafts])

        self.assertEqual([], promotion.review_queue)
        self.assertEqual(1, len(promotion.gold_records))
        gold = promotion.gold_records[0]
        self.assertEqual("fee", gold["price"]["state"])
        fee_claim = next(claim for claim in gold["claims"] if claim["kind"] == "fee")
        self.assertEqual("fee", fee_claim["value"])
        evidence_texts = [evidence.get("text", "") for evidence in fee_claim["evidence"]]
        self.assertTrue(any("ARTS & CRAFTS ($)" in text for text in evidence_texts))
        self.assertTrue(any("fee associated" in text for text in evidence_texts))
        self.assertEqual(
            "fee",
            gold["source"]["documentKeyLegends"][0]["kind"],
        )
        self.assertTrue(
            any(
                "fee associated" in span["text"]
                for span in gold["source"]["documentKeyLegends"][0]["spans"]
            )
        )

    def test_extractor_preserves_footer_key_legend_as_document_evidence(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=ALL_STAR_MOVIES_PDF,
            calendar_group_key="all-star-movies",
        )
        arts_and_crafts = next(
            candidate
            for candidate in candidates
            if candidate["normalized_fields"]["slug"] == "arts-crafts"
        )
        normalized = arts_and_crafts["normalized_fields"]

        key_legends = normalized["document_key_legends"]
        self.assertEqual(1, len(key_legends))
        self.assertEqual("fee", key_legends[0]["kind"])
        self.assertEqual("($)", key_legends[0]["marker"])
        self.assertEqual(
            [{"page": 1, "line": 68}],
            [
                {"page": span["page"], "line": span["line"]}
                for span in key_legends[0]["spans"]
            ],
        )
        self.assertTrue(
            any(
                "fee associated" in span["text"]
                for span in key_legends[0]["spans"]
            )
        )
        self.assertNotIn(
            "fee associated",
            normalized["description"]["value"].lower(),
        )
        self.assertTrue(
            any(
                "fee associated" in evidence.get("text", "")
                for evidence in normalized["fee_evidence"]
            )
        )

    def test_gold_promotion_quarantines_candidate_missing_description_span(self) -> None:
        candidate = extract_candidates_for_fixture(WELLNESS_FIXTURES[0])[0]
        candidate = json.loads(json.dumps(candidate))
        candidate["normalized_fields"]["description"]["spans"] = []

        promotion = promote_candidates([candidate])

        self.assertEqual([], promotion.gold_records)
        self.assertEqual(1, len(promotion.review_queue))
        self.assertEqual(
            "description:missing_source_span",
            promotion.review_queue[0]["reason"],
        )

    def test_gold_promotion_quarantines_empty_fixture_coverage(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            promotion = promote_fixtures(Path(tmp))

        self.assertEqual([], promotion.gold_records)
        self.assertEqual(1, len(promotion.review_queue))
        self.assertEqual("fixtures:missing", promotion.review_queue[0]["reason"])

    def test_review_queue_records_durable_approval_decision(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            decisions_path = Path(tmp) / "decisions.json"

            decision = record_review_decision(
                decisions_path=decisions_path,
                candidate_id="candidate-123",
                decision="approved",
                reviewer="codex-test",
                field_decisions={"title": "source_verified"},
                notes="Reviewed against the PDF.",
            )

            self.assertEqual("candidate-123", decision["candidate_id"])
            self.assertEqual("approved", decision["decision"])
            self.assertEqual("codex-test", decision["reviewer"])
            self.assertEqual({"title": "source_verified"}, decision["field_decisions"])
            self.assertIn("reviewed_at", decision)
            self.assertEqual(decision, load_review_decisions(decisions_path)["candidate-123"])

    def test_review_queue_list_excludes_already_decided_candidates(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            queue_path = Path(tmp) / "queue.json"
            decisions_path = Path(tmp) / "decisions.json"
            queue_path.write_text(
                json.dumps(
                    [
                        {"candidate_id": "candidate-1", "reason": "warning"},
                        {"candidate_id": "candidate-2", "reason": "warning"},
                    ]
                )
            )
            record_review_decision(
                decisions_path=decisions_path,
                candidate_id="candidate-1",
                decision="rejected",
                reviewer="codex-test",
            )

            pending = list_pending_reviews(
                queue_path=queue_path,
                decisions_path=decisions_path,
            )

            self.assertEqual(["candidate-2"], [row["candidate_id"] for row in pending])

    def test_gold_promotion_uses_approval_for_candidate_warnings_only(self) -> None:
        candidate = extract_candidates_for_fixture(WELLNESS_FIXTURES[0])[0]
        candidate = json.loads(json.dumps(candidate))
        candidate["warnings"] = ["parser:low_confidence"]

        without_approval = promote_candidates([candidate])
        self.assertEqual([], without_approval.gold_records)
        self.assertEqual("candidate_warning:parser:low_confidence", without_approval.review_queue[0]["reason"])

        with_approval = promote_candidates(
            [candidate],
            review_decisions={
                candidate["candidate_id"]: {
                    "candidate_id": candidate["candidate_id"],
                    "decision": "approved",
                    "reviewer": "codex-test",
                    "reviewed_at": "2026-06-21T00:00:00Z",
                    "field_decisions": {"warnings": "accepted"},
                }
            },
        )

        self.assertEqual([], with_approval.review_queue)
        self.assertEqual(1, len(with_approval.gold_records))

    def test_gold_promotion_approval_cannot_override_missing_source_span(self) -> None:
        candidate = extract_candidates_for_fixture(WELLNESS_FIXTURES[0])[0]
        candidate = json.loads(json.dumps(candidate))
        candidate["normalized_fields"]["description"]["spans"] = []

        promotion = promote_candidates(
            [candidate],
            review_decisions={
                candidate["candidate_id"]: {
                    "candidate_id": candidate["candidate_id"],
                    "decision": "approved",
                    "reviewer": "codex-test",
                    "reviewed_at": "2026-06-21T00:00:00Z",
                }
            },
        )

        self.assertEqual([], promotion.gold_records)
        self.assertEqual("description:missing_source_span", promotion.review_queue[0]["reason"])

    def test_coverage_audit_allows_current_partial_mode_with_warnings(self) -> None:
        audit = build_coverage_audit()

        self.assertTrue(audit.passed, audit.errors)
        self.assertEqual(20, audit.summary["pdf_source_count"])
        self.assertEqual(225, audit.summary["fixture_count"])
        self.assertEqual(33, audit.summary["fixture_quarantine_count"])
        self.assertEqual(0, audit.summary["fixture_unextractable_count"])
        self.assertEqual(222, audit.summary["gold_record_count"])
        self.assertFalse(audit.summary["production_ready"])
        self.assertEqual(222, audit.summary["coverage_required_count"])
        self.assertNotIn("all-star-music", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("all-star-sports", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("animal-kingdom-jambo", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("animal-kingdom-kidani", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("boardwalk", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("caribbean-beach", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("contemporary", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("coronado-springs", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("grand-floridian", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("old-key-west", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("polynesian", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("pop-century", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("port-orleans-french-quarter", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("port-orleans-riverside", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("riviera", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("wilderness-lodge", audit.summary["undercovered_gold_groups"])
        self.assertNotIn("fort-wilderness", audit.summary["undercovered_gold_groups"])
        self.assertIn("all-star-music", audit.summary["legacy_overcount_groups"])
        self.assertEqual(
            {"gold": 12, "fixture": 12, "legacy": 13},
            audit.summary["legacy_overcount_groups"]["all-star-music"],
        )
        self.assertIn("all-star-sports", audit.summary["legacy_overcount_groups"])
        self.assertIn("boardwalk", audit.summary["legacy_overcount_groups"])
        self.assertIn("coronado-springs", audit.summary["legacy_overcount_groups"])
        self.assertIn("contemporary", audit.summary["legacy_overcount_groups"])
        self.assertEqual(
            {"gold": 11, "fixture": 11, "legacy": 14},
            audit.summary["legacy_overcount_groups"]["contemporary"],
        )
        self.assertEqual(
            {"gold": 8, "fixture": 8, "legacy": 12},
            audit.summary["legacy_overcount_groups"]["coronado-springs"],
        )
        self.assertEqual(
            {"gold": 10, "fixture": 10, "legacy": 13},
            audit.summary["legacy_overcount_groups"]["boardwalk"],
        )
        self.assertIn("old-key-west", audit.summary["legacy_overcount_groups"])
        self.assertEqual(
            {"gold": 13, "fixture": 13, "legacy": 16},
            audit.summary["legacy_overcount_groups"]["old-key-west"],
        )
        self.assertIn("polynesian", audit.summary["legacy_overcount_groups"])
        self.assertEqual(
            {"gold": 8, "fixture": 8, "legacy": 10},
            audit.summary["legacy_overcount_groups"]["polynesian"],
        )
        self.assertIn("pop-century", audit.summary["legacy_overcount_groups"])
        self.assertEqual(
            {"gold": 10, "fixture": 10, "legacy": 11},
            audit.summary["legacy_overcount_groups"]["pop-century"],
        )
        self.assertIn("port-orleans-french-quarter", audit.summary["legacy_overcount_groups"])
        self.assertEqual(
            {"gold": 9, "fixture": 9, "legacy": 13},
            audit.summary["legacy_overcount_groups"]["port-orleans-french-quarter"],
        )
        self.assertIn("port-orleans-riverside", audit.summary["legacy_overcount_groups"])
        self.assertEqual(
            {"gold": 10, "fixture": 10, "legacy": 13},
            audit.summary["legacy_overcount_groups"]["port-orleans-riverside"],
        )
        self.assertNotIn("riviera", audit.summary["legacy_overcount_groups"])
        self.assertIn("wilderness-lodge", audit.summary["legacy_overcount_groups"])
        self.assertEqual(
            {"gold": 13, "fixture": 13, "legacy": 14},
            audit.summary["legacy_overcount_groups"]["wilderness-lodge"],
        )
        self.assertIn("fort-wilderness", audit.summary["legacy_overcount_groups"])
        self.assertEqual(
            {"gold": 4, "fixture": 4, "legacy": 14},
            audit.summary["legacy_overcount_groups"]["fort-wilderness"],
        )
        self.assertIn("animal-kingdom-jambo", audit.summary["legacy_undercount_groups"])
        self.assertEqual(
            {"gold": 12, "fixture": 12, "legacy": 11},
            audit.summary["legacy_undercount_groups"]["animal-kingdom-jambo"],
        )
        self.assertIn("animal-kingdom-kidani", audit.summary["legacy_undercount_groups"])
        self.assertIn("art-of-animation", audit.summary["legacy_undercount_groups"])
        self.assertEqual(
            {"gold": 9, "fixture": 9, "legacy": 8},
            audit.summary["legacy_undercount_groups"]["caribbean-beach"],
        )
        self.assertEqual(
            {"gold": 14, "fixture": 14, "legacy": 8},
            audit.summary["legacy_undercount_groups"]["art-of-animation"],
        )
        self.assertIn("grand-floridian", audit.summary["legacy_undercount_groups"])
        self.assertEqual(
            {"gold": 13, "fixture": 13, "legacy": 10},
            audit.summary["legacy_undercount_groups"]["grand-floridian"],
        )
        self.assertFalse(audit.summary["undercovered_gold_groups"])
        self.assertTrue(
            any(warning.startswith("coverage:legacy_overcount_groups:") for warning in audit.warnings),
            audit.warnings,
        )
        self.assertTrue(
            any(warning.startswith("coverage:legacy_undercount_groups:") for warning in audit.warnings),
            audit.warnings,
        )
        self.assertTrue(
            any(warning.startswith("coverage:fixture_quarantine_records:") for warning in audit.warnings),
            audit.warnings,
        )
        self.assertFalse(
            any(warning.startswith("coverage:fixture_unextractable_records:") for warning in audit.warnings),
            audit.warnings,
        )

    def test_coverage_audit_blocks_production_cutover_until_catalog_is_covered(self) -> None:
        prior = os.environ.pop("ACTIVITY_DATA_PIPELINE", None)
        prior_public = os.environ.pop("NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE", None)
        try:
            audit = build_coverage_audit(require_production_ready=True)
        finally:
            if prior is not None:
                os.environ["ACTIVITY_DATA_PIPELINE"] = prior
            if prior_public is not None:
                os.environ["NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE"] = prior_public

        self.assertFalse(audit.passed)
        self.assertNotIn("coverage:ui_pipeline_not_gold-v2:gold-v2-preview", audit.errors)
        self.assertFalse(
            any(error.startswith("coverage:gold_rows_below_required_count:") for error in audit.errors),
            audit.errors,
        )
        self.assertFalse(
            any(error.startswith("coverage:gold_rows_below_required_by_group:") for error in audit.errors),
            audit.errors,
        )
        self.assertIn("coverage:fixture_quarantine_records:33", audit.errors)
        self.assertFalse(
            any(error.startswith("coverage:fixture_unextractable_records:") for error in audit.errors),
            audit.errors,
        )
        self.assertFalse(
            any(error.startswith("coverage:legacy_overcount_groups:") for error in audit.errors),
            audit.errors,
        )

    def test_production_pipeline_requires_cutover_coverage_before_publish(self) -> None:
        steps = validation_gate_steps(local_only=False)

        self.assertIn(("audit_coverage.py", "--require-production-ready"), steps)

    def test_local_pipeline_runs_partial_coverage_audit_without_cutover_gate(self) -> None:
        steps = validation_gate_steps(local_only=True)

        self.assertIn(("audit_coverage.py",), steps)
        self.assertNotIn(("audit_coverage.py", "--require-production-ready"), steps)

    def test_pipeline_builds_mrg_facts_before_gold_promotion(self) -> None:
        steps = validation_gate_steps(local_only=True)

        self.assertIn(("magical_resort_guide.py",), steps)
        self.assertLess(
            steps.index(("magical_resort_guide.py",)),
            steps.index(("promote_gold.py", "--fail-on-review")),
        )


if __name__ == "__main__":
    unittest.main()
