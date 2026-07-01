"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";
import type { ActiveFilterChip } from "@/lib/explore/filterImpact";
import { cn } from "@/lib/utils";
import type { ActivitySortKey } from "@/lib/activities/sort";

interface ResultSummaryProps {
  count: number;
  className?: string;
  compact?: boolean;
  basePath?: string;
  activeChips?: ActiveFilterChip[];
}

const SORT_OPTIONS: { value: ActivitySortKey; label: string; help: string }[] = [
  { value: "time", label: "Happening soon", help: "Next future start first." },
  { value: "alpha", label: "Alphabetical", help: "Activity names from A to Z." },
  { value: "free", label: "Free first", help: "Free activities before paid ones." },
  { value: "paid", label: "Paid first", help: "Paid activities before free ones." },
  { value: "quality", label: "Recently verified", help: "Newest verified listings first." },
  { value: "resort", label: "By resort", help: "Grouped for comparing places." },
  { value: "category", label: "By category", help: "Grouped by kind of activity." },
];
const SORT_VALUES = new Set<ActivitySortKey>(SORT_OPTIONS.map((option) => option.value));

export function ResultSummary({
  count,
  className,
  compact = false,
  basePath = "/activities",
  activeChips,
}: ResultSummaryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilters = activeChips?.length ?? [
    searchParams.get("resort"),
    searchParams.get("category"),
    searchParams.get("daypart") ?? searchParams.get("time"),
    searchParams.get("near"),
    searchParams.get("transport"),
    searchParams.get("area"),
    searchParams.get("weather"),
    searchParams.get("free") === "true" ? "free" : null,
    searchParams.get("reservation") === "true" ? "reservation" : null,
    searchParams.get("q"),
  ].filter(Boolean).length;

  const requestedSort = searchParams.get("sort") as ActivitySortKey | null;
  const currentSort =
    requestedSort && SORT_VALUES.has(requestedSort) ? requestedSort : "time";

  const summarySentence =
    count === 0
      ? "No activities match these filters"
      : `Showing ${count} activit${count === 1 ? "y" : "ies"}${
          activeChips && activeChips.length > 0
            ? `: ${activeChips.map((chip) => chip.label).join(" + ")}`
            : ""
        }`;
  const sortHelp =
    SORT_OPTIONS.find((option) => option.value === currentSort)?.help ??
    SORT_OPTIONS[0].help;

  const handleSort = (value: ActivitySortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "time") params.delete("sort");
    else params.set("sort", value);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${basePath}?${qs}` : basePath);
    });
  };

  return (
    <div
      className={cn(
        "result-summary",
        compact ? "text-sm" : "",
        className
      )}
    >
      <p
        className="result-summary__count font-bold text-[var(--color-foreground)]"
        aria-live="polite"
        aria-atomic="true"
      >
        {summarySentence}
        {activeFilters > 0 && (
          <span className="ml-2 font-normal text-[var(--color-muted)]">
            {" · "}
            {activeFilters} filter{activeFilters !== 1 ? "s" : ""} active
          </span>
        )}
      </p>

      <label className={cn("result-summary__sort", compact ? "text-xs" : "text-sm")}>
        <span className="result-summary__sort-label">Sort</span>
        <select
          className="form-control"
          value={currentSort}
          aria-label="Sort results"
          onChange={(e) => handleSort(e.target.value as ActivitySortKey)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="result-summary__sort-help">{sortHelp}</span>
      </label>
    </div>
  );
}
