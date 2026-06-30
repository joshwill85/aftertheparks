import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getPublicOfferingAvailabilityLabel,
  shouldShowOfferingAvailability,
} from "@/lib/activityAvailabilityDisplay";
import { publicPriceDetail } from "@/lib/priceLabels";
import {
  filterOfficialOfferingsWithoutActivityCollisions,
  isSourceBackedOfficialOfferingRow,
  mapOfficialOfferingRow,
  mapOfficialOfferingRows,
  type OfficialOfferingRow,
} from "@/lib/data/officialOfferings";
import {
  offeringToHit,
  scoreOffering,
} from "@/lib/search/score";

type GeneratedOfficialOfferingRow = OfficialOfferingRow & {
  availability: NonNullable<OfficialOfferingRow["availability"]> & { label: string };
  amenities: NonNullable<OfficialOfferingRow["amenities"]>;
  field_provenance: NonNullable<OfficialOfferingRow["field_provenance"]>;
  location: NonNullable<OfficialOfferingRow["location"]> & { label: string };
  price: NonNullable<OfficialOfferingRow["price"]> & {
    notes?: string;
    state: "free" | "fee" | "unknown";
  };
};

const generatedOfficialOfferings = JSON.parse(
  readFileSync("data/processed/official_recreation_offerings.json", "utf8")
) as { offerings: GeneratedOfficialOfferingRow[] };

const generatedRunningTrailOfferings = generatedOfficialOfferings.offerings.filter(
  (offering) => offering.title === "Running Trails"
);
assert.equal(
  generatedRunningTrailOfferings.length,
  23,
  "Official Running Trails should remain joined to every current Disney resort trail listing"
);
assert.deepEqual(
  new Set(generatedRunningTrailOfferings.map((offering) => offering.price.state)),
  new Set(["free"]),
  "Official Running Trails should publish as Free, not Price unclear"
);
assert.ok(
  generatedRunningTrailOfferings.every((offering) => offering.field_provenance?.price?.length),
  "Official Running Trails free labels require source provenance"
);

const generatedElectricalWaterPageantOfferings = generatedOfficialOfferings.offerings.filter(
  (offering) => offering.title === "Electrical Water Pageant"
);
assert.deepEqual(
  generatedElectricalWaterPageantOfferings
    .map((offering) => offering.resort_slug)
    .sort(),
  [
    "campsites-at-fort-wilderness-resort",
    "contemporary-resort",
    "grand-floridian-resort-and-spa",
    "polynesian-village-resort",
    "wilderness-lodge",
  ],
  "Electrical Water Pageant should use Disney's official viewing-location list"
);
assert.deepEqual(
  new Set(generatedElectricalWaterPageantOfferings.map((offering) => offering.price.state)),
  new Set(["free"]),
  "Electrical Water Pageant should publish as Free, not Price unclear"
);
assert.deepEqual(
  new Set(generatedElectricalWaterPageantOfferings.map((offering) => offering.availability.label)),
  new Set(["Viewing window 8:35 PM-10:05 PM; location showtimes vary"]),
  "Electrical Water Pageant should not imply every viewing resort sees the full performance window"
);

function generatedOfferingByKey(offeringKey: string): GeneratedOfficialOfferingRow {
  const offering = generatedOfficialOfferings.offerings.find(
    (row) => row.offering_key === offeringKey
  );
  assert.ok(offering, `Missing generated official offering ${offeringKey}`);
  return offering;
}

const generatedTriCircleDRanch = generatedOfferingByKey(
  "tri-circle-d-ranch:campsites-at-fort-wilderness-resort:campsites-at-fort-wilderness-resort"
);
assert.equal(
  generatedTriCircleDRanch.price.state,
  "free",
  "Tri-Circle-D Ranch stable walkthrough should publish as Free, with paid ride experiences listed separately"
);
assert.equal(
  generatedTriCircleDRanch.availability.label,
  "Daily 10:00 AM-5:00 PM",
  "Tri-Circle-D Ranch parent row should use stable open hours, not child-experience reservation wording"
);
assert.ok(
  generatedTriCircleDRanch.field_provenance?.price?.some((span) =>
    String(span.text).includes("Guests are welcome to walk through")
  ),
  "Tri-Circle-D Ranch free label requires source evidence from Disney's stable walkthrough language"
);

