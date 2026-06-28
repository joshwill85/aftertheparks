"use client";

import type { WeatherForTimeSpan } from "@/lib/weather/types";
import { formatTempDual } from "@/lib/weather/format";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { WeatherFreshnessLine } from "@/components/weather/WeatherFreshnessLine";
import { nearTermRainShortCopy } from "@/components/weather/NearTermRainLine";
import { cn } from "@/lib/utils";

export function WeatherIconButton({
  weather,
  decisionLabel,
  onClick,
  className,
}: {
  weather: WeatherForTimeSpan;
  decisionLabel?: string;
  onClick?: () => void;
  className?: string;
}) {
  const temp =
    weather.tempF != null && weather.tempC != null
      ? formatTempDual(weather.tempF, weather.tempC)
      : undefined;
  const nearTermCopy = nearTermRainShortCopy(weather.nearTermRain);
  return (
    <button
      type="button"
      className={cn("weather-icon-button", className)}
      aria-label={`Weather: ${decisionLabel ?? weather.headline}${temp ? `, ${temp}` : ""}`}
      onClick={onClick}
    >
      <WeatherIcon iconKey={weather.iconKey} decorative />
      <span className="weather-icon-button__copy">
        <strong>{nearTermCopy ?? decisionLabel ?? weather.headline}</strong>
        {temp && <span>{temp}</span>}
        <WeatherFreshnessLine weather={weather} />
      </span>
    </button>
  );
}
