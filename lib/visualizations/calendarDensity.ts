import { formatInTimeZone } from "date-fns-tz";
import { parseISO } from "date-fns";
import { getCategoryMeta } from "@/lib/categories/meta";
import { TIMEZONE } from "@/lib/daypart";
import type { ActivityOccurrence, Daypart } from "@/lib/types/occurrence";

export type CalendarBandDaypart = Exclude<Daypart, "anytime">;

export const CALENDAR_DAYPARTS: Array<{
  key: CalendarBandDaypart;
  label: string;
  shortLabel: string;
}> = [
  { key: "morning", label: "Morning", shortLabel: "M" },
  { key: "afternoon", label: "Afternoon", shortLabel: "A" },
  { key: "evening", label: "Evening", shortLabel: "E" },
  { key: "late", label: "Starlight", shortLabel: "S" },
];

export interface CalendarDaySummary {
  date: string;
  total: number;
  dayparts: Record<CalendarBandDaypart, number>;
  topResort?: { slug: string; name: string; count: number };
  topCategory?: { category: string; label: string; count: number };
  costMix: { free: number; paid: number; unknown: number };
  ariaLabel: string;
}

function emptyDayparts(): Record<CalendarBandDaypart, number> {
  return {
    morning: 0,
    afternoon: 0,
    evening: 0,
    late: 0,
  };
}

function emptyCostMix(): CalendarDaySummary["costMix"] {
  return { free: 0, paid: 0, unknown: 0 };
}

function formatDateForLabel(date: string): string {
  return formatInTimeZone(parseISO(`${date}T12:00:00Z`), "UTC", "MMMM d");
}

function topEntry<T extends { count: number; name?: string; label?: string }>(
  entries: T[]
): T | undefined {
  return entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return (a.name ?? a.label ?? "").localeCompare(b.name ?? b.label ?? "");
  })[0];
}

function buildAriaLabel(summary: Omit<CalendarDaySummary, "ariaLabel">): string {
  const dateLabel = formatDateForLabel(summary.date);
  if (summary.total === 0) {
    return `No activities from current resort calendars on ${dateLabel}.`;
  }

  const daypartText = CALENDAR_DAYPARTS
    .map(({ key, label }) => `${label} ${summary.dayparts[key]}`)
    .join(", ");
  const costText = `${summary.costMix.free} free, ${summary.costMix.paid} paid, ${summary.costMix.unknown} price unclear`;
  const resortText = summary.topResort
    ? `Top resort: ${summary.topResort.name}.`
    : "No top resort.";
  const categoryText = summary.topCategory
    ? `Most common: ${summary.topCategory.label}.`
    : "No top category.";

  return `${dateLabel}: ${summary.total} activities. ${resortText} ${categoryText} ${daypartText}. ${costText}.`;
}

export function buildCalendarDaySummaries(
  occurrences: ActivityOccurrence[]
): Map<string, CalendarDaySummary> {
  const working = new Map<
    string,
    {
      date: string;
      total: number;
      dayparts: Record<CalendarBandDaypart, number>;
      resortCounts: Map<string, { slug: string; name: string; count: number }>;
      categoryCounts: Map<string, { category: string; label: string; count: number }>;
      costMix: CalendarDaySummary["costMix"];
    }
  >();

  for (const occurrence of occurrences) {
    if (!occurrence.startDateTime) continue;
    const date = formatInTimeZone(parseISO(occurrence.startDateTime), TIMEZONE, "yyyy-MM-dd");
    const summary =
      working.get(date) ??
      {
        date,
        total: 0,
        dayparts: emptyDayparts(),
        resortCounts: new Map(),
        categoryCounts: new Map(),
        costMix: emptyCostMix(),
      };

    summary.total += 1;
    if (occurrence.daypart !== "anytime") {
      summary.dayparts[occurrence.daypart] += 1;
    }

    const resort = summary.resortCounts.get(occurrence.resort.slug) ?? {
      slug: occurrence.resort.slug,
      name: occurrence.resort.name,
      count: 0,
    };
    resort.count += 1;
    summary.resortCounts.set(occurrence.resort.slug, resort);

    const categoryMeta = getCategoryMeta(occurrence.category);
    const category = summary.categoryCounts.get(occurrence.category) ?? {
      category: occurrence.category,
      label: categoryMeta.label,
      count: 0,
    };
    category.count += 1;
    summary.categoryCounts.set(occurrence.category, category);

    if (occurrence.price.state === "free") summary.costMix.free += 1;
    else if (occurrence.price.state === "fee") summary.costMix.paid += 1;
    else summary.costMix.unknown += 1;

    working.set(date, summary);
  }

  const result = new Map<string, CalendarDaySummary>();
  for (const summary of working.values()) {
    const finalSummary: Omit<CalendarDaySummary, "ariaLabel"> = {
      date: summary.date,
      total: summary.total,
      dayparts: summary.dayparts,
      topResort: topEntry(Array.from(summary.resortCounts.values())),
      topCategory: topEntry(Array.from(summary.categoryCounts.values())),
      costMix: summary.costMix,
    };
    result.set(summary.date, {
      ...finalSummary,
      ariaLabel: buildAriaLabel(finalSummary),
    });
  }
  return result;
}

export function getCalendarDaySummary(
  summaries: Map<string, CalendarDaySummary>,
  date: string
): CalendarDaySummary {
  const existing = summaries.get(date);
  if (existing) return existing;

  const empty: Omit<CalendarDaySummary, "ariaLabel"> = {
    date,
    total: 0,
    dayparts: emptyDayparts(),
    costMix: emptyCostMix(),
  };
  return {
    ...empty,
    ariaLabel: buildAriaLabel(empty),
  };
}
