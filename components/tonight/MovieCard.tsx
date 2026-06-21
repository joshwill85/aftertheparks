import Image from "next/image";
import type { MovieNightOccurrence } from "@/lib/types/occurrence";
import { looksCorruptedTitle } from "@/lib/activityDisplay";
import {
  formatMovieDay,
  formatMovieShowTime,
  MoviePosterFallback,
} from "@/components/atlas/MoviePosterFallback";

const MOVIE_FALLBACK_TITLE = "Movie Under the Stars";

export function getMovieDisplayTitle(movie: MovieNightOccurrence): string {
  const candidate = (movie.displayTitle ?? movie.movieTitle ?? "").trim();
  if (!candidate || looksCorruptedTitle(candidate)) {
    return MOVIE_FALLBACK_TITLE;
  }
  return candidate;
}

export function MovieCard({ movie }: { movie: MovieNightOccurrence }) {
  const title = getMovieDisplayTitle(movie);
  const showTime = formatMovieShowTime(movie.showTime);
  const day = formatMovieDay(movie.dayOfWeek);

  return (
    <article className="night-card group relative flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--night-soft)]">
        {movie.backdropUrl && (
          <Image
            src={movie.backdropUrl}
            alt=""
            fill
            className="scale-110 object-cover opacity-30 blur-sm"
            sizes="240px"
            aria-hidden
          />
        )}

        {movie.posterUrl ? (
          <>
            <Image
              src={movie.posterUrl}
              alt={`${title} poster`}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent"
              aria-hidden
            />
          </>
        ) : (
          <MoviePosterFallback title={title} releaseYear={movie.releaseYear} />
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          {movie.isTonight ? (
            <span className="lantern-glow rounded-full bg-[var(--lantern)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--night)]">
              Tonight
            </span>
          ) : (
            <span className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-md">
              {day}
            </span>
          )}
          <span className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-md">
            {showTime}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 pt-16">
          <h3 className="font-display text-lg font-semibold leading-tight text-white drop-shadow-md line-clamp-2">
            {title}
          </h3>
          {movie.releaseYear && title !== MOVIE_FALLBACK_TITLE && (
            <p className="mt-0.5 text-xs font-medium text-white/70">{movie.releaseYear}</p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-sm font-semibold leading-snug text-white">{movie.resortName}</p>
        {movie.location && (
          <p className="line-clamp-2 text-xs leading-relaxed text-white/62">
            {movie.location}
          </p>
        )}
        <p className="mt-auto pt-2 text-[11px] leading-relaxed text-white/50">
          Confirm showtime with the resort before heading over.
        </p>
      </div>
    </article>
  );
}
