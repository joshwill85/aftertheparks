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
import { formatInTimeZone } from "date-fns-tz";
import { useRouter } from "next/navigation";
import { EventCard } from "@/components/events/EventCard";
import { usePlan } from "@/components/atlas/PlanProvider";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { addOrlandoDays, getDayOfWeekIndex, TIMEZONE } from "@/lib/daypart";
import {
  buildPlanAheadHref,
  parsePlanAheadParams,
  type PlanAheadParams,
} from "@/lib/calendar/params";
import { buildFutureActivityInsights } from "@/lib/calendar/insights";
import { toDisplayActivity } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";
import {
  CALENDAR_DAYPARTS,
  buildCalendarDaySummaries,
  getCalendarDaySummary,
  type CalendarDaySummary,
} from "@/lib/visualizations/calendarDensity";
import type {
  ActivityAreaFilter,
  ActivityOccurrence,
  Daypart,
} from "@/lib/types/occurrence";

const AREA_OPTIONS: Array<{ value: ActivityAreaFilter; label: string }> = [
  { value: "magic-kingdom", label: "Magic Kingdom area" },
  { value: "epcot-boardwalk", label: "EPCOT / BoardWalk" },
  { value: "skyliner", label: "Skyliner" },
  { value: "animal-kingdom", label: "Animal Kingdom area" },
  { value: "disney-springs", label: "Disney Springs area" },
  { value: "fort-wilderness", label: "Fort Wilderness" },
];

const DAYPART_OPTIONS: Array<{ value: Exclude<Daypart, "anytime">; label: string }> = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "late", label: "Starlight" },
];

function dateForMonth(date: string): Date {
  return parseISO(`${date}T12:00:00`);
}

function occurrenceDateKey(iso: string): string {
  return formatInTimeZone(parseISO(iso), TIMEZONE, "yyyy-MM-dd");
}

