import { createServiceClient } from "@/lib/supabase/server";
import { normalizeMovieTitleKey, sanitizeMovieTitle } from "@/lib/movies/sanitize";
import {
  fetchTmdbMovieDetails,
  fetchTmdbMovieRuntime,
  searchTmdbMovie,
  tmdbImageUrl,
  type TmdbMovieResult,
} from "@/lib/movies/tmdb";

export interface MoviePosterMeta {
  titleKey: string;
  displayTitle: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseYear: number | null;
  tmdbId: number | null;
  overview: string | null;
  voteAverage: number | null;
  runtimeMinutes: number | null;
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
  overview?: string | null;
  vote_average?: number | null;
  runtime_minutes?: number | null;
  lookup_status: "found" | "not_found";
}

const memoryCache = new Map<string, MoviePosterMeta>();

let posterCacheDbAvailable: boolean | null = null;

function isMissingPosterCacheTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("movie_poster_cache"))
  );
}

async function ensurePosterCacheDb(): Promise<boolean> {
  if (posterCacheDbAvailable !== null) return posterCacheDbAvailable;

  const supabase = createServiceClient();
  if (!supabase) {
    posterCacheDbAvailable = false;
    return false;
  }

  const { error } = await supabase
    .from("movie_poster_cache")
    .select("title_key")
    .limit(1);

  posterCacheDbAvailable = !isMissingPosterCacheTable(error);
  return posterCacheDbAvailable;
}

function rowToMeta(row: CacheRow): MoviePosterMeta {
  return {
    titleKey: row.title_key,
    displayTitle: row.display_title,
    posterUrl: row.poster_url,
    backdropUrl: row.backdrop_url,
    releaseYear: row.release_year,
    tmdbId: row.tmdb_id,
    overview: row.overview ?? null,
    voteAverage: row.vote_average ?? null,
    runtimeMinutes: row.runtime_minutes ?? null,
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
    overview: hit.overview?.trim() || null,
    voteAverage:
      typeof hit.vote_average === "number" && Number.isFinite(hit.vote_average)
        ? hit.vote_average
        : null,
    runtimeMinutes:
      typeof hit.runtime === "number" && Number.isFinite(hit.runtime)
        ? hit.runtime
        : null,
    found: Boolean(hit.poster_path),
  };
}

function shouldRevalidateCachedMatch(
  displayTitle: string,
  meta: MoviePosterMeta
): boolean {
  if (!meta.found || !meta.tmdbId || !meta.releaseYear) return false;
  if (/\(\d{4}\)|\b\d+\b/.test(displayTitle)) return false;

  const currentYear = new Date().getUTCFullYear();
  return meta.releaseYear >= currentYear - 1;
}

async function revalidateCachedMatch(
  titleKey: string,
  displayTitle: string,
  meta: MoviePosterMeta
): Promise<MoviePosterMeta> {
  if (!shouldRevalidateCachedMatch(displayTitle, meta)) return meta;

  const refreshedHit = await searchTmdbMovie(displayTitle);
  if (!refreshedHit || refreshedHit.id === meta.tmdbId) return meta;

  const refreshed = hitToMeta(titleKey, displayTitle, refreshedHit);
  memoryCache.set(titleKey, refreshed);
  await persistFromHit(titleKey, displayTitle, refreshedHit);
  return refreshed;
}

