import { addDays, startOfDay } from "date-fns";
import {
  getDayOfWeekIndex,
  getNowInOrlando,
  isWithinRange,
  parseTimeOnDate,
  daypartFromHour,
  toIsoInOrlando,
  TIMEZONE,
} from "@/lib/daypart";
import type {
  ActivityOccurrence,
  Daypart,
  EnrichmentRow,
  OccurrenceRuleRow,
  RawActivityRow,
} from "@/lib/types/occurrence";
import { formatResortTier } from "@/lib/utils";

interface ResortMeta {
  category: string;
  area: string;
}

function buildSummary(row: RawActivityRow, enrichment?: EnrichmentRow | null): string {
  if (enrichment?.summary_original) return enrichment.summary_original;
  if (row.description) return row.description.slice(0, 280);
  const loc = row.location ? ` at ${row.location}` : "";
  return `${row.activity_name}${loc}. Check the resort schedule for the latest times.`;
}

function mapStatus(enrichment?: EnrichmentRow | null): ActivityOccurrence["status"] {
  const s = enrichment?.status;
  if (s === "seasonal" || s === "paused") return s;
  return "active";
}

function mapPrice(
  row: RawActivityRow,
  enrichment?: EnrichmentRow | null
): ActivityOccurrence["price"] {
  const state =
    enrichment?.price_state ??
    (row.is_fee_based ? "fee" : row.fee_amount_cents ? "fee" : "free");
  return {
    state: state as ActivityOccurrence["price"]["state"],
    notes: enrichment?.price_notes ?? undefined,
    amountCents: row.fee_amount_cents ?? undefined,
  };
}

function mapFreshness(
  row: RawActivityRow,
  enrichment?: EnrichmentRow | null
): ActivityOccurrence["freshness"] {
  const lastVerified =
    enrichment?.verification_last_checked ?? new Date().toISOString();
  const sourceUrl =
    enrichment?.verification_source_url ?? row.source_url ?? "";
  const ageMs = Date.now() - new Date(lastVerified).getTime();
  const badge = ageMs > 14 * 24 * 60 * 60 * 1000 ? "stale" : "verified";
  return { lastVerified, sourceUrl, badge };
}

function mapAges(enrichment?: EnrichmentRow | null): string[] {
  if (!enrichment?.age_fit) return ["all_ages"];
  return Object.entries(enrichment.age_fit)
    .filter(([, v]) => v)
    .map(([k]) => k);
}

export function expandOccurrences(
  row: RawActivityRow,
  rules: OccurrenceRuleRow[],
  enrichment: EnrichmentRow | null | undefined,
  resortMeta: ResortMeta,
  dateRangeDays = 7,
  referenceDate: Date = getNowInOrlando()
): ActivityOccurrence[] {
  const occurrences: ActivityOccurrence[] = [];
  const startDate = startOfDay(referenceDate);

  for (let d = 0; d < dateRangeDays; d++) {
    const date = addDays(startDate, d);
    const dow = getDayOfWeekIndex(date);

    const applicableRules =
      rules.length > 0
        ? rules.filter(
            (r) =>
              r.activity_catalog_id === row.activity_catalog_id &&
              (r.is_daily || r.day_of_week === null || r.day_of_week === dow)
          )
        : [];

    if (applicableRules.length === 0 && row.schedule_text) {
      const fallbackStart = parseTimeOnDate("09:00:00", date);
      const fallbackEnd = parseTimeOnDate("21:00:00", date);
      occurrences.push(
        buildOccurrence(row, enrichment, resortMeta, fallbackStart, fallbackEnd, row.schedule_text)
      );
      continue;
    }

    for (const rule of applicableRules) {
      const start = rule.start_time
        ? parseTimeOnDate(rule.start_time, date)
        : parseTimeOnDate("09:00:00", date);
      const end = rule.end_time
        ? parseTimeOnDate(rule.end_time, date)
        : undefined;
      occurrences.push(
        buildOccurrence(
          row,
          enrichment,
          resortMeta,
          start,
          end,
          rule.schedule_notes ?? row.schedule_text ?? undefined
        )
      );
    }
  }

  return occurrences;
}

function buildOccurrence(
  row: RawActivityRow,
  enrichment: EnrichmentRow | null | undefined,
  resortMeta: ResortMeta,
  start: Date,
  end?: Date,
  scheduleText?: string
): ActivityOccurrence {
  const now = getNowInOrlando();
  const hour = start.getHours();
  const daypart: Daypart = daypartFromHour(hour);

  return {
    id: `${row.activity_catalog_id}-${toIsoInOrlando(start)}`,
    activitySlug: row.normalized_name,
    activityCatalogId: row.activity_catalog_id,
    resort: {
      slug: row.resort_slug,
      name: row.resort_name.replace(/^Disney's\s+/i, ""),
      tier: formatResortTier(resortMeta.category),
      area: resortMeta.area,
    },
    title: row.activity_name,
    summary: buildSummary(row, enrichment),
    category: row.category,
    section: row.section,
    startDateTime: toIsoInOrlando(start),
    endDateTime: end ? toIsoInOrlando(end) : undefined,
    daypart,
    price: mapPrice(row, enrichment),
    location: {
      label: enrichment?.meeting_location_detail ?? row.location ?? "Resort",
      lat: enrichment?.geo_lat ?? undefined,
      lng: enrichment?.geo_lng ?? undefined,
    },
    eligibility: {
      ages: mapAges(enrichment),
      reservation:
        enrichment?.reservation_required != null
          ? {
              required: enrichment.reservation_required,
              url: enrichment.reservation_url ?? undefined,
            }
          : undefined,
    },
    freshness: mapFreshness(row, enrichment),
    status: mapStatus(enrichment),
    isHappeningNow: isWithinRange(now, start, end),
    scheduleText,
  };
}

export function filterByDaypart(
  occurrences: ActivityOccurrence[],
  daypart?: Daypart
): ActivityOccurrence[] {
  if (!daypart) return occurrences;
  return occurrences.filter((o) => o.daypart === daypart);
}

export function filterToday(
  occurrences: ActivityOccurrence[],
  now: Date = getNowInOrlando()
): ActivityOccurrence[] {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return occurrences
    .filter((o) => {
      const start = new Date(o.startDateTime);
      return start >= now && start <= end;
    })
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );
}

export function filterTonight(
  occurrences: ActivityOccurrence[],
  now: Date = getNowInOrlando()
): ActivityOccurrence[] {
  const tonightStart = new Date(now);
  if (tonightStart.getHours() < 17) tonightStart.setHours(17, 0, 0, 0);
  const end = new Date(tonightStart);
  end.setHours(23, 59, 59, 999);

  return occurrences
    .filter((o) => {
      const start = new Date(o.startDateTime);
      const isEvening =
        o.daypart === "evening" ||
        o.daypart === "late" ||
        o.category === "movies_under_stars" ||
        o.category === "campfire" ||
        o.category === "nighttime_entertainment";
      return isEvening && start >= tonightStart && start <= end;
    })
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );
}

export function filterHappeningNow(
  occurrences: ActivityOccurrence[],
  now: Date = getNowInOrlando()
): ActivityOccurrence[] {
  return occurrences.filter((o) => {
    const start = new Date(o.startDateTime);
    const end = o.endDateTime ? new Date(o.endDateTime) : undefined;
    return isWithinRange(now, start, end);
  });
}
