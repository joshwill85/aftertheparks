import type { GuideEntry } from "@/lib/guides";
import type {
  ActivityOccurrence,
  MovieNightOccurrence,
  ResortSummary,
} from "@/lib/types/occurrence";

export type SearchResultKind =
  | "activity"
  | "resort"
  | "guide"
  | "category"
  | "page"
  | "movie";

export interface SearchHit {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle?: string;
  description?: string;
  href: string;
  score: number;
  badges?: string[];
  activity?: ActivityOccurrence;
  resort?: ResortSummary;
  guide?: GuideEntry;
  movie?: MovieNightOccurrence;
  category?: string;
}

export interface SearchResponse {
  query: string;
  tokens: string[];
  total: number;
  topHits: SearchHit[];
  activities: ActivityOccurrence[];
  resorts: ResortSummary[];
  guides: GuideEntry[];
  movies: MovieNightOccurrence[];
  categories: SearchHit[];
  pages: SearchHit[];
}
