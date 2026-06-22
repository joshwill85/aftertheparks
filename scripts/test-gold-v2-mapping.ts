import assert from "node:assert/strict";

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
      evidence: [{ field: "schedule_location", text: "Daily | Donald's Double Feature" }],
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