const expectedDocksideFishingKeys = [
  "dockside-fishing:campsites-at-fort-wilderness-resort:fort-wilderness",
  "dockside-fishing:port-orleans-resort-riverside:port-orleans-resort-riverside",
];
for (const offeringKey of expectedDocksideFishingKeys) {
  const offering = generatedOfferingByKey(offeringKey);
  assert.equal(offering.title, "Dockside Fishing", `${offeringKey} should publish as dockside fishing`);
  assert.equal(offering.price.state, "fee", `${offeringKey} should not publish as Free`);
  assert.equal(
    offering.claims?.gear_policy?.value,
    "rental_poles_required",
    `${offeringKey} should carry the planDisney rental-pole policy`
  );
  assert.equal(
    offering.claims?.catch_policy?.value,
    "catch_and_release_only",
    `${offeringKey} should carry Disney's catch-and-release policy`
  );
  assert.equal(
    offering.claims?.fish_species,
    undefined,
    `${offeringKey} should not inherit excursion-only fish species claims`
  );
  assert.equal(
    offering.claims?.waterways,
    undefined,
    `${offeringKey} should not inherit excursion-only waterway claims`
  );
  assert.ok(
    offering.field_provenance?.price?.some((span) =>
      String(span.text).includes("Fishing gear is available for rental")
    ),
    `${offeringKey} fee state requires Disney fishing-page evidence`
  );
}
assert.equal(
  generatedOfferingByKey(
    "dockside-fishing:campsites-at-fort-wilderness-resort:fort-wilderness"
  ).location.label,
  "Bike Barn"
);
assert.equal(
  generatedOfferingByKey(
    "dockside-fishing:port-orleans-resort-riverside:port-orleans-resort-riverside"
  ).location.label,
  "Fishin' Hole at Ol' Man Island"
);

const expectedEquestrianPrices: Array<[string, string, number | undefined, number | undefined]> = [
  [
    "horseback-riding:campsites-at-fort-wilderness-resort:campsites-at-fort-wilderness-resort",
    "fee",
    6500,
    6500,
  ],
  [
    "horse-drawn-carriage-rides:campsites-at-fort-wilderness-resort:campsites-at-fort-wilderness-resort",
    "fee",
    undefined,
    undefined,
  ],
  [
    "horse-drawn-carriage-rides:cabins-at-fort-wilderness-resort:cabins-at-fort-wilderness-resort",
    "fee",
    undefined,
    undefined,
  ],
  [
    "horse-drawn-carriage-rides:port-orleans-resort-riverside:port-orleans-resort-riverside",
    "fee",
    undefined,
    undefined,
  ],
  [
    "pony-rides:campsites-at-fort-wilderness-resort:campsites-at-fort-wilderness-resort",
    "fee",
    undefined,
    undefined,
  ],
  [
    "horse-drawn-excursion-wagon-ride:campsites-at-fort-wilderness-resort:campsites-at-fort-wilderness-resort",
    "fee",
    undefined,
    undefined,
  ],
  [
    "horse-drawn-excursion-holiday-sleigh-rides:campsites-at-fort-wilderness-resort:campsites-at-fort-wilderness-resort",
    "fee",
    undefined,
    undefined,
  ],
];
for (const [offeringKey, state, minAmountCents, maxAmountCents] of expectedEquestrianPrices) {
  const offering = generatedOfferingByKey(offeringKey);
  assert.equal(offering.price.state, state, `${offeringKey} should have a real Disney price state`);
  assert.ok(
    offering.field_provenance?.price?.length,
    `${offeringKey} price requires source provenance`
  );
  if (minAmountCents != null) {
    assert.equal(offering.price.minAmountCents, minAmountCents);
  }
  if (maxAmountCents != null) {
    assert.equal(offering.price.maxAmountCents, maxAmountCents);
  }
}

