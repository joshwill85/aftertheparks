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
import { usePlan } from "@/components/atlas/PlanProvider";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { toDisplayActivity } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";
import {
  CALENDAR_DAYPARTS,
  buildCalendarDaySummaries,
  getCalendarDaySummary,
  type CalendarDaySummary,
} from "@/lib/visualizations/calendarDensity";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

function CalendarDensityBands({ summary }: { summary: CalendarDaySummary }) {
  const max = Math.max(...CALENDAR_DAYPARTS.map((band) => summary.dayparts[band.key]), 1);
  const showTripleDot = summary.dayparts.late === 3;

  if (summary.total === 0) {
    return <div className="calendar-density calendar-density--empty" aria-hidden />;
  }

  return (
    <div
      className="calendar-density wow-calendar-time-weather-aurora"
      data-wow-moment="calendar_time_weather_aurora"
      aria-hidden
    >
      {CALENDAR_DAYPARTS.map((band) => {
        const count = summary.dayparts[band.key];
        const scale = count === 0 ? 0 : Math.max(0.22, count / max);
        return (
          <span
            key={band.key}
            className={`calendar-density__band calendar-density__band--${band.key}`}
            style={{ transform: `scaleY(${scale})` }}
            title={`${band.label}: ${count}`}
          />
        );
      })}
      {showTripleDot && (
        <span
          className="hidden-resort-magic hrm-calendar-triple"
          data-hidden-detail="calendar_triple_dot_upgrade"
          aria-hidden
        />
      )}
    </div>
  );
}

function CalendarStorySummary({ summary }: { summary: CalendarDaySummary }) {
  if (summary.total === 0) {
    return (
      <div className="calendar-story calendar-story--empty">
        <p className="calendar-story__eyebrow">Quiet resort day</p>
        <p className="calendar-story__title">No activities from current resort calendars match this day yet.</p>
        <p className="calendar-story__copy">
          Try another date, clear a filter, or use the empty space as breathing room.
        </p>
      </div>
    );
  }

  const strongestBand = CALENDAR_DAYPARTS.reduce((best, band) =>
    summary.dayparts[band.key] > summary.dayparts[best.key] ? band : best
  );

  return (
    <div className="calendar-story">
      <p className="calendar-story__eyebrow">Day summary</p>
      <p className="calendar-story__title">
        {summary.total} current-calendar {summary.total === 1 ? "activity" : "activities"}
        {summary.topResort ? `, led by ${summary.topResort.name}` : ""}
      </p>
      <div className="calendar-story__stats" aria-label={summary.ariaLabel}>
        <span>{strongestBand.label} is busiest</span>
        {summary.topCategory && <span>{summary.topCategory.label} leads</span>}
        <span>{summary.costMix.free} free</span>
      </div>
    </div>
  );
}

export function CalendarClient({
  occurrences,
  initialResort,
  initialCategory,
}: {
  occurrences: ActivityOccurrence[];
  initialResort?: string;
  initialCategory?: string;
}) {
  const { addActivity, isActivitySaved } = usePlan();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [resortFilter, setResortFilter] = useState(initialResort ?? "all");
  const [categoryFilter, setCategoryFilter] = useState(initialCategory ?? "all");

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
  const daySummaries = useMemo(
    () => buildCalendarDaySummaries(visibleOccurrences),
    [visibleOccurrences]
  );
  const selectedSummary = getCalendarDaySummary(daySummaries, selectedDate);

  return (
    <div className="calendar-shell space-y-6">
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
          aria-label="Previous month"
        >
          <IconGlyph iconKey="arrow_left" className="text-base" />
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
          aria-label="Next month"
        >
          <IconGlyph iconKey="arrow_right" className="text-base" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[var(--color-muted)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="calendar-legend" aria-label="Calendar density band legend">
        {CALENDAR_DAYPARTS.map((band) => (
          <span key={band.key}>
            <i className={`calendar-legend__swatch calendar-density__band--${band.key}`} />
            {band.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const summary = getCalendarDaySummary(daySummaries, key);
          const today = isSameDay(day, new Date());
          const selected = key === selectedDate;
          return (
            <button
              type="button"
              key={key}
              onClick={() => setSelectedDate(key)}
              className={`calendar-day min-h-16 rounded-lg border p-1 text-left text-sm ${
                isSameMonth(day, month)
                  ? "border-[var(--color-card-border)] bg-[var(--color-card)]"
                  : "opacity-40"
              } ${today ? "calendar-day--today" : ""} ${
                selected ? "calendar-day--selected" : ""
              }`}
              aria-pressed={selected}
              aria-label={summary.ariaLabel}
            >
              <span className="calendar-day__date font-medium">{format(day, "d")}</span>
              <CalendarDensityBands summary={summary} />
              {summary.total > 0 && (
                <span className="calendar-day__count">{summary.total}</span>
              )}
            </button>
          );
        })}
      </div>

      <CalendarStorySummary summary={selectedSummary} />

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
            return (
              <EventCard
                key={activity.id}
                {...card}
                saved={isActivitySaved(activity)}
                onSave={() => addActivity(activity)}
              />
            );
          })}
          {selectedActivities.length === 0 && (
            <p className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 text-sm text-[var(--color-muted)]">
              No activities match this day and filter set.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
