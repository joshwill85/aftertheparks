"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORY_META, MOOD_CHIPS } from "@/lib/categories/meta";
import { mergeMoodChipHref } from "@/lib/explore/browseParams";
import type { FilterImpact } from "@/lib/explore/filterImpact";
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
  const pathname = usePathname();
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
  const activeDuration = searchParams.get("duration");
  const activeNear = searchParams.get("near");
  const activeTransport = searchParams.get("transport");
  const activeArea = searchParams.get("area");
  const activeWeather = searchParams.get("weather");
  const freeOnly = searchParams.get("free") === "true";
  const reservationOnly = searchParams.get("reservation") === "true";
  const activeTicketRequired = searchParams.get("ticket_required");

  return (
    <aside className="filter-rail space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Filters</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Narrow by mood, resort, or time of day.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
          Quick moods
        </p>
        <div className="flex flex-wrap gap-2">
          {MOOD_CHIPS.map((chip) => (
            <Link
              key={chip.id}
              href={mergeMoodChipHref(chip.href, pathname, searchParams)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 text-xs font-bold transition-colors hover:border-[var(--accent)]"
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>

      <FilterFields
        resorts={resorts}
        activeResort={activeResort}
        activeCategory={activeCategory}
        activeDaypart={activeDaypart}
        activeDuration={activeDuration}
        activeNear={activeNear}
        activeTransport={activeTransport}
        activeArea={activeArea}
        activeWeather={activeWeather}
        freeOnly={freeOnly}
        reservationOnly={reservationOnly}
        activeTicketRequired={activeTicketRequired}
        hideDaypart={hideDaypart}
        filterImpact={filterImpact}
        homeResortSlug={homeResortSlug}
        update={update}
      />

      {(activeResort ||
        activeCategory ||
        activeDaypart ||
        activeDuration ||
        activeNear ||
        activeTransport ||
        activeArea ||
        activeWeather ||
        freeOnly ||
        reservationOnly ||
        activeTicketRequired) && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Clear all filters
        </button>
      )}
    </aside>
  );
}

export function FilterFields({
  resorts,
  activeResort,
  activeCategory,
  activeDaypart,
  activeDuration,
  activeNear,
  activeTransport,
  activeArea,
  activeWeather,
  freeOnly = false,
  reservationOnly = false,
  activeTicketRequired,
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
  activeDuration: string | null;
  activeNear: string | null;
  activeTransport: string | null;
  activeArea: string | null;
  activeWeather: string | null;
  freeOnly?: boolean;
  reservationOnly?: boolean;
  activeTicketRequired: string | null;
  hideDaypart?: boolean;
  filterImpact: FilterImpact;
  homeResortSlug?: string;
  update: (key: string | Record<string, string | null>, value?: string | null) => void;
  searchableResorts?: boolean;
}) {
  const [resortQuery, setResortQuery] = useState("");

  const resortOptions = filterImpact.resorts;
  const daypartOptions = filterImpact.dayparts;
  const durationOptions = filterImpact.duration;
  const transportOptions = filterImpact.transport;
  const areaOptions = filterImpact.areas;
  const weatherOptions = filterImpact.weather;
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
  const noParkTicketOnly = activeTicketRequired === "false";
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
    {
      key: "ticket_required",
      label: "No park ticket",
      count: filterImpact.practical.noParkTicket,
      active: noParkTicketOnly,
      onClick: () => update("ticket_required", noParkTicketOnly ? null : "false"),
    },
  ].filter((option) => option.count > 0 || option.active);

  const filteredResorts = useMemo(() => {
    const q = resortQuery.trim().toLowerCase();
    if (!q) return resortOptions;
    return resortOptions.filter((r) => r.label.toLowerCase().includes(q));
  }, [resortOptions, resortQuery]);

  return (
    <div className="flex flex-col gap-4">
      {homeResortSlug && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            First night
          </p>
          <button
            type="button"
            onClick={() => {
              const active = activeNear === "my-resort" && activeResort === homeResortSlug;
              if (active) {
                update("near", null);
                return;
              }
              update({ resort: homeResortSlug, near: "my-resort" });
            }}
            className={cn(
              "filter-pill",
              activeNear === "my-resort" &&
                activeResort === homeResortSlug &&
                "filter-pill--active"
            )}
          >
            Near my resort
          </button>
        </div>
      )}

      {!hideDaypart && daypartOptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Time of day
          </p>
          <div className="flex flex-wrap gap-2">
            {daypartOptions.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() =>
                  update("daypart", activeDaypart === d.value ? null : d.value)
                }
                className={cn(
                  "filter-pill",
                  activeDaypart === d.value && "filter-pill--active"
                )}
              >
                {d.label}
                <span className="filter-pill__count">{d.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {durationOptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Planning pace
          </p>
          <div className="flex flex-wrap gap-2">
            {durationOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  update("duration", activeDuration === option.value ? null : option.value)
                }
                className={cn("filter-pill", option.active && "filter-pill--active")}
              >
                {option.label}
                <span className="filter-pill__count">{option.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {practicalOptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Practical
          </p>
          <div className="flex flex-wrap gap-2">
            {practicalOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={option.onClick}
                className={cn("filter-pill", option.active && "filter-pill--active")}
              >
                {option.label}
                <span className="filter-pill__count">{option.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {weatherOptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Weather backup
          </p>
          <div className="flex flex-wrap gap-2">
            {weatherOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  update("weather", activeWeather === option.value ? null : option.value)
                }
                className={cn("filter-pill", option.active && "filter-pill--active")}
              >
                {option.label}
                <span className="filter-pill__count">{option.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {transportOptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Transportation
          </p>
          <div className="flex flex-wrap gap-2">
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
                className={cn("filter-pill", option.active && "filter-pill--active")}
              >
                {option.label}
                <span className="filter-pill__count">{option.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {areaOptions.length > 0 && (
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Resort area
          </span>
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
      )}

      {resortOptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Resort
          </p>
          {(searchableResorts || resortOptions.length > 10) && (
            <input
              type="search"
              value={resortQuery}
              onChange={(e) => setResortQuery(e.target.value)}
              placeholder="Search resorts…"
                  className="form-control"
                  aria-label="Search resorts"
                />
          )}
          {searchableResorts ? (
            <div className="max-h-48 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-[var(--color-card-border)] p-2">
              <button
                type="button"
                onClick={() => update("resort", null)}
                className={cn(
                  "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors",
                  !activeResort
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "hover:bg-[var(--color-sun-cream)]"
                )}
              >
                All resorts
              </button>
              {filteredResorts.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => update("resort", r.value)}
                  className={cn(
                    "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors",
                    activeResort === r.value
                      ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                      : "hover:bg-[var(--color-sun-cream)]"
                  )}
                >
                  <span>{r.label}</span>
                  <span className="ml-auto text-xs text-[var(--color-muted)]">
                    {r.count}
                  </span>
                </button>
              ))}
              {filteredResorts.length === 0 && (
                <p className="px-3 py-2 text-sm text-[var(--color-muted)]">
                  No resorts match &ldquo;{resortQuery}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <select
              value={activeResort ?? ""}
              onChange={(e) => update("resort", e.target.value || null)}
              className="form-control"
            >
              <option value="">All resorts</option>
              {filteredResorts.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} ({r.count})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {categoryOptions.length > 0 && (
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Category
          </span>
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
      )}
    </div>
  );
}