const expectedCommunityHallKeys = [
  "community-halls:animal-kingdom-villas-kidani-village:animal-kingdom-villas-kidani-village",
  "community-halls:boardwalk-villas:boardwalk-villas",
  "community-halls:contemporary-resort:contemporary-resort",
  "community-halls:old-key-west-resort:old-key-west-resort",
  "community-halls:saratoga-springs-resort-and-spa:saratoga-springs-resort-and-spa",
];
for (const offeringKey of expectedCommunityHallKeys) {
  const offering = generatedOfferingByKey(offeringKey);
  assert.equal(offering.price.state, "free", `${offeringKey} should publish as Free`);
  assert.ok(offering.description, `${offeringKey} should include official Community Hall detail`);
  assert.ok(
    offering.amenities.length >= 3,
    `${offeringKey} should include useful Community Hall amenities`
  );
  assert.ok(
    offering.field_provenance?.price?.length,
    `${offeringKey} free price label requires source provenance`
  );
  assert.ok(
    offering.field_provenance?.amenities?.length,
    `${offeringKey} amenities require source provenance`
  );
}
assert.equal(
  generatedOfferingByKey(
    "community-halls:old-key-west-resort:old-key-west-resort"
  ).availability.label,
  "Daily 10:00 AM-10:00 PM"
);

const expectedGolfKeys = [
  "disneys-magnolia-golf-course:polynesian-village-resort:polynesian-village-resort",
  "disneys-palm-golf-course:polynesian-village-resort:polynesian-village-resort",
  "disneys-oak-trail-golf-course:polynesian-village-resort:polynesian-village-resort",
  "disneys-lake-buena-vista-golf-course:saratoga-springs-resort-and-spa:saratoga-springs-resort-and-spa",
  "walt-disney-world-golf:saratoga-springs-resort-and-spa:saratoga-springs-resort-and-spa",
];
for (const offeringKey of expectedGolfKeys) {
  const offering = generatedOfferingByKey(offeringKey);
  assert.equal(offering.price.state, "fee", `${offeringKey} should publish as Paid`);
  assert.match(
    offering.price.notes ?? "",
    /rates vary|green fees vary|tee time/i,
    `${offeringKey} should explain that Disney golf pricing is dynamic`
  );
  assert.ok(
    offering.field_provenance?.price?.some((span) =>
      String((span as { source_url?: unknown }).source_url ?? "").includes(
        "golfwdw.com/courses/golf-rates"
      )
    ),
    `${offeringKey} price requires source provenance from the official Golf WDW rates page`
  );
}
assert.match(
  generatedOfferingByKey(
    "disneys-lake-buena-vista-golf-course:saratoga-springs-resort-and-spa:saratoga-springs-resort-and-spa"
  ).availability.label,
  /closed for renovations.*fall 2026/i,
  "Lake Buena Vista Golf Course should retain Disney's current renovation status"
);

const sunset9 = generatedOfferingByKey(
  "sunset-9-hole-golf-promotion:polynesian-village-resort:polynesian-village-resort"
);
assert.equal(sunset9.price.state, "fee");
assert.equal(sunset9.price.minAmountCents, 3900);
assert.equal(sunset9.price.maxAmountCents, 7500);
assert.ok(
  sunset9.field_provenance?.price?.some((span) =>
    String(span.text).includes("$39 - $75") ||
    String(span.text).includes("$39-$75")
  ),
  "Sunset 9 should use the official Golf WDW seasonal range evidence"
);

const fantasiaMiniGolf = generatedOfferingByKey(
  "fantasia-gardens-and-fairways-miniature-golf:boardwalk-inn:epcot-resort-area"
);
assert.equal(fantasiaMiniGolf.price.state, "fee");
assert.equal(fantasiaMiniGolf.price.minAmountCents, 1200);
assert.equal(fantasiaMiniGolf.price.maxAmountCents, 1900);
assert.match(
  fantasiaMiniGolf.location.label,
  /Swan Hotel.*EPCOT Resort Area/i,
  "Fantasia mini-golf should preserve Disney's official location text while using a resort-area join"
);

const winterSummerlandMiniGolf = generatedOfferingByKey(
  "winter-summerland-miniature-golf:animal-kingdom-lodge:animal-kingdom-resort-area"
);
assert.equal(winterSummerlandMiniGolf.price.state, "fee");
assert.equal(winterSummerlandMiniGolf.price.minAmountCents, 1200);
assert.equal(winterSummerlandMiniGolf.price.maxAmountCents, 1900);
assert.match(
  winterSummerlandMiniGolf.location.label,
  /Animal Kingdom Resort Area/i,
  "Winter Summerland mini-golf should preserve Disney's official resort-area location text"
);

