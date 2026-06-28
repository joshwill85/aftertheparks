import type { MovieNightOccurrence } from "@/lib/types/occurrence";
import { loadPostersForTitles } from "@/lib/movies/poster-cache";

export async function enrichMovieNightsWithPosters(
  items: MovieNightOccurrence[]
): Promise<MovieNightOccurrence[]> {
  if (items.length === 0) return items;

  const posterByTitle = await loadPostersForTitles(
    items.map((i) => i.displayTitle ?? i.movieTitle)
  );

  return items.map((item) => {
    const meta = posterByTitle.get(item.displayTitle ?? item.movieTitle);
    if (!meta) return item;

    return {
      ...item,
      posterUrl: meta.posterUrl,
      backdropUrl: meta.backdropUrl,
      releaseYear: meta.releaseYear ?? undefined,
      tmdbId: meta.tmdbId ?? undefined,
      overview: meta.overview,
      voteAverage: meta.voteAverage,
    };
  });
}

export { tmdbImageUrl, TMDB_ATTRIBUTION_URL } from "@/lib/movies/tmdb";
