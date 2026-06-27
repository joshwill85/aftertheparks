import {
  dedupeOccurrences,
  sanitizePublicActivities,
} from "@/lib/api/publicActivities";
import { shouldHideActivity, occurrenceToDisplayInput } from "@/lib/activityDisplay";
import { getCategoryMeta, CATEGORY_META } from "@/lib/categories/meta";
import {
  getAllOccurrences,
  getMovieNights,
  getResorts,
} from "@/lib/data/activities";
import { GUIDES } from "@/lib/guides";
import {
  expandTokens,
  normalizeSearchQuery,
  tokenizeQuery,
} from "@/lib/search/normalize";
import {
  activityToHit,
  guideToHit,
  movieToHit,
  offeringToHit,
  resortToHit,
  scoreActivity,
  scoreCategory,
  scoreGuide,
  scoreMovie,
  scoreOffering,
  scorePage,
  scoreResort,
} from "@/lib/search/score";
import { PAGE_HITS } from "@/lib/search/synonyms";
import type { SearchHit, SearchResponse } from "@/lib/search/types";
import type { ActivityOffering, ActivityOccurrence, Daypart } from "@/lib/types/occurrence";
import { filterByDaypart } from "@/lib/occurrences/expand";
import {
  fetchOfficialActivityOfferings,
  filterOfficialOfferingsWithoutActivityCollisions,
} from "@/lib/data/officialOfferings";

const MIN_SCORE = 18;

export interface RunSearchOptions {
  limit?: number;
  resort?: string;
  category?: string;
  daypart?: Daypart;
  free?: boolean;
  reservation?: boolean;
}

function emptyResponse(query: string): SearchResponse {
  return {
    query,
    tokens: [],
    total: 0,
    topHits: [],
    activities: [],
    officialOfferings: [],
    resorts: [],
    guides: [],
    movies: [],
    categories: [],
    pages: [],
  };
}

async function loadSearchableOfferings(
  options: RunSearchOptions
): Promise<ActivityOffering[]> {
  let offerings = await fetchOfficialActivityOfferings();

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
      (offering) =>
        offering.booking?.reservationRequired ||
        offering.booking?.reservationRecommended
    );
  }

  const seen = new Map<string, ActivityOffering>();
  for (const offering of offerings) {
    if (!seen.has(offering.offeringKey)) {
      seen.set(offering.offeringKey, offering);
    }
  }

  return Array.from(seen.values());
}

function pickBestOccurrencePerCatalog(
  occurrences: ActivityOccurrence[]
): ActivityOccurrence[] {
  const byCatalog = new Map<string, ActivityOccurrence[]>();
  for (const occurrence of occurrences) {
    const key = `${occurrence.activityCatalogId}:${occurrence.resort.slug}`;
    const list = byCatalog.get(key) ?? [];
    list.push(occurrence);
    byCatalog.set(key, list);
  }

  return [...byCatalog.values()].map((group) =>
    [...group].sort((a, b) => {
      if (a.isHappeningNow && !b.isHappeningNow) return -1;
      if (!a.isHappeningNow && b.isHappeningNow) return 1;
      if (!a.startDateTime && !b.startDateTime) return 0;
      if (!a.startDateTime) return 1;
      if (!b.startDateTime) return -1;
      return (
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
      );
    })[0]
  );
}

async function loadSearchableActivities(
  options: RunSearchOptions
): Promise<ActivityOccurrence[]> {
  let occurrences = await getAllOccurrences();

  occurrences = occurrences.filter((activity) => {
    if (activity.status === "paused") return false;
    return !shouldHideActivity(occurrenceToDisplayInput(activity));
  });

  occurrences = dedupeOccurrences(occurrences);
  occurrences = pickBestOccurrencePerCatalog(occurrences);

  if (options.resort) {
    occurrences = occurrences.filter((o) => o.resort.slug === options.resort);
  }

  if (options.category) {
    occurrences = occurrences.filter((o) => o.category === options.category);
  }

  if (options.daypart) {
    occurrences = filterByDaypart(occurrences, options.daypart);
  }

  if (options.free) {
    occurrences = occurrences.filter((o) => o.price.state === "free");
  }

  if (options.reservation) {
    occurrences = occurrences.filter(
      (o) =>
        o.eligibility.reservation?.required ||
        o.enrichment?.reservationRequired ||
        o.enrichment?.reservationRecommended
    );
  }

  return sanitizePublicActivities(occurrences, { minTier: "medium" });
}

