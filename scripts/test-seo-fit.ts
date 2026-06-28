import assert from "node:assert/strict";
import {
  DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG,
  DEFAULT_ROUTE_SEO_FIT_BY_CLUSTER,
  isPrimaryRainyDayFit,
  isRecommendedSeoRoute,
  SEO_MISTAKE_LOG,
  weatherFitLabel,
} from "@/lib/seo/fit";
import { parseBrowseParams } from "@/lib/explore/browseParams";
import { applyBrowseFilters } from "@/lib/explore/applyBrowseFilters";
import type { ActivityFilters, ActivityOccurrence } from "@/lib/types/occurrence";

assert.equal(
  isPrimaryRainyDayFit(DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG.arcades),
  true,
  "arcades should be a primary rainy-day fit"
);
assert.equal(
  isPrimaryRainyDayFit(DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG["community-halls"]),
  true,
  "community halls should be a primary rainy-day fit"
);
assert.equal(
  isPrimaryRainyDayFit(DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG.campfire),
  false,
  "campfires should not be a primary rainy-day recommendation"
);
assert.equal(
  weatherFitLabel(DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG["movies-under-the-stars"]),
  "Not recommended in rain"
);

const rainyDayParams = parseBrowseParams(new URLSearchParams("weather=indoor"));
assert.equal(
  rainyDayParams.weather,
  "indoor",
  "rainy-day SEO deep links should activate the indoor weather filter"
);

const baseOccurrence = {
  id: "base",
  activityCatalogId: "base",
  resort: {
    slug: "poly",
    name: "Polynesian Village Resort",
    tier: "Deluxe",
    area: "magic_kingdom",
  },
  summary: "",
  section: "Resort Activities",
  daypart: "afternoon",
  price: { state: "unknown" },
  location: { label: "Lobby" },
  eligibility: { ages: ["all_ages"] },
  freshness: { lastVerified: new Date().toISOString(), sourceUrl: "", badge: "verified" },
  status: "active",
} satisfies Partial<ActivityOccurrence>;

const rainyDayFiltered = applyBrowseFilters(
  [
    {
      ...baseOccurrence,
      id: "arcade",
      activitySlug: "arcades",
      title: "Arcade",
      category: "arcades",
    },
    {
      ...baseOccurrence,
      id: "movie",
      activitySlug: "movies-under-the-stars",
      title: "Movies Under the Stars",
      category: "movies_under_stars",
      location: { label: "Lawn" },
    },
  ] as ActivityOccurrence[],
  rainyDayParams
);
assert.deepEqual(
  rainyDayFiltered.map((activity) => activity.activitySlug),
  ["arcades"],
  "rainy-day indoor filter should exclude outdoor weather-dependent activities"
);

const noTicketParams = parseBrowseParams(new URLSearchParams("ticket_required=false"));
assert.equal(
  (noTicketParams as ActivityFilters & { ticketRequired?: boolean }).ticketRequired,
  false,
  "no-ticket SEO deep links should activate the no-park-ticket filter"
);

const noTicketFiltered = applyBrowseFilters(
  [
    {
      ...baseOccurrence,
      id: "resort-arcade",
      activitySlug: "arcades",
      title: "Arcade",
      category: "arcades",
    },
    {
      ...baseOccurrence,
      id: "park-fireworks-party",
      activitySlug: "fireworks-dessert-party",
      title: "Park Fireworks Dessert Party",
      summary: "Requires valid theme park admission.",
      category: "fireworks",
      location: { label: "Inside Magic Kingdom Park" },
    },
  ] as ActivityOccurrence[],
  noTicketParams
);
assert.deepEqual(
  noTicketFiltered.map((activity) => activity.id),
  ["resort-arcade"],
  "no-ticket filter should exclude activities that require park admission"
);

const routeParams = parseBrowseParams(
  new URLSearchParams("transport=monorail&area=disney-springs")
);
assert.equal(
  (routeParams as ActivityFilters & { transport?: string }).transport,
  "monorail",
  "transport SEO deep links should activate the transport filter"
);
assert.equal(
  (routeParams as ActivityFilters & { area?: string }).area,
  "disney-springs",
  "area SEO deep links should activate the area filter"
);

