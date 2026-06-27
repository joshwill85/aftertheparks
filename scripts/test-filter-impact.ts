import {
  buildActiveFilterChips,
  buildFilterImpact,
  buildNoResultsRecovery,
  type FilterableItem,
} from "@/lib/explore/filterImpact";
import type { ActivityFilters } from "@/lib/types/occurrence";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const resorts = [
  { slug: "poly", name: "Polynesian Village" },
  { slug: "akl", name: "Animal Kingdom Lodge" },
];

const items: FilterableItem[] = [
  {
    id: "campfire-poly",
    resortSlug: "poly",
    category: "campfire",
    daypart: "evening",
    free: true,
    reservation: false,
    title: "Campfire",
  },
  {
    id: "movie-poly",
    resortSlug: "poly",
    category: "movies_under_stars",
    daypart: "late",
    free: true,
    reservation: false,
    title: "Movie",
  },
  {
    id: "craft-akl",
    resortSlug: "akl",
    category: "arts_crafts",
    daypart: "afternoon",
    free: false,
    reservation: true,
    title: "Craft",
  },
];

const filters: ActivityFilters = {
  resort: "poly",
  category: "campfire",
  free: true,
  q: "smores",
};

const chips = buildActiveFilterChips(filters, resorts, "/activities");
assert(chips.length === 4, `Expected 4 chips, got ${chips.length}`);
assert(chips.some((chip) => chip.label === "Polynesian Village"), "Missing resort chip");
assert(chips.some((chip) => chip.label === "Campfire"), "Missing category chip");
assert(chips.some((chip) => chip.label === "Free only"), "Missing free chip");
assert(chips.some((chip) => chip.label === "Search: smores"), "Missing query chip");
assert(
  chips.find((chip) => chip.id === "category")?.removeHref ===
    "/activities?resort=poly&free=true&q=smores",
  "Category chip should remove only category"
);

const impact = buildFilterImpact(items, { resort: "poly" }, resorts);
assert(impact.total === 2, `Expected current total 2, got ${impact.total}`);
assert(
  impact.categories.find((option) => option.value === "campfire")?.count === 1,
  "Campfire count should be predictive under current resort"
);
assert(
  impact.dayparts.find((option) => option.value === "late")?.count === 1,
  "Late count should include matching movie"
);
assert(
  impact.practical.free === 2,
  `Expected two free results under current resort, got ${impact.practical.free}`
);

const recovery = buildNoResultsRecovery(filters, resorts, "/activities");
assert(recovery.length >= 3, "No-results recovery should provide at least 3 actions");
assert(recovery[0].href.includes("category") === false, "First recovery should remove category");
assert(recovery.some((action) => action.label === "Clear all filters"), "Missing clear action");

console.log("Filter impact coverage passed.");
