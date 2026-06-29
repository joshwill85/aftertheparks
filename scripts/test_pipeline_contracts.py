import unittest
from pathlib import Path
import sys
import json
import tempfile
import os
import hashlib
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.ingest.contracts import (
    validate_claims,
    validate_golden_fixture,
    validate_public_record,
)
from scripts.ingest.web_snapshot import web_snapshot_content_hash
from scripts.ingest.audit_coverage import build_coverage_audit
from scripts.ingest.audit_official_recreation_coverage import (
    build_official_recreation_coverage_audit,
)
from scripts.ingest.audit_official_recreation_source_drift import (
    build_official_recreation_source_drift_audit,
)
from scripts.ingest.extract_v2 import (
    compare_candidates_to_fixture,
    extract_candidates_for_fixture,
    extract_publishable_candidates_for_fixture,
    extract_candidates_for_pdf,
)
from scripts.ingest.promote_gold import generate_gold_records, promote_candidates, promote_fixtures
from scripts.ingest import promote_gold
from scripts.ingest import discover
from scripts.ingest.source_manifest import ActivitySource
from scripts.ingest.publish_gold_v2 import publish_gold_file, publish_gold_rows, _stable_uuid
from scripts.ingest.disney_recreation_offerings import (
    extract_official_recreation_offerings,
    resolve_official_resort_slugs,
)
from scripts.ingest.generate_official_recreation_offerings import (
    generate_official_recreation_offerings,
)
from scripts.ingest.publish_official_offerings import (
    publish_official_offering_file,
    publish_official_offering_rows,
)
from scripts.ingest.review_queue import (
    list_pending_reviews,
    load_review_decisions,
    record_review_decision,
)
from scripts.ingest.publish import ALLOW_LEGACY_PUBLISH_ENV, publish_all as publish_legacy_temporal_all
from scripts.ingest.run_pipeline import publish_steps, validation_gate_steps, vision_v3_report_steps
from scripts.ingest.trust_report import build_trust_report, render_markdown_report
from scripts.ingest.validate_v2 import validate_fixture_extractions, validate_fixture_paths
from scripts.ingest import backfill_all_times, backfill_movie_times


WELLNESS_FIXTURES = [
    Path("data/golden/activities/all-star-movies-wellness-scavenger-hunt.json"),
    Path("data/golden/activities/all-star-music-wellness-scavenger-hunt.json"),
    Path("data/golden/activities/all-star-sports-wellness-scavenger-hunt.json"),
]
ALL_STAR_MOVIES_FULL_FIXTURE = Path("data/golden/activities/all-star-movies-full-calendar.json")
ALL_STAR_MUSIC_FULL_FIXTURE = Path("data/golden/activities/all-star-music-full-calendar.json")
ART_OF_ANIMATION_FULL_FIXTURE = Path("data/golden/activities/art-of-animation-full-calendar.json")
ANIMAL_KINGDOM_JAMBO_FULL_FIXTURE = Path("data/golden/activities/animal-kingdom-jambo-full-calendar.json")
ANIMAL_KINGDOM_KIDANI_FULL_FIXTURE = Path("data/golden/activities/animal-kingdom-kidani-full-calendar.json")
BOARDWALK_FULL_FIXTURE = Path("data/golden/activities/boardwalk-full-calendar.json")
GRAND_FLORIDIAN_FULL_FIXTURE = Path("data/golden/activities/grand-floridian-full-calendar.json")
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
FORT_WILDERNESS_CABINS_WEB_FIXTURE = Path("data/golden/activities/fort-wilderness-cabins-official-recreation-page.json")
GOLD_PREVIEW_PATH = Path("data/processed/activity_gold_v2_preview.json")
ACTIVITY_PIPELINE_V2_MIGRATION = Path("supabase/migrations/20260621125139_activity_pipeline_v2.sql")
MRG_FACTS_MIGRATION = Path("supabase/migrations/20260622003816_magical_resort_guide_facts.sql")
OFFICIAL_OFFERINGS_MIGRATION_GLOB = "supabase/migrations/*official_recreation_offerings*.sql"
SOURCE_TRUST_LEDGER_MIGRATION_GLOB = "supabase/migrations/*source_trust_audit_ledger.sql"


def promote_fixture_paths(*fixture_paths: Path):
    candidates_by_id: dict[str, dict] = {}
    for fixture_path in fixture_paths:
        for candidate in extract_publishable_candidates_for_fixture(fixture_path):
            candidates_by_id[candidate["candidate_id"]] = candidate
    return promote_candidates(list(candidates_by_id.values()))


ALL_STAR_MOVIES_PDF = Path("data/raw/pdfs/All-Star-Movies_Aframe_Recreation_1125.pdf")
ALL_STAR_MUSIC_PDF = Path("data/raw/pdfs/All-Star-Music_Aframe_Recreation_0126-V3_DRAFT.pdf")
ALL_STAR_SPORTS_PDF = Path("data/raw/pdfs/All-Star-Sports_Aframe_Recreation_0126_V3_DRAFT.pdf")
CURRENT_ALL_STAR_MOVIES_PDF = Path("data/raw/pdfs/All-Star-Movies_Aframe_Recreation-0526_DIGITAL.pdf")
CURRENT_ALL_STAR_MUSIC_PDF = Path("data/raw/pdfs/All-Star-Music_Aframe_Recreation-0326.pdf")
CURRENT_ANIMAL_KINGDOM_JAMBO_PDF = Path("data/raw/pdfs/DAKL_Aframe_Recreation-0526_Jambo_DIGITAL.pdf")
CURRENT_ANIMAL_KINGDOM_KIDANI_PDF = Path("data/raw/pdfs/DAKL_Aframe_Recreation-0526_Kidani_DIGITAL.pdf")
CURRENT_GRAND_FLORIDIAN_PDF = Path("data/raw/pdfs/GF_Aframe_Recreation-0526.pdf")
BEACH_YACHT_PDF = Path("data/raw/pdfs/YB_Aframe_Recreation-1125.pdf")
BOARDWALK_PDF = Path("data/raw/pdfs/BW_Aframe_Recreation-0526_DIGITAL.pdf")
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
    "story-time-yoga",
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

    def insert(self, table: str, rows, on_conflict=None) -> list[dict]:
        return self.upsert(table, rows, on_conflict or "")

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


