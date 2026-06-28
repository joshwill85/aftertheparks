"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import {
  EventBadgeRow,
  EventMediaDisplay,
  EventTitleBlock,
} from "@/components/events/event-ui";
import { TmdbAttribution } from "@/components/atlas/TmdbAttribution";
import { getMovieDisplayTitle, movieToEventCard } from "@/lib/events/mapToEventCard";
import type { MovieNightOccurrence } from "@/lib/types/occurrence";
import type { WeatherForTimeSpan } from "@/lib/weather/types";

export { getMovieDisplayTitle };

interface MovieListingCardProps {
  movie: MovieNightOccurrence;
  variant?: "day" | "night";
  linkToTonight?: boolean;
  className?: string;
  weatherSummary?: WeatherForTimeSpan | null;
}

function tmdbMovieHref(tmdbId?: number): string | undefined {
  return tmdbId ? `https://www.themoviedb.org/movie/${tmdbId}` : undefined;
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
}: MovieListingCardProps) {
  const [open, setOpen] = useState(false);
  const card = movieToEventCard(movie, variant, { linkToTonight });
  const title = getMovieDisplayTitle(movie);

  return (
    <>
      <EventCard
        {...card}
        weatherSummary={weatherSummary}
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
