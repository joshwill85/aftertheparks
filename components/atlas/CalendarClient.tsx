"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import {
  addOrlandoDays,
  getDayOfWeekIndex,
  orlandoDateString,
  TIMEZONE,
} from "@/lib/daypart";
import {
  buildPlanAheadHref,
  parsePlanAheadParams,
  type PlanAheadParams,
} from "@/lib/calendar/params";
import { buildFutureActivityInsights } from "@/lib/calendar/insights";
import { toDisplayActivity } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";
import { weatherFitValueForActivity } from "@/lib/planning/activityFacts";
import {
  CALENDAR_DAYPARTS,
  buildCalendarDaySummaries,
  getCalendarDaySummary,
  type CalendarDaySummary,
} from "@/lib/visualizations/calendarDensity";
import type {
  ActivityOccurrence,
  ActivityWeatherFilter,
  Daypart,
} from "@/lib/types/occurrence";
import type { WeatherForTimeSpan } from "@/lib/weather/types";

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

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatInsightDate(date: string, today: string): string {
  if (date === addOrlandoDays(today, 1)) return "Tomorrow";
  return format(dateForMonth(date), "EEE, MMM d");
}

function scheduleConfidenceLabel(summary: CalendarDaySummary): string {
  if (summary.total >= 8) return "Strong schedule coverage";
  if (summary.total >= 3) return "Some current listings";
  if (summary.total > 0) return "Limited current listings";
  return "Limited current listings";
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
  const strongestBand = CALENDAR_DAYPARTS.reduce((best, band) =>
    summary.dayparts[band.key] > summary.dayparts[best.key] ? band : best
  );
  const confidence = scheduleConfidenceLabel(summary);
  const weatherAvailability =
    summary.total > 0 ? "Schedule details may change" : "Weather not available yet";

  if (summary.total === 0) {
    return (
      <div className="calendar-story calendar-story--empty">
        <p className="calendar-story__eyebrow">Quiet resort day</p>
        <p className="calendar-story__title">No activities from current resort calendars match this day yet.</p>
        <p className="calendar-story__copy">
          Try another date, clear a filter, or use the empty space as breathing room.
        </p>
        <div className="calendar-story__stats" aria-label={summary.ariaLabel}>
          <span>{format(dateForMonth(summary.date), "EEE, MMM d")}</span>
          <span>{confidence}</span>
          <span>{weatherAvailability}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-story">
      <p className="calendar-story__eyebrow">Day summary</p>
      <p className="calendar-story__title">
        {summary.total} current-calendar {summary.total === 1 ? "activity" : "activities"}
        {summary.topResort ? `, led by ${summary.topResort.name}` : ""}
      </p>
      <div className="calendar-story__stats" aria-label={summary.ariaLabel}>
        <span>{format(dateForMonth(summary.date), "EEE, MMM d")}</span>
        <span>{strongestBand.label} is busiest</span>
        {summary.topCategory && <span>{summary.topCategory.label} leads</span>}
        {summary.topResort && <span>{summary.topResort.name} leads</span>}
        <span>{summary.costMix.free} free</span>
        <span>{confidence}</span>
        <span>{weatherAvailability}</span>
      </div>
    </div>
  );
}

export function CalendarClient({
  occurrences,
  initialPlanAhead,
  initialWeatherById = {},
}: {
  occurrences: ActivityOccurrence[];
  initialPlanAhead: PlanAheadParams;
  initialWeatherById?: Record<string, WeatherForTimeSpan>;
}) {
  const router = useRouter();
  const { addActivity, isActivitySaved } = usePlan();
  const [planAhead, setPlanAhead] = useState(initialPlanAhead);
  const [month, setMonth] = useState(dateForMonth(initialPlanAhead.selected));
  const [weatherById, setWeatherById] =
    useState<Record<string, WeatherForTimeSpan>>(initialWeatherById);
  const selectedDate = planAhead.selected;
  const startDate = planAhead.start;
  const endDate = planAhead.end;
  const resortFilter = planAhead.resort ?? "all";
  const categoryFilter = planAhead.category ?? "all";
  const areaFilter = planAhead.area ?? "all";
  const daypartFilter = planAhead.daypart ?? "all";
  const freeOnly = planAhead.free === true;
  const weatherFilter = planAhead.weather ?? "all";
  const todayKey = orlandoDateString();

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

  const applyQuickDate = (selected: string) => {
    applyPlanAhead({
      start: selected,
      end: selected,
      selected,
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
      if (freeOnly && occurrence.price.state !== "free") {
        return false;
      }
      if (
        weatherFilter !== "all" &&
        weatherFitValueForActivity(occurrence) !== weatherFilter
      ) {
        return false;
      }
      return true;
    });
  }, [areaFilter, categoryFilter, daypartFilter, endDate, freeOnly, occurrences, resortFilter, startDate, weatherFilter]);

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
    () =>
      buildFutureActivityInsights(visibleOccurrences, {
        start: startDate,
        end: endDate,
        today: todayKey,
      }),
    [endDate, startDate, todayKey, visibleOccurrences]
  );
  const bestDate = insights.topDates[0];
  const bestResort = insights.topResorts[0];
  const bestEveningDate = insights.eveningDates[0];
  const bestFreeDate = insights.freeHeavyDates[0];
  const emptyMessage =
    selectedDate < startDate || selectedDate > endDate
      ? "This selected date is outside your Plan Ahead range. Choose a date inside the range."
      : visibleOccurrences.length === 0
        ? "No activities match these filters in this date range."
        : "No activities from current resort calendars match this date yet.";

  useEffect(() => {
    const dated = selectedActivities
      .filter((activity) => activity.startDateTime)
      .filter((activity) => !weatherById[activity.id])
      .map((activity) => ({
        id: activity.id,
        resortSlug: activity.resort.slug,
        startsAt: activity.startDateTime!,
        endsAt: activity.endDateTime,
        activitySlug: activity.activitySlug,
        timeBasis: "exact_event_time" as const,
        timeBasisLabel: "Exact event time",
      }));
    if (dated.length === 0) return;
    let cancelled = false;
    fetch("/api/weather/guidance/batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ occurrences: dated }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { weatherById?: Record<string, WeatherForTimeSpan> } | null) => {
        if (!cancelled && body?.weatherById) {
          setWeatherById((current) => ({ ...current, ...body.weatherById }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedActivities, weatherById]);

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
          <button type="button" onClick={() => applyQuickDate(todayKey)}>
            Today
          </button>
          <button type="button" onClick={() => applyQuickDate(addOrlandoDays(todayKey, 1))}>
            Tomorrow
          </button>
          <button type="button" onClick={() => applyPreset("weekend")}>
            This weekend
          </button>
          <button type="button" onClick={() => applyPreset("next7")}>
            Trip dates
          </button>
        </div>
      </section>

      <div className="plan-ahead-filters">
        <label className="space-y-1 text-sm font-medium">
          <span>Trip dates</span>
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
          <span>Choose a date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => applyPlanAhead({ selected: event.target.value })}
            className="w-full rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Resort</span>
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
          <span>Category</span>
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
          <span>Time of day</span>
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
        <label className="space-y-1 text-sm font-medium">
          <span>Free</span>
          <select
            value={freeOnly ? "true" : "all"}
            onChange={(event) =>
              applyPlanAhead({ free: event.target.value === "true" ? true : undefined })
            }
            className="w-full rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2"
          >
            <option value="all">Any cost</option>
            <option value="true">Free only</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Indoor or covered</span>
          <select
            value={weatherFilter}
            onChange={(event) =>
              applyPlanAhead({
                weather:
                  event.target.value === "all"
                    ? undefined
                    : (event.target.value as ActivityWeatherFilter),
              })
            }
            className="w-full rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2"
          >
            <option value="all">Any weather fit</option>
            <option value="indoor">Indoor</option>
            <option value="covered">Covered</option>
          </select>
        </label>
      </div>

      <div className="plan-ahead-insights" aria-label="Plan Ahead insights">
        <InsightCard
          eyebrow="Best day to browse"
          title={bestDate ? formatInsightDate(bestDate.date, todayKey) : "No future matches"}
          description={
            bestDate
              ? "Most activities in your future window."
              : "Try widening the day range or clearing a filter."
          }
          statLabel={
            bestDate
              ? `${countLabel(bestDate.count, "activity", "activities")} listed`
              : "Tomorrow onward"
          }
        />
        <InsightCard
          eyebrow="Most options at one resort"
          title={bestResort ? bestResort.name : "No resort stands out"}
          description={
            bestResort
              ? "Best starting point if you want one place with lots to do."
              : "Future matches will appear as calendars fill in."
          }
          statLabel={
            bestResort
              ? `${countLabel(bestResort.count, "future activity", "future activities")}`
              : "Future window"
          }
        />
        <InsightCard
          eyebrow="Best after-dark day"
          title={
            bestEveningDate
              ? formatInsightDate(bestEveningDate.date, todayKey)
              : "No evening standout"
          }
          description={
            bestEveningDate
              ? "Most evening and starlight activities."
              : "No future evening-heavy day matches yet."
          }
          statLabel={
            bestEveningDate
              ? `${countLabel(bestEveningDate.eveningCount, "after-dark option")}`
              : "Evening picks"
          }
        />
        <InsightCard
          eyebrow="Best free day"
          title={
            bestFreeDate
              ? formatInsightDate(bestFreeDate.date, todayKey)
              : "No free standout"
          }
          description={
            bestFreeDate
              ? "Most free activities in the future window."
              : "No future free-heavy day matches yet."
          }
          statLabel={
            bestFreeDate
              ? `${countLabel(bestFreeDate.freeCount, "free activity", "free activities")}`
              : "Free picks"
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
            const saved = isActivitySaved(activity);
            return (
              <div key={activity.id} className="space-y-2">
                <EventCard
                  {...card}
                  weatherSummary={weatherById[activity.id]}
                  saved={saved}
                  onSave={() => addActivity(activity)}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary rounded-full px-4 py-2 text-xs font-bold"
                    onClick={() => addActivity(activity)}
                    disabled={saved}
                  >
                    {saved ? "Added to My Plan" : "Add to My Plan"}
                  </button>
                  <Link
                    href={`/activities/${activity.activitySlug}`}
                    className="btn-secondary rounded-full px-4 py-2 text-xs font-bold"
                  >
                    View details
                  </Link>
                  <Link
                    href={`/activities?resort=${activity.resort.slug}&weather=indoor`}
                    className="btn-secondary rounded-full px-4 py-2 text-xs font-bold"
                  >
                    Find indoor backup
                  </Link>
                </div>
              </div>
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

function InsightCard({
  eyebrow,
  title,
  description,
  statLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  statLabel: string;
}) {
  return (
    <div className="plan-ahead-insight">
      <p className="plan-ahead-insight__eyebrow">{eyebrow}</p>
      <strong className="plan-ahead-insight__title">{title}</strong>
      <span className="plan-ahead-insight__copy">{description}</span>
      <span className="plan-ahead-insight__stat">{statLabel}</span>
    </div>
  );
}
