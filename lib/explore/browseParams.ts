import type {
  ActivityFilters,
  ActivityAreaFilter,
  ActivityDurationFilter,
  ActivityNearFilter,
  ActivitySortKey,
  ActivityTransportFilter,
  ActivityWeatherFilter,
  Daypart,
} from "@/lib/types/occurrence";
import type { MovieNightOccurrence } from "@/lib/types/occurrence";
import {
  areaMatchesFilter,
  resortAreaMatchesOrigin,
  transportMatchesFilter,
} from "@/lib/explore/routeTaxonomy";

export const BROWSE_PARAM_KEYS = [
  "resort",
  "category",
  "daypart",
  "time",
  "duration",
  "near",
  "transport",
  "area",
  "weather",
  "free",
  "reservation",
  "ticket_required",
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

const VALID_SORT: ActivitySortKey[] = [
  "time",
  "alpha",
  "free",
  "paid",
  "resort",
  "category",
  "quality",
];
const VALID_WEATHER = new Set<ActivityWeatherFilter>(["indoor", "covered"]);
const VALID_DURATION = new Set<ActivityDurationFilter>(["short"]);
const VALID_NEAR = new Set<ActivityNearFilter>(["my-resort"]);
const VALID_TRANSPORT = new Set<ActivityTransportFilter>([
  "monorail",
  "skyliner",
  "boat",
  "walk",
  "bus",
  "rideshare",
]);
const VALID_AREA = new Set<ActivityAreaFilter>([
  "magic-kingdom",
  "epcot-boardwalk",
  "skyliner",
  "animal-kingdom",
  "disney-springs",
  "fort-wilderness",
]);

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

  const daypartRaw = get("daypart") ?? get("time");
  const daypart = VALID_DAYPARTS.has(daypartRaw as Daypart)
    ? (daypartRaw as Daypart)
    : undefined;

  const sortRaw = get("sort") as ActivitySortKey | undefined;
  const sort =
    sortRaw && VALID_SORT.includes(sortRaw) ? sortRaw : undefined;
  const weatherRaw = get("weather");
  const weather = VALID_WEATHER.has(weatherRaw as ActivityWeatherFilter)
    ? (weatherRaw as ActivityWeatherFilter)
    : undefined;
  const durationRaw = get("duration");
  const duration = VALID_DURATION.has(durationRaw as ActivityDurationFilter)
    ? (durationRaw as ActivityDurationFilter)
    : undefined;
  const resort = get("resort");
  const nearRaw = get("near");
  const near = VALID_NEAR.has(nearRaw as ActivityNearFilter)
    && Boolean(resort)
    ? (nearRaw as ActivityNearFilter)
    : undefined;
  const transportRaw = get("transport");
  const transport = VALID_TRANSPORT.has(transportRaw as ActivityTransportFilter)
    ? (transportRaw as ActivityTransportFilter)
    : undefined;
  const areaRaw = get("area");
  const area = VALID_AREA.has(areaRaw as ActivityAreaFilter)
    ? (areaRaw as ActivityAreaFilter)
    : undefined;
  const ticketRequiredRaw = get("ticket_required");
  const ticketRequired =
    ticketRequiredRaw === "false"
      ? false
      : ticketRequiredRaw === "true"
        ? true
        : undefined;

  return {
    resort,
    category: get("category"),
    daypart,
    duration,
    near,
    transport,
    area,
    weather,
    free: get("free") === "true",
    reservation: get("reservation") === "true",
    ticketRequired,
    sort: sort ?? "time",
    q: get("q"),
  };
}

export function preserveBrowseParams(
  searchParams: URLSearchParams
): URLSearchParams {
  const out = new URLSearchParams();
  const hasResort = Boolean(searchParams.get("resort"));
  for (const key of BROWSE_PARAM_KEYS) {
    if (key === "near" && !hasResort) continue;
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
      filters.duration ||
      filters.near ||
      filters.transport ||
      filters.area ||
      filters.weather ||
      filters.free ||
      filters.reservation ||
      filters.ticketRequired !== undefined ||
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

  if (filters.near === "my-resort" && filters.resort) {
    result = result.filter((m) =>
      resortAreaMatchesOrigin(filters.resort!, m.resortSlug)
    );
  } else if (filters.resort) {
    result = result.filter((m) => m.resortSlug === filters.resort);
  }

  if (filters.category && filters.category !== "movies_under_stars") {
    return [];
  }

  if (filters.transport) {
    result = result.filter((m) =>
      transportMatchesFilter(m.resortSlug, undefined, filters.transport!)
    );
  }

  if (filters.area) {
    result = result.filter((m) => areaMatchesFilter(m.resortSlug, undefined, filters.area!));
  }

  if (filters.duration === "short") {
    return [];
  }

  if (filters.ticketRequired === true) {
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
