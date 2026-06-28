"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";
import { cn } from "@/lib/utils";
import type { ActivitySortKey } from "@/lib/activities/sort";

interface ResultSummaryProps {
  count: number;
  className?: string;
  compact?: boolean;
  basePath?: string;
}

const SORT_OPTIONS: { value: ActivitySortKey; label: string; help: string }[] = [
  { value: "time", label: "Happening soon", help: "Soonest useful activities first." },
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
}: ResultSummaryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilters = [
    searchParams.get("resort"),
    searchParams.get("category"),
    searchParams.get("daypart") ?? searchParams.get("time"),
    searchParams.get("duration"),
    searchParams.get("near"),
    searchParams.get("transport"),
    searchParams.get("area"),
    searchParams.get("weather"),
    searchParams.get("free") === "true" ? "free" : null,
    searchParams.get("reservation") === "true" ? "reservation" : null,
    searchParams.get("ticket_required") ? "ticket_required" : null,
    searchParams.get("q"),
  ].filter(Boolean).length;

  const requestedSort = searchParams.get("sort") as ActivitySortKey | null;
  const currentSort =
    requestedSort && SORT_VALUES.has(requestedSort) ? requestedSort : "time";

  const label =
    count === 0
      ? "No results found"
      : count === 1
        ? "1 result"
      : `${count} results`;
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
        className="font-bold text-[var(--color-foreground)]"
        aria-live="polite"
        aria-atomic="true"
      >
        {label}
        {activeFilters > 0 && (
          <span className="ml-2 font-normal text-[var(--color-muted)]">
            · {activeFilters} filter{activeFilters !== 1 ? "s" : ""} active
          </span>
        )}
      </p>

      <label className={cn("result-summary__sort", compact ? "text-xs" : "text-sm")}>
        <span className="sr-only">Sort by</span>
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
