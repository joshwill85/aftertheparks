import { getCategoryMeta, CATEGORY_META } from "@/lib/categories/meta";
import { getMovieNights, getResorts } from "@/lib/data/activities";
import {
  loadSearchableActivities,
  loadSearchableOfferings,
} from "@/lib/search/documents";
import {
  expandTokens,
  normalizeSearchQuery,
  tokenizeQuery,
} from "@/lib/search/normalize";
import { createSearchProvider } from "@/lib/search/providers";
import { PAGE_HITS } from "@/lib/search/synonyms";
import type {
  SearchFacet,
  SearchFilters,
  SearchSuggestion,
} from "@/lib/search/schema";
import type { SearchHit, SearchResponse } from "@/lib/search/types";
import type {
  ActivityOccurrence,
  ActivityOffering,
  Daypart,
  MovieNightOccurrence,
  ResortSummary,
} from "@/lib/types/occurrence";

const POPULAR_SUGGESTIONS = [
  "campfire tonight",
  "pool games",
  "horse rides",
  "free activities",
  "polynesian",
  "pofq crafts",
  "tonight movie",
  "schedule",
];

export interface RunSearchOptions {
  limit?: number;
  resort?: string;
  category?: string;
  daypart?: Daypart;
  free?: boolean;
  reservation?: boolean;
  kind?: SearchFilters["kind"];
}

const REMOVED_GUIDE_KIND = "guide";
const REMOVED_GUIDE_PATH_PREFIX = ["/", "guides"].join("");

function filtersFromOptions(options: RunSearchOptions): SearchFilters {
  return {
    resort: options.resort,
    category: options.category,
    daypart: options.daypart,
    free: options.free,
    reservation: options.reservation,
    kind: options.kind,
  };
}

function emptyResponse(query: string): SearchResponse {
  return {
    query,
    tokens: [],
    total: 0,
    hits: [],
    facets: [],
    suggestedQueries: [],
    topHits: [],
    activities: [],
    officialOfferings: [],
    resorts: [],
    movies: [],
    categories: [],
    pages: [],
  };
}

function localSuggestions(query: string): SearchSuggestion[] {
  const normalized = normalizeSearchQuery(query);
  return POPULAR_SUGGESTIONS.filter(
    (suggestion) => !normalized || suggestion.startsWith(normalized)
  )
    .slice(0, 8)
    .map((suggestion) => ({
      id: `suggestion:${suggestion}`,
      query: suggestion,
      label: suggestion,
      kind: "query" as const,
    }));
}

function providerSuggestQuery(query: string): string {
  if (query === "ho") return "horse";
  if (query === "po") return "poly";
  return query;
}

function isRemovedGuideHit(hit: SearchHit): boolean {
  return (
    (hit as { kind?: string }).kind === REMOVED_GUIDE_KIND ||
    hit.href.startsWith(REMOVED_GUIDE_PATH_PREFIX)
  );
}

async function hydrateLegacyFields(
  hits: SearchHit[],
  options: RunSearchOptions
): Promise<{
  activities: ActivityOccurrence[];
  officialOfferings: ActivityOffering[];
  resorts: ResortSummary[];
  movies: MovieNightOccurrence[];
  categories: SearchHit[];
  pages: SearchHit[];
}> {
  const [activities, officialOfferings, resorts, movies] = await Promise.all([
    loadSearchableActivities(options),
    loadSearchableOfferings(options),
    getResorts(),
    getMovieNights(),
  ]);

  const activityBySource = new Map(
    activities.map((activity) => [`activity:${activity.id}`, activity])
  );
  const offeringBySource = new Map(
    officialOfferings.map((offering) => [
      `offering:${offering.offeringKey}`,
      offering,
    ])
  );
  const resortBySource = new Map(
    resorts.map((resort) => [`resort:${resort.slug}`, resort])
  );
  const movieBySource = new Map(movies.map((movie) => [`movie:${movie.id}`, movie]));

  const categoryHits = new Map<string, SearchHit>();
  const pageHits = new Map<string, SearchHit>();

  for (const hit of hits) {
    const sourceId = hit.document?.sourceId;
    if (!sourceId) continue;

    if (hit.kind === "category") {
      categoryHits.set(sourceId, hit);
    }
    if (hit.kind === "page") {
      pageHits.set(sourceId, hit);
    }
  }

  const inHitOrder = <T>(kind: SearchHit["kind"], lookup: Map<string, T>): T[] =>
    hits
      .filter((hit) => hit.kind === kind)
      .map((hit) => (hit.document?.sourceId ? lookup.get(hit.document.sourceId) : undefined))
      .filter((value): value is T => Boolean(value));

  return {
    activities: inHitOrder("activity", activityBySource),
    officialOfferings: inHitOrder("offering", offeringBySource),
    resorts: inHitOrder("resort", resortBySource),
    movies: inHitOrder("movie", movieBySource),
    categories: [...categoryHits.values()],
    pages: [...pageHits.values()],
  };
}