const expectedComplimentaryFitnessKeys = [
  "old-key-west-exercise-room:old-key-west-resort:old-key-west-resort",
  "survival-of-the-fittest-fitness-center:animal-kingdom-villas-kidani-village:animal-kingdom-villas-kidani-village",
];
for (const offeringKey of expectedComplimentaryFitnessKeys) {
  const offering = generatedOfferingByKey(offeringKey);
  assert.equal(offering.price.state, "free", `${offeringKey} should publish as Free`);
  assert.match(
    offering.price.notes ?? "",
    /complimentary for Guests staying/i,
    `${offeringKey} should use Disney's complimentary fitness-room evidence`
  );
  assert.ok(
    offering.field_provenance?.price?.some((span) =>
      /complimentary for Guests staying/i.test(String(span.text))
    ),
    `${offeringKey} free price label requires source provenance`
  );
}

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
assert.equal(
  bikeOffering.location.label,
  "Old Key West Resort",
  "Specific location labels require location source spans"
);
assert.equal(bikeOffering.availability.kind, "evergreen_all_day");
assert.equal(
  bikeOffering.availability.label,
  undefined,
  "Specific availability labels require availability source spans"
);
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

const missingResortJoinRow: OfficialOfferingRow = {
  ...bikeRow,
  id: "offering-missing-resort-join",
  field_provenance: {
    title: bikeRow.field_provenance!.title,
  },
};
const missingHashRow: OfficialOfferingRow = {
  ...bikeRow,
  id: "offering-missing-source-hash",
  source_sha256: null,
};
const malformedHashRow: OfficialOfferingRow = {
  ...bikeRow,
  id: "offering-malformed-source-hash",
  source_sha256: "broken",
};
const missingTitleProvenanceRow: OfficialOfferingRow = {
  ...bikeRow,
  id: "offering-missing-title-provenance",
  field_provenance: {
    resort_join: bikeRow.field_provenance!.resort_join,
  },
};
assert.equal(isSourceBackedOfficialOfferingRow(bikeRow), true);
assert.equal(isSourceBackedOfficialOfferingRow(missingResortJoinRow), false);
assert.equal(isSourceBackedOfficialOfferingRow(missingHashRow), false);
assert.equal(isSourceBackedOfficialOfferingRow(malformedHashRow), false);
assert.equal(isSourceBackedOfficialOfferingRow(missingTitleProvenanceRow), false);
assert.deepEqual(
  mapOfficialOfferingRows([
    bikeRow,
    missingResortJoinRow,
    missingHashRow,
    malformedHashRow,
    missingTitleProvenanceRow,
  ]).map((offering) => offering.id),
  [bikeRow.id],
  "Public official offering lists must fail closed unless source URL/hash, title provenance, and resort-join provenance are present"
);
const unverifiedSingleOffering = mapOfficialOfferingRow(missingResortJoinRow);
assert.equal(unverifiedSingleOffering.freshness.badge, "stale");
assert.equal(
  unverifiedSingleOffering.trustState,
  "source_unclear",
  "Direct official offering mapping must not mark rows source_backed when required provenance is missing"
);
assert.equal(
  mapOfficialOfferingRow(malformedHashRow).freshness.badge,
  "stale",
  "Direct official offering mapping must not verify malformed source hashes"
);

assert.equal(
  shouldShowOfferingAvailability(bikeOffering.availability),
  false,
  "Official offering cards must omit availability when Disney did not source hours"
);
assert.equal(
  getPublicOfferingAvailabilityLabel(bikeOffering.availability),
  undefined,
  "Unsourced availability placeholders must not become public display text"
);
assert.equal(
  offeringToHit(bikeOffering, 20).description,
  bikeOffering.summary,
  "Search snippets must prefer sourced summaries over placeholder availability labels"
);
assert.equal(
  scoreOffering(bikeOffering, "hours not specified", ["hours", "not", "specified"]),
  8,
  "Search scoring must not match unsourced availability placeholder text"
);

