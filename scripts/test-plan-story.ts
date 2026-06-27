import assert from "node:assert/strict";
import { buildPlanStory } from "../lib/plan/story";
import type { PlanItem } from "../lib/types/occurrence";

function item(
  id: string,
  title: string,
  resortSlug: string,
  resortName: string,
  category: string,
  startDateTime?: string,
  endDateTime?: string
): PlanItem {
  return {
    id,
    activityCatalogId: id,
    activitySlug: id,
    title,
    resortSlug,
    resortName,
    category,
    location: `${resortName} lawn`,
    startDateTime,
    endDateTime,
    addedAt: "2026-06-26T12:00:00.000Z",
    priceLabel: "Free",
  };
}

const oneItem = buildPlanStory([
  item(
    "craft",
    "The Magic Of Mosaics",
    "contemporary-resort",
    "Contemporary Resort",
    "arts_crafts",
    "2026-06-26T18:00:00.000Z",
    "2026-06-26T19:00:00.000Z"
  ),
]);

assert.equal(oneItem.tone, "start");
assert.equal(oneItem.headline, "Your daybook has its first anchor");
assert.match(oneItem.body, /The Magic Of Mosaics/);
assert.match(oneItem.body, /Contemporary Resort/);
assert.doesNotMatch(oneItem.body, /feel intentional|decision friction/);
assert.equal(oneItem.highlights.length, 2);
assert.deepEqual(
  oneItem.nextActions.map((action) => [action.label, action.href]),
  [
    ["Add a nearby idea", "/activities?resort=contemporary-resort"],
    ["Find tonight's follow-up", "/tonight?resort=contemporary-resort"],
  ]
);
assert.match(oneItem.ariaLabel, /is saved/);

const multiItem = buildPlanStory([
  item(
    "craft",
    "Poolside Craft",
    "contemporary-resort",
    "Contemporary Resort",
    "arts_crafts",
    "2026-06-26T18:00:00.000Z",
    "2026-06-26T19:00:00.000Z"
  ),
  item(
    "campfire",
    "Campfire on the Beach",
    "polynesian-village-resort",
    "Polynesian Village Resort",
    "campfire",
    "2026-06-26T23:00:00.000Z",
    "2026-06-27T00:00:00.000Z"
  ),
  item(
    "movie",
    "Movie Under the Stars",
    "polynesian-village-resort",
    "Polynesian Village Resort",
    "movies_under_stars",
    "2026-06-27T01:00:00.000Z",
    "2026-06-27T03:00:00.000Z"
  ),
  item(
    "note",
    "Maybe add snacks",
    "polynesian-village-resort",
    "Polynesian Village Resort",
    "other"
  ),
]);

assert.equal(multiItem.tone, "story");
assert.equal(multiItem.headline, "Your resort day is coming together");
assert.match(multiItem.body, /Start with Poolside Craft/);
assert.match(multiItem.body, /then Campfire on the Beach/);
assert.match(multiItem.body, /finish with Movie Under the Stars/);
assert.deepEqual(
  multiItem.highlights.map((highlight) => [highlight.label, highlight.value]),
  [
    ["Planned stops", "3 timed stops"],
    ["Home base", "Polynesian Village Resort"],
    ["Primary mood", "Movies"],
  ]
);
assert.deepEqual(
  multiItem.nextActions.map((action) => [action.label, action.href]),
  [
    ["Balance with a low-key break", "/activities?resort=polynesian-village-resort&category=poolside"],
    ["Check calendar density", "/calendar?resort=polynesian-village-resort"],
  ]
);
assert.match(multiItem.ariaLabel, /3 timed stops/);

const unscheduled = buildPlanStory([
  item("note", "Maybe add s'mores", "fort-wilderness-resort", "Fort Wilderness Resort", "campfire"),
]);

assert.equal(unscheduled.tone, "flexible");
assert.equal(unscheduled.headline, "A flexible idea is waiting");
assert.match(unscheduled.body, /Give Maybe add s'mores a time/);
assert.equal(unscheduled.nextActions[0].href, "/calendar?resort=fort-wilderness-resort");

console.log("Plan story coverage passed.");
