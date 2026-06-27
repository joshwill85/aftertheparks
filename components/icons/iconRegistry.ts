import type { IconKey, IconRegistryEntry } from "./types";

export type { IconKey, IconRegistryEntry };

type SearchKind =
  | "activity"
  | "resort"
  | "guide"
  | "category"
  | "page"
  | "movie"
  | "offering";

export const ICON_REGISTRY: Record<IconKey, IconRegistryEntry> = {
  poolside: { label: "Poolside", tone: "lagoon" },
  campfire: { label: "Campfire", tone: "coral" },
  movies_under_stars: { label: "Movies", tone: "starlight" },
  fitness_wellness: { label: "Wellness", tone: "palm" },
  arts_crafts: { label: "Crafts", tone: "sunshine" },
  signature: { label: "Signature", tone: "lagoon" },
  resort_activity: { label: "Resort fun", tone: "palm" },
  arcade: { label: "Games", tone: "starlight" },
  rental: { label: "Rentals", tone: "lagoon" },
  sports_games: { label: "Sports and games", tone: "sunshine" },
  nighttime_entertainment: { label: "Evening", tone: "starlight" },
  scavenger_hunt: { label: "Scavenger hunt", tone: "palm" },
  nature: { label: "Nature", tone: "palm" },
  music: { label: "Music", tone: "coral" },
  other: { label: "Activity", tone: "neutral" },
  today_nav: { label: "Today", tone: "sunshine" },
  tonight_nav: { label: "Tonight", tone: "starlight" },
  explore_nav: { label: "Explore", tone: "lagoon" },
  plan_nav: { label: "Plan", tone: "neutral" },
  search_activity: { label: "Activity", tone: "lagoon" },
  search_resort: { label: "Resort", tone: "palm" },
  search_guide: { label: "Guide", tone: "neutral" },
  search_category: { label: "Category", tone: "sunshine" },
  search_page: { label: "Page", tone: "neutral" },
  search_movie: { label: "Movie", tone: "starlight" },
  search_offering: { label: "Official offering", tone: "lagoon" },
  nearby_resort: { label: "At this resort", tone: "palm" },
  nearby_area: { label: "Nearby resort area", tone: "lagoon" },
  worth_travel: { label: "Worth checking travel for", tone: "sunshine" },
  arrow_right: { label: "Next", tone: "neutral" },
  arrow_left: { label: "Previous", tone: "neutral" },
  chevron_down: { label: "Expand", tone: "neutral" },
  check_mark: { label: "Saved", tone: "palm" },
  close: { label: "Remove", tone: "neutral" },
};

export const BROWSE_DAY_TABS = [
  { href: "/today" as const, label: "Today", iconKey: "today_nav" as const },
  { href: "/tonight" as const, label: "Tonight", iconKey: "tonight_nav" as const },
  { href: "/activities" as const, label: "Explore", iconKey: "explore_nav" as const },
];

export const SEARCH_KIND_ICON_KEYS: Record<SearchKind, IconKey> = {
  activity: "search_activity",
  resort: "search_resort",
  guide: "search_guide",
  category: "search_category",
  page: "search_page",
  movie: "search_movie",
  offering: "search_offering",
};
