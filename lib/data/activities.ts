import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cachePublicData } from "@/lib/cache/publicData";
import {
  buildCorrectionInsert,
  type CorrectionSubmission,
} from "@/lib/corrections";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  expandOccurrences,
  filterHappeningNow,
  filterToday,
  filterTonight,
} from "@/lib/occurrences/expand";
import { shouldHideActivity } from "@/lib/activityDisplay";
import { canonicalActivitySlug } from "@/lib/activities/legacySlugs";
import { runSearch } from "@/lib/search/runSearch";
import { applyBrowseFilters } from "@/lib/explore/applyBrowseFilters";
import {
  annotateHappeningNow,
  getActivityAvailability,
} from "@/lib/availability";
import {
  fetchGoldActivityOccurrences,
  loadGoldPreviewOccurrences,
} from "@/lib/data/goldActivities";
import { sortActivities } from "@/lib/activities/sort";
import { enrichMovieNightsWithPosters } from "@/lib/movies/posters";
import { movieEndsAt, movieStartsAt } from "@/lib/movies/time";
import { isUsableMovieTitle, sanitizeMovieTitle } from "@/lib/movies/sanitize";
import {
  dedupeOccurrences,
  ensurePublicActivity,
  sanitizePublicActivities,
} from "@/lib/api/publicActivities";
import {
  addOrlandoDays,
  isSameOrlandoDay,
  nowInstant,
  orlandoDateString,
} from "@/lib/daypart";
import type {
  ActivityFilters,
  ActivityOccurrence,
  EnrichmentRow,
  MovieNightOccurrence,
  OccurrenceRuleRow,
  RawActivityRow,
  ResortSummary,
} from "@/lib/types/occurrence";

interface IngestMovieNight {
  day_of_week?: string | null;
  movie_title?: string | null;
  show_time?: string | null;
  rain_backup_location?: string | null;
}

interface IngestActivityRow {
  calendar_group_key?: string;
  resort_slugs?: string[];
  name?: string;
  normalized_name?: string;
  canonical_slug?: string;
  category?: string;
  section?: string;
  location?: string | { label?: string | null } | null;
  schedule_text?: string | null;
  schedule?: {
    text?: string | null;
  } | null;
  field_provenance?: Record<string, unknown> | null;
  source?: {
    url?: string | null;
    documentHash?: string | null;
  } | null;
  source_sha256?: string | null;
  source_url?: string | null;
  trust_state?: string | null;
  movie_nights?: IngestMovieNight[];
}

interface ActivitiesIngestPayload {
  activities?: IngestActivityRow[];
}

const DEMO_RESORTS: ResortSummary[] = [
  {
    id: "demo-1",
    slug: "polynesian-village-resort",
    name: "Polynesian Village Resort",
    category: "deluxe",
    area: "magic_kingdom",
    disneyUrl: "https://disneyworld.disney.go.com/resorts/polynesian-village-resort/",
    activityCount: 12,
    offeringCount: 0,
  },
  {
    id: "demo-2",
    slug: "contemporary-resort",
    name: "Contemporary Resort",
    category: "deluxe",
    area: "magic_kingdom",
    disneyUrl: "https://disneyworld.disney.go.com/resorts/contemporary-resort/",
    activityCount: 14,
    offeringCount: 0,
  },
];

function activitySlugForMovieRow(activity: IngestActivityRow): string | undefined {
  return activity.normalized_name ?? activity.canonical_slug;
}

function movieScheduleTextForRow(activity: IngestActivityRow): string | null | undefined {
  return activity.schedule_text ?? activity.schedule?.text;
}

function movieLocationForRow(activity: IngestActivityRow): string | null | undefined {
  if (typeof activity.location === "string") return activity.location;
  return activity.location?.label;
}

