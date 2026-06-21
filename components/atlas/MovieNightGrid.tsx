"use client";

import type { MovieNightOccurrence } from "@/lib/types/occurrence";
import { MovieNightCard } from "@/components/atlas/MovieNightCard";
import { TmdbAttribution } from "@/components/atlas/TmdbAttribution";

export function MovieNightGrid({
  movies,
  title,
  columns = "default",
}: {
  movies: MovieNightOccurrence[];
  title?: string;
  columns?: "default" | "wide";
}) {
  if (movies.length === 0) return null;

  const gridClass =
    columns === "wide"
      ? "grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      : "grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

  return (
    <div>
      {title && (
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-[var(--color-lantern)]">
          {title}
        </h3>
      )}
      <div className={gridClass}>
        {movies.map((mn) => (
          <MovieNightCard key={mn.id} movie={mn} />
        ))}
      </div>
    </div>
  );
}

export function MovieNightsSection({
  movieNights,
}: {
  movieNights: MovieNightOccurrence[];
}) {
  const tonightMovies = movieNights.filter((m) => m.isTonight);
  const weekMovies = movieNights.filter((m) => !m.isTonight);

  if (movieNights.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-[var(--color-card-border)] p-10 text-center text-[var(--color-muted)]">
        Movie schedules are updating — outdoor cinema listings will appear here as we
        verify each resort&apos;s calendar.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {tonightMovies.length > 0 && (
        <MovieNightGrid movies={tonightMovies} title="Tonight" />
      )}
      {weekMovies.length > 0 && (
        <MovieNightGrid
          movies={weekMovies}
          title={tonightMovies.length > 0 ? "Rest of the week" : "This week"}
          columns="wide"
        />
      )}
      <TmdbAttribution className="border-t border-[var(--color-card-border)] pt-6" />
    </div>
  );
}
