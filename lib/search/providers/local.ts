import { getCategoryMeta } from "@/lib/categories/meta";
import { buildSearchDocuments } from "@/lib/search/documents";
import type { SearchProvider } from "@/lib/search/providers/types";
import type {
  SearchDocument,
  SearchFacet,
  SearchFilters,
  SearchSuggestion,
} from "@/lib/search/schema";
import type { SearchHit } from "@/lib/search/types";
import { normalizeSearchQuery, tokenizeQuery } from "@/lib/search/normalize";
import { formatResortTier } from "@/lib/utils";

interface FieldSpec {
  field: keyof SearchDocument;
  weight: number;
}

interface ScoredDocument {
  document: SearchDocument;
  score: number;
  highlights?: Record<string, string[]>;
}

const SEARCH_FIELDS: FieldSpec[] = [
  { field: "title", weight: 150 },
  { field: "aliases", weight: 145 },
  { field: "resortName", weight: 115 },
  { field: "categoryLabel", weight: 110 },
  { field: "locationLabel", weight: 90 },
  { field: "keywords", weight: 88 },
  { field: "scheduleText", weight: 72 },
  { field: "description", weight: 60 },
  { field: "kind", weight: 45 },
  { field: "priceState", weight: 40 },
  { field: "reservationState", weight: 35 },
];

const FACET_LABELS: Record<string, string> = {
  kind: "Type",
  resortSlug: "Resort",
  resortName: "Resort",
  category: "Category",
  categoryLabel: "Category",
  priceState: "Price",
  reservationState: "Reservations",
  daypart: "Time of day",
};

const FACET_FIELDS: Array<keyof SearchDocument> = [
  "kind",
  "resortName",
  "categoryLabel",
  "priceState",
  "reservationState",
  "daypart",
];

let documentCache: Promise<SearchDocument[]> | undefined;

function getDocuments() {
  documentCache ??= buildSearchDocuments();
  return documentCache;
}

function fieldValues(document: SearchDocument, field: keyof SearchDocument): string[] {
  const value = document[field];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string" || typeof value === "boolean") return [String(value)];
  return [];
}

function maxTypoDistance(token: string): number {
  if (token.length < 4) return 0;
  if (token.length <= 6) return 1;
  return 2;
}

function editDistanceAtMost(a: string, b: string, maxDistance: number): number | undefined {
  if (a === b) return 0;
  for (let index = 0; index < a.length - 1; index += 1) {
    const swapped =
      a.slice(0, index) +
      a[index + 1] +
      a[index] +
      a.slice(index + 2);
    if (swapped === b && maxDistance >= 1) return 1;
  }
  if (maxDistance === 0 || Math.abs(a.length - b.length) > maxDistance) return undefined;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = current[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > maxDistance) return undefined;
    previous = current;
  }

  const distance = previous[b.length];
  return distance <= maxDistance ? distance : undefined;
}

function valueScore(value: string, query: string, tokens: string[], weight: number): number {
  const normalized = normalizeSearchQuery(value);
  if (!normalized) return 0;
  if (normalized === query) return weight;
  if (normalized.startsWith(query)) return weight * 0.92;
  if (normalized.includes(query)) return weight * 0.82;

  const words = tokenizeQuery(normalized);
  let tokenScore = 0;
  for (const token of tokens) {
    if (normalized.includes(token)) {
      tokenScore += weight * 0.42;
      continue;
    }

    const allowedDistance = maxTypoDistance(token);
    const typoDistance = words
      .map((word) => editDistanceAtMost(token, word, allowedDistance))
      .filter((distance): distance is number => distance !== undefined)
      .sort((a, b) => a - b)[0];

    if (typoDistance !== undefined) {
      tokenScore += weight * (typoDistance === 0 ? 0.42 : 0.28 / typoDistance);
    }
  }

  return tokenScore;
}

function scoreDocument(document: SearchDocument, query: string, tokens: string[]): ScoredDocument | undefined {
  let score = 0;
  const highlights: Record<string, string[]> = {};

  for (const spec of SEARCH_FIELDS) {
    const values = fieldValues(document, spec.field);
    if (values.length === 0) continue;

    const fieldScore = Math.max(
      ...values.map((value) => valueScore(value, query, tokens, spec.weight))
    );
    if (fieldScore > 0) {
      score = Math.max(score, fieldScore);
      highlights[String(spec.field)] = values.slice(0, 2);
    }
  }

  if (score <= 0) return undefined;

  return { document, score, highlights };
}

