import "server-only";

import { DEFAULT_WEATHER_RISK } from "@/lib/weather/types";
import { trackWeatherEvent } from "@/lib/weather/analytics";
import type {
  WeatherDay,
  WeatherLocation,
  WeatherLocationKey,
  WeatherSnapshot,
} from "@/lib/weather/types";
import { mapVisualCrossingIconToWeatherIcon } from "@/lib/weather/visualCrossingIconMap";

function fToC(tempF?: number): number | undefined {
  return tempF == null ? undefined : Math.round(((tempF - 32) * 5) / 9);
}

function mphToKph(mph?: number): number | undefined {
  return mph == null ? undefined : Math.round(mph * 1.60934);
}

export function normalizeVisualCrossingForecast(input: {
  locationKey: WeatherLocationKey;
  payload: any;
  fetchedAt: string;
}): {
  locationKey: WeatherLocationKey;
  fetchedAt: string;
  days: Array<
    WeatherDay & {
      tempF?: number;
      tempC?: number;
      feelsLikeF?: number;
      feelsLikeC?: number;
      precipProbabilityPct?: number;
      windMph?: number;
      windKph?: number;
    }
  >;
  attributionRequired: boolean;
} {
  return {
    locationKey: input.locationKey,
    fetchedAt: input.fetchedAt,
    attributionRequired: true,
    days: (input.payload.days ?? []).map((day: any) => ({
      source: "visual_crossing",
      date: day.datetime,
      conditionText: day.conditions ?? "Long-range outlook",
      iconKey: mapVisualCrossingIconToWeatherIcon(day.icon),
      tempF: day.temp,
      tempC: fToC(day.temp),
      feelsLikeF: day.feelslike,
      feelsLikeC: fToC(day.feelslike),
      precipProbabilityPct: day.precipprob,
      windMph: day.windspeed,
      windKph: mphToKph(day.windspeed),
      avgTempF: day.temp,
      avgTempC: fToC(day.temp),
      chanceOfRainPct: day.precipprob,
      maxWindMph: day.windspeed,
      maxWindKph: mphToKph(day.windspeed),
      confidence: "long_range_planning",
    })),
  };
}

export async function fetchVisualCrossingForecast({
  location,
  apiKey = process.env.VISUAL_CROSSING_KEY,
  days = Number(process.env.VISUAL_CROSSING_FORECAST_DAYS ?? "15"),
}: {
  location: WeatherLocation;
  apiKey?: string;
  days?: number;
}): Promise<WeatherSnapshot> {
  if (!apiKey) throw new Error("VISUAL_CROSSING_KEY is required for forecast fetch");
  const url = new URL(
    `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location.lat},${location.lon}/next${Math.min(days, 15)}days`
  );
  url.searchParams.set("unitGroup", "us");
  url.searchParams.set("include", "days");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("contentType", "json");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 6 * 60 * 60 },
  });
  if (!response.ok) {
    trackWeatherEvent("weather_provider_error", {
      provider: "visual_crossing",
      status: response.status,
      locationKey: location.key,
    });
    throw new Error(`Visual Crossing forecast failed with ${response.status}`);
  }
  trackWeatherEvent("visual_crossing_outlook_used", {
    provider: "visual_crossing",
    locationKey: location.key,
  });
  const fetchedAt = new Date();
  const normalized = normalizeVisualCrossingForecast({
    locationKey: location.key,
    payload: await response.json(),
    fetchedAt: fetchedAt.toISOString(),
  });
  return {
    locationKey: location.key,
    provider: "visual_crossing",
    confidence: "long_range_planning",
    fetchedAt: fetchedAt.toISOString(),
    forecastUpdatedAt: fetchedAt.toISOString(),
    expiresAt: new Date(fetchedAt.getTime() + 6 * 60 * 60 * 1000).toISOString(),
    staleAfter: new Date(fetchedAt.getTime() + 12 * 60 * 60 * 1000).toISOString(),
    isStale: false,
    risk: DEFAULT_WEATHER_RISK,
    hourly: [],
    daily: normalized.days,
    attribution: {
      provider: "visual_crossing",
      label: "Visual Crossing",
      required: true,
      href: "https://www.visualcrossing.com/weather-api/",
    },
  };
}
