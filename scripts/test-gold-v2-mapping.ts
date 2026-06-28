import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ensurePublicActivity } from "@/lib/api/publicActivities";
import {
  mapGoldActivityRowToOccurrences,
  type GoldActivityRow,
} from "@/lib/data/goldActivities";
import {
  activityDataPipeline,
  getActivityBySlug,
  getAllOccurrences,
  getFilteredActivities,
  getMovieNights,
  getResortTimeline,
} from "@/lib/data/activities";
import { toDisplayActivity } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";
import { optionalPriceAddOnsLabel, publicPriceLabel } from "@/lib/priceLabels";
import { priceLabelFromActivity } from "@/lib/plan/snapshot";

const row: GoldActivityRow = {
  id: "gold-wellness",
  activity_catalog_id: "wellness-catalog",
  calendar_group_key: "all-star-movies",
  resort_slugs: ["all-star-movies-resort"],
  canonical_slug: "wellness-scavenger-hunt",
  title: "Wellness Scavenger Hunt",
  category: "fitness_wellness",
  section: "Resort Activities",
  schedule: {
    text: "Daily from 7:00am–11:00pm",
    start_time: "7:00am",
    end_time: "11:00pm",
  },
  location: {
    label: "Throughout Disney’s All-Star Resorts",
  },
  description:
    "Find hidden wellness challenges and pick up a prize from any merchandise location.",
  price: { state: "unknown" },
  enrichment: {
    exact_venue: "Donald's Double Feature",
    age_minimum: 3,
    reservation_required: false,
    program_family: "hidden_character_hunt",
  },
  external_facts: [
    {
      source: "magical_resort_guide",
      source_url: "https://www.magicalresortguide.com/all-star-movies-free-recreation-activities",
      source_page_kind: "free_recreation",
      facts: {
        exact_venue: "Donald's Double Feature",
        age_minimum: 3,
        reservation_required: false,
        program_family: "hidden_character_hunt",
      },
      evidence: [
        { field: "schedule_location", text: "Daily | Donald's Double Feature" },
        { field: "age_access", text: "Ages 3 and up" },
        { field: "reservation", text: "No reservation required" },
      ],
    },
  ],
  claims: {
    fee: { value: "unknown", evidence: [] },
    walkability: { value: "unknown", evidence: [] },
    transportation: { value: "unknown", evidence: [] },
  },
  field_provenance: {
    title: [{ page: 1, line: 5 }],
    schedule: [{ page: 1, line: 7 }],
    location: [{ page: 1, line: 6 }],
    description: [{ page: 1, line: 9 }],
  },
  source_url: "https://example.com/wellness.pdf",
  source_sha256: "a".repeat(64),
  source: {
    documentKeyLegends: [
      {
        kind: "fee",
        marker: "($)",
        label: "There is a fee associated with this activity.",
        spans: [{ page: 1, line: 68, text: "($) There is a fee associated with this activity." }],
      },
    ],
  },
  source_pdf_edition: "guide-1125",
  trust_state: "source_backed",
  valid_from: "2026-05-26",
  valid_until: "2026-09-08",
};

const occurrences = mapGoldActivityRowToOccurrences(row, {
  dateRangeDays: 1,
  referenceDate: new Date("2026-06-21T12:00:00Z"),
});

assert.equal(occurrences.length, 1);

const occurrence = ensurePublicActivity(occurrences[0]);

