import { computeDisplayQuality } from "@/lib/displayQuality";
import { occurrenceToDisplayInput } from "@/lib/activityDisplay";
import type { ActivityOccurrence, ActivitySortKey } from "@/lib/types/occurrence";

export type { ActivitySortKey };

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
          new Date(a.startDateTime).getTime() -
            new Date(b.startDateTime).getTime()
      );
    case "category":
      return copy.sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          new Date(a.startDateTime).getTime() -
            new Date(b.startDateTime).getTime()
      );
    case "free":
      return copy.sort((a, b) => {
        const aFree = a.price.state === "free" ? 0 : 1;
        const bFree = b.price.state === "free" ? 0 : 1;
        if (aFree !== bFree) return aFree - bFree;
        return (
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime()
        );
      });
    case "quality":
      return copy.sort((a, b) => {
        const qa = computeDisplayQuality(occurrenceToDisplayInput(a)).score;
        const qb = computeDisplayQuality(occurrenceToDisplayInput(b)).score;
        if (qb !== qa) return qb - qa;
        return (
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime()
        );
      });
    case "time":
    default:
      return copy.sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime()
      );
  }
}
