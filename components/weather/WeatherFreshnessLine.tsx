import type { WeatherForTimeSpan } from "@/lib/weather/types";
import { formatWeatherFreshness } from "@/lib/weather/freshness";
import { cn } from "@/lib/utils";

export function WeatherFreshnessLine({
  weather,
  className,
}: {
  weather: Pick<
    WeatherForTimeSpan,
    | "fetchedAt"
    | "forecastStatus"
    | "forecastConfidence"
    | "locationKey"
    | "timeBasisLabel"
  >;
  className?: string;
}) {
  return (
    <span
      className={cn("weather-freshness-line", className)}
      suppressHydrationWarning
    >
      {formatWeatherFreshness(weather)}
    </span>
  );
}
