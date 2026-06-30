import type { Metadata } from "next";
import { SearchClient } from "@/components/atlas/SearchClient";
import { Hero } from "@/components/atlas/Hero";
import { StarlightSearchEffect } from "@/components/magic/StarlightSearchEffect";
import { runSearch } from "@/lib/search/runSearch";

export const metadata: Metadata = {
  title: "Search After the Parks",
  description: "Search activities, resorts, movies, categories, and planning pages.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

const SUGGESTIONS = [
  "campfire tonight",
  "Polynesian movie",
  "pool games",
  "arcade",
  "rainy day",
  "free activities",
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
        title="Search After the Parks"
        subtitle="Search activities, resorts, movies, categories, and planning pages."
      />
      <SearchClient
        initialQuery={query}
        initialPayload={
          initialPayload
            ? {
                activities: initialPayload.activities,
                officialOfferings: initialPayload.officialOfferings,
                resorts: initialPayload.resorts,
                movies: initialPayload.movies,
                hits: initialPayload.hits ?? [],
                topHits: initialPayload.topHits,
                categories: initialPayload.categories,
                pages: initialPayload.pages,
                facets: initialPayload.facets ?? [],
                suggestedQueries: initialPayload.suggestedQueries ?? [],
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
