import { CATEGORY_META, getCategoryMeta } from "@/lib/categories/meta";
import {
  AREA_LABELS,
  AREA_OPTIONS,
  TRANSPORT_LABELS,
  TRANSPORT_OPTIONS,
  areaFilterForResort,
  areaMatchesFilter,
  resortAreaMatchesOrigin,
  transportMatchesFilter,
} from "@/lib/explore/routeTaxonomy";
import { DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG, type WeatherFit } from "@/lib/seo/fit";
import type {
  ActivityFilters,
  ActivityOffering,
  ActivityOccurrence,
  Daypart,
  MovieNightOccurrence,
} from "@/lib/types/occurrence";

type ResortOption = { slug: string; name: string };

export interface FilterableItem {
  id: string;
  resortSlug: string;
  resortArea?: string;
  category: string;
  daypart?: Daypart;
  durationMinutes?: number;
  weatherFit?: WeatherFit;
  parkTicketRequired?: boolean;
  free: boolean;
  reservation: boolean;
  title?: string;
}

export interface ActiveFilterChip {
  id: string;
  label: string;
  removeHref: string;
}

export interface CountOption {
  value: string;
  label: string;
  count: number;
  active: boolean;
}

export interface FilterImpact {
  total: number;
  resorts: CountOption[];
  categories: CountOption[];
  dayparts: CountOption[];
  duration: CountOption[];
  weather: CountOption[];
  transport: CountOption[];
  areas: CountOption[];
  practical: {
    free: number;
    reservation: number;
    noParkTicket: number;
  };
}

const WEATHER_LABELS: Record<NonNullable<ActivityFilters["weather"]>, string> = {
  indoor: "Indoor",
  covered: "Covered",
};

const WEATHER_OPTIONS: NonNullable<ActivityFilters["weather"]>[] = [
  "indoor",
  "covered",
];
const DURATION_LABELS: Record<NonNullable<ActivityFilters["duration"]>, string> = {
  short: "Short activity",
};
const DURATION_OPTIONS: NonNullable<ActivityFilters["duration"]>[] = ["short"];

