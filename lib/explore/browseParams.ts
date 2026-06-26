import type { ActivityFilters, ActivitySortKey, Daypart } from "@/lib/types/occurrence";
import type { MovieNightOccurrence } from "@/lib/types/occurrence";

export const BROWSE_PARAM_KEYS = [
  "resort",
  "category",
  "daypart",
  "free",
  "reservation",
  "sort",
  "q",
] as const;

export const BROWSE_PATHS = ["/today", "/tonight", "/activities"] as const;

export type BrowsePath = (typeof BROWSE_PATHS)[number];

const VALID_DAYPARTS = new Set<Daypart>([
  "morning",
  "afternoon",
  "evening",
  "late",
  "anytime",
]);

const VALID_SORT: ActivitySortKey[] = ["time", "resort", "category", "quality"];

export function isBrowsePath(pathname: string): pathname is BrowsePath {
  return (BROWSE_PATHS as readonly string[]).includes(pathname);
}

export function parseBrowseParams(
  input: Record<string, string | undefined> | URLSearchParams
): ActivityFilters {
  const get = (key: string): string | undefined => {
    if (input instanceof URLSearchParams) {
      return input.get(key) ?? undefined;
    }
    return input[key];
  };

  const daypartRaw = get("daypart");
  const daypart = VALID_DAYPARTS.has(daypartRaw as Daypart)
    ? (daypartRaw as Daypart)
    : undefined;

  const sortRaw = get("sort") as ActivitySortKey | undefined;
  const sort =
    sortRaw && VALID_SORT.includes(sortRaw) ? sortRaw : undefined;

  return {
    resort: get("resort"),
    category: get("category"),
    daypart,
    free: get("free") === "true",
    reservation: get("reservation") === "true",
    sort: sort ?? "time",
    q: get("q"),
  };
}

export function preserveBrowseParams(
  searchParams: URLSearchParams
): URLSearchParams {
  const out = new URLSearchParams();
  for (const key of BROWSE_PARAM_KEYS) {
    const value = searchParams.get(key);
    if (value) out.set(key, value);
  }
  return out;
}

export function buildBrowseHref(
  path: string,
  searchParams: URLSearchParams | string
): string {
  const params =
    typeof searchParams === "string"
      ? preserveBrowseParams(new URLSearchParams(searchParams))
      : preserveBrowseParams(searchParams);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function hasActiveBrowseFilters(filters: ActivityFilters): boolean {
  return Boolean(
    filters.resort ||
      filters.category ||
      filters.daypart ||
      filters.free ||
      filters.reservation ||
      filters.q
  );
}

/** Merge current browse filters into a mood-chip target without dropping resort. */
export function mergeMoodChipHref(
  chipHref: string,
  pathname: string,
  searchParams: URLSearchParams
): string {
  if (!isBrowsePath(pathname)) return chipHref;

  const chipUrl = new URL(chipHref, "https://aftertheparks.local");
  const merged = preserveBrowseParams(searchParams);
  chipUrl.searchParams.forEach((value, key) => {
    if ((BROWSE_PARAM_KEYS as readonly string[]).includes(key)) {
      merged.set(key, value);
    }
  });
  const qs = merged.toString();
  return qs ? `${chipUrl.pathname}?${qs}` : chipUrl.pathname;
}

export function resolveBrowseNavHref(
  targetPath: string,
  currentPath: string,
  searchParams: URLSearchParams
): string {
  if (
    isBrowsePath(currentPath) &&
    (BROWSE_PATHS as readonly string[]).includes(targetPath)
  ) {
    return buildBrowseHref(targetPath, searchParams);
  }
  return targetPath;
}

export function filterMovieNights(
  movies: MovieNightOccurrence[],
  filters: ActivityFilters
): MovieNightOccurrence[] {
  let result = movies;

  if (filters.resort) {
    result = result.filter((m) => m.resortSlug === filters.resort);
  }

  if (filters.category && filters.category !== "movies_under_stars") {
    return [];
  }

  if (filters.q) {
    const q = filters.q.trim().toLowerCase();
    if (q) {
      result = result.filter((m) => {
        const haystack = [
          m.movieTitle,
          m.displayTitle,
          m.resortName,
          m.location,
          m.dayOfWeek,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
  }

  return result;
}
