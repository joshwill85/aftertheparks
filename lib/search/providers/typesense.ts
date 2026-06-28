import { getCategoryMeta } from "@/lib/categories/meta";
import { createTypesenseClient, getTypesenseCollectionName } from "@/lib/search/typesense/client";
import {
  buildTypesenseSearchParams,
  buildTypesenseSuggestParams,
} from "@/lib/search/typesense/searchParams";
import type { SearchProvider } from "@/lib/search/providers/types";
import type {
  SearchDocument,
  SearchFacet,
  SearchFilters,
  SearchSuggestion,
} from "@/lib/search/schema";
import type { SearchHit } from "@/lib/search/types";
import { formatResortTier } from "@/lib/utils";

interface TypesenseHit {
  document: SearchDocument;
  text_match?: number;
  highlights?: Array<{
    field?: string;
    snippet?: string;
    snippets?: string[];
    value?: string;
  }>;
}

interface TypesenseFacetCount {
  field_name: string;
  counts: Array<{ value: string; count: number }>;
}

interface TypesenseSearchResult {
  found?: number;
  hits?: TypesenseHit[];
  facet_counts?: TypesenseFacetCount[];
}

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

function highlightsForHit(hit: TypesenseHit): Record<string, string[]> | undefined {
  const grouped = new Map<string, string[]>();
  for (const highlight of hit.highlights ?? []) {
    const field = highlight.field;
    const snippets = highlight.snippets ?? (highlight.snippet ? [highlight.snippet] : []);
    if (!field || snippets.length === 0) continue;
    grouped.set(field, [...(grouped.get(field) ?? []), ...snippets]);
  }
  return grouped.size > 0 ? Object.fromEntries(grouped) : undefined;
}

function documentToHit(hit: TypesenseHit): SearchHit {
  const document = hit.document;
  return {
    id: hitId(document),
    kind: document.kind,
    title: document.title,
    subtitle: document.subtitle,
    description: document.description,
    href: document.href,
    score: hit.text_match ?? 0,
    badges: badgesForDocument(document),
    iconKey: document.category ? getCategoryMeta(document.category).iconKey : undefined,
    highlights: highlightsForHit(hit),
    document,
    category: document.category,
  };
}

function facetLabel(field: string, value: string): string {
  if (field === "kind") {
    return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }
  if (field === "priceState" && value === "free") return "Free";
  if (field === "reservationState") {
    return value.replace(/_/g, " ");
  }
  return value.replace(/-/g, " ").replace(/_/g, " ");
}

function mapFacets(facetCounts: TypesenseFacetCount[] = []): SearchFacet[] {
  return facetCounts.map((facet) => ({
    field: facet.field_name,
    label: FACET_LABELS[facet.field_name] ?? facet.field_name,
    values: facet.counts.map((count) => ({
      value: count.value,
      label: facetLabel(facet.field_name, count.value),
      count: count.count,
    })),
  }));
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

async function executeSearch(
  query: string,
  filters: SearchFilters,
  suggest: boolean
) {
  const client = createTypesenseClient();
  const collection = getTypesenseCollectionName();
  const params = suggest
    ? buildTypesenseSuggestParams(query, filters)
    : buildTypesenseSearchParams(query, filters);

  return client
    .collections<SearchDocument>(collection)
    .documents()
    .search(params as any) as Promise<TypesenseSearchResult>;
}

export function createTypesenseSearchProvider(): SearchProvider {
  return {
    async search(request) {
      const result = await executeSearch(
        request.query,
        request.filters ?? {},
        false
      );
      const hits = (result.hits ?? []).map(documentToHit);
      return {
        query: request.query,
        hits,
        suggestions: suggestionsFromHits(request.query, hits),
        facets: mapFacets(result.facet_counts),
        total: result.found ?? hits.length,
      };
    },

    async suggest(request) {
      const result = await executeSearch(
        request.query,
        request.filters ?? {},
        true
      );
      const hits = (result.hits ?? []).map(documentToHit);
      return {
        query: request.query,
        hits,
        suggestions: suggestionsFromHits(request.query, hits),
        facets: mapFacets(result.facet_counts),
        total: result.found ?? hits.length,
      };
    },
  };
}
