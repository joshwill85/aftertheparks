"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MOOD_CHIPS } from "@/lib/categories/meta";
import { mergeMoodChipHref } from "@/lib/explore/browseParams";
import { isMoodChipActive } from "@/lib/ui/moodChipActive";
import { cn } from "@/lib/utils";
import { FilterRail } from "@/components/explore/FilterRail";
import { FilterSheet } from "@/components/explore/FilterSheet";
import { ExploreSearchBar } from "@/components/explore/ExploreSearchBar";
import { ResultSummary } from "@/components/explore/ResultSummary";
import { BrowseDayTabs } from "@/components/explore/BrowseDayTabs";

export type BrowseFilterVariant = "today" | "tonight" | "explore";

interface BrowseFilterShellProps {
  variant: BrowseFilterVariant;
  resorts: { slug: string; name: string }[];
  resultCount: number;
  children: ReactNode;
  /** Extra content in the results column below filters (explore plan rail handled separately). */
  showGlobalSearchLink?: boolean;
}

export function BrowseFilterShell({
  variant,
  resorts,
  resultCount,
  children,
  showGlobalSearchLink = true,
}: BrowseFilterShellProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = pathname;

  const activeCount = [
    searchParams.get("resort"),
    searchParams.get("category"),
    variant !== "tonight" ? searchParams.get("daypart") : null,
    searchParams.get("free") === "true" ? "free" : null,
    searchParams.get("q"),
  ].filter(Boolean).length;

  const hideDaypart = variant === "tonight";

  return (
    <div
      className={cn(
        "browse-filter-shell explore-layout -mx-4 w-[calc(100%+2rem)] px-4 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-6",
        `browse-filter-shell--${variant}`
      )}
    >
      <BrowseDayTabs className="mb-5" />

      <div className="grid grid-cols-1 gap-6 min-[900px]:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
        <div className="filter-rail-wrapper hidden min-[900px]:block">
          <div className="filter-rail sticky top-24">
            <FilterRail
              resorts={resorts}
              basePath={basePath}
              hideDaypart={hideDaypart}
            />
          </div>
        </div>

        <div className="results-column min-w-0 space-y-4">
          <div className="browse-controls explore-controls sticky top-[64px] z-40 -mx-4 border-b border-[var(--color-card-border)] bg-[var(--color-sun-cream)]/92 px-4 py-3 backdrop-blur-[18px] min-[900px]:static min-[900px]:mx-0 min-[900px]:border-0 min-[900px]:bg-transparent min-[900px]:p-0 min-[900px]:backdrop-blur-none">
            <ExploreSearchBar basePath={basePath} />
            {showGlobalSearchLink && (
              <Link href="/search" className="explore-search__global-link">
                Search everything →
              </Link>
            )}

            <div className="mt-3 flex items-center gap-3 min-[900px]:hidden">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="explore-filters-btn btn-secondary justify-between px-4 text-sm font-bold"
              >
                <span>
                  Filters
                  {activeCount > 0 && (
                    <span className="browse-filter-badge ml-2 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs text-[var(--accent)]">
                      {activeCount}
                    </span>
                  )}
                </span>
                <span aria-hidden>▾</span>
              </button>
            </div>

            <div className="mood-chips-scroll mt-3 min-[900px]:mt-0 min-[900px]:hidden">
              <div className="mood-chips">
                {MOOD_CHIPS.map((chip) => {
                  const href = mergeMoodChipHref(chip.href, pathname, searchParams);
                  const active = isMoodChipActive(href, pathname, searchParams);
                  return (
                    <Link
                      key={chip.id}
                      href={href}
                      className={cn("mood-chip", active && "mood-chip--active")}
                      aria-current={active ? "page" : undefined}
                    >
                      {chip.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 min-[900px]:mt-0">
              <ResultSummary
                count={resultCount}
                compact
                basePath={basePath}
              />
            </div>
          </div>

          <div id="activities" className="scroll-mt-24">
            {children}
          </div>
        </div>
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        resorts={resorts}
        basePath={basePath}
        hideDaypart={hideDaypart}
      />
    </div>
  );
}
