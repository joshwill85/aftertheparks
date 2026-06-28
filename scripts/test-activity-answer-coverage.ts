import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { mapGoldActivityRowToOccurrences, type GoldActivityRow } from "@/lib/data/goldActivities";
import { getDisplayTime } from "@/lib/activityDisplay";
import { toDisplayActivity } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

const STALE_RESORT_SOURCE_RE =
  /(?:\/fy26-q[12]\/|_DRAFT|Recreation[-_](?:0126|0326)|(?:0126|0326)(?:_DIGITAL)?\.(?:pdf|jpe?g|png)\b)/i;

function baseActivity(overrides: Partial<ActivityOccurrence> = {}): ActivityOccurrence {
  return {
    id: "coverage-test",
    activitySlug: "coverage-test",
    activityCatalogId: "coverage-test",
    resort: {
      slug: "all-star-movies-resort",
      name: "All-Star Movies Resort",
      tier: "Value",
      area: "animal_kingdom",
    },
    title: "Coverage Test",
    summary: "A test activity.",
    category: "other",
    section: "Resort Activities",
    daypart: "anytime",
    price: { state: "unknown" },
    location: { label: "Test Lawn" },
    eligibility: { ages: ["all_ages"] },
    freshness: {
      lastVerified: "2026-06-28T12:00:00.000Z",
      sourceUrl: "https://example.com/source.pdf",
      badge: "verified",
    },
    status: "active",
    ...overrides,
  };
}

assert.deepEqual(
  getDisplayTime({ category: "scavenger_hunt", scheduleText: "Daily" }),
  { label: "Daily; time not posted", uncertain: false },
  "Daily schedules without a posted time should still answer when honestly."
);

assert.deepEqual(
  getDisplayTime({
    category: "fitness_wellness",
    scheduleText: "Open 24 hours a day, 7 days a week",
    startDateTime: "2026-06-28T00:00:00-04:00",
    endDateTime: "2026-06-28T23:59:00-04:00",
  }),
  { label: "Open 24 hours", uncertain: false },
  "24-hour official schedules should not collapse to a confirmation warning."
);

assert.deepEqual(
  getDisplayTime({ category: "other", scheduleText: "Daily from Dawn to Dusk" }),
  { label: "Dawn to dusk", uncertain: false },
  "Dawn-to-dusk schedules should render as an intuitive public timing label."
);

const movieDisplay = toDisplayActivity(
  baseActivity({
    id: "movie-under-stars",
    activitySlug: "movie-under-the-stars",
    activityCatalogId: "movie-under-stars",
    title: "Movie Under the Stars",
    summary: "",
    category: "movies_under_stars",
    startDateTime: "2026-06-28T20:30:00-04:00",
    daypart: "evening",
    location: { label: "The Reel Spot" },
    scheduleText: "The Reel Spot | 8:30PM",
  })
);
assert.equal(
  movieDisplay.summary,
  "Outdoor Disney movie screening; title varies by resort schedule.",
  "Movie rows without source-backed title detail should still explain what the activity is."
);
assert.equal(movieDisplay.answerCoverage.what.state, "fallback");

const poolDisplay = toDisplayActivity(
  baseActivity({
    id: "poolside-activities",
    activitySlug: "poolside-activities",
    activityCatalogId: "poolside-activities",
    title: "Poolside Activities",
    summary: "Join us for family-friendly activities, both in and out of the pool.",
    category: "poolside",
    startDateTime: "2026-06-28T12:30:00-04:00",
    daypart: "afternoon",
    location: { label: "Fantasia Pool Deck" },
    scheduleText: "Daily at 12:30pm",
  })
);
assert.equal(
  poolDisplay.whatLabel,
  "Family-friendly poolside games and activities.",
  "Generic poolside rows should have a concise guest-facing what answer."
);
assert.equal(poolDisplay.answerCoverage.what.state, "fallback");

const exactVenueActivity = baseActivity({
  id: "sorcerers-campfire",
  activitySlug: "sorcerers-campfire",
  activityCatalogId: "sorcerers-campfire",
  title: "Sorcerer’s Campfire",
  summary: "Enjoy the warm glow of the campfire with complimentary marshmallows.",
  category: "campfire",
  startDateTime: "2026-06-28T18:30:00-04:00",
  endDateTime: "2026-06-28T19:30:00-04:00",
  daypart: "evening",
  location: { label: "Located between Fantasia Buildings 5 and 8" },
  enrichment: {
    exactVenue: "Between Fantasia Buildings 5 and 8",
  },
  scheduleText: "Daily from 6:30pm-7:30pm",
});
const exactVenueDisplay = toDisplayActivity(exactVenueActivity);
const exactVenueCard = activityToEventCard(exactVenueActivity, exactVenueDisplay);
assert.equal(exactVenueDisplay.whereLabel, "Between Fantasia Buildings 5 and 8");
assert.equal(exactVenueCard.location, "Between Fantasia Buildings 5 and 8");
assert.equal(exactVenueDisplay.answerCoverage.where.state, "source_backed");

const fallbackWhereActivity = baseActivity({
  id: "missing-location",
  activitySlug: "missing-location",
  activityCatalogId: "missing-location",
  title: "Missing Location",
  location: { label: "" },
});
const fallbackWhereDisplay = toDisplayActivity(fallbackWhereActivity);
const fallbackWhereCard = activityToEventCard(fallbackWhereActivity, fallbackWhereDisplay);
assert.equal(fallbackWhereDisplay.whereLabel, "Confirm exact spot");
assert.equal(fallbackWhereCard.location, "Confirm exact spot");
assert.equal(fallbackWhereDisplay.answerCoverage.where.state, "fallback");

const rows = JSON.parse(
  readFileSync("data/processed/activity_gold_v2_preview.json", "utf8")
) as GoldActivityRow[];
const staleRows = rows.filter((row) => {
  const url = String(row.source_url || row.source?.url || "");
  return row.calendar_group_key !== "fort-wilderness" && STALE_RESORT_SOURCE_RE.test(url);
});
assert.equal(
  staleRows.length,
  0,
  `Gold preview must not publish stale resort schedule URLs. Stale rows: ${staleRows
    .slice(0, 10)
    .map((row) => `${row.calendar_group_key}/${row.canonical_slug}:${row.source_url || row.source?.url}`)
    .join("; ")}`
);
const occurrences = rows.flatMap((row) =>
  mapGoldActivityRowToOccurrences(row, {
    dateRangeDays: 14,
    referenceDate: new Date("2026-06-28T12:00:00-04:00"),
  })
);
const representatives = new Map<string, ActivityOccurrence>();
for (const occurrence of occurrences) {
  const key = `${occurrence.activityCatalogId}:${occurrence.resort.slug}:${occurrence.location.label}`;
  const existing = representatives.get(key);
  if (!existing) {
    representatives.set(key, occurrence);
    continue;
  }
  if (!existing.startDateTime && occurrence.startDateTime) {
    representatives.set(key, occurrence);
  }
}

const incomplete = [...representatives.values()].filter((occurrence) => {
  const display = toDisplayActivity(occurrence);
  const card = activityToEventCard(occurrence, display);
  return !display.whatLabel || !display.whenLabel || !display.whereLabel || !card.location;
});

assert.equal(
  incomplete.length,
  0,
  `Every representative activity card should answer what, when, and where. Missing: ${incomplete
    .slice(0, 10)
    .map((item) => `${item.title} at ${item.resort.name}`)
    .join("; ")}`
);

console.log("Activity answer coverage passed.");