const sourceBackedAvailabilityOffering = mapOfficialOfferingRow({
  ...bikeRow,
  id: "offering-source-backed-availability",
  field_provenance: {
    ...bikeRow.field_provenance,
    availability: [{ page: 1, line: 210, text: "Available daily; hours vary" }],
  },
});
assert.equal(
  sourceBackedAvailabilityOffering.availability.label,
  "Available daily; hours vary"
);
assert.equal(
  sourceBackedAvailabilityOffering.fieldProvenance?.availability?.[0]?.line,
  210
);
assert.equal(
  shouldShowOfferingAvailability(sourceBackedAvailabilityOffering.availability),
  true,
  "Official offering cards may show source-backed availability labels"
);
assert.equal(
  getPublicOfferingAvailabilityLabel(sourceBackedAvailabilityOffering.availability),
  "Available daily; hours vary"
);

const paidOffering = mapOfficialOfferingRow({
  ...bikeRow,
  id: "offering-paid-bike",
  price: { state: "fee", notes: "$9 per hour" },
  field_provenance: {
    ...bikeRow.field_provenance,
    price: [{ page: 1, line: 220, text: "$9 per hour" }],
  },
});
assert.equal(paidOffering.price.state, "fee");
assert.equal(paidOffering.price.notes, "$9 per hour");
assert.equal(paidOffering.fieldProvenance?.price?.[0]?.line, 220);

const wildernessBackTrailOffering = mapOfficialOfferingRow({
  ...bikeRow,
  id: "offering-wilderness-back-trail",
  program_key: "wilderness-back-trail-adventure",
  offering_key: "wilderness-back-trail-adventure:cabins-at-fort-wilderness-resort:cabins-at-fort-wilderness-resort",
  resort_slug: "cabins-at-fort-wilderness-resort",
  resort_name: "The Cabins at Disney's Fort Wilderness Resort",
  title: "Wilderness Back Trail Adventure",
  price: {
    state: "fee",
    notes: "$90–$99 per Person (tax not included)",
    minAmountCents: 9000,
    maxAmountCents: 9900,
    priceBasis: "per_person",
    taxNotes: "tax not included",
  },
  field_provenance: {
    ...bikeRow.field_provenance,
    price: [
      {
        page: 1,
        line: 5,
        text: "$90–$99 per Person (tax not included)",
      },
    ],
  },
});
assert.equal(wildernessBackTrailOffering.price.state, "fee");
assert.equal(wildernessBackTrailOffering.price.minAmountCents, 9000);
assert.equal(wildernessBackTrailOffering.price.maxAmountCents, 9900);
assert.equal(wildernessBackTrailOffering.price.priceBasis, "per_person");
assert.equal(publicPriceDetail(wildernessBackTrailOffering.price), "$90-$99 per person");

const fortCampfireOffering = mapOfficialOfferingRow({
  ...bikeRow,
  id: "offering-fort-campfire",
  program_key: "chip-n-dales-campfire-sing-a-long",
  offering_key: "chip-n-dales-campfire-sing-a-long:campsites-at-fort-wilderness-resort:default",
  resort_slug: "campsites-at-fort-wilderness-resort",
  resort_name: "Disney's Fort Wilderness Resort & Campground",
  title: "Chip 'n' Dale's Campfire Sing-A-Long",
  category: "campfire",
  price: {
    state: "free",
    options: [
      {
        optionName: "Fort S'Mores Kit",
        priceBasis: "optional_add_on",
        priceCentsMin: 999,
        priceCentsMax: 999,
        priceConfidence: "disney_menu_verified",
        verificationStatus: "verified",
        sourceUrl: "https://disneyworld.disney.go.com/dining/cabins-at-fort-wilderness-resort/chuck-wagon-fresh-fixins-food-truck/menus/lunch-and-dinner/",
        sourceLabel: "Disney Chuck Wagon menu",
      },
    ],
  },
  field_provenance: {
    ...bikeRow.field_provenance,
    price: [{ page: 1, line: 12, text: "complimentary" }],
  },
});
assert.equal(fortCampfireOffering.price.state, "free");
assert.equal(fortCampfireOffering.price.options?.[0]?.priceCentsMin, 999);
assert.equal(fortCampfireOffering.price.options?.[0]?.priceConfidence, "disney_menu_verified");
assert.equal(fortCampfireOffering.price.options?.[0]?.sourceLabel, "Disney Chuck Wagon menu");

