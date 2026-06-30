import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  addDays,
  addHours,
  getHours,
  getMinutes,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
} from "date-fns";
import type { Daypart } from "@/lib/types/occurrence";

export type { Daypart };

export const TIMEZONE = "America/New_York";
export const EVENING_THRESHOLD_HOUR = 17;
export const LATE_THRESHOLD_HOUR = 21;

/** Current instant — use for all range comparisons. */
export function nowInstant(): Date {
  return new Date();
}

/** Wall-clock components in Orlando (for display / daypart only). */
export function getNowInOrlando(): Date {
  return toZonedTime(nowInstant(), TIMEZONE);
}

export function orlandoDateString(date: Date = nowInstant()): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

export function getDaypart(date: Date = getNowInOrlando(), force?: Daypart): Daypart {
  if (force) return force;
  const hour = getHours(date);
  if (hour < 11) return "morning";
  if (hour < EVENING_THRESHOLD_HOUR) return "afternoon";
  if (hour < LATE_THRESHOLD_HOUR) return "evening";
  return "late";
}

export function daypartFromHour(hour: number): Daypart {
  if (hour < 11) return "morning";
  if (hour < EVENING_THRESHOLD_HOUR) return "afternoon";
  if (hour < LATE_THRESHOLD_HOUR) return "evening";
  return "late";
}

export function isAllDayOpenWindow(startHour: number, endHour?: number): boolean {
  if (endHour == null || Number.isNaN(startHour) || Number.isNaN(endHour)) {
    return false;
  }

  const durationHours =
    endHour >= startHour ? endHour - startHour : endHour + 24 - startHour;
  return startHour <= 9 && endHour >= 20 && durationHours >= 10;
}

export function daypartFromTimeRange(
  startHour: number,
  endHour?: number
): Daypart {
  if (isAllDayOpenWindow(startHour, endHour)) return "anytime";
  return daypartFromHour(startHour);
}

export function formatOrlandoTime(iso: string): string {
  return formatInTimeZone(parseISO(iso), TIMEZONE, "h:mm a");
}

export function formatOrlandoDate(iso: string): string {
  return formatInTimeZone(parseISO(iso), TIMEZONE, "EEEE, MMM d");
}

export function isWithinRange(now: Date, start: Date, end?: Date): boolean {
  if (isBefore(now, start)) return false;
  const effectiveEnd = end ?? addHours(start, 1);
  return isBefore(now, effectiveEnd) || isEqual(now, effectiveEnd);
}

/** Parse a wall-clock time on a specific Orlando calendar date → UTC instant. */
export function parseTimeOnDate(timeStr: string, dateOrStr: Date | string): Date {
  const dateStr =
    typeof dateOrStr === "string" ? dateOrStr : orlandoDateString(dateOrStr);
  const parts = timeStr.split(":");
  const h = parts[0]?.padStart(2, "0") ?? "00";
  const m = parts[1]?.padStart(2, "0") ?? "00";
  const s = parts[2]?.padStart(2, "0") ?? "00";
  return fromZonedTime(`${dateStr}T${h}:${m}:${s}`, TIMEZONE);
}

export function endOfOrlandoDay(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T23:59:59`, TIMEZONE);
}

export function toIsoInOrlando(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

export function getDayOfWeekIndex(dateStr: string): number {
  return fromZonedTime(`${dateStr}T12:00:00`, TIMEZONE).getUTCDay();
}

export function orlandoDayStart(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T00:00:00`, TIMEZONE);
}

export function addOrlandoDays(dateStr: string, days: number): string {
  const noon = fromZonedTime(`${dateStr}T12:00:00`, TIMEZONE);
  return orlandoDateString(addDays(noon, days));
}

export function isTonightWindow(date: Date = getNowInOrlando()): boolean {
  const hour = getHours(date);
  return hour >= EVENING_THRESHOLD_HOUR;
}

export function getTonightStart(date: Date = getNowInOrlando()): Date {
  const d = toZonedTime(date, TIMEZONE);
  d.setHours(EVENING_THRESHOLD_HOUR, 0, 0, 0);
  if (getHours(date) < EVENING_THRESHOLD_HOUR) return d;
  return date;
}

export function getEndOfDay(date: Date = getNowInOrlando()): Date {
  const d = toZonedTime(date, TIMEZONE);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function minutesSinceMidnight(date: Date): number {
  return getHours(date) * 60 + getMinutes(date);
}

export function isSameOrlandoDay(iso: string, dateStr: string): boolean {
  return formatInTimeZone(parseISO(iso), TIMEZONE, "yyyy-MM-dd") === dateStr;
}

export function hourInOrlando(date: Date): number {
  return Number(formatInTimeZone(date, TIMEZONE, "H"));
}
