export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
export const TMDB_ATTRIBUTION_URL = "https://www.themoviedb.org/";

export type TmdbImageWidth = "w185" | "w342" | "w500" | "w780";

export interface TmdbMovieResult {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  overview?: string;
  popularity?: number;
  vote_average?: number;
  runtime?: number | null;
}

export function tmdbImageUrl(
  path: string | null | undefined,
  width: TmdbImageWidth = "w342"
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${width}${path}`;
}

function tmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY);
}

function tmdbRequestInit(): RequestInit {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    };
  }
  return { cache: "no-store" };
}

function buildSearchUrl(query: string, year?: string): string {
  const params = new URLSearchParams({
    query,
    include_adult: "false",
  });
  if (year) params.set("year", year);

  const apiKey = process.env.TMDB_API_KEY;
  if (apiKey && !process.env.TMDB_READ_ACCESS_TOKEN) {
    params.set("api_key", apiKey);
  }

  return `https://api.themoviedb.org/3/search/movie?${params}`;
}

function buildMovieDetailsUrl(tmdbId: number): string {
  const params = new URLSearchParams();
  const apiKey = process.env.TMDB_API_KEY;
  if (apiKey && !process.env.TMDB_READ_ACCESS_TOKEN) {
    params.set("api_key", apiKey);
  }
  const suffix = params.toString();
  return `https://api.themoviedb.org/3/movie/${tmdbId}${suffix ? `?${suffix}` : ""}`;
}

export async function fetchTmdbMovieRuntime(
  tmdbId: number
): Promise<number | null> {
  const detail = await fetchTmdbMovieDetails(tmdbId);
  return detail?.runtime ?? null;
}

export async function fetchTmdbMovieDetails(
  tmdbId: number
): Promise<TmdbMovieResult | null> {
  if (!tmdbConfigured()) return null;
  try {
    const detailRes = await fetch(buildMovieDetailsUrl(tmdbId), tmdbRequestInit());
    if (!detailRes.ok) return null;
    const detail = (await detailRes.json()) as TmdbMovieResult;
    return {
      ...detail,
      runtime:
        typeof detail.runtime === "number" && Number.isFinite(detail.runtime)
          ? detail.runtime
          : null,
    };
  } catch (err) {
    console.error("TMDB details lookup error:", err);
    return null;
  }
}

function normalizeForMatch(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickBestMatch(
  results: TmdbMovieResult[],
  queryTitle: string,
  year?: string
): TmdbMovieResult | null {
  if (!results.length) return null;

  const queryNorm = normalizeForMatch(queryTitle);
  const queryTokens = new Set(queryNorm.split(" "));
  const now = new Date();
  const currentYear = now.getUTCFullYear();

  let best: TmdbMovieResult | null = null;
  let bestScore = -1;

  for (const movie of results) {
    if (!movie.poster_path) continue;

    const titleNorm = normalizeForMatch(movie.title);
    const releaseYear = movie.release_date
      ? Number.parseInt(movie.release_date.slice(0, 4), 10)
      : null;
    let score = 0;

    if (titleNorm === queryNorm) score += 100;
    else if (titleNorm.startsWith(queryNorm) || queryNorm.startsWith(titleNorm)) score += 60;

    const overlap = titleNorm
      .split(" ")
      .filter((t) => queryTokens.has(t)).length;
    score += overlap * 8;

    if (year && movie.release_date?.startsWith(year)) score += 25;
    if (!year && titleNorm === queryNorm) {
      const releaseTime = movie.release_date ? Date.parse(movie.release_date) : Number.NaN;
      const futureReleasePenalty =
        Number.isFinite(releaseTime) && releaseTime > now.getTime() ? 80 : 0;
      score -= futureReleasePenalty;

      if (releaseYear && releaseYear >= 1980 && releaseYear <= currentYear - 2) {
        score += 20;
      } else if (releaseYear && releaseYear >= currentYear - 1) {
        score -= 20;
      }
    }

    score += Math.min((movie.popularity ?? 0) / 10, 15);

    if (score > bestScore) {
      bestScore = score;
      best = movie;
    }
  }

  return best ?? results.find((r) => r.poster_path) ?? null;
}

function parseSearchTitle(rawTitle: string): { query: string; year?: string } {
  const yearMatch = rawTitle.match(/\((\d{4})\)/);
  const year = yearMatch?.[1];
  let query = rawTitle.replace(/\(\d{4}\)/, "").trim();

  if (/\bor\b/i.test(query)) {
    query = query.split(/\bor\b/i)[0].trim();
  }

  query = query.replace(/\s+PG\)?$/i, "").trim();
  return { query, year };
}

export async function searchTmdbMovie(
  displayTitle: string
): Promise<TmdbMovieResult | null> {
  if (!tmdbConfigured()) return null;

  const { query, year } = parseSearchTitle(displayTitle);
  if (!query) return null;

  try {
    const res = await fetch(buildSearchUrl(query, year), tmdbRequestInit());
    if (!res.ok) {
      console.error("TMDB search failed:", res.status, query);
      return null;
    }

    const data = (await res.json()) as { results?: TmdbMovieResult[] };
    const match = pickBestMatch(data.results ?? [], query, year);
    if (!match) return null;

    const runtime = await fetchTmdbMovieRuntime(match.id);
    return {
      ...match,
      runtime,
    };
  } catch (err) {
    console.error("TMDB search error:", err);
    return null;
  }
}
