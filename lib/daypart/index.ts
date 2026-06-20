import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { getHours, getMinutes, isAfter, isBefore, isEqual, parseISO } from "date-fns";
import type { Daypart } from "@/lib/types/occurrence";

export type { Daypart };

export const TIMEZONE = "America/New_York";

export function getNowInOrlando(): Date {
  return toZonedTime(new Date(), TIMEZONE);
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
  if (!end) return true;
  return isBefore(now, end) || isEqual(now, end);
}

export function parseTimeOnDate(timeStr: string, date: Date): Date {
  const [h, m, s] = timeStr.split(":").map(Number);
  const zoned = toZonedTime(date, TIMEZONE);
  zoned.setHours(h, m ?? 0, s ?? 0, 0);
  return zoned;
}

export function toIsoInOrlando(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

export function getDayOfWeekIndex(date: Date): number {
  return toZonedTime(date, TIMEZONE).getDay();
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
