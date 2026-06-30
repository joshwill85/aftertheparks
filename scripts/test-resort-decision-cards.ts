import assert from "node:assert/strict";
import {
  bestForLine,
  travelWorthForResort,
} from "@/components/resort/ResortCard";
import type { ResortSummary } from "@/lib/types/occurrence";

function resort(overrides: Partial<ResortSummary>): ResortSummary {
  return {
    id: "resort",
    slug: "resort",
    name: "Example Resort",
    category: "moderate",
    area: "epcot",
    disneyUrl: "https://example.com",
    activityCount: 4,
    offeringCount: 2,
    ...overrides,
  };
}

const campground = resort({
  slug: "fort-wilderness",
  name: "Fort Wilderness",
  category: "campground",
  area: "fort_wilderness",
  activityCount: 11,
  offeringCount: 6,
});
const value = resort({
  slug: "pop-century",
  name: "Pop Century",
  category: "value",
  area: "wide_world",
  activityCount: 2,
  offeringCount: 1,
});
const deluxe = resort({
  slug: "polynesian",
  name: "Polynesian Village Resort",
  category: "deluxe",
  area: "magic_kingdom",
  activityCount: 8,
  offeringCount: 5,
});

const bestForLines = new Set([
  bestForLine(campground, ["Campfire", "Movies"], 5, 4),
  bestForLine(value, ["Poolside"], 1, 0),
  bestForLine(deluxe, ["Movies", "Crafts", "Campfire"], 4, 4),
]);

assert.equal(
  bestForLines.size,
  3,
  "Resort cards should not reuse one generic best-for sentence across resort types"
);

const dedicatedTrip = travelWorthForResort({
  resort: campground,
  todayCount: 5,
  tonightCount: 4,
  highlights: ["Campfire", "Movies", "Crafts"],
});
assert.equal(dedicatedTrip.label, "Worth a dedicated trip");
assert.match(dedicatedTrip.reason, /many current options|evening/i);

const stayHere = travelWorthForResort({
  resort: value,
  todayCount: 1,
  tonightCount: 0,
  highlights: ["Poolside"],
});
assert.equal(stayHere.label, "Best if staying here");
assert.match(stayHere.reason, /lighter|limited|simple/i);

const nearby = travelWorthForResort({
  resort: deluxe,
  todayCount: 2,
  tonightCount: 1,
  highlights: ["Movies", "Crafts"],
});
assert.ok(
  ["Worth visiting if nearby", "Not worth crossing property for"].includes(nearby.label),
  "Moderate resort-card scores should steer guests toward nearby hops instead of inflated dedicated trips"
);
assert.ok(
  dedicatedTrip.reason.length > dedicatedTrip.label.length,
  "Travel-worth label should include a short reason"
);

console.log("Resort decision card contract passed.");
