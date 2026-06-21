import { formatInTimeZone } from "date-fns-tz";
import { parseISO } from "date-fns";
import {
  TIMEZONE,
  addOrlandoDays,
  formatOrlandoDate,
  isSameOrlandoDay,
  nowInstant,
  orlandoDateString,
} from "@/lib/daypart";

export interface EventDayDisplay {
  label: string;
  /** Calendar day for semantic `<time dateTime>` (yyyy-MM-dd). */
  dateTime?: string;
}

const DAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function shortWeekdayFromName(day: string): string {
  const key = day.toLowerCase();
  return DAY_SHORT[key] ?? day.slice(0, 3);
}

/** Activity cards — anchored to a calendar occurrence. */
export function formatActivityEventDay(
  startDateTime: string,
  options: { includeDate?: boolean } = {}
): EventDayDisplay {
  const { includeDate = false } = options;
  const today = orlandoDateString(nowInstant());
  const tomorrow = addOrlandoDays(today, 1);
  const isoDate = formatInTimeZone(
    parseISO(startDateTime),
    TIMEZONE,
    "yyyy-MM-dd"
  );

  if (isSameOrlandoDay(startDateTime, today)) {
    return { label: "Today", dateTime: isoDate };
  }
  if (isoDate === tomorrow) {
    return { label: "Tomorrow", dateTime: isoDate };
  }

  if (includeDate) {
    return {
      label: formatOrlandoDate(startDateTime),
      dateTime: isoDate,
    };
  }

  const dayShort = formatInTimeZone(parseISO(startDateTime), TIMEZONE, "EEE");
  return { label: dayShort, dateTime: isoDate };
}

/** Movie cards — weekly repeating schedule (day name only, no calendar date). */
export function formatMovieEventDay(movie: {
  dayOfWeek: string;
  isTonight?: boolean;
}): EventDayDisplay {
  if (movie.isTonight) {
    return {
      label: "Tonight",
      dateTime: orlandoDateString(nowInstant()),
    };
  }

  return { label: shortWeekdayFromName(movie.dayOfWeek) };
}
