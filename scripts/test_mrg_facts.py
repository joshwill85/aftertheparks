import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.ingest.magical_resort_guide import (
    build_db_rows_for_fact,
    extract_facts_from_html,
    merge_mrg_facts_into_gold,
    merge_mrg_validity_into_gold,
    parse_validity_window,
    publish_mrg_validity,
)


PAID_HTML = """
<html>
  <body>
    <h2>Paid Recreation Activities at Pop Century</h2>
    <p>Activities shown with this symbol are exclusively for guests staying at this resort.</p>
    <h2>Mickey Tie-Dye ($)</h2>
    <p>Sunday, Tuesday, Thursday, Saturday from 3:00-4:00 PM | '90s Sign Near Classic Hall</p>
    <p>COST: $17 (T-Shirt)</p>
    <p>Ages 3 and up. Reservations required by calling (407) WDW-PLAY.</p>
    <p>Please arrive 15 minutes prior to the start time to register.</p>
  </body>
</html>
"""

NO_RESERVATION_HTML = """
<html>
  <body>
    <h2>Free Recreation Activities at Animal Kingdom Lodge</h2>
    <h2>Disney Family Fitness Fun</h2>
    <p>Jambo House | Tuesdays at 10:30 AM | Uzima Springs Pool Deck</p>
    <p>No reservations required.</p>
  </body>
</html>
"""


