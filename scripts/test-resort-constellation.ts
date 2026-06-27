import assert from "node:assert/strict";
import {
  buildResortActivityConstellation,
  RESORT_CONSTELLATION_DAYPARTS,
} from "../lib/visualizations/resortConstellation";
import type { ActivityOccurrence } from "../lib/types/occurrence";

function activity(
  id: string,
  daypart: ActivityOccurrence["daypart"],
  category: string,
  priceState: ActivityOccurrence["price"]["state"] = "free",
  startDateTime?: string
): ActivityOccurrence {
  return {
    id,
    activityCatalogId: id,
    activitySlug: id,
    resort: {
      slug: "polynesian-village-resort",
      name: "Polynesian Village Resort",
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
    location: { label: "Great Ceremonial House" },
    eligibility: { ages: ["all_ages"] },
    freshness: {
      badge: "verified",
      lastVerified: "2026-06-20T12:00:00.000Z",
      sourceUrl: "https://example.com/source.pdf",
    },
    status: "active",
  };
}

assert.deepEqual(
  RESORT_CONSTELLATION_DAYPARTS.map((part) => part.key),
  ["morning", "afternoon", "evening", "late", "anytime"],
  "Constellation dayparts should keep a predictable reading order"
);

const constellation = buildResortActivityConstellation([
  activity("craft-1", "morning", "arts_crafts", "free", "2026-06-26T13:00:00.000Z"),
  activity("craft-2", "morning", "arts_crafts", "free", "2026-06-27T13:00:00.000Z"),
  activity("pool-1", "afternoon", "poolside", "unknown"),
  activity("campfire-1", "evening", "campfire", "free", "2026-06-26T23:00:00.000Z"),
  activity("movie-1", "late", "movies_under_stars", "fee", "2026-06-27T02:00:00.000Z"),
  activity("hunt-1", "anytime", "scavenger_hunt", "free"),
]);

assert.equal(constellation.total, 6);
assert.equal(constellation.orbits.length, 5);
assert.equal(constellation.orbits[0].key, "morning");
assert.equal(constellation.orbits[0].count, 2);
assert.equal(constellation.orbits[0].intensity, 1);
assert.equal(constellation.orbits[1].intensity, 0.5);
assert.equal(constellation.orbits[0].nodes[0].category, "arts_crafts");
assert.equal(constellation.orbits[0].nodes[0].label, "Crafts");
assert.equal(constellation.orbits[0].nodes[0].count, 2);
assert.equal(constellation.orbits[0].nodes[0].size, "large");
assert.equal(constellation.topCategory?.label, "Crafts");
assert.equal(constellation.topCategory?.count, 2);
assert.equal(constellation.strongestDaypart?.label, "Morning");
assert.deepEqual(constellation.costMix, { free: 4, paid: 1, unknown: 1 });
assert.equal(
  constellation.summary,
  "6 resort activities, led by Morning and Crafts."
);
assert.match(constellation.ariaLabel, /Morning has 2 activities/);
assert.match(constellation.ariaLabel, /Crafts 2/);
assert.match(constellation.ariaLabel, /4 free, 1 paid, 1 price unclear/);

const empty = buildResortActivityConstellation([]);
assert.equal(empty.total, 0);
assert.equal(empty.summary, "No current calendar activities to show yet.");
assert.equal(empty.ariaLabel, "No current calendar activities to show yet.");

const fallbackCategory = buildResortActivityConstellation([
  activity("pool-party", "evening", "other", "unknown"),
]);
assert.equal(fallbackCategory.topCategory?.label, "Resort fun");
assert.equal(
  fallbackCategory.summary,
  "1 resort activity, led by Evening and Resort fun."
);
assert.match(fallbackCategory.ariaLabel, /Resort fun 1/);

console.log("Resort constellation coverage passed.");
