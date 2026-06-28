import {
  dedupeOccurrences,
  sanitizePublicActivities,
} from "@/lib/api/publicActivities";
import { activityDetailHref } from "@/lib/activities/links";
import { occurrenceToDisplayInput, shouldHideActivity } from "@/lib/activityDisplay";
import { getCategoryMeta, CATEGORY_META } from "@/lib/categories/meta";
import {
  getAllOccurrences,
  getMovieNights,
  getResorts,
} from "@/lib/data/activities";
import {
  fetchOfficialActivityOfferings,
  filterOfficialOfferingsWithoutActivityCollisions,
} from "@/lib/data/officialOfferings";
import { loadGoldPreviewOccurrences } from "@/lib/data/goldActivities";
import { GUIDES } from "@/lib/guides";
import { formatResortArea } from "@/lib/resorts/display";
import { DOMAIN_ALIASES } from "@/lib/search/domainAliases";
import { PAGE_HITS } from "@/lib/search/synonyms";
import type { SearchDocument } from "@/lib/search/schema";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  ActivityOffering,
  ActivityOccurrence,
  MovieNightOccurrence,
  ResortSummary,
} from "@/lib/types/occurrence";
import { formatResortTier } from "@/lib/utils";

interface BuildSearchDocumentOptions {
  resort?: string;
  category?: string;
  daypart?: string;
  free?: boolean;
  reservation?: boolean;
}

export function normalizeTitleSort(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function uniqueStrings(values: ReadonlyArray<string | undefined | null>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = normalizeTitleSort(value ?? "");
    if (normalized) seen.add(normalized);
  }
  return [...seen];
}

function containsAny(value: string, terms: readonly string[]): boolean {
  const normalized = normalizeTitleSort(value);
  return terms.some((term) => normalized.includes(normalizeTitleSort(term)));
}

function reservationStateFromActivity(
  activity: ActivityOccurrence
): SearchDocument["reservationState"] {
  if (
    activity.eligibility.reservation?.required ||
    activity.enrichment?.reservationRequired
  ) {
    return "required";
  }
  if (activity.enrichment?.reservationRecommended) return "recommended";
  return "not_required";
}

function reservationStateFromOffering(
  offering: ActivityOffering
): SearchDocument["reservationState"] {
  if (offering.booking?.reservationRequired) return "required";
  if (offering.booking?.reservationRecommended) return "recommended";
  return "not_required";
}

function categoryAliases(category: string): string[] {
  const meta = getCategoryMeta(category);
  const aliases: string[] = [category, meta.label, meta.stamp];
  if (category === "poolside") aliases.push(...DOMAIN_ALIASES.activities.pool);
  if (category === "campfire") aliases.push(...DOMAIN_ALIASES.activities.campfire);
  if (category === "arts_crafts") aliases.push(...DOMAIN_ALIASES.activities.crafts);
  if (category === "movies_under_stars") aliases.push(...DOMAIN_ALIASES.activities.movies);
  if (category === "arcade") aliases.push(...DOMAIN_ALIASES.activities.arcade);
  if (category === "fitness_wellness") aliases.push(...DOMAIN_ALIASES.activities.fitness);
  return aliases;
}

function horseAliasesForText(text: string): string[] {
  const triggers = DOMAIN_ALIASES.horse.filter((term) => term !== "ranch");
  return containsAny(text, triggers) ? [...DOMAIN_ALIASES.horse] : [];
}

function priceAliases(priceState?: SearchDocument["priceState"]): string[] {
  return priceState === "free" ? [...DOMAIN_ALIASES.free] : [];
}

