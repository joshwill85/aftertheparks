import { CATEGORY_META, getCategoryMeta } from "@/lib/categories/meta";
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
  category: string;
  daypart?: Daypart;
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
  practical: {
    free: number;
    reservation: number;
  };
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
    category: activity.category,
    daypart: activity.daypart,
    free: activity.price.state === "free",
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
    category: offering.category,
    free: offering.price.state === "free",
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
    category: "movies_under_stars",
    daypart: movie.isTonight ? "late" : "evening",
    free: true,
    reservation: false,
    title: movie.displayTitle || movie.movieTitle,
  };
}

const DAYPART_LABELS: Record<Daypart, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  late: "Late",
  anytime: "Anytime",
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
  if (filters.resort && item.resortSlug !== filters.resort) return false;
  if (filters.category && item.category !== filters.category) return false;
  if (filters.daypart && item.daypart !== filters.daypart) return false;
  if (filters.free && !item.free) return false;
  if (filters.reservation && !item.reservation) return false;
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
  if (filters.free && !omit.has("free")) params.set("free", "true");
  if (filters.reservation && !omit.has("reservation")) params.set("reservation", "true");
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
  }));

  const dayparts = DAYPART_ORDER.map((value) => ({
    value,
    label: DAYPART_LABELS[value],
    count: countWith(items, filters, { daypart: value }),
    active: filters.daypart === value,
  })).filter((option) => option.count > 0 || option.active);

  return {
    total: items.filter((item) => itemMatches(item, filters)).length,
    resorts: resorts.map((resort) => ({
      value: resort.slug,
      label: resort.name,
      count: countWith(items, filters, { resort: resort.slug }),
      active: filters.resort === resort.slug,
    })),
    categories,
    dayparts,
    practical: {
      free: countWith(items, filters, { free: true }),
      reservation: countWith(items, filters, { reservation: true }),
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
  if (filters.free) pushRemove("free", "Show paid and free options");
  if (filters.reservation) pushRemove("reservation", "Show no-reservation options");
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
