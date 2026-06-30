"use client";

import Link from "next/link";
import type { WeatherForTimeSpan } from "@/lib/weather/types";
import { weatherDecisionLabelForGuidance } from "@/lib/weather/guidance";
import { formatTempDual } from "@/lib/weather/format";
import { weatherPageHref } from "@/lib/weather/links";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { WeatherAtmosphereScene } from "@/components/weather/WeatherAtmosphereScene";
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
  const actionLabel = weatherDecisionLabelForGuidance(weather);
  return (
    <div className={cn("weather-icon-button", className)}>
      <WeatherAtmosphereScene iconKey={weather.iconKey} />
      <Link
        href={weatherPageHref(weather.locationKey)}
        className="weather-icon-button__icon-link"
        aria-label={`Open detailed weather for ${weather.locationKey.replaceAll("_", " ")}`}
      >
        <WeatherIcon iconKey={weather.iconKey} decorative />
      </Link>
      <button
        type="button"
        className="weather-icon-button__details"
        aria-label={`Weather: ${decisionLabel ?? actionLabel ?? weather.headline}${temp ? `, ${temp}` : ""}`}
        onClick={onClick}
      >
        <strong>{nearTermCopy ?? decisionLabel ?? actionLabel ?? weather.headline}</strong>
        {temp && <span>{temp}</span>}
        <WeatherFreshnessLine weather={weather} />
      </button>
    </div>
  );
}