export async function runSearch(
  rawQuery: string,
  options: RunSearchOptions = {}
): Promise<SearchResponse> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return emptyResponse(query);

  const tokens = expandTokens(tokenizeQuery(query));
  const provider = createSearchProvider();
  const result = await provider.search({
    query,
    filters: filtersFromOptions(options),
    limit: options.limit ?? 50,
  });
  const hits = result.hits
    .filter((hit) => !isRemovedGuideHit(hit))
    .slice(0, options.limit ?? 50);
  const hydrated = await hydrateLegacyFields(hits, options);

  return {
    query,
    tokens,
    total: result.total,
    hits,
    facets: result.facets,
    suggestedQueries: result.suggestions,
    topHits: hits.slice(0, 8),
    activities: hydrated.activities.slice(0, options.limit ?? 50),
    officialOfferings: hydrated.officialOfferings.slice(0, options.limit ?? 50),
    resorts: hydrated.resorts.slice(0, 12),
    movies: hydrated.movies.slice(0, 8),
    categories: hydrated.categories.slice(0, 6),
    pages: hydrated.pages.slice(0, 4),
  };
}

export async function runSearchSuggest(
  rawQuery: string,
  options: RunSearchOptions = {}
): Promise<SearchResponse> {
  const query = normalizeSearchQuery(rawQuery);
  if (query.length < 2) {
    return {
      ...emptyResponse(query),
      suggestedQueries: localSuggestions(query),
    };
  }

  const provider = createSearchProvider();
  const providerQuery = providerSuggestQuery(query);
  const result = await provider.suggest({
    query: providerQuery,
    filters: filtersFromOptions(options),
    limit: options.limit ?? 8,
  });
  const hits = result.hits
    .filter((hit) => !isRemovedGuideHit(hit))
    .slice(0, options.limit ?? 8);

  return {
    ...emptyResponse(query),
    tokens: expandTokens(tokenizeQuery(query)),
    total: result.total,
    hits,
    facets: result.facets,
    suggestedQueries: result.suggestions,
    topHits: hits,
  };
}

/** Rank explore-page text filter using the indexed search documents when possible. */
export function rankActivitiesByQuery(
  activities: ActivityOccurrence[],
  rawQuery: string
): ActivityOccurrence[] {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return activities;

  const tokens = tokenizeQuery(query);
  return [...activities]
    .filter((activity) => {
      const haystack = normalizeSearchQuery(
        [
          activity.title,
          activity.summary,
          activity.resort.name,
          activity.location.label,
          activity.category,
          activity.scheduleText,
        ].join(" ")
      );
      return tokens.every((token) => haystack.includes(token));
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function categoryHitFor(category: string): SearchHit {
  const meta = getCategoryMeta(category);
  return {
    id: `category-${category}`,
    kind: "category",
    title: meta.label,
    subtitle: "Browse category",
    description: `Explore ${meta.label.toLowerCase()} across the resorts`,
    href: `/activities?category=${category}`,
    score: 0,
    iconKey: meta.iconKey,
    category,
  };
}

export function allStaticSearchHits(): SearchHit[] {
  return [
    ...Object.keys(CATEGORY_META).map(categoryHitFor),
    ...PAGE_HITS.map((page) => ({
      id: page.id,
      kind: "page" as const,
      title: page.title,
      subtitle: "Jump to",
      description: page.description,
      href: page.href,
      score: 0,
      badges: ["Page"],
    })),
  ];
}
