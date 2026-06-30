import assert from "node:assert/strict";
import { buildPlanBackupSuggestions } from "@/lib/plan/swaps";
import { scorePlanResilience } from "@/lib/weather/resilience";
import type { ActivityOccurrence, PlanItem } from "@/lib/types/occurrence";

const score = scorePlanResilience({
  futureItems: 5,
  weatherSensitiveItems: 3,
  itemsWithIndoorBackups: 4,
  sameResortBackupCount: 3,
  transportWeatherRisk: "medium",
  stormModeActive: false,
  heatRisk: "medium",
  rainRisk: "medium",
  groupContext: ["grandparents"],
});

assert.ok(score.score >= 0 && score.score <= 100);
assert.ok(["strong", "flexible", "fragile", "unsafe"].includes(score.label));
assert.ok(score.reasons.length > 0);
assert.ok(score.improvements.length > 0);

function activity(overrides: Partial<ActivityOccurrence>): ActivityOccurrence {
  return {
    id: overrides.id ?? "activity",
    activitySlug: overrides.activitySlug ?? "activity",
    activityCatalogId: overrides.activityCatalogId ?? overrides.id ?? "activity",
    title: overrides.title ?? "Activity",
    summary: overrides.summary ?? "A current public activity.",
    category: overrides.category ?? "arcade",
    section: overrides.section ?? "Activities",
    startDateTime: overrides.startDateTime,
    endDateTime: overrides.endDateTime,
    daypart: overrides.daypart ?? "evening",
    resort: overrides.resort ?? {
      slug: "polynesian-village-resort",
      name: "Polynesian Village Resort",
      tier: "Deluxe",
      area: "magic_kingdom",
    },
    price: overrides.price ?? { state: "free" },
    location: overrides.location ?? { label: "Community Hall" },
    eligibility: overrides.eligibility ?? { ages: ["all_ages"] },
    freshness: overrides.freshness ?? {
      lastVerified: "2026-06-25T12:00:00.000Z",
      sourceUrl: "https://example.com",
      badge: "verified",
    },
    status: overrides.status ?? "active",
    enrichment: overrides.enrichment,
  } as ActivityOccurrence;
}

const outdoorPlanItem = {
  id: "saved-campfire",
  activityCatalogId: "campfire",
  activitySlug: "campfire",
  title: "Campfire",
  resortSlug: "polynesian-village-resort",
  resortName: "Polynesian Village Resort",
  category: "campfire",
  startDateTime: "2026-06-25T18:30:00-04:00",
  endDateTime: "2026-06-25T19:00:00-04:00",
  addedAt: "2026-06-25T10:00:00-04:00",
} satisfies PlanItem;

const backups = buildPlanBackupSuggestions(outdoorPlanItem, [
  activity({
    id: "same-activity",
    activityCatalogId: "campfire",
    activitySlug: "campfire",
    title: "Campfire",
    category: "campfire",
    startDateTime: "2026-06-25T18:30:00-04:00",
  }),
  activity({
    id: "same-resort-indoor-free",
    activitySlug: "arcade-games",
    activityCatalogId: "arcade-games",
    title: "Arcade Games",
    category: "arcade",
    startDateTime: "2026-06-25T18:15:00-04:00",
  }),
  activity({
    id: "same-resort-covered-fee",
    activitySlug: "covered-craft",
    activityCatalogId: "covered-craft",
    title: "Covered Craft",
    category: "arts_crafts",
    summary: "Covered porch craft.",
    startDateTime: "2026-06-25T18:15:00-04:00",
    price: { state: "fee" },
  }),
  activity({
    id: "other-resort-indoor-free",
    activitySlug: "other-arcade",
    activityCatalogId: "other-arcade",
    title: "Other Arcade",
    category: "arcade",
    resort: {
      slug: "contemporary-resort",
      name: "Contemporary Resort",
      tier: "Deluxe",
      area: "magic_kingdom",
    },
    startDateTime: "2026-06-25T18:15:00-04:00",
  }),
  activity({
    id: "same-resort-indoor-reservation",
    activitySlug: "animation-class",
    activityCatalogId: "animation-class",
    title: "Animation Class",
    category: "arts_crafts",
    startDateTime: "2026-06-25T18:15:00-04:00",
    eligibility: { ages: ["all_ages"], reservation: { required: true } },
  }),
]);

assert.equal(backups[0]?.activity.id, "same-resort-indoor-free");
assert.equal(
  backups.some((backup) => backup.activity.id === "same-activity"),
  false,
  "backup suggestions should never include the original activity"
);
assert.ok(
  backups.every((backup) => backup.weatherFit === "indoor" || backup.weatherFit === "covered"),
  "backup suggestions should prefer indoor or covered activities"
);
assert.ok(
  backups[0].reasons.includes("Same resort") &&
    backups[0].reasons.includes("Same time window") &&
    backups[0].reasons.includes("Free or low-cost"),
  "top backup should explain the ranking"
);

assert.deepEqual(
  buildPlanBackupSuggestions(
    { ...outdoorPlanItem, category: "arcade", snapshotJson: {} },
    backups.map((backup) => backup.activity)
  ),
  [],
  "indoor/non-weather-sensitive saved items should not trigger backup suggestions"
);

console.log("Plan resilience passed.");
