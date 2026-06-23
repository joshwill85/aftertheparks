import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getDisplayTitle,
  shouldHideActivity,
} from "@/lib/activityDisplay";
import { ensurePublicActivity } from "@/lib/api/publicActivities";
import { normalizeActivityTitle } from "@/lib/text/normalize";
import { sanitizeLocationLabel } from "@/lib/location/sanitize";
import { parseScheduleTimeRange24h } from "@/lib/text/time";
import { canonicalActivitySlug } from "@/lib/activities/legacySlugs";
import { NEARBY_TIER_META } from "@/lib/magic/nearby";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

const WELLNESS_OCR = "W E L L N E S S S C Av E N G E R H U Nt";

assert.equal(
  normalizeActivityTitle(WELLNESS_OCR),
  "Wellness Scavenger Hunt",
  "repairs the exact Wellness Scavenger Hunt OCR break"
);

assert.equal(
  getDisplayTitle({
    activity_name: WELLNESS_OCR,
    category: "fitness_wellness",
    normalized_name: "wellness-scavenger-hunt",
    parse_confidence: 0.85,
  }),
  "Wellness Scavenger Hunt",
  "renders the source title, not a fake camel-case word"
);

assert.equal(
  shouldHideActivity({
    activity_name: WELLNESS_OCR,
    category: "fitness_wellness",
    normalized_name: "w-e-l-l-n-e-s-s-s-c-av-e-n-g-e-r-h-u-nt",
    parse_confidence: 0.85,
  }),
  true,
  "does not publish a record whose title and slug are both OCR-corrupt"
);

assert.equal(
  sanitizeLocationLabel("R E S O R T A C T I V I T I E S"),
  "Resort",
  "does not present section headers as locations"
);

assert.deepEqual(
  parseScheduleTimeRange24h("Daily from 7:00am-11:00pm"),
  {
    start: { hour: 7, minute: 0 },
    end: { hour: 23, minute: 0 },
  },
  "preserves source end time ranges instead of collapsing to the start time"
);

assert.equal(
  canonicalActivitySlug("wellnessscav-engerhunt"),
  "wellness-scavenger-hunt",
  "redirects the broken historical Wellness URL to the canonical slug"
);

const middleware = readFileSync("middleware.ts", "utf8");
assert.match(
  middleware,
  /canonicalActivitySlug/,
  "middleware must redirect broken historical activity page slugs before page rendering"
);
assert.match(
  middleware,
  /\/activities\/\$\{canonicalSlug\}/,
  "middleware must send legacy activity page slugs to the canonical activity URL"
);

assert.ok(
  !/walkable|no transportation needed/i.test(NEARBY_TIER_META.at_resort.description),
  "does not claim walkability or transportation certainty without source evidence"
);

const sourceBackedActivity: ActivityOccurrence = {
  id: "sketching-2026-06-21",
  activitySlug: "sketching",
  activityCatalogId: "sketching",
  resort: {
    slug: "all-star-movies",
    name: "All-Star Movies",
    tier: "Value",
    area: "animal_kingdom",
  },
  title: "Sketching",
  summary:
    "Create a small sketch with a recreation cast member.",
  category: "arts_crafts",
  section: "Resort Activities",
  startDateTime: "2026-06-21T10:00:00-04:00",
  endDateTime: "2026-06-21T11:00:00-04:00",
  daypart: "morning",
  price: { state: "unknown" },
  location: { label: "Community Hall" },
  eligibility: { ages: ["all_ages"] },
  freshness: {
    lastVerified: "2026-06-21T12:00:00.000Z",
    sourceUrl: "https://example.com/source.pdf",
    badge: "verified",
  },
  source: {
    url: "https://example.com/source.pdf",
    documentHash: "a".repeat(64),
  },
  fieldProvenance: {
    title: [{ page: 1, line: 5 }],
    schedule: [{ page: 1, line: 7 }],
    location: [{ page: 1, line: 6 }],
    description: [{ page: 1, line: 9 }],
  },
  claims: {
    walkability: { value: "unknown", evidence: [] },
    transportation: { value: "unknown", evidence: [] },
  },
  status: "active",
  scheduleText: "10:00am–11:00am",
};

assert.equal(
  ensurePublicActivity(sourceBackedActivity).freshness.badge,
  "verified",
  "allows verified only when required source provenance is present"
);

assert.equal(
  ensurePublicActivity({
    ...sourceBackedActivity,
    fieldProvenance: undefined,
  }).freshness.badge,
  "stale",
  "source URL and hash alone are not enough for a verified badge"
);

assert.equal(
  ensurePublicActivity({
    ...sourceBackedActivity,
    claims: {
      walkability: { value: "walkable", evidence: [] },
    },
  }).freshness.badge,
  "stale",
  "unsupported non-unknown claims prevent verified public status"
);
