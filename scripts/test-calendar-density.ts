import assert from "node:assert/strict";
import {
  buildCalendarDaySummaries,
  getCalendarDaySummary,
} from "../lib/visualizations/calendarDensity";
import type { ActivityOccurrence } from "../lib/types/occurrence";

function activity(
  id: string,
  startDateTime: string,
  daypart: ActivityOccurrence["daypart"],
  resortName: string,
  category: string,
  priceState: ActivityOccurrence["price"]["state"] = "free"
): ActivityOccurrence {
  return {
    id,
    activityCatalogId: id,
    activitySlug: id,
    resort: {
      slug: resortName.toLowerCase().replaceAll(" ", "-"),
      name: resortName,
      tier: "deluxe",
      area: "Magic Kingdom",
    },
    title: id,
    summary: "",
    category,
    section: "test",
    startDateTime,
    daypart,
    price: { state: priceState },
    location: { label: resortName },
    eligibility: { ages: ["all_ages"] },
    freshness: {
      badge: "verified",
      lastVerified: "2026-06-20T12:00:00.000Z",
      sourceUrl: "https://example.com/source.pdf",
    },
    status: "active",
  } as ActivityOccurrence;
}

const summaries = buildCalendarDaySummaries([
  activity("morning-craft", "2026-06-26T13:00:00.000Z", "morning", "Polynesian Village Resort", "arts_crafts"),
  activity("pool-break", "2026-06-26T18:00:00.000Z", "afternoon", "Polynesian Village Resort", "poolside", "unknown"),
  activity("campfire", "2026-06-26T23:00:00.000Z", "evening", "Polynesian Village Resort", "campfire"),
  activity("movie", "2026-06-27T02:00:00.000Z", "late", "Grand Floridian Resort & Spa", "movies_under_stars", "fee"),
  activity("next-day", "2026-06-27T15:00:00.000Z", "morning", "Grand Floridian Resort & Spa", "campfire"),
]);

const june26 = getCalendarDaySummary(summaries, "2026-06-26");
assert.equal(june26.total, 4, "June 26 should include late-night Orlando activities before midnight");
assert.deepEqual(
  june26.dayparts,
  { morning: 1, afternoon: 1, evening: 1, late: 1 },
  "Daypart bands should count each visible daypart"
);
assert.equal(june26.topResort?.name, "Polynesian Village Resort");
assert.equal(june26.topResort?.count, 3);
assert.equal(june26.topCategory?.label, "Campfire");
assert.deepEqual(june26.costMix, { free: 2, paid: 1, unknown: 1 });
assert.match(june26.ariaLabel, /4 activities/);
assert.match(june26.ariaLabel, /Top resort: Polynesian Village Resort/);
assert.match(june26.ariaLabel, /Starlight 1/);

const empty = getCalendarDaySummary(summaries, "2026-06-30");
assert.equal(empty.total, 0, "Missing days should return an empty summary");
assert.equal(empty.ariaLabel, "No activities from current resort calendars on June 30.");

console.log("Calendar density coverage passed.");
