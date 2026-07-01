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
import { toDisplayActivity } from "@/lib/displayActivity";
import {
  activityToEventCard,
  getMovieDisplayTitle,
  movieToEventCard,
} from "@/lib/events/mapToEventCard";
import { formatMovieDuration } from "@/lib/movies/time";
import type { ActivityOccurrence, MovieNightOccurrence } from "@/lib/types/occurrence";

interface MagicalActivityCarouselProps {
  title: string;
  subtitle: string;
  movies?: MovieNightOccurrence[];
  activities?: ActivityOccurrence[];
  className?: string;
}

function uniqueActivities(activities: ActivityOccurrence[]): ActivityOccurrence[] {
  const seen = new Set<string>();
  const result: ActivityOccurrence[] = [];

  for (const activity of activities) {
    const key = [
      activity.activityCatalogId,
      activity.resort.slug,
      activity.startDateTime ?? activity.scheduleText ?? "",
      activity.location.label,
    ].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(activity);
  }

  return result;
}

function tmdbMovieHref(tmdbId?: number): string | undefined {
  return tmdbId ? `https://www.themoviedb.org/movie/${tmdbId}` : undefined;
}

function MagicalMovieCard({ movie }: { movie: MovieNightOccurrence }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const card = movieToEventCard(movie, "day");
  const title = getMovieDisplayTitle(movie);
  const runtime = formatMovieDuration(movie.runtimeMinutes);
  const tmdbHref = tmdbMovieHref(movie.tmdbId);

  return (
    <>
      <EventCard
        {...card}
        href={undefined}
        onOpen={() => setOpen(true)}
        openLabel={`View movie details for ${title}`}
        className="magical-activity-carousel__card"
      />
      {open && (
        <div className="movie-details" role="presentation">
          <button
            type="button"
            className="movie-details__scrim"
            aria-label="Close movie details"
            onClick={() => setOpen(false)}
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
              onClick={() => setOpen(false)}
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
                <EventBadgeRow badges={card.badges ?? []} isNight={false} />
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
      )}
    </>
  );
}

export function MagicalActivityCarousel({
  title,
  subtitle,
  movies = [],
  activities = [],
  className,
}: MagicalActivityCarouselProps) {
  const carouselMovies = movies.slice(0, 10);
  const carouselActivities = uniqueActivities(activities).slice(0, 10);
  const hasMovies = carouselMovies.length > 0;
  const hasActivities = carouselActivities.length > 0;

  if (!hasMovies && !hasActivities) return null;

  return (
    <section
      className={[
        "magical-activity-carousel",
        hasMovies && "magical-activity-carousel--movies",
        hasActivities && "magical-activity-carousel--activities",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`}
    >
      <div className="magical-activity-carousel__header">
        <div>
          <h2
            id={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`}
            className="magical-activity-carousel__title"
          >
            {title}
          </h2>
          <p className="magical-activity-carousel__subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="magical-activity-carousel__rail" role="list">
        {carouselMovies.map((movie) => (
          <div className="magical-activity-carousel__item" role="listitem" key={movie.id}>
            <MagicalMovieCard movie={movie} />
          </div>
        ))}
        {carouselActivities.map((activity) => {
          const display = toDisplayActivity(activity);
          const card = activityToEventCard(activity, display, {
            showResort: true,
            variant: "day",
            includeScheduleDate: true,
          });

          return (
            <div
              className="magical-activity-carousel__item"
              role="listitem"
              key={`${activity.id}-${activity.resort.slug}`}
            >
              <EventCard
                {...card}
                className="magical-activity-carousel__card"
              />
            </div>
          );
        })}
      </div>

      {hasMovies && (
        <TmdbAttribution className="magical-activity-carousel__attribution" />
      )}
    </section>
  );
}