function hasSourceBackedMovieNightFeed(activity: IngestActivityRow): boolean {
  if (!activity.movie_nights?.length) return false;

  const legacyMovieProvenance = activity.field_provenance?.movie_nights;
  if (Array.isArray(legacyMovieProvenance) && legacyMovieProvenance.length > 0) {
    return true;
  }

  const sourceUrl = activity.source_url ?? activity.source?.url;
  const sourceHash = activity.source_sha256 ?? activity.source?.documentHash;
  const sourceBacked =
    activity.trust_state === "source_backed" || activity.trust_state === "reviewed";
  const fieldProvenance = activity.field_provenance ?? {};
  const hasScheduleEvidence = ["title", "schedule", "location"].some((field) => {
    const spans = fieldProvenance[field];
    return Array.isArray(spans) && spans.length > 0;
  });

  return sourceBacked && Boolean(sourceUrl || sourceHash) && hasScheduleEvidence;
}

export const DEFAULT_ACTIVITY_DATA_PIPELINE = "gold-v2";
export const LEGACY_ACTIVITY_DATA_PIPELINE = "legacy-temporal";
export const ALLOW_LEGACY_ACTIVITY_UI_PIPELINE_ENV =
  "ALLOW_LEGACY_ACTIVITY_UI_PIPELINE";

export function activityDataPipeline(): string {
  const requested =
    process.env.ACTIVITY_DATA_PIPELINE ??
    process.env.NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE ??
    DEFAULT_ACTIVITY_DATA_PIPELINE;

  if (requested === "gold-v2" || requested === "gold-v2-preview") {
    return requested;
  }

  if (
    requested === LEGACY_ACTIVITY_DATA_PIPELINE &&
    process.env[ALLOW_LEGACY_ACTIVITY_UI_PIPELINE_ENV] === "1"
  ) {
    return requested;
  }

  return DEFAULT_ACTIVITY_DATA_PIPELINE;
}

