import { addMinutes, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const WEATHER_TIMEZONE = "America/New_York" as const;

export function parseWeatherApiLocalDateTime(
  value: string,
  timezone: typeof WEATHER_TIMEZONE = WEATHER_TIMEZONE
): Date {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  return fromZonedTime(normalized, timezone);
}

export function parseNwsIsoDateTime(value: string): Date {
  return parseISO(value);
}

export function toWeatherLocationTime(
  date: Date,
  timezone: typeof WEATHER_TIMEZONE = WEATHER_TIMEZONE
): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

export function defaultWeatherEndTime(startsAt: Date): Date {
  return addMinutes(startsAt, 60);
}
