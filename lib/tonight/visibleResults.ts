import {
  occurrenceToDisplayInput,
  shouldHideActivity,
} from "@/lib/activityDisplay";
import { dedupeOccurrences } from "@/lib/api/publicActivities";
import type {
  ActivityOccurrence,
  MovieNightOccurrence,
} from "@/lib/types/occurrence";

function dedupeBySlot(activities: ActivityOccurrence[]): ActivityOccurrence[] {
  const seen = new Set<string>();
  return activities.filter((activity) => {
    const key = `${activity.activityCatalogId}:${activity.resort.slug}:${activity.startDateTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getVisibleTonightActivities(
  activities: ActivityOccurrence[]
): ActivityOccurrence[] {
  return dedupeBySlot(
    dedupeOccurrences(
      activities.filter(
        (activity) =>
          activity.category !== "movies_under_stars" &&
          !shouldHideActivity(occurrenceToDisplayInput(activity))
      )
    )
  );
}

export function getVisibleTonightResultCount({
  activities,
  movieNights,
}: {
  activities: ActivityOccurrence[];
  movieNights: MovieNightOccurrence[];
}): number {
  return getVisibleTonightActivities(activities).length + movieNights.length;
}
