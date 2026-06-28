"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { EmptyState } from "@/components/atlas/EmptyState";
import { TmdbAttribution } from "@/components/atlas/TmdbAttribution";
import { EventCardList, EventCardListItem } from "@/components/events/EventCardList";
import { PalmRefresh } from "@/components/magic/PalmRefresh";
import { MovieCard } from "@/components/tonight/MovieCard";
import { WeatherStatusStrip } from "@/components/weather/WeatherStatusStrip";
import { useDaypart } from "@/components/atlas/DaypartProvider";
import { buildBrowseHref } from "@/lib/explore/browseParams";
import { getVisibleTonightActivities } from "@/lib/tonight/visibleResults";
import { getStormModeState } from "@/lib/weather/stormMode";
import type {
  ActivityOccurrence,
  MovieNightOccurrence,
} from "@/lib/types/occurrence";
import type { WeatherForTimeSpan } from "@/lib/weather/types";

type TonightTimelineItem =
  | {
      id: string;
      kind: "activity";
      sortKey: string;
      activity: ActivityOccurrence;
    }
  | {
      id: string;
      kind: "movie";
      sortKey: string;
      movie: MovieNightOccurrence;
    };

export function TonightClient({
  activities: initialActivities,
  movieNights: initialMovieNights,
  filteredMode = false,
  initialPageWeather,
  initialWeatherById = {},
}: {
  activities: ActivityOccurrence[];
  movieNights: MovieNightOccurrence[];
  filteredMode?: boolean;
  initialPageWeather: WeatherForTimeSpan | null;
  initialWeatherById?: Record<string, WeatherForTimeSpan>;
}) {
  const { setForceDaypart } = useDaypart();
  const searchParams = useSearchParams();
  const [activities, setActivities] = useState(initialActivities);
  const [movieNights, setMovieNights] = useState(initialMovieNights);
  const [pageWeather, setPageWeather] =
    useState<WeatherForTimeSpan | null>(initialPageWeather);
  const [weatherById, setWeatherById] =
    useState<Record<string, WeatherForTimeSpan>>(initialWeatherById);

  const refresh = useCallback(async () => {
    const qs = searchParams.toString();
    const url = qs ? `/api/tonight?${qs}` : "/api/tonight";
    const res = await fetch(url);
    const data = await res.json();
    setActivities(data.activities ?? []);
    setMovieNights(data.movieNights ?? []);
  }, [searchParams]);

  useEffect(() => {
    setForceDaypart("evening");
    return () => setForceDaypart(null);
  }, [setForceDaypart]);

  const visibleEveningActivities = useMemo(
    () => getVisibleTonightActivities(activities),
    [activities]
  );
  const tonightMovies = useMemo(
    () => movieNights.filter((movie) => movie.isTonight),
    [movieNights]
  );
  const timelineItems = useMemo<TonightTimelineItem[]>(
    () =>
      [
        ...visibleEveningActivities.map((activity) => ({
          id: activity.id,
          kind: "activity" as const,
          sortKey: activity.startDateTime ?? activity.title,
          activity,
        })),
        ...tonightMovies.map((movie) => ({
          id: movie.id,
          kind: "movie" as const,
          sortKey: movie.startDateTime ?? movie.showTime ?? movie.displayTitle,
          movie,
        })),
      ].sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
    [tonightMovies, visibleEveningActivities]
  );
  const stormMode = useMemo(
    () =>
      getStormModeState({
        alerts: pageWeather?.nwsAlerts ?? [],
        stormRisk: pageWeather?.risk.stormRisk ?? "low",
      }),
    [pageWeather]
  );
  const weatherForMovie = (movie: MovieNightOccurrence) =>
    movie.startDateTime ? weatherById[movie.id] ?? null : undefined;
  const todayHref = buildBrowseHref("/today", searchParams);
  const exploreHref = buildBrowseHref("/activities", searchParams);

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
    const dated: {
      id: string;
      resortSlug: string;
      startsAt: string;
      endsAt?: string;
      activitySlug?: string;
    }[] = visibleEveningActivities
      .filter((activity) => activity.startDateTime)
      .filter((activity) => !weatherById[activity.id])
      .map((activity) => ({
        id: activity.id,
        resortSlug: activity.resort.slug,
        startsAt: activity.startDateTime!,
        endsAt: activity.endDateTime,
        activitySlug: activity.activitySlug,
      }));
    const datedMovies = tonightMovies
      .filter((movie) => movie.startDateTime)
      .filter((movie) => !weatherById[movie.id])
      .map((movie) => ({
        id: movie.id,
        resortSlug: movie.resortSlug,
        startsAt: movie.startDateTime!,
        endsAt: movie.endDateTime,
      }));
    dated.push(...datedMovies);
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
  }, [tonightMovies, visibleEveningActivities, weatherById]);

  if (timelineItems.length === 0) {
    return (
      <PalmRefresh onRefresh={refresh}>
        <EmptyState
          title={
            filteredMode
              ? "No tonight picks match your filters"
              : "Tonight's schedule is still settling in"
          }
          description={
            filteredMode
              ? "Try clearing a filter or browse all evening activities across the resorts."
              : "We haven't confirmed evening activities yet. Explore all activities, browse resorts, or check back after the next schedule update."
          }
          actions={[
            {
              label: filteredMode ? "Clear filters" : "Explore activities",
              href: filteredMode ? "/tonight" : exploreHref,
              variant: "primary",
            },
            { label: "See today", href: todayHref },
            { label: "Browse by resort", href: "/resorts" },
            { label: "Search", href: "/search" },
          ]}
        />
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
        <EventCardList
          columns={2}
          className="today-activity-timeline tonight-activity-timeline"
        >
          {timelineItems.map((item) => (
            <EventCardListItem key={item.id}>
              {item.kind === "activity" ? (
                <ActivityCard
                  activity={item.activity}
                  showResort
                  weatherSummary={weatherById[item.activity.id]}
                />
              ) : (
                <MovieCard
                  movie={item.movie}
                  weatherSummary={weatherForMovie(item.movie)}
                />
              )}
            </EventCardListItem>
          ))}
        </EventCardList>
        {tonightMovies.length > 0 && (
          <TmdbAttribution className="mt-6 border-t border-[var(--border-soft)] pt-6 text-[var(--muted)]" />
        )}
      </div>
    </PalmRefresh>
  );
}
