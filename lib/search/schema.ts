import type { SearchHit } from "@/lib/search/types";

export type SearchDocumentKind =
  | "activity"
  | "offering"
  | "resort"
  | "movie"
  | "category"
  | "page";

export interface SearchDocument {
  id: string;
  objectID: string;
  kind: SearchDocumentKind;
  title: string;
  titleSort: string;
  subtitle?: string;
  description?: string;
  href: string;
  aliases: string[];
  keywords: string[];
  resortSlug?: string;
  resortName?: string;
  resortArea?: string;
  resortTier?: string;
  category?: string;
  categoryLabel?: string;
  locationLabel?: string;
  daypart?: string;
  scheduleText?: string;
  priceState?: "free" | "fee" | "unknown";
  reservationState?: "required" | "recommended" | "not_required" | "unknown";
  isHappeningNow?: boolean;
  isTonight?: boolean;
  sourceId: string;
}

export interface SearchFilters {
  resort?: string;
  category?: string;
  daypart?: string;
  free?: boolean;
  reservation?: boolean;
  kind?: SearchDocumentKind;
}

export interface SearchFacetValue {
  value: string;
  label: string;
  count: number;
}

export interface SearchFacet {
  field: string;
  label: string;
  values: SearchFacetValue[];
}

export interface SearchSuggestion {
  id: string;
  query: string;
  label: string;
  href?: string;
  kind?: SearchDocumentKind | "query";
}

export interface SearchProviderRequest {
  query: string;
  filters?: SearchFilters;
  limit?: number;
}

export interface SearchProviderResponse {
  query: string;
  hits: SearchHit[];
  suggestions: SearchSuggestion[];
  facets: SearchFacet[];
  total: number;
}
