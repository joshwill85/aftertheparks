import Image from "next/image";
import type { WeatherIconKey } from "@/lib/weather/types";
import { cn } from "@/lib/utils";

const LABELS: Record<WeatherIconKey, string> = {
  sunny_day: "Sunny",
  clear_night: "Clear night",
  partly_cloudy_day: "Partly cloudy",
  partly_cloudy_night: "Partly cloudy night",
  cloudy: "Cloudy",
  overcast: "Overcast",
  mist: "Mist",
  fog: "Fog",
  haze: "Haze",
  smoke: "Smoke",
  dust: "Dust",
  patchy_rain: "Patchy rain",
  light_rain: "Light rain",
  moderate_rain: "Moderate rain",
  heavy_rain: "Heavy rain",
  rain_shower: "Rain shower",
  torrential_rain: "Torrential rain",
  drizzle: "Drizzle",
  freezing_drizzle: "Freezing drizzle",
  freezing_rain: "Freezing rain",
  thunder_possible: "Thunder possible",
  rain_with_thunder: "Rain with thunder",
  snow: "Snow",
  sleet: "Sleet",
  ice_pellets: "Ice pellets",
  wind: "Wind",
  heat: "Heat",
  official_alert: "Official weather alert",
  unknown: "Weather",
};

export function weatherIconLabel(iconKey: WeatherIconKey): string {
  return LABELS[iconKey] ?? "Weather";
}

export function WeatherIcon({
  iconKey,
  className,
  decorative = false,
}: {
  iconKey: WeatherIconKey;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <Image
      src={`/weather-icons/${iconKey}.svg`}
      alt={decorative ? "" : weatherIconLabel(iconKey)}
      width={28}
      height={28}
      className={cn("weather-icon", className)}
      aria-hidden={decorative ? true : undefined}
    />
  );
}
