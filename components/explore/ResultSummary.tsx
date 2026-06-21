"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";
import { cn } from "@/lib/utils";
import type { ActivitySortKey } from "@/lib/activities/sort";

interface ResultSummaryProps {
  count: number;
  className?: string;
  compact?: boolean;
}

const SORT_OPTIONS: { value: ActivitySortKey; label: string }[] = [
  { value: "time", label: "Happening soon" },
  { value: "free", label: "Free first" },
  { value: "quality", label: "Recently verified" },
  { value: "resort", label: "By resort" },
  { value: "category", label: "By category" },
];

export function ResultSummary({
  count,
  className,
  compact = false,
}: ResultSummaryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilters = [
    searchParams.get("resort"),
    searchParams.get("category"),
    searchParams.get("daypart"),
    searchParams.get("free") === "true" ? "free" : null,
    searchParams.get("q"),
  ].filter(Boolean).length;

  const currentSort = (searchParams.get("sort") as ActivitySortKey) || "time";

  const label =
    count === 0
      ? "No activities found"
      : count === 1
        ? "1 activity"
        : `${count} activities`;

  const handleSort = (value: ActivitySortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "time") params.delete("sort");
    else params.set("sort", value);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/activities?${qs}` : "/activities");
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
      </label>
    </div>
  );
}
