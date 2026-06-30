import type {
  ActivityFilters,
  ActivityAreaFilter,
  ActivityIntentPreset,
  ActivityNearFilter,
  ActivitySortKey,
  ActivityTransportFilter,
  ActivityWeatherFilter,
  Daypart,
} from "@/lib/types/occurrence";
import type { MovieNightOccurrence } from "@/lib/types/occurrence";
import {
  areaMatchesFilter,
  areaFilterForResort,
  resortAreaMatchesOrigin,
  transportMatchesFilter,
} from "@/lib/explore/routeTaxonomy";
import {
  selectedResortSlugs,
  serializeResortSlugs,
} from "@/lib/explore/resortFilters";
import { isActivityIntentPreset } from "@/lib/planning/presetDefinitions";

export const BROWSE_PARAM_KEYS = [
  "resort",
  "category",
  "preset",
  "daypart",
  "time",
  "near",
  "transport",
  "area",
  "weather",
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

function movieTimeWindow(movie: MovieNightOccurrence): "after_7_pm" | "dinner_window" | undefined {
  const dateTime = movie.startDateTime;
  if (!dateTime) return undefined;
  const zoned = new Date(dateTime).toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [hour, minute] = zoned.split(":").map(Number);
  const minutes = hour * 60 + minute;
  if (minutes >= 19 * 60 && minutes <= 23 * 60 + 59) return "after_7_pm";
  if (minutes >= 17 * 60 && minutes < 19 * 60) return "dinner_window";
  return undefined;
}

function movieDaypart(movie: MovieNightOccurrence): Daypart {
  return movie.isTonight ? "late" : "evening";
}

function movieMatchesPreset(
  movie: MovieNightOccurrence,
  filters: ActivityFilters,
  homeResortSlug?: string
): boolean {
  switch (filters.preset) {
    case "at_my_resort":
      return Boolean(homeResortSlug && movie.resortSlug === homeResortSlug);
    case "nearby_resort_area":
      return Boolean(
        homeResortSlug &&
          resortAreaMatchesOrigin(
            homeResortSlug,
            movie.resortSlug,
            areaFilterForResort(movie.resortSlug)
          )
      );
    case "after_7_pm":
      return movieTimeWindow(movie) === "after_7_pm";
    case "dinner_window":
      return movieTimeWindow(movie) === "dinner_window";
    case "rain_backup":
      return false;
    case "no_booking_required":
      return true;
    case "reservation_needed":
      return false;
    case "little_kids":
      return false;
    case "free_today":
      return movie.isTonight === true || Boolean(movie.startDateTime);
    case "low_transfer":
      return Boolean(
        homeResortSlug &&
          (movie.resortSlug === homeResortSlug ||
            resortAreaMatchesOrigin(
              homeResortSlug,
              movie.resortSlug,
              areaFilterForResort(movie.resortSlug)
            ))
      );
    case undefined:
      return true;
  }
}

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
  const resort = serializeResortSlugs(selectedResortSlugs(get("resort")));
  const presetRaw = get("preset");
  const preset: ActivityIntentPreset | undefined = isActivityIntentPreset(
    presetRaw
  )
    ? presetRaw
    : undefined;
  const nearRaw = get("near");
  const near = VALID_NEAR.has(nearRaw as ActivityNearFilter)
    && selectedResortSlugs(resort).length === 1
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
  return {
    resort,
    category: get("category"),
    daypart,
    preset,
    near,
    transport,
    area,
    weather,
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
      filters.preset ||
      filters.daypart ||
      filters.near ||
      filters.transport ||
      filters.area ||
      filters.weather ||
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
  const selectedResorts = selectedResortSlugs(filters.resort);

  if (filters.near === "my-resort" && selectedResorts.length === 1) {
    const homeResort = selectedResorts[0];
    result = result.filter((m) =>
      resortAreaMatchesOrigin(homeResort, m.resortSlug)
    );
  } else if (selectedResorts.length > 0) {
    const resortSet = new Set(selectedResorts);
    result = result.filter((m) => resortSet.has(m.resortSlug));
  }

  if (filters.category && filters.category !== "movies_under_stars") {
    return [];
  }

  if (filters.daypart) {
    result = result.filter((m) => movieDaypart(m) === filters.daypart);
  }

  if (filters.weather) {
    return [];
  }

  if (filters.reservation) {
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

  if (filters.preset) {
    result = result.filter((m) =>
      movieMatchesPreset(m, filters, selectedResorts[0])
    );
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