function weatherFitFromText(item: {
  title?: string;
  category?: string;
  summary?: string;
  location?: string;
  tags?: string[];
  amenities?: string[];
  weatherDependency?: string;
}): WeatherFit | undefined {
  const text = [
    item.title,
    item.category,
    item.summary,
    item.location,
    item.weatherDependency,
    ...(item.tags ?? []),
    ...(item.amenities ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/\bindoor\b|arcade|community hall|lobby|animation|learn to draw/.test(text)) {
    return "indoor";
  }
  if (/\bcovered\b|porch|pavilion|under cover|covered walkway/.test(text)) {
    return "covered";
  }
  if (/weather|outdoor|movie|campfire|pool|trail|surrey/.test(text)) {
    return "outdoor_weather_dependent";
  }
  return undefined;
}

function weatherMatches(
  item: FilterableItem,
  weather: NonNullable<ActivityFilters["weather"]>
): boolean {
  return item.weatherFit === weather;
}

function durationMatches(
  item: FilterableItem,
  duration: NonNullable<ActivityFilters["duration"]>
): boolean {
  if (duration !== "short") return true;
  if (typeof item.durationMinutes === "number") return item.durationMinutes <= 45;

  const text = [item.title, item.category].filter(Boolean).join(" ").toLowerCase();
  if (/movie|fireworks|cruise|tour|trail|surrey/.test(text)) return false;
  return /campfire|arcade|craft|trivia|game|scavenger|lobby|drawing|animation/.test(text);
}

function requiresParkTicketFromText(item: {
  title?: string;
  category?: string;
  summary?: string;
  section?: string;
  location?: string;
  priceNotes?: string;
  tags?: string[];
  amenities?: string[];
}): boolean {
  const text = [
    item.title,
    item.category,
    item.summary,
    item.section,
    item.location,
    item.priceNotes,
    ...(item.tags ?? []),
    ...(item.amenities ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    /valid (theme )?park admission|requires? (valid )?(theme )?park admission|park ticket required|theme park ticket|required admission/.test(
      text
    ) ||
    /\binside (magic kingdom|epcot|hollywood studios|animal kingdom) park\b/.test(text) ||
    /\b(magic kingdom|epcot|hollywood studios|animal kingdom) park\b/.test(text)
  );
}

export interface FilterRecoveryAction {
  label: string;
  href: string;
  intent: "primary" | "secondary";
}

export function activityToFilterableItem(activity: ActivityOccurrence): FilterableItem {
  return {
    id: activity.id,
    resortSlug: activity.resort.slug,
    resortArea: activity.resort.area,
    category: activity.category,
    daypart: activity.daypart,
    durationMinutes: activity.enrichment?.durationMinutes,
    free: activity.price.state === "free",
    parkTicketRequired: requiresParkTicketFromText({
      title: activity.title,
      category: activity.category,
      summary: activity.summary,
      section: activity.section,
      location: activity.location.label,
      priceNotes: activity.price.notes,
    }),
    weatherFit:
      DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG[activity.activitySlug]?.weatherFit ??
      weatherFitFromText({
        title: activity.title,
        category: activity.category,
        weatherDependency: activity.enrichment?.weatherDependency,
      }),
    reservation: Boolean(
      activity.eligibility.reservation?.required ||
        activity.enrichment?.reservationRequired ||
        activity.enrichment?.reservationRecommended
    ),
    title: activity.title,
  };
}

export function offeringToFilterableItem(offering: ActivityOffering): FilterableItem {
  return {
    id: offering.id,
    resortSlug: offering.resort.slug,
    resortArea: offering.resort.area,
    category: offering.category,
    durationMinutes: undefined,
    free: offering.price.state === "free",
    parkTicketRequired: requiresParkTicketFromText({
      title: offering.title,
      category: offering.category,
      summary: offering.summary,
      location: offering.location.label,
      priceNotes: offering.price.notes,
      tags: offering.tags,
      amenities: offering.amenities,
    }),
    weatherFit:
      DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG[offering.activitySlug]?.weatherFit ??
      weatherFitFromText({
        title: offering.title,
        category: offering.category,
        summary: offering.summary,
        location: offering.location.label,
        tags: offering.tags,
        amenities: offering.amenities,
      }),
    reservation: Boolean(
      offering.booking?.reservationRequired || offering.booking?.reservationRecommended
    ),
    title: offering.title,
  };
}

export function movieToFilterableItem(movie: MovieNightOccurrence): FilterableItem {
  return {
    id: movie.id,
    resortSlug: movie.resortSlug,
    resortArea: areaFilterForResort(movie.resortSlug),
    category: "movies_under_stars",
    daypart: movie.isTonight ? "late" : "evening",
    durationMinutes: 90,
    free: true,
    parkTicketRequired: false,
    weatherFit: DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG["movies-under-the-stars"]?.weatherFit,
    reservation: false,
    title: movie.displayTitle || movie.movieTitle,
  };
}

const DAYPART_LABELS: Record<Daypart, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  late: "Late",
  anytime: "All Day",
};

const DAYPART_ORDER: Daypart[] = ["morning", "afternoon", "evening", "late", "anytime"];

function queryMatches(item: FilterableItem, q?: string): boolean {
  const normalized = q?.trim().toLowerCase();
  if (!normalized) return true;
  return [item.title, item.category, item.resortSlug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function itemMatches(item: FilterableItem, filters: ActivityFilters): boolean {
  if (filters.near === "my-resort" && filters.resort) {
    if (!resortAreaMatchesOrigin(filters.resort, item.resortSlug, item.resortArea)) {
      return false;
    }
  } else if (filters.resort && item.resortSlug !== filters.resort) {
    return false;
  }
  if (filters.category && item.category !== filters.category) return false;
  if (filters.daypart && item.daypart !== filters.daypart) return false;
  if (filters.duration && !durationMatches(item, filters.duration)) return false;
  if (
    filters.transport &&
    !transportMatchesFilter(item.resortSlug, item.resortArea, filters.transport)
  ) {
    return false;
  }
  if (filters.area && !areaMatchesFilter(item.resortSlug, item.resortArea, filters.area)) {
    return false;
  }
  if (filters.weather && !weatherMatches(item, filters.weather)) return false;
  if (filters.free && !item.free) return false;
  if (filters.reservation && !item.reservation) return false;
  if (
    filters.ticketRequired !== undefined &&
    Boolean(item.parkTicketRequired) !== filters.ticketRequired
  ) {
    return false;
  }
  return queryMatches(item, filters.q);
}

function countWith(
  items: FilterableItem[],
  filters: ActivityFilters,
  override: Partial<ActivityFilters>
): number {
  const next = { ...filters, ...override };
  return items.filter((item) => itemMatches(item, next)).length;
}

function hrefWithout(
  basePath: string,
  filters: ActivityFilters,
  keys: (keyof ActivityFilters)[]
): string {
  const params = new URLSearchParams();
  const omit = new Set(keys);
  if (filters.resort && !omit.has("resort")) params.set("resort", filters.resort);
  if (filters.category && !omit.has("category")) params.set("category", filters.category);
  if (filters.daypart && !omit.has("daypart")) params.set("daypart", filters.daypart);
  if (filters.duration && !omit.has("duration")) params.set("duration", filters.duration);
  if (filters.near && !omit.has("near")) params.set("near", filters.near);
  if (filters.transport && !omit.has("transport")) params.set("transport", filters.transport);
  if (filters.area && !omit.has("area")) params.set("area", filters.area);
  if (filters.weather && !omit.has("weather")) params.set("weather", filters.weather);
  if (filters.free && !omit.has("free")) params.set("free", "true");
  if (filters.reservation && !omit.has("reservation")) params.set("reservation", "true");
  if (filters.ticketRequired !== undefined && !omit.has("ticketRequired")) {
    params.set("ticket_required", String(filters.ticketRequired));
  }
  if (filters.q && !omit.has("q")) params.set("q", filters.q);
  if (filters.sort && filters.sort !== "time" && !omit.has("sort")) {
    params.set("sort", filters.sort);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function resortName(resorts: ResortOption[], slug: string): string {
  return resorts.find((resort) => resort.slug === slug)?.name ?? slug;
}

export function buildActiveFilterChips(
  filters: ActivityFilters,
  resorts: ResortOption[],
  basePath: string
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.resort) {
    chips.push({
      id: "resort",
      label: resortName(resorts, filters.resort),
      removeHref: hrefWithout(basePath, filters, ["resort"]),
    });
  }
  if (filters.category) {
    chips.push({
      id: "category",
      label: getCategoryMeta(filters.category).label,
      removeHref: hrefWithout(basePath, filters, ["category"]),
    });
  }
  if (filters.daypart) {
    chips.push({
      id: "daypart",
      label: DAYPART_LABELS[filters.daypart],
      removeHref: hrefWithout(basePath, filters, ["daypart"]),
    });
  }
  if (filters.duration) {
    chips.push({
      id: "duration",
      label: DURATION_LABELS[filters.duration],
      removeHref: hrefWithout(basePath, filters, ["duration"]),
    });
  }
  if (filters.near === "my-resort" && filters.resort) {
    chips.push({
      id: "near",
      label: "Near my resort",
      removeHref: hrefWithout(basePath, filters, ["near"]),
    });
  }
  if (filters.transport) {
    chips.push({
      id: "transport",
      label: TRANSPORT_LABELS[filters.transport],
      removeHref: hrefWithout(basePath, filters, ["transport"]),
    });
  }
  if (filters.area) {
    chips.push({
      id: "area",
      label: AREA_LABELS[filters.area],
      removeHref: hrefWithout(basePath, filters, ["area"]),
    });
  }
  if (filters.weather) {
    chips.push({
      id: "weather",
      label: WEATHER_LABELS[filters.weather],
      removeHref: hrefWithout(basePath, filters, ["weather"]),
    });
  }
  if (filters.free) {
    chips.push({
      id: "free",
      label: "Free only",
      removeHref: hrefWithout(basePath, filters, ["free"]),
    });
  }
  if (filters.reservation) {
    chips.push({
      id: "reservation",
      label: "Reservations",
      removeHref: hrefWithout(basePath, filters, ["reservation"]),
    });
  }
  if (filters.ticketRequired !== undefined) {
    chips.push({
      id: "ticket_required",
      label: filters.ticketRequired ? "Park ticket required" : "No park ticket",
      removeHref: hrefWithout(basePath, filters, ["ticketRequired"]),
    });
  }
  if (filters.q) {
    chips.push({
      id: "q",
      label: `Search: ${filters.q}`,
      removeHref: hrefWithout(basePath, filters, ["q"]),
    });
  }

  return chips;
}

export function buildFilterImpact(
  items: FilterableItem[],
  filters: ActivityFilters,
  resorts: ResortOption[]
): FilterImpact {
  const categories = Object.entries(CATEGORY_META).map(([value, meta]) => ({
    value,
    label: meta.label,
    count: countWith(items, filters, { category: value }),
    active: filters.category === value,
  })).filter((option) => option.count > 0 || option.active);

  const dayparts = DAYPART_ORDER.map((value) => ({
    value,
    label: DAYPART_LABELS[value],
    count: countWith(items, filters, { daypart: value }),
    active: filters.daypart === value,
  })).filter((option) => option.count > 0 || option.active);
  const duration = DURATION_OPTIONS.map((value) => ({
    value,
    label: DURATION_LABELS[value],
    count: countWith(items, filters, { duration: value }),
    active: filters.duration === value,
  })).filter((option) => option.count > 0 || option.active);
  const weather = WEATHER_OPTIONS.map((value) => ({
    value,
    label: WEATHER_LABELS[value],
    count: countWith(items, filters, { weather: value }),
    active: filters.weather === value,
  })).filter((option) => option.count > 0 || option.active);
  const transport = TRANSPORT_OPTIONS.map((value) => ({
    value,
    label: TRANSPORT_LABELS[value],
    count: countWith(items, filters, { transport: value }),
    active: filters.transport === value,
  })).filter((option) => option.count > 0 || option.active);
  const areas = AREA_OPTIONS.map((value) => ({
    value,
    label: AREA_LABELS[value],
    count: countWith(items, filters, { area: value }),
    active: filters.area === value,
  })).filter((option) => option.count > 0 || option.active);

  return {
    total: items.filter((item) => itemMatches(item, filters)).length,
    resorts: resorts.map((resort) => ({
      value: resort.slug,
      label: resort.name,
      count: countWith(items, filters, { resort: resort.slug }),
      active: filters.resort === resort.slug,
    })).filter((option) => option.count > 0 || option.active),
    categories,
    dayparts,
    duration,
    weather,
    transport,
    areas,
    practical: {
      free: countWith(items, filters, { free: true }),
      reservation: countWith(items, filters, { reservation: true }),
      noParkTicket: countWith(items, filters, { ticketRequired: false }),
    },
  };
}

export function buildNoResultsRecovery(
  filters: ActivityFilters,
  resorts: ResortOption[],
  basePath: string
): FilterRecoveryAction[] {
  const actions: FilterRecoveryAction[] = [];
  const pushRemove = (
    key: keyof ActivityFilters,
    label: string,
    intent: FilterRecoveryAction["intent"] = actions.length === 0 ? "primary" : "secondary"
  ) => {
    actions.push({ label, href: hrefWithout(basePath, filters, [key]), intent });
  };

  if (filters.category) pushRemove("category", `Remove ${getCategoryMeta(filters.category).label}`);
  if (filters.resort) pushRemove("resort", `Remove ${resortName(resorts, filters.resort)}`);
  if (filters.daypart) pushRemove("daypart", `Remove ${DAYPART_LABELS[filters.daypart]}`);
  if (filters.duration) pushRemove("duration", `Remove ${DURATION_LABELS[filters.duration]}`);
  if (filters.near) pushRemove("near", "Remove near my resort");
  if (filters.transport) pushRemove("transport", `Remove ${TRANSPORT_LABELS[filters.transport]}`);
  if (filters.area) pushRemove("area", `Remove ${AREA_LABELS[filters.area]}`);
  if (filters.weather) pushRemove("weather", `Remove ${WEATHER_LABELS[filters.weather]}`);
  if (filters.free) pushRemove("free", "Show paid and free options");
  if (filters.reservation) pushRemove("reservation", "Show no-reservation options");
  if (filters.ticketRequired !== undefined) {
    pushRemove(
      "ticketRequired",
      filters.ticketRequired ? "Show no-ticket options" : "Show ticketed options"
    );
  }
  if (filters.q) pushRemove("q", "Clear search text");

  actions.push({ label: "Clear all filters", href: basePath, intent: "secondary" });
  actions.push({ label: "Browse tonight", href: "/tonight", intent: "secondary" });
  actions.push({ label: "Explore all activities", href: "/activities", intent: "secondary" });

  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.href)) return false;
    seen.add(action.href);
    return true;
  });
}
