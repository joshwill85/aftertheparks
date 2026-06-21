"use client";

import Link from "next/link";
import { useState } from "react";
import { MOOD_CHIPS } from "@/lib/categories/meta";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { usePlan } from "@/components/atlas/PlanProvider";
import { FilterRail } from "@/components/explore/FilterRail";
import { FilterSheet } from "@/components/explore/FilterSheet";
import { ResultSummary } from "@/components/explore/ResultSummary";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { useSearchParams } from "next/navigation";

interface ExploreLayoutProps {
  activities: ActivityOccurrence[];
  resorts: { slug: string; name: string }[];
}

export function ExploreLayout({ activities, resorts }: ExploreLayoutProps) {
  const { items, addActivity } = usePlan();
  const [sheetOpen, setSheetOpen] = useState(false);
  const searchParams = useSearchParams();

  const activeCount = [
    searchParams.get("resort"),
    searchParams.get("category"),
    searchParams.get("daypart"),
    searchParams.get("free") === "true",
  ].filter(Boolean).length;

  return (
    <div className="explore-layout -mx-4 w-[calc(100%+2rem)] px-4 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-6">
      <div className="grid grid-cols-1 gap-6 min-[900px]:grid-cols-[280px_minmax(0,1fr)] min-[1100px]:grid-cols-[280px_minmax(0,1fr)_340px] lg:gap-6">
        {/* Desktop filter rail — hidden below 900px (lg breakpoint) */}
        <div className="filter-rail-wrapper hidden min-[900px]:block">
          <div className="filter-rail sticky top-24">
            <FilterRail resorts={resorts} />
          </div>
        </div>

        {/* Results column */}
        <div className="results-column min-w-0 space-y-4">
          {/* Mobile sticky controls */}
          <div className="explore-controls sticky top-[64px] z-40 -mx-4 border-b border-[var(--color-card-border)] bg-[var(--color-sun-cream)]/92 px-4 py-3 backdrop-blur-[18px] min-[900px]:static min-[900px]:mx-0 min-[900px]:border-0 min-[900px]:bg-transparent min-[900px]:p-0 min-[900px]:backdrop-blur-none">
            <div className="flex items-center gap-3 min-[900px]:hidden">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex min-h-11 flex-1 items-center justify-between rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-4 text-sm font-bold"
              >
                <span>
                  Filters
                  {activeCount > 0 && (
                    <span className="ml-2 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs text-[var(--accent)]">
                      {activeCount}
                    </span>
                  )}
                </span>
                <span aria-hidden>▾</span>
              </button>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] min-[900px]:mt-0 min-[900px]:hidden [&::-webkit-scrollbar]:hidden">
              {MOOD_CHIPS.map((chip) => (
                <Link
                  key={chip.id}
                  href={chip.href}
                  className="shrink-0 rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2 text-xs font-bold"
                >
                  {chip.label}
                </Link>
              ))}
            </div>

            <div className="mt-3 min-[900px]:mt-0">
              <ResultSummary count={activities.length} compact />
            </div>
          </div>

          <div className="results-grid">
            <ActivityGrid
              activities={activities}
              onSave={addActivity}
              columns={2}
              emptyMessage="No activities match your filters. Try broadening your search."
            />
          </div>
        </div>

        {/* Plan rail — hidden below 1100px (xl) */}
        <aside className="plan-rail-wrapper hidden min-[1100px]:block">
          <div className="plan-rail sticky top-24 space-y-4 rounded-[28px] border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">My Plan</h2>
              <Link
                href="/plan"
                className="text-sm font-bold text-[var(--accent)] hover:underline"
              >
                Open
              </Link>
            </div>

            {items.length === 0 ? (
              <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                Save activities as you browse and build a low-stress rest day.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.slice(0, 5).map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-[var(--color-card-border)] px-3 py-2.5"
                  >
                    <p className="text-sm font-bold leading-snug">{item.title}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {item.resortName}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {items.length > 0 && (
              <Link
                href="/plan"
                className="btn-primary inline-flex w-full min-h-11 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-lagoon)] to-[var(--color-palm)] text-sm font-bold text-white"
              >
                View full plan ({items.length})
              </Link>
            )}
          </div>
        </aside>
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        resorts={resorts}
      />
    </div>
  );
}
