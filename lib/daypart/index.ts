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
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "late";
}

export function daypartFromHour(hour: number): Daypart {
  if (hour < 11) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "late";
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
  return hour >= 17;
}

export function getTonightStart(date: Date = getNowInOrlando()): Date {
  const d = toZonedTime(date, TIMEZONE);
  d.setHours(17, 0, 0, 0);
  if (getHours(date) < 17) return d;
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