function demoOccurrences(): ActivityOccurrence[] {
  const now = new Date();
  const evening = new Date(now);
  evening.setHours(20, 0, 0, 0);
  const campfire = new Date(now);
  campfire.setHours(18, 30, 0, 0);

  return [
    {
      id: "demo-movie",
      activitySlug: "movies-under-the-stars",
      activityCatalogId: "demo-movie",
      resort: {
        slug: "polynesian-village-resort",
        name: "Polynesian Village Resort",
        tier: "Deluxe",
        area: "magic_kingdom",
      },
      title: "Movies Under the Stars",
      summary: "",
      category: "movies_under_stars",
      section: "Evening Entertainment",
      startDateTime: evening.toISOString(),
      endDateTime: new Date(evening.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      daypart: "evening",
      price: { state: "unknown" },
      location: { label: "Great Ceremonial House Lawn" },
      eligibility: { ages: ["all_ages"] },
      freshness: {
        lastVerified: now.toISOString(),
        sourceUrl: "",
        badge: "verified",
      },
      status: "active",
      isHappeningNow: false,
    },
    {
      id: "demo-campfire",
      activitySlug: "campfire",
      activityCatalogId: "demo-campfire",
      resort: {
        slug: "contemporary-resort",
        name: "Contemporary Resort",
        tier: "Deluxe",
        area: "magic_kingdom",
      },
      title: "Evening Campfire",
      summary: "",
      category: "campfire",
      section: "Resort Activities",
      startDateTime: campfire.toISOString(),
      daypart: "evening",
      price: { state: "unknown" },
      location: { label: "Beach" },
      eligibility: { ages: ["all_ages"] },
      freshness: {
        lastVerified: now.toISOString(),
        sourceUrl: "",
        badge: "verified",
      },
      status: "active",
    },
  ];
}

async function fetchRawActivities(): Promise<RawActivityRow[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("v_resort_activities_today")
    .select("*")
    .eq("needs_review", false);

  if (error) {
    console.error("fetchRawActivities:", error.message);
    return [];
  }
  return (data ?? []) as RawActivityRow[];
}

async function fetchEnrichmentMap(): Promise<Map<string, EnrichmentRow>> {
  const supabase = createServiceClient();
  const map = new Map<string, EnrichmentRow>();
  if (!supabase) return map;

  const { data, error } = await supabase
    .from("activity_enrichment")
    .select("*")
    .neq("status", "needs_review");

  if (error) {
    console.error("fetchEnrichmentMap:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.activity_catalog_id, row as EnrichmentRow);
  }
  return map;
}

async function fetchOccurrenceRules(): Promise<OccurrenceRuleRow[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("activity_occurrence_rules")
    .select("*");

  if (error) {
    console.error("fetchOccurrenceRules:", error.message);
    return [];
  }
  return (data ?? []) as OccurrenceRuleRow[];
}

async function fetchResortMeta(): Promise<
  Map<string, { category: string; area: string }>
> {
  const supabase = createServiceClient();
  const map = new Map<string, { category: string; area: string }>();
  if (!supabase) return map;

  const { data } = await supabase.from("resorts").select("slug, category, resort_area");
  for (const r of data ?? []) {
    map.set(r.slug, { category: r.category, area: r.resort_area });
  }
  return map;
}

export const getAllOccurrences = cache(async function getAllOccurrences(
  dateRangeDays = 7
): Promise<ActivityOccurrence[]> {
  const pipeline = activityDataPipeline();
  if (pipeline === "gold-v2-preview") {
    return loadGoldPreviewOccurrences(dateRangeDays);
  }
  if (pipeline === "gold-v2") {
    return fetchGoldActivityOccurrences(dateRangeDays);
  }

  if (!isSupabaseConfigured()) return demoOccurrences();

  const [raw, enrichmentMap, rules, resortMeta] = await Promise.all([
    fetchRawActivities(),
    fetchEnrichmentMap(),
    fetchOccurrenceRules(),
    fetchResortMeta(),
  ]);

  if (raw.length === 0) return demoOccurrences();

  const seen = new Set<string>();
  const all: ActivityOccurrence[] = [];

  for (const row of raw) {
    if (row.needs_review) continue;

    if (
      shouldHideActivity({
        activity_name: row.activity_name,
        category: row.category,
        normalized_name: row.normalized_name,
        description: row.description,
        schedule_text: row.schedule_text,
        parse_confidence: row.parse_confidence,
      })
    ) {
      continue;
    }

    if (seen.has(row.activity_catalog_id)) continue;
    seen.add(row.activity_catalog_id);

    const catalogRules = rules.filter(
      (r) => r.activity_catalog_id === row.activity_catalog_id
    );
    const meta = resortMeta.get(row.resort_slug) ?? {
      category: "moderate",
      area: "unknown",
    };
    const enrichment = enrichmentMap.get(row.activity_catalog_id);
    if (enrichment?.status === "needs_review") continue;

    const expanded = expandOccurrences(
      row,
      catalogRules,
      enrichment,
      meta,
      dateRangeDays
    );
    all.push(...expanded);
  }

  return all;
});

export async function getFilteredActivities(
  filters: ActivityFilters
): Promise<ActivityOccurrence[]> {
  let occurrences = await getAllOccurrences();

  occurrences = occurrences.filter(
    (o) =>
      !shouldHideActivity({
        activity_name: o.title,
        category: o.category,
        normalized_name: o.activitySlug,
        description: o.summary,
        schedule_text: o.scheduleText,
        location: o.location,
        startDateTime: o.startDateTime,
        endDateTime: o.endDateTime,
      })
  );

  occurrences = dedupeOccurrences(occurrences);

  const deduped = new Map<string, ActivityOccurrence>();
  for (const o of occurrences) {
    const key = `${o.activityCatalogId}:${o.resort.slug}`;
    if (!deduped.has(key)) deduped.set(key, o);
  }
  occurrences = Array.from(deduped.values());

  occurrences = applyBrowseFilters(occurrences, filters);

  const limit = filters.limit ?? 100;
  return sanitizePublicActivities(
    occurrences.slice(0, limit),
    { minTier: "medium" }
  );
}

export async function getActivityBySlug(
  slug: string,
  options: { resort?: string } = {}
): Promise<{ activity: ActivityOccurrence; upcoming: ActivityOccurrence[] } | null> {
  const all = await getAllOccurrences(14);
  const canonicalSlug = canonicalActivitySlug(slug);
  const matches = all.filter(
    (o) =>
      o.activitySlug === canonicalSlug &&
      (!options.resort || o.resort.slug === options.resort)
  );
  if (matches.length === 0) return null;

  const now = nowInstant();
  const todayStr = orlandoDateString(now);
  const upcoming = matches
    .filter((o): o is ActivityOccurrence & { startDateTime: string } =>
      Boolean(o.startDateTime)
    )
    .filter((o) => new Date(o.startDateTime) >= now)
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );

  const featured =
    upcoming.find((o) => o.startDateTime && isSameOrlandoDay(o.startDateTime, todayStr)) ??
    upcoming[0] ??
    matches[0];

  return {
    activity: ensurePublicActivity(featured),
    upcoming: sanitizePublicActivities(upcoming.slice(0, 14)),
  };
}

export type ActivityQueryOptions = ActivityFilters;

function filterTodayAvailability(
  activities: ActivityOccurrence[],
  now = nowInstant()
): ActivityOccurrence[] {
  return activities
    .filter((o) => {
      const { state } = getActivityAvailability(o, now);
      return state === "happening_now" || state === "later_today";
    })
    .sort(
      (a, b) =>
        new Date(a.startDateTime ?? 0).getTime() - new Date(b.startDateTime ?? 0).getTime()
    );
}

function filterTonightAvailability(
  activities: ActivityOccurrence[],
  now = nowInstant()
): ActivityOccurrence[] {
  return activities
    .filter((o) => {
      const { state } = getActivityAvailability(o, now);
      const evening =
        o.daypart === "evening" ||
        o.daypart === "late" ||
        o.category === "movies_under_stars" ||
        o.category === "campfire" ||
        o.category === "nighttime_entertainment";
      return (
        state === "tonight" || (state === "happening_now" && evening)
      );
    })
    .sort(
      (a, b) =>
        new Date(a.startDateTime ?? 0).getTime() - new Date(b.startDateTime ?? 0).getTime()
    );
}

function isEveningActivity(activity: ActivityOccurrence): boolean {
  return (
    activity.daypart === "evening" ||
    activity.daypart === "late" ||
    activity.category === "movies_under_stars" ||
    activity.category === "campfire" ||
    activity.category === "nighttime_entertainment"
  );
}

function filterBrowseActivities(
  activities: ActivityOccurrence[],
  filters: ActivityFilters = {}
): ActivityOccurrence[] {
  return sanitizePublicActivities(
    dedupeOccurrences(applyBrowseFilters(activities, filters))
  );
}

export async function getTodayActivities(
  filters: ActivityFilters = {}
): Promise<ActivityOccurrence[]> {
  const all = annotateHappeningNow(await getAllOccurrences(1));
  const today = filterTodayAvailability(all);
  return filterBrowseActivities(today, filters);
}

export async function getTonightActivities(
  filters: ActivityFilters = {}
): Promise<ActivityOccurrence[]> {
  const all = annotateHappeningNow(await getAllOccurrences(1));
  const tonight = filterTonightAvailability(all);
  return filterBrowseActivities(tonight, filters);
}

export async function getEveningActivitiesThisWeek(
  filters: ActivityFilters = {}
): Promise<ActivityOccurrence[]> {
  const now = nowInstant();
  const all = annotateHappeningNow(await getAllOccurrences(7), now);
  const evening = all
    .filter(isEveningActivity)
    .filter((activity) => {
      const { state } = getActivityAvailability(activity, now);
      return state !== "expired" && state !== "uncertain_time";
    });

  return filterBrowseActivities(evening, filters);
}

export async function getHappeningNow(
  filters: ActivityFilters = {}
): Promise<ActivityOccurrence[]> {
  const all = annotateHappeningNow(await getAllOccurrences(1));
  const now = nowInstant();
  const happening = all.filter(
    (o) => getActivityAvailability(o, now).state === "happening_now"
  );
  return filterBrowseActivities(happening, filters);
}

export async function getTomorrowPreview(
  filters: ActivityFilters = {},
  limit = 4
): Promise<ActivityOccurrence[]> {
  const tomorrow = addOrlandoDays(orlandoDateString(nowInstant()), 1);
  const all = annotateHappeningNow(await getAllOccurrences(3));
  const tomorrowOnly = all.filter((o) =>
    o.startDateTime?.startsWith(tomorrow)
  );

  return sanitizePublicActivities(
    dedupeOccurrences(applyBrowseFilters(tomorrowOnly, filters)).slice(
      0,
      limit
    ),
    { minTier: "medium" }
  );
}

export async function getCuratedHomeActivities(options: {
  freeLimit?: number;
  kidsLimit?: number;
} = {}): Promise<{
  freeToday: ActivityOccurrence[];
  littleKids: ActivityOccurrence[];
}> {
  const [today, kidsPool] = await Promise.all([
    getTodayActivities(),
    getFilteredActivities({ category: "arts_crafts", limit: 12 }),
  ]);

  const freeToday = today
    .filter((o) => o.price.state === "free")
    .slice(0, options.freeLimit ?? 6);

  const todayKids = today.filter((o) => o.category === "arts_crafts");
  const littleKids = (
    todayKids.length > 0 ? todayKids : kidsPool
  ).slice(0, options.kidsLimit ?? 4);

  return { freeToday, littleKids };
}

const getResortsFromSupabase = cachePublicData(
  async function getResortsFromSupabase(): Promise<ResortSummary[]> {
    const supabase = createServiceClient();
    if (!supabase) return DEMO_RESORTS;

    const { data: resorts, error } = await supabase
      .from("resorts")
      .select("id, slug, name, category, resort_area, disney_url, sort_order")
      .order("sort_order");

    if (error || !resorts?.length) return DEMO_RESORTS;

    const [
      { data: goldCounts, error: goldCountError },
      { data: offeringCounts },
    ] = await Promise.all([
      supabase
        .from("v_public_activity_gold")
        .select("calendar_group_key, resort_slugs"),
      supabase
        .from("v_public_activity_offerings")
        .select("resort_slug"),
    ]);

    const countMap = new Map<string, number>();
    const goldRows =
      goldCountError || !goldCounts?.length
        ? []
        : (goldCounts as Array<{
            calendar_group_key: string;
            resort_slugs?: string[] | null;
          }>);

    for (const row of goldRows) {
      const slugs =
        row.resort_slugs && row.resort_slugs.length > 0
          ? row.resort_slugs
          : [row.calendar_group_key];
      for (const resortSlug of slugs) {
        countMap.set(resortSlug, (countMap.get(resortSlug) ?? 0) + 1);
      }
    }

    const offeringCountMap = new Map<string, number>();
    for (const c of offeringCounts ?? []) {
      offeringCountMap.set(
        c.resort_slug,
        (offeringCountMap.get(c.resort_slug) ?? 0) + 1
      );
    }

    return resorts.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name.replace(/^Disney's\s+/i, ""),
      category: r.category,
      area: r.resort_area,
      disneyUrl: r.disney_url,
      activityCount: countMap.get(r.slug) ?? 0,
      offeringCount: offeringCountMap.get(r.slug) ?? 0,
    }));
  },
  ["resort-summaries"]
);

