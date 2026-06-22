import { computeDisplayQuality } from "@/lib/displayQuality";
import { occurrenceToDisplayInput } from "@/lib/activityDisplay";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

export type NearbyTier = "at_resort" | "one_ride" | "worth_travel" | "skip";

export const NEARBY_TIER_META: Record<
  Exclude<NearbyTier, "skip">,
  { label: string; description: string; icon: string }
> = {
  at_resort: {
    label: "At this resort",
    description: "Listed for this resort; confirm the exact meeting spot.",
    icon: "🏨",
  },
  one_ride: {
    label: "Nearby resort area",
    description: "Same resort area; check the best route before heading over.",
    icon: "🚐",
  },
  worth_travel: {
    label: "Worth checking travel for",
    description: "A standout moment if timing and transportation work.",
    icon: "✨",
  },
};

const WORTH_TRAVEL_CATEGORIES = new Set([
  "signature",
  "movies_under_stars",
  "campfire",
  "nighttime_entertainment",
  "music",
]);

export function classifyNearbyTier(
  activity: ActivityOccurrence,
  homeResort?: { slug: string; area: string }
): NearbyTier {
  const quality = computeDisplayQuality(occurrenceToDisplayInput(activity));
  if (quality.tier === "hide" || quality.tier === "low") return "skip";

  if (!homeResort) {
    return WORTH_TRAVEL_CATEGORIES.has(activity.category)
      ? "worth_travel"
      : "at_resort";
  }

  if (activity.resort.slug === homeResort.slug) return "at_resort";
  if (activity.resort.area === homeResort.area) return "one_ride";

  if (WORTH_TRAVEL_CATEGORIES.has(activity.category)) return "worth_travel";

  return "one_ride";
}

export function groupByNearbyTier(
  activities: ActivityOccurrence[],
  homeResort?: { slug: string; area: string }
): Map<Exclude<NearbyTier, "skip">, ActivityOccurrence[]> {
  const groups = new Map<Exclude<NearbyTier, "skip">, ActivityOccurrence[]>([
    ["at_resort", []],
    ["one_ride", []],
    ["worth_travel", []],
  ]);

  for (const activity of activities) {
    const tier = classifyNearbyTier(activity, homeResort);
    if (tier === "skip") continue;
    groups.get(tier)!.push(activity);
  }

  return groups;
}
