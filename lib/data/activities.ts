import { formatInTimeZone } from "date-fns-tz";
import { enrichMovieNightsWithPosters } from "@/lib/movies/posters";
import { isUsableMovieTitle, sanitizeMovieTitle } from "@/lib/movies/sanitize";
import { TIMEZONE } from "@/lib/daypart";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  expandOccurrences,
  filterByDaypart,
  filterHappeningNow,
  filterToday,
  filterTonight,
} from "@/lib/occurrences/expand";
import { shouldHideActivity } from "@/lib/activityDisplay";
import { rankActivitiesByQuery, runSearch } from "@/lib/search/runSearch";
import { sortActivities, type ActivitySortKey } from "@/lib/activities/sort";
import {
  annotateHappeningNow,
  getActivityAvailability,
} from "@/lib/availability";
import { sanitizePublicActivities, ensurePublicActivity, dedupeOccurrences } from "@/lib/api/publicActivities";
import {
  addOrlandoDays,
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

const DEMO_RESORTS: ResortSummary[] = [
  {
    id: "demo-1",
    slug: "polynesian-village-resort",
    name: "Polynesian Village Resort",
    category: "deluxe",
    area: "magic_kingdom",
    disneyUrl: "https://disneyworld.disney.go.com/resorts/polynesian-village-resort/",
    activityCount: 12,
  },
  {
    id: "demo-2",
    slug: "contemporary-resort",
    name: "Contemporary Resort",
    category: "deluxe",
    area: "magic_kingdom",
    disneyUrl: "https://disneyworld.disney.go.com/resorts/contemporary-resort/",
    activityCount: 14,
  },
];

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
      summary:
        "Catch a classic film on the lawn as the lagoon breeze rolls in. Bring a blanket and settle in after your park day.",
      category: "movies_under_stars",
      section: "Evening Entertainment",
      startDateTime: evening.toISOString(),
      endDateTime: new Date(evening.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      daypart: "evening",
      price: { state: "free" },
      location: { label: "Great Ceremonial House Lawn" },
      eligibility: { ages: ["all_ages"] },
      freshness: {
        lastVerified: now.toISOString(),
        sourceUrl: "https://aftertheparks.com/data-sources",
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
      summary:
        "Gather around the fire pit for songs, stories, and s'mores kits available for purchase nearby.",
      category: "campfire",
      section: "Resort Activities",
      startDateTime: campfire.toISOString(),
      daypart: "evening",
      price: { state: "free", notes: "S'mores kits sold separately" },
      location: { label: "Beach" },
      eligibility: { ages: ["all_ages"] },
      freshness: {
        lastVerified: now.toISOString(),
        sourceUrl: "https://aftertheparks.com/data-sources",
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

export async function getAllOccurrences(
  dateRangeDays = 7
): Promise<ActivityOccurrence[]> {
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
}

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

  if (filters.resort) {
    occurrences = occurrences.filter((o) => o.resort.slug === filters.resort);
  }
  if (filters.category) {
    occurrences = occurrences.filter((o) => o.category === filters.category);
  }
  if (filters.daypart) {
    occurrences = filterByDaypart(occurrences, filters.daypart);
  }
  if (filters.free) {
    occurrences = occurrences.filter((o) => o.price.state === "free");
  }
  if (filters.q) {
    occurrences = rankActivitiesByQuery(occurrences, filters.q);
  }

  const sortKey = (filters.sort ?? "time") as ActivitySortKey;
  occurrences = sortActivities(occurrences, sortKey);

  const limit = filters.limit ?? 100;
  return sanitizePublicActivities(
    occurrences.slice(0, limit),
    { minTier: "medium" }
  );
}

export async function getActivityBySlug(
  slug: string
): Promise<{ activity: ActivityOccurrence; upcoming: ActivityOccurrence[] } | null> {
  const all = await getAllOccurrences(14);
  const matches = all.filter((o) => o.activitySlug === slug);
  if (matches.length === 0) return null;

  const now = new Date();
  const upcoming = matches
    .filter((o) => new Date(o.startDateTime) >= now)
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );

  return {
    activity: ensurePublicActivity(upcoming[0] ?? matches[0]),
    upcoming: sanitizePublicActivities(upcoming.slice(0, 14)),
  };
}

export interface ActivityQueryOptions {
  resort?: string;
}

function filterByResort(
  activities: ActivityOccurrence[],
  resort?: string
): ActivityOccurrence[] {
  if (!resort) return activities;
  return activities.filter((o) => o.resort.slug === resort);
}

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
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
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
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );
}

export async function getTodayActivities(
  options: ActivityQueryOptions = {}
): Promise<ActivityOccurrence[]> {
  const all = annotateHappeningNow(await getAllOccurrences(1));
  const today = filterTodayAvailability(all);
  return sanitizePublicActivities(
    dedupeOccurrences(filterByResort(today, options.resort))
  );
}

