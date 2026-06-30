import assert from "node:assert/strict";
import { filterPublicBrowseActivities } from "@/lib/data/activities";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

function activity(
  overrides: Partial<ActivityOccurrence> = {}
): ActivityOccurrence {
  return {
    id: "unsupported-weather",
    activitySlug: "unsupported-weather",
    activityCatalogId: "unsupported-weather",
    resort: {
      slug: "poly",
      name: "Polynesian Village Resort",
      tier: "Deluxe",
      area: "magic_kingdom",
    },
    title: "Unsupported Weather Claim",
    summary: "A source-backed activity without public weather evidence.",
    category: "other",
    section: "Recreation",
    daypart: "afternoon",
    price: { state: "unknown" },
    location: { label: "Courtyard" },
    eligibility: { ages: ["unknown"] },
    freshness: {
      lastVerified: "2026-06-29T00:00:00.000Z",
      sourceUrl: "https://example.com/source.pdf",
      badge: "verified",
    },
    source: {
      url: "https://example.com/source.pdf",
      documentHash: "hash",
    },
    fieldProvenance: {
      title: [{ text: "Unsupported Weather Claim" }],
      schedule: [{ text: "Daily at 2:00 PM" }],
      location: [{ text: "Courtyard" }],
    },
    claims: {},
    status: "active",
    ...overrides,
  };
}

const filtered = filterPublicBrowseActivities(
  [
    activity({
      enrichment: {
        weatherDependency: "indoor",
      },
    }),
  ],
  { weather: "indoor" }
);

assert.equal(
  filtered.length,
  0,
  "Browse filters should not use enrichment that public sanitization removes"
);

console.log("Public browse filters contract passed.");
