import type {
  WeatherLocation,
  WeatherPrecipMapContext,
  WeatherPrecipMapFrame,
} from "@/lib/weather/types";
import { trackWeatherEvent } from "@/lib/weather/analytics";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function weatherApiFrameKey(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(
    date.getUTCHours()
  )}`;
}

function tileCoordinate(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

function frameForTime(location: WeatherLocation, validAt: Date, zoom: number): WeatherPrecipMapFrame {
  const frameKey = weatherApiFrameKey(validAt);
  const { x, y } = tileCoordinate(location.lat, location.lon, zoom);
  const tileUrlTemplate = `https://weathermaps.weatherapi.com/precip/tiles/${frameKey}/{z}/{x}/{y}.png`;
  return {
    validAt: validAt.toISOString(),
    tileUrlTemplate,
    previewTileUrl: tileUrlTemplate
      .replace("{z}", String(zoom))
      .replace("{x}", String(x))
      .replace("{y}", String(y)),
  };
}

export function getWeatherApiPrecipMapContext({
  location,
  now = new Date(),
}: {
  location: WeatherLocation;
  now?: Date;
}): WeatherPrecipMapContext | undefined {
  if (process.env.WEATHER_PRECIP_MAPS_ENABLED === "false") return undefined;

  const zoom = 8;
  const currentHour = new Date(now);
  currentHour.setUTCMinutes(0, 0, 0);
  const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000);

  trackWeatherEvent("weather_precip_map_view", {
    provider: "weatherapi",
    locationKey: location.key,
  });

  return {
    provider: "weatherapi",
    label: "Rain map",
    description: "Nearby precipitation for planning context. This is not live radar.",
    locationKey: location.key,
    center: { lat: location.lat, lon: location.lon },
    zoom,
    attribution: {
      provider: "weatherapi",
      label: "WeatherAPI.com",
      required: false,
      href: "https://www.weatherapi.com/",
    },
    frames: [
      frameForTime(location, currentHour, zoom),
      frameForTime(location, nextHour, zoom),
    ],
  };
}
