"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { TmdbAttribution } from "@/components/atlas/TmdbAttribution";
import { usePlan } from "@/components/atlas/PlanProvider";
import { useDaypart } from "@/components/atlas/DaypartProvider";
import { shouldHideActivity, occurrenceToDisplayInput } from "@/lib/activityDisplay";
import { dedupeOccurrences } from "@/lib/api/publicActivities";
import { MovieCard } from "@/components/tonight/MovieCard";
import { NightEmptyState } from "@/components/tonight/NightEmptyState";
import { NightActivityCard } from "@/components/tonight/NightActivityCard";
import { EventCardList, EventCardListItem } from "@/components/events/EventCardList";
import { TonightHero } from "@/components/tonight/TonightHero";
import { NightfallTimeline } from "@/components/tonight/NightfallTimeline";
import { EmptyState } from "@/components/atlas/EmptyState";
import { ActivityCollectionView } from "@/components/atlas/ActivityCollectionView";
import type { MovieNightOccurrence } from "@/lib/types/occurrence";
import { ForecastTimeline } from "@/components/weather/ForecastTimeline";
import { StormModeBanner } from "@/components/weather/StormModeBanner";
import { WeatherStatusStrip } from "@/components/weather/WeatherStatusStrip";
import { WeatherStoryStrip } from "@/components/weather/WeatherStoryStrip";
import { WeatherWindowStrip } from "@/components/weather/WeatherWindowStrip";
import { buildWeatherDayStory } from "@/lib/weather/dayStory";
import { getStormModeState } from "@/lib/weather/stormMode";
import { buildWeatherWindows } from "@/lib/weather/windows";
import type { WeatherForTimeSpan } from "@/lib/weather/types";

function NightSectionEmpty({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: { label: string; href: string; variant?: "primary" | "secondary" }[];
}) {
  return <NightEmptyState title={title} description={description} actions={actions} />;
}

function filterVisible(activities: ActivityOccurrence[]): ActivityOccurrence[] {
  return dedupeOccurrences(
    activities.filter((a) => !shouldHideActivity(occurrenceToDisplayInput(a)))
  );
}

