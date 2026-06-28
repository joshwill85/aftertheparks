import "server-only";

import { DEFAULT_WEATHER_RISK } from "@/lib/weather/types";
import { trackWeatherEvent } from "@/lib/weather/analytics";
import type {
  WeatherDay,
  WeatherHour,
  WeatherLocation,
  WeatherLocationKey,
  WeatherSnapshot,
} from "@/lib/weather/types";
import { mapNwsForecastToIcon } from "@/lib/weather/nwsIconMap";

function fToC(tempF: number): number {
  return Math.round(((tempF - 32) * 5) / 9);
}

function mphToKph(mph?: number): number | undefined {
  return mph == null ? undefined : Math.round(mph * 1.60934);
}

function parseWindMph(windSpeed?: string): number | undefined {
  const first = windSpeed?.match(/\d+/)?.[0];
  return first ? Number(first) : undefined;
}

export function resolveNwsPointMetadata(payload: any): {
  forecastUrl: string;
  forecastHourlyUrl: string;
  forecastGridDataUrl: string;
  timeZone: string;
} {
  return {
    forecastUrl: payload.properties.forecast,
    forecastHourlyUrl: payload.properties.forecastHourly,
    forecastGridDataUrl: payload.properties.forecastGridData,
    timeZone: payload.properties.timeZone,
  };
}

export function normalizeNwsHourlyForecast(input: {
  locationKey: WeatherLocationKey;
  payload: any;
}): WeatherHour[] {
  void input.locationKey;
  return (input.payload.properties?.periods ?? []).map((period: any) => {
    const tempF = Number(period.temperature);
    const windMph = parseWindMph(period.windSpeed);
    return {
      source: "nws_forecast",
      time: period.startTime,
      conditionText: period.shortForecast ?? period.name ?? "Forecast",
      providerConditionCode: period.shortForecast,
      iconKey: mapNwsForecastToIcon(period.shortForecast),
      tempF,
      tempC: fToC(tempF),
      chanceOfRainPct: period.probabilityOfPrecipitation?.value ?? undefined,
      windMph,
      windKph: mphToKph(windMph),
      isDay: Boolean(period.isDaytime),
    } satisfies WeatherHour;
  });
}

export function normalizeNwsPeriodForecast(input: {
  locationKey: WeatherLocationKey;
  payload: any;
}): WeatherDay[] {
  void input.locationKey;
  return (input.payload.properties?.periods ?? []).map((period: any) => {
    const tempF = Number(period.temperature);
    const windMph = parseWindMph(period.windSpeed);
    return {
      source: "nws_forecast",
      date: String(period.startTime).slice(0, 10),
      conditionText: period.shortForecast ?? period.name ?? "Forecast",
      iconKey: mapNwsForecastToIcon(period.shortForecast),
      maxTempF: tempF,
      maxTempC: fToC(tempF),
      chanceOfRainPct: period.probabilityOfPrecipitation?.value ?? undefined,
      maxWindMph: windMph,
      maxWindKph: mphToKph(windMph),
      confidence: "official_7_day",
    } satisfies WeatherDay;
  });
}

export async function fetchNwsForecastSnapshot({
  location,
  userAgent = process.env.NWS_USER_AGENT,
}: {
  location: WeatherLocation;
  userAgent?: string;
}): Promise<WeatherSnapshot> {
  if (!userAgent) throw new Error("NWS_USER_AGENT is required for NWS forecast fetch");
  const headers = {
    Accept: "application/geo+json",
    "User-Agent": userAgent,
  };
  const pointResponse = await fetch(
    `https://api.weather.gov/points/${location.lat},${location.lon}`,
    { headers, next: { revalidate: 24 * 60 * 60 } }
  );
  if (!pointResponse.ok) {
    trackWeatherEvent("weather_provider_error", {
      provider: "nws_forecast",
      status: pointResponse.status,
      locationKey: location.key,
    });
    throw new Error(`NWS point metadata failed with ${pointResponse.status}`);
  }
  const metadata = resolveNwsPointMetadata(await pointResponse.json());
  const [hourlyResponse, periodResponse] = await Promise.all([
    fetch(metadata.forecastHourlyUrl, {
      headers,
      next: { revalidate: 60 * 60 },
    }),
    fetch(metadata.forecastUrl, {
      headers,
      next: { revalidate: 4 * 60 * 60 },
    }),
  ]);
  if (!hourlyResponse.ok) {
    trackWeatherEvent("weather_provider_error", {
      provider: "nws_forecast",
      status: hourlyResponse.status,
      locationKey: location.key,
    });
    throw new Error(`NWS hourly forecast failed with ${hourlyResponse.status}`);
  }
  if (!periodResponse.ok) {
    trackWeatherEvent("weather_provider_error", {
      provider: "nws_forecast",
      status: periodResponse.status,
      locationKey: location.key,
    });
    throw new Error(`NWS period forecast failed with ${periodResponse.status}`);
  }
  trackWeatherEvent("nws_forecast_used", {
    provider: "nws_forecast",
    locationKey: location.key,
  });
  const fetchedAt = new Date();
  return {
    locationKey: location.key,
    provider: "nws_forecast",
    confidence: "official_7_day",
    fetchedAt: fetchedAt.toISOString(),
    forecastUpdatedAt: fetchedAt.toISOString(),
    expiresAt: new Date(fetchedAt.getTime() + 60 * 60 * 1000).toISOString(),
    staleAfter: new Date(fetchedAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    isStale: false,
    risk: DEFAULT_WEATHER_RISK,
    hourly: normalizeNwsHourlyForecast({
      locationKey: location.key,
      payload: await hourlyResponse.json(),
    }),
    daily: normalizeNwsPeriodForecast({
      locationKey: location.key,
      payload: await periodResponse.json(),
    }),
    attribution: {
      provider: "nws",
      label: "National Weather Service",
      required: false,
      href: "https://www.weather.gov/",
    },
  };
}
