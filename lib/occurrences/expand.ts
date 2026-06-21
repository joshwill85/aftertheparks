import { addHours, isAfter, isBefore, isEqual } from "date-fns";
import {
  addOrlandoDays,
  daypartFromHour,
  endOfOrlandoDay,
  getDayOfWeekIndex,
  hourInOrlando,
  isSameOrlandoDay,
  isWithinRange,
  nowInstant,
  orlandoDateString,
  parseTimeOnDate,
  toIsoInOrlando,
} from "@/lib/daypart";
import type {
  ActivityOccurrence,
  Daypart,
  EnrichmentRow,
  OccurrenceRuleRow,
  RawActivityRow,
} from "@/lib/types/occurrence";
import { formatResortTier } from "@/lib/utils";
import {
  getDisplaySummary,
  getDisplayTime,
  getDisplayTitle,
  toDisplayInput,
} from "@/lib/activityDisplay";

interface ResortMeta {
  category: string;
  area: string;
}

function displayInputFromRow(
  row: RawActivityRow,
  enrichment?: EnrichmentRow | null,
  start?: Date,
  end?: Date,
  scheduleText?: string
) {
  return toDisplayInput({
    activity_name: row.activity_name,
    category: row.category,
    normalized_name: row.normalized_name,
    description: row.description,
    summary_original: enrichment?.summary_original,
    schedule_text: scheduleText ?? row.schedule_text,
    location: row.location,
    resort: { name: row.resort_name.replace(/^Disney's\s+/i, "") },
    startDateTime: start ? toIsoInOrlando(start) : undefined,
    endDateTime: end ? toIsoInOrlando(end) : undefined,
    price: {
      state:
        (enrichment?.price_state as "free" | "fee" | "unknown") ??
        (row.is_fee_based ? "fee" : row.fee_amount_cents ? "fee" : "free"),
    },
    freshness: {
      lastVerified:
        enrichment?.verification_last_checked ?? new Date().toISOString(),
      badge:
        Date.now() -
          new Date(
            enrichment?.verification_last_checked ?? new Date().toISOString()
          ).getTime() >
        14 * 24 * 60 * 60 * 1000
          ? "stale"
          : "verified",
    },
    weather_dependency: enrichment?.weather_dependency,
    parse_confidence: row.parse_confidence,
  });
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
    enrichment?.verification_source_url ??
    row.source_url ??
    "https://aftertheparks.com/data-sources";
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
  referenceDate: Date = nowInstant()
): ActivityOccurrence[] {
  const occurrences: ActivityOccurrence[] = [];
  const baseDateStr = orlandoDateString(referenceDate);

  for (let d = 0; d < dateRangeDays; d++) {
    const dateStr = addOrlandoDays(baseDateStr, d);
    const dow = getDayOfWeekIndex(dateStr);

    const applicableRules =
      rules.length > 0
        ? rules.filter(
            (r) =>
              r.activity_catalog_id === row.activity_catalog_id &&
              (r.is_daily || r.day_of_week === null || r.day_of_week === dow)
          )
        : [];

    if (applicableRules.length === 0 && row.schedule_text) {
      const fallbackStart = parseTimeOnDate("09:00:00", dateStr);
      const fallbackEnd = parseTimeOnDate("21:00:00", dateStr);
      occurrences.push(
        buildOccurrence(row, enrichment, resortMeta, fallbackStart, fallbackEnd, row.schedule_text)
      );
      continue;
    }

    for (const rule of applicableRules) {
      const start = rule.start_time
        ? parseTimeOnDate(rule.start_time, dateStr)
        : parseTimeOnDate("09:00:00", dateStr);
      const end = rule.end_time
        ? parseTimeOnDate(rule.end_time, dateStr)
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
  const now = nowInstant();
  const hour = hourInOrlando(start);
  const daypart: Daypart = daypartFromHour(hour);
  const displayInput = displayInputFromRow(
    row,
    enrichment,
    start,
    end,
    scheduleText
  );
  const timeDisplay = getDisplayTime(displayInput);
  const startIso = toIsoInOrlando(start);
  const endIso = end ? toIsoInOrlando(end) : undefined;

  return {
    id: `${row.activity_catalog_id}-${startIso}`,
    activitySlug: row.normalized_name,
    activityCatalogId: row.activity_catalog_id,
    resort: {
      slug: row.resort_slug,
      name: row.resort_name.replace(/^Disney's\s+/i, ""),
      tier: formatResortTier(resortMeta.category),
      area: resortMeta.area,
    },
    title: getDisplayTitle(displayInput),
    summary: getDisplaySummary(displayInput),
    category: row.category,
    section: row.section,
    startDateTime: startIso,
    endDateTime: endIso,
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
    isHappeningNow:
      !timeDisplay.uncertain &&
      isSameOrlandoDay(startIso, orlandoDateString(now)) &&
      isWithinRange(now, start, end),
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
  now: Date = nowInstant()
): ActivityOccurrence[] {
  const todayStr = orlandoDateString(now);

  return occurrences
    .filter((o) => {
      if (!isSameOrlandoDay(o.startDateTime, todayStr)) return false;
      const start = new Date(o.startDateTime);
      const end = o.endDateTime
        ? new Date(o.endDateTime)
        : addHours(start, 1);
      // Still upcoming or happening now — not already finished
      return isAfter(end, now) || isEqual(end, now);
    })
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );
}

export function filterTonight(
  occurrences: ActivityOccurrence[],
  now: Date = nowInstant()
): ActivityOccurrence[] {
  const todayStr = orlandoDateString(now);
  const tonightStart = parseTimeOnDate("17:00:00", todayStr);
  const end = endOfOrlandoDay(todayStr);

  return occurrences
    .filter((o) => {
      if (!isSameOrlandoDay(o.startDateTime, todayStr)) return false;
      const start = new Date(o.startDateTime);
      const isEvening =
        o.daypart === "evening" ||
        o.daypart === "late" ||
        o.category === "movies_under_stars" ||
        o.category === "campfire" ||
        o.category === "nighttime_entertainment";
      return isEvening && !isBefore(start, tonightStart) && !isAfter(start, end);
    })
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );
}

export function filterHappeningNow(
  occurrences: ActivityOccurrence[],
  now: Date = nowInstant()
): ActivityOccurrence[] {
  const todayStr = orlandoDateString(now);
  return occurrences.filter((o) => {
    if (!o.isHappeningNow) return false;
    if (!isSameOrlandoDay(o.startDateTime, todayStr)) return false;
    const time = getDisplayTime({
      category: o.category,
      scheduleText: o.scheduleText,
      startDateTime: o.startDateTime,
      endDateTime: o.endDateTime,
    });
    if (time.uncertain) return false;
    const start = new Date(o.startDateTime);
    const end = o.endDateTime ? new Date(o.endDateTime) : undefined;
    return isWithinRange(now, start, end);
  });
}
