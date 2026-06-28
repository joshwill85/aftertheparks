import assert from "node:assert/strict";
import {
  INTENT_PRESETS,
  itemMatchesPreset,
} from "@/lib/planning/presetDefinitions";
import {
  parseBrowseParams,
  preserveBrowseParams,
} from "@/lib/explore/browseParams";
import { buildFilterImpact, type FilterableItem } from "@/lib/explore/filterImpact";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

function activity(
  overrides: Partial<ActivityOccurrence> = {}
): ActivityOccurrence {
  return {
    id: "activity-1",
    activitySlug: "campfire",
    activityCatalogId: "catalog-1",
    resort: {
      slug: "poly",
      name: "Polynesian Village Resort",
      tier: "deluxe",
      area: "magic_kingdom",
    },
    title: "Campfire",
    summary: "A family activity.",
    category: "campfire",
    section: "Recreation",
    startDateTime: "2026-06-28T23:30:00.000Z",
    daypart: "late",
    price: { state: "free" },
    location: { label: "Beach" },
    eligibility: { ages: [], reservation: { required: false } },
    freshness: {
      lastVerified: "2026-06-01",
      sourceUrl: "https://example.com",
      badge: "verified",
    },
    status: "active",
    ...overrides,
  };
}

assert.ok(INTENT_PRESETS.some((preset) => preset.id === "at_my_resort"));
assert.ok(INTENT_PRESETS.some((preset) => preset.label === "After 7 PM"));
assert.ok(!INTENT_PRESETS.some((preset) => preset.label === "After dinner"));
assert.ok(!INTENT_PRESETS.some((preset) => preset.label === "Low walking"));

assert.equal(
  itemMatchesPreset(activity(), "at_my_resort", { homeResortSlug: "poly" }),
  true,
  "At my resort should require a matching home resort slug"
);
assert.equal(
  itemMatchesPreset(activity(), "at_my_resort", {}),
  false,
  "At my resort should not match without a home resort anchor"
);
assert.equal(
  itemMatchesPreset(activity(), "after_7_pm", {}),
  true,
  "After 7 PM should use the defined Orlando time window"
);
assert.equal(
  itemMatchesPreset(
    activity({
      enrichment: { reservationRequired: false },
      claims: {},
    }),
    "no_booking_required",
    {}
  ),
  false,
  "No booking required must not be inferred from a false field without evidence"
);
assert.equal(
  itemMatchesPreset(
    activity({
      enrichment: { weatherDependency: "indoor" },
    }),
    "rain_backup",
    {}
  ),
  true,
  "Indoor source-backed activities should qualify as rain backups"
);
assert.equal(
  itemMatchesPreset(
    activity({
      activitySlug: "movies-under-the-stars",
      category: "movies_under_stars",
      enrichment: undefined,
    }),
    "rain_backup",
    {}
  ),
  false,
  "Outdoor movies should not qualify as rain backups"
);

const parsed = parseBrowseParams(new URLSearchParams("preset=after_7_pm"));
assert.equal(parsed.preset, "after_7_pm");
const preserved = preserveBrowseParams(
  new URLSearchParams("preset=rain_backup&ignored=yes")
);
assert.equal(preserved.toString(), "preset=rain_backup");

const filterItems: FilterableItem[] = [
  {
    id: "poly-evening",
    resortSlug: "poly",
    resortArea: "magic_kingdom",
    category: "campfire",
    daypart: "late",
    free: true,
    reservation: false,
    bookingStatus: "unknown",
    startDateTime: "2026-06-28T23:30:00.000Z",
    weatherFit: "outdoor_weather_dependent",
  },
  {
    id: "poly-arcade",
    resortSlug: "poly",
    resortArea: "magic_kingdom",
    category: "arcades",
    daypart: "afternoon",
    free: false,
    reservation: false,
    bookingStatus: "not_required_verified",
    weatherFit: "indoor",
  },
  {
    id: "akl-craft",
    resortSlug: "akl",
    resortArea: "animal_kingdom",
    category: "arts_crafts",
    daypart: "afternoon",
    free: false,
    reservation: true,
    bookingStatus: "recommended",
    weatherFit: "covered",
  },
];

const impact = buildFilterImpact(
  filterItems,
  { resort: "poly", preset: "rain_backup" },
  [
    { slug: "poly", name: "Polynesian Village" },
    { slug: "akl", name: "Animal Kingdom Lodge" },
  ]
);
assert.equal(impact.total, 1, "Preset filters should narrow impact totals");
assert.equal(
  impact.presets.find((preset) => preset.value === "rain_backup")?.active,
  true,
  "Active preset should be reported in impact counts"
);
assert.equal(
  impact.presets.find((preset) => preset.value === "at_my_resort")?.count,
  2,
  "At-my-resort count should use the selected resort as the home anchor"
);

console.log("Preset definitions contract passed.");
