import { computeDisplayQuality } from "@/lib/displayQuality";
import { occurrenceToDisplayInput } from "@/lib/activityDisplay";
import type { ActivityOccurrence, ActivitySortKey } from "@/lib/types/occurrence";

export type { ActivitySortKey };

function activityTimeValue(activity: ActivityOccurrence): number {
  if (!activity.startDateTime) return Number.POSITIVE_INFINITY;
  return new Date(activity.startDateTime).getTime();
}

function priceRank(activity: ActivityOccurrence): number {
  if (activity.price.state === "free") return 0;
  if (activity.price.state === "fee") return 1;
  return 2;
}

export function sortActivities(
  activities: ActivityOccurrence[],
  sort: ActivitySortKey = "time"
): ActivityOccurrence[] {
  const copy = [...activities];

  switch (sort) {
    case "alpha":
      return copy.sort(
        (a, b) =>
          a.title.localeCompare(b.title) ||
          a.resort.name.localeCompare(b.resort.name) ||
          activityTimeValue(a) - activityTimeValue(b)
      );
    case "free":
      return copy.sort(
        (a, b) =>
          priceRank(a) - priceRank(b) ||
          activityTimeValue(a) - activityTimeValue(b) ||
          a.title.localeCompare(b.title)
      );
    case "paid":
      return copy.sort((a, b) => {
        const aPaidRank = a.price.state === "fee" ? 0 : a.price.state === "free" ? 1 : 2;
        const bPaidRank = b.price.state === "fee" ? 0 : b.price.state === "free" ? 1 : 2;
        return (
          aPaidRank - bPaidRank ||
          activityTimeValue(a) - activityTimeValue(b) ||
          a.title.localeCompare(b.title)
        );
      });
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
