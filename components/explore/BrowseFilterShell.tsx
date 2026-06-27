"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { MOOD_CHIPS } from "@/lib/categories/meta";
import { mergeMoodChipHref, parseBrowseParams } from "@/lib/explore/browseParams";
import {
  buildActiveFilterChips,
  buildNoResultsRecovery,
  type ActiveFilterChip,
  type FilterImpact,
  type FilterRecoveryAction,
} from "@/lib/explore/filterImpact";
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
  filterImpact: FilterImpact;
  children: ReactNode;
  /** Extra content in the results column below filters (explore plan rail handled separately). */
  showGlobalSearchLink?: boolean;
}

export function BrowseFilterShell({
  variant,
  resorts,
  resultCount,
  filterImpact,
  children,
  showGlobalSearchLink = true,
}: BrowseFilterShellProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [undoHref, setUndoHref] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = pathname;
  const filters = useMemo(
    () => parseBrowseParams(searchParams),
    [searchParams]
  );
  const activeChips = useMemo(
    () => buildActiveFilterChips(filters, resorts, basePath),
    [filters, resorts, basePath]
  );
  const recoveryActions = useMemo(
    () => buildNoResultsRecovery(filters, resorts, basePath),
    [filters, resorts, basePath]
  );

  const activeCount = activeChips.length;

  const hideDaypart = variant === "tonight";
  const currentHref = searchParams.toString()
    ? `${basePath}?${searchParams.toString()}`
    : basePath;

  const handleClearAll = () => {
    if (activeCount > 0) setUndoHref(currentHref);
    router.push(basePath);
  };

  const handleUndo = () => {
    if (!undoHref) return;
    router.push(undoHref);
    setUndoHref(null);
  };

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
              filterImpact={filterImpact}
              onClearAll={handleClearAll}
            />
          </div>
        </div>

        <div className="results-column min-w-0 space-y-4">
          <div className="browse-controls explore-controls sticky top-[64px] z-40 -mx-4 border-b border-[var(--color-card-border)] bg-[var(--color-sun-cream)]/92 px-4 py-3 backdrop-blur-[18px] min-[900px]:static min-[900px]:mx-0 min-[900px]:border-0 min-[900px]:bg-transparent min-[900px]:p-0 min-[900px]:backdrop-blur-none">
            <ExploreSearchBar basePath={basePath} />
            {showGlobalSearchLink && (
              <Link
                href="/search"
                className="explore-search__global-link inline-flex items-center"
              >
                Search everything <IconGlyph iconKey="arrow_right" className="ml-1 text-sm" />
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
                <IconGlyph iconKey="chevron_down" className="text-sm" />
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

            {(activeChips.length > 0 || undoHref) && (
              <FilterStateBar
                chips={activeChips}
                undoHref={undoHref}
                onClearAll={handleClearAll}
                onUndo={handleUndo}
              />
            )}
            <div className="mt-3 min-[900px]:mt-0">
              <ResultSummary
                count={resultCount}
                compact
                basePath={basePath}
              />
            </div>
            {activeChips.length > 0 && (
              <FilterAlchemyBoard chips={activeChips} resultCount={resultCount} />
            )}
          </div>

          <div id="activities" className="scroll-mt-24">
            {resultCount === 0 && activeChips.length > 0 && (
              <FilterRecoveryPanel actions={recoveryActions} />
            )}
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
        activeCount={activeCount}
        filterImpact={filterImpact}
        onClearAll={handleClearAll}
      />
    </div>
  );
}

function FilterAlchemyBoard({
  chips,
  resultCount,
}: {
  chips: ActiveFilterChip[];
  resultCount: number;
}) {
  const visibleChips = chips.slice(0, 4);
  const blocked = resultCount === 0;

  return (
    <section
      className={cn(
        "wow-filter-alchemy-board",
        blocked && "wow-filter-alchemy-board--blocked"
      )}
      data-wow-moment="filter_alchemy_board"
      aria-label="Filter effect summary"
    >
      <div className="wow-filter-alchemy-board__orb" aria-hidden>
        {visibleChips.map((chip, index) => (
          <span
            key={chip.id}
            className="wow-filter-alchemy-board__token"
            style={{ "--alchemy-index": index } as CSSProperties & Record<"--alchemy-index", number>}
          >
            {chip.label}
          </span>
        ))}
      </div>
      <div className="wow-filter-alchemy-board__copy">
        <p className="wow-filter-alchemy-board__count">
          {resultCount} {resultCount === 1 ? "match" : "matches"}
        </p>
        <p>
          {blocked
            ? "That mix has no results. Remove one filter or try a nearby resort."
            : `${chips.length} ${chips.length === 1 ? "filter" : "filters"} applied.`}
        </p>
      </div>
    </section>
  );
}

function FilterStateBar({
  chips,
  undoHref,
  onClearAll,
  onUndo,
}: {
  chips: ActiveFilterChip[];
  undoHref: string | null;
  onClearAll: () => void;
  onUndo: () => void;
}) {
  return (
    <div className="filter-state-bar" aria-label="Active filters">
      {chips.length > 0 && (
        <div className="filter-state-bar__chips">
          {chips.length === 3 && (
            <span
              className="hidden-resort-magic hrm-filter-constellation"
              data-hidden-detail="filter_chip_constellation"
              aria-hidden
            />
          )}
          {chips.map((chip) => (
            <Link
              key={chip.id}
              href={chip.removeHref}
              className="filter-chip"
              aria-label={`Remove ${chip.label} filter`}
            >
              <span>{chip.label}</span>
              <IconGlyph iconKey="close" className="filter-chip__remove" />
            </Link>
          ))}
        </div>
      )}
      <div className="filter-state-bar__actions">
        {chips.length > 0 && (
          <button type="button" onClick={onClearAll} className="btn-ghost filter-state-bar__clear">
            Clear
          </button>
        )}
        {undoHref && (
          <button type="button" onClick={onUndo} className="btn-ghost filter-state-bar__undo">
            Undo clear
          </button>
        )}
      </div>
    </div>
  );
}

function FilterRecoveryPanel({ actions }: { actions: FilterRecoveryAction[] }) {
  return (
    <section className="filter-recovery" aria-labelledby="filter-recovery-title">
      <p id="filter-recovery-title" className="filter-recovery__title">
        No activities match those filters.
      </p>
      <p className="filter-recovery__copy">
        Clear one filter or try a broader search.
      </p>
      <div className="filter-recovery__actions">
        {actions.slice(0, 4).map((action) => (
          <Link
            key={`${action.label}-${action.href}`}
            href={action.href}
            className={action.intent === "primary" ? "btn-primary text-sm" : "btn-secondary text-sm"}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
