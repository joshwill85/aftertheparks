import assert from "node:assert/strict";
import { buildPlanPace } from "../lib/plan/pace";
import type { PlanItem } from "../lib/types/occurrence";

function item(
  id: string,
  resortSlug: string,
  startDateTime?: string,
  endDateTime?: string,
  snapshotJson?: Record<string, unknown>
): PlanItem {
  return {
    id,
    activityCatalogId: id,
    activitySlug: id,
    title: id,
    resortSlug,
    resortName: resortSlug
      .split("-")
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" "),
    startDateTime,
    endDateTime,
    addedAt: "2026-06-26T12:00:00.000Z",
    snapshotJson,
  };
}

const relaxed = buildPlanPace([
  item("craft", "contemporary-resort", "2026-06-26T18:00:00.000Z", "2026-06-26T18:30:00.000Z"),
  item("pool", "contemporary-resort", "2026-06-26T20:30:00.000Z", "2026-06-26T21:00:00.000Z"),
  item("movie", "contemporary-resort", "2026-06-27T00:00:00.000Z", "2026-06-27T02:00:00.000Z"),
]);

assert.equal(relaxed.tone, "low_stress");
assert.equal(relaxed.score, 92);
assert.equal(relaxed.summary, "Low-stress daybook");
assert.match(relaxed.story, /room to breathe/);
assert.equal(relaxed.metrics.scheduledCount, 3);
assert.equal(relaxed.metrics.longGaps, 2);
assert.equal(relaxed.metrics.shortTransfers, 0);
assert.equal(relaxed.metrics.overlaps, 0);
assert.equal(relaxed.metrics.backtracks, 0);
assert.equal(relaxed.signals.find((signal) => signal.key === "breathing_room")?.value, "2");

const packed = buildPlanPace([
  item("craft", "contemporary-resort", "2026-06-26T18:00:00.000Z", "2026-06-26T19:00:00.000Z"),
  item("trivia", "polynesian-village-resort", "2026-06-26T18:45:00.000Z", "2026-06-26T19:30:00.000Z"),
  item("dinner", "contemporary-resort", "2026-06-26T19:45:00.000Z", "2026-06-26T20:30:00.000Z", {
    reservationRequired: true,
  }),
  item("movie", "grand-floridian-resort-and-spa", "2026-06-26T23:30:00.000Z", "2026-06-27T01:00:00.000Z"),
  item("note", "grand-floridian-resort-and-spa"),
]);

assert.equal(packed.tone, "needs_attention");
assert.equal(packed.score, 35);
assert.equal(packed.summary, "A few choices need attention");
assert.equal(packed.metrics.scheduledCount, 4);
assert.equal(packed.metrics.unscheduledCount, 1);
assert.equal(packed.metrics.overlaps, 1);
assert.equal(packed.metrics.shortTransfers, 1);
assert.equal(packed.metrics.longGaps, 1);
assert.equal(packed.metrics.backtracks, 3);
assert.equal(packed.metrics.reservationRisks, 1);
assert.match(packed.story, /1 overlap/);
assert.match(packed.story, /3 resort-to-resort moves/);
assert.match(packed.ariaLabel, /Plan pace score 35 percent/);
assert.equal(
  packed.signals.map((signal) => signal.key).join(","),
  "overlap,short_transfer,backtracking,reservation_risk,breathing_room,unscheduled"
);

const single = buildPlanPace([
  item("campfire", "fort-wilderness-resort", "2026-06-26T23:00:00.000Z", "2026-06-27T00:00:00.000Z"),
]);
assert.equal(single.tone, "easy_start");
assert.equal(single.summary, "A good start");
assert.match(single.story, /one saved activity/);
assert.doesNotMatch(single.story, /anchored plan moment|turn it into a story/);

console.log("Plan pace coverage passed.");
