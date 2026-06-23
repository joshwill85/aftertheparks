"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ResortCard } from "@/components/resort/ResortCard";
import {
  formatResortArea,
  getTierSortIndex,
  TIER_ORDER,
  tierFilterLabel,
} from "@/lib/resorts/display";
import type { ResortSummary } from "@/lib/types/occurrence";
import { cn } from "@/lib/utils";

type SortKey = "name" | "activities" | "today" | "tonight" | "tier";

interface ResortGridProps {
  resorts: ResortSummary[];
  todayByResort?: Record<string, number>;
  tonightByResort?: Record<string, number>;
  highlightsByResort?: Record<string, string[]>;
  previewLimit?: number;
  showViewAllLink?: boolean;
  compactToolbar?: boolean;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name (A–Z)" },
  { value: "tier", label: "Resort tier" },
  { value: "activities", label: "Most activities" },
  { value: "today", label: "Most happening today" },
  { value: "tonight", label: "Most tonight" },
];

function normalizeCounts(map?: Record<string, number>) {
  return map ?? {};
}

export function ResortGrid({
  resorts,
  todayByResort,
  tonightByResort,
  highlightsByResort,
  previewLimit,
  showViewAllLink = false,
  compactToolbar = false,
}: ResortGridProps) {
  const today = normalizeCounts(todayByResort);
  const tonight = normalizeCounts(tonightByResort);
  const highlights = highlightsByResort ?? {};

  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<string>("all");
  const [area, setArea] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("name");

  const areas = useMemo(() => {
    const set = new Set(resorts.map((resort) => resort.area));
    return [...set].sort((a, b) =>
      formatResortArea(a).localeCompare(formatResortArea(b))
    );
  }, [resorts]);

  const tiers = useMemo(() => {
    const set = new Set(resorts.map((resort) => resort.category));
    const ordered = TIER_ORDER.filter((value) => set.has(value));
    const extras = [...set].filter(
      (value) => !TIER_ORDER.includes(value as (typeof TIER_ORDER)[number])
    );
    return [...ordered, ...extras];
  }, [resorts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = resorts.filter((resort) => {
      if (tier !== "all" && resort.category !== tier) return false;
      if (area !== "all" && resort.area !== area) return false;
      if (!q) return true;
      return (
        resort.name.toLowerCase().includes(q) ||
        resort.slug.replace(/-/g, " ").includes(q) ||
        formatResortArea(resort.area).toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "activities":
          return (
            b.activityCount + b.offeringCount -
              (a.activityCount + a.offeringCount) ||
            a.name.localeCompare(b.name)
          );
        case "today":
          return (today[b.slug] ?? 0) - (today[a.slug] ?? 0);
        case "tonight":
          return (tonight[b.slug] ?? 0) - (tonight[a.slug] ?? 0);
        case "tier":
          return (
            getTierSortIndex(a.category) - getTierSortIndex(b.category) ||
            a.name.localeCompare(b.name)
          );
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

    if (previewLimit != null) {
      list = list.slice(0, previewLimit);
    }

    return list;
  }, [resorts, query, tier, area, sort, today, tonight, previewLimit]);

  const totalMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resorts.filter((resort) => {
      if (tier !== "all" && resort.category !== tier) return false;
      if (area !== "all" && resort.area !== area) return false;
      if (!q) return true;
      return (
        resort.name.toLowerCase().includes(q) ||
        resort.slug.replace(/-/g, " ").includes(q) ||
        formatResortArea(resort.area).toLowerCase().includes(q)
      );
    }).length;
  }, [resorts, query, tier, area]);

  const clearFilters = () => {
    setQuery("");
    setTier("all");
    setArea("all");
    setSort("name");
  };

  const filtersActive = query.trim() !== "" || tier !== "all" || area !== "all";

  return (
    <div className="resort-grid-shell">
      <div
        className={cn(
          "resort-toolbar",
          compactToolbar && "resort-toolbar--compact"
        )}
      >
        <label className="resort-toolbar__search">
          <span className="sr-only">Search resorts</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or area…"
            className="form-control resort-toolbar__input"
          />
        </label>

        <label className="resort-toolbar__sort">
          <span className="resort-toolbar__sort-label">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="form-control resort-toolbar__select"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="resort-toolbar__filters">
          <div className="resort-filter-row">
            <span className="resort-filter-row__label">Tier</span>
            <div className="resort-filter-pills" role="group" aria-label="Filter by tier">
              <button
                type="button"
                className={cn(
                  "resort-filter-pill",
                  tier === "all" && "resort-filter-pill--active"
                )}
                onClick={() => setTier("all")}
              >
                All
              </button>
              {tiers.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "resort-filter-pill",
                    tier === value && "resort-filter-pill--active"
                  )}
                  onClick={() => setTier(value)}
                >
                  {tierFilterLabel(value)}
                </button>
              ))}
            </div>
          </div>

          <div className="resort-filter-row">
            <span className="resort-filter-row__label">Area</span>
            <div className="resort-filter-pills" role="group" aria-label="Filter by area">
              <button
                type="button"
                className={cn(
                  "resort-filter-pill",
                  area === "all" && "resort-filter-pill--active"
                )}
                onClick={() => setArea("all")}
              >
                All areas
              </button>
              {areas.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "resort-filter-pill",
                    area === value && "resort-filter-pill--active"
                  )}
                  onClick={() => setArea(value)}
                >
                  {formatResortArea(value)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="resort-toolbar__meta">
          <p className="resort-toolbar__count">
            {previewLimit != null
              ? `Showing ${filtered.length} featured resort${filtered.length === 1 ? "" : "s"}`
              : `Showing ${filtered.length} of ${totalMatches} resort${totalMatches === 1 ? "" : "s"}`}
          </p>
          {filtersActive && (
            <button
              type="button"
              className="resort-toolbar__clear"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="resort-grid-empty">
          <p className="resort-grid-empty__title">No resorts match those filters</p>
          <p className="resort-grid-empty__copy">
            Try a different search, tier, or area — or clear filters to see everything.
          </p>
          <button type="button" className="btn-secondary text-sm" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="resort-card-grid">
          {filtered.map((resort) => (
            <ResortCard
              key={resort.slug}
              resort={resort}
              todayCount={today[resort.slug]}
              tonightCount={tonight[resort.slug]}
              highlights={highlights[resort.slug]}
            />
          ))}
        </div>
      )}

      {showViewAllLink && (
        <Link href="/resorts" className="home-section__link resort-grid__view-all">
          View all 31 resorts →
        </Link>
      )}
    </div>
  );
}