function dedupeBySlot(activities: ActivityOccurrence[]): ActivityOccurrence[] {
  const seen = new Set<string>();
  return activities.filter((a) => {
    const key = `${a.activityCatalogId}:${a.resort.slug}:${a.startDateTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function TonightClient({
  activities,
  movieNights,
  filteredMode = false,
}: {
  activities: ActivityOccurrence[];
  movieNights: MovieNightOccurrence[];
  filteredMode?: boolean;
}) {
  const { addActivity } = usePlan();
  const { setForceDaypart } = useDaypart();
  const [pageWeather, setPageWeather] = useState<WeatherForTimeSpan | null>(null);
  const [weatherById, setWeatherById] = useState<Record<string, WeatherForTimeSpan>>({});

  useEffect(() => {
    setForceDaypart("evening");
    return () => setForceDaypart(null);
  }, [setForceDaypart]);

  const visibleActivities = dedupeBySlot(filterVisible(activities));
  const visibleEveningActivities = visibleActivities.filter(
    (activity) => activity.category !== "movies_under_stars"
  );
  const tonightMovies = movieNights.filter((m) => m.isTonight);
  const weekMovies = movieNights.filter((m) => !m.isTonight);
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
    const dated = visibleEveningActivities
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
  }, [visibleEveningActivities]);

  if (filteredMode) {
    const showMovies = movieNights.length > 0;

    if (visibleActivities.length === 0 && !showMovies) {
      return (
        <EmptyState
          title="No tonight picks match your filters"
          description="Try clearing a filter or browse all evening activities across the resorts."
          actions={[
            { label: "Clear filters", href: "/tonight", variant: "primary" },
            { label: "Explore activities", href: "/activities?daypart=evening" },
            { label: "Browse resorts", href: "/resorts" },
          ]}
        />
      );
    }

    return (
      <div className="space-y-8 pb-8">
        <p className="tonight-callout">
          Filtered evening picks — confirm showtimes with your resort before heading out.
        </p>
        <NightfallTimeline activities={visibleEveningActivities} movieNights={movieNights} />
        {visibleEveningActivities.length > 0 && (
          <EventCardList columns={2}>
            {visibleEveningActivities.map((activity) => (
              <EventCardListItem key={activity.id}>
                <NightActivityCard
                  activity={activity}
                  onSave={addActivity}
                  weatherSummary={weatherById[activity.id]}
                />
              </EventCardListItem>
            ))}
          </EventCardList>
        )}
        {showMovies && (
          <section className="space-y-4">
            <h2 className="home-section__title text-xl md:text-2xl">
              Movies under the stars
            </h2>
            <EventCardList>
              {movieNights.map((movie) => (
                <EventCardListItem key={movie.id}>
                  <MovieCard movie={movie} />
                </EventCardListItem>
              ))}
            </EventCardList>
            <TmdbAttribution className="border-t border-[var(--border-soft)] pt-6 text-[var(--muted)]" />
          </section>
        )}
      </div>
    );
  }

  const hasAnyContent =
    movieNights.length > 0 ||
    visibleEveningActivities.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="space-y-8">
        <TonightHero />
        <NightSectionEmpty
          title="Tonight's schedule is still settling in"
          description="We haven't confirmed evening activities yet. Explore all activities, browse resorts, or check back after the next schedule update."
          actions={[
            { label: "Explore activities", href: "/activities", variant: "primary" },
            { label: "Browse resorts", href: "/resorts" },
            { label: "See today", href: "/today" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-14 scroll-mt-24 pb-8">
      <TonightHero />

      <div className="space-y-4">
        <StormModeBanner state={stormMode} />
        <WeatherStatusStrip
          state={stormMode.active ? "storm" : "normal"}
          weather={pageWeather}
          actions={[
            { label: "Indoor tonight", href: "/tonight?weather=indoor" },
            { label: "Covered options", href: "/activities?weather=covered" },
          ]}
        />
        <WeatherWindowStrip windows={weatherWindows} />
        <WeatherStoryStrip story={weatherStory} />
        {pageWeather?.hourlyBreakdown.length ? (
          <ForecastTimeline hours={pageWeather.hourlyBreakdown} />
        ) : null}
      </div>

      <p className="tonight-callout">
        Confirm showtimes with your resort before heading out; schedules can
        change without notice.
      </p>

      <NightfallTimeline activities={visibleEveningActivities} movieNights={movieNights} />

      <section id="movies" className="scroll-mt-24">
        <div className="mb-5">
          <h2 className="home-section__title text-2xl md:text-3xl">
            Movies under the stars
          </h2>
          <p className="home-section__subtitle md:text-base">
            Movie schedules from resort recreation calendars.
          </p>
        </div>

        {movieNights.length === 0 ? (
          <NightSectionEmpty
            title="No movie listings yet"
            description="Movie schedules are updating. Try campfires and low-key evening activities, or browse all resort fun."
            actions={[
              { label: "Evening activities", href: "#evening-activities", variant: "primary" },
              { label: "Explore activities", href: "/activities" },
              { label: "Search", href: "/search" },
            ]}
          />
        ) : (
          <div className="space-y-10">
            {tonightMovies.length > 0 && (
              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-[var(--lagoon-deep)]">
                  Tonight
                </h3>
                <EventCardList>
                  {tonightMovies.map((movie) => (
                    <EventCardListItem key={movie.id}>
                      <MovieCard movie={movie} />
                    </EventCardListItem>
                  ))}
                </EventCardList>
              </div>
            )}
            {weekMovies.length > 0 && (
              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
                  {tonightMovies.length > 0 ? "Rest of the week" : "This week"}
                </h3>
                <EventCardList>
                  {weekMovies.map((movie) => (
                    <EventCardListItem key={movie.id}>
                      <MovieCard movie={movie} />
                    </EventCardListItem>
                  ))}
                </EventCardList>
              </div>
            )}
            <TmdbAttribution className="border-t border-[var(--border-soft)] pt-6 text-[var(--muted)]" />
          </div>
        )}
      </section>

      <section id="evening-activities" className="scroll-mt-24">
        <div className="mb-5">
          <h2 className="home-section__title text-2xl md:text-3xl">
            Evening activities
          </h2>
          <p className="home-section__subtitle md:text-base">
            One set of evening listings. Switch views or sort by time, name, category, or cost.
          </p>
        </div>

        {visibleEveningActivities.length === 0 ? (
          <NightSectionEmpty
            title="No evening activities listed right now"
            description="Try movies under the stars, browse all resort activities, or check back after the next schedule update."
            actions={[
              { label: "Movies", href: "#movies", variant: "primary" },
              { label: "Explore activities", href: "/activities" },
            ]}
          />
        ) : (
          <ActivityCollectionView activities={visibleEveningActivities} showResort />
        )}
      </section>
    </div>
  );
}
