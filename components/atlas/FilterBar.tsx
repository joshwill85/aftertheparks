"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { IconGlyph } from "@/components/icons/IconGlyph";
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

interface FilterBarProps {
  resorts?: { slug: string; name: string }[];
  basePath?: string;
}

export function FilterBar({ resorts = [], basePath = "/activities" }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${basePath}?${params.toString()}`);
    },
    [router, searchParams, basePath]
  );

  const activeResort = searchParams.get("resort");
  const activeCategory = searchParams.get("category");
  const activeDaypart = searchParams.get("daypart");
  const activeCount = [activeResort, activeCategory, activeDaypart].filter(
    Boolean
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MOOD_CHIPS.map((chip) => (
          <Link
            key={chip.id}
            href={chip.href}
            className="shrink-0 rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--accent)]"
          >
            {chip.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex flex-1 items-center justify-between rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-4 py-3 text-left text-sm md:hidden"
        >
          <span>
            Filters
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs text-[var(--accent)]">
                {activeCount}
              </span>
            )}
          </span>
          <IconGlyph iconKey="chevron_down" className="text-sm" />
        </button>

        <div className="hidden flex-1 flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)]/80 p-4 backdrop-blur-sm md:flex">
          <FilterControls
            resorts={resorts}
            activeResort={activeResort}
            activeCategory={activeCategory}
            activeDaypart={activeDaypart}
            update={update}
          />
        </div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close filters"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display font-semibold">Filters</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="text-sm text-[var(--color-muted)]"
              >
                Done
              </button>
            </div>
            <FilterControls
              resorts={resorts}
              activeResort={activeResort}
              activeCategory={activeCategory}
              activeDaypart={activeDaypart}
              update={update}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FilterControls({
  resorts,
  activeResort,
  activeCategory,
  activeDaypart,
  update,
}: {
  resorts: { slug: string; name: string }[];
  activeResort: string | null;
  activeCategory: string | null;
  activeDaypart: string | null;
  update: (key: string, value: string | null) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {DAYPARTS.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() =>
              update("daypart", activeDaypart === d.value ? null : d.value)
            }
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-all",
              activeDaypart === d.value
                ? "bg-[var(--color-citrus)] text-white shadow-sm"
                : "border border-[var(--color-card-border)]"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {resorts.length > 0 && (
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Resort
            </span>
            <select
              value={activeResort ?? ""}
              onChange={(e) => update("resort", e.target.value || null)}
              className="w-full rounded-xl border border-[var(--color-card-border)] bg-transparent px-3 py-2"
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
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Category
          </span>
          <select
            value={activeCategory ?? ""}
            onChange={(e) => update("category", e.target.value || null)}
            className="w-full rounded-xl border border-[var(--color-card-border)] bg-transparent px-3 py-2"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {formatCategory(c)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
