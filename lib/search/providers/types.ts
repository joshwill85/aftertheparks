import type {
  SearchProviderRequest,
  SearchProviderResponse,
} from "@/lib/search/schema";

export interface SearchProvider {
  search(request: SearchProviderRequest): Promise<SearchProviderResponse>;
  suggest(request: SearchProviderRequest): Promise<SearchProviderResponse>;
}