export async function runSearch(
  rawQuery: string,
  options: RunSearchOptions = {}
): Promise<SearchResponse> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return emptyResponse(query);

  const tokens = expandTokens(tokenizeQuery(query));
  const limit = options.limit ?? 50;

  const [activities, officialOfferings, resorts, movies] = await Promise.all([
    loadSearchableActivities(options),
    loadSearchableOfferings(options),
    getResorts(),
    getMovieNights(),
  ]);

  const activityHits: SearchHit[] = [];
  for (const activity of activities) {
    const score = scoreActivity(activity, query, tokens);
    if (score >= MIN_SCORE) {
      activityHits.push(activityToHit(activity, score));
    }
  }

  const resortHits: SearchHit[] = [];
  for (const resort of resorts) {
    const score = scoreResort(resort, query, tokens);
    if (score >= MIN_SCORE) {
      resortHits.push(resortToHit(resort, score));
    }
  }

  const offeringHits: SearchHit[] = [];
  const visibleOfficialOfferings = filterOfficialOfferingsWithoutActivityCollisions(
    officialOfferings,
    activities
  );

  for (const offering of visibleOfficialOfferings) {
    const score = scoreOffering(offering, query, tokens);
    if (score >= MIN_SCORE) {
      offeringHits.push(offeringToHit(offering, score));
    }
  }

  const guideHits: SearchHit[] = [];
  for (const guide of GUIDES) {
    const score = scoreGuide(guide, query, tokens);
    if (score >= MIN_SCORE) {
      guideHits.push(guideToHit(guide, score));
    }
  }

  const movieHits: SearchHit[] = [];
  const seenMovies = new Set<string>();
  for (const movie of movies) {
    const key = `${movie.resortSlug}:${movie.movieTitle}:${movie.dayOfWeek}`;
    if (seenMovies.has(key)) continue;
    seenMovies.add(key);
    const score = scoreMovie(movie, query, tokens);
    if (score >= MIN_SCORE) {
      movieHits.push(movieToHit(movie, score));
    }
  }

  const categoryHits: SearchHit[] = [];
  for (const category of Object.keys(CATEGORY_META)) {
    const score = scoreCategory(category, query, tokens);
    if (score >= MIN_SCORE) {
      const meta = getCategoryMeta(category);
      categoryHits.push({
        id: `category-${category}`,
        kind: "category",
        title: meta.label,
        subtitle: "Browse category",
        description: `Explore ${meta.label.toLowerCase()} across the resorts`,
        href: `/activities?category=${category}`,
        score,
        iconKey: meta.iconKey,
        category,
      });
    }
  }

  const pageHits: SearchHit[] = [];
  for (const page of PAGE_HITS) {
    const score = scorePage(page, query, tokens);
    if (score >= MIN_SCORE) {
      pageHits.push({
        id: page.id,
        kind: "page",
        title: page.title,
        subtitle: "Jump to",
        description: page.description,
        href: page.href,
        score,
        badges: ["Page"],
      });
    }
  }

  const sortHits = (hits: SearchHit[]) =>
    [...hits].sort((a, b) => b.score - a.score);

  const sortedActivities = sortHits(activityHits);
  const sortedOfferings = sortHits(offeringHits);
  const sortedResorts = sortHits(resortHits);
  const sortedGuides = sortHits(guideHits);
  const sortedMovies = sortHits(movieHits);
  const sortedCategories = sortHits(categoryHits);
  const sortedPages = sortHits(pageHits);

  const allHits = sortHits([
    ...sortedActivities,
    ...sortedOfferings,
    ...sortedResorts,
    ...sortedGuides,
    ...sortedMovies,
    ...sortedCategories,
    ...sortedPages,
  ]);

  const topHits = allHits.slice(0, 8);

  return {
    query,
    tokens,
    total: allHits.length,
    topHits,
    activities: sortedActivities
      .slice(0, limit)
      .map((hit) => hit.activity!)
      .filter(Boolean),
    officialOfferings: sortedOfferings
      .slice(0, limit)
      .map((hit) => hit.offering!)
      .filter(Boolean),
    resorts: sortedResorts
      .slice(0, 12)
      .map((hit) => hit.resort!)
      .filter(Boolean),
    guides: sortedGuides
      .slice(0, 6)
      .map((hit) => hit.guide!)
      .filter(Boolean),
    movies: sortedMovies
      .slice(0, 8)
      .map((hit) => hit.movie!)
      .filter(Boolean),
    categories: sortedCategories.slice(0, 6),
    pages: sortedPages.slice(0, 4),
  };
}

/** Rank explore-page text filter using the same relevance engine. */
export function rankActivitiesByQuery(
  activities: ActivityOccurrence[],
  rawQuery: string
): ActivityOccurrence[] {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return activities;

  const tokens = expandTokens(tokenizeQuery(query));
  const scored = activities
    .map((activity) => ({
      activity,
      score: scoreActivity(activity, query, tokens),
    }))
    .filter((row) => row.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);

  return scored.map((row) => row.activity);
}