function matchesFilters(document: SearchDocument, filters: SearchFilters = {}) {
  if (filters.kind && document.kind !== filters.kind) return false;
  if (filters.resort && document.resortSlug !== filters.resort) return false;
  if (filters.category && document.category !== filters.category) return false;
  if (filters.daypart && document.daypart !== filters.daypart) return false;
  if (filters.free && document.priceState !== "free") return false;
  if (filters.reservation && document.reservationState !== "required") return false;
  return true;
}

function hitId(document: SearchDocument): string {
  const source = document.sourceId.replace(":", "-");
  if (document.kind === "resort" && document.resortSlug) return `resort-${document.resortSlug}`;
  if (document.kind === "offering") return `offering-${document.sourceId.replace(/^offering:/, "")}`;
  if (document.kind === "category" && document.category) return `category-${document.category}`;
  return source;
}

function badgesForDocument(document: SearchDocument): string[] {
  const badges: string[] = [];
  if (document.category) badges.push(getCategoryMeta(document.category).label);
  if (document.kind === "offering") badges.push("Official");
  if (document.priceState === "free") badges.push("Free");
  if (document.reservationState === "required") badges.push("Reservations");
  if (document.isHappeningNow) badges.push("Now");
  if (document.isTonight) badges.push("Tonight");
  if (document.kind === "resort" && document.resortTier) {
    badges.push(formatResortTier(document.resortTier));
  }
  if (document.kind === "page") badges.push("Page");
  return [...new Set(badges)];
}

function documentToHit(scored: ScoredDocument): SearchHit {
  const document = scored.document;
  return {
    id: hitId(document),
    kind: document.kind,
    title: document.title,
    subtitle: document.subtitle,
    description: document.description,
    href: document.href,
    score: scored.score,
    badges: badgesForDocument(document),
    iconKey: document.category ? getCategoryMeta(document.category).iconKey : undefined,
    highlights: scored.highlights,
    document,
    category: document.category,
  };
}

function facetLabel(field: string, value: string): string {
  if (field === "kind") {
    return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }
  if (field === "priceState" && value === "free") return "Free";
  if (field === "reservationState") return value.replace(/_/g, " ");
  return value.replace(/-/g, " ").replace(/_/g, " ");
}

function mapFacets(scored: ScoredDocument[]): SearchFacet[] {
  return FACET_FIELDS.map((field) => {
    const counts = new Map<string, number>();
    for (const item of scored) {
      for (const value of fieldValues(item.document, field)) {
        if (!value || value === "unknown") continue;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }

    return {
      field: String(field),
      label: FACET_LABELS[String(field)] ?? String(field),
      values: [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([value, count]) => ({
          value,
          label: facetLabel(String(field), value),
          count,
        })),
    };
  }).filter((facet) => facet.values.length > 0);
}

function suggestionsFromHits(query: string, hits: SearchHit[]): SearchSuggestion[] {
  return hits.slice(0, 5).map((hit) => ({
    id: `suggestion:${query}:${hit.id}`,
    query: hit.title,
    label: hit.title,
    href: hit.href,
    kind: hit.kind,
  }));
}

async function executeLocalSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 50
) {
  const normalized = normalizeSearchQuery(query);
  const tokens = tokenizeQuery(normalized);
  const documents = await getDocuments();
  const scored = documents
    .filter((document) => matchesFilters(document, filters))
    .map((document) => scoreDocument(document, normalized, tokens))
    .filter((document): document is ScoredDocument => Boolean(document))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.document.title.localeCompare(b.document.title, undefined, {
          sensitivity: "base",
        })
    );

  const hits = scored.slice(0, limit).map(documentToHit);

  return {
    query: normalized,
    hits,
    suggestions: suggestionsFromHits(normalized, hits),
    facets: mapFacets(scored),
    total: scored.length,
  };
}

export function createLocalSearchProvider(): SearchProvider {
  return {
    search(request) {
      return executeLocalSearch(request.query, request.filters, request.limit ?? 50);
    },
    suggest(request) {
      return executeLocalSearch(request.query, request.filters, request.limit ?? 8);
    },
  };
}
