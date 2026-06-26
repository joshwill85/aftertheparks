import unittest
from pathlib import Path
import sys
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts" / "ingest"))

from scripts.ingest.source_manifest import ALL_RESORT_SLUGS


class RecreationSourceManifestTests(unittest.TestCase):
    def test_every_resort_has_its_own_disney_recreation_source(self) -> None:
        from scripts.ingest.source_manifest import RESORT_RECREATION_SOURCES

        source_slugs = {source.resort_slug for source in RESORT_RECREATION_SOURCES}
        self.assertEqual(source_slugs, ALL_RESORT_SLUGS)

    def test_fort_wilderness_has_distinct_cabins_and_campsites_sources(self) -> None:
        from scripts.ingest.source_manifest import (
            ACTIVITY_CALENDAR_GROUPS,
            RESORT_RECREATION_SOURCES,
        )

        by_slug = {source.resort_slug: source for source in RESORT_RECREATION_SOURCES}

        self.assertEqual(
            by_slug["cabins-at-fort-wilderness-resort"].disney_recreation_slug,
            "dvc-cabins-at-fort-wilderness-resort",
        )
        self.assertEqual(
            by_slug["campsites-at-fort-wilderness-resort"].disney_recreation_slug,
            "campsites-at-fort-wilderness-resort",
        )
        self.assertIn(
            "dvc-cabins-at-fort-wilderness-resort",
            by_slug["cabins-at-fort-wilderness-resort"].recreation_page_url,
        )

        fort_group = {
            group.calendar_group_key: group for group in ACTIVITY_CALENDAR_GROUPS
        }["fort-wilderness"]
        self.assertEqual(
            set(fort_group.resort_slugs),
            {
                "cabins-at-fort-wilderness-resort",
                "campsites-at-fort-wilderness-resort",
            },
        )

    def test_discovery_reports_every_resort_source_individually(self) -> None:
        from scripts.ingest.discover import discover_all_resort_sources
        from scripts.ingest.source_manifest import RESORT_RECREATION_SOURCES

        with patch(
            "scripts.ingest.discover.head_metadata",
            return_value={"http_status": 200},
        ):
            reports = discover_all_resort_sources(use_playwright=False)
        report_slugs = {report["resort_slug"] for report in reports}

        self.assertEqual(
            report_slugs,
            {source.resort_slug for source in RESORT_RECREATION_SOURCES},
        )

        cabins = next(
            report
            for report in reports
            if report["resort_slug"] == "cabins-at-fort-wilderness-resort"
        )
        self.assertEqual(
            cabins["recreation_page_url"],
            "https://disneyworld.disney.go.com/resorts/dvc-cabins-at-fort-wilderness-resort/recreation/",
        )
        self.assertEqual(cabins["calendar_group_key"], "fort-wilderness")


if __name__ == "__main__":
    unittest.main()