class MagicalResortGuideFactsTest(unittest.TestCase):
    def test_paid_activity_fact_parser_extracts_joinable_factual_atoms(self) -> None:
        facts = extract_facts_from_html(
            PAID_HTML,
            url="https://www.magicalresortguide.com/pop-century-paid-recreation-activities",
            calendar_group_key="pop-century",
            resort_slugs=["pop-century-resort"],
            page_kind="paid_recreation",
            fetched_at="2026-06-21T12:00:00+00:00",
        )

        self.assertEqual(1, len(facts))
        fact = facts[0]

        self.assertEqual("pop-century", fact["calendar_group_key"])
        self.assertEqual(["pop-century-resort"], fact["resort_slugs"])
        self.assertEqual("mickey-tie-dye", fact["activity_slug"])
        self.assertEqual("Mickey Tie-Dye", fact["activity_title"])
        self.assertEqual("paid_recreation", fact["source_page_kind"])

        fields = fact["facts"]
        self.assertEqual(
            "Sunday, Tuesday, Thursday, Saturday from 3:00-4:00 PM",
            fields["schedule_text"],
        )
        self.assertEqual("'90s Sign Near Classic Hall", fields["exact_venue"])
        self.assertEqual("fee", fields["price_state"])
        self.assertEqual(1700, fields["price_cents_min"])
        self.assertEqual(1700, fields["price_cents_max"])
        self.assertEqual(
            [
                {
                    "option_name": "T-Shirt",
                    "price_cents_min": 1700,
                    "price_cents_max": 1700,
                    "price_basis": "per_item",
                }
            ],
            fields["price_options"],
        )
        self.assertEqual(3, fields["age_minimum"])
        self.assertTrue(fields["reservation_required"])
        self.assertEqual("phone", fields["reservation_method"])
        self.assertEqual("407-WDW-PLAY", fields["reservation_phone"])
        self.assertEqual(15, fields["check_in_offset_minutes"])
        self.assertEqual("mickey_tie_dye", fields["program_family"])
        self.assertIsNone(fields["weather_dependency"])
        self.assertEqual(
            {
                "resort_guest_only": True,
                "pool_gated": None,
                "open_to_non_resort_guests": None,
                "sister_resort_access": None,
                "adult_required": None,
            },
            fields["access_rules"],
        )
        self.assertTrue(any(e["field"] == "price" for e in fact["evidence"]))
        self.assertTrue(all("description" not in e["field"] for e in fact["evidence"]))

    def test_no_reservations_required_is_not_parsed_as_required(self) -> None:
        facts = extract_facts_from_html(
            NO_RESERVATION_HTML,
            url="https://www.magicalresortguide.com/akl-free-recreation-activities",
            calendar_group_key="animal-kingdom-jambo",
            resort_slugs=["animal-kingdom-lodge"],
            page_kind="free_recreation",
            fetched_at="2026-06-21T12:00:00+00:00",
        )

        self.assertEqual(1, len(facts))
        self.assertFalse(facts[0]["facts"]["reservation_required"])

    def test_gold_merge_preserves_official_source_and_adds_external_facts(self) -> None:
        gold = {
            "activity_catalog_id": "catalog-1",
            "calendar_group_key": "pop-century",
            "canonical_slug": "mickey-tie-dye",
            "title": "Mickey Tie-Dye",
            "price": {"state": "fee"},
            "claims": [],
            "source_url": "https://cdn1.parksmedia.wdprapps.disney.com/source.pdf",
            "source_sha256": "official-hash",
        }
        fact = {
            "calendar_group_key": "pop-century",
            "activity_slug": "mickey-tie-dye",
            "activity_title": "Mickey Tie-Dye",
            "source_url": "https://www.magicalresortguide.com/pop-century-paid-recreation-activities",
            "source_page_kind": "paid_recreation",
            "match": {"status": "unmatched"},
            "facts": {
                "price_state": "fee",
                "price_cents_min": 1700,
                "price_cents_max": 1700,
                "price_options": [
                    {
                        "option_name": "T-Shirt",
                        "price_cents_min": 1700,
                        "price_cents_max": 1700,
                        "price_basis": "per_item",
                    }
                ],
                "exact_venue": "'90s Sign Near Classic Hall",
                "age_minimum": 3,
                "reservation_required": True,
                "reservation_method": "phone",
                "reservation_phone": "407-WDW-PLAY",
                "program_family": "mickey_tie_dye",
                "access_rules": {"resort_guest_only": True},
            },
            "evidence": [{"field": "price", "text": "COST: $17 (T-Shirt)"}],
        }

        enriched = merge_mrg_facts_into_gold([gold], [fact])

        self.assertEqual(1, len(enriched))
        record = enriched[0]
        self.assertEqual(
            "https://cdn1.parksmedia.wdprapps.disney.com/source.pdf",
            record["source_url"],
        )
        self.assertEqual("official-hash", record["source_sha256"])
        self.assertEqual(
            {
                "state": "fee",
                "amountCents": 1700,
                "minAmountCents": 1700,
                "maxAmountCents": 1700,
                "notes": "$17 (T-Shirt)",
                "options": fact["facts"]["price_options"],
            },
            record["price"],
        )
        self.assertEqual(
            "'90s Sign Near Classic Hall",
            record["enrichment"]["exact_venue"],
        )
        self.assertEqual(3, record["enrichment"]["age_minimum"])
        self.assertEqual(
            "407-WDW-PLAY",
            record["enrichment"]["reservation_phone"],
        )
        self.assertEqual("matched", record["external_facts"][0]["match"]["status"])
        self.assertEqual("catalog-1", record["external_facts"][0]["activity_catalog_id"])
        self.assertTrue(
            any(claim["kind"] == "external_factual_enrichment" for claim in record["claims"])
        )

    def test_gold_merge_does_not_turn_disney_free_campfire_into_paid_event(self) -> None:
        gold = {
            "activity_catalog_id": "catalog-campfire",
            "calendar_group_key": "animal-kingdom-jambo",
            "canonical_slug": "campfire",
            "title": "Campfire",
            "price": {"state": "free"},
            "claims": [
                {
                    "kind": "fee",
                    "value": "free",
                    "evidence": [{"field": "source_pdf_fee_marker_absent"}],
                }
            ],
            "source_url": "https://cdn1.parksmedia.wdprapps.disney.com/source.pdf",
            "source_sha256": "official-hash",
        }
        fact = {
            "calendar_group_key": "animal-kingdom-jambo",
            "activity_slug": "campfire",
            "activity_title": "Campfire",
            "source_url": "https://www.magicalresortguide.com/animal-kingdom-lodge-paid-recreation-activities",
            "source_page_kind": "paid_recreation",
            "facts": {
                "price_state": "fee",
                "price_cents_min": 700,
                "price_cents_max": 700,
                "price_notes": "$7 s'mores kit",
            },
            "evidence": [{"field": "price", "text": "COST: $7 s'mores kit"}],
        }

        [record] = merge_mrg_facts_into_gold([gold], [fact])

        self.assertEqual("free", record["price"]["state"])
        self.assertNotIn("amountCents", record["price"])
        self.assertNotIn("minAmountCents", record["price"])
        self.assertNotEqual("$7 s'mores kit", record["price"].get("notes"))

    def test_validity_window_parser_extracts_schedule_good_for_dates(self) -> None:
        html = """
        <p>Current activity calendars are valid from May 26 - September 8, 2026.</p>
        <p>Fall activities calendars are expected September 9, 2026.</p>
        """

        validity = parse_validity_window(html)

        self.assertEqual("2026-05-26", validity["valid_from"])
        self.assertEqual("2026-09-08", validity["valid_until"])
        self.assertEqual("2026-09-09", validity["next_expected_schedule_date"])

    def test_gold_merge_adds_calendar_validity_window_from_mrg_artifact(self) -> None:
        gold = {
            "activity_catalog_id": "catalog-1",
            "calendar_group_key": "pop-century",
            "canonical_slug": "mickey-tie-dye",
            "title": "Mickey Tie-Dye",
            "claims": [],
            "source_url": "https://cdn1.parksmedia.wdprapps.disney.com/source.pdf",
            "source_sha256": "official-hash",
        }
        validity = {
            "valid_from": "2026-05-26",
            "valid_until": "2026-09-08",
            "next_expected_schedule_date": "2026-09-09",
            "source_url": "https://www.magicalresortguide.com/resort-activities-main",
            "source_content_sha256": "validity-hash",
        }

        enriched = merge_mrg_validity_into_gold([gold], validity)

        record = enriched[0]
        self.assertEqual("2026-05-26", record["valid_from"])
        self.assertEqual("2026-09-08", record["valid_until"])
        self.assertEqual("2026-09-09", record["enrichment"]["next_schedule_expected_date"])
        self.assertEqual("2026-05-26", record["enrichment"]["schedule_valid_from"])
        self.assertEqual("2026-09-08", record["enrichment"]["schedule_valid_until"])
        self.assertTrue(
            any(claim["kind"] == "external_schedule_validity" for claim in record["claims"])
        )
        self.assertEqual(
            "https://cdn1.parksmedia.wdprapps.disney.com/source.pdf",
            record["source_url"],
        )

    def test_publish_validity_updates_current_calendar_editions(self) -> None:
        class FakeDb:
            def __init__(self) -> None:
                self.select_calls = []
                self.updates = []

            def select(self, table, columns="*", filters=None, limit=None):
                self.select_calls.append((table, columns, filters, limit))
                return [{"id": "edition-1"}, {"id": "edition-2"}]

            def update(self, table, match, values):
                self.updates.append((table, match, values))

        db = FakeDb()
        validity = {
            "valid_from": "2026-05-26",
            "valid_until": "2026-09-08",
            "next_expected_schedule_date": "2026-09-09",
        }

        summary = publish_mrg_validity(db, validity)

        self.assertEqual({"calendar_editions": 2, "valid_from": "2026-05-26", "valid_until": "2026-09-08"}, summary)
        self.assertEqual(
            [("calendar_editions", "id", {"is_current": "eq.true"}, None)],
            db.select_calls,
        )
        self.assertEqual(
            [
                (
                    "calendar_editions",
                    {"id": "eq.edition-1"},
                    {"valid_from": "2026-05-26", "valid_until": "2026-09-08"},
                ),
                (
                    "calendar_editions",
                    {"id": "eq.edition-2"},
                    {"valid_from": "2026-05-26", "valid_until": "2026-09-08"},
                ),
            ],
            db.updates,
        )

    def test_validity_window_parser_handles_current_mrg_good_for_wording(self) -> None:
        html = """
        <p>The current resort activity calendars are good for the entirety of Cool Kids' Summer -
        that's May 26 through September 8. Fall calendars will be available on September 9, 2026.</p>
        """

        validity = parse_validity_window(html)

        self.assertEqual("2026-05-26", validity["valid_from"])
        self.assertEqual("2026-09-08", validity["valid_until"])
        self.assertEqual("2026-09-09", validity["next_expected_schedule_date"])

    def test_access_rules_do_not_infer_sister_resort_from_generic_guest_text(self) -> None:
        html = """
        <html>
          <body>
            <h2>Paid Recreation Activities at Pop Century</h2>
            <p>Activities shown with this symbol are exclusively for guests staying at this resort, and visitors
            will not be permitted to participate.</p>
            <h2>Mickey Tie-Dye ($)</h2>
            <p>Sunday from 3:00-4:00 PM | '90s Sign Near Classic Hall</p>
            <p>COST: $17 (T-Shirt)</p>
          </body>
        </html>
        """

        facts = extract_facts_from_html(
            html,
            url="https://www.magicalresortguide.com/pop-century-paid-recreation-activities",
            calendar_group_key="pop-century",
            resort_slugs=["pop-century-resort"],
            page_kind="paid_recreation",
            fetched_at="2026-06-21T12:00:00+00:00",
        )

        self.assertTrue(facts[0]["facts"]["access_rules"]["resort_guest_only"])
        self.assertIsNone(facts[0]["facts"]["access_rules"]["sister_resort_access"])
        access_evidence = [item for item in facts[0]["evidence"] if item["field"] == "access_rules"]
        self.assertEqual(1, len(access_evidence))
        self.assertIn("exclusively for guests staying at this resort", access_evidence[0]["text"])

    def test_price_parser_extracts_ranges_even_when_second_amount_omits_dollar_sign(self) -> None:
        html = """
        <html>
          <body>
            <h2>Paid Recreation Activities at Caribbean Beach</h2>
            <h2>Canvas Painting ($)</h2>
            <p>Monday from 2:00-3:00 PM | Barefoot Bay Promenade</p>
            <p>COST: $25-40</p>
          </body>
        </html>
        """

        facts = extract_facts_from_html(
            html,
            url="https://www.magicalresortguide.com/caribbean-beach-paid-recreation-activities",
            calendar_group_key="caribbean-beach",
            resort_slugs=["caribbean-beach-resort"],
            page_kind="paid_recreation",
            fetched_at="2026-06-21T12:00:00+00:00",
        )

        fields = facts[0]["facts"]
        self.assertEqual(2500, fields["price_cents_min"])
        self.assertEqual(4000, fields["price_cents_max"])
        self.assertEqual("25-40", fields["price_notes"].replace("$", ""))

    def test_matched_fact_builds_rows_for_existing_and_expanded_tables(self) -> None:
        fact = {
            "calendar_group_key": "pop-century",
            "activity_slug": "mickey-tie-dye",
            "activity_title": "Mickey Tie-Dye",
            "source_url": "https://www.magicalresortguide.com/pop-century-paid-recreation-activities",
            "source_page_kind": "paid_recreation",
            "source_content_sha256": "abc123",
            "fetched_at": "2026-06-21T12:00:00+00:00",
            "resort_slugs": ["pop-century-resort"],
            "facts": {
                "price_state": "fee",
                "price_cents_min": 1700,
                "price_cents_max": 1700,
                "price_options": [
                    {
                        "option_name": "T-Shirt",
                        "price_cents_min": 1700,
                        "price_cents_max": 1700,
                        "price_basis": "per_item",
                    }
                ],
                "exact_venue": "'90s Sign Near Classic Hall",
                "age_minimum": 3,
                "reservation_required": True,
                "reservation_method": "phone",
                "reservation_phone": "407-WDW-PLAY",
                "program_family": "mickey_tie_dye",
                "access_rules": {"resort_guest_only": True, "pool_gated": False},
            },
            "evidence": [{"field": "price", "text": "COST: $17 (T-Shirt)"}],
        }

        rows = build_db_rows_for_fact(
            fact,
            activity_catalog_id="catalog-1",
            source_document_id="source-doc-1",
            source_fact_id="fact-1",
        )

        self.assertEqual("applied", rows["external_activity_fact"]["review_status"])
        self.assertEqual("matched", rows["external_activity_fact"]["match_status"])
        self.assertEqual("catalog-1", rows["activity_booking_metadata"]["activity_catalog_id"])
        self.assertEqual(1700, rows["activity_booking_metadata"]["price_cents_min"])
        self.assertEqual("phone", rows["activity_booking_metadata"]["reservation_method"])
        self.assertEqual(
            "'90s Sign Near Classic Hall",
            rows["activity_enrichment"]["exact_venue"],
        )
        self.assertEqual("mickey_tie_dye", rows["activity_program_link"]["program_key"])
        self.assertEqual("t-shirt", rows["activity_price_options"][0]["option_key"])
        self.assertTrue(rows["activity_access_rule"]["resort_guest_only"])


if __name__ == "__main__":
    unittest.main()
