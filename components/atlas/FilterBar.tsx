"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
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
  const freeOnly = searchParams.get("free") === "true";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)]/60 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap gap-2">
        <span className="w-full text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Daypart
        </span>
        {DAYPARTS.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() =>
              update("daypart", activeDaypart === d.value ? null : d.value)
            }
            className={cn(
              "rounded-full px-3 py-1 text-sm transition-all",
              activeDaypart === d.value
                ? "bg-[var(--color-citrus)] text-white shadow-md shadow-[var(--color-citrus)]/30"
                : "border border-[var(--color-card-border)] hover:border-[var(--color-citrus)]"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {resorts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="w-full text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Resort
          </span>
          <select
            value={activeResort ?? ""}
            onChange={(e) => update("resort", e.target.value || null)}
            className="rounded-lg border border-[var(--color-card-border)] bg-transparent px-3 py-1.5 text-sm"
            aria-label="Filter by resort"
          >
            <option value="">All resorts</option>
            {resorts.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={activeCategory ?? ""}
          onChange={(e) => update("category", e.target.value || null)}
          className="rounded-lg border border-[var(--color-card-border)] bg-transparent px-3 py-1.5 text-sm"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => update("free", freeOnly ? null : "true")}
          className={cn(
            "rounded-full px-3 py-1 text-sm",
            freeOnly
              ? "bg-[var(--accent)]/20 text-[var(--accent)]"
              : "border border-[var(--color-card-border)]"
          )}
        >
          Free only
        </button>
      </div>
    </div>
  );
}