function resortNicknameAliases(resortName: string, resortSlug?: string): string[] {
  const haystack = normalizeTitleSort(`${resortName} ${resortSlug ?? ""}`);
  const aliases: string[] = [];
  for (const [alias, name] of Object.entries(DOMAIN_ALIASES.resorts)) {
    const target = normalizeTitleSort(name.replace(/^Disney's\s+/i, ""));
    if (haystack.includes(target)) aliases.push(alias);
  }
  return aliases;
}

export async function loadSearchableActivities(
  options: BuildSearchDocumentOptions
): Promise<ActivityOccurrence[]> {
  let occurrences = await getAllOccurrences();
  if (occurrences.length === 0) {
    occurrences = await loadGoldPreviewOccurrences();
  }

  occurrences = occurrences.filter((activity) => {
    if (activity.status === "paused") return false;
    return !shouldHideActivity(occurrenceToDisplayInput(activity));
  });

  occurrences = dedupeOccurrences(occurrences);

  const bestByCatalog = new Map<string, ActivityOccurrence>();
  for (const occurrence of occurrences) {
    const key = `${occurrence.activityCatalogId}:${occurrence.resort.slug}`;
    const current = bestByCatalog.get(key);
    if (!current) {
      bestByCatalog.set(key, occurrence);
      continue;
    }
    if (occurrence.isHappeningNow && !current.isHappeningNow) {
      bestByCatalog.set(key, occurrence);
      continue;
    }
    if (
      occurrence.startDateTime &&
      (!current.startDateTime ||
        new Date(occurrence.startDateTime).getTime() <
          new Date(current.startDateTime).getTime())
    ) {
      bestByCatalog.set(key, occurrence);
    }
  }
  occurrences = [...bestByCatalog.values()];

  if (options.resort) {
    occurrences = occurrences.filter((o) => o.resort.slug === options.resort);
  }
  if (options.category) {
    occurrences = occurrences.filter((o) => o.category === options.category);
  }
  if (options.daypart) {
    occurrences = occurrences.filter((o) => o.daypart === options.daypart);
  }
  if (options.free) {
    occurrences = occurrences.filter((o) => o.price.state === "free");
  }
  if (options.reservation) {
    occurrences = occurrences.filter(
      (o) => reservationStateFromActivity(o) !== "not_required"
    );
  }

  return sanitizePublicActivities(occurrences, { minTier: "medium" });
}

export async function loadSearchableOfferings(
  options: BuildSearchDocumentOptions
): Promise<ActivityOffering[]> {
  let offerings = await fetchOfficialActivityOfferings();
  if (offerings.length === 0) {
    offerings = await loadOfficialOfferingPreview();
  }
  offerings = offerings.filter((offering) => offering.status !== "paused");

  if (options.resort) {
    offerings = offerings.filter((offering) => offering.resort.slug === options.resort);
  }
  if (options.category) {
    offerings = offerings.filter((offering) => offering.category === options.category);
  }
  if (options.daypart) {
    offerings = [];
  }
  if (options.free) {
    offerings = offerings.filter((offering) => offering.price.state === "free");
  }
  if (options.reservation) {
    offerings = offerings.filter(
      (offering) => reservationStateFromOffering(offering) !== "not_required"
    );
  }

  const seen = new Map<string, ActivityOffering>();
  for (const offering of offerings) {
    if (!seen.has(offering.offeringKey)) seen.set(offering.offeringKey, offering);
  }
  return [...seen.values()];
}

async function loadOfficialOfferingPreview(): Promise<ActivityOffering[]> {
  const file = path.join(process.cwd(), "data/processed/official_recreation_offerings.json");
  try {
    const payload = JSON.parse(await readFile(file, "utf8")) as {
      offerings?: Array<Record<string, any>>;
    };
    return (payload.offerings ?? []).map((row): ActivityOffering => {
      const resortSlug = String(row.resort_slug ?? "unknown-resort");
      const resortName = String(
        row.resort_name ??
          resortSlug
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ")
      ).replace(/^Disney's\s+/i, "");
      const booking = row.booking ?? {};
      return {
        id: String(row.id ?? row.offering_key ?? row.program_key),
        activitySlug: String(row.program_key ?? row.activitySlug ?? row.title),
        activityCatalogId: String(row.program_key ?? row.activityCatalogId ?? row.title),
        offeringKey: String(row.offering_key ?? row.program_key ?? row.title),
        resort: {
          slug: resortSlug,
          name: resortName,
          tier: formatResortTier(String(row.resort_category ?? "unknown")),
          area: String(row.resort_area ?? "unknown"),
        },
        title: String(row.title ?? row.program_key ?? "Official offering"),
        summary: String(row.description ?? ""),
        category: String(row.category ?? "resort_activity"),
        tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
        availability: {
          kind: row.availability?.kind ?? "evergreen_all_day",
          hoursState: row.availability?.hours_state ?? row.availability?.hoursState,
          label: row.availability?.label,
        },
        price: {
          state: row.price?.state ?? "unknown",
          notes: row.price?.notes,
          amountCents: row.price?.amountCents ?? row.price?.amount_cents,
          minAmountCents: row.price?.minAmountCents ?? row.price?.min_amount_cents,
          maxAmountCents: row.price?.maxAmountCents ?? row.price?.max_amount_cents,
          priceBasis: row.price?.priceBasis ?? row.price?.price_basis,
          taxNotes: row.price?.taxNotes ?? row.price?.tax_notes,
        },
        location: {
          label: row.location?.label ?? row.location?.value ?? resortName,
          lat: row.location?.lat,
          lng: row.location?.lng,
        },
        booking: {
          reservationRequired:
            booking.reservationRequired ?? booking.reservation_required ?? undefined,
          reservationRecommended:
            booking.reservationRecommended ?? booking.reservation_recommended ?? undefined,
          cancellationNoticeHours:
            booking.cancellationNoticeHours ?? booking.cancellation_notice_hours ?? undefined,
          method: booking.method,
          phone: booking.phone,
          url: booking.url,
        },
        eligibility: {
          ages: row.eligibility?.ages ?? ["all_ages"],
          resortGuestOnly:
            row.eligibility?.resortGuestOnly ?? row.eligibility?.resort_guest_only,
        },
        amenities: Array.isArray(row.amenities) ? row.amenities.map(String) : [],
        freshness: {
          lastVerified: new Date().toISOString(),
          sourceUrl: String(row.source_url ?? ""),
          badge: row.source_sha256 ? "verified" : "stale",
        },
        trustState: row.trust_state ?? "source_backed",
        status: row.status ?? "active",
      };
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("loadOfficialOfferingPreview:", error);
    }
    return [];
  }
}

function activityDocument(activity: ActivityOccurrence): SearchDocument {
  const categoryMeta = getCategoryMeta(activity.category);
  const text = [
    activity.title,
    activity.summary,
    activity.location.label,
    activity.resort.name,
    activity.scheduleText,
    categoryMeta.label,
  ].join(" ");
  const reservationState = reservationStateFromActivity(activity);

  return {
    id: `activity:${activity.id}`,
    objectID: `activity:${activity.id}`,
    kind: "activity",
    title: activity.title,
    titleSort: normalizeTitleSort(activity.title),
    subtitle: activity.resort.name,
    description: activity.summary,
    href: activityDetailHref(activity.activitySlug, activity.resort.slug),
    aliases: uniqueStrings([
      ...categoryAliases(activity.category),
      ...horseAliasesForText(text),
      ...priceAliases(activity.price.state),
      activity.activitySlug.replace(/-/g, " "),
    ]),
    keywords: uniqueStrings([
      activity.title,
      activity.summary,
      activity.location.label,
      activity.scheduleText,
      activity.section,
      activity.resort.name,
    ]),
    resortSlug: activity.resort.slug,
    resortName: activity.resort.name,
    resortArea: activity.resort.area,
    resortTier: activity.resort.tier,
    category: activity.category,
    categoryLabel: categoryMeta.label,
    locationLabel: activity.location.label,
    daypart: activity.daypart,
    scheduleText: activity.scheduleText,
    priceState: activity.price.state,
    reservationState,
    isHappeningNow: Boolean(activity.isHappeningNow),
    sourceId: `activity:${activity.id}`,
  };
}

function offeringDocument(offering: ActivityOffering): SearchDocument {
  const categoryMeta = getCategoryMeta(offering.category);
  const text = [
    offering.title,
    offering.summary,
    offering.location.label,
    offering.resort.name,
    offering.tags.join(" "),
    categoryMeta.label,
  ].join(" ");
  const reservationState = reservationStateFromOffering(offering);

  return {
    id: `offering:${offering.offeringKey}`,
    objectID: `offering:${offering.offeringKey}`,
    kind: "offering",
    title: offering.title,
    titleSort: normalizeTitleSort(offering.title),
    subtitle: offering.resort.name,
    description: offering.summary,
    href: `/resorts/${offering.resort.slug}#official-offerings`,
    aliases: uniqueStrings([
      ...categoryAliases(offering.category),
      ...horseAliasesForText(text),
      ...priceAliases(offering.price.state),
      offering.activitySlug.replace(/-/g, " "),
      ...offering.tags,
      ...offering.amenities,
    ]),
    keywords: uniqueStrings([
      offering.title,
      offering.summary,
      offering.location.label,
      offering.availability.label,
      offering.resort.name,
      ...offering.tags,
      ...offering.amenities,
    ]),
    resortSlug: offering.resort.slug,
    resortName: offering.resort.name,
    resortArea: offering.resort.area,
    resortTier: offering.resort.tier,
    category: offering.category,
    categoryLabel: categoryMeta.label,
    locationLabel: offering.location.label,
    priceState: offering.price.state,
    reservationState,
    sourceId: `offering:${offering.offeringKey}`,
  };
}

function resortDocument(resort: ResortSummary): SearchDocument {
  return {
    id: `resort:${resort.slug}`,
    objectID: `resort:${resort.slug}`,
    kind: "resort",
    title: resort.name,
    titleSort: normalizeTitleSort(resort.name),
    subtitle: `${formatResortTier(resort.category)} - ${formatResortArea(resort.area)}`,
    description: `${resort.activityCount} scheduled activities and ${resort.offeringCount} official offerings`,
    href: `/resorts/${resort.slug}`,
    aliases: uniqueStrings([
      ...resortNicknameAliases(resort.name, resort.slug),
      resort.slug.replace(/-/g, " "),
      formatResortTier(resort.category),
      formatResortArea(resort.area),
    ]),
    keywords: uniqueStrings([resort.name, resort.category, resort.area, resort.slug]),
    resortSlug: resort.slug,
    resortName: resort.name,
    resortArea: resort.area,
    resortTier: resort.category,
    sourceId: `resort:${resort.slug}`,
  };
}

function movieDocument(movie: MovieNightOccurrence): SearchDocument {
  const title = movie.displayTitle || movie.movieTitle;
  return {
    id: `movie:${movie.id}`,
    objectID: `movie:${movie.id}`,
    kind: "movie",
    title,
    titleSort: normalizeTitleSort(title),
    subtitle: movie.resortName,
    description: [movie.dayOfWeek, movie.showTime, movie.location].filter(Boolean).join(" - "),
    href: "/tonight",
    aliases: uniqueStrings([
      ...DOMAIN_ALIASES.activities.movies,
    ]),
    keywords: uniqueStrings([
      title,
      movie.movieTitle,
      movie.resortName,
      movie.location,
      movie.dayOfWeek,
      movie.showTime,
    ]),
    resortSlug: movie.resortSlug,
    resortName: movie.resortName,
    category: "movies_under_stars",
    categoryLabel: getCategoryMeta("movies_under_stars").label,
    locationLabel: movie.location,
    scheduleText: `${movie.dayOfWeek} ${movie.showTime}`,
    isTonight: Boolean(movie.isTonight),
    sourceId: `movie:${movie.id}`,
  };
}

export async function buildSearchDocuments(
  options: BuildSearchDocumentOptions = {}
): Promise<SearchDocument[]> {
  const [activities, allOfferings, resorts, movies] = await Promise.all([
    loadSearchableActivities(options),
    loadSearchableOfferings(options),
    getResorts(),
    getMovieNights(),
  ]);

  const offerings = filterOfficialOfferingsWithoutActivityCollisions(
    allOfferings,
    activities
  );

  const documents: SearchDocument[] = [
    ...activities.map(activityDocument),
    ...offerings.map(offeringDocument),
    ...resorts.map(resortDocument),
    ...movies.map(movieDocument),
    ...GUIDES.map((guide) => ({
      id: `guide:${guide.slug}`,
      objectID: `guide:${guide.slug}`,
      kind: "guide" as const,
      title: guide.title,
      titleSort: normalizeTitleSort(guide.title),
      subtitle: "Planning guide",
      description: guide.description,
      href: guide.href,
      aliases: uniqueStrings(guide.keywords),
      keywords: uniqueStrings([guide.title, guide.description, ...guide.keywords]),
      sourceId: `guide:${guide.slug}`,
    })),
    ...Object.entries(CATEGORY_META).map(([category, meta]) => ({
      id: `category:${category}`,
      objectID: `category:${category}`,
      kind: "category" as const,
      title: meta.label,
      titleSort: normalizeTitleSort(meta.label),
      subtitle: "Browse category",
      description: `Explore ${meta.label.toLowerCase()} across the resorts`,
      href: `/activities?category=${category}`,
      aliases: uniqueStrings(categoryAliases(category)),
      keywords: uniqueStrings([category, meta.label, meta.stamp, ...(meta.mood ?? [])]),
      category,
      categoryLabel: meta.label,
      sourceId: `category:${category}`,
    })),
    ...PAGE_HITS.map((page) => ({
      id: page.id.replace(/^page-/, "page:"),
      objectID: page.id.replace(/^page-/, "page:"),
      kind: "page" as const,
      title: page.title,
      titleSort: normalizeTitleSort(page.title),
      subtitle: "Jump to",
      description: page.description,
      href: page.href,
      aliases: uniqueStrings([
        ...page.keywords,
        ...(page.href === "/activities" ? DOMAIN_ALIASES.schedule : []),
      ]),
      keywords: uniqueStrings([
        page.title,
        page.description,
        ...page.keywords,
        ...(page.href === "/activities" ? DOMAIN_ALIASES.schedule : []),
      ]),
      sourceId: page.id.replace(/^page-/, "page:"),
    })),
  ];

  const seen = new Map<string, SearchDocument>();
  for (const document of documents) {
    if (!seen.has(document.objectID)) seen.set(document.objectID, document);
  }
  return [...seen.values()];
}
