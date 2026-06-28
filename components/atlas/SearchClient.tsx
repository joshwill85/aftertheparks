"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActivityOffering, ActivityOccurrence, MovieNightOccurrence, ResortSummary } from "@/lib/types/occurrence";
import type { GuideEntry } from "@/lib/guides";
import type { SearchHit } from "@/lib/search/types";
import type { SearchFacet, SearchSuggestion } from "@/lib/search/schema";
import { BrandAsset } from "@/components/brand/BrandAsset";
import { SearchHitRow } from "@/components/search/SearchHitRow";

interface SearchPayload {
  activities: ActivityOccurrence[];
  officialOfferings: ActivityOffering[];
  resorts: ResortSummary[];
  guides: GuideEntry[];
  movies: MovieNightOccurrence[];
  hits: SearchHit[];
  topHits: SearchHit[];
  categories: SearchHit[];
  pages: SearchHit[];
  facets: SearchFacet[];
  suggestedQueries: SearchSuggestion[];
  total: number;
  query: string;
}

interface SearchClientProps {
  initialQuery?: string;
  initialPayload?: SearchPayload;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  "campfire tonight",
  "pool games",
  "polynesian",
  "movie",
  "crafts kids",
  "arcade games",
  "contemporary",
  "yoga",
];

export function SearchClient({
  initialQuery = "",
  initialPayload,
  suggestions = DEFAULT_SUGGESTIONS,
}: SearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? initialQuery;
  const [query, setQuery] = useState(q);
  const [payload, setPayload] = useState<SearchPayload | null>(
    q === initialQuery && initialPayload ? initialPayload : null
  );
  const [previewHits, setPreviewHits] = useState<SearchHit[]>([]);
  const [previewSuggestions, setPreviewSuggestions] = useState<SearchSuggestion[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSearch = useCallback(async (term: string, signal?: AbortSignal) => {
    const trimmed = term.trim();
    if (!trimmed) {
      return {
        activities: [],
        officialOfferings: [],
        resorts: [],
        guides: [],
        movies: [],
        hits: [],
        topHits: [],
        categories: [],
        pages: [],
        facets: [],
        suggestedQueries: [],
        total: 0,
        query: "",
      } satisfies SearchPayload;
    }

    const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
      signal,
    });
    const data = await response.json();
    return {
      activities: data.activities ?? [],
      officialOfferings: data.officialOfferings ?? [],
      resorts: data.resorts ?? [],
      guides: data.guides ?? [],
      movies: data.movies ?? [],
      hits: data.hits ?? [],
      topHits: data.topHits ?? [],
      categories: data.categories ?? [],
      pages: data.pages ?? [],
      facets: data.facets ?? [],
      suggestedQueries: data.suggestedQueries ?? data.suggestions ?? [],
      total: data.total ?? 0,
      query: data.query ?? trimmed,
    } satisfies SearchPayload;
  }, []);

  const fetchSuggest = useCallback(async (term: string, signal?: AbortSignal) => {
    const trimmed = term.trim();
    const response = await fetch(
      `/api/search/suggest?q=${encodeURIComponent(trimmed)}&limit=8`,
      { signal }
    );
    const data = await response.json();
    return {
      hits: data.hits ?? data.topHits ?? [],
      suggestions: data.suggestions ?? data.suggestedQueries ?? [],
    } as { hits: SearchHit[]; suggestions: SearchSuggestion[] };
  }, []);

  useEffect(() => {
    setQuery(q);
    if (!q) {
      setPayload(null);
      setPreviewHits([]);
      setPreviewSuggestions([]);
      return;
    }

    if (q === initialQuery && initialPayload) {
      setPayload(initialPayload);
      return;
    }

    setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchSearch(q, controller.signal)
      .then((data) => setPayload(data))
      .catch(() => {
        if (!controller.signal.aborted) setPayload(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, [q, initialQuery, initialPayload, fetchSearch]);

  const runSearch = (term: string) => {
    const params = new URLSearchParams();
    const trimmed = term.trim();
    if (trimmed) params.set("q", trimmed);
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search");
    setPreviewOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPreviewOpen(true);
    setActivePreviewIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();

    if (trimmed.length < 2) {
      setPreviewHits([]);
      setPreviewSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetchSuggest(trimmed, controller.signal)
        .then((data) => {
          setPreviewHits(data.hits.slice(0, 6));
          setPreviewSuggestions(data.suggestions.slice(0, 4));
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setPreviewHits([]);
            setPreviewSuggestions([]);
          }
        });
    }, 180);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!previewOpen || previewHits.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActivePreviewIndex((index) => (index + 1) % previewHits.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActivePreviewIndex((index) =>
        index <= 0 ? previewHits.length - 1 : index - 1
      );
    }
    if (event.key === "Enter" && activePreviewIndex >= 0) {
      event.preventDefault();
      const hit = previewHits[activePreviewIndex];
      if (hit) router.push(hit.href);
      setPreviewOpen(false);
    }
    if (event.key === "Escape") {
      setPreviewOpen(false);
      setActivePreviewIndex(-1);
    }
  };

  const hasResults =
    payload &&
    (payload.total > 0 ||
      payload.hits.length > 0 ||
      payload.activities.length > 0 ||
      payload.officialOfferings.length > 0 ||
      payload.resorts.length > 0);
  const visibleHits = payload?.hits?.length ? payload.hits : payload?.topHits ?? [];
  const visibleFacets =
    payload?.facets
      .filter((facet) => ["kind", "resortName", "categoryLabel", "priceState"].includes(facet.field))
      .flatMap((facet) => facet.values.slice(0, 4).map((value) => ({ facet, value })))
      .slice(0, 10) ?? [];

  return (
    <div className="search-shell">
      <form onSubmit={handleSearch} className="search-form" role="search">
        <label htmlFor="global-search-input" className="search-form__label">
          Search everything
        </label>
        <p className="search-form__hint">
          Activities, resorts, movies, guides, and categories — ranked by what
          matches best.
        </p>
        <div className="search-form__row">
          <div className="search-form__input-wrap">
            <input
              ref={inputRef}
              id="global-search-input"
              type="search"
              role="combobox"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setPreviewOpen(true)}
              onBlur={() => window.setTimeout(() => setPreviewOpen(false), 160)}
              placeholder='Try "campfire", "Polynesian", or "pool games"'
              className="form-control search-form__input"
              autoComplete="off"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-controls={previewOpen ? "search-preview-list" : undefined}
              aria-expanded={previewOpen && previewHits.length > 0}
              aria-activedescendant={
                activePreviewIndex >= 0
                  ? `search-preview-option-${activePreviewIndex}`
                  : undefined
              }
            />
            {previewOpen &&
              (previewHits.length > 0 || previewSuggestions.length > 0) &&
              query.trim().length >= 2 && (
              <div className="search-preview" id="search-preview-list" role="listbox">
                {previewSuggestions.length > 0 && (
                  <div className="search-preview__group">
                    <span className="search-section__meta">Suggested searches</span>
                    {previewSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="search-preview__more"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runSearch(suggestion.query)}
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
                {previewHits.length > 0 && (
                  <span className="search-section__meta">Best matches</span>
                )}
                {previewHits.map((hit, index) => (
                  <SearchHitRow
                    key={hit.id}
                    id={`search-preview-option-${index}`}
                    hit={hit}
                    compact
                    role="option"
                    tabIndex={-1}
                    ariaSelected={activePreviewIndex === index}
                    onMouseDown={(e) => e.preventDefault()}
                    onNavigate={() => setPreviewOpen(false)}
                  />
                ))}
                <button
                  type="button"
                  className="search-preview__more"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runSearch(query)}
                >
                  See all results for &ldquo;{query.trim()}&rdquo;
                </button>
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary search-form__submit">
            Search
          </button>
        </div>
      </form>

      <div className="search-suggestions">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="search-suggestion"
            onClick={() => runSearch(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {!q && (
        <div className="search-empty-intro">
          <BrandAsset asset="guide-companion" className="brand-asset--empty" />
          <p>
            Ask like a concierge — campfires near your resort, pool games,
            tonight&apos;s movies, or arcade games.
          </p>
        </div>
      )}

      {loading && q && (
        <p className="search-status" aria-live="polite">
          Searching across activities, resorts, movies, and guides…
        </p>
      )}

      {!loading && q && payload && !hasResults && (
        <div className="search-no-results">
          <BrandAsset asset="guide-companion" className="brand-asset--empty" />
          <p className="search-no-results__title">
            No strong matches for &ldquo;{q}&rdquo;
          </p>
          <p className="search-no-results__copy">
            Try a shorter phrase, a resort name, or browse by category.
          </p>
          <div className="search-no-results__actions">
            <Link href="/activities" className="btn-secondary text-sm">
              Explore activities
            </Link>
            <Link href="/resorts" className="btn-secondary text-sm">
              Browse resorts
            </Link>
          </div>
        </div>
      )}

      {!loading && q && payload && hasResults && (
        <div className="search-results">
          {payload.topHits.length > 0 && (
            <section className="search-section" aria-labelledby="search-top-heading">
              <div className="search-section__header">
                <h2 id="search-top-heading" className="search-section__title">
                  Results
                </h2>
                <p className="search-section__meta">{payload.total} results</p>
              </div>
              {visibleFacets.length > 0 && (
                <div className="search-suggestions" aria-label="Search filters">
                  {visibleFacets.map(({ facet, value }) => (
                    <button
                      key={`${facet.field}:${value.value}`}
                      type="button"
                      className="search-suggestion"
                      onClick={() => runSearch(`${query} ${value.label}`)}
                    >
                      {value.label} ({value.count})
                    </button>
                  ))}
                </div>
              )}
              <div className="search-hit-list">
                {visibleHits.map((hit) => (
                  <SearchHitRow key={hit.id} hit={hit} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
