import type { WeatherLocationKey } from "@/lib/weather/types";

export function weatherAreaAnchorId(locationKey: WeatherLocationKey): string {
  return `weather-${locationKey}`;
}

export function weatherPageHref(locationKey?: WeatherLocationKey | null): string {
  return locationKey ? `/weather#${weatherAreaAnchorId(locationKey)}` : "/weather";
}