const unsupportedPaidOffering = mapOfficialOfferingRow({
  ...bikeRow,
  id: "offering-unsupported-paid-bike",
  price: { state: "fee", notes: "$9 per hour" },
  field_provenance: bikeRow.field_provenance,
});
assert.equal(
  unsupportedPaidOffering.price.state,
  "unknown",
  "Official offering paid/free labels require price source spans"
);

const sourceBackedLocationOffering = mapOfficialOfferingRow({
  ...bikeRow,
  id: "offering-source-backed-location",
  location: {
    label: "Community Hall",
    lat: 28.0,
    lng: -81.0,
  },
  field_provenance: {
    ...bikeRow.field_provenance,
    location: [{ page: 1, line: 225, text: "Community Hall" }],
  },
});
assert.equal(sourceBackedLocationOffering.location.label, "Community Hall");
assert.equal(sourceBackedLocationOffering.location.lat, 28.0);
assert.equal(
  sourceBackedLocationOffering.fieldProvenance?.location?.[0]?.line,
  225
);

const unsupportedLocationOffering = mapOfficialOfferingRow({
  ...bikeRow,
  id: "offering-unsupported-location",
  location: {
    label: "Community Hall",
    lat: 28.0,
    lng: -81.0,
  },
  field_provenance: bikeRow.field_provenance,
});
assert.equal(
  unsupportedLocationOffering.location.label,
  "Old Key West Resort",
  "Unsupported specific locations fall back to the joined resort"
);
assert.equal(
  unsupportedLocationOffering.location.lat,
  undefined,
  "Unsupported location coordinates must not be exposed"
);

assert.deepEqual(
  filterOfficialOfferingsWithoutActivityCollisions([bikeOffering], [
    {
      activitySlug: "bike-rentals",
      resort: { slug: "old-key-west-resort" },
    } as any,
  ]),
  [],
  "Official evergreen offerings must defer to source-backed dated activities with the same resort and slug"
);
assert.deepEqual(
  filterOfficialOfferingsWithoutActivityCollisions([bikeOffering], [
    {
      activitySlug: "bike-rentals",
      resort: { slug: "saratoga-springs-resort-spa" },
    } as any,
  ]),
  [bikeOffering],
  "Official evergreen offerings must remain visible for resorts not covered by a matching dated activity"
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
    field_provenance: {
      ...bikeRow.field_provenance,
      booking: [
        {
          page: 1,
          line: 230,
          text: "Advance reservations are highly recommended. 24-hour notice required.",
        },
      ],
      eligibility: [
        {
          page: 1,
          line: 231,
          text: "Available to guests of those resorts only.",
        },
      ],
      amenities: [
        {
          page: 1,
          line: 232,
          text: "Amenities include padded furniture, towels and a mini-refrigerator.",
        },
      ],
    },
  },
];

const [cabana] = mapOfficialOfferingRows(cabanaRows);

assert.equal(cabana.availability.kind, "reservation_based");
assert.equal(
  cabana.availability.label,
  undefined,
  "Reservation-style availability labels require availability source spans"
);
assert.equal(cabana.booking?.reservationRecommended, true);
assert.equal(cabana.booking?.cancellationNoticeHours, 24);
assert.equal(cabana.eligibility.resortGuestOnly, true);
assert.equal(cabana.fieldProvenance?.eligibility?.[0]?.line, 231);
assert.deepEqual(cabana.amenities, ["padded furniture", "towels", "mini-refrigerator"]);
assert.equal(cabana.fieldProvenance?.amenities?.[0]?.line, 232);

