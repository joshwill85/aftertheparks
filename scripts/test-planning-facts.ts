import assert from "node:assert/strict";
import {
  ageFitForActivity,
  bookingStatusForActivity,
  timeWindowForActivity,
  travelFitForActivity,
  weatherFitForActivity,
} from "@/lib/planning/activityFacts";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

function baseActivity(
  overrides: Partial<ActivityOccurrence>
): ActivityOccurrence {
  return {
    id: "a1",
    activitySlug: "test",
    activityCatalogId: "cat1",
    resort: {
      slug: "poly",
      name: "Polynesian",
      tier: "Deluxe",
      area: "magic_kingdom",
    },
    title: "Test Activity",
    summary: "",
    category: "arts_crafts",
    section: "Resort Activities",
    daypart: "anytime",
    price: { state: "unknown" },
    location: { label: "Lobby" },
    eligibility: { ages: ["unknown"] },
    freshness: {
      lastVerified: "2026-06-28T00:00:00.000Z",
      sourceUrl: "source",
      badge: "verified",
    },
    status: "active",
    ...overrides,
  };
}

assert.equal(
  bookingStatusForActivity(
    baseActivity({
      eligibility: { ages: ["unknown"], reservation: { required: true } },
    })
  ).status,
  "required"
);

assert.equal(
  bookingStatusForActivity(
    baseActivity({
      enrichment: { reservationRecommended: true },
    })
  ).status,
  "recommended"
);

assert.equal(
  bookingStatusForActivity(
    baseActivity({
      enrichment: { walkUpsAllowed: true, reservationRequired: false },
      claims: {
        booking: {
          value: "walkup_only",
          evidence: [{ text: "Reservations are not accepted." }],
        },
      },
    })
  ).status,
  "walkup_only"
);

assert.equal(
  bookingStatusForActivity(baseActivity({})).status,
  "unknown",
  "Absence of reservation fields must not become no-booking-required"
);

assert.equal(
  ageFitForActivity(
    baseActivity({
      enrichment: { ageMinimum: 12 },
      eligibility: { ages: ["12_plus"] },
    })
  ).littleKids,
  false
);

assert.equal(
  ageFitForActivity(
    baseActivity({
      summary: "This play area is for children ages 2-5 years old.",
      claims: {
        age: {
          value: "2-5",
          evidence: [{ text: "children ages 2-5 years old" }],
        },
      },
    })
  ).littleKids,
  true
);

assert.equal(
  timeWindowForActivity(
    baseActivity({
      startDateTime: "2026-06-28T23:30:00.000Z",
    })
  ).id,
  "after_7_pm"
);

assert.equal(
  travelFitForActivity(
    baseActivity({
      resort: {
        slug: "poly",
        name: "Polynesian",
        tier: "Deluxe",
        area: "magic_kingdom",
      },
    }),
    { homeResortSlug: "poly" }
  ).atMyResort,
  true
);

assert.equal(
  weatherFitForActivity(
    baseActivity({
      activitySlug: "movies-under-the-stars",
      category: "movies_under_stars",
    })
  ).rainBackup,
  false
);

assert.equal(
  weatherFitForActivity(
    baseActivity({
      activitySlug: "arcades",
      category: "arcade",
      enrichment: { weatherDependency: "indoor" },
    })
  ).rainBackup,
  true
);

assert.equal(
  weatherFitForActivity(
    baseActivity({
      activitySlug: "community-hall",
      title: "Community Hall",
      category: "other",
      location: { label: "Community Hall" },
    })
  ).rainBackup,
  true,
  "Rain backup should include inferred indoor community hall activities"
);

console.log("Planning facts contract passed.");
