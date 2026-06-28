import type { WeatherIconKey } from "@/lib/weather/types";

export function mapNwsForecastToIcon(forecast?: string): WeatherIconKey {
  const text = forecast?.toLowerCase() ?? "";
  if (text.includes("thunder")) return "rain_with_thunder";
  if (text.includes("rain") || text.includes("showers")) return "rain_shower";
  if (text.includes("fog")) return "fog";
  if (text.includes("wind")) return "wind";
  if (text.includes("snow")) return "snow";
  if (text.includes("sunny")) return "sunny_day";
  if (text.includes("cloud")) return "partly_cloudy_day";
  return "unknown";
}
