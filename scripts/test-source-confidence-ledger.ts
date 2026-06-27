import assert from "node:assert/strict";
import {
  buildSourceConfidenceLedger,
  buildSourceConfidenceSummary,
} from "../lib/visualizations/sourceConfidence";
import type { ActivityOccurrence } from "../lib/types/occurrence";

function activity(
  overrides: Partial<ActivityOccurrence> = {}
): ActivityOccurrence {
  return {
    id: "activity-1",
    activityCatalogId: "activity-1",
    activitySlug: "activity-1",
    resort: {
      slug: "polynesian-village-resort",
      name: "Polynesian Village Resort",
      tier: "deluxe",
      area: "Magic Kingdom",
    },
    title: "Campfire",
    summary: "A cozy campfire.",
    category: "campfire",
    section: "test",
    startDateTime: "2026-06-26T23:00:00.000Z",
    daypart: "evening",
    price: { state: "free" },
    location: { label: "Beach" },
    eligibility: { ages: ["all_ages"] },
    freshness: {
      badge: "verified",
      lastVerified: "2026-06-20T12:00:00.000Z",
      sourceUrl: "https://example.com/source.pdf",
    },
    source: {
      url: "https://example.com/source.pdf",
      documentHash: "a".repeat(64),
      documentId: "polynesian-june",
      edition: "June 2026",
    },
    trustState: "source_backed",
    status: "active",
    ...overrides,
  };
}

const strong = buildSourceConfidenceLedger(activity(), {
  now: new Date("2026-06-26T16:00:00.000Z"),
});

assert.equal(strong.score, 100);
assert.equal(strong.tone, "strong");
assert.equal(strong.summary, "Source looks current");
assert.deepEqual(
  strong.items.map((item) => [item.key, item.state, item.label]),
  [
    ["source_link", "good", "Official source linked"],
    ["verified_recently", "good", "Verified recently"],
    ["time_clear", "good", "Time is clear"],
    ["cost_clear", "good", "Cost is clear"],
    ["source_contract", "good", "Source saved"],
  ]
);
assert.match(strong.ariaLabel, /Source looks current/);
assert.match(strong.ariaLabel, /5 of 5 checks are strong/);

const weakActivity = activity({
  startDateTime: undefined,
  scheduleText: "Check with recreation guide",
  price: { state: "unknown" },
  freshness: {
    badge: "stale",
    lastVerified: "2026-02-01T12:00:00.000Z",
    sourceUrl: "",
  },
  source: undefined,
  trustState: "source_unclear",
});

const needsConfirmation = buildSourceConfidenceLedger(weakActivity, {
  now: new Date("2026-06-26T16:00:00.000Z"),
});

assert.equal(needsConfirmation.score, 0);
assert.equal(needsConfirmation.tone, "needs_confirmation");
assert.equal(needsConfirmation.summary, "Confirm before you go");
assert.deepEqual(
  needsConfirmation.items.map((item) => [item.key, item.state]),
  [
    ["source_link", "needs_confirmation"],
    ["verified_recently", "needs_confirmation"],
    ["time_clear", "needs_confirmation"],
    ["cost_clear", "needs_confirmation"],
    ["source_contract", "needs_confirmation"],
  ]
);

const mixedSummary = buildSourceConfidenceSummary(
  [activity(), weakActivity],
  { now: new Date("2026-06-26T16:00:00.000Z") }
);

assert.equal(mixedSummary.total, 2);
assert.equal(mixedSummary.strong, 1);
assert.equal(mixedSummary.mixed, 0);
assert.equal(mixedSummary.needsConfirmation, 1);
assert.equal(mixedSummary.averageScore, 50);
assert.equal(mixedSummary.summary, "1 strong, 1 needs confirmation.");
assert.match(mixedSummary.ariaLabel, /Average source check 50 percent/);

console.log("Source confidence ledger coverage passed.");