const unsupportedBookingCabana = mapOfficialOfferingRow({
  ...cabanaRows[0],
  id: "offering-cabana-unsupported-booking",
  field_provenance: {
    title: cabanaRows[0].field_provenance!.title,
    resort_join: cabanaRows[0].field_provenance!.resort_join,
  },
});
assert.equal(
  unsupportedBookingCabana.booking,
  undefined,
  "Booking notes require booking source spans"
);
assert.equal(
  unsupportedBookingCabana.eligibility.resortGuestOnly,
  undefined,
  "Resort guest access notes require eligibility source spans"
);
assert.deepEqual(
  unsupportedBookingCabana.amenities,
  [],
  "Amenity lists require amenity source spans"
);

const unavailableOffering = mapOfficialOfferingRow({
  ...bikeRow,
  id: "offering-holiday-sleigh",
  program_id: "program-holiday-sleigh",
  program_key: "horse-drawn-excursion-holiday-sleigh-rides",
  offering_key:
    "horse-drawn-excursion-holiday-sleigh-rides:campsites-at-fort-wilderness-resort:campsites-at-fort-wilderness-resort",
  resort_slug: "campsites-at-fort-wilderness-resort",
  resort_name: "Disney's Fort Wilderness Resort & Campground",
  title: "Horse Drawn Excursion - Holiday Sleigh Rides",
  availability: {
    kind: "calendar_dependent",
    hours_state: "currently_unavailable",
    label: "Currently unavailable; check source for return window",
  },
});

assert.equal(
  unavailableOffering.status,
  "paused",
  "Official offerings marked currently unavailable by Disney must not render as active"
);

const resortApiRoute = readFileSync("app/api/resorts/[slug]/route.ts", "utf8");
assert.match(
  resortApiRoute,
  /getOfficialOfferingsForResort/,
  "Resort API responses must include non-calendar official recreation offerings"
);
assert.match(
  resortApiRoute,
  /officialOfferings/,
  "Resort API responses must expose officialOfferings for downstream resort pages"
);
assert.match(
  resortApiRoute,
  /offeringCount/,
  "Resort API responses must expose offeringCount alongside scheduled activity count"
);

const resortListApiRoute = readFileSync("app/api/resorts/route.ts", "utf8");
assert.match(
  resortListApiRoute,
  /offeringCount/,
  "Resort list API must expose offering counts for directory consumers"
);

const occurrenceTypes = readFileSync("lib/types/occurrence.ts", "utf8");
assert.match(
  occurrenceTypes,
  /offeringCount:\s*number/,
  "Resort summaries must include official offering counts separately from scheduled activity counts"
);

const activitiesData = readFileSync("lib/data/activities.ts", "utf8");
assert.match(
  activitiesData,
  /v_public_activity_gold/,
  "Resort summaries must count scheduled activities from the public Gold view"
);
assert.match(
  activitiesData,
  /v_public_activity_offerings/,
  "Resort summaries must count official recreation offerings from the public offering view"
);

const categoryMeta = readFileSync("lib/categories/meta.ts", "utf8");
assert.match(
  categoryMeta,
  /rental:/,
  "Category metadata must include rental rows from Gold and official offerings"
);
assert.match(
  categoryMeta,
  /sports_games:/,
  "Category metadata must include sports/games rows from Gold"
);

const filterRail = readFileSync("components/explore/FilterRail.tsx", "utf8");
assert.match(
  filterRail,
  /CATEGORY_META/,
  "Explore category filters must be driven by category metadata instead of a stale fixed subset"
);

const resortCard = readFileSync("components/resort/ResortCard.tsx", "utf8");
assert.match(
  resortCard,
  /offeringCount/,
  "Resort cards must display official offering counts"
);

const resortGrid = readFileSync("components/resort/ResortGrid.tsx", "utf8");
assert.match(
  resortGrid,
  /activityCount \+ .*offeringCount/,
  "Resort grid activity sorting must include official offerings"
);

const resortPage = readFileSync("app/resorts/[slug]/page.tsx", "utf8");
assert.match(
  resortPage,
  /id="official-offerings"/,
  "Search hits for official offerings must jump to the resort page offering section"
);

const searchTypes = readFileSync("lib/search/types.ts", "utf8");
assert.match(
  searchTypes,
  /officialOfferings:\s*ActivityOffering\[\]/,
  "Search responses must expose officialOfferings separately from dated activities"
);

