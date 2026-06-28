"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { EmptyState } from "@/components/atlas/EmptyState";
import { PalmRefresh } from "@/components/magic/PalmRefresh";
import { formatOrlandoTime } from "@/lib/daypart";
import { buildBrowseHref } from "@/lib/explore/browseParams";
import { usePlan } from "@/components/atlas/PlanProvider";
import { useSearchParams } from "next/navigation";
import { WeatherStatusStrip } from "@/components/weather/WeatherStatusStrip";
import { WeatherWindowStrip } from "@/components/weather/WeatherWindowStrip";
import { WeatherStoryStrip } from "@/components/weather/WeatherStoryStrip";
import { StormModeBanner } from "@/components/weather/StormModeBanner";
import { buildWeatherDayStory } from "@/lib/weather/dayStory";
import { getStormModeState } from "@/lib/weather/stormMode";
import { buildWeatherWindows } from "@/lib/weather/windows";
import type { WeatherForTimeSpan } from "@/lib/weather/types";

export function TodayClient({
  initialActivities,
  tomorrowPreview = [],
}: {
  initialActivities: ActivityOccurrence[];
  tomorrowPreview?: ActivityOccurrence[];
}) {
  const [activities, setActivities] = useState(initialActivities);
  const [pageWeather, setPageWeather] = useState<WeatherForTimeSpan | null>(null);
  const [weatherById, setWeatherById] = useState<Record<string, WeatherForTimeSpan>>({});
  const { addActivity } = usePlan();
  const searchParams = useSearchParams();

  const refresh = useCallback(async () => {
    const qs = searchParams.toString();
    const url = qs ? `/api/today?${qs}` : "/api/today";
    const res = await fetch(url);
    const data = await res.json();
    setActivities(data.activities ?? []);
  }, [searchParams]);

  const tonightHref = buildBrowseHref("/tonight", searchParams);
  const exploreHref = buildBrowseHref("/activities", searchParams);
  const weatherWindows = useMemo(() => {
    const base = pageWeather?.startsAt ?? new Date().toISOString();
    return buildWeatherWindows({
      locationKey: pageWeather?.locationKey ?? "all_wdw",
      startsAt: base,
      endsAt: pageWeather?.endsAt ?? base,
      risksByWindow: [
        {
          startsAt: base,
          endsAt: pageWeather?.endsAt ?? base,
          rainRisk: pageWeather?.risk.rainRisk ?? "low",
          stormRisk: pageWeather?.risk.stormRisk ?? "low",
          heatRisk: pageWeather?.risk.heatRisk ?? "low",
        },
      ],
    });
  }, [pageWeather]);
  const stormMode = useMemo(
    () =>
      getStormModeState({
        alerts: pageWeather?.nwsAlerts ?? [],
        stormRisk: pageWeather?.risk.stormRisk ?? "low",
      }),
    [pageWeather]
  );
  const weatherStory = useMemo(
    () =>
      buildWeatherDayStory({
        windows: weatherWindows,
        stormModeActive: stormMode.active,
      }),
    [stormMode.active, weatherWindows]
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/weather/guidance?locationKey=all_wdw")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body?.guidance) setPageWeather(body.guidance);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const dated = activities
      .filter((activity) => activity.startDateTime)
      .map((activity) => ({
        id: activity.id,
        resortSlug: activity.resort.slug,
        startsAt: activity.startDateTime!,
        endsAt: activity.endDateTime,
        activitySlug: activity.activitySlug,
      }));
    if (dated.length === 0) return;
    let cancelled = false;
    fetch("/api/weather/guidance/batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ occurrences: dated }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { weatherById?: Record<string, WeatherForTimeSpan> } | null) => {
        if (!cancelled && body?.weatherById) setWeatherById(body.weatherById);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activities]);

  if (activities.length === 0) {
    return (
      <PalmRefresh onRefresh={refresh}>
        <EmptyState
          title="We don't see confirmed activities left today"
          description="Schedules change often. Try tonight's movies and campfires, browse all activities, or check the official resort guide before heading out."
          actions={[
            { label: "Tonight's movies", href: tonightHref, variant: "primary" },
            { label: "Explore activities", href: exploreHref },
            { label: "Browse by resort", href: "/resorts" },
            { label: "Search", href: "/search" },
          ]}
        />
        {tomorrowPreview.length > 0 && (
          <section className="mt-10" aria-labelledby="tomorrow-preview-heading">
            <h2
              id="tomorrow-preview-heading"
              className="font-display mb-4 text-xl font-semibold"
            >
              Tomorrow&apos;s first activities
            </h2>
            <ul className="space-y-4">
              {tomorrowPreview.map((activity) => (
                <li key={activity.id}>
                  <ActivityCard
                    activity={activity}
                    showResort
                    onSave={addActivity}
                    weatherSummary={weatherById[activity.id]}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </PalmRefresh>
    );
  }

  return (
    <PalmRefresh onRefresh={refresh}>
      <div className="mb-6 space-y-4">
        <StormModeBanner state={stormMode} />
        <WeatherStatusStrip
          state={stormMode.active ? "storm" : "normal"}
          weather={pageWeather}
          actions={[
            { label: "Indoor backups", href: "/today?weather=indoor" },
            { label: "Covered options", href: "/activities?weather=covered" },
          ]}
        />
        <WeatherWindowStrip windows={weatherWindows} />
        <WeatherStoryStrip story={weatherStory} />
      </div>
      <div className="relative scroll-mt-24">
        <div
          className="absolute bottom-0 left-4 top-0 w-0.5 bg-gradient-to-b from-[var(--color-citrus)] via-[var(--accent)] to-[var(--color-lantern)]"
          aria-hidden
        />
        <ul className="space-y-6 pl-10">
          {activities.map((activity) => (
            <li key={activity.id} className="relative">
              <span
                className="absolute -left-[1.85rem] top-6 flex h-3 w-3 rounded-full bg-[var(--accent)] ring-4 ring-[var(--color-card)]"
                aria-hidden
              />
              {activity.startDateTime && (
                <p className="mb-2 text-sm font-medium text-[var(--color-muted)]">
                  {formatOrlandoTime(activity.startDateTime)}
                </p>
              )}
              <ActivityCard
                activity={activity}
                showResort
                onSave={addActivity}
                weatherSummary={weatherById[activity.id]}
              />
            </li>
          ))}
        </ul>
      </div>
    </PalmRefresh>
  );
}
