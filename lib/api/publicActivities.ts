import {
  occurrenceToDisplayInput,
  shouldHideActivity,
} from "@/lib/activityDisplay";
import {
  computeDisplayQuality,
  meetsMinimumQuality,
  type DisplayQualityTier,
} from "@/lib/displayQuality";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

const FALLBACK_SOURCE = "https://aftertheparks.com/data-sources";

function toDisplayInput(activity: ActivityOccurrence) {
  return occurrenceToDisplayInput({
    ...activity,
    title: activity.title,
    activitySlug: activity.activitySlug,
    scheduleText: activity.scheduleText,
    summary: activity.summary,
    parse_confidence: undefined,
  });
}

/** Ensure every public activity has honest freshness metadata. */
export function ensurePublicActivity(
  activity: ActivityOccurrence
): ActivityOccurrence {
  const quality = computeDisplayQuality(toDisplayInput(activity));
  const badge =
    activity.freshness?.badge === "stale"
      ? "stale"
      : quality.tier === "high"
        ? "verified"
        : "stale";

  return {
    ...activity,
    freshness: {
      lastVerified: activity.freshness?.lastVerified ?? new Date().toISOString(),
      sourceUrl: activity.freshness?.sourceUrl || FALLBACK_SOURCE,
      badge,
    },
  };
}

export function sanitizePublicActivities(
  activities: ActivityOccurrence[],
  options: { minTier?: DisplayQualityTier } = {}
): ActivityOccurrence[] {
  const minTier = options.minTier ?? "low";

  return activities
    .filter((activity) => {
      if (activity.status === "paused") return false;
      const input = toDisplayInput(activity);
      if (shouldHideActivity(input)) return false;
      return meetsMinimumQuality(input, minTier);
    })
    .map(ensurePublicActivity);
}

export function publicActivitiesResponse(
  activities: ActivityOccurrence[],
  options: { minTier?: DisplayQualityTier } = {}
) {
  const sanitized = sanitizePublicActivities(activities, options);
  return {
    activities: sanitized,
    count: sanitized.length,
    meta: {
      verified: sanitized.filter((a) => a.freshness.badge === "verified").length,
      stale: sanitized.filter((a) => a.freshness.badge === "stale").length,
    },
  };
}

export function dedupeOccurrences(
  activities: ActivityOccurrence[]
): ActivityOccurrence[] {
  const seen = new Map<string, ActivityOccurrence>();
  for (const activity of activities) {
    if (!seen.has(activity.id)) {
      seen.set(activity.id, activity);
    }
  }
  return Array.from(seen.values());
}
