"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { usePlan } from "@/components/atlas/PlanProvider";

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    window.history.pushState(null, "", `/search?${params.toString()}`);
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.activities ?? []))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search activities…"
          className="flex-1 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-4 py-3"
          aria-label="Search query"
        />
        <button
          type="submit"
          className="rounded-xl bg-[var(--accent)] px-5 py-3 text-white"
        >
          Search
        </button>
      </form>
      {loading ? (
        <p className="text-[var(--color-muted)]">Searching…</p>
      ) : (
        <ActivityGrid
          activities={results}
          onSave={addActivity}
          emptyMessage={
            q ? `No results for "${q}"` : "Enter a search term to get started."
          }
        />
      )}
    </div>
  );
}
