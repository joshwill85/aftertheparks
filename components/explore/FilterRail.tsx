"use client";

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
              className="rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-bold transition-colors hover:border-[var(--accent)]"
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
}: {
  resorts: { slug: string; name: string }[];
  activeResort: string | null;
  activeCategory: string | null;
  activeDaypart: string | null;
  freeOnly: boolean;
  update: (key: string, value: string | null) => void;
}) {
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
                "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                activeDaypart === d.value
                  ? "bg-[var(--color-citrus)] text-white shadow-sm"
                  : "border border-[var(--color-card-border)]"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {resorts.length > 0 && (
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Resort
          </span>
          <select
            value={activeResort ?? ""}
            onChange={(e) => update("resort", e.target.value || null)}
            className="w-full rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2.5 text-sm"
          >
            <option value="">All resorts</option>
            {resorts.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
          Category
        </span>
        <select
          value={activeCategory ?? ""}
          onChange={(e) => update("category", e.target.value || null)}
          className="w-full rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2.5 text-sm"
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
          "w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-colors",
          freeOnly
            ? "bg-[var(--accent)]/15 text-[var(--accent)]"
            : "border border-[var(--color-card-border)]"
        )}
      >
        {freeOnly ? "✓ Free only" : "Free only"}
      </button>
    </div>
  );
}
