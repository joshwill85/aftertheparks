import assert from "node:assert/strict";
import { sortActivities } from "../lib/activities/sort";
import type { ActivityOccurrence } from "../lib/types/occurrence";

function occurrence(
  id: string,
  startDateTime?: string,
  endDateTime?: string
): ActivityOccurrence {
  return {
    id,
    activitySlug: id,
    activityCatalogId: id,
    title: id,
    summary: "",
    category: "resort_activity",
    section: "Resort Activities",
    location: { label: "Resort lawn" },
    resort: {
      slug: "test-resort",
      name: "Test Resort",
      tier: "deluxe",
      area: "epcot-boardwalk",
    },
    daypart: "evening",
    price: { state: "free" },
    eligibility: { ages: [] },
    freshness: {
      lastVerified: "2026-06-27",
      sourceUrl: "https://example.com",
      badge: "verified",
    },
    source: {},
    status: "active",
    startDateTime,
    endDateTime,
  };
}

const disneyNow = new Date("2026-06-27T21:10:00-04:00");

const sorted = sortActivities(
  [
    occurrence(
      "all-day-current",
      "2026-06-27T07:00:00-04:00",
      "2026-06-27T23:00:00-04:00"
    ),
    occurrence(
      "future-later",
      "2026-06-27T22:00:00-04:00",
      "2026-06-27T22:30:00-04:00"
    ),
    occurrence(
      "past-ended",
      "2026-06-27T20:00:00-04:00",
      "2026-06-27T20:30:00-04:00"
    ),
    occurrence(
      "future-nearest",
      "2026-06-27T21:30:00-04:00",
      "2026-06-27T22:00:00-04:00"
    ),
    occurrence("untimed"),
  ],
  "time",
  disneyNow
).map((activity) => activity.id);

assert.deepEqual(
  sorted,
  [
    "future-nearest",
    "future-later",
    "all-day-current",
    "past-ended",
    "untimed",
  ],
  "Happening soon should rank future starts nearest to Disney local time before current, past, or untimed activities."
);

console.log("Happening soon sort coverage passed.");
