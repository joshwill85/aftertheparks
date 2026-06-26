import { getCategoryMeta } from "@/lib/categories/meta";
import { occurrenceToDisplayInput } from "@/lib/activityDisplay";
import { computeDisplayQuality } from "@/lib/displayQuality";
import { formatResortArea } from "@/lib/resorts/display";
import type { GuideEntry } from "@/lib/guides";
import {
  countTokenHits,
  matchesAllTokens,
  normalizeSearchQuery,
} from "@/lib/search/normalize";
import { CATEGORY_QUERY_ALIASES } from "@/lib/search/synonyms";
import { activityDetailHref } from "@/lib/activities/links";
import { getPublicOfferingAvailabilityLabel } from "@/lib/activityAvailabilityDisplay";
import type { SearchHit } from "@/lib/search/types";
import type {
  ActivityOffering,
  ActivityOccurrence,
  MovieNightOccurrence,
  ResortSummary,
} from "@/lib/types/occurrence";
import { formatResortTier } from "@/lib/utils";

function phraseScore(
  phrase: string,
  query: string,
  tokens: string[],
  weights: { exact: number; prefix: number; contains: number; token: number }
): number {
  const normalized = phrase.toLowerCase();
  if (!normalized) return 0;
  if (query && normalized === query) return weights.exact;
  if (query && normalized.startsWith(query)) return weights.prefix;
  if (query && normalized.includes(query)) return weights.contains;
  const hits = countTokenHits(normalized, tokens);
  if (hits === 0) return 0;
  if (matchesAllTokens(normalized, tokens)) return weights.token;
  return hits * (weights.token / Math.max(tokens.length, 1));
}

export function scoreActivity(
  activity: ActivityOccurrence,
  query: string,
  tokens: string[]
): number {
  const categoryMeta = getCategoryMeta(activity.category);
  const haystacks = [
    activity.title,
    activity.summary,
    activity.resort.name,
    activity.resort.slug.replace(/-/g, " "),
    activity.location.label,
    activity.category,
    categoryMeta.label,
    categoryMeta.stamp,
    ...(activity.scheduleText ? [activity.scheduleText] : []),
  ]
    .join(" ")
    .toLowerCase();

  let score =
    phraseScore(activity.title.toLowerCase(), query, tokens, {
      exact: 120,
      prefix: 95,
      contains: 75,
      token: 55,
    }) +
    phraseScore(haystacks, query, tokens, {
      exact: 0,
      prefix: 0,
      contains: 35,
      token: 28,
    });

  if (activity.price.state === "free" && (query.includes("free") || tokens.includes("free"))) {
    score += 22;
  }

  if (activity.isHappeningNow) score += 18;

  const quality = computeDisplayQuality(occurrenceToDisplayInput(activity));
  if (quality.tier === "high") score += 8;
  else if (quality.tier === "medium") score += 4;

  const categoryIntent = tokens
    .map((token) => CATEGORY_QUERY_ALIASES[token])
    .find(Boolean);
  if (categoryIntent && activity.category === categoryIntent) {
    score += 45;
  }

  if (tokens.some((token) => activity.resort.slug.includes(token))) {
    score += 20;
  }

  return score;
}

export function scoreOffering(
  offering: ActivityOffering,
  query: string,
  tokens: string[]
): number {
  const categoryMeta = getCategoryMeta(offering.category);
  const availabilityLabel = getPublicOfferingAvailabilityLabel(
    offering.availability
  );
  const haystacks = [
    offering.title,
    offering.summary,
    offering.resort.name,
    offering.resort.slug.replace(/-/g, " "),
    offering.location.label,
    availabilityLabel,
    offering.category,
    categoryMeta.label,
    categoryMeta.stamp,
    ...offering.tags,
  ]
    .join(" ")
    .toLowerCase();

  let score =
    phraseScore(offering.title.toLowerCase(), query, tokens, {
      exact: 118,
      prefix: 94,
      contains: 74,
      token: 54,
    }) +
    phraseScore(haystacks, query, tokens, {
      exact: 0,
      prefix: 0,
      contains: 34,
      token: 27,
    });

  if (offering.price.state === "free" && (query.includes("free") || tokens.includes("free"))) {
    score += 22;
  }

  if (offering.freshness.badge === "verified") score += 8;

  const categoryIntent = tokens
    .map((token) => CATEGORY_QUERY_ALIASES[token])
    .find(Boolean);
  if (categoryIntent && offering.category === categoryIntent) {
    score += 45;
  }

  if (tokens.some((token) => offering.resort.slug.includes(token))) {
    score += 20;
  }

  return score;
}

export function scoreResort(
  resort: ResortSummary,
  query: string,
  tokens: string[]
): number {
  const haystacks = [
    resort.name,
    resort.slug.replace(/-/g, " "),
    resort.category,
    formatResortTier(resort.category),
    formatResortArea(resort.area),
    resort.area.replace(/_/g, " "),
  ]
    .join(" ")
    .toLowerCase();

  let score = phraseScore(resort.name.toLowerCase(), query, tokens, {
    exact: 110,
    prefix: 90,
    contains: 70,
    token: 50,
  });

  score += phraseScore(haystacks, query, tokens, {
    exact: 0,
    prefix: 0,
    contains: 30,
    token: 24,
  });

  score += Math.min(resort.activityCount + resort.offeringCount, 30) * 0.5;

  return score;
}