export async function getTonightActivities(
  options: ActivityQueryOptions = {}
): Promise<ActivityOccurrence[]> {
  const all = annotateHappeningNow(await getAllOccurrences(1));
  const tonight = filterTonightAvailability(all);
  return sanitizePublicActivities(
    dedupeOccurrences(filterByResort(tonight, options.resort))
  );
}

export async function getHappeningNow(
  options: ActivityQueryOptions = {}
): Promise<ActivityOccurrence[]> {
  const all = annotateHappeningNow(await getAllOccurrences(1));
  const now = nowInstant();
  const happening = all.filter(
    (o) => getActivityAvailability(o, now).state === "happening_now"
  );
  return sanitizePublicActivities(
    dedupeOccurrences(filterByResort(happening, options.resort))
  );
}

export async function getTomorrowPreview(
  options: ActivityQueryOptions = {},
  limit = 4
): Promise<ActivityOccurrence[]> {
  const tomorrow = addOrlandoDays(orlandoDateString(nowInstant()), 1);
  const all = annotateHappeningNow(await getAllOccurrences(3));
  const tomorrowOnly = all.filter((o) =>
    o.startDateTime.startsWith(tomorrow)
  );

  return sanitizePublicActivities(
    dedupeOccurrences(filterByResort(tomorrowOnly, options.resort)).slice(
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

  const littleKids = kidsPool.slice(0, options.kidsLimit ?? 4);

  return { freeToday, littleKids };
}

export async function getResorts(): Promise<ResortSummary[]> {
  const supabase = createServiceClient();
  if (!supabase) return DEMO_RESORTS;

  const { data: resorts, error } = await supabase
    .from("resorts")
    .select("id, slug, name, category, resort_area, disney_url, sort_order")
    .order("sort_order");

  if (error || !resorts?.length) return DEMO_RESORTS;

  const { data: counts } = await supabase
    .from("v_resort_activities_today")
    .select("resort_slug")
    .eq("needs_review", false);

  const countMap = new Map<string, number>();
  for (const c of counts ?? []) {
    countMap.set(c.resort_slug, (countMap.get(c.resort_slug) ?? 0) + 1);
  }

  return resorts.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name.replace(/^Disney's\s+/i, ""),
    category: r.category,
    area: r.resort_area,
    disneyUrl: r.disney_url,
    activityCount: countMap.get(r.slug) ?? 0,
  }));
}

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

export async function getMovieNights(): Promise<MovieNightOccurrence[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const [{ data, error }, { data: resortRows }] = await Promise.all([
    supabase
      .from("movie_nights")
      .select(
        "id, day_of_week, movie_title, show_time, location, parse_confidence, activity_catalog_id"
      )
      .gte("parse_confidence", 0.5),
    supabase
      .from("v_resort_activities_today")
      .select("activity_catalog_id, resort_slug, resort_name")
      .eq("needs_review", false),
  ]);

  if (error) {
    console.error("getMovieNights:", error.message);
    return [];
  }

  const resortByCatalog = new Map<
    string,
    { resort_slug: string; resort_name: string }
  >();
  for (const row of resortRows ?? []) {
    if (row.activity_catalog_id && !resortByCatalog.has(row.activity_catalog_id)) {
      resortByCatalog.set(row.activity_catalog_id, {
        resort_slug: row.resort_slug,
        resort_name: row.resort_name,
      });
    }
  }

  const tonightDay = formatInTimeZone(new Date(), TIMEZONE, "EEEE").toLowerCase();

  const mapped: MovieNightOccurrence[] = [];

  for (const mn of data ?? []) {
    if (!isUsableMovieTitle(mn.movie_title)) continue;
    const displayTitle = sanitizeMovieTitle(mn.movie_title);
    const resort = mn.activity_catalog_id
      ? resortByCatalog.get(mn.activity_catalog_id)
      : undefined;
    if (!resort) continue;

    mapped.push({
      id: mn.id,
      resortSlug: resort.resort_slug,
      resortName: resort.resort_name.replace(/^Disney's\s+/i, ""),
      movieTitle: mn.movie_title,
      displayTitle,
      showTime: mn.show_time ?? "20:00:00",
      location: mn.location ?? undefined,
      dayOfWeek: mn.day_of_week,
      isTonight: mn.day_of_week === tonightDay,
    });
  }

  mapped.sort((a, b) => {
      if (a.isTonight !== b.isTonight) return a.isTonight ? -1 : 1;
      const dayOrder = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      return dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
    });

  return enrichMovieNightsWithPosters(mapped);
}

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
  activityCatalogId: string | null,
  field: string,
  suggestedValue: string
): Promise<boolean> {
  const supabase = createServiceClient();
  if (!supabase) return false;

  const { error } = await supabase.from("content_corrections").insert({
    activity_catalog_id: activityCatalogId,
    field,
    suggested_value: suggestedValue,
  });

  return !error;
}