assert.equal(occurrence.activitySlug, "wellness-scavenger-hunt");
assert.equal(occurrence.title, "Wellness Scavenger Hunt");
assert.equal(occurrence.scheduleText, "Daily from 7:00am–11:00pm");
assert.ok(occurrence.startDateTime);
assert.match(occurrence.startDateTime, /^2026-06-21T07:00:00-04:00$/);
assert.match(occurrence.endDateTime ?? "", /^2026-06-21T23:00:00-04:00$/);
assert.equal(
  occurrence.daypart,
  "anytime",
  "Explicit open-window activities that run from morning into night should be treated as all-day, not morning"
);
assert.equal(occurrence.summary, row.description);
assert.equal(occurrence.source?.documentHash, row.source_sha256);
assert.equal(occurrence.source?.url, row.source_url);
assert.equal(occurrence.enrichment?.exactVenue, "Donald's Double Feature");
assert.equal(occurrence.enrichment?.ageMinimum, 3);
assert.equal(occurrence.enrichment?.reservationRequired, false);
assert.equal(occurrence.enrichment?.programFamily, "hidden_character_hunt");
assert.equal(occurrence.externalFacts?.[0]?.source, "magical_resort_guide");
assert.equal(occurrence.validFrom, "2026-05-26");
assert.equal(occurrence.validUntil, "2026-09-08");
assert.equal(occurrence.source?.documentKeyLegends?.[0]?.kind, "fee");
assert.equal(occurrence.source?.documentKeyLegends?.[0]?.spans?.[0]?.line, 68);
assert.equal(occurrence.fieldProvenance?.title?.[0]?.line, 5);
assert.equal(occurrence.claims?.walkability?.value, "unknown");
assert.equal(occurrence.claims?.transportation?.value, "unknown");
assert.equal(occurrence.freshness.badge, "verified");

const [manualSourceOccurrence] = mapGoldActivityRowToOccurrences(
  {
    ...row,
    id: "gold-manual-source",
    source_url: "manual://fort-wilderness/2026-05-26-to-2026-09-08/recreation-activities",
    source: {
      url: "manual://fort-wilderness/2026-05-26-to-2026-09-08/recreation-activities",
      documentHash: "b".repeat(64),
    },
    source_sha256: "b".repeat(64),
  },
  {
    dateRangeDays: 1,
    referenceDate: new Date("2026-06-21T12:00:00Z"),
  }
);
assert.equal(
  manualSourceOccurrence.freshness.sourceUrl,
  "",
  "Internal manual source identifiers must not become public UI links"
);
assert.equal(
  manualSourceOccurrence.source?.url,
  undefined,
  "Internal manual source identifiers must not become public source evidence URLs"
);
assert.equal(manualSourceOccurrence.source?.documentHash, "b".repeat(64));

const openWindowDisplay = toDisplayActivity(occurrence);
const openWindowCard = activityToEventCard(occurrence, openWindowDisplay);
assert.ok(
  (openWindowCard.badges ?? []).some((badge) => badge.label === "All Day"),
  "Timed open-window activity cards should show All Day instead of Morning"
);
assert.ok(
  !(openWindowCard.badges ?? []).some((badge) => badge.label === "Morning"),
  "Timed open-window activity cards must not show Morning just because the range starts in the morning"
);

const campfireWithSecondaryKitRow: GoldActivityRow = {
  ...row,
  id: "gold-akl-campfire-kit",
  activity_catalog_id: "akl-campfire-kit-catalog",
  calendar_group_key: "animal-kingdom-jambo",
  resort_slugs: ["animal-kingdom-lodge"],
  canonical_slug: "campfire",
  title: "Campfire",
  category: "campfire",
  description:
    "Enjoy the warm glow of the campfire with complimentary marshmallows. S'mores kits available for purchase.",
  price: {
    state: "free",
    options: [
      {
        optionName: "Mickey S'mores Kit",
        priceBasis: "optional_add_on",
        priceCentsMin: 700,
        priceCentsMax: 700,
        priceConfidence: "secondary_verified",
        verificationStatus: "needs_disney_confirmation",
        sourceUrl: "https://chipandco.com/cute-tour-humphreys-hideout-wilderness-lodge-631738/",
        sourceLabel: "Chip and Company Wilderness Lodge report",
        notes: "Usually around $7 plus tax",
      },
    ],
  },
  claims: {
    fee: {
      value: "free",
      evidence: [{ field: "source_pdf_fee_marker_absent", source: "pdf_layout" }],
    },
    walkability: { value: "unknown", evidence: [] },
    transportation: { value: "unknown", evidence: [] },
  },
};