const searchRunner = readFileSync("lib/search/runSearch.ts", "utf8");
assert.match(
  searchRunner,
  /fetchOfficialActivityOfferings|loadSearchableOfferings/,
  "Search must load official recreation offerings, not only timed occurrences"
);
assert.match(
  readFileSync("lib/search/providers/local.ts", "utf8"),
  /kind === "offering"/,
  "Search must score official recreation offerings as first-class results"
);

const searchClient = readFileSync("components/atlas/SearchClient.tsx", "utf8");
assert.match(
  searchClient,
  /SearchHitRow/,
  "Search UI must render official recreation offerings through unified search hit rows"
);
assert.match(
  searchClient,
  /payload\.officialOfferings/,
  "Search UI must include official offerings in result visibility checks"
);

const officialOfferingsData = readFileSync("lib/data/officialOfferings.ts", "utf8");
assert.match(
  officialOfferingsData,
  /filter\(isSourceBackedOfficialOfferingRow\)/,
  "Public official offering lists must filter out rows missing source-backed title and resort-join evidence"
);
assert.match(
  officialOfferingsData,
  /getFilteredOfficialOfferings/,
  "Official offerings must have a shared filter helper for browse and API surfaces"
);
assert.match(
  officialOfferingsData,
  /filters\.reservation/,
  "Official offerings must support reservation-aware filtering"
);

const occurrenceTypesForFilters = readFileSync("lib/types/occurrence.ts", "utf8");
assert.match(
  occurrenceTypesForFilters,
  /reservation\?:\s*boolean/,
  "Browse filters must include reservation-aware filtering"
);

const browseParams = readFileSync("lib/explore/browseParams.ts", "utf8");
assert.match(
  browseParams,
  /"reservation"/,
  "Browse URL params must preserve reservation filters"
);

const browseFilterLogic = readFileSync("lib/explore/applyBrowseFilters.ts", "utf8");
assert.match(
  browseFilterLogic,
  /filters\.reservation/,
  "Dated activity browse filters must apply reservation filters"
);

assert.match(
  filterRail,
  /Reservations/,
  "Explore filters must expose reservation filtering in the UI"
);

const calendarClient = readFileSync("components/atlas/CalendarClient.tsx", "utf8");
assert.match(
  calendarClient,
  /selectedDate/,
  "Calendar must expose a selected-day drilldown instead of only aggregate dots"
);
assert.match(
  calendarClient,
  /Filter by resort/,
  "Calendar must let users filter visible events by resort"
);
assert.match(
  calendarClient,
  /Filter by category/,
  "Calendar must let users filter visible events by category"
);

const activitiesApiRoute = readFileSync("app/api/activities/route.ts", "utf8");
assert.match(
  activitiesApiRoute,
  /getFilteredOfficialOfferings/,
  "Activities API must include official recreation offerings alongside timed activities"
);
assert.match(
  activitiesApiRoute,
  /officialOfferings/,
  "Activities API response must expose officialOfferings"
);
assert.match(
  activitiesApiRoute,
  /offeringCount/,
  "Activities API response must expose offeringCount"
);

const activitiesPage = readFileSync("app/activities/page.tsx", "utf8");
assert.match(
  activitiesPage,
  /getFilteredOfficialOfferings/,
  "Activities page must load official recreation offerings for browse results"
);

const exploreLayout = readFileSync("components/explore/ExploreLayout.tsx", "utf8");
assert.match(
  exploreLayout,
  /officialOfferings:\s*ActivityOffering\[\]/,
  "Explore layout must accept official offerings separately from timed activities"
);
assert.match(
  exploreLayout,
  /ActivityOfferingGrid/,
  "Explore layout must render official offerings with offering cards"
);

const trustValidator = readFileSync("scripts/validate-trust.mjs", "utf8");
assert.match(
  trustValidator,
  /validateOfficialOfferings/,
  "Trust validator must inspect official recreation offerings"
);
assert.match(
  trustValidator,
  /resortJoin/,
  "Trust validator must require official offering resortJoin provenance"
);
assert.match(
  trustValidator,
  /startDateTime/,
  "Trust validator must reject official offerings that are coerced into dated events"
);
assert.match(
  trustValidator,
  /sourceTitleSupportsTitle/,
  "Trust validator must allow official Disney CamelCase titles when title provenance matches the source"
);