export const getResorts = cache(getResortsFromSupabase);

export async function getResortBySlug(slug: string): Promise<ResortSummary | null> {
  const resorts = await getResorts();
  return resorts.find((r) => r.slug === slug) ?? null;
}

export async function searchResorts(
  query: string,
  limit = 12
): Promise<ResortSummary[]> {
  const q = query.trim();
  if (!q) return [];
  const result = await runSearch(q, { limit });
  return result.resorts.slice(0, limit);
}

export async function searchActivities(
  query: string,
  filters: ActivityFilters = {}
): Promise<ActivityOccurrence[]> {
  const q = query.trim();
  if (!q) return getFilteredActivities(filters);

  const result = await runSearch(q, {
    resort: filters.resort,
    category: filters.category,
    daypart: filters.daypart,
    free: filters.free,
    reservation: filters.reservation,
    limit: filters.limit ?? 50,
  });

  return result.activities;
}

export async function getSimilarActivities(
  activity: ActivityOccurrence,
  limit = 4
): Promise<ActivityOccurrence[]> {
  const matches = await getFilteredActivities({
    resort: activity.resort.slug,
    category: activity.category,
    limit: limit + 1,
  });

  return matches
    .filter((item) => item.activitySlug !== activity.activitySlug)
    .slice(0, limit);
}

