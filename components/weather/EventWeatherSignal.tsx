"use client";

import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { WeatherForTimeSpan } from "@/lib/weather/types";
import { weatherDecisionLabelForGuidance } from "@/lib/weather/guidance";
import { formatTempDual } from "@/lib/weather/format";
import { weatherPageHref } from "@/lib/weather/links";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { WeatherAtmosphereScene } from "@/components/weather/WeatherAtmosphereScene";
import { WeatherFreshnessLine } from "@/components/weather/WeatherFreshnessLine";
import { cn } from "@/lib/utils";

type WeatherSignalState =
  | { status: "idle" | "loading" }
  | { status: "ready"; guidance: WeatherForTimeSpan }
  | { status: "error" };

function toneForGuidance(guidance: WeatherForTimeSpan): "good" | "mixed" | "poor" | "quiet" {
  if (guidance.forecastStatus === "not_available_yet") return "quiet";
  if (
    guidance.risk.overallOutdoorFit === "unsafe" ||
    guidance.risk.overallOutdoorFit === "poor"
  ) {
    return "poor";
  }
  if (
    guidance.risk.overallOutdoorFit === "mixed" ||
    guidance.risk.indoorBackupRecommended
  ) {
    return "mixed";
  }
  return "good";
}

function detailText(guidance: WeatherForTimeSpan): string | undefined {
  if (guidance.forecastStatus === "not_available_yet") return "check later";
  const pieces = [
    guidance.tempF != null && guidance.tempC != null
      ? formatTempDual(guidance.tempF, guidance.tempC)
      : undefined,
    guidance.rainChancePct != null ? `${guidance.rainChancePct}% rain` : undefined,
    guidance.nwsAlerts.length > 0 ? "official alert" : undefined,
  ].filter(Boolean);
  return pieces.length > 0 ? pieces.join(" · ") : undefined;
}

export function EventWeatherSignal({
  resortSlug,
  locationKey,
  startsAt,
  endsAt,
  className,
}: {
  resortSlug?: string;
  locationKey?: string;
  startsAt?: string;
  endsAt?: string;
  className?: string;
}) {
  const [state, setState] = useState<WeatherSignalState>({ status: "idle" });
  const query = useMemo(() => {
    if (!startsAt || (!resortSlug && !locationKey)) return null;
    const params = new URLSearchParams({ startsAt });
    if (endsAt) params.set("endsAt", endsAt);
    if (locationKey) params.set("locationKey", locationKey);
    if (resortSlug) params.set("resortSlug", resortSlug);
    return `/api/weather/guidance?${params.toString()}`;
  }, [endsAt, locationKey, resortSlug, startsAt]);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(query, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("weather guidance request failed");
        return response.json();
      })
      .then((body: { guidance?: WeatherForTimeSpan }) => {
        if (body.guidance?.shouldDisplayWeather) {
          setState({ status: "ready", guidance: body.guidance });
        } else {
          setState({ status: "idle" });
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, [query]);

  if (state.status !== "ready") return null;

  const guidance = state.guidance;
  const tone = toneForGuidance(guidance);
  const detail = detailText(guidance);
  const actionLabel = weatherDecisionLabelForGuidance(guidance);
  const weatherHref = weatherPageHref(guidance.locationKey);
  const openWeatherPage = (
    event: MouseEvent<HTMLSpanElement> | KeyboardEvent<HTMLSpanElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    window.location.assign(weatherHref);
  };

  return (
    <div
      className={cn(
        "event-weather-signal",
        `event-weather-signal--${tone}`,
        className
      )}
    >
      <WeatherAtmosphereScene iconKey={guidance.iconKey} />
      <span
        role="link"
        tabIndex={0}
        className="event-weather-signal__icon event-weather-signal__icon-link"
        aria-label={`Open detailed weather for ${guidance.locationKey.replaceAll("_", " ")}`}
        data-href={weatherHref}
        onClick={openWeatherPage}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") openWeatherPage(event);
        }}
      >
        <WeatherIcon iconKey={guidance.iconKey} decorative />
      </span>
      <span className="event-weather-signal__copy">
        <strong>{actionLabel ?? guidance.headline}</strong>
        {detail && <span>{detail}</span>}
        <WeatherFreshnessLine weather={guidance} />
      </span>
    </div>
  );
}