const monorailFiltered = applyBrowseFilters(
  [
    {
      ...baseOccurrence,
      id: "poly-campfire",
      activitySlug: "campfire",
      title: "Campfire",
      category: "campfire",
      resort: {
        slug: "polynesian-village-resort",
        name: "Polynesian Village Resort",
        tier: "Deluxe",
        area: "magic_kingdom",
      },
    },
    {
      ...baseOccurrence,
      id: "pop-arcade",
      activitySlug: "arcades",
      title: "Arcade",
      category: "arcades",
      resort: {
        slug: "pop-century-resort",
        name: "Pop Century Resort",
        tier: "Value",
        area: "skyliner",
      },
    },
  ] as ActivityOccurrence[],
  { transport: "monorail" } as ActivityFilters & { transport: string }
);
assert.deepEqual(
  monorailFiltered.map((activity) => activity.id),
  ["poly-campfire"],
  "monorail transport filter should keep Magic Kingdom monorail-loop resort results"
);

const disneySpringsAreaFiltered = applyBrowseFilters(
  [
    {
      ...baseOccurrence,
      id: "saratoga-lobby",
      activitySlug: "resort-exploration",
      title: "Saratoga Springs Lobby Walk",
      category: "resort_exploration",
      resort: {
        slug: "saratoga-springs-resort-and-spa",
        name: "Saratoga Springs Resort",
        tier: "Deluxe Villa",
        area: "disney_springs",
      },
    },
    {
      ...baseOccurrence,
      id: "akl-arcade",
      activitySlug: "arcades",
      title: "Arcade",
      category: "arcades",
      resort: {
        slug: "animal-kingdom-lodge",
        name: "Animal Kingdom Lodge",
        tier: "Deluxe",
        area: "animal_kingdom",
      },
    },
  ] as ActivityOccurrence[],
  { area: "disney-springs" } as ActivityFilters & { area: string }
);
assert.deepEqual(
  disneySpringsAreaFiltered.map((activity) => activity.id),
  ["saratoga-lobby"],
  "Disney Springs area filter should target Disney Springs-area resorts only"
);

const firstNightParams = parseBrowseParams(new URLSearchParams("duration=short&time=evening"));
assert.equal(
  firstNightParams.daypart,
  "evening",
  "first-night time alias should activate the evening daypart filter"
);
assert.equal(
  (firstNightParams as ActivityFilters & { duration?: string }).duration,
  "short",
  "first-night SEO deep links should activate the short-duration filter"
);

const firstNightFiltered = applyBrowseFilters(
  [
    {
      ...baseOccurrence,
      id: "short-campfire",
      activitySlug: "campfire",
      title: "Campfire",
      category: "campfire",
      daypart: "evening",
      enrichment: { durationMinutes: 30 },
    },
    {
      ...baseOccurrence,
      id: "long-movie",
      activitySlug: "movies-under-the-stars",
      title: "Movies Under the Stars",
      category: "movies_under_stars",
      daypart: "evening",
      enrichment: { durationMinutes: 90 },
    },
    {
      ...baseOccurrence,
      id: "short-afternoon-arcade",
      activitySlug: "arcades",
      title: "Arcade",
      category: "arcades",
      daypart: "afternoon",
      enrichment: { durationMinutes: 20 },
    },
  ] as ActivityOccurrence[],
  firstNightParams
);
assert.deepEqual(
  firstNightFiltered.map((activity) => activity.id),
  ["short-campfire"],
  "first-night short evening filter should keep short evening activities only"
);

const nearMyResortParams = parseBrowseParams(new URLSearchParams("near=my-resort"));
assert.equal(
  (nearMyResortParams as ActivityFilters & { near?: string }).near,
  undefined,
  "bare near-my-resort links should not activate without a selected resort"
);

const nearWithoutResortFiltered = applyBrowseFilters(
  [
    {
      ...baseOccurrence,
      id: "poly-campfire-near-mode",
      activitySlug: "campfire",
      title: "Campfire",
      category: "campfire",
      resort: {
        slug: "polynesian-village-resort",
        name: "Polynesian Village Resort",
        tier: "Deluxe",
        area: "magic_kingdom",
      },
    },
    {
      ...baseOccurrence,
      id: "pop-arcade-near-mode",
      activitySlug: "arcades",
      title: "Arcade",
      category: "arcades",
      resort: {
        slug: "pop-century-resort",
        name: "Pop Century Resort",
        tier: "Value",
        area: "skyliner",
      },
    },
  ] as ActivityOccurrence[],
  nearMyResortParams
);
assert.deepEqual(
  nearWithoutResortFiltered.map((activity) => activity.id),
  ["poly-campfire-near-mode", "pop-arcade-near-mode"],
  "bare near-my-resort links should behave like unanchored browsing"
);