export function scoreGuide(guide: GuideEntry, query: string, tokens: string[]): number {
  const haystacks = [
    guide.title,
    guide.description,
    guide.slug.replace(/-/g, " "),
    ...guide.keywords,
  ]
    .join(" ")
    .toLowerCase();

  return (
    phraseScore(guide.title.toLowerCase(), query, tokens, {
      exact: 100,
      prefix: 85,
      contains: 65,
      token: 48,
    }) +
    phraseScore(haystacks, query, tokens, {
      exact: 0,
      prefix: 0,
      contains: 28,
      token: 22,
    })
  );
}

export function scoreMovie(
  movie: MovieNightOccurrence,
  query: string,
  tokens: string[]
): number {
  const title = (movie.displayTitle ?? movie.movieTitle ?? "").toLowerCase();
  const haystacks = [
    title,
    movie.resortName,
    movie.resortSlug,
    movie.location ?? "",
    movie.dayOfWeek,
  ]
    .join(" ")
    .toLowerCase();

  let score = phraseScore(title, query, tokens, {
    exact: 105,
    prefix: 88,
    contains: 68,
    token: 46,
  });

  score += phraseScore(haystacks, query, tokens, {
    exact: 0,
    prefix: 0,
    contains: 26,
    token: 20,
  });

  if (movie.isTonight) score += 15;
  if (tokens.some((token) => ["movie", "movies", "cinema", "film"].includes(token))) {
    score += 25;
  }

  return score;
}

export function scoreCategory(
  category: string,
  query: string,
  tokens: string[]
): number {
  const meta = getCategoryMeta(category);
  const haystacks = [meta.label, meta.stamp, category.replace(/_/g, " ")]
    .join(" ")
    .toLowerCase();

  let score = phraseScore(haystacks, query, tokens, {
    exact: 80,
    prefix: 70,
    contains: 55,
    token: 42,
  });

  const intent = tokens
    .map((token) => CATEGORY_QUERY_ALIASES[token])
    .find(Boolean);
  if (intent === category) score += 50;

  return score;
}

export function scorePage(
  page: {
    title: string;
    description: string;
    keywords: readonly string[];
  },
  query: string,
  tokens: string[]
): number {
  const haystacks = [page.title, page.description, ...page.keywords]
    .join(" ")
    .toLowerCase();

  return phraseScore(haystacks, query, tokens, {
    exact: 88,
    prefix: 72,
    contains: 58,
    token: 40,
  });
}

export function activityToHit(
  activity: ActivityOccurrence,
  score: number
): SearchHit {
  const categoryMeta = getCategoryMeta(activity.category);
  const badges = [categoryMeta.label];
  if (activity.price.state === "free") badges.push("Free");
  if (activity.isHappeningNow) badges.push("Now");

  return {
    id: `activity-${activity.id}`,
    kind: "activity",
    title: activity.title,
    subtitle: activity.resort.name,
    description: activity.summary,
    href: activityDetailHref(activity.activitySlug, activity.resort.slug),
    score,
    badges,
    activity,
  };
}

export function offeringToHit(
  offering: ActivityOffering,
  score: number
): SearchHit {
  const categoryMeta = getCategoryMeta(offering.category);
  const availabilityLabel = getPublicOfferingAvailabilityLabel(
    offering.availability
  );
  const badges = [categoryMeta.label, "Official"];
  if (offering.price.state === "free") badges.push("Free");
  if (offering.availability.kind === "reservation_based") {
    badges.push("Reservations");
  }

  return {
    id: `offering-${offering.offeringKey}`,
    kind: "offering",
    title: offering.title,
    subtitle: offering.resort.name,
    description: offering.summary || availabilityLabel,
    href: `/resorts/${offering.resort.slug}#official-offerings`,
    score,
    badges,
    offering,
  };
}

export function resortToHit(resort: ResortSummary, score: number): SearchHit {
  return {
    id: `resort-${resort.slug}`,
    kind: "resort",
    title: resort.name,
    subtitle: `${formatResortTier(resort.category)} · ${formatResortArea(resort.area)}`,
    description: `${resort.activityCount} scheduled activities · ${resort.offeringCount} official offerings`,
    href: `/resorts/${resort.slug}`,
    score,
    badges: [formatResortTier(resort.category)],
    resort,
  };
}

export function guideToHit(guide: GuideEntry, score: number): SearchHit {
  return {
    id: `guide-${guide.slug}`,
    kind: "guide",
    title: guide.title,
    subtitle: "Planning guide",
    description: guide.description,
    href: guide.href,
    score,
    badges: ["Guide"],
    guide,
  };
}

export function movieToHit(movie: MovieNightOccurrence, score: number): SearchHit {
  const title = movie.displayTitle ?? movie.movieTitle ?? "Movie Under the Stars";
  return {
    id: `movie-${movie.id}`,
    kind: "movie",
    title,
    subtitle: movie.resortName,
    description: movie.isTonight ? "Showing tonight" : movie.dayOfWeek,
    href: "/tonight",
    score,
    badges: movie.isTonight ? ["Tonight", "Movie"] : ["Movie"],
    movie,
  };
}

export function detectCategoryIntent(tokens: string[]): string | undefined {
  for (const token of tokens) {
    const category = CATEGORY_QUERY_ALIASES[token];
    if (category) return category;
  }
  const query = normalizeSearchQuery(tokens.join(" "));
  return CATEGORY_QUERY_ALIASES[query];
}