async function refreshMetadataIfIncomplete(
  meta: MoviePosterMeta
): Promise<MoviePosterMeta> {
  if (
    !meta.tmdbId ||
    !meta.found ||
    (meta.runtimeMinutes && meta.overview && typeof meta.voteAverage === "number")
  ) {
    return meta;
  }

  const details = await fetchTmdbMovieDetails(meta.tmdbId);
  if (!details) {
    const runtimeMinutes = await fetchTmdbMovieRuntime(meta.tmdbId);
    return runtimeMinutes ? { ...meta, runtimeMinutes } : meta;
  }

  const runtimeMinutes =
    typeof details.runtime === "number" && Number.isFinite(details.runtime)
      ? details.runtime
      : meta.runtimeMinutes;
  const voteAverage =
    typeof details.vote_average === "number" && Number.isFinite(details.vote_average)
      ? details.vote_average
      : meta.voteAverage;
  const overview = details.overview?.trim() || meta.overview;

  const refreshed = {
    ...meta,
    overview,
    voteAverage,
    runtimeMinutes,
  };
  memoryCache.set(meta.titleKey, refreshed);

  if (await ensurePosterCacheDb()) {
    const supabase = createServiceClient();
    if (supabase) {
      const { error } = await supabase
        .from("movie_poster_cache")
        .update({
          overview,
          vote_average: voteAverage,
          runtime_minutes: runtimeMinutes,
          resolved_at: new Date().toISOString(),
        })
        .eq("title_key", meta.titleKey);
      if (isMissingPosterCacheTable(error)) {
        posterCacheDbAvailable = false;
      } else if (error) {
        console.error("movie_poster_cache metadata update:", error.message);
      }
    }
  }

  return refreshed;
}

async function getCachedPoster(titleKey: string): Promise<MoviePosterMeta | null> {
  if (memoryCache.has(titleKey)) return memoryCache.get(titleKey)!;

  if (!(await ensurePosterCacheDb())) return null;

  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("movie_poster_cache")
    .select("*")
    .eq("title_key", titleKey)
    .maybeSingle();

  if (isMissingPosterCacheTable(error)) {
    posterCacheDbAvailable = false;
    return null;
  }

  if (error || !data) return null;

  const meta = await refreshMetadataIfIncomplete(rowToMeta(data as CacheRow));
  memoryCache.set(titleKey, meta);
  return meta;
}

export async function resolveMoviePoster(rawTitle: string): Promise<MoviePosterMeta> {
  const displayTitle = sanitizeMovieTitle(rawTitle);
  const titleKey = normalizeMovieTitleKey(displayTitle);

  const cached = await getCachedPoster(titleKey);
  if (cached) {
    return revalidateCachedMatch(titleKey, displayTitle, cached);
  }

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
        overview: null,
        voteAverage: null,
        runtimeMinutes: null,
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
  if (!(await ensurePosterCacheDb())) return;

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
      overview: hit?.overview?.trim() || null,
      vote_average:
        typeof hit?.vote_average === "number" && Number.isFinite(hit.vote_average)
          ? hit.vote_average
          : null,
      runtime_minutes:
        typeof hit?.runtime === "number" && Number.isFinite(hit.runtime)
          ? hit.runtime
          : null,
      lookup_status: hit?.poster_path ? "found" : "not_found",
      resolved_at: new Date().toISOString(),
    },
    { onConflict: "title_key" }
  );

  if (error) {
    if (isMissingPosterCacheTable(error)) {
      posterCacheDbAvailable = false;
      return;
    }
    console.error("movie_poster_cache upsert:", error.message);
  }
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
    if (supabase && (await ensurePosterCacheDb())) {
      const { data, error } = await supabase
        .from("movie_poster_cache")
        .select("*")
        .in(
          "title_key",
          toResolve.map((m) => m.key)
        );

      if (isMissingPosterCacheTable(error)) {
        posterCacheDbAvailable = false;
      } else {

      const stillMissing: typeof items = [];
      const dbKeys = new Set<string>();

      for (const row of data ?? []) {
        let meta = await refreshMetadataIfIncomplete(rowToMeta(row as CacheRow));
        memoryCache.set(meta.titleKey, meta);
        dbKeys.add(meta.titleKey);
        const item = toResolve.find((m) => m.key === meta.titleKey);
        if (item) {
          meta = await revalidateCachedMatch(item.key, item.displayTitle, meta);
          result.set(item.raw, meta);
        }
      }

      for (const item of toResolve) {
        if (!dbKeys.has(item.key)) stillMissing.push(item);
      }
      toResolve = stillMissing;
      }
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
