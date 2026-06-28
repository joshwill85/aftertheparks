import { computeDisplayQuality } from "@/lib/displayQuality";
import { occurrenceToDisplayInput } from "@/lib/activityDisplay";
import { nowInstant } from "@/lib/daypart";
import type { ActivityOccurrence, ActivitySortKey } from "@/lib/types/occurrence";

export type { ActivitySortKey };

function activityTimeValue(activity: ActivityOccurrence): number {
  if (!activity.startDateTime) return Number.POSITIVE_INFINITY;
  return new Date(activity.startDateTime).getTime();
}

function validTimeValue(value?: string): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function happeningSoonRank(activity: ActivityOccurrence, now: Date) {
  const start = validTimeValue(activity.startDateTime);
  if (start == null) {
    return { bucket: 4, value: Number.POSITIVE_INFINITY };
  }

  const nowTime = now.getTime();
  if (start >= nowTime) return { bucket: 0, value: start };

  const explicitEnd = validTimeValue(activity.endDateTime);
  const effectiveEnd = explicitEnd ?? start + 60 * 60 * 1000;
  if (effectiveEnd >= nowTime) return { bucket: 1, value: effectiveEnd };

  return { bucket: 2, value: nowTime - effectiveEnd };
}

function compareHappeningSoon(
  a: ActivityOccurrence,
  b: ActivityOccurrence,
  now: Date
): number {
  const rankA = happeningSoonRank(a, now);
  const rankB = happeningSoonRank(b, now);

  if (rankA.bucket === 4 && rankB.bucket === 4) return 0;

  return (
    rankA.bucket - rankB.bucket ||
    rankA.value - rankB.value ||
    activityTimeValue(a) - activityTimeValue(b) ||
    a.title.localeCompare(b.title)
  );
}

function priceRank(activity: ActivityOccurrence): number {
  if (activity.price.state === "free") return 0;
  if (activity.price.state === "fee") return 1;
  return 2;
}

export function sortActivities(
  activities: ActivityOccurrence[],
  sort: ActivitySortKey = "time",
  now: Date = nowInstant()
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
      return copy.sort((a, b) => compareHappeningSoon(a, b, now));
  }
}