const nearSelectedResortFiltered = applyBrowseFilters(
  [
    {
      ...baseOccurrence,
      id: "poly-campfire-near-selected",
      activitySlug: "campfire",
      title: "Campfire",
      category: "campfire",
      resort: {
        slug: "polynesian-village-resort",
        name: "Polynesian Village Resort",
        tier: "Deluxe",
        area: "magic_kingdom",
      },
    },
    {
      ...baseOccurrence,
      id: "grand-floridian-arcade-near-selected",
      activitySlug: "arcades",
      title: "Arcade",
      category: "arcades",
      resort: {
        slug: "grand-floridian-resort-and-spa",
        name: "Grand Floridian Resort & Spa",
        tier: "Deluxe",
        area: "magic_kingdom",
      },
    },
    {
      ...baseOccurrence,
      id: "pop-arcade-near-selected",
      activitySlug: "arcades",
      title: "Arcade",
      category: "arcades",
      resort: {
        slug: "pop-century-resort",
        name: "Pop Century Resort",
        tier: "Value",
        area: "skyliner",
      },
    },
  ] as ActivityOccurrence[],
  { near: "my-resort", resort: "polynesian-village-resort" } as ActivityFilters & {
    near: string;
  }
);
assert.deepEqual(
  nearSelectedResortFiltered.map((activity) => activity.id),
  ["poly-campfire-near-selected", "grand-floridian-arcade-near-selected"],
  "near-my-resort with a selected resort should keep same-area first-night options"
);

assert.equal(
  isRecommendedSeoRoute(DEFAULT_ROUTE_SEO_FIT_BY_CLUSTER.monorail),
  true,
  "direct monorail routes can be recommended when access caveats are visible"
);
assert.equal(
  isRecommendedSeoRoute(
    DEFAULT_ROUTE_SEO_FIT_BY_CLUSTER["disney-springs-resort-transfer"]
  ),
  false,
  "Disney Springs should not be treated as a recommended free resort-transfer route"
);
assert.match(
  DEFAULT_ROUTE_SEO_FIT_BY_CLUSTER["disney-springs-resort-transfer"].caveat ?? "",
  /resort stay|dining\/experience reservation/i
);
assert.equal(
  isRecommendedSeoRoute(DEFAULT_ROUTE_SEO_FIT_BY_CLUSTER["bus-to-park-to-bus"]),
  false,
  "multi-transfer routes should not be default SEO-guide recommendations"
);

assert.ok(
  SEO_MISTAKE_LOG.every((mistake) => mistake.deepLink.startsWith("/")),
  "mistake evidence log should route users back into the product"
);
assert.ok(
  SEO_MISTAKE_LOG.some((mistake) =>
    mistake.mistake.toLowerCase().includes("disney springs")
  ),
  "mistake log should preserve the Disney Springs transfer warning"
);
for (const pageKey of [
  "rainy_day",
  "first_night",
  "resort_hopping",
  "no_ticket",
  "grandparents",
  "couples",
]) {
  assert.ok(
    SEO_MISTAKE_LOG.some((mistake) => mistake.appliesToPages.includes(pageKey)),
    `mistake evidence log should include ${pageKey} mistakes`
  );
}
for (const mistake of SEO_MISTAKE_LOG) {
  assert.ok(mistake.mistake.length >= 24, "mistake should be specific");
  assert.ok(mistake.fix.length >= 24, "mistake fix should be actionable");
  assert.ok(
    ["official_policy", "community_pattern", "editor_experience", "data_pattern"].includes(
      mistake.evidenceType
    ),
    "mistake should use a known evidence type"
  );
  assert.ok(
    ["low", "medium", "high"].includes(mistake.severity),
    "mistake should use a known severity"
  );
}

console.log("SEO fit taxonomy tests passed.");
