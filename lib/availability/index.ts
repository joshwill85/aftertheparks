import { addHours, isAfter, isBefore, isEqual } from "date-fns";
import {
  endOfOrlandoDay,
  isSameOrlandoDay,
  isWithinRange,
  nowInstant,
  orlandoDateString,
  parseTimeOnDate,
} from "@/lib/daypart";
import {
  getDisplayTime,
  occurrenceToDisplayInput,
} from "@/lib/activityDisplay";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

export type ActivityAvailabilityState =
  | "happening_now"
  | "later_today"
  | "tonight"
  | "upcoming_this_week"
  | "expired"
  | "uncertain_time";

export interface ActivityAvailability {
  state: ActivityAvailabilityState;
  uncertainTime: boolean;
}

function isEveningCategory(category: string): boolean {
  return (
    category === "movies_under_stars" ||
    category === "campfire" ||
    category === "nighttime_entertainment"
  );
}

function isUncertainTime(activity: ActivityOccurrence): boolean {
  const time = getDisplayTime(occurrenceToDisplayInput(activity));
  return time.uncertain;
}

/** Single source of truth for when an activity is available. */
export function getActivityAvailability(
  activity: ActivityOccurrence,
  now: Date = nowInstant(),
  selectedDate?: string
): ActivityAvailability {
  const dateStr = selectedDate ?? orlandoDateString(now);
  const uncertainTime = isUncertainTime(activity);

  if (!isSameOrlandoDay(activity.startDateTime, dateStr)) {
    const start = new Date(activity.startDateTime);
    if (isBefore(start, now)) {
      return { state: "expired", uncertainTime };
    }
    return { state: "upcoming_this_week", uncertainTime };
  }

  const start = new Date(activity.startDateTime);
  const end = activity.endDateTime
    ? new Date(activity.endDateTime)
    : addHours(start, 2);

  if (uncertainTime) {
    return { state: "uncertain_time", uncertainTime: true };
  }

  if (isBefore(end, now) && !isEqual(end, now)) {
    return { state: "expired", uncertainTime };
  }

  const tonightStart = parseTimeOnDate("17:00:00", dateStr);
  const dayEnd = endOfOrlandoDay(dateStr);
  const isEvening =
    activity.daypart === "evening" ||
    activity.daypart === "late" ||
    isEveningCategory(activity.category);

  if (
    isEvening &&
    !isBefore(start, tonightStart) &&
    !isAfter(start, dayEnd)
  ) {
    if (!uncertainTime && isWithinRange(now, start, end)) {
      return { state: "happening_now", uncertainTime: false };
    }
    if (!isBefore(start, now)) {
      return { state: "tonight", uncertainTime };
    }
  }

  if (!uncertainTime && isWithinRange(now, start, end)) {
    return { state: "happening_now", uncertainTime: false };
  }

  if (!isBefore(start, now)) {
    return { state: "later_today", uncertainTime };
  }

  return { state: "uncertain_time", uncertainTime: true };
}

export function filterByAvailability(
  activities: ActivityOccurrence[],
  states: ActivityAvailabilityState[],
  now: Date = nowInstant(),
  selectedDate?: string
): ActivityOccurrence[] {
  return activities.filter((activity) => {
    const { state } = getActivityAvailability(activity, now, selectedDate);
    return states.includes(state);
  });
}

export function annotateHappeningNow(
  activities: ActivityOccurrence[],
  now: Date = nowInstant()
): ActivityOccurrence[] {
  return activities.map((activity) => {
    const { state, uncertainTime } = getActivityAvailability(activity, now);
    return {
      ...activity,
      isHappeningNow: state === "happening_now" && !uncertainTime,
    };
  });
}
