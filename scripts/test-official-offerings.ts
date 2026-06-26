import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getPublicOfferingAvailabilityLabel,
  shouldShowOfferingAvailability,
} from "@/lib/activityAvailabilityDisplay";
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
  /fetchOfficialActivityOfferings/,
  "Search must load official recreation offerings, not only timed occurrences"
);
assert.match(
  searchRunner,
  /scoreOffering/,
  "Search must score official recreation offerings as first-class results"
);

const searchClient = readFileSync("components/atlas/SearchClient.tsx", "utf8");
assert.match(
  searchClient,
  /ActivityOfferingGrid/,
  "Search UI must render official recreation offerings with offering cards"
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
