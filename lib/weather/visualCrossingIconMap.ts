import type { WeatherIconKey } from "@/lib/weather/types";

export function mapVisualCrossingIconToWeatherIcon(icon?: string): WeatherIconKey {
  const key = icon?.toLowerCase() ?? "";
  if (key.includes("thunder")) return "rain_with_thunder";
  if (key.includes("rain")) return "rain_shower";
  if (key.includes("fog")) return "fog";
  if (key.includes("wind")) return "wind";
  if (key.includes("snow")) return "snow";
  if (key.includes("clear-day")) return "sunny_day";
  if (key.includes("clear-night")) return "clear_night";
  if (key.includes("cloud")) return "partly_cloudy_day";
  return "unknown";
}