function nextWeekendRange(start: string): { start: string; end: string } {
  const day = getDayOfWeekIndex(start);
  const daysUntilFriday = (5 - day + 7) % 7;
  const friday = addOrlandoDays(start, daysUntilFriday);
  return { start: friday, end: addOrlandoDays(friday, 2) };
}

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
  initialPlanAhead,
}: {
  occurrences: ActivityOccurrence[];
  initialPlanAhead: PlanAheadParams;
}) {
  const router = useRouter();
  const { addActivity, isActivitySaved } = usePlan();
  const [planAhead, setPlanAhead] = useState(initialPlanAhead);
  const [month, setMonth] = useState(dateForMonth(initialPlanAhead.selected));
  const selectedDate = planAhead.selected;
  const startDate = planAhead.start;
  const endDate = planAhead.end;
  const resortFilter = planAhead.resort ?? "all";
  const categoryFilter = planAhead.category ?? "all";
  const areaFilter = planAhead.area ?? "all";
  const daypartFilter = planAhead.daypart ?? "all";

  const applyPlanAhead = (next: Partial<PlanAheadParams>) => {
    const normalized = parsePlanAheadParams({ ...planAhead, ...next });
    setPlanAhead(normalized);
    setMonth(dateForMonth(normalized.selected));
    router.replace(buildPlanAheadHref(normalized), { scroll: false });
  };

  const applyPreset = (preset: "next7" | "weekend" | "next30") => {
    if (preset === "next7") {
      applyPlanAhead({
        start: planAhead.start,
        end: addOrlandoDays(planAhead.start, 6),
        selected: planAhead.start,
      });
      return;
    }
    if (preset === "weekend") {
      const range = nextWeekendRange(planAhead.start);
      applyPlanAhead({ ...range, selected: range.start });
      return;
    }
    applyPlanAhead({
      start: planAhead.start,
      end: addOrlandoDays(planAhead.start, 30),
      selected: planAhead.start,
    });
  };

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
      if (!occurrence.startDateTime) return false;
      const occurrenceDate = occurrenceDateKey(occurrence.startDateTime);
      if (occurrenceDate < startDate || occurrenceDate > endDate) {
        return false;
      }
      if (resortFilter !== "all" && occurrence.resort.slug !== resortFilter) {
        return false;
      }
      if (categoryFilter !== "all" && occurrence.category !== categoryFilter) {
        return false;
      }
      if (areaFilter !== "all" && occurrence.resort.area !== areaFilter) {
        return false;
      }
      if (daypartFilter !== "all" && occurrence.daypart !== daypartFilter) {
        return false;
      }
      return true;
    });
  }, [areaFilter, categoryFilter, daypartFilter, endDate, occurrences, resortFilter, startDate]);

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, ActivityOccurrence[]>();
    for (const o of visibleOccurrences) {
      if (!o.startDateTime) continue;
      const key = occurrenceDateKey(o.startDateTime);
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
  const insights = useMemo(
    () => buildFutureActivityInsights(visibleOccurrences, { start: startDate, end: endDate }),
    [endDate, startDate, visibleOccurrences]
  );
  const emptyMessage =
    selectedDate < startDate || selectedDate > endDate
      ? "This selected date is outside your Plan Ahead range. Choose a date inside the range."
      : visibleOccurrences.length === 0
        ? "No activities match these filters in this date range."
        : "No activities from current resort calendars match this date yet.";

  return (
    <div className="calendar-shell space-y-6">
      <section className="plan-ahead-intro">
        <div>
          <p className="plan-ahead-intro__eyebrow">Future planning</p>
          <h2>Choose when to go, or shape the stay you already know.</h2>
          <p>
            Compare current resort-calendar activities by date, resort area, and
            time of day before saving the best options into My Plan.
          </p>
        </div>
        <div className="plan-ahead-presets" aria-label="Quick date ranges">
          <button type="button" onClick={() => applyPreset("next7")}>
            Next 7 days
          </button>
          <button type="button" onClick={() => applyPreset("weekend")}>
            This weekend
          </button>
          <button type="button" onClick={() => applyPreset("next30")}>
            Next 30 days
          </button>
        </div>
      </section>

      <div className="plan-ahead-filters">
        <label className="space-y-1 text-sm font-medium">
          <span>Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) =>
              applyPlanAhead({
                start: event.target.value,
                selected: event.target.value,
              })
            }
            className="w-full rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>End date</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => applyPlanAhead({ end: event.target.value })}
            className="w-full rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Filter by resort</span>
          <select
            value={resortFilter}
            onChange={(event) =>
              applyPlanAhead({
                resort: event.target.value === "all" ? undefined : event.target.value,
              })
            }
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
            onChange={(event) =>
              applyPlanAhead({
                category: event.target.value === "all" ? undefined : event.target.value,
              })
            }
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
        <label className="space-y-1 text-sm font-medium">
          <span>Filter by area</span>
          <select
            value={areaFilter}
            onChange={(event) =>
              applyPlanAhead({
                area:
                  event.target.value === "all"
                    ? undefined
                    : (event.target.value as ActivityAreaFilter),
              })
            }
            className="w-full rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2"
          >
            <option value="all">All areas</option>
            {AREA_OPTIONS.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Filter by time</span>
          <select
            value={daypartFilter}
            onChange={(event) =>
              applyPlanAhead({
                daypart:
                  event.target.value === "all"
                    ? undefined
                    : (event.target.value as Exclude<Daypart, "anytime">),
              })
            }
            className="w-full rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2"
          >
            <option value="all">All times</option>
            {DAYPART_OPTIONS.map((daypart) => (
              <option key={daypart.value} value={daypart.value}>
                {daypart.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="plan-ahead-insights" aria-label="Plan Ahead insights">
        <InsightCard
          label="Best date"
          value={
            insights.topDates[0]
              ? `${format(dateForMonth(insights.topDates[0].date), "MMM d")} · ${insights.topDates[0].count}`
              : "No matches"
          }
        />
        <InsightCard
          label="Best resort"
          value={
            insights.topResorts[0]
              ? `${insights.topResorts[0].name} · ${insights.topResorts[0].count}`
              : "No matches"
          }
        />
        <InsightCard
          label="Evening strongest"
          value={
            insights.eveningDates[0]
              ? `${format(dateForMonth(insights.eveningDates[0].date), "MMM d")} · ${insights.eveningDates[0].eveningCount}`
              : "No evening matches"
          }
        />
        <InsightCard
          label="Free-heavy date"
          value={
            insights.freeHeavyDates[0]
              ? `${format(dateForMonth(insights.freeHeavyDates[0].date), "MMM d")} · ${insights.freeHeavyDates[0].freeCount}`
              : "No free matches"
          }
        />
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
          const outsideRange = key < startDate || key > endDate;
          return (
            <button
              type="button"
              key={key}
              onClick={() => applyPlanAhead({ selected: key })}
              disabled={outsideRange}
              className={`calendar-day min-h-16 rounded-lg border p-1 text-left text-sm ${
                isSameMonth(day, month)
                  ? "border-[var(--color-card-border)] bg-[var(--color-card)]"
                  : "opacity-40"
              } ${today ? "calendar-day--today" : ""} ${
                selected ? "calendar-day--selected" : ""
              } ${outsideRange ? "calendar-day--out-of-range" : ""}`}
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
              {emptyMessage}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="plan-ahead-insight">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
