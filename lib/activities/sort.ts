import { computeDisplayQuality } from "@/lib/displayQuality";
import { occurrenceToDisplayInput } from "@/lib/activityDisplay";
import type { ActivityOccurrence, ActivitySortKey } from "@/lib/types/occurrence";

export type { ActivitySortKey };

function activityTimeValue(activity: ActivityOccurrence): number {
  if (!activity.startDateTime) return Number.POSITIVE_INFINITY;
  return new Date(activity.startDateTime).getTime();
}

export function sortActivities(
  activities: ActivityOccurrence[],
  sort: ActivitySortKey = "time"
): ActivityOccurrence[] {
  const copy = [...activities];

  switch (sort) {
    case "resort":
      return copy.sort(
        (a, b) =>
          a.resort.name.localeCompare(b.resort.name) ||
          activityTimeValue(a) - activityTimeValue(b)
      );
    case "category":
      return copy.sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          activityTimeValue(a) - activityTimeValue(b)
      );
    case "quality":
      return copy.sort((a, b) => {
        const qa = computeDisplayQuality(occurrenceToDisplayInput(a)).score;
        const qb = computeDisplayQuality(occurrenceToDisplayInput(b)).score;
        if (qb !== qa) return qb - qa;
        return activityTimeValue(a) - activityTimeValue(b);
      });
    case "time":
    default:
      return copy.sort((a, b) => activityTimeValue(a) - activityTimeValue(b));
  }
}
