import { formatResortTier } from "@/lib/utils";

export const RESORT_AREA_LABELS: Record<string, string> = {
  magic_kingdom: "Magic Kingdom area",
  epcot: "EPCOT area",
  animal_kingdom: "Animal Kingdom area",
  disney_springs: "Disney Springs area",
  wide_world_of_sports: "ESPN Wide World of Sports area",
  unknown: "Walt Disney World",
};

export const TIER_TAGLINES: Record<string, string> = {
  value: "Value resort activity calendars and offerings",
  moderate: "Moderate resort activity calendars and offerings",
  deluxe: "Deluxe resort activity calendars and offerings",
  deluxe_villa: "Room to spread out on longer trips",
  campground: "Campground activity calendars and offerings",
};

export const TIER_ORDER = [
  "value",
  "moderate",
  "deluxe",
  "deluxe_villa",
  "campground",
] as const;

export function formatResortArea(area: string): string {
  return RESORT_AREA_LABELS[area] ?? area.replace(/_/g, " ");
}

export function getResortInitial(name: string): string {
  const cleaned = name.replace(/^Disney's\s+/i, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words[0].length <= 5) {
    return words
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  }
  return cleaned.charAt(0).toUpperCase();
}

export function getResortTagline(category: string): string {
  return TIER_TAGLINES[category] ?? "Resort activities, movies, and campfires";
}

export function getTierSortIndex(category: string): number {
  const index = TIER_ORDER.indexOf(category as (typeof TIER_ORDER)[number]);
  return index === -1 ? TIER_ORDER.length : index;
}

export function tierFilterLabel(category: string): string {
  return formatResortTier(category);
}
