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
} from "@/lib/data/activities";
import { toDisplayActivity } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";

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

const untimedPoolsideRow: GoldActivityRow = {
  id: "gold-boardwalk-poolside",
  activity_catalog_id: "boardwalk-poolside-catalog",
  calendar_group_key: "boardwalk",
  resort_slugs: ["boardwalk-inn"],
  canonical_slug: "poolside-activities",
  title: "Poolside Activities",
  category: "poolside",
  section: "Resort Activities",
  schedule: {
    text: "Activities schedule available digitally; no posted time in PDF",
    start_time: null,
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
    schedule: [{ page: 1, text: "ACTIVITIES SCHEDULE" }],
    location: [{ page: 1, line: 21 }],
    description: [{ page: 1, line: 23 }],
  },
  source_url: "https://example.com/boardwalk.pdf",
  source_sha256: "c".repeat(64),
  trust_state: "source_backed",
};

const untimedPoolsideOccurrences = mapGoldActivityRowToOccurrences(
  untimedPoolsideRow,
  {
    dateRangeDays: 1,
    referenceDate: new Date("2026-06-22T12:00:00-04:00"),
  }
);

assert.equal(
  untimedPoolsideOccurrences.length,
  1,
  "Source-backed untimed rows should still appear in resort/all-activities surfaces"
);
assert.equal(untimedPoolsideOccurrences[0].activitySlug, "poolside-activities");
assert.equal(untimedPoolsideOccurrences[0].daypart, "anytime");
assert.equal(untimedPoolsideOccurrences[0].startDateTime, undefined);
assert.equal(untimedPoolsideOccurrences[0].endDateTime, undefined);
assert.equal(
  untimedPoolsideOccurrences[0].scheduleText,
  "Activities schedule available digitally; no posted time in PDF"
);
const untimedPoolsideDisplay = toDisplayActivity(untimedPoolsideOccurrences[0]);
assert.equal(
  untimedPoolsideDisplay.timeLabel,
  undefined,
  "Untimed source-backed rows must not create a public time label"
);
const untimedPoolsideCard = activityToEventCard(
  untimedPoolsideOccurrences[0],
  untimedPoolsideDisplay
);
assert.equal(
  untimedPoolsideCard.timeLabel,
  undefined,
  "Untimed activity cards must not show a time field"
);
assert.equal(
  untimedPoolsideCard.timeDateTime,
  undefined,
  "Untimed activity cards must not carry a fake datetime"
);
assert.equal(
  (untimedPoolsideCard.badges ?? []).some((badge) => badge.label === "Anytime"),
  false,
  "Untimed activity cards must not show an Anytime badge"
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

const unsupportedFreeOccurrences = mapGoldActivityRowToOccurrences(
  {
    ...untimedPoolsideRow,
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
assert.equal(
  toDisplayActivity(unsupportedFreeOccurrences[0]).costLabel,
  "Price unclear",
  "Unsupported free price states must not render as Free"
);

const noDescriptionDisplay = toDisplayActivity({
  ...untimedPoolsideOccurrences[0],
  id: "movie-without-description",
  activitySlug: "movie-under-the-stars",
  activityCatalogId: "movie-without-description",
  title: "Movie Under the Stars",
  category: "movies_under_stars",
  summary: "",
});
assert.equal(
  noDescriptionDisplay.summary,
  undefined,
  "Missing source descriptions must not be replaced by synthetic UI copy"
);
const noDescriptionCard = activityToEventCard(
  {
    ...untimedPoolsideOccurrences[0],
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
  undefined,
  "Activity cards must omit summaries when the source has no description"
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
      "Find hidden wellness challenges and partake in a scavenger hunt across all three of Disney’s All-Star Resorts. Pick up a map from Donald’s Double Feature to start exploring. Once you’ve finished the challenges, pick up a prize from any merchandise location at Disney’s All-Star Resorts."
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
      "Fort Wilderness movie must be sourced from the official Cabins recreation page"
    );
    assert.equal(fortMovie.title, "Movies Under the Stars");
    assert.equal(fortMovie.location.label, "Campground Theater");
    assert.equal(fortMovie.trustState, "confirm_before_going");
    assert.match(
      fortMovie.source?.url ?? "",
      /dvc-cabins-at-fort-wilderness-resort\/recreation/
    );

    const legacyWellness = await getActivityBySlug("wellnessscav-engerhunt");
    assert.ok(legacyWellness, "Broken historical Wellness slug must still resolve");
    assert.equal(
      legacyWellness.activity.activitySlug,
      "wellness-scavenger-hunt"
    );
    assert.equal(legacyWellness.activity.title, "Wellness Scavenger Hunt");

    const quarantinedFortActivity = await getActivityBySlug(
      "chip-n-dales-campfire-sing-a-long"
    );
    assert.equal(
      quarantinedFortActivity,
      null,
      "Incomplete official Fort Wilderness web rows must fail closed until schedule and location are sourced"
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
  assertPreviewPipelineUsesGoldPreview(),
]).catch((error) => {
  console.error(error);
  process.exit(1);
});
