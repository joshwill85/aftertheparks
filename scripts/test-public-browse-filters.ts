import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

const repoRoot = process.cwd();
const activitiesPage = readFileSync(
  join(repoRoot, "app/activities/page.tsx"),
  "utf8"
);
const tonightPage = readFileSync(join(repoRoot, "app/tonight/page.tsx"), "utf8");
const browseFilterShell = readFileSync(
  join(repoRoot, "components/explore/BrowseFilterShell.tsx"),
  "utf8"
);
const resultSummary = readFileSync(
  join(repoRoot, "components/explore/ResultSummary.tsx"),
  "utf8"
);
const filterRail = readFileSync(
  join(repoRoot, "components/explore/FilterRail.tsx"),
  "utf8"
);

const requiredCategoryPages = [
  {
    param: "category=campfire",
    title: "Disney Resort Campfires",
    subtitle: "Campfires are outdoor and weather-sensitive.",
    canonical: "/activities?category=campfire",
  },
  {
    param: "category=poolside",
    title: "Disney Resort Poolside Activities",
    subtitle: "Pool access is usually limited to guests staying at that resort.",
    canonical: "/activities?category=poolside",
  },
  {
    param: "category=arcade",
    title: "Arcades and Games at Disney Resorts",
    subtitle: "indoor, low-effort backup",
    canonical: "/activities?category=arcade",
  },
  {
    param: "category=movies_under_stars",
    title: "Movies Under the Stars at Disney World Resorts",
    subtitle: "outdoor movie listings",
    canonical: "/activities?category=movies_under_stars",
  },
];

for (const page of requiredCategoryPages) {
  assert.match(
    activitiesPage,
    new RegExp(page.param.replace("?", "\\?")),
    `${page.param} should have category-specific page metadata`
  );
  assert.match(
    activitiesPage,
    new RegExp(page.title),
    `${page.param} should set a category-specific title`
  );
  assert.match(
    activitiesPage,
    new RegExp(page.subtitle),
    `${page.param} should explain what to confirm before going`
  );
  assert.match(
    activitiesPage,
    new RegExp(page.canonical.replace("?", "\\?")),
    `${page.param} should set a matching canonical URL`
  );
}

assert.match(
  filterRail,
  /selected/i,
  "Category filter should show the selected category context"
);
assert.match(
  filterRail,
  /Change category/,
  "Category filter should hide the full category selector behind Change category"
);
assert.doesNotMatch(
  activitiesPage + filterRail,
  /Category 1/,
  "Category pages and filters should not show placeholder Category 1 copy"
);

assert.doesNotMatch(
  browseFilterShell,
  /hideFreeOnly\s*=\s*variant\s*===\s*"tonight"/,
  "Tonight should not hide or neutralize the Free only filter"
);
assert.match(
  tonightPage,
  /"free=true"/,
  "Tonight should treat free=true as a supported strategic filter"
);
assert.match(
  tonightPage,
  /Free Disney Resort Activities Tonight/,
  "Tonight free filter should have focused public metadata"
);
assert.match(
  resultSummary,
  /\{" · "\}/,
  "Result summary should render a real text space before the active-filter separator"
);

console.log("Public browse filters contract passed.");