export async function getActivitiesByArea(
  area: string
): Promise<ActivityOccurrence[]> {
  const [today, tonight] = await Promise.all([
    getTodayActivities(),
    getTonightActivities(),
  ]);

  const seen = new Set<string>();
  const result: ActivityOccurrence[] = [];

  for (const activity of [...today, ...tonight]) {
    if (activity.resort.area !== area) continue;
    const key = activity.activityCatalogId;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(activity);
  }

  return result;
}

export async function getResortActivities(
  slug: string
): Promise<ActivityOccurrence[]> {
  return getFilteredActivities({ resort: slug, limit: 200 });
}

export async function getResortTimeline(
  slug: string,
  dateRangeDays = 31
): Promise<ActivityOccurrence[]> {
  const occurrences = (await getAllOccurrences(dateRangeDays)).filter(
    (activity) => activity.resort.slug === slug
  );

  return sanitizePublicActivities(
    sortActivities(dedupeOccurrences(occurrences), "time"),
    { minTier: "low" }
  );
}

const MOVIE_DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const VALID_MOVIE_TITLES_WITH_SCHEDULE_OR_LOCATION_WORDS = [
  "Freaky Friday",
  "Freakier Friday",
  "Teen Beach Movie",
] as const;
const MOVIE_DAY_PATTERN = MOVIE_DAY_NAMES.join("|");
const MOVIE_LOCATION_WORD_PATTERN = [
  "building",
  "pool",
  "beach",
  "lawn",
  "courtyard",
  "deck",
].join("|");
const MOVIE_SCHEDULE_ONLY_RE = new RegExp(
  `^(?:${MOVIE_DAY_PATTERN})(?:\\s*(?:,|and|&)?\\s*(?:${MOVIE_DAY_PATTERN}))*$`,
  "i"
);
const MOVIE_DAY_FROM_TIME_RE = new RegExp(
  `\\b(?:${MOVIE_DAY_PATTERN})\\b\\s+from\\s+\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)`,
  "i"
);
const MOVIE_LOCATION_FRAGMENT_RE = new RegExp(
  `\\b(?:${MOVIE_LOCATION_WORD_PATTERN})\\b(?:\\s+\\d+)?$`,
  "i"
);

