"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ExploreSearchBarProps {
  basePath?: string;
  globalSearch?: boolean;
}

export function ExploreSearchBar({
  basePath = "/activities",
  globalSearch = false,
}: ExploreSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (globalSearch) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("q", trimmed);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  return (
    <form onSubmit={handleSubmit} className="explore-search" role="search">
      <label className="sr-only" htmlFor="explore-search-input">
        Search activities
      </label>
      <div className="flex gap-2">
        <input
          id="explore-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            globalSearch
              ? "Search everything…"
              : "Search activities (or try full search)…"
          }
          className="form-control flex-1"
          autoComplete="off"
        />
        <button type="submit" className="btn-primary shrink-0 px-5 text-sm">
          Search
        </button>
      </div>
    </form>
  );
}
