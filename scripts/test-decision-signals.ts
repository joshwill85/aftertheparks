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
assert.equal(offeringProfile.signals.length, 3, "Offering should expose three guest-facing decision signals");
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
  offeringProfile.signals.find((signal) => signal.id === "effort")?.value,
  "Reservation",
  "Reservation-required offerings should disclose planning effort"
);
assert.match(
  offeringProfile.whyFits,
  /Fort Wilderness Resort/,
  "Why-fit copy should include the resort context"
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
assert.equal(
  activityProfile.signals.find((signal) => signal.id === "time")?.value,
  "Confirm",
  "Uncertain activity timing should ask guests to confirm"
);
assert.equal(
  activityProfile.signals.find((signal) => signal.id === "cost")?.value,
  "Ask first",
  "Unknown prices should never be presented as free or paid"
);
assert.equal(
  activityProfile.signals.find((signal) => signal.id === "effort")?.value,
  "Walk-up",
  "Walk-up allowed activities should feel low-friction"
);

console.log("Decision signal coverage passed.");
