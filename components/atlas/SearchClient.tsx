"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActivityOffering,
  ActivityOccurrence,
  MovieNightOccurrence,
  ResortSummary,
} from "@/lib/types/occurrence";
import type { GuideEntry } from "@/lib/guides";
import type { SearchHit } from "@/lib/search/types";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { ActivityOfferingGrid } from "@/components/activity/ActivityOfferingGrid";
import { usePlan } from "@/components/atlas/PlanProvider";
import { ResortCard } from "@/components/resort/ResortCard";
import { MovieListingCard } from "@/components/movies/MovieListingCard";
import { SearchHitRow } from "@/components/search/SearchHitRow";

interface SearchPayload {
  activities: ActivityOccurrence[];
  officialOfferings: ActivityOffering[];
  resorts: ResortSummary[];
  guides: GuideEntry[];
  movies: MovieNightOccurrence[];
  topHits: SearchHit[];
  categories: SearchHit[];
  pages: SearchHit[];
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
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { addActivity } = usePlan();
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
        topHits: [],
        categories: [],
        pages: [],
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
      topHits: data.topHits ?? [],
      categories: data.categories ?? [],
      pages: data.pages ?? [],
      total: data.total ?? 0,
      query: data.query ?? trimmed,
    } satisfies SearchPayload;
  }, []);

  useEffect(() => {
    setQuery(q);
    if (!q) {
      setPayload(null);
      setPreviewHits([]);
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

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();

    if (trimmed.length < 2) {
      setPreviewHits([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetchSearch(trimmed, controller.signal)
        .then((data) => setPreviewHits(data.topHits.slice(0, 6)))
        .catch(() => {
          if (!controller.signal.aborted) setPreviewHits([]);
        });
    }, 180);
  };

  const hasResults =
    payload &&
    (payload.total > 0 ||
      payload.activities.length > 0 ||
      payload.officialOfferings.length > 0 ||
      payload.resorts.length > 0);

  const quickLinks = payload
    ? [...payload.pages, ...payload.categories].slice(0, 6)
    : [];

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
              onFocus={() => setPreviewOpen(true)}
              onBlur={() => window.setTimeout(() => setPreviewOpen(false), 160)}
              placeholder='Try "campfire", "Polynesian", or "pool games"'
              className="form-control search-form__input"
              autoComplete="off"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-controls={previewOpen ? "search-preview-list" : undefined}
              aria-expanded={previewOpen && previewHits.length > 0}
            />
            {previewOpen && previewHits.length > 0 && query.trim().length >= 2 && (
              <div className="search-preview" id="search-preview-list" role="listbox">
                {previewHits.map((hit) => (
                  <SearchHitRow
                    key={hit.id}
                    hit={hit}
                    compact
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
        <p className="search-empty-intro">
          Ask like a concierge — campfires near your resort, pool games,
          tonight&apos;s movies, or arcade games.
        </p>
      )}

      {loading && q && (
        <p className="search-status" aria-live="polite">
          Searching across activities, resorts, movies, and guides…
        </p>
      )}

      {!loading && q && payload && !hasResults && (
        <div className="search-no-results">
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
                  Best matches
                </h2>
                <p className="search-section__meta">{payload.total} results</p>
              </div>
              <div className="search-hit-list">
                {payload.topHits.map((hit) => (
                  <SearchHitRow key={hit.id} hit={hit} />
                ))}
              </div>
            </section>
          )}

          {quickLinks.length > 0 && (
            <section className="search-section" aria-labelledby="search-quick-heading">
              <h2 id="search-quick-heading" className="search-section__title">
                Quick jumps
              </h2>
              <div className="search-quick-grid">
                {quickLinks.map((hit) => (
                  <SearchHitRow key={hit.id} hit={hit} compact />
                ))}
              </div>
            </section>
          )}

          {payload.resorts.length > 0 && (
            <section className="search-section" aria-labelledby="search-resorts-heading">
              <h2 id="search-resorts-heading" className="search-section__title">
                Resorts
              </h2>
              <div className="search-resort-grid">
                {payload.resorts.map((resort) => (
                  <ResortCard key={resort.slug} resort={resort} />
                ))}
              </div>
            </section>
          )}

          {payload.movies.length > 0 && (
            <section className="search-section" aria-labelledby="search-movies-heading">
              <h2 id="search-movies-heading" className="search-section__title">
                Movies under the stars
              </h2>
              <div className="search-movie-list">
                {payload.movies.map((movie) => (
                  <MovieListingCard
                    key={movie.id}
                    movie={movie}
                    variant="day"
                    linkToTonight
                  />
                ))}
              </div>
            </section>
          )}

          {payload.officialOfferings.length > 0 && (
            <section className="search-section" aria-labelledby="search-offerings-heading">
              <h2 id="search-offerings-heading" className="search-section__title">
                Official recreation offerings
              </h2>
              <ActivityOfferingGrid
                offerings={payload.officialOfferings}
                showResort
                emptyMessage="No official recreation offerings matched."
              />
            </section>
          )}

          {payload.guides.length > 0 && (
            <section className="search-section" aria-labelledby="search-guides-heading">
              <h2 id="search-guides-heading" className="search-section__title">
                Guides
              </h2>
              <div className="search-hit-list">
                {payload.guides.map((guide) => (
                  <SearchHitRow
                    key={guide.slug}
                    hit={{
                      id: `guide-${guide.slug}`,
                      kind: "guide",
                      title: guide.title,
                      subtitle: "Planning guide",
                      description: guide.description,
                      href: guide.href,
                      score: 0,
                      badges: ["Guide"],
                      guide,
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {payload.activities.length > 0 && (
            <section className="search-section" aria-labelledby="search-activities-heading">
              <h2 id="search-activities-heading" className="search-section__title">
                Activities
              </h2>
              <ActivityGrid
                activities={payload.activities}
                onSave={addActivity}
                emptyMessage="No activities matched."
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
