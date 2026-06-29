"use client";

import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORY_META } from "@/lib/categories/meta";
import {
  selectedResortSlugs,
  toggleResortSlug,
} from "@/lib/explore/resortFilters";
import type { FilterImpact } from "@/lib/explore/filterImpact";
import { INTENT_PRESETS } from "@/lib/planning/presetDefinitions";
import { cn } from "@/lib/utils";

interface FilterRailProps {
  resorts: { slug: string; name: string }[];
  basePath?: string;
  hideDaypart?: boolean;
  filterImpact: FilterImpact;
  homeResortSlug?: string;
  onClearAll: () => void;
}

export function FilterRail({
  resorts,
  basePath = "/activities",
  hideDaypart = false,
  filterImpact,
  homeResortSlug,
  onClearAll,
}: FilterRailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string | Record<string, string | null>, value?: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (typeof key === "string") {
        if (value) params.set(key, value);
        else params.delete(key);
      } else {
        for (const [paramKey, paramValue] of Object.entries(key)) {
          if (paramValue) params.set(paramKey, paramValue);
          else params.delete(paramKey);
        }
      }
      const qs = params.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath);
    },
    [router, searchParams, basePath]
  );

  const activeResort = searchParams.get("resort");
  const activeCategory = searchParams.get("category");
  const activeDaypart = searchParams.get("daypart");
  const activeNear = searchParams.get("near");
  const activePreset = searchParams.get("preset");
  const activeTransport = searchParams.get("transport");
  const activeArea = searchParams.get("area");
  const activeWeather = searchParams.get("weather");
  const freeOnly = searchParams.get("free") === "true";
  const reservationOnly = searchParams.get("reservation") === "true";
  const scrollRailBy = (element: HTMLElement, delta: number) => {
    if (element.scrollHeight <= element.clientHeight) return;
    element.scrollTop += delta;
  };
  const handleRailWheel = (event: WheelEvent<HTMLElement>) => {
    const rail = event.currentTarget;
    if (rail.scrollHeight <= rail.clientHeight) return;
    event.preventDefault();
    event.stopPropagation();
    scrollRailBy(rail, event.deltaY);
  };
  const handleRailKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const rail = event.currentTarget;
    const pageAmount = Math.max(rail.clientHeight - 48, 120);
    const keyScroll: Record<string, number> = {
      ArrowDown: 48,
      ArrowUp: -48,
      PageDown: pageAmount,
      PageUp: -pageAmount,
      Home: -rail.scrollHeight,
      End: rail.scrollHeight,
    };
    const delta = keyScroll[event.key];
    if (delta == null) return;
    event.preventDefault();
    event.stopPropagation();
    scrollRailBy(rail, delta);
  };

  return (
    <aside
      className="filter-rail"
      aria-label="Activity filters"
      tabIndex={0}
      onWheel={handleRailWheel}
      onKeyDown={handleRailKeyDown}
    >
      <div className="filter-rail__header">
        <h2 className="font-display text-lg font-semibold">Filters</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Narrow by resort, time, and fit.
        </p>
      </div>

      <FilterFields
        resorts={resorts}
        activeResort={activeResort}
        activeCategory={activeCategory}
        activeDaypart={activeDaypart}
        activeNear={activeNear}
        activePreset={activePreset}
        activeTransport={activeTransport}
        activeArea={activeArea}
        activeWeather={activeWeather}
        freeOnly={freeOnly}
        reservationOnly={reservationOnly}
        hideDaypart={hideDaypart}
        filterImpact={filterImpact}
        homeResortSlug={homeResortSlug}
        update={update}
      />

      {(activeResort ||
        activeCategory ||
        activeDaypart ||
        activeNear ||
        activePreset ||
        activeTransport ||
        activeArea ||
        activeWeather ||
        freeOnly ||
        reservationOnly) && (
        <div className="filter-rail__footer">
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </aside>
  );
}

export function FilterFields({
  resorts,
  activeResort,
  activeCategory,
  activeDaypart,
  activeNear,
  activePreset,
  activeTransport,
  activeArea,
  activeWeather,
  freeOnly = false,
  reservationOnly = false,
  hideDaypart = false,
  filterImpact,
  homeResortSlug,
  update,
  searchableResorts = false,
}: {
  resorts: { slug: string; name: string }[];
  activeResort: string | null;
  activeCategory: string | null;
  activeDaypart: string | null;
  activeNear: string | null;
  activePreset: string | null;
  activeTransport: string | null;
  activeArea: string | null;
  activeWeather: string | null;
  freeOnly?: boolean;
  reservationOnly?: boolean;
  hideDaypart?: boolean;
  filterImpact: FilterImpact;
  homeResortSlug?: string;
  update: (key: string | Record<string, string | null>, value?: string | null) => void;
  searchableResorts?: boolean;
}) {
  const [resortQuery, setResortQuery] = useState("");

  const activeResortSlugs = useMemo(
    () => selectedResortSlugs(activeResort),
    [activeResort]
  );
  const resortOptions = filterImpact.resorts;
  const daypartOptions = filterImpact.dayparts;
  const presetOptions = filterImpact.presets;
  const transportOptions = filterImpact.transport;
  const areaOptions = filterImpact.areas;
  const weatherOptions = filterImpact.weather;
  const presetDescription = useMemo(
    () => new Map<string, string>(
      INTENT_PRESETS.map((preset) => [preset.id, preset.description])
    ),
    []
  );
  const categoryOptions = useMemo(() => {
    const categoryOrder = Object.keys(CATEGORY_META);
    return [...filterImpact.categories].sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.value);
      const bIndex = categoryOrder.indexOf(b.value);
      if (aIndex === -1 && bIndex === -1) return a.label.localeCompare(b.label);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [filterImpact.categories]);
  const practicalOptions = [
    {
      key: "free",
      label: "Free only",
      count: filterImpact.practical.free,
      active: freeOnly,
      onClick: () => update("free", freeOnly ? null : "true"),
    },
    {
      key: "reservation",
      label: "Reservations",
      count: filterImpact.practical.reservation,
      active: reservationOnly,
      onClick: () => update("reservation", reservationOnly ? null : "true"),
    },
  ].filter((option) => option.count > 0 || option.active);

  const filteredResorts = useMemo(() => {
    const q = resortQuery.trim().toLowerCase();
    if (!q) return resortOptions;
    return resortOptions.filter((r) => r.label.toLowerCase().includes(q));
  }, [resortOptions, resortQuery]);

  return (
    <div className="filter-field-stack">
      {resortOptions.length > 0 && (
        <FilterSection
          title="Resort"
          defaultOpen={resortOptions.length > 0}
          activeCount={activeResortSlugs.length}
        >
          {(searchableResorts || resortOptions.length > 10) && (
            <input
              type="search"
              value={resortQuery}
              onChange={(e) => setResortQuery(e.target.value)}
              placeholder="Search resorts..."
              className="form-control"
              aria-label="Search resorts"
            />
          )}
          <div
            className={cn(
              searchableResorts || resortOptions.length > 10
                ? "filter-option-list filter-option-list--scroll"
                : "filter-option-list"
            )}
          >
            <button
              type="button"
              onClick={() => update("resort", null)}
              className={cn(
                "filter-option-row",
                activeResortSlugs.length === 0 && "filter-option-row--active"
              )}
              aria-pressed={activeResortSlugs.length === 0}
            >
              <span>All resorts</span>
            </button>
            {filteredResorts.map((r) => {
              const active = activeResortSlugs.includes(r.value);
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => {
                    const next = toggleResortSlug(activeResort, r.value);
                    update({ resort: next ?? null, near: null });
                  }}
                  className={cn(
                    "filter-option-row",
                    active && "filter-option-row--active"
                  )}
                  aria-pressed={active}
                >
                  <span>{r.label}</span>
                  <span className="filter-option-row__count">{r.count}</span>
                </button>
              );
            })}
            {filteredResorts.length === 0 && (
              <p className="px-3 py-2 text-sm text-[var(--color-muted)]">
                No resorts match &ldquo;{resortQuery}&rdquo;
              </p>
            )}
          </div>
        </FilterSection>
      )}

      {homeResortSlug && (
        <FilterSection
          title="First night"
          defaultOpen={activeNear === "my-resort"}
          activeCount={activeNear === "my-resort" ? 1 : 0}
        >
          <button
            type="button"
            onClick={() => {
              const active =
                activeNear === "my-resort" &&
                activeResortSlugs.length === 1 &&
                activeResortSlugs[0] === homeResortSlug;
              if (active) {
                update("near", null);
                return;
              }
              update({ resort: homeResortSlug, near: "my-resort" });
            }}
            className={cn(
              "filter-option-row",
              activeNear === "my-resort" &&
                activeResortSlugs.length === 1 &&
                activeResortSlugs[0] === homeResortSlug &&
                "filter-option-row--active"
            )}
          >
            <span>Near my resort</span>
          </button>
        </FilterSection>
      )}

      {!hideDaypart && daypartOptions.length > 0 && (
        <FilterSection
          title="Time of day"
          defaultOpen={Boolean(activeDaypart)}
          activeCount={activeDaypart ? 1 : 0}
        >
          <div className="filter-option-list">
            {daypartOptions.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() =>
                  update("daypart", activeDaypart === d.value ? null : d.value)
                }
                className={cn(
                  "filter-option-row",
                  activeDaypart === d.value && "filter-option-row--active"
                )}
              >
                <span>{d.label}</span>
                <span className="filter-option-row__count">{d.count}</span>
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {presetOptions.length > 0 && (
        <FilterSection
          title="Helpful filters"
          defaultOpen={Boolean(activePreset)}
          activeCount={activePreset ? 1 : 0}
        >
          <div className="filter-option-list">
            {presetOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  update("preset", activePreset === option.value ? null : option.value)
                }
                className={cn(
                  "filter-option-row",
                  option.active && "filter-option-row--active"
                )}
              >
                <span>
                  <span>{option.label}</span>
                  <span className="filter-option-row__helper">
                    {presetDescription.get(option.value)}
                  </span>
                </span>
                <span className="filter-option-row__count">{option.count}</span>
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {practicalOptions.length > 0 && (
        <FilterSection
          title="Cost"
          defaultOpen={freeOnly || reservationOnly}
          activeCount={[freeOnly, reservationOnly].filter(Boolean).length}
        >
          <div className="filter-option-list">
            {practicalOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={option.onClick}
                className={cn(
                  "filter-option-row",
                  option.active && "filter-option-row--active"
                )}
              >
                <span>{option.label}</span>
                <span className="filter-option-row__count">{option.count}</span>
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {weatherOptions.length > 0 && (
        <FilterSection
          title="Weather"
          defaultOpen={Boolean(activeWeather)}
          activeCount={activeWeather ? 1 : 0}
        >
          <div className="filter-option-list">
            {weatherOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  update("weather", activeWeather === option.value ? null : option.value)
                }
                className={cn(
                  "filter-option-row",
                  option.active && "filter-option-row--active"
                )}
              >
                <span>{option.label}</span>
                <span className="filter-option-row__count">{option.count}</span>
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {transportOptions.length > 0 && (
        <FilterSection
          title="Getting there"
          defaultOpen={Boolean(activeTransport)}
          activeCount={activeTransport ? 1 : 0}
        >
          <div className="filter-option-list">
            {transportOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  update(
                    "transport",
                    activeTransport === option.value ? null : option.value
                  )
                }
                className={cn(
                  "filter-option-row",
                  option.active && "filter-option-row--active"
                )}
              >
                <span>{option.label}</span>
                <span className="filter-option-row__count">{option.count}</span>
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {areaOptions.length > 0 && (
        <FilterSection
          title="Resort area"
          defaultOpen={Boolean(activeArea)}
          activeCount={activeArea ? 1 : 0}
        >
          <label className="block text-sm">
            <span className="sr-only">Resort area</span>
            <select
              value={activeArea ?? ""}
              onChange={(e) => update("area", e.target.value || null)}
              className="form-control"
            >
              <option value="">All resort areas</option>
              {areaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </label>
        </FilterSection>
      )}

      {categoryOptions.length > 0 && (
        <FilterSection
          title="Category"
          defaultOpen={Boolean(activeCategory)}
          activeCount={activeCategory ? 1 : 0}
        >
          <label className="block text-sm">
            <span className="sr-only">Category</span>
            <select
              value={activeCategory ?? ""}
              onChange={(e) => update("category", e.target.value || null)}
              className="form-control"
            >
              <option value="">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} ({c.count})
                </option>
              ))}
            </select>
          </label>
        </FilterSection>
      )}
    </div>
  );
}

function FilterSection({
  title,
  defaultOpen = false,
  activeCount = 0,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  activeCount?: number;
  children: ReactNode;
}) {
  return (
    <details className="filter-section" open={defaultOpen}>
      <summary className="filter-section__summary">
        <span>{title}</span>
        {activeCount > 0 && (
          <span className="filter-section__active-count">{activeCount}</span>
        )}
      </summary>
      <div className="filter-section__body">{children}</div>
    </details>
  );
}
