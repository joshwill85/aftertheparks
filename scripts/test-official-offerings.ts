import assert from "node:assert/strict";

import {
  mapOfficialOfferingRow,
  mapOfficialOfferingRows,
  type OfficialOfferingRow,
} from "@/lib/data/officialOfferings";

const bikeRow: OfficialOfferingRow = {
  id: "offering-bike-old-key-west",
  program_id: "program-bike",
  program_key: "bike-rentals",
  offering_key: "bike-rentals:old-key-west-resort:default",
  resort_slug: "old-key-west-resort",
  resort_name: "Disney's Old Key West Resort",
  resort_category: "deluxe_villa",
  resort_area: "disney_springs",
  title: "Bike Rentals",
  description: "Explore the great outdoors from the comfort of a bicycle.",
  category: "rental",
  tags: ["recreation", "rentals"],
  location: {
    label: "Disney's Old Key West Resort",
  },
  availability: {
    kind: "evergreen_all_day",
    hours_state: "varies",
    label: "Available daily; hours vary",
  },
  price: { state: "unknown" },
  booking: { reservation_required: false },
  eligibility: {},
  amenities: ["helmets", "child seats"],
  claims: {
    walkability: { value: "unknown", evidence: [] },
    transportation: { value: "unknown", evidence: [] },
  },
  source_url: "https://disneyworld.disney.go.com/recreation/bike-rentals/",
  source_sha256: "b".repeat(64),
  source_document_id: "source-bike",
  field_provenance: {
    title: [{ page: 1, line: 191, text: "# Bike Rentals" }],
    resort_join: [
      { page: 1, line: 202, text: "Disney's Old Key West Resort" },
    ],
  },
  trust_state: "source_backed",
};

const bikeOffering = mapOfficialOfferingRow(bikeRow);

assert.equal(bikeOffering.activitySlug, "bike-rentals");
assert.equal(bikeOffering.title, "Bike Rentals");
assert.equal(bikeOffering.resort.slug, "old-key-west-resort");
assert.equal(bikeOffering.availability.kind, "evergreen_all_day");
assert.equal(bikeOffering.availability.label, "Available daily; hours vary");
assert.equal(bikeOffering.price.state, "unknown");
assert.equal(bikeOffering.source?.url, bikeRow.source_url);
assert.equal(bikeOffering.source?.documentHash, bikeRow.source_sha256);
assert.equal(bikeOffering.fieldProvenance?.resortJoin?.[0]?.line, 202);
assert.equal(bikeOffering.claims?.walkability?.value, "unknown");
assert.equal(bikeOffering.claims?.transportation?.value, "unknown");
assert.equal(bikeOffering.freshness.badge, "verified");
assert.equal(
  "startDateTime" in bikeOffering,
  false,
  "Official evergreen offerings must not be coerced into dated calendar occurrences"
);

const cabanaRows: OfficialOfferingRow[] = [
  {
    ...bikeRow,
    id: "offering-cabana-beach",
    program_id: "program-cabana",
    program_key: "cabanas",
    offering_key: "cabanas:beach-club-resort:shared-beach-yacht-club",
    resort_slug: "beach-club-resort",
    resort_name: "Disney's Beach Club Resort",
    title: "Cabanas",
    description: "Relax in a private cabana at select Walt Disney World Resort hotels.",
    category: "resort_activity",
    availability: {
      kind: "reservation_based",
      hours_state: "source_unspecified",
      label: "Reservations recommended",
    },
    booking: {
      reservation_recommended: true,
      cancellation_notice_hours: 24,
    },
    eligibility: {
      resort_guest_only: true,
    },
    amenities: ["padded furniture", "towels", "mini-refrigerator"],
  },
];

const [cabana] = mapOfficialOfferingRows(cabanaRows);

assert.equal(cabana.availability.kind, "reservation_based");
assert.equal(cabana.booking?.reservationRecommended, true);
assert.equal(cabana.booking?.cancellationNoticeHours, 24);
assert.equal(cabana.eligibility.resortGuestOnly, true);
assert.deepEqual(cabana.amenities, ["padded furniture", "towels", "mini-refrigerator"]);
