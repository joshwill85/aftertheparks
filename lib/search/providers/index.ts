import { createLocalSearchProvider } from "@/lib/search/providers/local";
import type { SearchProvider } from "@/lib/search/providers/types";
import { createTypesenseSearchProvider } from "@/lib/search/providers/typesense";

export type SearchProviderName = "local" | "typesense";

export function getSearchProviderName(): SearchProviderName {
  return process.env.SEARCH_PROVIDER === "typesense" ? "typesense" : "local";
}

export function createSearchProvider(): SearchProvider {
  if (getSearchProviderName() === "typesense") {
    return createTypesenseSearchProvider();
  }
  return createLocalSearchProvider();
}
