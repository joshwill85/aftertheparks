import { addDays, addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { TIMEZONE, nowInstant, orlandoDateString } from "@/lib/daypart";

export const DEFAULT_MOVIE_DURATION_MINUTES = 120;

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function parseMovieShowTimeMinutes(
  time: string | null | undefined
): number | undefined {
  const text = time?.trim();
  if (!text) return undefined;

  const amPm = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (amPm) {
    let hour = Number.parseInt(amPm[1], 10);
    const minute = Number.parseInt(amPm[2] ?? "0", 10);
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return undefined;
    const period = amPm[3].toUpperCase();
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  const twentyFourHour = text.match(/^(\d{1,2})(?::(\d{2}))(?::(\d{2}))?$/);
  if (!twentyFourHour) return undefined;
  let hour = Number.parseInt(twentyFourHour[1], 10);
  const minute = Number.parseInt(twentyFourHour[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;

  // Legacy ingest stored "8:30PM" as 08:30; movie listings are evening events.
  if (hour >= 1 && hour < 12) hour += 12;
  return hour * 60 + minute;
}

/**
 * Format movie show times for display.
 * DB stores 24-hour time (e.g. 20:30:00 for 8:30 PM), while source-backed
 * ingest may store compact AM/PM time (e.g. 8:30PM).
 */
export function formatMovieShowTime(time: string | null | undefined): string {
  const minutes = parseMovieShowTimeMinutes(time);
  if (minutes == null) return "Evening";
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatMovieDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function formatMovieDuration(minutes: number | null | undefined): string | undefined {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return undefined;
  const wholeMinutes = Math.round(minutes);
  const hours = Math.floor(wholeMinutes / 60);
  const remainder = wholeMinutes % 60;
  if (hours === 0) return `${remainder} min`;
  const hourLabel = `${hours} ${hours === 1 ? "hr" : "hr"}`;
  return remainder > 0 ? `${hourLabel} ${remainder} min` : hourLabel;
}

function nextDateForMovieDay(dayOfWeek: string, now: Date): string | undefined {
  const target = WEEKDAY_INDEX[dayOfWeek.toLowerCase()];
  if (target == null) return undefined;

  const today = orlandoDateString(now);
  const todayIndex =
    WEEKDAY_INDEX[
      formatInTimeZone(
        fromZonedTime(`${today}T12:00:00`, TIMEZONE),
        TIMEZONE,
        "EEEE"
      ).toLowerCase()
    ];
  if (todayIndex == null) return undefined;
  const daysUntil = (target - todayIndex + 7) % 7;
  return orlandoDateString(addDays(fromZonedTime(`${today}T12:00:00`, TIMEZONE), daysUntil));
}

export function movieStartsAt(input: {
  dayOfWeek: string;
  showTime: string | null | undefined;
  now?: Date;
}): Date | undefined {
  const minutes = parseMovieShowTimeMinutes(input.showTime);
  const date = nextDateForMovieDay(input.dayOfWeek, input.now ?? nowInstant());
  if (minutes == null || !date) return undefined;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return fromZonedTime(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
    TIMEZONE
  );
}

export function movieEndsAt(
  startDateTime: string | Date | null | undefined,
  runtimeMinutes?: number | null
): Date | undefined {
  if (!startDateTime) return undefined;
  const start =
    startDateTime instanceof Date ? startDateTime : new Date(startDateTime);
  if (Number.isNaN(start.getTime())) return undefined;
  const duration =
    runtimeMinutes && Number.isFinite(runtimeMinutes) && runtimeMinutes > 0
      ? runtimeMinutes
      : DEFAULT_MOVIE_DURATION_MINUTES;
  return addMinutes(start, duration);
}