def _source_trust_ledger_migration_text() -> str:
    migrations = sorted(Path().glob(SOURCE_TRUST_LEDGER_MIGRATION_GLOB))
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

    def test_historical_regression_fixture_does_not_publish_current_gold(self) -> None:
        candidates = extract_publishable_candidates_for_fixture(WELLNESS_FIXTURES[0])

        self.assertEqual([], candidates)

    def test_historical_regression_fixture_does_not_create_review_blocker(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture_path = Path(tmp) / WELLNESS_FIXTURES[0].name
            fixture_path.write_text(WELLNESS_FIXTURES[0].read_text())

            promotion = promote_fixtures(Path(tmp))

        self.assertEqual([], promotion.gold_records)
        self.assertEqual([], promotion.review_queue)

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

    def test_boardwalk_fixture_uses_current_q3_movie_nights(self) -> None:
        candidates = extract_publishable_candidates_for_fixture(BOARDWALK_FULL_FIXTURE)
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        movie = by_slug["movie-under-the-stars"]["normalized_fields"]
        self.assertEqual("Village Green Lawn | 8:30PM", movie["schedule"]["text"])
        self.assertEqual(
            [
                "Beauty and the Beast (1991)",
                "Moana",
                "The Lion King (1994)",
                "Toy Story 2",
                "Mulan (1998)",
                "Monsters, Inc.",
                "Finding Nemo",
            ],
            [night["movie_title"] for night in movie["movie_nights"]],
        )

    def test_discover_extracts_activity_schedule_pdf_from_resort_page_html(self) -> None:
        from scripts.ingest.discover import extract_recreation_pdf_links_from_html

        html = """
        <html>
          <body>
            <a href="/resorts/boardwalk-inn/">Overview</a>
            <a href="https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf">
              View the full schedule of recreation and entertainment.
            </a>
          </body>
        </html>
        """

        links = extract_recreation_pdf_links_from_html(
            html,
            parent_url="https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
        )

        self.assertEqual(1, len(links))
        self.assertEqual(
            "View the full schedule of recreation and entertainment.",
            links[0]["anchor_text"],
        )
        self.assertEqual("fy26-q3", links[0]["edition_folder"])
        self.assertEqual("0526", links[0]["filename_date"])
        self.assertEqual("official_resort_recreation_page", links[0]["evidence_kind"])

    def test_discover_extracts_activity_schedule_pdf_from_marketing_info_recreation_tab(self) -> None:
        from scripts.ingest.discover import extract_recreation_pdf_links_from_marketing_info

        payload = {
            "tabs": {
                "recreation": {
                    "desktopDisplaySections": [
                        {
                            "sections": {
                                "body": (
                                    'Find recreation and entertainment for the whole family at Boardwalk Inn.'
                                    '<p><a href="https://cdn1.parksmedia.wdprapps.disney.com/'
                                    'vision-dam/digital/parks-services/services-standard-assets/ops-comm/'
                                    'wdw-csd/resort-collateral/recreation/fy26-q3/'
                                    'BW_Aframe_Recreation-0526_DIGITAL.pdf">'
                                    "View the full schedule of recreation and entertainment</a>.</p>"
                                )
                            }
                        }
                    ]
                }
            }
        }

        links = extract_recreation_pdf_links_from_marketing_info(
            payload,
            parent_url="https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
            api_url="https://disneyworld.disney.go.com/wdw-resorts-details-api/api/v1/resort/80010386/marketing-info/?storeId=wdw",
        )

        self.assertEqual(1, len(links))
        self.assertEqual(
            "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf",
            links[0]["url"],
        )
        self.assertEqual("official_resort_recreation_page", links[0]["evidence_kind"])
        self.assertEqual(
            "resort_marketing_info.tabs.recreation",
            links[0]["evidence_detail"],
        )

    def test_discover_extracts_activity_schedule_image_from_marketing_info_recreation_tab(self) -> None:
        from scripts.ingest.discover import extract_recreation_pdf_links_from_marketing_info

        payload = {
            "tabs": {
                "recreation": {
                    "desktopDisplaySections": [
                        {
                            "sections": {
                                "body": (
                                    'Find recreation and entertainment for the whole family at Pop Century.'
                                    '<p><a href="https://cdn1.parksmedia.wdprapps.disney.com/'
                                    'vision-dam/digital/parks-platform/parks-global-assets/disney-world/'
                                    'recreation/summer/Pop-Century_CKS-Digital-Rec-Sign_052626.jpg">'
                                    "View the full schedule of recreation and entertainment</a>.</p>"
                                )
                            }
                        }
                    ]
                }
            }
        }

        links = extract_recreation_pdf_links_from_marketing_info(
            payload,
            parent_url="https://disneyworld.disney.go.com/resorts/pop-century-resort/recreation/",
        )

        self.assertEqual(1, len(links))
        self.assertTrue(links[0]["url"].endswith("Pop-Century_CKS-Digital-Rec-Sign_052626.jpg"))
        self.assertEqual("0526", links[0]["filename_date"])
        self.assertEqual("official_resort_recreation_page", links[0]["evidence_kind"])

    def test_resort_pdf_date_audit_flags_newer_live_pdf(self) -> None:
        from scripts.ingest.audit_resort_pdf_dates import build_resort_pdf_date_audit

        manifest_rows = [
            {
                "calendar_group_key": "boardwalk",
                "manifest_url": "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/BW_Aframe_Recreation-0326.pdf",
                "resort_slugs": ["boardwalk-inn"],
            }
        ]
        discovery_rows = [
            {
                "calendar_group_key": "boardwalk",
                "discovered_url": "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf",
                "discovery_evidence": {"evidence_kind": "official_resort_recreation_page"},
            }
        ]

        audit = build_resort_pdf_date_audit(
            manifest_rows=manifest_rows,
            discovery_rows=discovery_rows,
            head_by_url={},
        )

        self.assertFalse(audit["passed"])
        self.assertEqual(["boardwalk"], audit["summary"]["stale_groups"])
        self.assertEqual("fy26-q2 / 0326", audit["sources"][0]["manifest_edition"])
        self.assertEqual("fy26-q3 / 0526", audit["sources"][0]["live_edition"])

    def test_generated_replacement_sources_override_stale_manifest(self) -> None:
        from scripts.ingest.replace_resort_pdf_sources import build_replacement_overrides

        audit = {
            "sources": [
                {
                    "calendar_group_key": "boardwalk",
                    "manifest_url": "https://example.com/fy26-q2/BW_Aframe_Recreation-0326.pdf",
                    "live_url": "https://example.com/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf",
                    "live_edition": "fy26-q3 / 0526",
                    "stale": True,
                    "discovery_evidence": {"evidence_kind": "official_resort_recreation_page"},
                }
            ]
        }

        overrides = build_replacement_overrides(audit)

        self.assertEqual(
            {
                "boardwalk": {
                    "pdf_url": "https://example.com/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf",
                    "pdf_edition": "fy26-q3-0526",
                    "replaced_stale_url": "https://example.com/fy26-q2/BW_Aframe_Recreation-0326.pdf",
                }
            },
            overrides,
        )

    def test_fetch_report_records_replacement_source_metadata(self) -> None:
        from scripts.ingest.fetch import fetch_report_row

        row = fetch_report_row(
            calendar_group_key="boardwalk",
            status="fetched",
            source_document_id=None,
            content_sha256="a" * 64,
            message="boardwalk/fy26-q3-0526/a.pdf",
            canonical_url="https://example.com/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf",
            replaced_stale_url="https://example.com/fy26-q2/BW_Aframe_Recreation-0326.pdf",
            last_modified="Wed, 20 May 2026 13:55:23 GMT",
            discovery_parent_url="https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
        )

        self.assertEqual(
            "https://example.com/fy26-q2/BW_Aframe_Recreation-0326.pdf",
            row["replaced_stale_url"],
        )
        self.assertEqual("Wed, 20 May 2026 13:55:23 GMT", row["last_modified"])
        self.assertEqual(
            "https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
            row["discovery_parent_url"],
        )

    def test_checked_in_fetch_report_includes_source_type_summary(self) -> None:
        report_path = ROOT / "data" / "processed" / "fetch_report.json"
        report = json.loads(report_path.read_text())
        rows = report["results"]

        self.assertIn("source_type_counts", report)
        self.assertEqual(
            len([row for row in rows if row.get("source_type") in {"pdf", "image"}]),
            report["document_source_count"],
        )
        self.assertGreater(report["source_type_counts"].get("pdf", 0), 0)
        self.assertGreater(report["source_type_counts"].get("image", 0), 0)
        for row in rows:
            self.assertIn(row.get("source_type"), {"pdf", "image", "html", "unknown"})

    def test_fort_wilderness_visual_sources_emit_reviewed_schedule_records(self) -> None:
        from datetime import date

        from scripts.ingest.fort_wilderness_visual_sources import (
            build_visual_source_payload,
            visual_source_is_current,
        )

        payload = build_visual_source_payload()
        self.assertEqual("reviewed_visual_schedule_image", payload["source_kind"])
        self.assertEqual(
            "https://disneyworld.disney.go.com/resorts/campsites-at-fort-wilderness-resort/recreation/",
            payload["canonical_url"],
        )
        self.assertEqual(
            "manual://fort-wilderness/2026-05-26-to-2026-09-08/recreation-activities",
            payload["internal_source_id"],
        )
        self.assertEqual("2026-05-26", payload["valid_from"])
        self.assertEqual("2026-09-08", payload["valid_to"])
        self.assertTrue(visual_source_is_current(payload, current_date=date(2026, 6, 28)))
        self.assertFalse(visual_source_is_current(payload, current_date=date(2026, 9, 9)))

        by_slug = {record["slug"]: record for record in payload["records"]}
        self.assertIn("movie-under-the-stars", by_slug)
        self.assertIn("chip-n-dales-campfire-sing-a-long", by_slug)

        movie = by_slug["movie-under-the-stars"]
        self.assertEqual("Nightly at 8:40 PM", movie["schedule_text"])
        self.assertEqual(
            {"day": "Friday", "odd_days": "Toy Story 2", "even_days": "Mulan"},
            movie["movie_nights"][5],
        )

        campfire = by_slug["chip-n-dales-campfire-sing-a-long"]
        self.assertIn("Croon along to old-time favorites", campfire["description"])
        self.assertEqual("Nightly at 8:00 PM", campfire["schedule_text"])

    def test_validate_v2_accepts_old_key_west_fixture_with_expected_quarantines(self) -> None:
        report = validate_fixture_extractions([OLD_KEY_WEST_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_old_key_west_visual_review_promotes_bike_rentals_hours(self) -> None:
        candidates = extract_publishable_candidates_for_fixture(OLD_KEY_WEST_FULL_FIXTURE)
        bike_candidates = [
            candidate
            for candidate in candidates
            if candidate["normalized_fields"]["slug"] == "bike-rentals"
        ]

        self.assertEqual(1, len(bike_candidates))
        bike = bike_candidates[0]["normalized_fields"]

        self.assertEqual("Bike Rentals", bike["title"]["value"])
        self.assertEqual("Hank’s Rent ‘N Return at Community Hall", bike["location"]["value"])
        self.assertEqual("Daily from 10:00am–6:30pm", bike["schedule"]["text"])
        self.assertEqual("10:00am", bike["schedule"]["start_time"])
        self.assertEqual("6:30pm", bike["schedule"]["end_time"])
        self.assertTrue(bike["is_fee_based"])

        promotion = promote_candidates(bike_candidates)

        self.assertEqual([], promotion.review_queue)
        self.assertEqual("Bike Rentals", promotion.gold_records[0]["title"])
        self.assertEqual(
            "Daily from 10:00am–6:30pm",
            promotion.gold_records[0]["schedule"]["text"],
        )

    def test_validate_v2_accepts_riviera_fixture_with_quarantine_and_reviewed_manual_record(self) -> None:
        report = validate_fixture_extractions([RIVIERA_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_riviera_visual_review_promotes_painting_on_the_riviera_description(self) -> None:
        candidates = extract_publishable_candidates_for_fixture(RIVIERA_FULL_FIXTURE)
        painting_candidates = [
            candidate
            for candidate in candidates
            if candidate["normalized_fields"]["slug"] == "painting-on-the-riviera"
        ]

        self.assertEqual(1, len(painting_candidates))
        painting = painting_candidates[0]["normalized_fields"]

        self.assertEqual("Painting On The Riviera", painting["title"]["value"])
        self.assertEqual("The Eventi Room", painting["location"]["value"])
        self.assertEqual("Thursday from 11:00am-1:00pm", painting["schedule"]["text"])
        self.assertEqual("11:00am", painting["schedule"]["start_time"])
        self.assertEqual("1:00pm", painting["schedule"]["end_time"])
        self.assertEqual(
            "Get in touch with your inner artist in this unique instructor-led painting class! "
            "This experience is recommended for Guests ages 12 and up. To reserve your spot, "
            "please call 407-WDW-PLAY or see a Recreation Cast Member inside The Eventi Room.",
            painting["description"]["value"],
        )
        self.assertTrue(painting["is_fee_based"])

        promotion = promote_candidates(painting_candidates)

        self.assertEqual([], promotion.review_queue)
        self.assertEqual("Painting On The Riviera", promotion.gold_records[0]["title"])
        self.assertIn("407-WDW-PLAY", promotion.gold_records[0]["description"])

    def test_validate_v2_accepts_pop_century_fixture_with_reviewed_repairs_and_manual_record(self) -> None:
        report = validate_fixture_extractions([POP_CENTURY_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_polynesian_fixture_with_quarantines_and_reviewed_manual_record(self) -> None:
        report = validate_fixture_extractions([POLYNESIAN_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_polynesian_visual_review_promotes_campfire_and_aloha_after_dark(self) -> None:
        candidates = extract_publishable_candidates_for_fixture(POLYNESIAN_FULL_FIXTURE)
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }
        self.assertEqual(
            1,
            sum(
                1
                for candidate in candidates
                if candidate["normalized_fields"]["slug"] == "campfire"
            ),
        )
        self.assertEqual(
            1,
            sum(
                1
                for candidate in candidates
                if candidate["normalized_fields"]["slug"] == "aloha-after-dark"
            ),
        )

        self.assertIn("campfire", by_slug)
        self.assertIn("aloha-after-dark", by_slug)
        campfire = by_slug["campfire"]["normalized_fields"]
        aloha = by_slug["aloha-after-dark"]["normalized_fields"]

        self.assertEqual("Seven Seas Lagoon Beach", campfire["location"]["value"])
        self.assertEqual(
            "Monday, Wednesday and Friday from 6:30pm-7:30pm",
            campfire["schedule"]["text"],
        )
        self.assertEqual("7:30pm", campfire["schedule"]["end_time"])
        self.assertEqual(
            "Monday, Wednesday and Friday at 8:00pm",
            aloha["schedule"]["text"],
        )
        self.assertEqual("8:00pm", aloha["schedule"]["start_time"])
        self.assertEqual("Lava Pool Deck", aloha["location"]["value"])

        promotion = promote_candidates([by_slug["campfire"], by_slug["aloha-after-dark"]])

        self.assertEqual([], promotion.review_queue)
        self.assertEqual(
            {
                "campfire": "Seven Seas Lagoon Beach",
                "aloha-after-dark": "Lava Pool Deck",
            },
            {
                row["canonical_slug"]: row["location"]["label"]
                for row in promotion.gold_records
            },
        )

    def test_validate_v2_accepts_port_orleans_riverside_fixture_with_quarantines_and_reviewed_manual_records(self) -> None:
        report = validate_fixture_extractions([PORT_ORLEANS_RIVERSIDE_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_port_orleans_riverside_visual_review_promotes_arts_crafts_table(self) -> None:
        candidates = extract_publishable_candidates_for_fixture(PORT_ORLEANS_RIVERSIDE_FULL_FIXTURE)
        arts_candidates = [
            candidate
            for candidate in candidates
            if candidate["normalized_fields"]["slug"] == "arts-crafts"
        ]

        self.assertEqual(1, len(arts_candidates))
        arts = arts_candidates[0]["normalized_fields"]

        self.assertEqual("Arts & Crafts", arts["title"]["value"])
        self.assertEqual("Ol’ Man Island Pool Deck", arts["location"]["value"])
        self.assertEqual("From 12:30pm-1:30pm", arts["schedule"]["text"])
        self.assertEqual("12:30pm", arts["schedule"]["start_time"])
        self.assertEqual("1:30pm", arts["schedule"]["end_time"])
        self.assertEqual(
            "Tuesday: Seasonal Craft; Wednesday and Saturday: Make Your Own Slime",
            arts["description"]["value"],
        )
        self.assertTrue(arts["is_fee_based"])

        promotion = promote_candidates(arts_candidates)

        self.assertEqual([], promotion.review_queue)
        self.assertEqual("Arts & Crafts", promotion.gold_records[0]["title"])
        self.assertIn("Make Your Own Slime", promotion.gold_records[0]["description"])

    def test_port_orleans_riverside_visual_review_promotes_medicine_show_arcade(self) -> None:
        candidates = extract_publishable_candidates_for_fixture(PORT_ORLEANS_RIVERSIDE_FULL_FIXTURE)
        arcade_candidates = [
            candidate
            for candidate in candidates
            if candidate["normalized_fields"]["slug"] == "medicine-show-arcade"
        ]

        self.assertEqual(1, len(arcade_candidates))
        arcade = arcade_candidates[0]["normalized_fields"]

        self.assertEqual("Medicine Show Arcade", arcade["title"]["value"])
        self.assertEqual("Medicine Show Arcade", arcade["location"]["value"])
        self.assertEqual("Daily from 8:00am-11:00pm", arcade["schedule"]["text"])
        self.assertEqual("8:00am", arcade["schedule"]["start_time"])
        self.assertEqual("11:00pm", arcade["schedule"]["end_time"])
        self.assertEqual(
            "Play the latest and greatest family-friendly video games.",
            arcade["description"]["value"],
        )
        self.assertTrue(arcade["is_fee_based"])

        promotion = promote_candidates(arcade_candidates)

        self.assertEqual([], promotion.review_queue)
        self.assertEqual("Medicine Show Arcade", promotion.gold_records[0]["title"])
        self.assertEqual("fee", promotion.gold_records[0]["price"]["state"])

    def test_validate_v2_accepts_port_orleans_french_quarter_fixture_with_quarantines(self) -> None:
        report = validate_fixture_extractions([PORT_ORLEANS_FRENCH_QUARTER_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_port_orleans_french_quarter_visual_review_promotes_arts_crafts_table(self) -> None:
        candidates = extract_publishable_candidates_for_fixture(PORT_ORLEANS_FRENCH_QUARTER_FULL_FIXTURE)
        arts_candidates = [
            candidate
            for candidate in candidates
            if candidate["normalized_fields"]["slug"] == "arts-crafts"
        ]

        self.assertEqual(1, len(arts_candidates))
        arts = arts_candidates[0]["normalized_fields"]

        self.assertEqual("Arts & Crafts", arts["title"]["value"])
        self.assertEqual("Doubloon Lagoon Pool Deck", arts["location"]["value"])
        self.assertEqual("From 3:00pm-4:00pm", arts["schedule"]["text"])
        self.assertEqual("3:00pm", arts["schedule"]["start_time"])
        self.assertEqual("4:00pm", arts["schedule"]["end_time"])
        self.assertEqual(
            "Sunday and Friday: Seasonal Craft; Thursday: Make Your Own Slime",
            arts["description"]["value"],
        )
        self.assertTrue(arts["is_fee_based"])

        promotion = promote_candidates(arts_candidates)

        self.assertEqual([], promotion.review_queue)
        self.assertEqual("Arts & Crafts", promotion.gold_records[0]["title"])
        self.assertIn("Make Your Own Slime", promotion.gold_records[0]["description"])

    def test_validate_v2_accepts_caribbean_beach_full_calendar_fixture(self) -> None:
        report = validate_fixture_extractions([CARIBBEAN_BEACH_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_validate_v2_accepts_coronado_springs_fixture_with_quarantines(self) -> None:
        report = validate_fixture_extractions([CORONADO_SPRINGS_FULL_FIXTURE])

        self.assertTrue(report.publishable)
        self.assertEqual([], report.errors)

    def test_coronado_visual_review_promotes_colors_of_coronado(self) -> None:
        candidates = extract_publishable_candidates_for_fixture(CORONADO_SPRINGS_FULL_FIXTURE)
        colors_candidates = [
            candidate
            for candidate in candidates
            if candidate["normalized_fields"]["slug"] == "colors-of-coronado-painting-experience"
        ]

        self.assertEqual(1, len(colors_candidates))
        colors = colors_candidates[0]["normalized_fields"]

        self.assertEqual("Colors Of Coronado Painting Experience", colors["title"]["value"])
        self.assertEqual("Toledo - Tapas, Steak & Seafood", colors["location"]["value"])
        self.assertEqual("Friday from 1:00pm-3:00pm", colors["schedule"]["text"])
        self.assertEqual("1:00pm", colors["schedule"]["start_time"])
        self.assertEqual("3:00pm", colors["schedule"]["end_time"])
        self.assertEqual(
            "Get in touch with your inner artist during this master-led painting class. "
            "This experience is recommended for Guests ages 12 and up. Space is limited. "
            "To book, search Colors of Coronado Painting Experience on the My Disney Experience app.",
            colors["description"]["value"],
        )
        self.assertTrue(colors["is_fee_based"])

        promotion = promote_candidates(colors_candidates)

        self.assertEqual([], promotion.review_queue)
        self.assertEqual("Colors Of Coronado Painting Experience", promotion.gold_records[0]["title"])
        self.assertIn("Guests ages 12 and up", promotion.gold_records[0]["description"])

    def test_coronado_visual_review_promotes_spanish_mosaic_art_description(self) -> None:
        candidates = extract_publishable_candidates_for_fixture(CORONADO_SPRINGS_FULL_FIXTURE)
        mosaic_candidates = [
            candidate
            for candidate in candidates
            if candidate["normalized_fields"]["slug"] == "spanish-mosaic-art"
        ]

        self.assertEqual(1, len(mosaic_candidates))
        mosaic = mosaic_candidates[0]["normalized_fields"]

        self.assertEqual("Spanish Mosaic Art", mosaic["title"]["value"])
        self.assertEqual("Dahlia Lounge", mosaic["location"]["value"])
        self.assertEqual(
            "Monday, Wednesday and Saturday from 1:00pm-3:00pm",
            mosaic["schedule"]["text"],
        )
        self.assertEqual("1:00pm", mosaic["schedule"]["start_time"])
        self.assertEqual("3:00pm", mosaic["schedule"]["end_time"])
        self.assertEqual(
            "Immerse yourself in a historic Spanish art tradition as you design your own "
            "mosaic showpiece with a touch of Disney flair. This experience is recommended "
            "for Guests ages 12 and up. Space is limited. To book, search Spanish Mosaic "
            "Art on the My Disney Experience app.",
            mosaic["description"]["value"],
        )
        self.assertTrue(mosaic["is_fee_based"])

        promotion = promote_candidates(mosaic_candidates)

        self.assertEqual([], promotion.review_queue)
        self.assertEqual("Spanish Mosaic Art", promotion.gold_records[0]["title"])
        self.assertIn("My Disney Experience app", promotion.gold_records[0]["description"])

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

        promotion = promote_fixture_paths(
            FORT_WILDERNESS_WEB_FIXTURE,
            FORT_WILDERNESS_CABINS_WEB_FIXTURE,
        )
        fort_rows = [
            row
            for row in promotion.gold_records
            if row["calendar_group_key"] == "fort-wilderness"
        ]
        self.assertEqual(
            FORT_WILDERNESS_EXPECTED_WEB_PUBLIC_SLUGS | {"movie-under-the-stars"},
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
        self.assertEqual(
            "https://disneyworld.disney.go.com/resorts/dvc-cabins-at-fort-wilderness-resort/recreation/",
            source_url_by_slug["movie-under-the-stars"],
        )
        movie = next(row for row in fort_rows if row["canonical_slug"] == "movie-under-the-stars")
        self.assertEqual("free", movie["price"]["state"])
        self.assertIn("price", movie["field_provenance"])
        self.assertIn(
            "complimentary screenings",
            movie["field_provenance"]["price"][0]["text"],
        )

    def test_fort_wilderness_cabins_page_supplies_movie_under_the_stars(self) -> None:
        candidates = extract_candidates_for_fixture(FORT_WILDERNESS_CABINS_WEB_FIXTURE)
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        self.assertIn("movie-under-the-stars", by_slug)
        movie = by_slug["movie-under-the-stars"]
        self.assertEqual([], movie["warnings"])
        self.assertEqual(
            "Movies Under the Stars",
            movie["normalized_fields"]["title"]["value"],
        )
        self.assertEqual(
            "Nightly",
            movie["normalized_fields"]["schedule"]["text"],
        )
        self.assertIsNone(movie["normalized_fields"]["schedule"]["start_time"])
        self.assertEqual(
            "Campground Theater",
            movie["normalized_fields"]["location"]["value"],
        )
        self.assertEqual(
            "https://disneyworld.disney.go.com/resorts/dvc-cabins-at-fort-wilderness-resort/recreation/",
            movie["source_url"],
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

    def test_unextractable_records_may_have_title_only_candidate_with_missing_required_fields(self) -> None:
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
        title_only_candidate = {
            "warnings": ["schedule:missing_source_span", "location:missing_source_span"],
            "normalized_fields": {
                "slug": "source-visible-title-only",
                "title": {
                    "value": "Source Visible Title Only",
                    "spans": [
                        {
                            "page": 1,
                            "line": 22,
                            "text": "SOURCE VISIBLE TITLE ONLY",
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
                    "title": "Source Visible Title Only",
                    "slug": "source-visible-title-only",
                    "reason": "PDF shows title only; required public fields are absent",
                    "required_spans": {
                        "title": [
                            {
                                "page": 1,
                                "line": 22,
                                "text": "SOURCE VISIBLE TITLE ONLY",
                            }
                        ]
                    },
                }
            ],
        }

        errors = compare_candidates_to_fixture(
            [public_candidate, title_only_candidate],
            fixture,
        )

        self.assertEqual([], errors)

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
                "title": [{"page": 1, "bbox": [100, 200, 500, 240], "text": "SOURCE VISIBLE MANUAL ACTIVITY"}],
                "location": [{"page": 1, "bbox": [100, 250, 500, 280], "text": "Manual Review Lawn"}],
                "schedule": [{"page": 1, "bbox": [100, 290, 500, 320], "text": "Daily from 9:00am-10:00am"}],
                "description": [{"page": 1, "bbox": [100, 330, 500, 360], "text": "Reviewed source text that OCR missed."}],
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

    def test_manual_review_requires_source_hash_decision_reason_and_evidence(self) -> None:
        from scripts.ingest.audit_coverage import manual_review_errors

        review = {
            "review_id": "akl-campfire",
            "field": "price",
        }

        self.assertEqual(
            [
                "manual_review:source_sha256",
                "manual_review:source_text_or_bbox",
                "manual_review:decision",
                "manual_review:reason",
            ],
            manual_review_errors(review),
        )

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

    def test_current_all_star_movies_extracts_source_movie_titles(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=CURRENT_ALL_STAR_MOVIES_PDF,
            calendar_group_key="all-star-movies",
        )
        movie = next(
            candidate["normalized_fields"]
            for candidate in candidates
            if candidate["normalized_fields"]["slug"] == "movie-under-the-stars"
        )

        self.assertEqual("The Reel Spot | 8:30PM", movie["schedule"]["text"])
        self.assertEqual(
            [
                ("sunday", "Up", "8:30PM"),
                ("monday", "Lilo & Stitch (2002)", "8:30PM"),
                ("tuesday", "Luca", "8:30PM"),
                ("wednesday", "Tangled", "8:30PM"),
                ("thursday", "Toy Story 3", "8:30PM"),
                ("friday", "High School Musical 2", "8:30PM"),
                ("saturday", "Moana", "8:30PM"),
            ],
            [
                (
                    night["day_of_week"],
                    night["movie_title"],
                    night["show_time"],
                )
                for night in movie["movie_nights"]
            ],
        )

    def test_current_all_star_music_extracts_source_movie_titles(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=CURRENT_ALL_STAR_MUSIC_PDF,
            calendar_group_key="all-star-music",
        )
        movie = next(
            candidate["normalized_fields"]
            for candidate in candidates
            if candidate["normalized_fields"]["slug"] == "movie-under-the-stars"
        )

        self.assertEqual("Calypso Pool Deck | 8:30PM", movie["schedule"]["text"])
        self.assertEqual(
            [
                ("sunday", "Moana", "8:30PM"),
                ("tuesday", "Bambi", "8:30PM"),
                ("thursday", "Frozen 2", "8:30PM"),
                ("saturday", "The Incredibles", "8:30PM"),
            ],
            [
                (
                    night["day_of_week"],
                    night["movie_title"],
                    night["show_time"],
                )
                for night in movie["movie_nights"]
            ],
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

    def test_current_all_star_music_flags_malformed_poolside_schedule(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=CURRENT_ALL_STAR_MUSIC_PDF,
            calendar_group_key="all-star-music",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        poolside = by_slug["poolside-activities"]

        self.assertIn("schedule:text_quality_low", poolside["warnings"])

    def test_current_jambo_body_fee_language_marks_fee_based_activity(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=CURRENT_ANIMAL_KINGDOM_JAMBO_PDF,
            calendar_group_key="animal-kingdom-jambo",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        simba = by_slug["simbas-activity-center"]["normalized_fields"]

        self.assertTrue(simba["is_fee_based"])
        self.assertTrue(
            any(evidence.get("field") == "source_pdf_body_fee_language" for evidence in simba["fee_evidence"]),
            simba["fee_evidence"],
        )

    def test_current_extract_flags_day_fragment_descriptions(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=CURRENT_ANIMAL_KINGDOM_JAMBO_PDF,
            calendar_group_key="animal-kingdom-jambo",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        arts = by_slug["arts-crafts"]

        self.assertIn("description:text_quality_low", arts["warnings"])

    def test_current_extract_flags_malformed_day_schedules(self) -> None:
        art_candidates = extract_candidates_for_pdf(
            pdf_path=Path("data/raw/pdfs/DAAR_Aframe_Recreation-0326.pdf"),
            calendar_group_key="art-of-animation",
        )
        grand_candidates = extract_candidates_for_pdf(
            pdf_path=CURRENT_GRAND_FLORIDIAN_PDF,
            calendar_group_key="grand-floridian",
        )
        art_by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in art_candidates
        }
        grand_by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in grand_candidates
        }

        self.assertIn("schedule:text_quality_low", art_by_slug["glow-party"]["warnings"])
        self.assertIn("schedule:text_quality_low", grand_by_slug["nighttime-pool-party"]["warnings"])

    def test_current_animal_kingdom_campfires_preserve_smores_purchase_language(self) -> None:
        jambo_candidates = extract_candidates_for_pdf(
            pdf_path=CURRENT_ANIMAL_KINGDOM_JAMBO_PDF,
            calendar_group_key="animal-kingdom-jambo",
        )
        jambo_by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in jambo_candidates
        }
        jambo_campfire = jambo_by_slug["campfire"]["normalized_fields"]

        self.assertIn("complimentary marshmallows", jambo_campfire["description"]["value"])
        self.assertIn("S’mores kits available for purchase", jambo_campfire["description"]["value"])

        kidani_candidates = extract_publishable_candidates_for_fixture(ANIMAL_KINGDOM_KIDANI_FULL_FIXTURE)
        kidani_by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in kidani_candidates
        }

        self.assertIn("campfire", kidani_by_slug)
        kidani_campfire = kidani_by_slug["campfire"]["normalized_fields"]
        self.assertEqual("Campfire", kidani_campfire["title"]["value"])
        self.assertIn("S’mores kits available for purchase", kidani_campfire["description"]["value"])

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

    def test_current_grand_floridian_reviewed_ocr_repairs_are_applied(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=CURRENT_GRAND_FLORIDIAN_PDF,
            calendar_group_key="grand-floridian",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        boat = by_slug["captains-shipyard-boat-rentals"]["normalized_fields"]
        movie = by_slug["movie-under-the-stars"]["normalized_fields"]

        self.assertEqual("Captain’s Shipyard Boat Rentals", boat["title"]["value"])
        self.assertEqual("Captain’s Shipyard Boat Rentals", boat["location"]["value"])
        self.assertEqual("Courtyard Lawn", movie["location"]["value"])
        self.assertEqual("Courtyard Lawn | 8:00PM", movie["schedule"]["text"])

    def test_current_kidani_reviewed_location_repairs_are_applied(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=CURRENT_ANIMAL_KINGDOM_KIDANI_PDF,
            calendar_group_key="animal-kingdom-kidani",
        )
        by_slug = {
            candidate["normalized_fields"]["slug"]: candidate
            for candidate in candidates
        }

        bingo = by_slug["bingo"]["normalized_fields"]

        self.assertEqual("Palace Library", bingo["location"]["value"])

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
        promotion = promote_fixture_paths(ALL_STAR_MOVIES_FULL_FIXTURE)
        movies_rows = [
            row
            for row in promotion.gold_records
            if row["calendar_group_key"] == "all-star-movies"
        ]

        self.assertEqual(10, len(movies_rows))
        self.assertFalse(
            any(row["canonical_slug"] == "resort-scavenger-hunt" for row in movies_rows)
        )
        self.assertFalse(
            any(row["canonical_slug"] == "reel-fun-arcade" for row in movies_rows)
        )

    def test_gold_promotion_preserves_reviewed_visual_movie_days(self) -> None:
        promotion = promote_gold.promote_current_replacement_sources(
            {
                "art-of-animation": {
                    "pdf_url": "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q3/DAAR_CKS-Digital-Rec-Sign_052626-FINAL.jpg",
                    "pdf_edition": "fy26-q3-0526",
                }
            }
        )
        movie = next(
            row
            for row in promotion.gold_records
            if row["calendar_group_key"] == "art-of-animation"
            and row["canonical_slug"] == "movie-under-the-stars"
        )

        self.assertEqual(
            [
                ("sunday", "The Lion King", "8:30pm"),
                ("monday", "Monsters, Inc.", "8:30pm"),
                ("tuesday", "Ratatouille", "8:30pm"),
                ("wednesday", "Toy Story 2", "8:30pm"),
                ("thursday", "Teen Beach Movie", "8:30pm"),
                ("friday", "Cinderella", "8:30pm"),
                ("saturday", "Cars", "8:30pm"),
            ],
            [
                (
                    night["day_of_week"],
                    night["movie_title"],
                    night["show_time"],
                )
                for night in movie["movie_nights"]
            ],
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

    def test_gold_promotion_uses_pdf_fee_marker_absence_as_free_price_evidence(self) -> None:
        candidate = extract_candidates_for_fixture(WELLNESS_FIXTURES[0])[0]
        normalized = candidate["normalized_fields"]
        normalized["is_fee_based"] = False
        normalized["fee_evidence"] = [
            {
                "field": "source_pdf_fee_marker_absent",
                "source": "pdf_layout",
                "text": "Fee marker absent from title while PDF legend defines ($) as fee.",
            }
        ]
        normalized["document_key_legends"] = [
            {
                "kind": "fee",
                "marker": "($)",
                "label": "There is a fee associated with this activity.",
                "spans": [{"page": 1, "line": 99, "text": "($) There is a fee associated with this activity."}],
            }
        ]

        promotion = promote_candidates([candidate])

        self.assertEqual([], promotion.review_queue)
        gold = promotion.gold_records[0]
        self.assertEqual("free", gold["price"]["state"])
        fee_claim = next(claim for claim in gold["claims"] if claim["kind"] == "fee")
        self.assertEqual("free", fee_claim["value"])
        self.assertEqual("source_pdf_fee_marker_absent", fee_claim["evidence"][0]["field"])
        self.assertIn("price", gold["field_provenance"])

    def test_disney_visual_price_evidence_marks_riverside_unmarked_rows_free(self) -> None:
        from scripts.ingest.promote_gold import apply_disney_visual_price_evidence

        rows = [
            {
                "calendar_group_key": "port-orleans-riverside",
                "canonical_slug": "campfire-on-de-bayou",
                "price": {"state": "unknown"},
                "claims": {"fee": {"value": "unknown", "evidence": []}},
                "field_provenance": {},
                "source": {},
            },
            {
                "calendar_group_key": "port-orleans-riverside",
                "canonical_slug": "find-a-friend",
                "price": {"state": "unknown"},
                "claims": {"fee": {"value": "unknown", "evidence": []}},
                "field_provenance": {},
                "source": {},
            },
        ]

        enriched = apply_disney_visual_price_evidence(rows)
        by_slug = {row["canonical_slug"]: row for row in enriched}

        self.assertEqual("free", by_slug["campfire-on-de-bayou"]["price"]["state"])
        self.assertEqual(
            "source_disney_image_fee_marker_absent",
            by_slug["campfire-on-de-bayou"]["field_provenance"]["price"][0]["field"],
        )
        self.assertEqual(
            "unknown",
            by_slug["find-a-friend"]["price"]["state"],
            "Find A Friend is not on the Riverside Cool Kid Summer image and must remain unchanged",
        )

    def test_disney_visual_price_evidence_marks_all_star_sports_wellness_free(self) -> None:
        from scripts.ingest.promote_gold import apply_disney_visual_price_evidence

        rows = [
            {
                "calendar_group_key": "all-star-sports",
                "canonical_slug": "wellness-scavenger-hunt",
                "price": {"state": "unknown"},
                "claims": {"fee": {"value": "unknown", "evidence": []}},
                "field_provenance": {},
                "source": {},
            }
        ]

        [enriched] = apply_disney_visual_price_evidence(rows)

        self.assertEqual("free", enriched["price"]["state"])
        self.assertEqual(
            "source_disney_pdf_fee_marker_absent",
            enriched["field_provenance"]["price"][0]["field"],
        )
        self.assertEqual("disney_visual_pdf", enriched["field_provenance"]["price"][0]["source"])
        self.assertIn("All-Star-Sports_Aframe_Recreation-0526_DIGITAL.pdf", enriched["field_provenance"]["price"][0]["source_url"])

    def test_pdf_missing_fee_marker_with_legend_extracts_free_price_evidence(self) -> None:
        candidates = extract_candidates_for_pdf(
            pdf_path=ANIMAL_KINGDOM_JAMBO_PDF,
            calendar_group_key="animal-kingdom-jambo",
        )
        by_slug = {candidate["normalized_fields"]["slug"]: candidate for candidate in candidates}

        for slug in ("campfire", "movie-under-the-stars"):
            with self.subTest(slug=slug):
                normalized = by_slug[slug]["normalized_fields"]
                self.assertFalse(normalized["is_fee_based"])
                self.assertTrue(normalized["fee_evidence"])
                self.assertEqual("source_pdf_fee_marker_absent", normalized["fee_evidence"][0]["field"])

    def test_campfire_matrix_adds_secondary_optional_kit_without_changing_free_state(self) -> None:
        record = {
            "calendar_group_key": "animal-kingdom-jambo",
            "resort_slugs": ["animal-kingdom-lodge"],
            "canonical_slug": "campfire",
            "title": "Campfire",
            "category": "campfire",
            "description": "Enjoy the warm glow of the campfire with complimentary marshmallows. S’mores kits available for purchase.",
            "price": {"state": "free"},
            "claims": {
                "fee": {
                    "value": "free",
                    "evidence": [{"field": "source_pdf_fee_marker_absent", "source": "pdf_layout"}],
                }
            },
            "field_provenance": {"description": [{"page": 1, "line": 32, "text": "S’mores kits available for purchase."}]},
        }

        [enriched] = promote_gold.apply_campfire_price_matrix([record])

        self.assertEqual("free", enriched["price"]["state"])
        [option] = enriched["price"]["options"]
        self.assertEqual("Mickey S'mores Kit", option["optionName"])
        self.assertEqual("optional_add_on", option["priceBasis"])
        self.assertEqual(700, option["priceCentsMin"])
        self.assertEqual("secondary_verified", option["priceConfidence"])
        self.assertEqual("needs_disney_confirmation", option["verificationStatus"])

    def test_campfire_matrix_uses_disney_menu_price_for_fort_wilderness_supplies(self) -> None:
        record = {
            "calendar_group_key": "fort-wilderness",
            "resort_slugs": ["campsites-at-fort-wilderness-resort"],
            "canonical_slug": "chip-n-dales-campfire-sing-a-long",
            "title": "Chip 'n' Dale's Campfire Sing-A-Long",
            "category": "campfire",
            "description": "Join Chip 'n' Dale for a campfire sing-along.",
            "price": {"state": "free"},
            "claims": {
                "fee": {
                    "value": "free",
                    "evidence": [{"field": "official_detail_complimentary", "source": "official_recreation_detail"}],
                }
            },
            "field_provenance": {"description": [{"page": 1, "line": 4, "text": "campfire sing-along"}]},
        }

        [enriched] = promote_gold.apply_campfire_price_matrix([record])

        self.assertEqual("free", enriched["price"]["state"])
        [option] = enriched["price"]["options"]
        self.assertEqual("Fort S'Mores Kit", option["optionName"])
        self.assertEqual(999, option["priceCentsMin"])
        self.assertEqual("disney_menu_verified", option["priceConfidence"])
        self.assertEqual("Disney Chuck Wagon menu", option["sourceLabel"])

    def test_campfire_matrix_does_not_infer_addons_without_disney_purchase_language(self) -> None:
        record = {
            "calendar_group_key": "animal-kingdom-jambo",
            "resort_slugs": ["animal-kingdom-lodge"],
            "canonical_slug": "campfire",
            "title": "Campfire",
            "category": "campfire",
            "description": "Gather around the campfire.",
            "price": {"state": "free"},
            "claims": {
                "fee": {
                    "value": "free",
                    "evidence": [{"field": "source_pdf_fee_marker_absent", "source": "pdf_layout"}],
                }
            },
        }

        [enriched] = promote_gold.apply_campfire_price_matrix([record])

        self.assertEqual("free", enriched["price"]["state"])
        self.assertNotIn("options", enriched["price"])

    def test_discovery_probes_current_q3_animal_kingdom_jambo_pdf(self) -> None:
        candidates = discover.probe_cdn_candidates("animal-kingdom-jambo", ["0526"])

        self.assertIn(
            "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q3/DAKL_Aframe_Recreation-0526_Jambo_DIGITAL.pdf",
            candidates,
        )

    def test_discovery_prefers_newer_probe_even_when_manifest_url_is_reachable(self) -> None:
        source = ActivitySource(
            "animal-kingdom-jambo",
            ("animal-kingdom-lodge",),
            "https://disneyworld.disney.go.com/resorts/animal-kingdom-lodge/recreation/",
            "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q1/DAKL_Aframe_Recreation_0126_Jambo.pdf",
            "fy26-q1-0126-jambo",
        )

        def fake_head(url: str) -> dict:
            return {"http_status": 200, "etag": "q3" if "0526" in url else "q1"}

        def fake_exists(url: str) -> bool:
            return "0526_Jambo_DIGITAL.pdf" in url

        with patch.object(discover, "head_metadata", side_effect=fake_head), patch.object(
            discover,
            "check_url_exists",
            side_effect=fake_exists,
        ):
            result = discover.discover_source(source, use_playwright=False)

        self.assertEqual("url_changed", result["status"])
        self.assertIn("fy26-q3", result["discovered_url"])
        self.assertIn("0526_Jambo_DIGITAL.pdf", result["discovered_url"])

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
        preserve_source_migration = Path(
            "supabase/migrations/20260626001548_preserve_gold_source_evidence.sql"
        ).read_text()
        self.assertIn("add column if not exists source jsonb", preserve_source_migration)
        self.assertIn("source->'documentKeyLegends'", preserve_source_migration)
        self.assertIn("gold_missing_structured_source", preserve_source_migration)
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
                self.assertEqual("source_unspecified", offering["availability"]["hours_state"])
                self.assertEqual("Hours not specified by Disney", offering["availability"]["label"])
                self.assertEqual("unknown", offering["claims"]["walkability"]["value"])
                self.assertEqual("unknown", offering["claims"]["transportation"]["value"])
                self.assertTrue(offering["field_provenance"]["resort_join"])
                self.assertTrue(offering["field_provenance"]["title"])

    def test_wilderness_back_trail_adventure_uses_dedicated_events_tours_page(self) -> None:
        source_url = "https://disneyworld.disney.go.com/events-tours/cabins-at-fort-wilderness-resort/wilderness-back-trail-adventure/"
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_detail",
                "source_url": source_url,
                "source_web_sha256": "7" * 64,
                "source_path": "data/raw/web/official-html-wilderness-back-trail-adventure.snapshot.json",
                "lines": [
                    {"line": 1, "text": "Wilderness Back Trail Adventure | Walt Disney World Resort"},
                    {"line": 2, "text": "Wilderness Back Trail Adventure"},
                    {
                        "line": 4,
                        "text": "Experience nature the high-tech way as you explore Disney’s Fort Wilderness Resort and beyond on a Segway® X2. Guests must be 16 years of age or older and have a valid photo ID to participate.",
                    },
                    {"line": 5, "text": "$90–$99 per Person (tax not included)"},
                    {"line": 7, "text": "Operating Hours –"},
                    {"line": 8, "text": "8:30 AM"},
                    {"line": 9, "text": "Check Available Days"},
                    {"line": 21, "text": "Due to Segway design specifications, riders must weigh 100 to 250 pounds to participate. Riders should be in good general health and able to stand for the duration of the tour."},
                    {"line": 22, "text": "Guests must be 16 years of age or older with a valid photo ID and will be asked to sign a waiver. Helmets are required."},
                    {"line": 23, "text": "Wilderness Back Trail Adventure is a 2-hour outdoor tour, so be sure to check the weather forecast and dress appropriately."},
                    {"line": 27, "text": "Please check in at the Bike Barn at Disney’s Fort Wilderness Resort 15 minutes prior to your tour."},
                    {"line": 28, "text": "There is a 24-hour cancellation policy. Full price will be charged/forfeited if the Guest cancels within one day or fails to show up for the reservation."},
                    {"line": 30, "text": "Make a Reservation"},
                ],
            }
        )

        offerings = {
            offering["resort_slug"]: offering
            for offering in result["offerings"]
            if offering["program_key"] == "wilderness-back-trail-adventure"
        }

        self.assertIn("cabins-at-fort-wilderness-resort", offerings)
        self.assertIn("campsites-at-fort-wilderness-resort", offerings)
        cabins = offerings["cabins-at-fort-wilderness-resort"]
        self.assertEqual(source_url, cabins["source_url"])
        self.assertEqual("Bike Barn", cabins["location"]["label"])
        self.assertEqual(
            {
                "state": "fee",
                "notes": "$90–$99 per Person (tax not included)",
                "minAmountCents": 9000,
                "maxAmountCents": 9900,
                "priceBasis": "per_person",
                "taxNotes": "tax not included",
            },
            cabins["price"],
        )
        self.assertEqual("8:30 AM; available days vary", cabins["availability"]["label"])
        self.assertTrue(cabins["booking"]["reservation_required"])
        self.assertEqual(24, cabins["booking"]["cancellation_notice_hours"])
        self.assertEqual(15, cabins["booking"]["check_in_offset_minutes"])
        self.assertEqual(16, cabins["eligibility"]["age_minimum"])
        self.assertEqual(100, cabins["eligibility"]["weight_pounds_min"])
        self.assertEqual(250, cabins["eligibility"]["weight_pounds_max"])
        self.assertTrue(cabins["eligibility"]["photo_id_required"])
        self.assertTrue(cabins["eligibility"]["waiver_required"])
        self.assertTrue(cabins["eligibility"]["helmet_required"])
        self.assertEqual(5, cabins["field_provenance"]["price"][0]["line"])

    def test_official_recreation_detail_extracts_free_and_paid_price_evidence(self) -> None:
        result = extract_official_recreation_offerings(
            [
                {
                    "source_kind": "official_recreation_detail",
                    "slug": "campfires",
                    "source_url": "https://disneyworld.disney.go.com/recreation/campfires/",
                    "source_web_sha256": "f" * 64,
                    "lines": [
                        {"line": 1, "text": "Campfires | Walt Disney World Resort"},
                        {"line": 2, "text": "Campfires"},
                        {
                            "line": 7,
                            "text": "Celebrate the great outdoors with complimentary campfire activities all across Walt Disney World Resort.",
                        },
                        {"line": 8, "text": "Disney's Old Key West Resort"},
                    ],
                },
                {
                    "source_kind": "official_recreation_detail",
                    "slug": "arcades",
                    "source_url": "https://disneyworld.disney.go.com/recreation/arcades/",
                    "source_web_sha256": "a" * 64,
                    "lines": [
                        {"line": 1, "text": "Arcades | Walt Disney World Resort"},
                        {"line": 2, "text": "Arcades"},
                        {"line": 8, "text": "Disney's All-Star Movies Resort"},
                        {
                            "line": 9,
                            "text": "To play games, you must first purchase a Game Card and add game points using a credit card or cash at a kiosk inside the arcade.",
                        },
                    ],
                },
            ]
        )

        by_program = {offering["program_key"]: offering for offering in result["offerings"]}
        self.assertEqual("free", by_program["campfires"]["price"]["state"])
        self.assertEqual(
            "Celebrate the great outdoors with complimentary campfire activities all across Walt Disney World Resort.",
            by_program["campfires"]["price"]["notes"],
        )
        self.assertEqual(7, by_program["campfires"]["field_provenance"]["price"][0]["line"])
        self.assertEqual("fee", by_program["arcades"]["price"]["state"])
        self.assertEqual(9, by_program["arcades"]["field_provenance"]["price"][0]["line"])

    def test_official_recreation_index_price_facets_do_not_override_detail_price_evidence(self) -> None:
        result = extract_official_recreation_offerings(
            [
                {
                    "source_kind": "official_recreation_detail",
                    "slug": "movies-under-the-stars",
                    "source_url": "https://disneyworld.disney.go.com/recreation/movies-under-the-stars/",
                    "source_web_sha256": "m" * 64,
                    "lines": [
                        {"line": 1, "text": "Movies Under the Stars | Walt Disney World Resort"},
                        {"line": 2, "text": "Movies Under the Stars"},
                        {"line": 3, "text": "MultipleWalt Disney World® Resortlocations"},
                        {
                            "line": 8,
                            "text": "Complimentary movie screenings are available to Guests of Walt Disney World Resort hotels.",
                        },
                    ],
                },
                {
                    "source_kind": "official_recreation_index_api",
                    "source_url": "https://disneyworld.disney.go.com/recreation/",
                    "source_web_sha256": "i" * 64,
                    "results": [
                        {
                            "urlFriendlyId": "movies-under-the-stars",
                            "name": "Movies Under the Stars",
                            "url": "/recreation/movies-under-the-stars/",
                            "locationsList": {
                                "80010402;entityType=resort": "Disney's All-Star Movies Resort",
                            },
                            "facets": {
                                "eec-price": [
                                    "one-hundred-to-two-hundred-dollars",
                                    "above-two-hundred-dollars",
                                ],
                            },
                        }
                    ],
                },
            ]
        )

        [offering] = result["offerings"]
        self.assertEqual("free", offering["price"]["state"])
        self.assertEqual(8, offering["field_provenance"]["price"][0]["line"])

    def test_official_recreation_fort_wilderness_campfire_adds_disney_menu_optional_kit(self) -> None:
        result = extract_official_recreation_offerings(
            [
                {
                    "source_kind": "official_recreation_detail",
                    "slug": "chip-n-dales-campfire-sing-a-long",
                    "source_url": "https://disneyworld.disney.go.com/recreation/chip-n-dales-campfire-sing-a-long/",
                    "source_web_sha256": "c" * 64,
                    "lines": [
                        {"line": 1, "text": "Chip 'n' Dale's Campfire Sing-A-Long | Walt Disney World Resort"},
                        {"line": 2, "text": "Chip 'n' Dale's Campfire Sing-A-Long"},
                        {
                            "line": 4,
                            "text": "Join nutty friends Chip 'n' Dale for a nightly campfire celebration, followed by a classic Disney movie under the stars.",
                        },
                        {
                            "line": 12,
                            "text": "The campfire sing-along and outdoor movie are complimentary and held nightly as weather permits.",
                        },
                        {
                            "line": 13,
                            "text": "For movie schedules, please check with the Front Desk at Disney's Fort Wilderness Resort & Campground, or call (407) 939-7529.",
                        },
                    ],
                }
            ]
        )

        [offering] = result["offerings"]
        self.assertEqual("free", offering["price"]["state"])
        [option] = offering["price"]["options"]
        self.assertEqual("Fort S'Mores Kit", option["optionName"])
        self.assertEqual(999, option["priceCentsMin"])
        self.assertEqual("disney_menu_verified", option["priceConfidence"])
        self.assertEqual("Disney Chuck Wagon menu", option["sourceLabel"])

    def test_official_recreation_resort_amenities_extract_as_free_without_fee_language(self) -> None:
        result = extract_official_recreation_offerings(
            [
                {
                    "source_kind": "official_recreation_detail",
                    "slug": "playgrounds",
                    "source_url": "https://disneyworld.disney.go.com/recreation/playgrounds/",
                    "source_web_sha256": "p" * 64,
                    "lines": [
                        {"line": 1, "text": "Playgrounds | Walt Disney World Resort"},
                        {"line": 2, "text": "Playgrounds"},
                        {
                            "line": 4,
                            "text": "Kids can climb, slide and play at outdoor playgrounds at select Disney Resort hotels.",
                        },
                        {"line": 8, "text": "Disney's Port Orleans Resort - Riverside"},
                    ],
                },
                {
                    "source_kind": "official_recreation_resort_page",
                    "resort_slug": "campsites-at-fort-wilderness-resort",
                    "source_url": "https://disneyworld.disney.go.com/resorts/campsites-at-fort-wilderness-resort/recreation/",
                    "source_web_sha256": "b" * 64,
                    "lines": [
                        {"line": 272, "text": "* ## Basketball Courts"},
                        {
                            "line": 273,
                            "text": "Shoot some hoops at one of several basketball courts located throughout Disney’s Fort Wilderness Resort & Campground.",
                        },
                    ],
                },
            ]
        )

        by_program = {offering["program_key"]: offering for offering in result["offerings"]}
        self.assertEqual("free", by_program["playgrounds"]["price"]["state"])
        self.assertEqual("free", by_program["basketball-courts"]["price"]["state"])
        self.assertEqual(
            "source_disney_official_resort_amenity_no_fee_language",
            by_program["playgrounds"]["field_provenance"]["price"][0]["field"],
        )
        self.assertEqual(
            "source_disney_official_resort_amenity_no_fee_language",
            by_program["basketball-courts"]["field_provenance"]["price"][0]["field"],
        )

    def test_official_recreation_detail_extracts_paid_booking_and_rate_language(self) -> None:
        result = extract_official_recreation_offerings(
            [
                {
                    "source_kind": "official_recreation_detail",
                    "slug": "surrey-bikes",
                    "source_url": "https://disneyworld.disney.go.com/recreation/surrey-bikes/",
                    "source_web_sha256": "s" * 64,
                    "lines": [
                        {"line": 1, "text": "Surrey Bikes | Walt Disney World Resort"},
                        {"line": 2, "text": "Surrey Bikes"},
                        {
                            "line": 4,
                            "text": "Cover more ground when you rent a bicycle to explore waterfront boardwalks and woodsy pathways.",
                        },
                        {"line": 9, "text": "Disney’s BoardWalk Inn"},
                    ],
                },
                {
                    "source_kind": "official_recreation_detail",
                    "slug": "fishing",
                    "source_url": "https://disneyworld.disney.go.com/recreation/fishing/",
                    "source_web_sha256": "g" * 64,
                    "lines": [
                        {"line": 1, "text": "Fishing | Walt Disney World Resort"},
                        {"line": 2, "text": "Fishing Excursions"},
                        {
                            "line": 8,
                            "text": "Both 2-hour and 4-hour excursions are offered. An extra hour may be added in person at the Marina—subject to availability. Solo anglers may book an afternoon excursion at a reduced rate.",
                        },
                        {"line": 18, "text": "Disney's Fort Wilderness Resort & Campground"},
                    ],
                },
                {
                    "source_kind": "official_recreation_detail",
                    "slug": "oak-trail-golf-course",
                    "source_url": "https://disneyworld.disney.go.com/recreation/oak-trail-golf-course/",
                    "source_web_sha256": "o" * 64,
                    "lines": [
                        {"line": 1, "text": "Oak Trail Golf Course | Walt Disney World Resort"},
                        {"line": 2, "text": "Disney's Oak Trail Golf Course"},
                        {"line": 3, "text": "LocatedinDisney's Polynesian Village Resort"},
                        {"line": 10, "text": "Book Tee Time"},
                    ],
                },
                {
                    "source_kind": "official_recreation_detail",
                    "slug": "professional-golf-lessons",
                    "source_url": "https://disneyworld.disney.go.com/recreation/professional-golf-lessons/",
                    "source_web_sha256": "l" * 64,
                    "lines": [
                        {"line": 1, "text": "Professional Golf Lessons | Walt Disney World Resort"},
                        {"line": 2, "text": "Golf Lessons"},
                        {
                            "line": 14,
                            "text": "Lessons include 45 minutes of private instruction, including video analysis where appropriate, plus golf club rental and shoe rental. Guests of all ages are welcome, and junior golfers 17 years of age and under enjoy a lower rate.",
                        },
                        {"line": 15, "text": "Disney's Polynesian Village Resort"},
                    ],
                },
            ]
        )

        by_program = {offering["program_key"]: offering for offering in result["offerings"]}
        self.assertEqual("fee", by_program["surrey-bikes"]["price"]["state"])
        self.assertEqual(4, by_program["surrey-bikes"]["field_provenance"]["price"][0]["line"])
        self.assertEqual("fee", by_program["fishing-excursions"]["price"]["state"])
        self.assertEqual(8, by_program["fishing-excursions"]["field_provenance"]["price"][0]["line"])
        self.assertEqual("fee", by_program["disneys-oak-trail-golf-course"]["price"]["state"])
        self.assertEqual(10, by_program["disneys-oak-trail-golf-course"]["field_provenance"]["price"][0]["line"])
        self.assertEqual("fee", by_program["golf-lessons"]["price"]["state"])
        self.assertEqual(14, by_program["golf-lessons"]["field_provenance"]["price"][0]["line"])

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

    def test_official_recreation_detail_rows_win_over_parent_index_duplicates(self) -> None:
        result = extract_official_recreation_offerings(
            [
                {
                    "source_kind": "official_recreation_detail",
                    "slug": "cabanas",
                    "source_url": "https://disneyworld.disney.go.com/recreation/cabanas/",
                    "source_web_sha256": "c" * 64,
                    "lines": [
                        {"line": 1, "text": "Cabana Rentals | Walt Disney World Resort"},
                        {"line": 2, "text": "Cabanas"},
                        {"line": 3, "text": "MultipleWalt Disney World® Resortlocations"},
                        {
                            "line": 4,
                            "text": "Indulge in the comfort and privacy of premium poolside cabanas at select Disney Resort hotels.",
                        },
                        {
                            "line": 10,
                            "text": "Cabanas at Disney's Contemporary Resort and Disney's Grand Floridian Resort & Spa—as well as those shared by Disney’s Beach Club Resort and Disney’s Yacht Club Resort—are available to Guests of those Resorts only.",
                        },
                        {"line": 14, "text": "Disney's Contemporary Resort"},
                        {"line": 23, "text": "Disney's Grand Floridian Resort & Spa"},
                        {"line": 33, "text": "Disney’s Yacht Club Resort and Beach Club Resort"},
                        {"line": 34, "text": "Dedicated Cast Member providing service to the cabanas"},
                        {"line": 40, "text": "Mini refrigerator stocked with complimentary sodas and water"},
                        {
                            "line": 46,
                            "text": "Advance reservations are highly recommended as cabanas book quickly.",
                        },
                    ],
                },
                {
                    "source_kind": "official_recreation_index_api",
                    "source_url": "https://disneyworld.disney.go.com/recreation/",
                    "source_web_sha256": "i" * 64,
                    "results": [
                        {
                            "urlFriendlyId": "cabanas",
                            "name": "Cabanas",
                            "locationName": "Multiple Locations",
                            "locationsList": {
                                "80010385;entityType=resort": "Disney's Contemporary Resort",
                                "80010384;entityType=resort": "Disney's Grand Floridian Resort & Spa",
                                "80010390;entityType=resort": "Disney's Yacht Club Resort",
                            },
                            "parkLocations": {
                                "80010390;entityType=resort": {
                                    "name": "Cabana Rentals at Stormalong Bay",
                                },
                            },
                        }
                    ],
                },
            ]
        )

        self.assertEqual([], result["quarantine"])
        by_pair = {(offering["program_key"], offering["resort_slug"]) for offering in result["offerings"]}
        self.assertEqual(
            {
                ("cabanas", "contemporary-resort"),
                ("cabanas", "grand-floridian-resort-and-spa"),
                ("cabanas", "beach-club-resort"),
                ("cabanas", "yacht-club-resort"),
            },
            by_pair,
        )
        yacht_rows = [
            offering
            for offering in result["offerings"]
            if offering["program_key"] == "cabanas" and offering["resort_slug"] == "yacht-club-resort"
        ]
        self.assertEqual(1, len(yacht_rows))
        self.assertEqual("shared-beach-yacht-club", yacht_rows[0]["variant_key"])
        self.assertNotIn(
            "cabanas:yacht-club-resort:yacht-club-resort",
            {offering["offering_key"] for offering in result["offerings"]},
        )

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
        self.assertEqual("source_unspecified", offering["availability"]["hours_state"])
        self.assertEqual("Hours not specified by Disney", offering["availability"]["label"])
        self.assertEqual("resort_page_context", offering["field_provenance"]["resort_join"][0]["source"])

    def test_official_recreation_generator_includes_resort_page_snapshots_without_inventing_hours(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            snapshot_dir = Path(tmp)
            (snapshot_dir / "fort-wilderness-recreation-page.snapshot.json").write_text(
                json.dumps(
                    {
                        "source_kind": "official_recreation_resort_page",
                        "source_url": "https://disneyworld.disney.go.com/resorts/campsites-at-fort-wilderness-resort/recreation/",
                        "lines": [
                            {"line": 211, "text": "## Recreation"},
                            {"line": 258, "text": "* ## Bike Rentals"},
                            {
                                "line": 260,
                                "text": "Grab a rental from the Bike Barn and cycle through pine forests and meadows teeming with wildlife.",
                            },
                            {"line": 272, "text": "* ## Basketball Courts"},
                            {
                                "line": 273,
                                "text": "Shoot some hoops at one of several basketball courts located throughout Disney’s Fort Wilderness Resort & Campground.",
                            },
                        ],
                    }
                )
            )

            result = generate_official_recreation_offerings(snapshot_dir)

        self.assertEqual([], result["quarantine"])
        self.assertEqual(["basketball-courts"], [program["program_key"] for program in result["programs"]])
        self.assertNotIn("bike-rentals", {program["program_key"] for program in result["programs"]})
        offering = result["offerings"][0]
        self.assertEqual("basketball-courts", offering["program_key"])
        self.assertEqual("campsites-at-fort-wilderness-resort", offering["resort_slug"])
        self.assertEqual("free", offering["price"]["state"])
        self.assertEqual(
            "source_disney_official_resort_amenity_no_fee_language",
            offering["field_provenance"]["price"][0]["field"],
        )
        self.assertEqual("source_unspecified", offering["availability"]["hours_state"])
        self.assertEqual("Hours not specified by Disney", offering["availability"]["label"])
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

    def test_official_recreation_index_extracts_multi_resort_item_without_detail_url(self) -> None:
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_index_api",
                "source_url": "https://disneyworld.disney.go.com/recreation/",
                "api_url": "https://disneyworld.disney.go.com/finder/api/v1/explorer-service/list-ancestor-entities/wdw/80007798%3BentityType%3Ddestination/2026-06-23/recreation",
                "source_web_sha256": "i" * 64,
                "results": [
                    {
                        "id": "17031169;entityType=recreation-activity",
                        "name": "Community Halls",
                        "locationName": "Multiple Locations",
                        "locationsList": {
                            "273239;entityType=resort": "Disney's Animal Kingdom Villas - Kidani Village",
                            "80010385;entityType=resort": "Disney's Contemporary Resort",
                            "80010391;entityType=resort": "Disney's BoardWalk Villas",
                        },
                        "parkLocations": {
                            "273239;entityType=resort": {
                                "name": "Community Hall - Animal Kingdom Lodge - Kidani Village",
                            },
                            "80010385;entityType=resort": {
                                "name": "Community Hall - Bay Lake Tower at Disney's Contemporary Resort",
                            },
                            "80010391;entityType=resort": {
                                "name": "Ferris W. Eahlers Community Hall",
                            },
                        },
                        "facets": {
                            "activityType": ["resort-special"],
                            "age": ["all-ages"],
                        },
                    }
                ],
            }
        )

        self.assertEqual([], result["quarantine"])
        self.assertEqual(["community-halls"], [program["program_key"] for program in result["programs"]])
        self.assertEqual(
            {
                "animal-kingdom-villas-kidani-village",
                "boardwalk-villas",
                "contemporary-resort",
            },
            {offering["resort_slug"] for offering in result["offerings"]},
        )
        contemporary = next(
            offering for offering in result["offerings"] if offering["resort_slug"] == "contemporary-resort"
        )
        self.assertEqual(
            "Community Hall - Bay Lake Tower at Disney's Contemporary Resort",
            contemporary["location"]["label"],
        )
        self.assertEqual("official_recreation_index_api", contemporary["field_provenance"]["resort_join"][0]["source"])

    def test_official_recreation_detail_canonicalizes_resort_pool_pages(self) -> None:
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_detail",
                "source_url": "https://disneyworld.disney.go.com/recreation/contemporary-resort/pools-contemporary-resort/",
                "source_web_sha256": "p" * 64,
                "lines": [
                    {"line": 1, "text": "Pools at Disney's Contemporary Resort | Walt Disney World Resort"},
                    {"line": 2, "text": "Pools at Disney's Contemporary Resort"},
                    {"line": 3, "text": "MultipleWalt Disney World® Resortlocations"},
                    {
                        "line": 4,
                        "text": "Enjoy heated pools and much more on the shores of Bay Lake. Hours and lifeguard availability vary by pool and are subject to change.",
                    },
                    {
                        "line": 7,
                        "text": "From a waterslide to our relaxing spas, there’s something fun for everyone at Disney’s Contemporary Resort.",
                    },
                ],
            }
        )

        self.assertEqual([], result["quarantine"])
        self.assertEqual(["pools"], [program["program_key"] for program in result["programs"]])
        offering = result["offerings"][0]
        self.assertEqual("pools:contemporary-resort:contemporary-resort", offering["offering_key"])
        self.assertEqual("Pools at Disney's Contemporary Resort", offering["title"])
        self.assertEqual("poolside", offering["category"])
        self.assertEqual("free", offering["price"]["state"])
        self.assertEqual(
            "source_disney_official_resort_amenity_no_fee_language",
            offering["field_provenance"]["price"][0]["field"],
        )
        self.assertEqual("evergreen_hours", offering["availability"]["kind"])
        self.assertEqual("hours_vary_by_pool", offering["availability"]["hours_state"])

    def test_official_recreation_detail_marks_currently_unavailable_offering(self) -> None:
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_detail",
                "source_url": "https://disneyworld.disney.go.com/recreation/holiday-sleigh-rides/",
                "source_web_sha256": "u" * 64,
                "lines": [
                    {"line": 1, "text": "Holiday Sleigh Rides at Fort Wilderness Resort | Walt Disney World Resort"},
                    {"line": 2, "text": "Horse Drawn Excursion - Holiday Sleigh Rides"},
                    {"line": 3, "text": "LocatedinThe Campsites at Disney's Fort Wilderness Resort"},
                    {
                        "line": 4,
                        "text": "The 2025 offering has concluded. Check back this summer for updates on the 2026 holiday season.",
                    },
                    {
                        "line": 8,
                        "text": "Horse Drawn Excursion - Holiday Sleigh Rides are currently unavailable.",
                    },
                ],
            }
        )

        self.assertEqual([], result["quarantine"])
        offering = result["offerings"][0]
        self.assertEqual("calendar_dependent", offering["availability"]["kind"])
        self.assertEqual("currently_unavailable", offering["availability"]["hours_state"])
        self.assertIn("Currently unavailable", offering["availability"]["label"])

    def test_official_recreation_index_canonicalizes_resort_named_rentals(self) -> None:
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_index_api",
                "source_url": "https://disneyworld.disney.go.com/recreation/",
                "source_web_sha256": "r" * 64,
                "results": [
                    {
                        "urlFriendlyId": "canoes",
                        "name": "Canoe Rentals at Disney's Fort Wilderness Resort and Campground",
                        "locationsList": {
                            "80010392;entityType=resort": "The Campsites at Disney's Fort Wilderness Resort",
                        },
                    }
                ],
            }
        )

        self.assertEqual(["canoe-rentals"], [program["program_key"] for program in result["programs"]])
        self.assertEqual(
            ["canoe-rentals:campsites-at-fort-wilderness-resort:campsites-at-fort-wilderness-resort"],
            [offering["offering_key"] for offering in result["offerings"]],
        )

    def test_official_recreation_detail_enriches_parent_index_resort_joins(self) -> None:
        result = extract_official_recreation_offerings(
            [
                {
                    "source_kind": "official_recreation_detail",
                    "source_url": "https://disneyworld.disney.go.com/recreation/movies-under-the-stars/",
                    "source_web_sha256": "m" * 64,
                    "lines": [
                        {"line": 1, "text": "Movies Under the Stars | Walt Disney World Resort"},
                        {"line": 2, "text": "Movies Under the Stars"},
                        {"line": 3, "text": "MultipleWalt Disney World® Resortlocations"},
                        {
                            "line": 4,
                            "text": "Cozy up for a favorite Disney film shown outside in the fresh evening air.",
                        },
                        {
                            "line": 5,
                            "text": "For movie schedules, please check with the Front Desk. Movies and entertainment are subject to cancellation or change without notice.",
                        },
                    ],
                },
                {
                    "source_kind": "official_recreation_index_api",
                    "source_url": "https://disneyworld.disney.go.com/recreation/",
                    "source_web_sha256": "i" * 64,
                    "results": [
                        {
                            "urlFriendlyId": "movies-under-the-stars",
                            "name": "Movies Under the Stars",
                            "url": "/recreation/movies-under-the-stars/",
                            "locationsList": {
                                "1;entityType=resort": "Bay Lake Tower at Disney's Contemporary Resort",
                                "80010402;entityType=resort": "Disney's All-Star Movies Resort",
                            },
                        }
                    ],
                },
            ]
        )

        self.assertEqual([], result["quarantine"])
        self.assertEqual(["movies-under-the-stars"], [program["program_key"] for program in result["programs"]])
        self.assertEqual(
            {
                "bay-lake-tower-at-contemporary-resort",
                "all-star-movies-resort",
            },
            {offering["resort_slug"] for offering in result["offerings"]},
        )
        for offering in result["offerings"]:
            with self.subTest(resort=offering["resort_slug"]):
                self.assertEqual(
                    "Cozy up for a favorite Disney film shown outside in the fresh evening air.",
                    offering["description"],
                )
                self.assertEqual("calendar_dependent", offering["availability"]["kind"])
                self.assertEqual("calendar_varies", offering["availability"]["hours_state"])
                self.assertTrue(offering["field_provenance"]["description"])
                self.assertEqual(
                    "https://disneyworld.disney.go.com/recreation/movies-under-the-stars/",
                    offering["field_provenance"]["description"][0]["source_url"],
                )

    def test_official_recreation_detail_prefers_specific_venue_over_generic_resort_location(self) -> None:
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_detail",
                "source_url": "https://disneyworld.disney.go.com/recreation/fort-wilderness-resort/canoe-rentals/",
                "source_web_sha256": "c" * 64,
                "lines": [
                    {"line": 1, "text": "Canoes | Walt Disney World Resort"},
                    {"line": 2, "text": "Canoe Rentals at Disney's Fort Wilderness Resort and Campground"},
                    {"line": 3, "text": "LocatedinWalt Disney World® Resort"},
                    {"line": 4, "text": "Discover adventure around every bend as you explore nearby inlets and waterways."},
                    {"line": 7, "text": "Canoe Rentals"},
                    {"line": 8, "text": "Set off on your own excursion along the tranquil waters of Disney’s Fort Wilderness Resort."},
                    {"line": 9, "text": "Rental location: The Bike Barn at the Meadow Recreation Area"},
                    {"line": 10, "text": "Hours: 9:00 AM and 5:00 PM daily"},
                ],
            }
        )

        self.assertEqual([], result["quarantine"])
        self.assertEqual(
            "The Bike Barn at the Meadow Recreation Area",
            result["offerings"][0]["location"]["label"],
        )

    def test_official_recreation_detail_extracts_specific_marina_locations(self) -> None:
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_detail",
                "source_url": "https://disneyworld.disney.go.com/recreation/fireworks-cruises/",
                "source_web_sha256": "f" * 64,
                "lines": [
                    {"line": 1, "text": "Firework Cruises | Walt Disney World Resort"},
                    {"line": 2, "text": "Fireworks Cruises"},
                    {
                        "line": 3,
                        "text": "Charter a private watercraft and set sail on a relaxing specialty cruise from one of the Walt Disney World marinas to enjoy a stunning fireworks show.",
                    },
                    {
                        "line": 17,
                        "text": "Sail from the Boat Nook Marina at Disney’s Contemporary Resort to view Happily Ever After.",
                    },
                    {
                        "line": 39,
                        "text": "Depart on your cruise from the Bayside Marina at Disney’s Yacht & Beach Club Resorts.",
                    },
                    {"line": 54, "text": "Check available cruise days."},
                ],
            }
        )

        by_resort = {offering["resort_slug"]: offering for offering in result["offerings"]}
        self.assertEqual("Boat Nook Marina", by_resort["contemporary-resort"]["location"]["label"])
        self.assertEqual("Bayside Marina", by_resort["beach-club-resort"]["location"]["label"])
        self.assertEqual("Bayside Marina", by_resort["yacht-club-resort"]["location"]["label"])
        self.assertEqual(
            "Charter a private watercraft and set sail on a relaxing specialty cruise from one of the Walt Disney World marinas to enjoy a stunning fireworks show.",
            by_resort["contemporary-resort"]["description"],
        )

    def test_official_recreation_detail_skips_sponsor_line_for_description(self) -> None:
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_detail",
                "source_url": "https://disneyworld.disney.go.com/recreation/movies-under-the-stars/",
                "source_web_sha256": "m" * 64,
                "lines": [
                    {"line": 1, "text": "Movies Under the Stars | Walt Disney World Resort"},
                    {"line": 2, "text": "Movies Under the Stars"},
                    {"line": 3, "text": "MultipleWalt Disney World® Resortlocations"},
                    {"line": 4, "text": "Presented by M&M’S®"},
                    {
                        "line": 5,
                        "text": "Cozy up for a favorite Disney film shown outside in the fresh evening air.",
                    },
                ],
            }
        )

        self.assertEqual(
            "Cozy up for a favorite Disney film shown outside in the fresh evening air.",
            result["programs"][0]["description"],
        )

    def test_official_recreation_detail_does_not_use_schedule_contact_text_as_location(self) -> None:
        result = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_detail",
                "source_url": "https://disneyworld.disney.go.com/recreation/chip-n-dale-campfire-sing-a-long/",
                "source_web_sha256": "d" * 64,
                "lines": [
                    {"line": 1, "text": "Chip 'n' Dale's Campfire Sing-A-Long | Walt Disney World Resort"},
                    {"line": 2, "text": "Chip 'n' Dale's Campfire Sing-A-Long"},
                    {"line": 3, "text": "LocatedinWalt Disney World® Resort"},
                    {
                        "line": 4,
                        "text": "Join nutty friends Chip 'n' Dale for a nightly campfire celebration, followed by a classic Disney movie under the stars.",
                    },
                    {
                        "line": 13,
                        "text": "For movie schedules, please check with the Front Desk at Disney’s Fort Wilderness Resort & Campground, or call (407) 939-7529.",
                    },
                ],
            }
        )

        self.assertEqual([], result["quarantine"])
        self.assertEqual(
            "Chip 'n' Dale's Campfire Sing-A-Long",
            result["offerings"][0]["location"]["label"],
        )

    def test_official_recreation_parent_coverage_fails_missing_joinable_item(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            index_path = tmp_path / "official-recreation-index-api.snapshot.json"
            index_path.write_text(
                json.dumps(
                    {
                        "source_kind": "official_recreation_index_api",
                        "source_url": "https://disneyworld.disney.go.com/recreation/",
                        "api_url": "https://disneyworld.disney.go.com/finder/api/v1/explorer-service/list-ancestor-entities/wdw/80007798%3BentityType%3Ddestination/2026-06-23/recreation",
                        "content_sha256": "c" * 64,
                        "results": [
                            {
                                "urlFriendlyId": "bike-rentals",
                                "name": "Bike Rentals",
                                "locationsList": {
                                    "80010387;entityType=resort": "Disney's Old Key West Resort",
                                },
                            }
                        ],
                    }
                )
            )
            offerings_path = tmp_path / "official_recreation_offerings.json"
            offerings_path.write_text(json.dumps({"programs": [], "offerings": [], "quarantine": []}))

            audit = build_official_recreation_coverage_audit(index_path, offerings_path)

        self.assertFalse(audit.passed)
        self.assertIn("official_recreation:missing_joinable:bike-rentals", audit.errors)

    def test_official_recreation_parent_coverage_fails_missing_joinable_resort(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            index_path = tmp_path / "official-recreation-index-api.snapshot.json"
            index_path.write_text(
                json.dumps(
                    {
                        "source_kind": "official_recreation_index_api",
                        "source_url": "https://disneyworld.disney.go.com/recreation/",
                        "api_url": "https://disneyworld.disney.go.com/finder/api/v1/explorer-service/list-ancestor-entities/wdw/80007798%3BentityType%3Ddestination/2026-06-23/recreation",
                        "content_sha256": "c" * 64,
                        "results": [
                            {
                                "urlFriendlyId": "bike-rentals",
                                "name": "Bike Rentals",
                                "locationsList": {
                                    "80010387;entityType=resort": "Disney's Old Key West Resort",
                                    "80010397;entityType=resort": "Disney's Port Orleans Resort - Riverside",
                                },
                            }
                        ],
                    }
                )
            )
            offerings_path = tmp_path / "official_recreation_offerings.json"
            offerings_path.write_text(
                json.dumps(
                    {
                        "programs": [{"program_key": "bike-rentals"}],
                        "offerings": [
                            {
                                "program_key": "bike-rentals",
                                "resort_slug": "old-key-west-resort",
                            }
                        ],
                        "quarantine": [],
                    }
                )
            )

            audit = build_official_recreation_coverage_audit(index_path, offerings_path)

        self.assertFalse(audit.passed)
        self.assertIn(
            "official_recreation:missing_joinable:bike-rentals:port-orleans-resort-riverside",
            audit.errors,
        )

    def test_official_recreation_coverage_fails_published_offering_without_resort_join(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            index_path = tmp_path / "official-recreation-index-api.snapshot.json"
            index_path.write_text(
                json.dumps(
                    {
                        "source_kind": "official_recreation_index_api",
                        "source_url": "https://disneyworld.disney.go.com/recreation/",
                        "content_sha256": "c" * 64,
                        "results": [],
                    }
                )
            )
            offerings_path = tmp_path / "official_recreation_offerings.json"
            offerings_path.write_text(
                json.dumps(
                    {
                        "programs": [{"program_key": "bike-rentals"}],
                        "offerings": [
                            {
                                "offering_key": "bike-rentals:missing",
                                "program_key": "bike-rentals",
                                "resort_slug": "",
                                "field_provenance": {},
                            }
                        ],
                        "quarantine": [],
                    }
                )
            )

            audit = build_official_recreation_coverage_audit(index_path, offerings_path)

        self.assertFalse(audit.passed)
        self.assertIn(
            "official_recreation:offering_missing_resort_join:bike-rentals:missing",
            audit.errors,
        )

    def test_official_recreation_coverage_fails_unsourced_availability_label(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            index_path = tmp_path / "official-recreation-index-api.snapshot.json"
            index_path.write_text(
                json.dumps(
                    {
                        "source_kind": "official_recreation_index_api",
                        "source_url": "https://disneyworld.disney.go.com/recreation/",
                        "content_sha256": "c" * 64,
                        "results": [],
                    }
                )
            )
            offerings_path = tmp_path / "official_recreation_offerings.json"
            offerings_path.write_text(
                json.dumps(
                    {
                        "programs": [{"program_key": "canoe-rentals"}],
                        "offerings": [
                            {
                                "offering_key": "canoe-rentals:campsites",
                                "program_key": "canoe-rentals",
                                "resort_slug": "campsites-at-fort-wilderness-resort",
                                "availability": {
                                    "kind": "evergreen_hours",
                                    "hours_state": "source_hours",
                                    "label": "Daily 9:00 AM-5:00 PM",
                                },
                                "field_provenance": {
                                    "title": [{"page": 1, "line": 1, "text": "Canoe Rentals"}],
                                    "resort_join": [
                                        {
                                            "page": 1,
                                            "line": 2,
                                            "text": "Disney's Fort Wilderness Resort",
                                        }
                                    ],
                                },
                            }
                        ],
                        "quarantine": [],
                    }
                )
            )

            audit = build_official_recreation_coverage_audit(index_path, offerings_path)

        self.assertFalse(audit.passed)
        self.assertIn(
            "official_recreation:availability_label_missing_source_span:canoe-rentals:campsites",
            audit.errors,
        )

    def test_official_recreation_coverage_fails_unsourced_specific_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            index_path = tmp_path / "official-recreation-index-api.snapshot.json"
            index_path.write_text(
                json.dumps(
                    {
                        "source_kind": "official_recreation_index_api",
                        "source_url": "https://disneyworld.disney.go.com/recreation/",
                        "content_sha256": "c" * 64,
                        "results": [],
                    }
                )
            )
            offerings_path = tmp_path / "official_recreation_offerings.json"
            offerings_path.write_text(
                json.dumps(
                    {
                        "programs": [{"program_key": "canoe-rentals"}],
                        "offerings": [
                            {
                                "offering_key": "canoe-rentals:campsites",
                                "program_key": "canoe-rentals",
                                "title": "Canoe Rentals",
                                "resort_slug": "campsites-at-fort-wilderness-resort",
                                "location": {"label": "Bike Barn"},
                                "price": {"state": "fee", "notes": "$15 per hour"},
                                "booking": {"reservation_recommended": True},
                                "eligibility": {"resort_guest_only": True},
                                "amenities": ["Life jackets"],
                                "field_provenance": {
                                    "title": [{"page": 1, "line": 1, "text": "Canoe Rentals"}],
                                    "resort_join": [
                                        {
                                            "page": 1,
                                            "line": 2,
                                            "text": "Disney's Fort Wilderness Resort",
                                        }
                                    ],
                                },
                            }
                        ],
                        "quarantine": [],
                    }
                )
            )

            audit = build_official_recreation_coverage_audit(index_path, offerings_path)

        self.assertFalse(audit.passed)
        for field in ("price", "booking", "eligibility", "amenities", "location"):
            self.assertIn(
                f"official_recreation:{field}_missing_source_span:canoe-rentals:campsites",
                audit.errors,
            )

    def test_official_recreation_coverage_fails_program_without_joined_offering(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            index_path = tmp_path / "official-recreation-index-api.snapshot.json"
            index_path.write_text(
                json.dumps(
                    {
                        "source_kind": "official_recreation_index_api",
                        "source_url": "https://disneyworld.disney.go.com/recreation/",
                        "content_sha256": "c" * 64,
                        "results": [],
                    }
                )
            )
            offerings_path = tmp_path / "official_recreation_offerings.json"
            offerings_path.write_text(
                json.dumps(
                    {
                        "programs": [{"program_key": "pool-tables"}],
                        "offerings": [],
                        "quarantine": [],
                    }
                )
            )

            audit = build_official_recreation_coverage_audit(index_path, offerings_path)

        self.assertFalse(audit.passed)
        self.assertIn(
            "official_recreation:program_without_joined_offering:pool-tables",
            audit.errors,
        )

    def test_official_recreation_parent_coverage_requires_multi_location_detail_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            snapshot_dir = tmp_path / "snapshots"
            snapshot_dir.mkdir()
            index_path = snapshot_dir / "official-recreation-index-api.snapshot.json"
            index_path.write_text(
                json.dumps(
                    {
                        "source_kind": "official_recreation_index_api",
                        "source_url": "https://disneyworld.disney.go.com/recreation/",
                        "content_sha256": "i" * 64,
                        "results": [
                            {
                                "urlFriendlyId": "surrey-bikes",
                                "name": "Surrey Bikes",
                                "locationName": "Multiple Locations",
                                "url": "/recreation/surrey-bikes/",
                                "locationsList": {
                                    "80010387;entityType=resort": "Disney's Old Key West Resort",
                                },
                            }
                        ],
                    }
                )
            )
            offerings_path = tmp_path / "official_recreation_offerings.json"
            offerings_path.write_text(
                json.dumps(
                    {
                        "programs": [{"program_key": "surrey-bikes"}],
                        "offerings": [
                            {
                                "program_key": "surrey-bikes",
                                "resort_slug": "old-key-west-resort",
                            }
                        ],
                        "quarantine": [],
                    }
                )
            )

            audit = build_official_recreation_coverage_audit(index_path, offerings_path, snapshot_dir)

        self.assertFalse(audit.passed)
        self.assertIn(
            "official_recreation:missing_detail_snapshot:surrey-bikes:https://disneyworld.disney.go.com/recreation/surrey-bikes/",
            audit.errors,
        )

    def test_official_recreation_coverage_fails_missing_downstream_detail_resort(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            snapshot_dir = tmp_path / "snapshots"
            snapshot_dir.mkdir()
            index_path = snapshot_dir / "official-recreation-index-api.snapshot.json"
            index_path.write_text(
                json.dumps(
                    {
                        "source_kind": "official_recreation_index_api",
                        "source_url": "https://disneyworld.disney.go.com/recreation/",
                        "content_sha256": "i" * 64,
                        "results": [
                            {
                                "urlFriendlyId": "bike-rentals",
                                "name": "Bike Rentals",
                                "locationsList": {
                                    "80010387;entityType=resort": "Disney's Old Key West Resort",
                                },
                            }
                        ],
                    }
                )
            )
            (snapshot_dir / "official-bike-rentals.snapshot.json").write_text(
                json.dumps(
                    {
                        "source_kind": "official_recreation_detail",
                        "source_url": "https://disneyworld.disney.go.com/recreation/bike-rentals/",
                        "content_sha256": "b" * 64,
                        "lines": [
                            {"line": 1, "text": "Bike Rentals | Walt Disney World Resort"},
                            {"line": 2, "text": "Bike Rentals"},
                            {"line": 3, "text": "MultipleWalt Disney World® Resortlocations"},
                            {"line": 8, "text": "Five Rental Locations Available"},
                            {"line": 11, "text": "Disney's Old Key West Resort"},
                            {"line": 14, "text": "The Cabins at Disney's Fort Wilderness Resort"},
                            {"line": 15, "text": "The Campsites at Disney's Fort Wilderness Resort"},
                        ],
                    }
                )
            )
            offerings_path = tmp_path / "official_recreation_offerings.json"
            offerings_path.write_text(
                json.dumps(
                    {
                        "programs": [{"program_key": "bike-rentals"}],
                        "offerings": [
                            {
                                "program_key": "bike-rentals",
                                "resort_slug": "old-key-west-resort",
                            }
                        ],
                        "quarantine": [],
                    }
                )
            )

            audit = build_official_recreation_coverage_audit(index_path, offerings_path, snapshot_dir)

        self.assertFalse(audit.passed)
        self.assertIn(
            "official_recreation:missing_detail_joinable:bike-rentals:campsites-at-fort-wilderness-resort",
            audit.errors,
        )

    def test_official_recreation_source_drift_ignores_request_date_noise(self) -> None:
        captured = {
            "captured_at": "2026-06-23T00:00:00Z",
            "content_sha256": "old",
            "api_url": "https://example.test/2026-06-23/recreation",
            "results": [
                {
                    "name": "Bike Rentals",
                    "urlFriendlyId": "bike-rentals",
                    "locationName": "Multiple Locations",
                    "locationsList": {"items": ["Disney's Old Key West Resort"]},
                }
            ],
        }
        comparison = {
            **captured,
            "captured_at": "2026-06-26T00:00:00Z",
            "content_sha256": "new",
            "api_url": "https://example.test/2026-06-26/recreation",
        }

        audit = build_official_recreation_source_drift_audit(captured, comparison)

        self.assertTrue(audit.passed)
        self.assertEqual([], audit.errors)
        self.assertEqual(1, audit.summary["captured_parent_items"])

    def test_official_recreation_source_drift_fails_added_or_changed_parent_items(self) -> None:
        captured = {
            "results": [
                {
                    "name": "Bike Rentals",
                    "urlFriendlyId": "bike-rentals",
                    "locationName": "Multiple Locations",
                    "locationsList": {"items": ["Disney's Old Key West Resort"]},
                }
            ],
        }
        comparison = {
            "results": [
                {
                    "name": "Bike Rentals",
                    "urlFriendlyId": "bike-rentals",
                    "locationName": "Disney's Saratoga Springs Resort & Spa",
                    "locationsList": {"items": ["Disney's Saratoga Springs Resort & Spa"]},
                },
                {
                    "name": "New Recreation",
                    "urlFriendlyId": "new-recreation",
                    "locationName": "Disney's Contemporary Resort",
                },
            ],
        }

        audit = build_official_recreation_source_drift_audit(captured, comparison)

        self.assertFalse(audit.passed)
        self.assertIn("official_recreation_source:added:1", audit.errors)
        self.assertIn("official_recreation_source:changed:1", audit.errors)
        self.assertEqual(["new-recreation"], audit.added)
        self.assertEqual(["bike-rentals"], audit.changed)

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

        self.assertEqual(2, result["source_documents"])
        self.assertEqual(1, result["programs"])
        self.assertEqual(2, result["offerings"])
        self.assertEqual(1, result["quarantine"])
        self.assertEqual(0, result["retired_offerings"])
        self.assertEqual(0, result["retired_programs"])
        self.assertEqual(0, result["resolved_quarantine"])
        self.assertEqual(2, result["source_currentness_checks"])
        self.assertGreater(result["field_audit_observations"], 0)
        self.assertEqual(2, len(db.upserted_by_table["source_documents"]))
        self.assertEqual(1, len(db.upserted_by_table["official_activity_programs"]))
        self.assertEqual(2, len(db.upserted_by_table["official_activity_offerings"]))
        self.assertEqual(1, len(db.upserted_by_table["official_activity_ingest_quarantine"]))
        self.assertGreaterEqual(len(db.upserted_by_table["source_currentness_checks"]), 2)
        field_observations = db.upserted_by_table["field_audit_observations"]
        observed_fields = {
            (row["row_kind"], row["row_key"], row["field_name"])
            for row in field_observations
        }
        for row in db.upserted_by_table["official_activity_offerings"]:
            with self.subTest(resort=row["resort_slug"]):
                self.assertRegex(row["id"], r"^[0-9a-f-]{36}$")
                self.assertRegex(row["program_id"], r"^[0-9a-f-]{36}$")
                self.assertTrue(row["source_document_id"].startswith("source-"))
                self.assertTrue(row["is_current"])
                self.assertTrue(row["field_provenance"]["title"])
                self.assertTrue(row["field_provenance"]["resort_join"])
                self.assertIn(
                    ("official_offering", row["offering_key"], "title"),
                    observed_fields,
                )
                self.assertIn(
                    ("official_offering", row["offering_key"], "resort_join"),
                    observed_fields,
                )
                self.assertIn(
                    ("official_offering", row["offering_key"], "description"),
                    observed_fields,
                )
        self.assertIn(
            ("rpc:check_official_activity_offerings_health", {}, ""),
            db.upserts,
        )

    def test_official_recreation_extraction_preserves_availability_source_span(self) -> None:
        extraction = extract_official_recreation_offerings(
            {
                "source_kind": "official_recreation_detail",
                "slug": "canoe-rentals",
                "source_url": "https://disneyworld.disney.go.com/recreation/fort-wilderness-resort/canoe-rentals/",
                "source_web_sha256": "f" * 64,
                "lines": [
                    {"line": 1, "text": "# Canoe Rentals"},
                    {"line": 2, "text": "Paddle around Fort Wilderness."},
                    {"line": 3, "text": "Disney's Fort Wilderness Resort"},
                    {"line": 4, "text": "Hours: 9:00 AM to 5:00 PM"},
                ],
            }
        )

        offering = extraction["offerings"][0]

        self.assertEqual("source_hours", offering["availability"]["hours_state"])
        self.assertEqual(
            "Hours: 9:00 AM to 5:00 PM",
            offering["field_provenance"]["availability"][0]["text"],
        )

    def test_official_recreation_file_publish_requires_coverage_preflight(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            bad_offerings_path = Path(tmp) / "official_recreation_offerings.json"
            bad_offerings_path.write_text(
                json.dumps(
                    {
                        "programs": [{"program_key": "pool-tables"}],
                        "offerings": [],
                        "quarantine": [],
                    }
                )
            )

            with self.assertRaisesRegex(
                RuntimeError,
                "official_offerings_publish_preflight_failed",
            ):
                publish_official_offering_file(bad_offerings_path)

        readme = Path("scripts/ingest/README.md").read_text()
        self.assertIn("publish_official_offerings.py", readme)
        self.assertIn("matches regeneration from the captured official snapshots", readme)
        self.assertIn("official recreation coverage preflight", readme)

    def test_official_recreation_file_publish_rejects_stale_processed_artifact(self) -> None:
        stale = generate_official_recreation_offerings()
        stale["offerings"] = stale["offerings"][:-1]
        with tempfile.TemporaryDirectory() as tmp:
            stale_offerings_path = Path(tmp) / "official_recreation_offerings.json"
            stale_offerings_path.write_text(json.dumps(stale))

            with self.assertRaisesRegex(
                RuntimeError,
                "official_recreation:processed_offerings_stale",
            ):
                publish_official_offering_file(stale_offerings_path)

    def test_official_recreation_publisher_retires_stale_programs_and_resolves_stale_quarantine(self) -> None:
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
                ],
            }
        )
        db = FakeGoldV2Db()
        db.select_rows["official_activity_programs"] = [
            {"id": "old-program-id", "program_key": "retired-program", "is_current": True},
        ]
        db.select_rows["official_activity_ingest_quarantine"] = [
            {
                "id": "old-quarantine-id",
                "program_key": "retired-program",
                "source_sha256": "0" * 64,
                "reason_code": "unresolved_resort_join",
                "status": "pending",
            },
        ]

        result = publish_official_offering_rows(db, extraction)

        self.assertEqual(1, result["retired_programs"])
        self.assertEqual(1, result["resolved_quarantine"])
        self.assertIn(
            (
                "official_activity_programs",
                {"id": "eq.old-program-id"},
                {"is_current": False},
            ),
            db.updates,
        )
        self.assertIn(
            (
                "official_activity_ingest_quarantine",
                {"id": "eq.old-quarantine-id"},
                {"status": "resolved"},
            ),
            db.updates,
        )

    def test_official_recreation_rollback_requires_explicit_filter_and_retires_matches(self) -> None:
        from scripts.ingest.publish_official_offerings import rollback_official_offerings

        db = FakeGoldV2Db()
        with self.assertRaisesRegex(RuntimeError, "rollback_requires"):
            rollback_official_offerings(db)

        db.select_rows["official_activity_offerings"] = [
            {"id": "offering-a", "offering_key": "bike:a", "source_sha256": "a" * 64, "is_current": True}
        ]
        result = rollback_official_offerings(db, source_sha256="a" * 64)

        self.assertEqual({"retired_offerings": 1}, result)
        self.assertIn(
            ("official_activity_offerings", {"id": "eq.offering-a"}, {"is_current": False}),
            db.updates,
        )

    def test_gold_v2_publisher_upserts_source_catalog_and_public_rows(self) -> None:
        rows = json.loads(GOLD_PREVIEW_PATH.read_text())
        sample_rows = [
            next(row for row in rows if row["calendar_group_key"] == "all-star-movies"),
            next(row for row in rows if row["calendar_group_key"] == "art-of-animation"),
        ]
        db = FakeGoldV2Db()

        result = publish_gold_rows(db, sample_rows)

        self.assertEqual(2, result["gold_rows"])
        self.assertGreaterEqual(result["source_documents"], 2)
        self.assertEqual(2, result["activity_catalog"])
        self.assertEqual(0, result["retired_gold_rows"])
        self.assertGreaterEqual(result["source_currentness_checks"], 2)
        self.assertGreater(result["source_relationships"], 0)
        self.assertGreater(result["field_audit_observations"], 0)
        source_rows = db.upserted_by_table["source_documents"]
        self.assertIn("pdf", {row["source_type"] for row in source_rows})
        self.assertTrue(all(row["content_sha256"] for row in source_rows))
        catalog_rows = db.upserted_by_table["activity_catalog"]
        self.assertEqual(
            {row["activity_catalog_id"] for row in sample_rows},
            {row["id"] for row in catalog_rows},
        )
        public_rows = db.upserted_by_table["public_activity_gold"]
        self.assertGreaterEqual(len(db.upserted_by_table["source_currentness_checks"]), 2)
        self.assertTrue(db.upserted_by_table["source_relationships"])
        self.assertTrue(
            all(row["parent_source_document_id"] for row in db.upserted_by_table["source_relationships"]),
            "PDF source relationships must point to the resort recreation parent page document",
        )
        field_observations = db.upserted_by_table["field_audit_observations"]
        observed_fields = {
            (row["row_kind"], row["row_key"], row["field_name"])
            for row in field_observations
        }
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
                self.assertEqual(row["source_sha256"], row["source"]["documentHash"])
                self.assertIn("documentKeyLegends", row["source"])
                self.assertTrue(row["is_current"])
                row_key = f"{row['calendar_group_key']}:{row['canonical_slug']}"
                for field_name in ("title", "schedule", "location"):
                    self.assertIn(("gold_activity", row_key, field_name), observed_fields)
                if row["price"]["state"] in {"free", "fee"}:
                    self.assertIn(("gold_activity", row_key, "price"), observed_fields)
        self.assertIn(
            ("rpc:check_activity_pipeline_v2_health", {}, ""),
            db.upserts,
        )

    def test_gold_v2_publisher_persists_supporting_image_price_evidence(self) -> None:
        rows = json.loads(GOLD_PREVIEW_PATH.read_text())
        row = next(
            row
            for row in rows
            if row["calendar_group_key"] == "port-orleans-riverside"
            and row["canonical_slug"] == "campfire-on-de-bayou"
        )
        image_hash = row["field_provenance"]["price"][0]["source_sha256"]
        db = FakeGoldV2Db()

        result = publish_gold_rows(db, [row])

        self.assertEqual(1, result["gold_rows"])
        source_rows = db.upserted_by_table["source_documents"]
        image_source = next(source for source in source_rows if source["content_sha256"] == image_hash)
        self.assertEqual("image", image_source["source_type"])
        self.assertEqual(
            "data/raw/pdfs/PORS_CKS-Digital-Rec-Sign_052626-FINAL.jpg",
            image_source["storage_path"],
        )
        self.assertTrue(
            any(
                check["source_document_id"] == image_source["id"]
                and check["currentness"] == "current"
                for check in db.upserted_by_table["source_currentness_checks"]
            )
        )
        price_observation = next(
            observation
            for observation in db.upserted_by_table["field_audit_observations"]
            if observation["row_key"] == "port-orleans-riverside:campfire-on-de-bayou"
            and observation["field_name"] == "price"
        )
        self.assertEqual(image_source["id"], price_observation["source_document_id"])

    def test_gold_v2_publisher_preserves_primary_source_inventory_bronze_metadata(self) -> None:
        rows = json.loads(GOLD_PREVIEW_PATH.read_text())
        row = next(row for row in rows if row["calendar_group_key"] == "art-of-animation")
        db = FakeGoldV2Db()

        publish_gold_rows(db, [row])

        source_rows = db.upserted_by_table["source_documents"]
        primary_source = next(source for source in source_rows if source["content_sha256"] == row["source_sha256"])
        self.assertEqual("image", primary_source["source_type"])
        self.assertEqual("image/jpeg", primary_source["mime_type"])
        self.assertEqual("image/jpeg", primary_source["detected_content_type"])
        self.assertEqual(".jpg", primary_source["file_extension"])
        self.assertEqual(1, primary_source["raw_page_count"])
        self.assertGreater(primary_source["raw_width"], 0)
        self.assertGreater(primary_source["raw_height"], 0)

    def test_gold_v2_source_document_from_inventory_preserves_v3_bronze_metadata(self) -> None:
        from scripts.ingest.publish_gold_v2 import _source_document_row_from_inventory

        row = _source_document_row_from_inventory(
            {
                "source_kind": "official_image",
                "canonical_url": "https://cdn.example.test/source.jpg",
                "fetched_url": "https://cdn.example.test/source.jpg",
                "content_sha256": "a" * 64,
                "storage_path": "data/raw/source_documents/example/fy26/source.jpg",
                "http_status": 200,
                "calendar_group_key": "example",
                "captured_at": "2026-06-29T00:00:00+00:00",
                "mime_type": "image/jpeg",
                "http_content_type": "image/jpeg",
                "detected_content_type": "image/jpeg",
                "file_extension": ".jpg",
                "raw_page_count": 1,
                "raw_width": 7,
                "raw_height": 5,
            }
        )

        self.assertEqual("image", row["source_type"])
        self.assertEqual("image/jpeg", row["mime_type"])
        self.assertEqual("image/jpeg", row["http_content_type"])
        self.assertEqual("image/jpeg", row["detected_content_type"])
        self.assertEqual(".jpg", row["file_extension"])
        self.assertEqual(1, row["raw_page_count"])
        self.assertEqual(7, row["raw_width"])
        self.assertEqual(5, row["raw_height"])

    def test_source_trust_package_scripts_include_full_independent_audit(self) -> None:
        package = json.loads(Path("package.json").read_text())
        scripts = package["scripts"]

        self.assertIn("audit:visual-pdfs:seed", scripts)
        self.assertIn("audit:visual-pdfs:independent", scripts)
        self.assertIn("validate:source-trust:full", scripts)
        self.assertIn("--independent", scripts["audit:visual-pdfs:independent"])
        self.assertIn("--live --refresh-web-snapshots", scripts["validate:source-trust:full"])
        self.assertIn("--all-source-kinds", scripts["validate:source-trust:full"])

    def test_source_trust_workflow_runs_daily_light_and_weekly_full(self) -> None:
        workflow = Path(".github/workflows/source-trust-audit.yml").read_text()

        self.assertIn("npm run validate:source-trust:full", workflow)
        self.assertIn("OPENAI_API_KEY", workflow)
        self.assertIn("OPENAI_ACTIVITY_AUDIT_MODEL", workflow)
        self.assertIn("full_audit == 'false'", workflow)
        self.assertIn("full_audit == 'true'", workflow)

    def test_gold_v2_publisher_reuses_existing_catalog_id_for_natural_key(self) -> None:
        row = next(
            row
            for row in json.loads(GOLD_PREVIEW_PATH.read_text())
            if row["calendar_group_key"] == "port-orleans-riverside"
            and row["canonical_slug"] == "campfire-on-de-bayou"
        )
        legacy_catalog_id = "133b00d7-53dd-500d-a827-d88aab7a98c4"
        db = FakeGoldV2Db()
        db.select_rows["activity_catalog"] = [
            {
                "id": legacy_catalog_id,
                "calendar_group_key": row["calendar_group_key"],
                "normalized_name": row["canonical_slug"],
                "canonical_name": "Campfire on de' Bayou",
            }
        ]

        publish_gold_rows(db, [row])

        catalog_row = db.upserted_by_table["activity_catalog"][0]
        public_row = db.upserted_by_table["public_activity_gold"][0]
        self.assertEqual(legacy_catalog_id, catalog_row["id"])
        self.assertEqual(legacy_catalog_id, public_row["activity_catalog_id"])

    def test_gold_v2_publisher_fails_when_database_health_check_reports_issues(self) -> None:
        row = json.loads(GOLD_PREVIEW_PATH.read_text())[0]
        db = FakeGoldV2Db()
        db.health = [{"check_name": "pending_blocker_review", "detail": "bad-row"}]

        with self.assertRaisesRegex(RuntimeError, "activity_pipeline_v2_health_failed"):
            publish_gold_rows(db, [row])

    def test_gold_v2_file_publish_requires_production_coverage_preflight(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            bad_gold_path = Path(tmp) / "activity_gold_v2_preview.json"
            bad_gold_path.write_text("[]")

            with self.assertRaisesRegex(RuntimeError, "gold_publish_preflight_failed"):
                publish_gold_file(bad_gold_path)

        readme = Path("scripts/ingest/README.md").read_text()
        self.assertIn("processed Gold artifact matches regeneration", readme)
        self.assertIn("production coverage preflight", readme)

    def test_gold_v2_file_publish_rejects_stale_processed_artifact(self) -> None:
        stale = generate_gold_records().gold_records
        stale[0] = {**stale[0], "title": f"{stale[0]['title']} stale"}
        with tempfile.TemporaryDirectory() as tmp:
            stale_gold_path = Path(tmp) / "activity_gold_v2_preview.json"
            stale_gold_path.write_text(json.dumps(stale))

            with self.assertRaisesRegex(
                RuntimeError,
                "gold:processed_artifact_stale",
            ):
                publish_gold_file(stale_gold_path)

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

    def test_gold_v2_rollback_requires_explicit_filter_and_retires_matches(self) -> None:
        from scripts.ingest.publish_gold_v2 import rollback_gold_rows

        db = FakeGoldV2Db()
        with self.assertRaisesRegex(RuntimeError, "rollback_requires"):
            rollback_gold_rows(db)

        db.select_rows["public_activity_gold"] = [
            {
                "id": "gold-a",
                "canonical_slug": "campfire",
                "calendar_group_key": "animal-kingdom-jambo",
                "source_sha256": "a" * 64,
                "is_current": True,
            }
        ]
        result = rollback_gold_rows(db, source_sha256="a" * 64)

        self.assertEqual({"retired_gold_rows": 1}, result)
        self.assertIn(
            ("public_activity_gold", {"id": "eq.gold-a"}, {"is_current": False}),
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

    def test_coverage_audit_reports_current_production_ready_mode_with_warnings(self) -> None:
        audit = build_coverage_audit()

        self.assertTrue(audit.passed, audit.errors)
        self.assertEqual(20, audit.summary["pdf_source_count"])
        self.assertEqual(227, audit.summary["fixture_count"])
        self.assertEqual(34, audit.summary["fixture_quarantine_count"])
        self.assertEqual(34, audit.summary["official_offering_covered_quarantine_count"])
        self.assertEqual(13, audit.summary["official_offering_alias_covered_quarantine_count"])
        self.assertEqual(0, audit.summary["blocking_fixture_quarantine_count"])
        self.assertEqual(0, audit.summary["blocking_fixture_quarantine_unique_count"])
        self.assertEqual(17, audit.summary["fixture_unextractable_count"])
        self.assertEqual(207, audit.summary["gold_record_count"])
        self.assertTrue(audit.summary["production_ready"])
        self.assertEqual({}, audit.summary["stale_fixture_groups"])
        self.assertEqual(33, audit.summary["coverage_required_count"])
        self.assertIn("fort-wilderness", audit.summary["source_replacement_groups"])
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
        self.assertEqual(
            {
                "animal-kingdom-kidani": {"gold": 10, "fixture": 10, "legacy": 11},
                "boardwalk": {"gold": 12, "fixture": 12, "legacy": 13},
            },
            audit.summary["legacy_overcount_groups"],
        )
        self.assertEqual(
            {
                "animal-kingdom-jambo": {"gold": 11, "fixture": 11, "legacy": 10},
            },
            audit.summary["legacy_undercount_groups"],
        )
        self.assertFalse(audit.summary["undercovered_gold_groups"])
        self.assertTrue(
            any(warning.startswith("coverage:legacy_overcount_groups:") for warning in audit.warnings),
            audit.warnings,
        )
        self.assertFalse(
            any(warning.startswith("coverage:stale_fixture_sources:") for warning in audit.warnings),
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
            any(warning.startswith("coverage:blocking_fixture_quarantine_records:") for warning in audit.warnings),
            audit.warnings,
        )
        self.assertTrue(
            any(warning.startswith("coverage:fixture_unextractable_records:") for warning in audit.warnings),
            audit.warnings,
        )

    def test_expected_unextractable_records_account_for_warning_candidates(self) -> None:
        public_candidate = {
            "warnings": [],
            "normalized_fields": {
                "slug": "campfire",
                "title": {
                    "value": "Campfire",
                    "spans": [{"page": 1, "line": 1, "text": "CAMPFIRE"}],
                },
            },
        }
        unsafe_candidate = {
            "warnings": ["schedule:text_quality_low"],
            "normalized_fields": {
                "slug": "poolside-activities",
                "title": {
                    "value": "Poolside Activities",
                    "spans": [{"page": 1, "line": 10, "text": "POOLSIDE ACTIVITIES"}],
                },
            },
        }
        fixture = {
            "expected_records": [
                {
                    "title": "Campfire",
                    "slug": "campfire",
                    "required_spans": {
                        "title": [{"page": 1, "line": 1, "text": "CAMPFIRE"}]
                    },
                }
            ],
            "expected_unextractable_records": [
                {
                    "title": "Poolside Activities",
                    "slug": "poolside-activities",
                    "reason": "schedule_text_quality_low",
                    "warnings": ["schedule:text_quality_low"],
                    "required_spans": {
                        "title": [{"page": 1, "line": 10, "text": "POOLSIDE ACTIVITIES"}]
                    },
                }
            ],
        }

        errors = compare_candidates_to_fixture([public_candidate, unsafe_candidate], fixture)

        self.assertEqual([], errors)

    def test_coverage_audit_allows_production_cutover_when_current_catalog_is_covered(self) -> None:
        prior = os.environ.pop("ACTIVITY_DATA_PIPELINE", None)
        prior_public = os.environ.pop("NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE", None)
        try:
            audit = build_coverage_audit(require_production_ready=True)
        finally:
            if prior is not None:
                os.environ["ACTIVITY_DATA_PIPELINE"] = prior
            if prior_public is not None:
                os.environ["NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE"] = prior_public

        self.assertTrue(audit.passed, audit.errors)
        self.assertTrue(audit.summary["production_ready"])
        self.assertEqual([], audit.errors)
        self.assertNotIn("coverage:ui_pipeline_not_gold-v2:gold-v2-preview", audit.errors)
        self.assertFalse(
            any(error.startswith("coverage:gold_rows_below_required_count:") for error in audit.errors),
            audit.errors,
        )
        self.assertFalse(
            any(error.startswith("coverage:gold_rows_below_required_by_group:") for error in audit.errors),
            audit.errors,
        )
        self.assertNotIn("coverage:blocking_fixture_quarantine_records:8", audit.errors)
        self.assertNotIn("coverage:fixture_quarantine_records:34", audit.errors)
        self.assertFalse(
            any(error.startswith("coverage:fixture_unextractable_records:") for error in audit.errors),
            audit.errors,
        )
        self.assertFalse(
            any(error.startswith("coverage:legacy_overcount_groups:") for error in audit.errors),
            audit.errors,
        )

    def test_coverage_audit_rejects_gold_description_not_supported_by_source_span(self) -> None:
        rows = json.loads(GOLD_PREVIEW_PATH.read_text())
        bad_rows = json.loads(json.dumps(rows))
        bad_rows[0]["description"] = "This description came from a different activity block."

        with tempfile.TemporaryDirectory() as tmp:
            bad_gold_path = Path(tmp) / "activity_gold_v2_preview.json"
            bad_gold_path.write_text(json.dumps(bad_rows))

            audit = build_coverage_audit(gold_path=bad_gold_path)

        self.assertFalse(audit.passed)
        self.assertTrue(
            any("description_not_supported_by_source_span" in error for error in audit.errors),
            audit.errors,
        )

    def test_coverage_audit_rejects_explicit_schedule_range_missing_end_time(self) -> None:
        rows = json.loads(GOLD_PREVIEW_PATH.read_text())
        bad_rows = json.loads(json.dumps(rows))
        wellness = next(
            row
            for row in bad_rows
            if row["calendar_group_key"] == "all-star-movies"
            and row["canonical_slug"] == "wellness-scavenger-hunt"
        )
        wellness["schedule"]["end_time"] = None

        with tempfile.TemporaryDirectory() as tmp:
            bad_gold_path = Path(tmp) / "activity_gold_v2_preview.json"
            bad_gold_path.write_text(json.dumps(bad_rows))

            audit = build_coverage_audit(gold_path=bad_gold_path)

        self.assertFalse(audit.passed)
        self.assertTrue(
            any("schedule_explicit_range_missing_end_time" in error for error in audit.errors),
            audit.errors,
        )

    def test_coverage_audit_rejects_duplicate_current_gold_identity(self) -> None:
        rows = json.loads(GOLD_PREVIEW_PATH.read_text())
        bad_rows = json.loads(json.dumps(rows))
        duplicate = dict(bad_rows[0])
        duplicate["candidate_id"] = f"{duplicate['candidate_id']}:duplicate"
        duplicate["source_sha256"] = "b" * 64
        duplicate["source"] = dict(duplicate.get("source") or {})
        duplicate["source"]["documentHash"] = "b" * 64
        bad_rows.append(duplicate)

        with tempfile.TemporaryDirectory() as tmp:
            bad_gold_path = Path(tmp) / "activity_gold_v2_preview.json"
            bad_gold_path.write_text(json.dumps(bad_rows))

            audit = build_coverage_audit(gold_path=bad_gold_path)

        self.assertFalse(audit.passed)
        self.assertTrue(
            any("gold:duplicate_current_identity" in error for error in audit.errors),
            audit.errors,
        )

    def test_coverage_audit_rejects_gold_schedule_not_supported_by_source_span(self) -> None:
        rows = json.loads(GOLD_PREVIEW_PATH.read_text())
        bad_rows = json.loads(json.dumps(rows))
        bad_rows[0]["schedule"]["text"] = "Daily from 1:00pm–2:00pm"

        with tempfile.TemporaryDirectory() as tmp:
            bad_gold_path = Path(tmp) / "activity_gold_v2_preview.json"
            bad_gold_path.write_text(json.dumps(bad_rows))

            audit = build_coverage_audit(gold_path=bad_gold_path)

        self.assertFalse(audit.passed)
        self.assertTrue(
            any("schedule_not_supported_by_source_span" in error for error in audit.errors),
            audit.errors,
        )

    def test_coverage_audit_allows_multiple_showtimes_without_end_time(self) -> None:
        rows = json.loads(GOLD_PREVIEW_PATH.read_text())
        sample = next(
            row
            for row in rows
            if row["canonical_slug"] == "guided-fishing-excursions"
            and row["schedule"]["text"] == "Available at 7:00 AM, 10:00 AM, and 1:30 PM"
        )
        self.assertIsNone(sample["schedule"]["end_time"])

        audit = build_coverage_audit()

        self.assertTrue(audit.passed, audit.errors)
        self.assertFalse(
            any("schedule_explicit_range_missing_end_time" in error for error in audit.errors),
            audit.errors,
        )

    def test_trust_report_summarizes_current_ready_state_after_independent_visual_audit(self) -> None:
        report = build_trust_report()

        self.assertEqual("ready", report["status"])
        self.assertTrue(report["coverage"]["production_ready"])
        self.assertEqual(34, report["fixture_quarantine"]["record_count"])
        self.assertEqual(20, report["fixture_quarantine"]["unique_record_count"])
        self.assertEqual(0, report["fixture_quarantine"]["blocking_record_count"])
        self.assertEqual(0, report["fixture_quarantine"]["blocking_unique_record_count"])
        self.assertEqual(34, report["fixture_quarantine"]["official_offering_covered_record_count"])
        self.assertEqual(13, report["fixture_quarantine"]["official_offering_alias_covered_record_count"])
        self.assertEqual(17, report["fixture_unextractable"]["record_count"])
        self.assertEqual(
            {"record_count": 34, "unique_record_count": 20},
            report["fixture_quarantine"]["by_group"]["fort-wilderness"],
        )
        self.assertEqual([], report["blockers"])
        self.assertEqual(0, report["official_recreation"]["quarantine_count"])
        self.assertGreaterEqual(report["official_recreation"]["offering_count"], 224)
        self.assertEqual(207, report["gold_source"]["gold_record_count"])
        self.assertEqual(166, report["gold_source"]["rows_with_document_key_legends"])
        self.assertEqual({"fee": 166}, report["gold_source"]["document_key_legend_kinds"])
        self.assertEqual(0, report["coverage"]["visual_audit_error_count"])
        self.assertEqual(0, report["coverage"]["field_audit_error_count"])
        self.assertGreaterEqual(report["coverage"]["visual_audit_summary"]["activities_compared"], 165)
        self.assertGreaterEqual(report["coverage"]["field_audit_summary"]["fields_audited"], 982)

        markdown = render_markdown_report(report)
        self.assertIn("# Source-To-UI Trust Report", markdown)
        self.assertIn("Production cutover: ready", markdown)
        self.assertIn("- None", markdown)
        self.assertNotIn("independent_visual_ocr_coverage_not_high", markdown)
        self.assertNotIn("stale_fixture_sources", markdown)
        self.assertIn("Gold source evidence: 166 rows with document key legends", markdown)
        self.assertIn("kinds: fee", markdown)
        self.assertIn("Visual PDF audit: 165 activities compared, 0 blocking mismatches", markdown)
        self.assertIn("Field audit: 986 fields checked, 0 errors", markdown)
        self.assertIn("Fort Wilderness", markdown)
        self.assertIn("Source-visible fixture records retained for audit: 34 records", markdown)
        self.assertIn("34 covered by official offerings", markdown)
        self.assertIn("13 alias-covered", markdown)
        self.assertIn("Covered Source-Visible Records", markdown)
        self.assertIn("do not block cutover", markdown)
        self.assertIn("No cutover action required for official-offering-covered fixture records", markdown)
        self.assertNotIn("Resolve fixture quarantine records", markdown)
        self.assertIn("Explicit non-publishable source-visible records: 17 records", markdown)
        self.assertIn(
            "withheld from publishing because the current sources do not provide enough public-facing fields",
            markdown,
        )
        self.assertIn("| Art of Animation | Glow Party | glow-party |", markdown)
        self.assertIn("| Contemporary | Sports Courts | sports-courts |", markdown)
        self.assertIn("| Coronado Springs | Resort Scavenger Hunt | resort-scavenger-hunt |", markdown)
        self.assertIn("parser_warning:schedule:text_quality_low", markdown)
        self.assertIn("No source-visible location or schedule", markdown)
        self.assertIn("No source-visible activity schedule or exact activity location", markdown)

    def test_production_pipeline_requires_cutover_coverage_before_publish(self) -> None:
        steps = validation_gate_steps(local_only=False)

        self.assertIn(("audit_coverage.py", "--require-production-ready"), steps)
        self.assertIn(("trust_report.py",), steps)
        self.assertLess(
            steps.index(("audit_coverage.py", "--require-production-ready")),
            steps.index(("trust_report.py",)),
        )

    def test_production_pipeline_publishes_gold_and_official_paths(self) -> None:
        steps = publish_steps(local_only=False, has_service_role=True)

        self.assertEqual(
            [
                ("publish_gold_v2.py",),
                ("publish_official_offerings.py",),
                ("enrichment.py",),
            ],
            steps,
        )
        self.assertNotIn(("publish.py",), steps)

    def test_vision_v3_pipeline_lane_requires_quarter_for_production_readiness(self) -> None:
        with self.assertRaisesRegex(ValueError, "vision_v3_quarter_required"):
            vision_v3_report_steps(local_only=False)

    def test_vision_v3_pipeline_lane_is_report_only_until_explicit_publish(self) -> None:
        steps = vision_v3_report_steps(local_only=False, quarter="fy26-q4")

        self.assertEqual(
            [
                ("evaluate_activity_extraction.py",),
                (
                    "build_source_inventory.py",
                    "--source-overrides",
                    "data/processed/resort_pdf_source_overrides.json",
                    "--resort-pdf-date-audit",
                    "data/processed/resort_pdf_date_audit.json",
                ),
                (
                    "render_source_pages.py",
                    "--source-inventory",
                    "data/processed/source_inventory.json",
                    "--upsert-source-document-pages",
                    "--quarter",
                    "fy26-q4",
                ),
                ("vision_snapshot.py", "--attach-regions", "--upsert-layout-snapshots", "--quarter", "fy26-q4"),
                ("extract_v3.py", "--quarter", "fy26-q4"),
                ("validate_v3.py", "--quarter", "fy26-q4"),
                ("source_status_v3.py", "--quarter", "fy26-q4"),
                ("source_metrics_v3.py", "--quarter", "fy26-q4"),
                ("source_drift_report.py", "--quarter", "fy26-q4"),
                ("build_review_queue_v3.py",),
                ("promote_gold_v3.py", "--preview", "--include-approved-review"),
                (
                    "v3_dual_run_report.py",
                    "--v2",
                    "data/processed/activity_gold_v2_preview.json",
                    "--v3",
                    "data/processed/activity_gold_v3_preview.json",
                    "--expected-sources",
                    "data/processed/source_inventory.json",
                    "--source-statuses",
                    "data/processed/eval/v3_source_statuses.json",
                    "--review-tasks",
                    "data/processed/review_queue/vision_v3_review_queue.json",
                ),
                ("trust_report.py",),
                ("publish_gold_v3.py", "--require-clean-preview", "--json"),
            ],
            steps,
        )
        self.assertLess(
            steps.index(("trust_report.py",)),
            steps.index(("publish_gold_v3.py", "--require-clean-preview", "--json")),
        )
        self.assertNotIn(("publish_gold_v3.py", "--publish"), steps)
        self.assertNotIn(("publish_gold_v2.py",), steps)

    def test_vision_v3_quarter_lane_generates_source_drift_before_review_and_readiness(self) -> None:
        steps = vision_v3_report_steps(local_only=False, quarter="fy26-q4")

        source_inventory_step = (
            "build_source_inventory.py",
            "--source-overrides",
            "data/processed/resort_pdf_source_overrides.json",
            "--resort-pdf-date-audit",
            "data/processed/resort_pdf_date_audit.json",
        )
        render_step = (
            "render_source_pages.py",
            "--source-inventory",
            "data/processed/source_inventory.json",
            "--upsert-source-document-pages",
            "--quarter",
            "fy26-q4",
        )
        self.assertIn(source_inventory_step, steps)
        self.assertIn(
            render_step,
            steps,
        )
        self.assertLess(steps.index(source_inventory_step), steps.index(render_step))
        self.assertIn(("vision_snapshot.py", "--attach-regions", "--upsert-layout-snapshots", "--quarter", "fy26-q4"), steps)
        self.assertIn(("extract_v3.py", "--quarter", "fy26-q4"), steps)
        self.assertIn(("validate_v3.py", "--quarter", "fy26-q4"), steps)
        self.assertIn(("source_status_v3.py", "--quarter", "fy26-q4"), steps)
        self.assertIn(("source_metrics_v3.py", "--quarter", "fy26-q4"), steps)
        self.assertIn(("source_drift_report.py", "--quarter", "fy26-q4"), steps)
        self.assertLess(
            steps.index(("source_drift_report.py", "--quarter", "fy26-q4")),
            steps.index(("build_review_queue_v3.py",)),
        )
        self.assertLess(
            steps.index(("source_drift_report.py", "--quarter", "fy26-q4")),
            steps.index(("publish_gold_v3.py", "--require-clean-preview", "--json")),
        )
        self.assertIn(
            (
                "v3_dual_run_report.py",
                "--v2",
                "data/processed/activity_gold_v2_preview.json",
                "--v3",
                "data/processed/activity_gold_v3_preview.json",
                "--expected-sources",
                "data/processed/source_inventory.json",
                "--source-statuses",
                "data/processed/eval/v3_source_statuses.json",
                "--review-tasks",
                "data/processed/review_queue/vision_v3_review_queue.json",
            ),
            steps,
        )

    def test_vision_v3_production_lane_persists_internal_evidence_tables(self) -> None:
        production_steps = vision_v3_report_steps(local_only=False, quarter="fy26-q4")
        local_steps = vision_v3_report_steps(local_only=True)

        self.assertIn(
            (
                "render_source_pages.py",
                "--source-inventory",
                "data/processed/source_inventory.json",
                "--upsert-source-document-pages",
                "--quarter",
                "fy26-q4",
            ),
            production_steps,
        )
        self.assertIn(
            (
                "vision_snapshot.py",
                "--attach-regions",
                "--upsert-layout-snapshots",
                "--quarter",
                "fy26-q4",
            ),
            production_steps,
        )
        self.assertNotIn("--upsert-source-document-pages", {arg for step in local_steps for arg in step})
        self.assertNotIn("--upsert-layout-snapshots", {arg for step in local_steps for arg in step})

    def test_local_vision_v3_pipeline_lane_skips_publish_readiness_gate(self) -> None:
        steps = vision_v3_report_steps(local_only=True)

        self.assertIn(("promote_gold_v3.py", "--preview", "--include-approved-review"), steps)
        self.assertNotIn(("publish_gold_v3.py", "--require-clean-preview", "--json"), steps)

    def test_pipeline_skips_publish_without_service_role_or_local_only(self) -> None:
        self.assertEqual([], publish_steps(local_only=True, has_service_role=True))
        self.assertEqual([], publish_steps(local_only=False, has_service_role=False))

    def test_legacy_temporal_publish_is_explicitly_opt_in(self) -> None:
        prior = os.environ.pop(ALLOW_LEGACY_PUBLISH_ENV, None)
        try:
            with self.assertRaisesRegex(RuntimeError, "legacy_activity_publish_disabled"):
                publish_legacy_temporal_all(Path("missing-legacy-ingest.json"))
        finally:
            if prior is not None:
                os.environ[ALLOW_LEGACY_PUBLISH_ENV] = prior

    def test_legacy_time_backfills_are_explicitly_opt_in(self) -> None:
        prior = os.environ.pop(ALLOW_LEGACY_PUBLISH_ENV, None)
        try:
            with self.assertRaisesRegex(RuntimeError, "legacy_time_backfill_disabled"):
                backfill_all_times.main()
            with self.assertRaisesRegex(RuntimeError, "legacy_movie_time_backfill_disabled"):
                backfill_movie_times.main()
        finally:
            if prior is not None:
                os.environ[ALLOW_LEGACY_PUBLISH_ENV] = prior

    def test_local_pipeline_runs_partial_coverage_audit_without_cutover_gate(self) -> None:
        steps = validation_gate_steps(local_only=True)

        self.assertIn(("audit_coverage.py",), steps)
        self.assertIn(("trust_report.py",), steps)
        self.assertNotIn(("audit_coverage.py", "--require-production-ready"), steps)

    def test_pipeline_builds_mrg_facts_before_gold_promotion(self) -> None:
        steps = validation_gate_steps(local_only=True)

        self.assertIn(("magical_resort_guide.py",), steps)
        self.assertLess(
            steps.index(("magical_resort_guide.py",)),
            steps.index(("promote_gold.py", "--fail-on-review")),
        )


class SourceAuthorityPolicyTest(unittest.TestCase):
    def test_finder_api_cannot_set_public_price(self) -> None:
        from scripts.ingest.source_authority import can_source_set_public_price

        self.assertFalse(can_source_set_public_price("disney_recreation_index_api"))

    def test_mrg_cannot_override_disney_free(self) -> None:
        from scripts.ingest.source_authority import third_party_can_override_disney_free

        self.assertFalse(third_party_can_override_disney_free("magical_resort_guide"))

    def test_disney_pdf_is_primary(self) -> None:
        from scripts.ingest.source_authority import source_kind_authority

        self.assertEqual("primary", source_kind_authority("disney_resort_recreation_pdf"))


class SourceInventoryTest(unittest.TestCase):
    def test_inventory_includes_all_resort_pages_and_pdf_sources(self) -> None:
        from scripts.ingest.build_source_inventory import build_source_inventory
        from scripts.ingest.source_manifest import RESORT_RECREATION_SOURCES

        inventory = build_source_inventory(live=False)
        urls = {row["canonical_url"] for row in inventory}
        for source in RESORT_RECREATION_SOURCES:
            self.assertIn(source.recreation_page_url, urls)
            if source.pdf_url:
                self.assertIn(source.pdf_url, urls)

    def test_inventory_includes_supporting_disney_price_image_sources(self) -> None:
        from scripts.ingest.build_source_inventory import build_source_inventory

        inventory = build_source_inventory(live=False)
        rows = [
            row
            for row in inventory
            if row["source_role"] == "supporting_price_image"
            and row["canonical_url"].endswith("PORS_CKS-Digital-Rec-Sign_052626-FINAL.jpg")
        ]

        self.assertEqual(1, len(rows))
        self.assertEqual("official_image", rows[0]["source_kind"])
        self.assertRegex(rows[0]["content_sha256"], r"^[a-f0-9]{64}$")
        self.assertEqual("current", rows[0]["currentness"])

        pdf_rows = [
            row
            for row in inventory
            if row["source_role"] == "supporting_price_image"
            and row["canonical_url"].endswith("All-Star-Sports_Aframe_Recreation-0526_DIGITAL.pdf")
        ]

        self.assertEqual(1, len(pdf_rows))
        self.assertEqual("official_pdf", pdf_rows[0]["source_kind"])
        self.assertRegex(pdf_rows[0]["content_sha256"], r"^[a-f0-9]{64}$")
        self.assertEqual("current", pdf_rows[0]["currentness"])

    def test_inventory_records_have_traceability_fields(self) -> None:
        from scripts.ingest.build_source_inventory import build_source_inventory

        for row in build_source_inventory(live=False):
            self.assertRegex(row["source_id"], r"^[a-f0-9]{64}$")
            self.assertEqual(row["source_id"], row["source_document_id"])
            self.assertRegex(row["source_document_id"], r"^[a-f0-9]{64}$")
            self.assertTrue(row["source_role"])
            self.assertTrue(row["source_kind"])
            self.assertTrue(row["canonical_url"].startswith("https://"))
            self.assertTrue(row["parser_version"])
            self.assertIn(
                row["currentness"],
                {"current", "changed", "missing", "unreachable", "unknown", "expired"},
            )

    def test_inventory_links_pdf_sources_to_resort_page_parent(self) -> None:
        from scripts.ingest.build_source_inventory import build_source_inventory

        inventory = build_source_inventory(live=False)
        by_url = {row["canonical_url"]: row for row in inventory}
        pdf_rows = [row for row in inventory if row["source_role"] == "resort_pdf"]
        self.assertTrue(pdf_rows)
        for row in pdf_rows:
            self.assertTrue(row["parent_source_id"])
            self.assertEqual(row["parent_source_id"], row["parent_source_document_id"])
            parent_url = row["discovered_from_url"]
            self.assertIn(parent_url, by_url)
            self.assertEqual(by_url[parent_url]["source_id"], row["parent_source_id"])
            self.assertEqual(by_url[parent_url]["source_document_id"], row["parent_source_document_id"])

    def test_inventory_uses_manifest_source_type_for_extensionless_visual_sources(self) -> None:
        from scripts.ingest.build_source_inventory import build_source_inventory

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            local_source = tmp_path / "source-document"
            local_source.write_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF")
            parent_snapshot_path = tmp_path / "parent.snapshot.json"
            parent_snapshot_path.write_text(json.dumps({"source_url": "https://example.test/recreation"}))
            parent_snapshot = {
                "source_url": "https://example.test/recreation",
                "source_kind": "official_html",
                "content_sha256": "a" * 64,
            }
            visual_source = type(
                "Source",
                (),
                {
                    "resort_slug": "example-resort",
                    "calendar_group_key": "example",
                    "recreation_page_url": "https://example.test/recreation",
                    "pdf_url": "https://cdn.example.test/source-document?id=123",
                    "pdf_edition": "fy26-q3-0526",
                    "source_type": "image",
                    "notes": "extensionless image URL",
                },
            )()

            with patch(
                "scripts.ingest.build_source_inventory.RESORT_RECREATION_SOURCES",
                [visual_source],
            ), patch(
                "scripts.ingest.build_source_inventory._load_index_snapshot",
                return_value={"results": [], "content_sha256": "b" * 64},
            ), patch(
                "scripts.ingest.build_source_inventory._refresh_or_find_web_snapshot",
                return_value=(parent_snapshot_path, parent_snapshot),
            ), patch(
                "scripts.ingest.build_source_inventory._pdf_local_path",
                return_value=local_source,
            ), patch(
                "scripts.ingest.build_source_inventory._supporting_price_image_records",
                return_value=[],
            ), patch(
                "scripts.ingest.build_source_inventory._community_hall_fact_records",
                return_value=[],
            ), patch(
                "scripts.ingest.build_source_inventory._golf_official_fact_records",
                return_value=[],
            ), patch(
                "scripts.ingest.build_source_inventory._reviewed_visual_schedule_records",
                return_value=[],
            ), patch(
                "scripts.ingest.build_source_inventory._parent_detail_records",
                return_value=[],
            ), patch(
                "scripts.ingest.build_source_inventory._extra_official_detail_records",
                return_value=[],
            ):
                inventory = build_source_inventory(live=False)

        row = next(row for row in inventory if row["canonical_url"] == visual_source.pdf_url)
        self.assertEqual("official_image", row["source_kind"])
        self.assertEqual("example", row["calendar_group_key"])

    def test_inventory_prefers_v3_bronze_source_document_cache(self) -> None:
        from scripts.ingest.build_source_inventory import build_source_inventory
        from PIL import Image
        from io import BytesIO

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            image_buffer = BytesIO()
            Image.new("RGB", (7, 5), color=(32, 64, 128)).save(image_buffer, "JPEG")
            data = image_buffer.getvalue()
            digest = hashlib.sha256(data).hexdigest()
            source_documents_dir = tmp_path / "source_documents"
            source_path = source_documents_dir / "art-of-animation" / "fy26-q3-0526" / f"{digest}.jpg"
            source_path.parent.mkdir(parents=True)
            source_path.write_bytes(data)
            parent_snapshot_path = tmp_path / "parent.snapshot.json"
            parent_snapshot_path.write_text(json.dumps({"source_url": "https://example.test/recreation"}))
            parent_snapshot = {
                "source_url": "https://example.test/recreation",
                "source_kind": "official_html",
                "content_sha256": "a" * 64,
            }
            visual_source = type(
                "Source",
                (),
                {
                    "resort_slug": "art-of-animation-resort",
                    "calendar_group_key": "art-of-animation",
                    "recreation_page_url": "https://example.test/recreation",
                    "pdf_url": "https://cdn.example.test/DAAR_CKS-Digital-Rec-Sign_052626-FINAL.jpg",
                    "pdf_edition": "fy26-q3-0526",
                    "source_type": "image",
                    "notes": "v3 bronze image cache",
                },
            )()
            audit_path = tmp_path / "audit.json"
            audit_path.write_text(json.dumps({
                "sources": [
                    {
                        "calendar_group_key": "art-of-animation",
                        "live_url": visual_source.pdf_url,
                        "discovery_evidence": {
                            "evidence_kind": "official_resort_recreation_page",
                            "url": visual_source.pdf_url,
                            "parent_url": "https://example.test/recreation",
                        },
                    }
                ]
            }))

            with patch(
                "scripts.ingest.build_source_inventory.RESORT_RECREATION_SOURCES",
                [visual_source],
            ), patch(
                "scripts.ingest.build_source_inventory.SOURCE_DOCUMENTS_RAW_DIR",
                source_documents_dir,
            ), patch(
                "scripts.ingest.build_source_inventory._load_index_snapshot",
                return_value={"results": [], "content_sha256": "b" * 64},
            ), patch(
                "scripts.ingest.build_source_inventory._refresh_or_find_web_snapshot",
                return_value=(parent_snapshot_path, parent_snapshot),
            ), patch(
                "scripts.ingest.build_source_inventory._pdf_local_path",
                return_value=tmp_path / "missing-legacy-cache.jpg",
            ), patch(
                "scripts.ingest.build_source_inventory._supporting_price_image_records",
                return_value=[],
            ), patch(
                "scripts.ingest.build_source_inventory._community_hall_fact_records",
                return_value=[],
            ), patch(
                "scripts.ingest.build_source_inventory._golf_official_fact_records",
                return_value=[],
            ), patch(
                "scripts.ingest.build_source_inventory._reviewed_visual_schedule_records",
                return_value=[],
            ), patch(
                "scripts.ingest.build_source_inventory._parent_detail_records",
                return_value=[],
            ), patch(
                "scripts.ingest.build_source_inventory._extra_official_detail_records",
                return_value=[],
            ):
                inventory = build_source_inventory(live=False, resort_pdf_date_audit=audit_path)

        row = next(row for row in inventory if row["canonical_url"] == visual_source.pdf_url)
        self.assertEqual("official_image", row["source_kind"])
        self.assertEqual("image", row["source_type"])
        self.assertEqual("image/jpeg", row["mime_type"])
        self.assertEqual("image/jpeg", row["detected_content_type"])
        self.assertEqual(".jpg", row["file_extension"])
        self.assertEqual(1, row["raw_page_count"])
        self.assertEqual(7, row["raw_width"])
        self.assertEqual(5, row["raw_height"])
        self.assertEqual(digest, row["content_sha256"])
        self.assertEqual(str(source_path), row["storage_path"])
        self.assertEqual("fy26-q3-0526", row["source_pdf_edition"])
        self.assertEqual(200, row["http_status"])
        self.assertEqual("current", row["currentness"])

    def test_inventory_storage_paths_are_repo_relative(self) -> None:
        from scripts.ingest.build_source_inventory import _portable_path

        self.assertEqual(
            "data/raw/pdfs/example.pdf",
            _portable_path(Path.cwd() / "data/raw/pdfs/example.pdf"),
        )

    def test_inventory_records_bronze_metadata_for_supporting_price_sources(self) -> None:
        from scripts.ingest.build_source_inventory import _supporting_price_image_records

        rows = _supporting_price_image_records()
        by_kind = {row["source_kind"]: row for row in rows}

        image_row = by_kind["official_image"]
        self.assertEqual("image", image_row["source_type"])
        self.assertEqual("image/jpeg", image_row["mime_type"])
        self.assertEqual("image/jpeg", image_row["detected_content_type"])
        self.assertEqual(".jpg", image_row["file_extension"])
        self.assertEqual(1, image_row["raw_page_count"])
        self.assertGreater(image_row["raw_width"], 0)
        self.assertGreater(image_row["raw_height"], 0)

        pdf_row = by_kind["official_pdf"]
        self.assertEqual("pdf", pdf_row["source_type"])
        self.assertEqual("application/pdf", pdf_row["mime_type"])
        self.assertEqual("application/pdf", pdf_row["detected_content_type"])
        self.assertEqual(".pdf", pdf_row["file_extension"])
        self.assertGreater(pdf_row["raw_page_count"], 0)

    def test_refreshed_inventory_records_parent_page_hash_for_pdf_sources(self) -> None:
        from scripts.ingest.build_source_inventory import build_source_inventory

        snapshot = {
            "url": "https://example.test/resorts/example/recreation/",
            "source_kind": "official_html",
            "captured_at": "2026-06-26T00:00:00+00:00",
            "http_status": 200,
            "fetched_url": "https://example.test/resorts/example/recreation/",
            "title": "Example Recreation",
            "links": [{"text": "Calendar", "href": "https://example.test/calendar.pdf"}],
            "text_lines": ["Calendar"],
        }

        with tempfile.TemporaryDirectory() as tmpdir, patch(
            "scripts.ingest.build_source_inventory.RESORT_RECREATION_SOURCES",
            [
                type(
                    "Source",
                    (),
                    {
                        "resort_slug": "example-resort",
                        "calendar_group_key": "example",
                        "recreation_page_url": "https://example.test/resorts/example/recreation/",
                        "pdf_url": "https://example.test/calendar.pdf",
                        "pdf_edition": "test",
                        "local_pdf_path": Path("data/raw/pdfs/missing.pdf"),
                        "notes": "test",
                    },
                )()
            ],
        ), patch(
            "scripts.ingest.build_source_inventory._load_index_snapshot",
            return_value={"results": []},
        ), patch(
            "scripts.ingest.build_source_inventory._safe_snapshot_name",
            side_effect=lambda source_role, url: Path(tmpdir) / f"{source_role}.snapshot.json",
        ), patch("scripts.ingest.build_source_inventory.write_web_snapshot") as write_snapshot:
            write_snapshot.return_value = snapshot
            inventory = build_source_inventory(live=False, refresh_web_snapshots=True)

        by_url = {row["canonical_url"]: row for row in inventory}
        parent = by_url["https://example.test/resorts/example/recreation/"]
        child = by_url["https://example.test/calendar.pdf"]
        self.assertRegex(parent["content_sha256"], r"^[a-f0-9]{64}$")
        self.assertEqual(parent["content_sha256"], child["parent_content_sha256"])
        self.assertEqual(parent["storage_path"], child["discovered_from_storage_path"])

    def test_inventory_uses_replacement_override_and_audit_evidence_for_pdf_currentness(self) -> None:
        from scripts.ingest.build_source_inventory import build_source_inventory
        from scripts.ingest.source_manifest import ActivitySource

        old_url = "https://example.test/fy26-q2/BW_Aframe_Recreation-0326.pdf"
        current_url = "https://example.test/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf"

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            local_pdf = tmp_path / "BW_Aframe_Recreation-0526_DIGITAL.pdf"
            local_pdf.write_bytes(b"%PDF-1.7\n")
            overrides_path = tmp_path / "overrides.json"
            overrides_path.write_text(json.dumps({
                "boardwalk": {
                    "pdf_url": current_url,
                    "pdf_edition": "fy26-q3-0526",
                    "replaced_stale_url": old_url,
                }
            }))
            audit_path = tmp_path / "audit.json"
            audit_path.write_text(json.dumps({
                "sources": [
                    {
                        "calendar_group_key": "boardwalk",
                        "live_url": current_url,
                        "discovery_evidence": {
                            "evidence_kind": "official_resort_recreation_page",
                            "url": current_url,
                            "parent_url": "https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
                            "source_api_url": "https://disneyworld.disney.go.com/wdw-resorts-details-api/api/v1/resort/80010386/marketing-info/?storeId=wdw",
                            "evidence_detail": "resort_marketing_info.tabs.recreation",
                        },
                    }
                ]
            }))

            activity_source = ActivitySource(
                "boardwalk",
                ("boardwalk-inn",),
                "https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
                old_url,
                "fy26-q2-0326",
            )
            snapshot = {
                "source_url": "https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
                "source_kind": "official_html",
                "content_sha256": "b" * 64,
            }

            with patch("scripts.ingest.build_source_inventory.ACTIVITY_SOURCES", [activity_source]), patch(
                "scripts.ingest.build_source_inventory._load_index_snapshot",
                return_value={"results": [], "content_sha256": "a" * 64},
            ), patch(
                "scripts.ingest.build_source_inventory._refresh_or_find_web_snapshot",
                return_value=(tmp_path / "parent.snapshot.json", snapshot),
            ), patch(
                "scripts.ingest.build_source_inventory._pdf_local_path",
                return_value=local_pdf,
            ):
                inventory = build_source_inventory(
                    live=False,
                    source_overrides=overrides_path,
                    resort_pdf_date_audit=audit_path,
                )

        pdf_rows = [row for row in inventory if row["source_role"] == "resort_pdf"]
        self.assertEqual(1, len(pdf_rows))
        self.assertEqual(current_url, pdf_rows[0]["canonical_url"])
        self.assertEqual("current", pdf_rows[0]["currentness"])
        self.assertEqual(current_url, pdf_rows[0]["discovered_pdf_url_evidence"]["pdf_url"])
        self.assertEqual(
            "resort_marketing_info.tabs.recreation",
            pdf_rows[0]["discovered_pdf_url_evidence"]["evidence_detail"],
        )


class SourceFreshnessAuditTest(unittest.TestCase):
    def test_hash_change_blocks_publish_required_source(self) -> None:
        from scripts.ingest.audit_source_freshness import source_freshness_errors

        report = {
            "sources": [
                {
                    "canonical_url": "https://example.test/current.pdf",
                    "source_role": "resort_pdf",
                    "used_by_current_gold": True,
                    "currentness": "hash_changed",
                }
            ]
        }
        self.assertEqual(
            ["source_freshness:hash_changed:https://example.test/current.pdf"],
            source_freshness_errors(report),
        )

    def test_unpublished_secondary_hash_change_warns_only(self) -> None:
        from scripts.ingest.audit_source_freshness import source_freshness_errors

        report = {
            "sources": [
                {
                    "canonical_url": "https://example.test/secondary.html",
                    "source_role": "secondary_enrichment",
                    "used_by_current_gold": False,
                    "currentness": "hash_changed",
                }
            ]
        }
        self.assertEqual([], source_freshness_errors(report))

    def test_freshness_report_summary_counts_states(self) -> None:
        from scripts.ingest.audit_source_freshness import build_source_freshness_report

        report = build_source_freshness_report(
            [
                {"canonical_url": "https://example.test/a.pdf", "currentness": "current"},
                {"canonical_url": "https://example.test/b.pdf", "currentness": "hash_changed"},
            ],
            used_source_urls={"https://example.test/b.pdf"},
        )

        self.assertFalse(report["passed"])
        self.assertEqual(2, report["summary"]["sources_checked"])
        self.assertEqual(1, report["summary"]["current"])
        self.assertEqual(1, report["summary"]["hash_changed"])
        self.assertEqual(
            ["source_freshness:hash_changed:https://example.test/b.pdf"],
            report["errors"],
        )

    def test_used_gold_source_missing_from_inventory_fails(self) -> None:
        from scripts.ingest.audit_source_freshness import build_source_freshness_report

        report = build_source_freshness_report(
            [
                {"canonical_url": "https://example.test/current.pdf", "currentness": "current"},
            ],
            used_source_urls={"https://example.test/stale.pdf"},
        )

        self.assertFalse(report["passed"])
        self.assertEqual(
            ["source_freshness:used_source_missing_from_inventory:https://example.test/stale.pdf"],
            report["errors"],
        )

    def test_used_stale_resort_schedule_url_fails_even_if_inventory_has_it(self) -> None:
        from scripts.ingest.audit_source_freshness import build_source_freshness_report

        stale_url = "https://cdn1.parksmedia.wdprapps.disney.com/fy26-q2/BW_Aframe_Recreation-0326.pdf"
        report = build_source_freshness_report(
            [
                {"canonical_url": stale_url, "currentness": "current"},
            ],
            used_source_urls={stale_url},
        )

        self.assertFalse(report["passed"])
        self.assertEqual(
            [f"source_freshness:stale_resort_schedule_url:{stale_url}"],
            report["errors"],
        )

    def test_unknown_publish_required_source_fails_without_exemption(self) -> None:
        from scripts.ingest.audit_source_freshness import source_freshness_errors

        report = {
            "sources": [
                {
                    "canonical_url": "https://example.test/current.html",
                    "used_by_current_gold": True,
                    "currentness": "unknown",
                }
            ]
        }

        self.assertEqual(
            ["source_freshness:unknown:https://example.test/current.html"],
            source_freshness_errors(report),
        )

    def test_unknown_source_with_documented_exemption_does_not_fail(self) -> None:
        from scripts.ingest.audit_source_freshness import source_freshness_errors

        report = {
            "sources": [
                {
                    "canonical_url": "https://example.test/current.html",
                    "used_by_current_gold": True,
                    "currentness": "unknown",
                    "freshness_exemption_reason": "historical source retained for audit comparison",
                }
            ]
        }

        self.assertEqual([], source_freshness_errors(report))

    def test_live_html_freshness_uses_canonical_snapshot_hash(self) -> None:
        from scripts.ingest.audit_source_freshness import _live_checked_source
        from scripts.ingest.web_snapshot import web_snapshot_content_hash

        snapshot = {
            "url": "https://example.test/page/",
            "source_kind": "official_html",
            "captured_at": "2026-06-26T00:00:00+00:00",
            "http_status": 200,
            "fetched_url": "https://example.test/page/",
            "title": "Example Page",
            "links": [],
            "text_lines": ["Example Page"],
        }
        source = {
            "canonical_url": "https://example.test/page/",
            "source_kind": "official_html",
            "content_sha256": web_snapshot_content_hash(snapshot),
        }

        with patch("scripts.ingest.audit_source_freshness.build_web_snapshot", return_value=snapshot):
            checked = _live_checked_source(source, all_source_kinds=True)

        self.assertEqual("current", checked["currentness"])
        self.assertEqual(source["content_sha256"], checked["live_content_sha256"])

    def test_coverage_audit_fails_production_ready_on_blocking_source_freshness(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            report_path = Path(tmpdir) / "source_freshness_report.json"
            report_path.write_text(
                json.dumps(
                    {
                        "passed": False,
                        "errors": [
                            "source_freshness:hash_changed:https://example.test/current.pdf"
                        ],
                        "sources": [],
                    }
                )
            )

            audit = build_coverage_audit(
                require_production_ready=True,
                source_freshness_report_path=report_path,
            )

        self.assertFalse(audit.passed)
        self.assertIn(
            "source_freshness:hash_changed:https://example.test/current.pdf",
            audit.errors,
        )


class OfficialParentClassificationTest(unittest.TestCase):
    def test_every_parent_item_has_classification(self) -> None:
        from scripts.ingest.disney_recreation_offerings import official_recreation_index_item_program_key

        index = json.loads(Path("data/raw/web/official-recreation-index-api.snapshot.json").read_text())
        classification = json.loads(
            Path("data/quality/official_recreation_parent_classification.json").read_text()
        )
        classified = {item["program_key"] for item in classification["items"]}
        index_keys = {
            official_recreation_index_item_program_key(item)
            for item in index.get("results", [])
            if isinstance(item, dict)
        }

        self.assertEqual(index_keys, classified)

    def test_official_coverage_summary_includes_parent_classification_counts(self) -> None:
        audit = build_official_recreation_coverage_audit()

        self.assertTrue(audit.passed, audit.errors)
        self.assertEqual(82, audit.summary["classified_parent_items"])
        self.assertEqual(0, audit.summary["missing_parent_classifications"])
        self.assertEqual(0, audit.summary["manual_parent_classifications"])


class JoggingTrailAuditTest(unittest.TestCase):
    def test_running_trails_are_present_in_official_offerings(self) -> None:
        offerings = json.loads(Path("data/processed/official_recreation_offerings.json").read_text())
        trail_rows = [
            row
            for row in offerings.get("offerings", [])
            if row.get("program_key") in {"running-trails", "jogging-trails"}
        ]

        self.assertTrue(trail_rows)
        for row in trail_rows:
            self.assertTrue(row.get("source_url"))
            self.assertRegex(row.get("source_sha256", ""), r"^[a-f0-9]{64}$")
            self.assertTrue(row.get("field_provenance", {}).get("resort_join"))

    def test_jogging_trail_audit_passes_current_official_offerings(self) -> None:
        from scripts.ingest.audit_jogging_trails import build_jogging_trail_audit

        audit = build_jogging_trail_audit()

        self.assertTrue(audit["passed"], audit["errors"])
        self.assertGreater(audit["summary"]["resort_trail_offerings"], 0)
        self.assertEqual(0, audit["summary"]["missing_source_hash"])
        self.assertEqual(0, audit["summary"]["missing_resort_join_provenance"])


class PdfVisualAuditTest(unittest.TestCase):
    def test_rendered_page_path_is_stable_for_pdf_hash_and_page(self) -> None:
        from scripts.ingest.render_pdf_pages import rendered_page_path

        path = rendered_page_path(
            Path("data/raw/pdfs/example.pdf"),
            "a" * 64,
            page_number=1,
            output_dir=Path("data/processed/pdf_page_images"),
        )

        self.assertEqual(
            Path("data/processed/pdf_page_images/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-page-001.png"),
            path,
        )

    def test_visual_audit_seed_preserves_price_evidence_shape(self) -> None:
        from scripts.ingest.gpt_visual_pdf_audit import build_visual_audit_from_gold_rows

        row = {
            "source_sha256": "a" * 64,
            "source": {"path": "data/raw/pdfs/example.pdf"},
            "title": "Movie Under the Stars",
            "section": "Movie Under the Stars",
            "schedule": {"text": "8:30pm"},
            "location": {"label": "Pool Deck"},
            "description": "Complimentary movie screening.",
            "price": {"state": "free"},
            "field_provenance": {
                "title": [{"page": 1, "line": 1, "bbox": [1, 2, 3, 4], "text": "Movie Under the Stars"}],
                "price": [{"page": 1, "line": 1, "text": "Movie Under the Stars (no ($) marker)", "field": "source_pdf_fee_marker_absent"}],
            },
        }

        audit = build_visual_audit_from_gold_rows([row], "a" * 64)

        self.assertEqual("a" * 64, audit["source_pdf_sha256"])
        self.assertEqual("source_provenance_seed", audit["audit_mode"])
        self.assertEqual("source_provenance_visual_seed_v1", audit["model"])
        self.assertTrue(audit["prompt_version"])
        self.assertEqual("Movie Under the Stars", audit["activities"][0]["title"])
        self.assertEqual("free", audit["activities"][0]["price_state"])
        self.assertEqual("marker_absent_under_legend", audit["activities"][0]["price_evidence"])
        self.assertEqual({"page": 1, "x": 1, "y": 2, "width": 2, "height": 2}, audit["activities"][0]["bbox"])

    def test_visual_audit_seed_removes_stale_seed_files(self) -> None:
        from scripts.ingest.gpt_visual_pdf_audit import build_visual_audit_seed_files

        with tempfile.TemporaryDirectory() as tmp:
            gold_path = Path(tmp) / "gold.json"
            output_dir = Path(tmp) / "audits"
            output_dir.mkdir()
            stale_path = output_dir / f"{'b' * 64}.json"
            stale_path.write_text(json.dumps({"source_pdf_sha256": "b" * 64}))
            gold_path.write_text(
                json.dumps(
                    [
                        {
                            "source_sha256": "a" * 64,
                            "source_url": "https://example.test/current.pdf",
                            "source": {"path": "data/raw/pdfs/current.pdf"},
                            "calendar_group_key": "example",
                            "canonical_slug": "movie-under-the-stars",
                            "title": "Movie Under the Stars",
                            "schedule": {"text": "8:30pm"},
                            "location": {"label": "Pool Deck"},
                            "price": {"state": "free"},
                            "field_provenance": {"title": [{"text": "Movie Under the Stars"}]},
                        }
                    ]
                )
            )

            report = build_visual_audit_seed_files(gold_path=gold_path, output_dir=output_dir)

        self.assertFalse(stale_path.exists())
        self.assertEqual(1, report["sources"])
        self.assertEqual(1, report["stale_removed"])

    def test_parse_independent_visual_audit_response_requires_strict_shape(self) -> None:
        from scripts.ingest.gpt_visual_pdf_audit import parse_independent_visual_audit_response

        payload = json.dumps(
            {
                "activities": [
                    {
                        "title": "Campfire",
                        "schedule_text": "7:00pm",
                        "location": "Fire pit",
                        "description": "Complimentary marshmallows. S'mores kits available for purchase.",
                        "price_state": "free",
                        "price_evidence": "complimentary_language",
                        "optional_price_options": ["S'mores kits available for purchase"],
                        "confidence": "high",
                        "page": 1,
                    }
                ]
            }
        )

        activities = parse_independent_visual_audit_response(payload)

        self.assertEqual("Campfire", activities[0]["title"])
        self.assertEqual("free", activities[0]["price_state"])
        self.assertEqual(["S'mores kits available for purchase"], activities[0]["optional_price_options"])

    def test_parse_independent_visual_audit_response_rejects_malformed_json(self) -> None:
        from scripts.ingest.gpt_visual_pdf_audit import parse_independent_visual_audit_response

        with self.assertRaisesRegex(RuntimeError, "independent_visual_audit_invalid"):
            parse_independent_visual_audit_response(
                json.dumps(
                    {
                        "activities": [
                            {
                                "title": "Movie Under the Stars",
                                "schedule_text": "8:30pm",
                                "location": "Lawn",
                                "description": "",
                                "price_state": "hundreds",
                                "price_evidence": "none",
                                "optional_price_options": [],
                                "confidence": "high",
                                "page": 1,
                            }
                        ]
                    }
                )
            )

    def test_independent_visual_coverage_high_requires_non_seed_complete_set(self) -> None:
        from scripts.ingest.compare_extraction_audits import compare_gold_rows_to_visual_audits

        gold_rows = [
            {
                "source_sha256": "a" * 64,
                "calendar_group_key": "example",
                "canonical_slug": "movie-under-the-stars",
                "title": "Movie Under the Stars",
                "price": {"state": "free"},
                "source_url": "https://example.test/example.pdf",
                "field_provenance": {"title": [{"text": "Movie Under the Stars"}]},
            }
        ]
        seed_report = compare_gold_rows_to_visual_audits(
            gold_rows,
            {
                "a" * 64: {
                    "audit_mode": "source_provenance_seed",
                    "source_pdf_sha256": "a" * 64,
                    "activities": [{"title": "Movie Under the Stars", "price_state": "free"}],
                }
            },
        )
        independent_report = compare_gold_rows_to_visual_audits(
            gold_rows,
            {
                "a" * 64: {
                    "audit_mode": "independent_gpt_visual",
                    "source_pdf_sha256": "a" * 64,
                    "activities": [{"title": "Movie Under the Stars", "price_state": "free"}],
                }
            },
        )

        self.assertEqual("low", seed_report["summary"]["independent_visual_ocr_coverage"])
        self.assertEqual("high", independent_report["summary"]["independent_visual_ocr_coverage"])

    def test_compare_extraction_audits_flags_price_state_mismatch(self) -> None:
        from scripts.ingest.compare_extraction_audits import compare_gold_rows_to_visual_audits

        gold_rows = [
            {
                "source_sha256": "a" * 64,
                "calendar_group_key": "example",
                "canonical_slug": "movie-under-the-stars",
                "title": "Movie Under the Stars",
                "price": {"state": "free"},
                "field_provenance": {
                    "title": [{"text": "Movie Under the Stars"}],
                    "schedule": [{"text": "8:30pm"}],
                    "location": [{"text": "Pool Deck"}],
                    "price": [{"text": "no marker", "field": "source_pdf_fee_marker_absent"}],
                },
                "source_url": "https://example.test/example.pdf",
                "source": {"path": "data/raw/pdfs/example.pdf"},
            }
        ]
        visual_audits = {
            "a" * 64: {
                "source_pdf_sha256": "a" * 64,
                "activities": [
                    {
                        "title": "Movie Under the Stars",
                        "price_state": "fee",
                        "price_evidence": "dollar_marker",
                    }
                ],
            }
        }

        report = compare_gold_rows_to_visual_audits(gold_rows, visual_audits)

        self.assertFalse(report["passed"])
        self.assertEqual(1, report["summary"]["blocking_mismatches"])
        self.assertEqual("price_state_disagrees", report["blocking_mismatches"][0]["kind"])

    def test_field_audit_report_marks_required_source_backed_fields_high_confidence(self) -> None:
        from scripts.ingest.compare_extraction_audits import build_field_audit_report

        gold_rows = [
            {
                "source_sha256": "a" * 64,
                "source_url": "https://example.test/example.pdf",
                "calendar_group_key": "example",
                "canonical_slug": "movie-under-the-stars",
                "title": "Movie Under the Stars",
                "price": {"state": "free"},
                "schedule": {"text": "8:30pm"},
                "location": {"label": "Pool Deck"},
                "field_provenance": {
                    "title": [{"text": "Movie Under the Stars"}],
                    "schedule": [{"text": "8:30pm"}],
                    "location": [{"text": "Pool Deck"}],
                    "price": [{"text": "no marker", "field": "source_pdf_fee_marker_absent"}],
                },
            }
        ]
        visual_audits = {
            "a" * 64: {
                "source_pdf_sha256": "a" * 64,
                "activities": [{"title": "Movie Under the Stars", "price_state": "free"}],
            }
        }

        report = build_field_audit_report(gold_rows, visual_audits)

        self.assertTrue(report["passed"], report["errors"])
        fields = {(row["row_key"], row["field"]): row for row in report["fields"]}
        self.assertEqual("high", fields[("example:movie-under-the-stars", "price")]["confidence"])
        self.assertTrue(fields[("example:movie-under-the-stars", "title")]["deterministic_support"])

    def test_coverage_audit_fails_production_ready_on_visual_audit_blocker(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            visual_path = Path(tmpdir) / "pdf_visual_audit_report.json"
            field_path = Path(tmpdir) / "field_audit_report.json"
            visual_path.write_text(
                json.dumps(
                    {
                        "passed": False,
                        "blocking_mismatches": [{"kind": "price_state_disagrees"}],
                        "review_mismatches": [],
                        "summary": {"blocking_mismatches": 1},
                    }
                )
            )
            field_path.write_text(json.dumps({"passed": True, "errors": [], "summary": {}}))

            audit = build_coverage_audit(
                require_production_ready=True,
                visual_audit_report_path=visual_path,
                field_audit_report_path=field_path,
            )

        self.assertFalse(audit.passed)
        self.assertIn("visual_audit:blocking_mismatches:1", audit.errors)

    def test_coverage_audit_fails_production_ready_on_field_audit_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            visual_path = Path(tmpdir) / "pdf_visual_audit_report.json"
            field_path = Path(tmpdir) / "field_audit_report.json"
            visual_path.write_text(
                json.dumps(
                    {
                        "passed": True,
                        "blocking_mismatches": [],
                        "review_mismatches": [],
                        "summary": {"blocking_mismatches": 0},
                    }
                )
            )
            field_path.write_text(
                json.dumps(
                    {
                        "passed": False,
                        "errors": ["example:price:field_missing_provenance"],
                        "summary": {"errors": 1},
                    }
                )
            )

            audit = build_coverage_audit(
                require_production_ready=True,
                visual_audit_report_path=visual_path,
                field_audit_report_path=field_path,
            )

        self.assertFalse(audit.passed)
        self.assertIn("field_audit:errors:1", audit.errors)


class SourceTrustLedgerMigrationTest(unittest.TestCase):
    def test_source_trust_ledger_migration_defines_relationships_and_observations(self) -> None:
        migration = _source_trust_ledger_migration_text()

        self.assertIn("create table if not exists public.source_relationships", migration)
        self.assertIn("create table if not exists public.source_currentness_checks", migration)
        self.assertIn("create table if not exists public.field_audit_observations", migration)
        self.assertIn("secondary_enriches_disney_row", migration)
        self.assertIn("gpt_visual_audit", migration)
        self.assertIn("manual_visual_review", migration)
        self.assertIn("alter table public.source_relationships enable row level security", migration)
        self.assertIn("grant all on public.field_audit_observations to service_role", migration)


class PublicationParityAuditTest(unittest.TestCase):
    def test_publication_parity_detects_missing_live_gold_row(self) -> None:
        from scripts.ingest.audit_publication_parity import audit_gold_publication_parity

        expected = [
            {
                "calendar_group_key": "all-star-movies",
                "canonical_slug": "movie-under-the-stars",
                "source_sha256": "a" * 64,
            }
        ]
        live: list[dict[str, Any]] = []

        report = audit_gold_publication_parity(expected, live)

        self.assertFalse(report["passed"])
        self.assertEqual(
            ["gold:all-star-movies:movie-under-the-stars:missing_live_row"],
            report["errors"],
        )

    def test_publication_parity_accepts_matching_gold_source_hash(self) -> None:
        from scripts.ingest.audit_publication_parity import audit_gold_publication_parity

        row = {
            "calendar_group_key": "all-star-movies",
            "canonical_slug": "movie-under-the-stars",
            "source_sha256": "a" * 64,
        }

        report = audit_gold_publication_parity([row], [row])

        self.assertTrue(report["passed"], report["errors"])
        self.assertEqual(1, report["summary"]["matched_gold_rows"])

    def test_publication_parity_uses_candidate_id_for_duplicate_resort_slug_rows(self) -> None:
        from scripts.ingest.audit_publication_parity import audit_gold_publication_parity

        rows = [
            {
                "candidate_id": "source-a:all-star-movies:wellness-scavenger-hunt",
                "calendar_group_key": "all-star-movies",
                "canonical_slug": "wellness-scavenger-hunt",
                "source_sha256": "a" * 64,
            },
            {
                "candidate_id": "source-b:all-star-movies:wellness-scavenger-hunt",
                "calendar_group_key": "all-star-movies",
                "canonical_slug": "wellness-scavenger-hunt",
                "source_sha256": "b" * 64,
            },
        ]

        report = audit_gold_publication_parity(rows, list(reversed(rows)))

        self.assertTrue(report["passed"], report["errors"])
        self.assertEqual(2, report["summary"]["matched_gold_rows"])


if __name__ == "__main__":
    unittest.main()
