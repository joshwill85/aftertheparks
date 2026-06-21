import { createServiceClient } from "@/lib/supabase/server";
import { normalizeMovieTitleKey, sanitizeMovieTitle } from "@/lib/movies/sanitize";
import { searchTmdbMovie, tmdbImageUrl, type TmdbMovieResult } from "@/lib/movies/tmdb";

export interface MoviePosterMeta {
  titleKey: string;
  displayTitle: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseYear: number | null;
  tmdbId: number | null;
  found: boolean;
}

interface CacheRow {
  title_key: string;
  display_title: string;
  tmdb_id: number | null;
  poster_path: string | null;
  poster_url: string | null;
  backdrop_path: string | null;
  backdrop_url: string | null;
  release_year: number | null;
  lookup_status: "found" | "not_found";
}

const memoryCache = new Map<string, MoviePosterMeta>();

function rowToMeta(row: CacheRow): MoviePosterMeta {
  return {
    titleKey: row.title_key,
    displayTitle: row.display_title,
    posterUrl: row.poster_url,
    backdropUrl: row.backdrop_url,
    releaseYear: row.release_year,
    tmdbId: row.tmdb_id,
    found: row.lookup_status === "found",
  };
}

function hitToMeta(titleKey: string, displayTitle: string, hit: TmdbMovieResult): MoviePosterMeta {
  const releaseYear = hit.release_date
    ? Number.parseInt(hit.release_date.slice(0, 4), 10)
    : null;

  return {
    titleKey,
    displayTitle,
    posterUrl: tmdbImageUrl(hit.poster_path, "w342"),
    backdropUrl: tmdbImageUrl(hit.backdrop_path, "w780"),
    releaseYear: Number.isFinite(releaseYear) ? releaseYear : null,
    tmdbId: hit.id,
    found: Boolean(hit.poster_path),
  };
}

async function getCachedPoster(titleKey: string): Promise<MoviePosterMeta | null> {
  if (memoryCache.has(titleKey)) return memoryCache.get(titleKey)!;

  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("movie_poster_cache")
    .select("*")
    .eq("title_key", titleKey)
    .maybeSingle();

  if (error || !data) return null;

  const meta = rowToMeta(data as CacheRow);
  memoryCache.set(titleKey, meta);
  return meta;
}

export async function resolveMoviePoster(rawTitle: string): Promise<MoviePosterMeta> {
  const displayTitle = sanitizeMovieTitle(rawTitle);
  const titleKey = normalizeMovieTitleKey(displayTitle);

  const cached = await getCachedPoster(titleKey);
  if (cached) return cached;

  const hit = await searchTmdbMovie(displayTitle);
  const meta: MoviePosterMeta = hit
    ? hitToMeta(titleKey, displayTitle, hit)
    : {
        titleKey,
        displayTitle,
        posterUrl: null,
        backdropUrl: null,
        releaseYear: null,
        tmdbId: null,
        found: false,
      };

  memoryCache.set(titleKey, meta);
  await persistFromHit(titleKey, displayTitle, hit);
  return meta;
}

async function persistFromHit(
  titleKey: string,
  displayTitle: string,
  hit: TmdbMovieResult | null
): Promise<void> {
  const supabase = createServiceClient();
  if (!supabase) return;

  const releaseYear = hit?.release_date
    ? Number.parseInt(hit.release_date.slice(0, 4), 10)
    : null;

  const { error } = await supabase.from("movie_poster_cache").upsert(
    {
      title_key: titleKey,
      display_title: displayTitle,
      tmdb_id: hit?.id ?? null,
      poster_path: hit?.poster_path ?? null,
      poster_url: tmdbImageUrl(hit?.poster_path, "w342"),
      backdrop_path: hit?.backdrop_path ?? null,
      backdrop_url: tmdbImageUrl(hit?.backdrop_path, "w780"),
      release_year: Number.isFinite(releaseYear) ? releaseYear : null,
      lookup_status: hit?.poster_path ? "found" : "not_found",
      resolved_at: new Date().toISOString(),
    },
    { onConflict: "title_key" }
  );

  if (error) console.error("movie_poster_cache upsert:", error.message);
}

export async function loadPostersForTitles(
  rawTitles: string[]
): Promise<Map<string, MoviePosterMeta>> {
  const unique = [...new Set(rawTitles)];
  const items = unique.map((raw) => {
    const displayTitle = sanitizeMovieTitle(raw);
    return { raw, key: normalizeMovieTitleKey(displayTitle), displayTitle };
  });

  const result = new Map<string, MoviePosterMeta>();
  let toResolve: typeof items = [];

  for (const item of items) {
    const mem = memoryCache.get(item.key);
    if (mem) result.set(item.raw, mem);
    else toResolve.push(item);
  }

  if (toResolve.length > 0) {
    const supabase = createServiceClient();
    if (supabase) {
      const { data } = await supabase
        .from("movie_poster_cache")
        .select("*")
        .in(
          "title_key",
          toResolve.map((m) => m.key)
        );

      const stillMissing: typeof items = [];
      const dbKeys = new Set<string>();

      for (const row of data ?? []) {
        const meta = rowToMeta(row as CacheRow);
        memoryCache.set(meta.titleKey, meta);
        dbKeys.add(meta.titleKey);
        const item = toResolve.find((m) => m.key === meta.titleKey);
        if (item) result.set(item.raw, meta);
      }

      for (const item of toResolve) {
        if (!dbKeys.has(item.key)) stillMissing.push(item);
      }
      toResolve = stillMissing;
    }
  }

  const BATCH = 4;
  for (let i = 0; i < toResolve.length; i += BATCH) {
    const batch = toResolve.slice(i, i + BATCH);
    const resolved = await Promise.all(
      batch.map((item) => resolveMoviePoster(item.displayTitle))
    );
    batch.forEach((item, idx) => result.set(item.raw, resolved[idx]));
  }

  return result;
}
