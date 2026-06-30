import type { IconKey } from "@/components/icons/iconRegistry";
import type { SearchFacet, SearchSuggestion } from "@/lib/search/schema";
import type { SearchDocument } from "@/lib/search/schema";
import type {
  ActivityOffering,
  ActivityOccurrence,
  MovieNightOccurrence,
  ResortSummary,
} from "@/lib/types/occurrence";

export type SearchResultKind =
  | "activity"
  | "resort"
  | "category"
  | "page"
  | "movie"
  | "offering";

export interface SearchHit {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle?: string;
  description?: string;
  href: string;
  score: number;
  badges?: string[];
  iconKey?: IconKey;
  highlights?: Record<string, string[]>;
  reason?: string;
  document?: SearchDocument;
  activity?: ActivityOccurrence;
  resort?: ResortSummary;
  movie?: MovieNightOccurrence;
  offering?: ActivityOffering;
  category?: string;
}

export interface SearchResponse {
  query: string;
  tokens: string[];
  total: number;
  hits?: SearchHit[];
  facets?: SearchFacet[];
  suggestedQueries?: SearchSuggestion[];
  topHits: SearchHit[];
  activities: ActivityOccurrence[];
  officialOfferings: ActivityOffering[];
  resorts: ResortSummary[];
  movies: MovieNightOccurrence[];
  categories: SearchHit[];
  pages: SearchHit[];
}