const [campfireWithSecondaryKit] = mapGoldActivityRowToOccurrences(campfireWithSecondaryKitRow, {
  dateRangeDays: 1,
  referenceDate: new Date("2026-06-22T12:00:00-04:00"),
});
const publicCampfireWithSecondaryKit = ensurePublicActivity(campfireWithSecondaryKit);
assert.equal(publicCampfireWithSecondaryKit.price.state, "free");
assert.equal(publicCampfireWithSecondaryKit.price.options?.[0]?.priceBasis, "optional_add_on");
assert.equal(publicCampfireWithSecondaryKit.price.options?.[0]?.priceConfidence, "secondary_verified");
assert.equal(
  publicCampfireWithSecondaryKit.price.options?.[0]?.verificationStatus,
  "needs_disney_confirmation"
);
assert.match(publicCampfireWithSecondaryKit.price.options?.[0]?.sourceUrl ?? "", /^https:\/\/chipandco\.com\//);

const weekdayRow: GoldActivityRow = {
  ...row,
  id: "gold-weekday-craft",
  activity_catalog_id: "weekday-craft-catalog",
  canonical_slug: "weekday-craft",
  title: "Weekday Craft",
  category: "arts_crafts",
  schedule: {
    text: "Monday, Wednesday and Friday from 4:00pm-5:00pm",
    start_time: "4:00pm",
    end_time: "5:00pm",
  },
};

const weekdayOccurrences = mapGoldActivityRowToOccurrences(weekdayRow, {
  dateRangeDays: 7,
  referenceDate: new Date("2026-06-25T12:00:00-04:00"),
});
assert.deepEqual(
  weekdayOccurrences.map((item) => item.startDateTime?.slice(0, 10)),
  ["2026-06-26", "2026-06-29", "2026-07-01"],
  "Gold timed rows must honor weekday recurrence in source schedule text"
);

const unmarkedNighttimeRow: GoldActivityRow = {
  ...row,
  id: "gold-boardwalk-nighttime-trivia",
  activity_catalog_id: "boardwalk-nighttime-trivia-catalog",
  calendar_group_key: "boardwalk",
  resort_slugs: ["boardwalk-inn"],
  canonical_slug: "nighttime-trivia",
  title: "Nighttime Trivia",
  category: "other",
  schedule: {
    text: "Nightly at 7:30",
    start_time: null,
    end_time: null,
  },
  location: {
    label: "Village Green Lawn",
  },
  trust_state: "confirm_before_going",
};

const [unmarkedNighttimeOccurrence] = mapGoldActivityRowToOccurrences(
  unmarkedNighttimeRow,
  {
    dateRangeDays: 1,
    referenceDate: new Date("2026-06-22T12:00:00-04:00"),
  }
);
assert.match(
  unmarkedNighttimeOccurrence.startDateTime ?? "",
  /^2026-06-22T19:30:00-04:00$/,
  "Nightly source text without AM/PM should map to the evening occurrence, not 7:30 AM"
);
assert.equal(
  unmarkedNighttimeOccurrence.daypart,
  "evening",
  "Unmarked nightly times must receive evening daypart classification"
);

const unsupportedEnrichment = ensurePublicActivity({
  ...occurrences[0],
  id: "unsupported-enrichment",
  enrichment: {
    exactVenue: "Donald's Double Feature",
    ageMinimum: 3,
    reservationRequired: true,
    resortGuestOnly: true,
    poolGated: true,
  },
  externalFacts: undefined,
  claims: {
    fee: { value: "unknown", evidence: [] },
    walkability: { value: "unknown", evidence: [] },
    transportation: { value: "unknown", evidence: [] },
  },
});
assert.equal(
  unsupportedEnrichment.enrichment,
  undefined,
  "Public activities must strip enrichment fields that lack matching evidence"
);

const genericAccessRulesEnrichment = ensurePublicActivity({
  ...occurrences[0],
  id: "generic-access-rules-enrichment",
  enrichment: {
    resortGuestOnly: true,
    poolGated: true,
    sisterResortAccess: true,
  },
  externalFacts: [
    {
      source: "magical_resort_guide",
      sourceUrl: "https://example.com/access-rules",
      evidence: [
        {
          field: "access_rules",
          text: "Activities shown with this symbol are exclusively for guests staying at this resort.",
        },
      ],
    },
  ],
  claims: {
    fee: { value: "unknown", evidence: [] },
    walkability: { value: "unknown", evidence: [] },
    transportation: { value: "unknown", evidence: [] },
  },
});
assert.equal(genericAccessRulesEnrichment.enrichment?.resortGuestOnly, true);
assert.equal(
  genericAccessRulesEnrichment.enrichment?.poolGated,
  undefined,
  "Generic access-rule evidence must not create pool-gated UI claims"
);
assert.equal(
  genericAccessRulesEnrichment.enrichment?.sisterResortAccess,
  undefined,
  "Generic access-rule evidence must not create sister-resort access UI claims"
);

const fortWildernessMovieRow: GoldActivityRow = {
  id: "gold-fort-movie",
  activity_catalog_id: "fort-movie-catalog",
  calendar_group_key: "fort-wilderness",
  resort_slugs: [
    "campsites-at-fort-wilderness-resort",
    "cabins-at-fort-wilderness-resort",
  ],
  canonical_slug: "movie-under-the-stars",
  title: "Movies Under the Stars",
  category: "movies_under_stars",
  section: "Resort Activities",
  schedule: {
    text: "Nightly",
    start_time: null,
    end_time: null,
  },
  location: {
    label: "Campground Theater",
  },
  description:
    "Cozy up for complimentary screenings of popular Disney films, offered nightly at the Campground Theater.",
  price: { state: "unknown" },
  claims: {
    fee: { value: "unknown", evidence: [] },
    walkability: { value: "unknown", evidence: [] },
    transportation: { value: "unknown", evidence: [] },
  },
  field_provenance: {
    title: [{ page: 1, line: 222 }],
    schedule: [{ page: 1, line: 224 }],
    location: [{ page: 1, line: 224 }],
    description: [{ page: 1, line: 224 }],
  },
  source_url:
    "https://disneyworld.disney.go.com/resorts/dvc-cabins-at-fort-wilderness-resort/recreation/",
  source_sha256: "b".repeat(64),
  trust_state: "confirm_before_going",
};

const fortMovieOccurrences = mapGoldActivityRowToOccurrences(fortWildernessMovieRow, {
  dateRangeDays: 1,
  referenceDate: new Date("2026-06-22T12:00:00-04:00"),
});
const cabinsFortMovie = fortMovieOccurrences.find(
  (item) => item.resort.slug === "cabins-at-fort-wilderness-resort"
);
assert.ok(cabinsFortMovie, "Cabins must inherit the Fort Wilderness movie row");
assert.equal(fortMovieOccurrences.length, 2);
assert.equal(cabinsFortMovie.title, "Movies Under the Stars");
assert.equal(cabinsFortMovie.location.label, "Campground Theater");
assert.equal(cabinsFortMovie.trustState, "confirm_before_going");
assert.equal(cabinsFortMovie.scheduleText, "Nightly");
assert.ok(cabinsFortMovie.startDateTime);
assert.match(cabinsFortMovie.startDateTime, /^2026-06-22T20:30:00-04:00$/);
assert.match(
  cabinsFortMovie.source?.url ?? "",
  /dvc-cabins-at-fort-wilderness-resort\/recreation/
);

const timedPoolsideRow: GoldActivityRow = {
  id: "gold-boardwalk-poolside",
  activity_catalog_id: "boardwalk-poolside-catalog",
  calendar_group_key: "boardwalk",
  resort_slugs: ["boardwalk-inn"],
  canonical_slug: "poolside-activities",
  title: "Poolside Activities",
  category: "poolside",
  section: "Resort Activities",
  schedule: {
    text: "Daily at 1:30pm",
    start_time: "1:30pm",
    end_time: null,
  },
  location: {
    label: "Luna Park Pool Deck",
  },
  description:
    "Join us for family-friendly activities, both in and out of the pool.",
  price: { state: "free" },
  claims: {
    fee: { value: "free", evidence: [{ source: "pdf_title_without_fee_marker" }] },
  },
  field_provenance: {
    title: [{ page: 1, line: 19 }],
    schedule: [{ page: 1, text: "Daily at 1:30pm" }],
    location: [{ page: 1, line: 21 }],
    description: [{ page: 1, line: 23 }],
  },
  source_url: "https://example.com/boardwalk.pdf",
  source_sha256: "c".repeat(64),
  trust_state: "source_backed",
};

const timedPoolsideOccurrences = mapGoldActivityRowToOccurrences(
  timedPoolsideRow,
  {
    dateRangeDays: 1,
    referenceDate: new Date("2026-06-22T12:00:00-04:00"),
  }
);

assert.equal(
  timedPoolsideOccurrences.length,
  1,
  "Source-backed timed rows should appear in resort/all-activities surfaces"
);
assert.equal(timedPoolsideOccurrences[0].activitySlug, "poolside-activities");
assert.equal(timedPoolsideOccurrences[0].daypart, "afternoon");
assert.match(
  timedPoolsideOccurrences[0].startDateTime ?? "",
  /^2026-06-22T13:30:00-04:00$/
);
assert.equal(timedPoolsideOccurrences[0].endDateTime, undefined);
assert.equal(
  timedPoolsideOccurrences[0].scheduleText,
  "Daily at 1:30pm"
);
const timedPoolsideDisplay = toDisplayActivity(timedPoolsideOccurrences[0]);
assert.equal(
  timedPoolsideDisplay.timeLabel,
  "1:30 PM",
  "BoardWalk poolside activities should use the visible Disney PDF time"
);
const timedPoolsideCard = activityToEventCard(
  timedPoolsideOccurrences[0],
  timedPoolsideDisplay
);
assert.equal(
  timedPoolsideCard.href,
  "/activities/poolside-activities?resort=boardwalk-inn",
  "Activity cards must preserve resort context for shared activity slugs"
);
assert.equal(
  timedPoolsideCard.timeLabel,
  "1:30 PM",
  "Timed activity cards should show the Disney PDF time"
);
assert.equal(
  timedPoolsideCard.timeDateTime,
  "2026-06-22T13:30:00-04:00",
  "Timed activity cards should carry the real datetime"
);
assert.equal(
  (timedPoolsideCard.badges ?? []).some((badge) => badge.label === "Afternoon"),
  true,
  "Timed activity cards should show the correct daypart badge"
);
assert.equal(
  (timedPoolsideCard.badges ?? []).some((badge) => badge.label === "All Day"),
  false,
  "Timed activity cards must not show an All Day badge"
);
const activityDetailClient = readFileSync(
  "components/atlas/ActivityDetailClient.tsx",
  "utf8"
);
assert.match(
  activityDetailClient,
  /const timedScheduleRows = scheduleRows\.filter\(hasStartDateTime\)/,
  "Activity detail pages must separate timed schedule rows from untimed source text"
);
assert.doesNotMatch(
  activityDetailClient,
  /return occurrence\.scheduleText \?\? ""/,
  "Activity detail pages must not render untimed scheduleText as a When field"
);
assert.match(
  activityDetailClient,
  /const showUncertainTime = uncertainTime && hasBackedTime/,
  "Activity detail uncertainty labels must require an actual backed time"
);
assert.match(
  activityDetailClient,
  /function formatOptionalPrice/,
  "Activity detail pages must format optional add-on prices separately from the primary cost label"
);
assert.match(
  activityDetailClient,
  /Usually around/,
  "Secondary campfire kit prices must be labeled as approximate in public copy"
);
assert.match(
  activityDetailClient,
  /Optional purchases/,
  "Activity detail pages must show paid add-ons separately from Free/Paid"
);

const unsupportedFreeOccurrences = mapGoldActivityRowToOccurrences(
  {
    ...timedPoolsideRow,
    id: "gold-boardwalk-poolside-unsupported-free",
    activity_catalog_id: "boardwalk-poolside-unsupported-free-catalog",
    claims: {
      fee: { value: "unknown", evidence: [] },
      walkability: { value: "unknown", evidence: [] },
      transportation: { value: "unknown", evidence: [] },
    },
  },
  {
    dateRangeDays: 1,
    referenceDate: new Date("2026-06-22T12:00:00-04:00"),
  }
);
assert.equal(
  unsupportedFreeOccurrences[0].price.state,
  "unknown",
  "Free price labels require explicit source evidence and otherwise fail closed"
);
const unsupportedFreeDisplay = toDisplayActivity(unsupportedFreeOccurrences[0]);
assert.equal(
  unsupportedFreeDisplay.costLabel,
  undefined,
  "Unsupported free price states must not render any public price label"
);
assert.notEqual(
  activityToEventCard(unsupportedFreeOccurrences[0], unsupportedFreeDisplay).showTrust,
  true,
  "Activity cards must not promote unknown prices as trust badges"
);
assert.equal(
  publicPriceLabel("fee"),
  "Paid",
  "Disney fee markers must use Disney-facing Paid terminology"
);
assert.equal(
  priceLabelFromActivity(unsupportedFreeOccurrences[0]),
  undefined,
  "Plan snapshots must omit unknown price labels"
);
assert.equal(
  publicPriceLabel("free"),
  "Free",
  "Free events remain Free even when optional supplies are sold separately"
);
assert.equal(
  optionalPriceAddOnsLabel([
    {
      optionName: "S'mores kit",
      notes: "Available for purchase",
    },
  ]),
  "Optional add-ons available",
  "Optional paid supplies must render separately from the primary price label"
);

const noDescriptionDisplay = toDisplayActivity({
  ...timedPoolsideOccurrences[0],
  id: "movie-without-description",
  activitySlug: "movie-under-the-stars",
  activityCatalogId: "movie-without-description",
  title: "Movie Under the Stars",
  category: "movies_under_stars",
  summary: "",
});
assert.equal(
  noDescriptionDisplay.summary,
  "Outdoor Disney movie screening; title varies by resort schedule.",
  "Missing movie descriptions should use the narrow guest-facing fallback copy"
);
assert.equal(
  noDescriptionDisplay.answerCoverage.what.state,
  "fallback",
  "Fallback movie copy must not be treated as source-backed description evidence"
);
const noDescriptionCard = activityToEventCard(
  {
    ...timedPoolsideOccurrences[0],
    id: "movie-without-description",
    activitySlug: "movie-under-the-stars",
    activityCatalogId: "movie-without-description",
    title: "Movie Under the Stars",
    category: "movies_under_stars",
    summary: "",
  },
  noDescriptionDisplay
);
assert.equal(
  noDescriptionCard.summary,
  "Outdoor Disney movie screening; title varies by resort schedule.",
  "Activity cards should still answer what when source movie descriptions are absent"
);

const missingProvenance = ensurePublicActivity({
  ...occurrences[0],
  fieldProvenance: undefined,
});

assert.equal(
  missingProvenance.freshness.badge,
  "stale",
  "Gold rows cannot be verified without required field provenance"
);

async function assertDefaultPipelineUsesGoldV2(): Promise<void> {
  const envSnapshot = {
    activityPipeline: process.env.ACTIVITY_DATA_PIPELINE,
    publicActivityPipeline: process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE,
  };

  delete process.env.ACTIVITY_DATA_PIPELINE;
  delete process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE;

  try {
    assert.equal(
      activityDataPipeline(),
      "gold-v2",
      "Default UI pipeline must read published Gold v2 rows in production"
    );
  } finally {
    if (envSnapshot.activityPipeline === undefined) {
      delete process.env.ACTIVITY_DATA_PIPELINE;
    } else {
      process.env.ACTIVITY_DATA_PIPELINE = envSnapshot.activityPipeline;
    }
    if (envSnapshot.publicActivityPipeline === undefined) {
      delete process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE;
    } else {
      process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE =
        envSnapshot.publicActivityPipeline;
    }
  }
}

async function assertUnexpectedPipelineFailsClosedToGoldV2(): Promise<void> {
  const envSnapshot = {
    activityPipeline: process.env.ACTIVITY_DATA_PIPELINE,
    publicActivityPipeline: process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE,
    legacyUiPipeline: process.env.ALLOW_LEGACY_ACTIVITY_UI_PIPELINE,
  };

  try {
    process.env.ACTIVITY_DATA_PIPELINE = "legacy-temporal";
    delete process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE;
    delete process.env.ALLOW_LEGACY_ACTIVITY_UI_PIPELINE;
    assert.equal(
      activityDataPipeline(),
      "gold-v2",
      "Legacy temporal UI reads must fail closed unless explicitly unlocked"
    );

    process.env.ALLOW_LEGACY_ACTIVITY_UI_PIPELINE = "1";
    assert.equal(
      activityDataPipeline(),
      "legacy-temporal",
      "Legacy temporal UI reads must require a named opt-in and unlock flag"
    );

    process.env.ACTIVITY_DATA_PIPELINE = "typo-or-unknown";
    assert.equal(
      activityDataPipeline(),
      "gold-v2",
      "Unknown UI pipeline values must not fall into legacy temporal reads"
    );
  } finally {
    if (envSnapshot.activityPipeline === undefined) {
      delete process.env.ACTIVITY_DATA_PIPELINE;
    } else {
      process.env.ACTIVITY_DATA_PIPELINE = envSnapshot.activityPipeline;
    }
    if (envSnapshot.publicActivityPipeline === undefined) {
      delete process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE;
    } else {
      process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE =
        envSnapshot.publicActivityPipeline;
    }
    if (envSnapshot.legacyUiPipeline === undefined) {
      delete process.env.ALLOW_LEGACY_ACTIVITY_UI_PIPELINE;
    } else {
      process.env.ALLOW_LEGACY_ACTIVITY_UI_PIPELINE =
        envSnapshot.legacyUiPipeline;
    }
  }
}

async function assertPreviewPipelineUsesGoldPreview(): Promise<void> {
  const envSnapshot = {
    activityPipeline: process.env.ACTIVITY_DATA_PIPELINE,
    publicActivityPipeline: process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  process.env.ACTIVITY_DATA_PIPELINE = "gold-v2-preview";
  delete process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const defaultOccurrences = await getAllOccurrences(1);
    const defaultWellness = defaultOccurrences.find(
      (item) =>
        item.activitySlug === "wellness-scavenger-hunt" &&
        item.resort.slug === "all-star-movies-resort"
    );

    assert.ok(
      defaultWellness,
      "Preview UI pipeline must read the source-backed Gold preview, not legacy/demo rows"
    );
    assert.equal(defaultWellness.title, "Wellness Scavenger Hunt");
    assert.equal(
      defaultWellness.summary,
      "Find hidden wellness challenges and partake in a scavenger hunt across all three of Disney’s All-Star Resorts. Pick up a map from Donald’s Double Feature to start exploring. Once finished the challenges, pick up a prize from any merchandise location at Disney’s All-Star Resorts."
    );
    assert.match(defaultWellness.endDateTime ?? "", /T23:00:00-04:00$/);
    assert.equal(defaultWellness.claims?.walkability?.value, "unknown");
    assert.equal(defaultWellness.freshness.badge, "verified");

    const fortMovie = defaultOccurrences.find(
      (item) =>
        item.activitySlug === "movie-under-the-stars" &&
        item.resort.slug === "cabins-at-fort-wilderness-resort"
    );
    assert.ok(
      fortMovie,
      "Fort Wilderness movie must be sourced from the reviewed visual schedule"
    );
    assert.equal(fortMovie.title, "Movie Under the Stars");
    assert.equal(fortMovie.location.label, "Campfire Area Presented by OFF! Repellents");
    assert.equal(fortMovie.trustState, "source_backed");
    assert.equal(
      fortMovie.source?.url,
      undefined,
      "Reviewed visual schedules keep source evidence without exposing internal manual IDs as links"
    );

    const legacyWellness = await getActivityBySlug("wellnessscav-engerhunt");
    assert.ok(legacyWellness, "Broken historical Wellness slug must still resolve");
    assert.equal(
      legacyWellness.activity.activitySlug,
      "wellness-scavenger-hunt"
    );
    assert.equal(legacyWellness.activity.title, "Wellness Scavenger Hunt");

    const resortScopedCampfire = await getActivityBySlug("movie-under-the-stars", {
      resort: "polynesian-village-resort",
    });
    assert.ok(
      resortScopedCampfire,
      "Activity details must resolve shared slugs within the requested resort"
    );
    assert.equal(
      resortScopedCampfire.activity.resort.slug,
      "polynesian-village-resort"
    );
    assert.ok(
      resortScopedCampfire.upcoming.every(
        (item) => item.resort.slug === "polynesian-village-resort"
      ),
      "Resort-scoped activity details must not mix upcoming rows from other resorts"
    );

    const [polynesianTimeline, polynesianExplore] = await Promise.all([
      getResortTimeline("polynesian-village-resort", 7),
      getFilteredActivities({ resort: "polynesian-village-resort", limit: 200 }),
    ]);
    assert.ok(
      polynesianTimeline.length > polynesianExplore.length,
      "Resort timeline must expose dated occurrences instead of Explore's collapsed activity list"
    );
    assert.ok(
      new Set(
        polynesianTimeline
          .map((item) => item.startDateTime?.slice(0, 10))
          .filter(Boolean)
      ).size > 1,
      "Resort timeline must span multiple calendar dates"
    );
    assert.ok(
      polynesianTimeline.every(
        (item) => item.resort.slug === "polynesian-village-resort"
      ),
      "Resort timeline must remain scoped to the requested resort"
    );

    const reviewedFortActivity = await getActivityBySlug(
      "chip-n-dales-campfire-sing-a-long"
    );
    assert.ok(
      reviewedFortActivity,
      "Reviewed Fort Wilderness visual rows should resolve once schedule and location are sourced"
    );
    assert.equal(
      reviewedFortActivity.activity.source?.url,
      undefined,
      "Reviewed visual rows must not expose manual source identifiers as public links"
    );

    const movieNights = await getMovieNights();
    assert.ok(
      movieNights.length > 0,
      "Movie title listings should publish once film titles have a source-backed feed"
    );
    assert.ok(
      movieNights.every(
        (movie) =>
          movie.movieTitle &&
          movie.displayTitle &&
          movie.dayOfWeek &&
          movie.showTime &&
          movie.location
      ),
      "Movie title listings should retain source-backed title, day, time, and location fields"
    );
    assert.ok(
      movieNights.some(
        (movie) =>
          movie.resortSlug === "all-star-movies-resort" &&
          movie.dayOfWeek === "sunday" &&
          movie.displayTitle === "Up"
      ),
      "Movie title listings should include current source-backed All Star Movies titles"
    );
  } finally {
    if (envSnapshot.activityPipeline === undefined) {
      delete process.env.ACTIVITY_DATA_PIPELINE;
    } else {
      process.env.ACTIVITY_DATA_PIPELINE = envSnapshot.activityPipeline;
    }
    if (envSnapshot.publicActivityPipeline === undefined) {
      delete process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE;
    } else {
      process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE =
        envSnapshot.publicActivityPipeline;
    }
    if (envSnapshot.supabaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = envSnapshot.supabaseUrl;
    }
    if (envSnapshot.supabaseAnonKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = envSnapshot.supabaseAnonKey;
    }
    if (envSnapshot.supabaseServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY =
        envSnapshot.supabaseServiceRoleKey;
    }
  }
}

Promise.all([
  assertDefaultPipelineUsesGoldV2(),
  assertUnexpectedPipelineFailsClosedToGoldV2(),
  assertPreviewPipelineUsesGoldPreview(),
]).catch((error) => {
  console.error(error);
  process.exit(1);
});
