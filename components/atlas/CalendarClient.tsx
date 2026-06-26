"use client";

import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
} from "date-fns";
import { EventCard } from "@/components/events/EventCard";
import { toDisplayActivity } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

export function CalendarClient({
  occurrences,
}: {
  occurrences: ActivityOccurrence[];
}) {
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [resortFilter, setResortFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const resortOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const occurrence of occurrences) {
      options.set(occurrence.resort.slug, occurrence.resort.name);
    }
    return Array.from(options, ([slug, name]) => ({ slug, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [occurrences]);

  const categoryOptions = useMemo(() => {
    const categories = new Set(occurrences.map((occurrence) => occurrence.category));
    return Array.from(categories).sort();
  }, [occurrences]);

  const visibleOccurrences = useMemo(() => {
    return occurrences.filter((occurrence) => {
      if (resortFilter !== "all" && occurrence.resort.slug !== resortFilter) {
        return false;
      }
      if (categoryFilter !== "all" && occurrence.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [categoryFilter, occurrences, resortFilter]);

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, ActivityOccurrence[]>();
    for (const o of visibleOccurrences) {
      if (!o.startDateTime) continue;
      const key = format(parseISO(o.startDateTime), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    for (const items of map.values()) {
      items.sort((a, b) =>
        (a.startDateTime ?? "").localeCompare(b.startDateTime ?? "")
      );
    }
    return map;
  }, [visibleOccurrences]);

  const selectedActivities = byDay.get(selectedDate) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          <span>Filter by resort</span>
          <select
            value={resortFilter}
            onChange={(event) => setResortFilter(event.target.value)}
            className="w-full rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2"
          >
            <option value="all">All resorts</option>
            {resortOptions.map((resort) => (
              <option key={resort.slug} value={resort.slug}>
                {resort.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Filter by category</span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2"
          >
            <option value="all">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1))
          }
          className="rounded-lg border border-[var(--color-card-border)] px-3 py-1"
        >
          ←
        </button>
        <h2 className="font-display text-xl font-semibold">
          {format(month, "MMMM yyyy")}
        </h2>
        <button
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1))
          }
          className="rounded-lg border border-[var(--color-card-border)] px-3 py-1"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[var(--color-muted)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const count = byDay.get(key)?.length ?? 0;
          const today = isSameDay(day, new Date());
          const selected = key === selectedDate;
          return (
            <button
              type="button"
              key={key}
              onClick={() => setSelectedDate(key)}
              className={`min-h-16 rounded-lg border p-1 text-left text-sm ${
                isSameMonth(day, month)
                  ? "border-[var(--color-card-border)] bg-[var(--color-card)]"
                  : "opacity-40"
              } ${today ? "ring-2 ring-[var(--accent)]" : ""} ${
                selected ? "outline outline-2 outline-offset-2 outline-[var(--accent)]" : ""
              }`}
              aria-pressed={selected}
            >
              <span className="font-medium">{format(day, "d")}</span>
              {count > 0 && (
                <div className="mt-1 flex justify-center gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-semibold">
            {format(parseISO(`${selectedDate}T00:00:00`), "EEEE, MMMM d")}
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            {selectedActivities.length} activities match your filters.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {selectedActivities.map((activity) => {
            const display = toDisplayActivity(activity);
            const card = activityToEventCard(activity, display);
            return <EventCard key={activity.id} {...card} />;
          })}
          {selectedActivities.length === 0 && (
            <p className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 text-sm text-[var(--color-muted)]">
              No source-backed activities match this day and filter set.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
