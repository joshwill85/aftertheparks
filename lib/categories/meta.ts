import type { IconKey } from "@/components/icons/iconRegistry";

export interface CategoryMeta {
  label: string;
  iconKey: IconKey;
  stamp: string;
  mood?: string[];
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  poolside: { label: "Poolside", iconKey: "poolside", stamp: "pool", mood: ["pool_break", "little_kids"] },
  campfire: { label: "Campfire", iconKey: "campfire", stamp: "campfire", mood: ["tonight", "evening"] },
  movies_under_stars: { label: "Movies", iconKey: "movies_under_stars", stamp: "movie", mood: ["tonight", "evening"] },
  fitness_wellness: { label: "Wellness", iconKey: "fitness_wellness", stamp: "wellness" },
  arts_crafts: { label: "Crafts", iconKey: "arts_crafts", stamp: "craft", mood: ["little_kids", "quiet"] },
  signature: { label: "Signature", iconKey: "signature", stamp: "signature", mood: ["worth_travel"] },
  resort_activity: { label: "Resort fun", iconKey: "resort_activity", stamp: "resort" },
  arcade: { label: "Games", iconKey: "arcade", stamp: "games", mood: ["easy_break", "pool_break"] },
  rental: { label: "Rentals", iconKey: "rental", stamp: "rental", mood: ["pool_break"] },
  sports_games: { label: "Sports & games", iconKey: "sports_games", stamp: "sports" },
  nighttime_entertainment: { label: "Evening", iconKey: "nighttime_entertainment", stamp: "evening", mood: ["tonight"] },
  scavenger_hunt: { label: "Scavenger hunt", iconKey: "scavenger_hunt", stamp: "hunt", mood: ["little_kids"] },
  nature: { label: "Nature", iconKey: "nature", stamp: "nature" },
  music: { label: "Music", iconKey: "music", stamp: "music", mood: ["evening"] },
  other: { label: "Activity", iconKey: "other", stamp: "activity" },
};

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? CATEGORY_META.other;
}

export const MOOD_CHIPS = [
  { id: "tonight", label: "Tonight", href: "/tonight" },
  { id: "little_kids", label: "Little kids", href: "/activities?category=arts_crafts" },
  { id: "easy_break", label: "Easy break", href: "/activities?category=arcade" },
  { id: "pool_break", label: "Pool break", href: "/activities?category=poolside" },
  { id: "after_7_pm", label: "After 7 PM", href: "/tonight?preset=after_7_pm" },
] as const;

export const HOME_FINDER_CHIPS = [
  { label: "Tonight", href: "/tonight", description: "Movies & campfires" },
  { label: "Resort activities", href: "/activities", description: "Browse the calendar" },
  { label: "Little kids", href: "/activities?category=arts_crafts", description: "Crafts & games" },
  { label: "Games", href: "/activities?category=arcade", description: "Arcades & easy breaks" },
  { label: "Explore resorts", href: "/resorts", description: "Pick your home base" },
  { label: "Rest day ideas", href: "/activities", description: "Low-stress planning" },
] as const;
