"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { MOOD_CHIPS } from "@/lib/categories/meta";
import { cn, formatCategory } from "@/lib/utils";
import type { Daypart } from "@/lib/types/occurrence";

const DAYPARTS: { value: Daypart; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "late", label: "Late" },
];

const CATEGORIES = [
  "poolside",
  "campfire",
  "movies_under_stars",
  "fitness_wellness",
  "arts_crafts",
  "arcade",
  "signature",
  "resort_activity",
];

interface FilterRailProps {
  resorts: { slug: string; name: string }[];
  basePath?: string;
}

export function FilterRail({ resorts, basePath = "/activities" }: FilterRailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      const qs = params.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath);
    },
    [router, searchParams, basePath]
  );

  const activeResort = searchParams.get("resort");
  const activeCategory = searchParams.get("category");
  const activeDaypart = searchParams.get("daypart");
  const freeOnly = searchParams.get("free") === "true";

  const clearAll = () => router.push(basePath);

  return (
    <aside className="filter-rail space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Filters</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Narrow by mood, resort, or time of day.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
          Quick moods
        </p>
        <div className="flex flex-wrap gap-2">
          {MOOD_CHIPS.map((chip) => (
            <Link
              key={chip.id}
              href={chip.href}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 text-xs font-bold transition-colors hover:border-[var(--accent)]"
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>

      <FilterFields
        resorts={resorts}
        activeResort={activeResort}
        activeCategory={activeCategory}
        activeDaypart={activeDaypart}
        freeOnly={freeOnly}
        update={update}
      />

      {(activeResort || activeCategory || activeDaypart || freeOnly) && (
        <button
          type="button"
          onClick={clearAll}
          className="text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Clear all filters
        </button>
      )}
    </aside>
  );
}

export function FilterFields({
  resorts,
  activeResort,
  activeCategory,
  activeDaypart,
  freeOnly,
  update,
  searchableResorts = false,
}: {
  resorts: { slug: string; name: string }[];
  activeResort: string | null;
  activeCategory: string | null;
  activeDaypart: string | null;
  freeOnly: boolean;
  update: (key: string, value: string | null) => void;
  searchableResorts?: boolean;
}) {
  const [resortQuery, setResortQuery] = useState("");

  const filteredResorts = useMemo(() => {
    const q = resortQuery.trim().toLowerCase();
    if (!q) return resorts;
    return resorts.filter((r) => r.name.toLowerCase().includes(q));
  }, [resorts, resortQuery]);

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
          Time of day
        </p>
        <div className="flex flex-wrap gap-2">
          {DAYPARTS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() =>
                update("daypart", activeDaypart === d.value ? null : d.value)
              }
              className={cn(
                "filter-pill",
                activeDaypart === d.value && "filter-pill--active"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {resorts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Resort
          </p>
          {(searchableResorts || resorts.length > 10) && (
            <input
              type="search"
              value={resortQuery}
              onChange={(e) => setResortQuery(e.target.value)}
              placeholder="Search resorts…"
                  className="form-control"
                  aria-label="Search resorts"
                />
          )}
          {searchableResorts ? (
            <div className="max-h-48 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-[var(--color-card-border)] p-2">
              <button
                type="button"
                onClick={() => update("resort", null)}
                className={cn(
                  "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors",
                  !activeResort
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "hover:bg-[var(--color-sun-cream)]"
                )}
              >
                All resorts
              </button>
              {filteredResorts.map((r) => (
                <button
                  key={r.slug}
                  type="button"
                  onClick={() => update("resort", r.slug)}
                  className={cn(
                    "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors",
                    activeResort === r.slug
                      ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                      : "hover:bg-[var(--color-sun-cream)]"
                  )}
                >
                  {r.name}
                </button>
              ))}
              {filteredResorts.length === 0 && (
                <p className="px-3 py-2 text-sm text-[var(--color-muted)]">
                  No resorts match &ldquo;{resortQuery}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <select
              value={activeResort ?? ""}
              onChange={(e) => update("resort", e.target.value || null)}
              className="form-control"
            >
              <option value="">All resorts</option>
              {filteredResorts.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
          Category
        </span>
        <select
          value={activeCategory ?? ""}
          onChange={(e) => update("category", e.target.value || null)}
          className="form-control"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {formatCategory(c)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => update("free", freeOnly ? null : "true")}
        className={cn(
          "filter-pill w-full",
          freeOnly && "filter-pill--active"
        )}
      >
        {freeOnly ? "✓ Free only" : "Free only"}
      </button>
    </div>
  );
}
