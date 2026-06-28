import assert from "node:assert/strict";
import { buildDecisionSummary } from "@/lib/planning/decisionSummary";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

function activity(
  id: string,
  overrides: Partial<ActivityOccurrence> = {}
): ActivityOccurrence {
  return {
    id,
    activitySlug: "arcades",
    activityCatalogId: id,
    resort: {
      slug: "poly",
      name: "Polynesian",
      tier: "Deluxe",
      area: "magic_kingdom",
    },
    title: id,
    summary: "",
    category: "arcades",
    section: "Resort Activities",
    daypart: "afternoon",
    price: { state: "free" },
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

const summary = buildDecisionSummary({
  activities: [
    activity("rain", { enrichment: { weatherDependency: "indoor" } }),
    activity("home", {
      resort: {
        slug: "poly",
        name: "Polynesian",
        tier: "Deluxe",
        area: "magic_kingdom",
      },
    }),
    activity("after7", { startDateTime: "2026-06-28T23:30:00.000Z" }),
  ],
  homeResortSlug: "poly",
  scope: "today",
});

assert.ok(summary.actions.some((action) => action.id === "at_my_resort"));
assert.ok(summary.actions.some((action) => action.id === "rain_backup"));
assert.ok(summary.primaryText.includes("source-backed"));
assert.ok(summary.trustText.includes("verified"));
assert.ok(
  summary.actions.every((action) => !action.href.includes("after_dinner")),
  "Decision shortcuts should not use vague after-dinner params"
);

console.log("Decision summary contract passed.");
