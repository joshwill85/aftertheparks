import "server-only";

import { getWeatherIconKey } from "@/lib/weather/icons";
import { parseWeatherApiLocalDateTime } from "@/lib/weather/time";
import type {
  WeatherDay,
  WeatherHour,
  WeatherLocation,
  WeatherLocationKey,
  WeatherSnapshot,
} from "@/lib/weather/types";
import { DEFAULT_WEATHER_RISK } from "@/lib/weather/types";
import { trackWeatherEvent } from "@/lib/weather/analytics";

export interface WeatherApiForecastPayload {
  location?: { localtime?: string };
  current?: {
    last_updated?: string;
    temp_c?: number;
    temp_f?: number;
    feelslike_c?: number;
    feelslike_f?: number;
    condition?: { text?: string; code?: number };
    is_day?: number;
  };
  forecast?: {
    forecastday?: Array<{
      date?: string;
      day?: {
        maxtemp_f?: number;
        maxtemp_c?: number;
        mintemp_f?: number;
        mintemp_c?: number;
        avgtemp_f?: number;
        avgtemp_c?: number;
        daily_chance_of_rain?: number;
        daily_chance_of_thunder?: number;
        totalprecip_in?: number;
        totalprecip_mm?: number;
        maxwind_mph?: number;
        maxwind_kph?: number;
        uv?: number;
        condition?: { text?: string; code?: number };
      };
      hour?: Array<{
        time?: string;
        temp_f?: number;
        temp_c?: number;
        feelslike_f?: number;
        feelslike_c?: number;
        chance_of_rain?: number;
        chance_of_thunder?: number;
        precip_in?: number;
        precip_mm?: number;
        wind_mph?: number;
        wind_kph?: number;
        gust_mph?: number;
        gust_kph?: number;
        uv?: number;
        is_day?: number;
        condition?: { text?: string; code?: number };
      }>;
    }>;
  };
}

function normalizeWeatherApiHour(hour: NonNullable<NonNullable<NonNullable<WeatherApiForecastPayload["forecast"]>["forecastday"]>[number]["hour"]>[number]): WeatherHour {
  const code = hour.condition?.code ?? 1000;
  const isDay = hour.is_day !== 0;
  return {
    source: "weatherapi",
    time: hour.time
      ? parseWeatherApiLocalDateTime(hour.time).toISOString()
      : new Date(0).toISOString(),
    conditionText: hour.condition?.text ?? "Forecast",
    conditionCode: code,
    providerConditionCode: code,
    iconKey: getWeatherIconKey(code, isDay),
    tempF: hour.temp_f ?? 0,
    tempC: hour.temp_c ?? 0,
    feelsLikeF: hour.feelslike_f,
    feelsLikeC: hour.feelslike_c,
    chanceOfRainPct: hour.chance_of_rain,
    chanceOfThunderPct: hour.chance_of_thunder,
    precipIn: hour.precip_in,
    precipMm: hour.precip_mm,
    windMph: hour.wind_mph,
    windKph: hour.wind_kph,
    gustMph: hour.gust_mph,
    gustKph: hour.gust_kph,
    uvIndex: hour.uv,
    isDay,
  };
}

function normalizeWeatherApiDay(
  forecastDay: NonNullable<NonNullable<WeatherApiForecastPayload["forecast"]>["forecastday"]>[number]
): WeatherDay {
  const day = forecastDay.day ?? {};
  const code = day.condition?.code ?? 1000;
  return {
    source: "weatherapi",
    date: forecastDay.date ?? new Date(0).toISOString().slice(0, 10),
    conditionText: day.condition?.text ?? "Forecast",
    iconKey: getWeatherIconKey(code, true),
    maxTempF: day.maxtemp_f,
    maxTempC: day.maxtemp_c,
    minTempF: day.mintemp_f,
    minTempC: day.mintemp_c,
    avgTempF: day.avgtemp_f,
    avgTempC: day.avgtemp_c,
    chanceOfRainPct: day.daily_chance_of_rain,
    chanceOfThunderPct: day.daily_chance_of_thunder,
    totalPrecipIn: day.totalprecip_in,
    totalPrecipMm: day.totalprecip_mm,
    maxWindMph: day.maxwind_mph,
    maxWindKph: day.maxwind_kph,
    uvIndex: day.uv,
    confidence: "near_term_hourly",
  };
}

export function normalizeWeatherApiForecast(input: {
  locationKey: WeatherLocationKey;
  lat: number;
  lon: number;
  payload: WeatherApiForecastPayload;
  fetchedAt: string;
}): WeatherSnapshot {
  void input.lat;
  void input.lon;
  const current = input.payload.current;
  const code = current?.condition?.code ?? 1000;
  const isDay = current?.is_day !== 0;
  const forecastDays = input.payload.forecast?.forecastday ?? [];
  return {
    locationKey: input.locationKey,
    provider: "weatherapi",
    confidence: "near_term_hourly",
    fetchedAt: input.fetchedAt,
    observedAt: current?.last_updated
      ? parseWeatherApiLocalDateTime(current.last_updated).toISOString()
      : undefined,
    expiresAt: new Date(new Date(input.fetchedAt).getTime() + 15 * 60 * 1000).toISOString(),
    staleAfter: new Date(new Date(input.fetchedAt).getTime() + 30 * 60 * 1000).toISOString(),
    isStale: false,
    conditionText: current?.condition?.text,
    iconKey: getWeatherIconKey(code, isDay),
    tempF: current?.temp_f,
    tempC: current?.temp_c,
    feelsLikeF: current?.feelslike_f,
    feelsLikeC: current?.feelslike_c,
    risk: DEFAULT_WEATHER_RISK,
    hourly: forecastDays.flatMap((forecastDay) =>
      (forecastDay.hour ?? []).map(normalizeWeatherApiHour)
    ),
    daily: forecastDays.map(normalizeWeatherApiDay),
    attribution: {
      provider: "weatherapi",
      label: "WeatherAPI.com",
      required: false,
      href: "https://www.weatherapi.com/",
    },
  };
}

export async function fetchWeatherApiForecast({
  location,
  apiKey = process.env.WEATHERAPI_KEY,
  days = Number(process.env.WEATHERAPI_FORECAST_DAYS ?? "3"),
}: {
  location: WeatherLocation;
  apiKey?: string;
  days?: number;
}): Promise<WeatherSnapshot> {
  if (!apiKey) throw new Error("WEATHERAPI_KEY is required for WeatherAPI forecast fetch");
  const url = new URL("https://api.weatherapi.com/v1/forecast.json");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", `${location.lat},${location.lon}`);
  url.searchParams.set("days", String(Math.min(days, 3)));
  url.searchParams.set("aqi", "yes");
  url.searchParams.set("alerts", "no");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 15 * 60 },
  });
  if (!response.ok) {
    trackWeatherEvent("weather_provider_error", {
      provider: "weatherapi",
      status: response.status,
      locationKey: location.key,
    });
    throw new Error(`WeatherAPI forecast failed with ${response.status}`);
  }
  trackWeatherEvent("weather_module_impression", {
    provider: "weatherapi",
    locationKey: location.key,
  });
  const payload = (await response.json()) as WeatherApiForecastPayload;
  return normalizeWeatherApiForecast({
    locationKey: location.key,
    lat: location.lat,
    lon: location.lon,
    payload,
    fetchedAt: new Date().toISOString(),
  });
}
