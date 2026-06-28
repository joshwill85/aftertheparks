import assert from "node:assert/strict";
import { activityDecisionProfile } from "../lib/activityDecision";
import type { DisplayActivity } from "../lib/displayActivity";
import type { ActivityOccurrence } from "../lib/types/occurrence";

const baseFreshness = {
  lastVerified: "2026-06-20T12:00:00.000Z",
  sourceUrl: "https://example.com/source.pdf",
  badge: "verified" as const,
};

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
const activitySignalIds = activityProfile.signals.map((signal) => signal.id);
assert.deepEqual(
  activitySignalIds,
  [],
  "Activity decision blocks should omit redundant timing, cost, weather, and non-required booking prompts"
);
assert.equal((activitySignalIds as string[]).includes("time"), false);
assert.equal((activitySignalIds as string[]).includes("cost"), false);
assert.equal((activitySignalIds as string[]).includes("booking"), false);
assert.equal(
  (activitySignalIds as string[]).includes("weather"),
  false,
  "Decision blocks should not show generic check-forecast cards"
);
assert.equal(
  activityProfile.signals.some((signal) => signal.label === "Effort"),
  false,
  "Decision blocks should not show effort cards"
);

const requiredBookingActivity = {
  ...activity,
  eligibility: { reservation: { required: true } },
  enrichment: {},
} as ActivityOccurrence;
const requiredBookingProfile = activityDecisionProfile(requiredBookingActivity, display);
assert.equal(
  requiredBookingProfile.signals.some(
    (signal) => signal.id === "booking" && signal.value === "Required"
  ),
  true,
  "Booking decision blocks should appear only when booking is confirmed required"
);

console.log("Decision signal coverage passed.");
