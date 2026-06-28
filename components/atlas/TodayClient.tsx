"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { EmptyState } from "@/components/atlas/EmptyState";
import { EventCardList, EventCardListItem } from "@/components/events/EventCardList";
import { PalmRefresh } from "@/components/magic/PalmRefresh";
import { buildBrowseHref } from "@/lib/explore/browseParams";
import { useSearchParams } from "next/navigation";
import { WeatherStatusStrip } from "@/components/weather/WeatherStatusStrip";
import { getStormModeState } from "@/lib/weather/stormMode";
import type { WeatherForTimeSpan } from "@/lib/weather/types";

export function TodayClient({
  initialActivities,
  tomorrowPreview = [],
  initialPageWeather,
  initialWeatherById = {},
}: {
  initialActivities: ActivityOccurrence[];
  tomorrowPreview?: ActivityOccurrence[];
  initialPageWeather: WeatherForTimeSpan | null;
  initialWeatherById?: Record<string, WeatherForTimeSpan>;
}) {
  const [activities, setActivities] = useState(initialActivities);
  const [pageWeather, setPageWeather] = useState<WeatherForTimeSpan | null>(initialPageWeather);
  const [weatherById, setWeatherById] = useState<Record<string, WeatherForTimeSpan>>(initialWeatherById);
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
  const stormMode = useMemo(
    () =>
      getStormModeState({
        alerts: pageWeather?.nwsAlerts ?? [],
        stormRisk: pageWeather?.risk.stormRisk ?? "low",
      }),
    [pageWeather]
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
      .filter((activity) => !weatherById[activity.id])
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
        if (!cancelled && body?.weatherById) {
          setWeatherById((current) => ({ ...current, ...body.weatherById }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activities, weatherById]);

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
            <EventCardList
              columns={2}
              className="today-activity-timeline today-activity-timeline--preview"
            >
              {tomorrowPreview.map((activity) => (
                <EventCardListItem key={activity.id}>
                  <ActivityCard
                    activity={activity}
                    showResort
                    weatherSummary={weatherById[activity.id]}
                  />
                </EventCardListItem>
              ))}
            </EventCardList>
          </section>
        )}
      </PalmRefresh>
    );
  }

  return (
    <PalmRefresh onRefresh={refresh}>
      <div className="mb-6 space-y-4">
        <WeatherStatusStrip
          state={stormMode.active ? "storm" : "normal"}
          weather={pageWeather}
          actions={[{ label: "Covered Options", href: "/activities?weather=covered" }]}
        />
      </div>
      <div className="scroll-mt-24">
        <EventCardList columns={2} className="today-activity-timeline">
          {activities.map((activity) => (
            <EventCardListItem key={activity.id}>
              <ActivityCard
                activity={activity}
                showResort
                weatherSummary={weatherById[activity.id]}
              />
            </EventCardListItem>
          ))}
        </EventCardList>
      </div>
    </PalmRefresh>
  );
}
