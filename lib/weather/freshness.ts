import { getWeatherLocation } from "@/lib/weather/locations";
import type { ForecastConfidence, WeatherForTimeSpan, WeatherLocationKey } from "@/lib/weather/types";

const CONFIDENCE_LABELS: Record<ForecastConfidence, string> = {
  current_conditions: "Current conditions",
  near_term_hourly: "Hourly forecast",
  official_7_day: "Official forecast",
  long_range_planning: "Planning outlook",
  not_available_yet: "Forecast pending",
};

function ageLabel(fetchedAt: string, now = new Date()): string {
  const fetched = new Date(fetchedAt).getTime();
  if (!Number.isFinite(fetched)) return "Updated recently";
  const seconds = Math.max(0, Math.floor((now.getTime() - fetched) / 1000));
  if (seconds < 60) return "Updated just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  return `Updated ${new Date(fetchedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

export function weatherLocationLabel(locationKey: WeatherLocationKey): string {
  return getWeatherLocation(locationKey).name;
}

export function weatherConfidenceLabel(weather: Pick<WeatherForTimeSpan, "forecastConfidence" | "forecastStatus">): string {
  if (weather.forecastStatus === "not_available_yet") return "Forecast pending";
  if (weather.forecastStatus === "unavailable") return "Forecast unavailable";
  if (weather.forecastStatus === "stale") return "Stale forecast";
  return weather.forecastConfidence
    ? CONFIDENCE_LABELS[weather.forecastConfidence]
    : "Forecast guidance";
}

export function formatWeatherFreshness(
  weather: Pick<WeatherForTimeSpan, "fetchedAt" | "forecastStatus" | "forecastConfidence" | "locationKey">,
  now = new Date()
): string {
  return [
    ageLabel(weather.fetchedAt, now),
    weatherConfidenceLabel(weather),
    weatherLocationLabel(weather.locationKey),
  ].join(" · ");
}
