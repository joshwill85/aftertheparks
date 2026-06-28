import assert from "node:assert/strict";
import { buildPlanDaybookPath } from "../lib/plan/daybookPath";
import { buildPlanStayShell, groupPlanByDate } from "../lib/plan/sections";
import type { PlanItem } from "../lib/types/occurrence";

function item(
  id: string,
  title: string,
  resortSlug: string,
  resortName: string,
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
    category: "resort_activity",
    startDateTime,
    endDateTime,
    addedAt: "2026-06-26T12:00:00.000Z",
  };
}

const path = buildPlanDaybookPath([
  item(
    "movie",
    "Movie Under the Stars",
    "polynesian-village-resort",
    "Polynesian Village Resort",
    "2026-06-26T21:00:00.000Z",
    "2026-06-26T23:00:00.000Z"
  ),
  item(
    "craft",
    "Mosaic Craft",
    "contemporary-resort",
    "Contemporary Resort",
    "2026-06-26T13:00:00.000Z",
    "2026-06-26T14:00:00.000Z"
  ),
  item(
    "pool",
    "Pool Break",
    "contemporary-resort",
    "Contemporary Resort",
    "2026-06-26T15:45:00.000Z",
    "2026-06-26T16:15:00.000Z"
  ),
  item(
    "campfire",
    "Campfire",
    "polynesian-village-resort",
    "Polynesian Village Resort",
    "2026-06-26T16:25:00.000Z",
    "2026-06-26T17:00:00.000Z"
  ),
  item(
    "overlap",
    "Overlapping Games",
    "polynesian-village-resort",
    "Polynesian Village Resort",
    "2026-06-26T16:45:00.000Z",
    "2026-06-26T17:30:00.000Z"
  ),
  item("note", "Maybe add dessert", "contemporary-resort", "Contemporary Resort")
]);

assert.deepEqual(
  path.stops.map((stop) => stop.itemId),
  ["craft", "pool", "campfire", "overlap", "movie", "note"],
  "Stops should sort timed items chronologically and keep flexible ideas last"
);

assert.equal(path.stops[0].connectorBefore, undefined);

assert.deepEqual(path.stops[1].connectorBefore, {
  tone: "breathing",
  severity: "good",
  label: "1 hr 45 min breathing room",
  detail: "Same resort. Good room for snacks, reset time, or a slow walk.",
  iconKey: "poolside",
  ariaLabel:
    "1 hr 45 min between Mosaic Craft and Pool Break at the same resort.",
});

assert.deepEqual(path.stops[2].connectorBefore, {
  tone: "travel",
  severity: "risk",
  label: "10 min resort change",
  detail:
    "Build in travel time before moving from Contemporary Resort to Polynesian Village Resort.",
  iconKey: "nearby_area",
  ariaLabel:
    "10 min between Pool Break and Campfire with a resort change from Contemporary Resort to Polynesian Village Resort.",
});

assert.deepEqual(path.stops[3].connectorBefore, {
  tone: "conflict",
  severity: "risk",
  label: "15 min overlap",
  detail: "These saved ideas share time. Keep both as options or choose one.",
  iconKey: "nighttime_entertainment",
  ariaLabel: "Campfire and Overlapping Games overlap by 15 minutes.",
});

assert.deepEqual(path.stops[4].connectorBefore, {
  tone: "breathing",
  severity: "good",
  label: "3 hr 30 min breathing room",
  detail: "Same resort. Good room for snacks, reset time, or a slow walk.",
  iconKey: "poolside",
  ariaLabel:
    "3 hr 30 min between Overlapping Games and Movie Under the Stars at the same resort.",
});

assert.deepEqual(path.stops[5].connectorBefore, {
  tone: "flexible",
  severity: "watch",
  label: "Needs a time",
  detail: "Keep this as a folded note until you know where it belongs.",
  iconKey: "plan_nav",
  ariaLabel: "Maybe add dessert is saved without a scheduled time.",
});

assert.match(path.ariaLabel, /6 saved stops/);
assert.match(path.ariaLabel, /1 overlap/);
assert.match(path.ariaLabel, /2 breathing gaps/);
assert.match(path.ariaLabel, /1 resort change/);
assert.match(path.ariaLabel, /1 flexible idea/);

const grouped = groupPlanByDate([
  item(
    "late-craft",
    "Late Craft",
    "contemporary-resort",
    "Contemporary Resort",
    "2026-06-26T20:00:00.000Z",
    "2026-06-26T21:00:00.000Z"
  ),
  item(
    "early-craft",
    "Early Craft",
    "contemporary-resort",
    "Contemporary Resort",
    "2026-06-26T18:00:00.000Z",
    "2026-06-26T19:00:00.000Z"
  ),
]);

assert.deepEqual(
  grouped[0].sections.get("afternoon")?.map((planItem) => planItem.id),
  ["early-craft", "late-craft"],
  "Story-act sections should render timed items chronologically"
);

const stayShell = buildPlanStayShell(
  [
    item(
      "arrival",
      "Arrival Campfire",
      "polynesian-village-resort",
      "Polynesian Village Resort",
      "2026-07-02T22:00:00.000Z",
      "2026-07-02T23:00:00.000Z"
    ),
    item(
      "outside",
      "Too Early Pool",
      "polynesian-village-resort",
      "Polynesian Village Resort",
      "2026-07-01T15:00:00.000Z",
      "2026-07-01T16:00:00.000Z"
    ),
    item("flex", "Maybe dessert", "polynesian-village-resort", "Polynesian Village Resort"),
  ],
  {
    homeResortSlug: "polynesian-village-resort",
    tripStartDate: "2026-07-02",
    tripEndDate: "2026-07-04",
  }
);

assert.deepEqual(
  stayShell.stayDays.map((day) => day.dateKey),
  ["2026-07-02", "2026-07-03", "2026-07-04"],
  "Stay shell should render every inclusive date from check-in through check-out"
);
assert.deepEqual(
  stayShell.stayDays.map((day) => day.items.map((planItem) => planItem.id)),
  [["arrival"], [], []],
  "Stay shell should keep empty stay days visible"
);
assert.deepEqual(
  stayShell.outsideStayItems.map((planItem) => planItem.id),
  ["outside"],
  "Timed items outside stay dates should remain visible outside the shell"
);
assert.deepEqual(
  stayShell.flexibleItems.map((planItem) => planItem.id),
  ["flex"],
  "Untimed ideas should remain folded notes instead of belonging to a dated stay shell day"
);
assert.equal(
  stayShell.findHomeResortHref,
  "/activities?resort=polynesian-village-resort",
  "Home resort links should target exact resort results"
);
assert.equal(
  stayShell.findNearbyHref,
  "/activities?near=my-resort&resort=polynesian-village-resort",
  "Nearby links should target same-area near-my-resort mode"
);

assert.equal(
  buildPlanStayShell([], { tripStartDate: "2026-07-04", tripEndDate: "2026-07-02" }).enabled,
  false,
  "Invalid date ranges should not render a stay shell"
);

console.log("Plan daybook path coverage passed.");