function normalizeMovieDay(value?: string | null): string | null {
  const day = value?.trim().toLowerCase();
  if (!day) return null;
  return MOVIE_DAY_NAMES.includes(day as (typeof MOVIE_DAY_NAMES)[number])
    ? day
    : null;
}

function dayOrder(dayOfWeek: string): number {
  const index = MOVIE_DAY_NAMES.indexOf(
    dayOfWeek.toLowerCase() as (typeof MOVIE_DAY_NAMES)[number]
  );
  return index === -1 ? 99 : index;
}

function normalizeMovieShowTime(value?: string | null): string | null {
  const text = value?.trim();
  if (!text) return null;
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;
  const hour = Number.parseInt(match[1], 10);
  const minute = match[2] ?? "00";
  if (hour < 1 || hour > 12) return null;
  return `${hour}:${minute}${match[3].toUpperCase()}`;
}

function isMovieTonight(dayOfWeek: string): boolean {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  });
  return formatter.format(nowInstant()).toLowerCase() === dayOfWeek.toLowerCase();
}

function isRejectedMovieTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return true;
  if (/^(pg|p|ps|pe|s)$/i.test(normalized)) return true;
  if (
    VALID_MOVIE_TITLES_WITH_SCHEDULE_OR_LOCATION_WORDS.some((validTitle) =>
      normalized.includes(validTitle.toLowerCase())
    )
  ) {
    return false;
  }
  if (MOVIE_SCHEDULE_ONLY_RE.test(title) || MOVIE_DAY_FROM_TIME_RE.test(title)) {
    return true;
  }
  if (/\b(?:am|pm)\b/i.test(title) || /\d{1,2}:\d{2}/.test(title)) return true;
  if (MOVIE_LOCATION_FRAGMENT_RE.test(title)) return true;
  return false;
}

function normalizeMovieLocation(value?: string | null): string | undefined {
  const location = value?.trim();
  if (!location || location.toLowerCase() === "none") return undefined;
  return location
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bAnd\b/g, "and")
    .replace(/\bOf\b/g, "of")
    .replace(/\bThe\b/g, "the");
}

