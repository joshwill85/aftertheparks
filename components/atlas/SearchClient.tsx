"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { usePlan } from "@/components/atlas/PlanProvider";

const SUGGESTIONS = [
  "campfire",
  "movie",
  "free",
  "crafts",
  "pool",
  "arcade",
  "scavenger hunt",
  "yoga",
];

export function SearchClient() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<ActivityOccurrence[]>([]);
  const [loading, setLoading] = useState(false);
  const { addActivity } = usePlan();

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.activities ?? []))
      .finally(() => setLoading(false));
  }, [q]);

  const runSearch = (term: string) => {
    const params = new URLSearchParams();
    if (term) params.set("q", term);
    window.history.pushState(null, "", `/search?${params.toString()}`);
    setQuery(term);
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(term)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.activities ?? []))
      .finally(() => setLoading(false));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="postcard-texture mb-4 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
        <label className="block text-sm font-medium text-[var(--color-muted)]">
          Search like a concierge
        </label>
        <div className="mt-2 flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "campfire", "movie", or "free"'
            className="flex-1 rounded-xl border border-[var(--color-card-border)] bg-transparent px-4 py-3"
            aria-label="Search query"
          />
          <button
            type="submit"
            className="rounded-xl bg-[var(--accent)] px-5 py-3 font-medium text-white"
          >
            Search
          </button>
        </div>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => runSearch(s)}
            className="rounded-full border border-[var(--color-card-border)] px-3 py-1 text-sm hover:border-[var(--accent)]"
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[var(--color-muted)]">Searching…</p>
      ) : q && results.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          No matches for &ldquo;{q}&rdquo;. Try a broader term or{" "}
          <Link href="/activities" className="text-[var(--accent)] hover:underline">
            explore all activities
          </Link>
          .
        </p>
      ) : (
        <ActivityGrid
          activities={results}
          onSave={addActivity}
          emptyMessage="Search for campfires, movies, crafts, and more."
        />
      )}
    </div>
  );
}
