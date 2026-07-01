"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { parseBrowseParams } from "@/lib/explore/browseParams";
import {
  buildActiveFilterChips,
  buildNoResultsRecovery,
  type ActiveFilterChip,
  type FilterImpact,
  type FilterRecoveryAction,
} from "@/lib/explore/filterImpact";
import { cn } from "@/lib/utils";
import { FilterRail } from "@/components/explore/FilterRail";
import { FilterSheet } from "@/components/explore/FilterSheet";
import { ResultSummary } from "@/components/explore/ResultSummary";
import { usePlan } from "@/components/atlas/PlanProvider";

export type BrowseFilterVariant = "today" | "tonight" | "explore";

interface BrowseFilterShellProps {
  variant: BrowseFilterVariant;
  resorts: { slug: string; name: string }[];
  resultCount: number;
  filterImpact: FilterImpact;
  children: ReactNode;
}

export function BrowseFilterShell({
  variant,
  resorts,
  resultCount,
  filterImpact,
  children,
}: BrowseFilterShellProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [undoHref, setUndoHref] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { homeResortSlug } = usePlan();
  const basePath = pathname;
  const filters = useMemo(
    () => parseBrowseParams(searchParams),
    [searchParams]
  );
  const hideDaypart = variant === "tonight";
  const hideFreeOnly = false;
  const effectiveFilters = useMemo(
    () => (hideFreeOnly ? { ...filters, free: false } : filters),
    [filters, hideFreeOnly]
  );
  const activeChips = useMemo(
    () => buildActiveFilterChips(effectiveFilters, resorts, basePath),
    [effectiveFilters, resorts, basePath]
  );
  const recoveryActions = useMemo(
    () => buildNoResultsRecovery(effectiveFilters, resorts, basePath),
    [effectiveFilters, resorts, basePath]
  );

  const activeCount = activeChips.length;
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
      <div className="grid grid-cols-1 gap-6 min-[900px]:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
        <div className="filter-rail-wrapper hidden min-[900px]:block">
          <div className="filter-rail-scroll-frame sticky top-24">
            <FilterRail
              resorts={resorts}
              basePath={basePath}
              hideDaypart={hideDaypart}
              hideFreeOnly={hideFreeOnly}
              filterImpact={filterImpact}
              homeResortSlug={homeResortSlug}
              onClearAll={handleClearAll}
            />
          </div>
        </div>

        <div className="results-column min-w-0 space-y-4">
          <div className="browse-controls min-[900px]:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open filters"
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
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

            {(activeChips.length > 0 || undoHref) && (
              <FilterStateBar
                chips={activeChips}
                undoHref={undoHref}
                onClearAll={handleClearAll}
                onUndo={handleUndo}
              />
            )}
            {filters.near === "my-resort" && filters.resort && (
              <NearMyResortNote selectedResortName={resortName(resorts, filters.resort)} />
            )}
          </div>

          <ResultSummary
            count={resultCount}
            basePath={basePath}
            activeChips={activeChips}
            compact
          />

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
        hideFreeOnly={hideFreeOnly}
        activeCount={activeCount}
        resultCount={resultCount}
        filterImpact={filterImpact}
        homeResortSlug={homeResortSlug}
        onClearAll={handleClearAll}
      />
    </div>
  );
}

function resortName(
  resorts: { slug: string; name: string }[],
  slug?: string
): string | undefined {
  if (!slug) return undefined;
  return resorts.find((resort) => resort.slug === slug)?.name ?? slug;
}

function NearMyResortNote({
  selectedResortName,
}: {
  selectedResortName?: string;
}) {
  return (
    <section className="mt-3 rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2 text-sm leading-relaxed text-[var(--color-muted)]">
      <p className="font-semibold text-[var(--color-foreground)]">First-night near my resort mode</p>
      <p>
        {selectedResortName
          ? `Showing tonight options in the same resort area as ${selectedResortName}, useful for arrival nights when a nearby direct-route plan is safer than a long transfer.`
          : "Choose a resort to narrow tonight to your resort area. Until then, this stays as a broad first-night planning mode instead of guessing where you are staying."}
      </p>
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
