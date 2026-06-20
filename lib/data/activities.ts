import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  expandOccurrences,
  filterByDaypart,
  filterHappeningNow,
  filterToday,
  filterTonight,
} from "@/lib/occurrences/expand";
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
    const q = filters.q.toLowerCase();
    occurrences = occurrences.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.resort.name.toLowerCase().includes(q) ||
        o.summary.toLowerCase().includes(q)
    );
  }

  const limit = filters.limit ?? 100;
  return occurrences.slice(0, limit);
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
    activity: upcoming[0] ?? matches[0],
    upcoming: upcoming.slice(0, 14),
  };
}

export async function getTodayActivities(): Promise<ActivityOccurrence[]> {
  const all = await getAllOccurrences(1);
  return filterToday(all);
}

export async function getTonightActivities(): Promise<ActivityOccurrence[]> {
  const all = await getAllOccurrences(1);
  return filterTonight(all);
}

export async function getHappeningNow(): Promise<ActivityOccurrence[]> {
  const all = await getAllOccurrences(1);
  return filterHappeningNow(all);
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

export async function getResortActivities(
  slug: string
): Promise<ActivityOccurrence[]> {
  return getFilteredActivities({ resort: slug, limit: 200 });
}

export async function searchActivities(
  query: string,
  filters: ActivityFilters = {}
): Promise<ActivityOccurrence[]> {
  const supabase = createServiceClient();
  if (!supabase || !query.trim()) {
    return getFilteredActivities({ ...filters, q: query });
  }

  const { data, error } = await supabase.rpc("search_activities", {
    query_text: query,
    filters: {
      resort: filters.resort ?? null,
      category: filters.category ?? null,
      limit: filters.limit ?? 50,
    },
  });

  if (error || !data?.length) {
    return getFilteredActivities({ ...filters, q: query });
  }

  const slugs = new Set(
    (data as { normalized_name: string }[]).map((d) => d.normalized_name)
  );
  const all = await getAllOccurrences();
  const unique = new Map<string, ActivityOccurrence>();
  for (const o of all) {
    if (slugs.has(o.activitySlug) && !unique.has(o.activitySlug)) {
      unique.set(o.activitySlug, o);
    }
  }
  return Array.from(unique.values());
}

export async function getMovieNights(): Promise<MovieNightOccurrence[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("movie_nights")
    .select(
      "id, day_of_week, movie_title, show_time, location, activity_id, resort_activities!inner(normalized_name)"
    );

  if (error) {
    console.error("getMovieNights:", error.message);
    return [];
  }

  const resorts = await getResorts();
  const defaultResort = resorts[0];

  return (data ?? []).map((mn) => ({
    id: mn.id,
    resortSlug: defaultResort?.slug ?? "unknown",
    resortName: defaultResort?.name ?? "Resort",
    movieTitle: mn.movie_title,
    showTime: mn.show_time ?? "20:00:00",
    location: mn.location ?? undefined,
    dayOfWeek: mn.day_of_week,
  }));
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
