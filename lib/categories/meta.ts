export interface CategoryMeta {
  label: string;
  icon: string;
  stamp: string;
  mood?: string[];
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  poolside: { label: "Poolside", icon: "🏊", stamp: "pool", mood: ["pool_break", "little_kids"] },
  campfire: { label: "Campfire", icon: "🔥", stamp: "campfire", mood: ["tonight", "evening"] },
  movies_under_stars: { label: "Movies", icon: "🎬", stamp: "movie", mood: ["tonight", "evening"] },
  fitness_wellness: { label: "Wellness", icon: "🧘", stamp: "wellness", mood: ["free"] },
  arts_crafts: { label: "Crafts", icon: "🎨", stamp: "craft", mood: ["little_kids", "rainy"] },
  signature: { label: "Signature", icon: "✨", stamp: "signature", mood: ["worth_travel"] },
  resort_activity: { label: "Resort fun", icon: "🌴", stamp: "resort", mood: ["free"] },
  arcade: { label: "Games", icon: "🕹️", stamp: "games", mood: ["rainy", "pool_break"] },
  nighttime_entertainment: { label: "Evening", icon: "🌙", stamp: "evening", mood: ["tonight"] },
  scavenger_hunt: { label: "Scavenger hunt", icon: "🧭", stamp: "hunt", mood: ["little_kids"] },
  nature: { label: "Nature", icon: "🦋", stamp: "nature", mood: ["free"] },
  music: { label: "Music", icon: "🎵", stamp: "music", mood: ["evening"] },
  other: { label: "Activity", icon: "📋", stamp: "activity" },
};

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? CATEGORY_META.other;
}

export const MOOD_CHIPS = [
  { id: "tonight", label: "Tonight", href: "/tonight" },
  { id: "free", label: "Free", href: "/activities?free=true" },
  { id: "little_kids", label: "Little kids", href: "/activities?category=arts_crafts" },
  { id: "rainy", label: "Rainy day", href: "/activities?category=arts_crafts" },
  { id: "pool_break", label: "Pool break", href: "/activities?category=poolside" },
  { id: "evening", label: "After dinner", href: "/tonight" },
] as const;

export const HOME_FINDER_CHIPS = [
  { label: "Tonight", href: "/tonight", description: "Movies & campfires" },
  { label: "Free activities", href: "/activities?free=true", description: "No ticket needed" },
  { label: "Little kids", href: "/activities?category=arts_crafts", description: "Crafts & games" },
  { label: "Rain-friendly", href: "/activities?category=arcade", description: "Indoor options" },
  { label: "Explore resorts", href: "/resorts", description: "Pick your home base" },
  { label: "Rest day ideas", href: "/activities", description: "Low-stress planning" },
] as const;
