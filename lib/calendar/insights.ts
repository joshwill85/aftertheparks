import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/daypart";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

export interface DateInsight {
  date: string;
  count: number;
  eveningCount: number;
  freeCount: number;
}

export interface ResortInsight {
  slug: string;
  name: string;
  count: number;
}

export interface FutureActivityInsights {
  topDates: DateInsight[];
  topResorts: ResortInsight[];
  eveningDates: DateInsight[];
  freeHeavyDates: DateInsight[];
}

interface InsightRange {
  start: string;
  end: string;
}

function occurrenceDate(occurrence: ActivityOccurrence): string | undefined {
  if (!occurrence.startDateTime) return undefined;
  return formatInTimeZone(parseISO(occurrence.startDateTime), TIMEZONE, "yyyy-MM-dd");
}

function sortDateInsights(a: DateInsight, b: DateInsight): number {
  if (b.count !== a.count) return b.count - a.count;
  return a.date.localeCompare(b.date);
}

function sortResortInsights(a: ResortInsight, b: ResortInsight): number {
  if (b.count !== a.count) return b.count - a.count;
  return a.name.localeCompare(b.name);
}

export function buildFutureActivityInsights(
  occurrences: ActivityOccurrence[],
  range: InsightRange
): FutureActivityInsights {
  const byDate = new Map<string, DateInsight>();
  const byResort = new Map<string, ResortInsight>();

  for (const occurrence of occurrences) {
    const date = occurrenceDate(occurrence);
    if (!date || date < range.start || date > range.end) continue;

    const dateInsight =
      byDate.get(date) ??
      {
        date,
        count: 0,
        eveningCount: 0,
        freeCount: 0,
      };
    dateInsight.count += 1;
    if (occurrence.daypart === "evening" || occurrence.daypart === "late") {
      dateInsight.eveningCount += 1;
    }
    if (occurrence.price.state === "free") dateInsight.freeCount += 1;
    byDate.set(date, dateInsight);

    const resortInsight =
      byResort.get(occurrence.resort.slug) ??
      {
        slug: occurrence.resort.slug,
        name: occurrence.resort.name,
        count: 0,
      };
    resortInsight.count += 1;
    byResort.set(occurrence.resort.slug, resortInsight);
  }

  const dateInsights = Array.from(byDate.values()).sort(sortDateInsights);

  return {
    topDates: dateInsights,
    topResorts: Array.from(byResort.values()).sort(sortResortInsights),
    eveningDates: dateInsights
      .filter((insight) => insight.eveningCount > 0)
      .sort((a, b) => b.eveningCount - a.eveningCount || sortDateInsights(a, b)),
    freeHeavyDates: dateInsights
      .filter((insight) => insight.freeCount > 0)
      .sort((a, b) => b.freeCount - a.freeCount || sortDateInsights(a, b)),
  };
}