function calendarGroupToResortName(calendarGroupKey?: string): string {
  if (!calendarGroupKey) return "Disney Resort";
  return calendarGroupKey
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const getMovieNights = cache(async function getMovieNights(): Promise<
  MovieNightOccurrence[]
> {
  const ingestPath = path.join(process.cwd(), "data/processed/activity_gold_v2_preview.json");

  let payload: ActivitiesIngestPayload;
  try {
    const parsed = JSON.parse(await readFile(ingestPath, "utf8")) as
      | ActivitiesIngestPayload
      | IngestActivityRow[];
    payload = Array.isArray(parsed) ? { activities: parsed } : parsed;
  } catch (error) {
    console.error("getMovieNights:", error);
    return [];
  }

  const resorts = await getResorts();
  const resortBySlug = new Map(resorts.map((resort) => [resort.slug, resort]));
  const movies: MovieNightOccurrence[] = [];
  const seen = new Set<string>();

  for (const activity of payload.activities ?? []) {
    const activitySlug = activitySlugForMovieRow(activity);
    if (
      activitySlug !== "movie-under-the-stars" &&
      activity.category !== "movies_under_stars"
    ) {
      continue;
    }
    if (!hasSourceBackedMovieNightFeed(activity)) continue;

    const resortSlug = activity.resort_slugs?.[0];
    if (!resortSlug) continue;
    const resort = resortBySlug.get(resortSlug);
    const resortName = resort?.name ?? calendarGroupToResortName(activity.calendar_group_key);
    const location = normalizeMovieLocation(movieLocationForRow(activity));

    for (const night of activity.movie_nights ?? []) {
      const rawTitle = night.movie_title?.trim();
      const dayOfWeek = normalizeMovieDay(night.day_of_week);
      const showTime = normalizeMovieShowTime(
        night.show_time ?? movieScheduleTextForRow(activity)
      );
      if (!rawTitle || !dayOfWeek || !showTime) continue;
      if (!isUsableMovieTitle(rawTitle)) continue;

      const displayTitle = sanitizeMovieTitle(rawTitle);
      if (isRejectedMovieTitle(displayTitle)) continue;

      const key = `${resortSlug}:${dayOfWeek}:${displayTitle}:${showTime}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const startDateTime = movieStartsAt({ dayOfWeek, showTime });
      const endDateTime = movieEndsAt(startDateTime)?.toISOString();

      movies.push({
        id: `movie-${resortSlug}-${dayOfWeek}-${displayTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}`,
        resortSlug,
        resortName,
        movieTitle: rawTitle,
        displayTitle,
        showTime,
        location,
        dayOfWeek,
        startDateTime: startDateTime?.toISOString(),
        endDateTime,
        isTonight: isMovieTonight(dayOfWeek),
      });
    }
  }

  const enriched = await enrichMovieNightsWithPosters(
    movies.sort((a, b) => {
      if (a.isTonight && !b.isTonight) return -1;
      if (!a.isTonight && b.isTonight) return 1;
      return (
        dayOrder(a.dayOfWeek) - dayOrder(b.dayOfWeek) ||
        a.showTime.localeCompare(b.showTime) ||
        a.displayTitle.localeCompare(b.displayTitle)
      );
    })
  );

  return enriched;
});

export async function createPlanShare(
  payload: unknown
): Promise<{ shareSlug: string } | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const shareSlug = crypto.randomUUID().slice(0, 8);
  const { error } = await supabase.from("saved_plans").insert({
    share_slug: shareSlug,
    payload,
  });

  if (error) {
    console.error("createPlanShare:", error.message);
    return null;
  }
  return { shareSlug };
}

export async function getPlanShare(
  shareSlug: string
): Promise<{ payload: unknown; createdAt: string } | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("saved_plans")
    .select("payload, created_at")
    .eq("share_slug", shareSlug)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) return null;
  return { payload: data.payload, createdAt: data.created_at };
}

export async function submitCorrection(
  submission: CorrectionSubmission
): Promise<boolean> {
  const supabase = createServiceClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("content_corrections")
    .insert(buildCorrectionInsert(submission));

  return !error;
}
