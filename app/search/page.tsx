import { SearchClient } from "@/components/atlas/SearchClient";
import { Hero } from "@/components/atlas/Hero";
import { StarlightSearchEffect } from "@/components/magic/StarlightSearchEffect";
import { runSearch } from "@/lib/search/runSearch";

const SUGGESTIONS = [
  "campfire tonight",
  "pool games",
  "polynesian",
  "movie",
  "crafts kids",
  "arcade games",
  "contemporary",
  "yoga",
];

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const initialPayload = query
    ? await runSearch(query, { limit: 50 })
    : undefined;

  return (
    <div className="relative">
      <StarlightSearchEffect />
      <Hero
        title="Search"
        subtitle="One search across activities, resorts, movies, guides, and categories — best matches first."
      />
      <SearchClient
        initialQuery={query}
        initialPayload={
          initialPayload
            ? {
                activities: initialPayload.activities,
                officialOfferings: initialPayload.officialOfferings,
                resorts: initialPayload.resorts,
                guides: initialPayload.guides,
                movies: initialPayload.movies,
                topHits: initialPayload.topHits,
                categories: initialPayload.categories,
                pages: initialPayload.pages,
                total: initialPayload.total,
                query: initialPayload.query,
              }
            : undefined
        }
        suggestions={SUGGESTIONS}
      />
    </div>
  );
}
