import type { SearchFilters } from "@/lib/search/schema";

function escapeFilterValue(value: string): string {
  return value.replace(/`/g, "\\`");
}

function exactFilter(field: string, value: string): string {
  return `${field}:=${escapeFilterValue(value)}`;
}

export function buildTypesenseFilter(filters: SearchFilters = {}): string | undefined {
  const clauses: string[] = [];

  if (filters.resort) clauses.push(exactFilter("resortSlug", filters.resort));
  if (filters.category) clauses.push(exactFilter("category", filters.category));
  if (filters.daypart) clauses.push(exactFilter("daypart", filters.daypart));
  if (filters.kind) clauses.push(exactFilter("kind", filters.kind));
  if (filters.free) clauses.push("priceState:=free");
  if (filters.reservation) {
    clauses.push("reservationState:=[required,recommended]");
  }

  return clauses.length > 0 ? clauses.join(" && ") : undefined;
}

export function buildTypesenseSearchParams(query: string, filters: SearchFilters = {}) {
  return {
    q: query,
    query_by: [
      "title",
      "aliases",
      "categoryLabel",
      "resortName",
      "locationLabel",
      "keywords",
      "description",
      "scheduleText",
    ].join(","),
    text_match_type: "max_score",
    sort_by: "_text_match:desc,titleSort:asc",
    prioritize_exact_match: true,
    prioritize_num_matching_fields: true,
    prefix: query.length <= 24,
    num_typos: query.length >= 4 ? 2 : 0,
    min_len_1typo: 4,
    min_len_2typo: 7,
    facet_by: [
      "kind",
      "resortSlug",
      "resortName",
      "category",
      "categoryLabel",
      "priceState",
      "reservationState",
      "daypart",
    ].join(","),
    filter_by: buildTypesenseFilter(filters),
    per_page: 50,
    highlight_fields: "title,aliases,categoryLabel,resortName,locationLabel,description",
  };
}

export function buildTypesenseSuggestParams(
  query: string,
  filters: SearchFilters = {}
) {
  return {
    q: query,
    query_by:
      query.length <= 2
        ? "aliases"
        : "aliases,title,resortName,categoryLabel,keywords",
    text_match_type: "max_score",
    sort_by: "_text_match:desc,titleSort:asc",
    prefix: true,
    num_typos: query.length >= 4 ? 1 : 0,
    min_len_1typo: 4,
    min_len_2typo: 7,
    filter_by: buildTypesenseFilter(filters),
    per_page: 8,
    highlight_fields: "title,aliases,resortName,categoryLabel",
  };
}
