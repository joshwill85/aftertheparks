"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface ResultSummaryProps {
  count: number;
  className?: string;
  compact?: boolean;
}

export function ResultSummary({
  count,
  className,
  compact = false,
}: ResultSummaryProps) {
  const searchParams = useSearchParams();
  const activeFilters = [
    searchParams.get("resort"),
    searchParams.get("category"),
    searchParams.get("daypart"),
    searchParams.get("free") === "true" ? "free" : null,
  ].filter(Boolean).length;

  const label =
    count === 0
      ? "No activities found"
      : count === 1
        ? "1 activity"
        : `${count} activities`;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        compact ? "text-sm" : "",
        className
      )}
    >
      <p className="font-bold text-[var(--color-foreground)]">
        {label}
        {activeFilters > 0 && (
          <span className="ml-2 font-normal text-[var(--color-muted)]">
            · {activeFilters} filter{activeFilters !== 1 ? "s" : ""} active
          </span>
        )}
      </p>

      <label className={cn("flex items-center gap-2", compact ? "text-xs" : "text-sm")}>
        <span className="sr-only">Sort by</span>
        <select
          className="rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-1.5 text-sm font-medium"
          defaultValue="time"
          aria-label="Sort results"
        >
          <option value="time">Soonest first</option>
          <option value="resort">By resort</option>
          <option value="category">By category</option>
        </select>
      </label>
    </div>
  );
}
