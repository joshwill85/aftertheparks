"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePlan } from "@/components/atlas/PlanProvider";
import { EventCard } from "@/components/events/EventCard";
import {
  EventBadgeRow,
  EventMediaDisplay,
  EventTitleBlock,
} from "@/components/events/event-ui";
import { TmdbAttribution } from "@/components/atlas/TmdbAttribution";
import { getMovieDisplayTitle, movieToEventCard } from "@/lib/events/mapToEventCard";
import { formatMovieDuration } from "@/lib/movies/time";
import type { ActivityOccurrence, MovieNightOccurrence } from "@/lib/types/occurrence";
import type { WeatherForTimeSpan } from "@/lib/weather/types";

export { getMovieDisplayTitle };

interface MovieListingCardProps {
  movie: MovieNightOccurrence;
  variant?: "day" | "night";
  linkToTonight?: boolean;
  className?: string;
  weatherSummary?: WeatherForTimeSpan | null;
  showWeatherSignal?: boolean;
}

function tmdbMovieHref(tmdbId?: number): string | undefined {
  return tmdbId ? `https://www.themoviedb.org/movie/${tmdbId}` : undefined;
}

function movieToPlanActivity(movie: MovieNightOccurrence): ActivityOccurrence {
  const title = getMovieDisplayTitle(movie);

  return {
    id: movie.id,
    activityCatalogId: `movie:${movie.id}`,
    activitySlug: "movies-under-the-stars",
    title,
    resort: {
      slug: movie.resortSlug,
      name: movie.resortName,
      tier: "",
      area: "",
    },
    summary:
      movie.overview?.trim() ||
      "Outdoor movie night from the current resort recreation calendar.",
    category: "movies_under_stars",
    section: "Movies Under the Stars",
    daypart: "evening",
    price: { state: "free" },
    location: { label: movie.location ?? "Confirm with the resort" },
    eligibility: {
      ages: ["all_ages"],
      reservation: { required: false },
    },
    freshness: {
      lastVerified: movie.startDateTime ?? "1970-01-01T00:00:00.000Z",
      sourceUrl: "/activities/movies-under-the-stars",
      badge: "verified",
    },
    status: "active",
    startDateTime: movie.startDateTime,
    endDateTime: movie.endDateTime,
    scheduleText: [movie.dayOfWeek, movie.showTime].filter(Boolean).join(" at "),
  };
}

function MovieDetailsDialog({
  movie,
  variant,
  onClose,
}: {
  movie: MovieNightOccurrence;
  variant: "day" | "night";
  onClose: () => void;
}) {
  const titleId = useId();
  const card = movieToEventCard(movie, variant, { linkToTonight: false });
  const tmdbHref = tmdbMovieHref(movie.tmdbId);
  const isNight = variant === "night";
  const runtime = formatMovieDuration(movie.runtimeMinutes);

  return (
    <div className="movie-details" role="presentation">
      <button
        type="button"
        className="movie-details__scrim"
        aria-label="Close movie details"
        onClick={onClose}
      />
      <section
        className="movie-details__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="movie-details__close"
          aria-label="Close movie details"
          onClick={onClose}
        >
          Close
        </button>
        <div className="movie-details__content">
          <EventMediaDisplay
            media={card.media}
            size="detail"
            resortSlug={movie.resortSlug}
          />
          <div className="movie-details__copy">
            <EventBadgeRow badges={card.badges ?? []} isNight={isNight} />
            <EventTitleBlock
              title={card.title}
              resort={card.resort}
              location={card.location}
              extra={card.extra}
              timeLabel={card.timeLabel}
              scheduleDayLabel={card.scheduleDayLabel}
              scheduleDayDateTime={card.scheduleDayDateTime}
              summary={
                movie.overview?.trim() ||
                "Movie details are still being matched from The Movie Database."
              }
              footnote={card.footnote}
              headingLevel="h1"
              headingId={titleId}
            />
            <div className="movie-details__facts">
              {movie.releaseYear && <span>Released {movie.releaseYear}</span>}
              {runtime && <span>{runtime}</span>}
              {typeof movie.voteAverage === "number" && (
                <span>TMDB {movie.voteAverage.toFixed(1)}</span>
              )}
              {movie.location && <span>{movie.location}</span>}
            </div>
            {tmdbHref && (
              <Link
                href={tmdbHref}
                className="movie-details__source"
                target="_blank"
                rel="noreferrer"
              >
                More movie details on TMDB
              </Link>
            )}
            <TmdbAttribution className="movie-details__attribution" />
          </div>
        </div>
      </section>
    </div>
  );
}

export function MovieListingCard({
  movie,
  variant = "day",
  linkToTonight = false,
  className,
  weatherSummary,
  showWeatherSignal,
}: MovieListingCardProps) {
  const { addActivity, isActivitySaved } = usePlan();
  const [open, setOpen] = useState(false);
  const card = movieToEventCard(movie, variant, { linkToTonight });
  const title = getMovieDisplayTitle(movie);
  const planActivity = useMemo(() => movieToPlanActivity(movie), [movie]);

  return (
    <>
      <EventCard
        {...card}
        weatherSummary={weatherSummary}
        showWeatherSignal={showWeatherSignal}
        saved={isActivitySaved(planActivity)}
        onSave={() => addActivity(planActivity)}
        href={undefined}
        onOpen={() => setOpen(true)}
        openLabel={`View movie details for ${title}`}
        className={className}
      />
      {open && (
        <MovieDetailsDialog
          movie={movie}
          variant={variant}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
