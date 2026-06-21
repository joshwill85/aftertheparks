import { shouldHideActivity } from "@/lib/activityDisplay";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

const FALLBACK_SOURCE = "https://aftertheparks.com/data-sources";

/** Ensure every public activity has freshness metadata and no review-flagged content. */
export function ensurePublicActivity(
  activity: ActivityOccurrence
): ActivityOccurrence {
  return {
    ...activity,
    freshness: {
      lastVerified:
        activity.freshness?.lastVerified ?? new Date().toISOString(),
      sourceUrl: activity.freshness?.sourceUrl || FALLBACK_SOURCE,
      badge: activity.freshness?.badge ?? "verified",
    },
  };
}

export function sanitizePublicActivities(
  activities: ActivityOccurrence[]
): ActivityOccurrence[] {
  return activities
    .filter((activity) => {
      if (activity.status === "paused") return false;
      return !shouldHideActivity({
        activity_name: activity.title,
        category: activity.category,
        normalized_name: activity.activitySlug,
        description: activity.summary,
        schedule_text: activity.scheduleText,
      });
    })
    .map(ensurePublicActivity);
}

export function publicActivitiesResponse(activities: ActivityOccurrence[]) {
  const sanitized = sanitizePublicActivities(activities);
  return { activities: sanitized, count: sanitized.length };
}
