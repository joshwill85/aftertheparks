import assert from "node:assert/strict";
import {
  activityDecisionProfile,
  offeringDecisionProfile,
} from "../lib/activityDecision";
import type { DisplayActivity } from "../lib/displayActivity";
import type { ActivityOccurrence, ActivityOffering } from "../lib/types/occurrence";

const baseFreshness = {
  lastVerified: "2026-06-20T12:00:00.000Z",
  sourceUrl: "https://example.com/source.pdf",
  badge: "verified" as const,
};

const offering = {
  title: "Campfire Treats",
  category: "campfire",
  resort: { name: "Fort Wilderness Resort" },
  availability: { kind: "reservation_based" },
  price: { state: "free" },
  booking: { reservationRequired: true },
  eligibility: {},
  freshness: baseFreshness,
  trustState: "source_backed",
} as ActivityOffering;

const offeringProfile = offeringDecisionProfile(offering);
assert.equal(offeringProfile.signals.length, 2, "Offering should expose only timing and cost decision signals");
assert.deepEqual(
  offeringProfile.signals.map((signal) => signal.id),
  ["time", "cost"],
  "Offering decision blocks should only include timing and cost"
);
assert.equal(
  offeringProfile.signals[0]?.id,
  "time",
  "Decision blocks should lead with guest-facing timing, not source confidence"
);
assert.equal(
  offeringProfile.signals.some((signal) => signal.label === "Source"),
  false,
  "Decision blocks should not show internal source-strength language"
);
assert.equal(
  offeringProfile.signals.some((signal) => signal.label === "Effort"),
  false,
  "Decision blocks should not show effort cards"
);
assert.equal(
  offeringProfile.whyFits,
  undefined,
  "Decision blocks should not generate low-value why-fit copy"
);

const display = {
  title: "Movie Under the Stars",
  categoryLabel: "Movies Under the Stars",
  resortName: "Polynesian Village Resort",
  timeUncertain: true,
  timeLabel: "Confirm with resort",
} as DisplayActivity;

const activity = {
  title: display.title,
  category: "movies_under_stars",
  resort: { name: display.resortName, slug: "polynesian-village" },
  price: { state: "unknown" },
  eligibility: { ages: ["all_ages"] },
  enrichment: { walkUpsAllowed: true },
  freshness: { ...baseFreshness, badge: "stale" as const },
  trustState: "confirm_before_going",
} as ActivityOccurrence;

const activityProfile = activityDecisionProfile(activity, display);
assert.deepEqual(
  activityProfile.signals.map((signal) => signal.id),
  ["time"],
  "Unknown-price activity decision blocks should omit public cost wording"
);
assert.equal(
  activityProfile.signals.find((signal) => signal.id === "time")?.value,
  "Confirm",
  "Uncertain activity timing should ask guests to confirm"
);
assert.equal(activityProfile.signals.some((signal) => signal.id === "cost"), false);
assert.equal(
  activityProfile.signals.some((signal) => signal.label === "Effort"),
  false,
  "Decision blocks should not show effort cards"
);

console.log("Decision signal coverage passed.");
