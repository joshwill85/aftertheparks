import {
  daypartFromHour,
  getDayOfWeekIndex,
  orlandoDateString,
  addOrlandoDays,
  parseTimeOnDate,
  toIsoInOrlando,
} from "@/lib/daypart";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { cachePublicData } from "@/lib/cache/publicData";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  ActivityClaim,
  ActivityFactualEnrichment,
  ActivityOccurrence,
  ActivityPriceOption,
  DocumentKeyLegend,
  ExternalActivityFact,
  SourceSpan,
} from "@/lib/types/occurrence";
import { parseScheduleTime24h, toTimeSql } from "@/lib/text/time";
import { formatResortTier, slugToTitle } from "@/lib/utils";

export interface GoldActivityRow {
  id?: string;
  activity_catalog_id: string;
  calendar_group_key: string;
  resort_slugs?: string[] | null;
  canonical_slug: string;
  title: string;
  category: string;
  section?: string | null;
  schedule: {
    text?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    day_of_week?: string | number | null;
    days_of_week?: Array<string | number> | null;
    recurrence?: {
      day_of_week?: string | number | null;
      days_of_week?: Array<string | number> | null;
      frequency?: string | null;
    } | null;
  };
  location: {
    label?: string | null;
    value?: string | null;
  };
  description?: string | null;
  price?: {
    state?: "free" | "fee" | "unknown";
    notes?: string;
    amountCents?: number;
    minAmountCents?: number;
    maxAmountCents?: number;
    options?: Array<{
      option_name?: string;
      optionName?: string;
      price_cents_min?: number;
      priceCentsMin?: number;
      price_cents_max?: number;
      priceCentsMax?: number;
      price_basis?: string;
      priceBasis?: string;
      day_of_week?: string;
      dayOfWeek?: string;
      notes?: string;
    }>;
  } | null;
  enrichment?: Record<string, unknown> | null;
  external_facts?: Array<Record<string, unknown>> | null;
  claims?: Record<string, ActivityClaim> | ActivityClaim[] | null;
  field_provenance?: Partial<Record<"title" | "schedule" | "location" | "description", SourceSpan[]>> | null;
  source?: {
    url?: string | null;
    path?: string | null;
    documentHash?: string | null;
    documentId?: string | null;
    edition?: string | null;
    documentKeyLegends?: DocumentKeyLegend[] | null;
  } | null;
  source_url?: string | null;
  source_sha256?: string | null;
  source_document_id?: string | null;
  source_pdf_edition?: string | null;
  trust_state?: ActivityOccurrence["trustState"] | null;
  valid_from?: string | null;
  valid_until?: string | null;
}

type GoldPriceOption = NonNullable<
  NonNullable<GoldActivityRow["price"]>["options"]
>[number];

interface ResortMeta {
  slug: string;
  name: string;
  category: string;
  area: string;
}

interface MapOptions {
  dateRangeDays?: number;
  referenceDate?: Date;
  resortMeta?: Map<string, ResortMeta> | ResortMeta[] | Record<string, ResortMeta>;
}

const DAY_INDEX_BY_NAME: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const DAY_NAME_PATTERN =
  "sunday|monday|tuesday|wednesday|thursday|friday|saturday";

function normalizeTime(value?: string | null): string | null {
  if (!value) return null;
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;

  const parsed = parseScheduleTime24h(value);
  if (!parsed) return null;
  return toTimeSql(parsed.hour, parsed.minute);
}

function scheduleTime(row: GoldActivityRow, field: "start_time" | "end_time"): string | null {
  const explicit = normalizeTime(row.schedule?.[field]);
  if (explicit) return explicit;

  if (field === "start_time") {
    const fromText = parseScheduleTime24h(row.schedule?.text);
    return fromText ? toTimeSql(fromText.hour, fromText.minute) : null;
  }

  const matches = [
    ...(row.schedule?.text ?? "").matchAll(
      /(\d{1,2}\s*:\s*\d{2}\s*(?:a\.?m\.?|p\.?m\.?))/gi
    ),
  ];
  if (matches.length < 2) return null;
  return normalizeTime(matches[1][1]);
}

function untimedEveningDisplayStart(row: GoldActivityRow): string | null {
  if (row.trust_state !== "confirm_before_going") return null;
  if (!["movies_under_stars", "campfire"].includes(row.category)) return null;
  if (!/\bnightly\b|\bdaily\b/i.test(row.schedule?.text ?? "")) return null;
  return "20:30:00";
}

function normalizeDayIndex(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) {
    return value;
  }
  if (typeof value !== "string") return null;

  const cleaned = value.trim().toLowerCase();
  if (/^[0-6]$/.test(cleaned)) return Number(cleaned);
  return DAY_INDEX_BY_NAME[cleaned] ?? null;
}

function addDayRange(days: Set<number>, start: number, end: number) {
  let current = start;
  days.add(current);
  while (current !== end) {
    current = (current + 1) % 7;
    days.add(current);
  }
}

function structuredScheduleDays(row: GoldActivityRow): Set<number> | null {
  const rawDays = [
    row.schedule?.day_of_week,
    row.schedule?.recurrence?.day_of_week,
    ...(row.schedule?.days_of_week ?? []),
    ...(row.schedule?.recurrence?.days_of_week ?? []),
  ];
  const days = new Set<number>();

  for (const raw of rawDays) {
    const day = normalizeDayIndex(raw);
    if (day != null) days.add(day);
  }

  return days.size > 0 ? days : null;
}

function scheduleTextDays(text?: string | null): Set<number> | null {
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (/\b(?:daily|nightly|every day)\b/.test(normalized)) return null;

  const days = new Set<number>();
  if (/\bweekdays?\b/.test(normalized)) {
    [1, 2, 3, 4, 5].forEach((day) => days.add(day));
  }
  if (/\bweekends?\b/.test(normalized)) {
    [0, 6].forEach((day) => days.add(day));
  }

  const rangePattern = new RegExp(
    `\\b(${DAY_NAME_PATTERN})\\b\\s*(?:-|–|—|to|through|thru)\\s*\\b(${DAY_NAME_PATTERN})\\b`,
    "gi"
  );
  for (const match of normalized.matchAll(rangePattern)) {
    const start = normalizeDayIndex(match[1]);
    const end = normalizeDayIndex(match[2]);
    if (start != null && end != null) addDayRange(days, start, end);
  }

  const dayPattern = new RegExp(`\\b(${DAY_NAME_PATTERN})\\b`, "gi");
  for (const match of normalized.matchAll(dayPattern)) {
    const day = normalizeDayIndex(match[1]);
    if (day != null) days.add(day);
  }

  return days.size > 0 ? days : null;
}

function recurrenceDays(row: GoldActivityRow): Set<number> | null {
  const frequency = row.schedule?.recurrence?.frequency?.toLowerCase();
  if (frequency === "daily" || frequency === "nightly") return null;
  return structuredScheduleDays(row) ?? scheduleTextDays(row.schedule?.text);
}

function normalizeClaims(
  claims: GoldActivityRow["claims"]
): Record<string, ActivityClaim> {
  if (!claims) return {};
  if (Array.isArray(claims)) {
    return Object.fromEntries(
      claims
        .filter((claim) => typeof claim?.value === "string")
        .map((claim) => [String((claim as { kind?: string }).kind ?? "claim"), claim])
    );
  }
  return claims;
}

function hasClaimEvidence(claim?: ActivityClaim): boolean {
  return Array.isArray(claim?.evidence) && claim.evidence.length > 0;
}

function priceFromRow(row: GoldActivityRow): ActivityOccurrence["price"] {
  const explicit = row.price?.state;
  const fee = normalizeClaims(row.claims).fee;
  const hasFeeEvidence = hasClaimEvidence(fee);
  const normalizedOptions = normalizePriceOptions(row.price?.options);
  const priceDetails = {
    notes: row.price?.notes,
    amountCents: row.price?.amountCents,
    minAmountCents: row.price?.minAmountCents,
    maxAmountCents: row.price?.maxAmountCents,
    options: normalizedOptions,
  };

  if (explicit) {
    if (explicit === "fee" && fee?.value === "fee" && hasFeeEvidence) {
      return { state: "fee", ...priceDetails };
    }
    if (explicit === "free" && fee?.value === "free" && hasFeeEvidence) {
      return { state: "free", ...priceDetails };
    }
    if (explicit === "unknown") {
      return { state: "unknown", ...priceDetails };
    }
    return {
      state: "unknown",
      ...priceDetails,
    };
  }

  if ((fee?.value === "free" || fee?.value === "fee") && hasFeeEvidence) {
    return { state: fee.value };
  }
  return { state: "unknown" };
}

function normalizePriceOptions(
  options?: GoldPriceOption[] | null
): ActivityPriceOption[] | undefined {
  if (!Array.isArray(options) || options.length === 0) return undefined;
  return options.map((option) => ({
    optionName: option.optionName ?? option.option_name,
    priceCentsMin: option.priceCentsMin ?? option.price_cents_min,
    priceCentsMax: option.priceCentsMax ?? option.price_cents_max,
    priceBasis: option.priceBasis ?? option.price_basis,
    dayOfWeek: option.dayOfWeek ?? option.day_of_week,
    notes: option.notes,
  }));
}

function stringField(row: Record<string, unknown> | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberField(row: Record<string, unknown> | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "number" ? value : undefined;
}

function booleanField(row: Record<string, unknown> | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "boolean" ? value : undefined;
}

function enrichmentFromRow(row: GoldActivityRow): ActivityFactualEnrichment | undefined {
  const e = row.enrichment;
  if (!e) return undefined;
  const enrichment: ActivityFactualEnrichment = {
    exactVenue: stringField(e, "exact_venue"),
    hostAreaOrWing: stringField(e, "host_area_or_wing"),
    ageMinimum: numberField(e, "age_minimum"),
    adultRequired: booleanField(e, "adult_required"),
    durationMinutes: numberField(e, "duration_minutes"),
    checkInOffsetMinutes: numberField(e, "check_in_offset_minutes"),
    reservationRequired: booleanField(e, "reservation_required"),
    reservationRecommended: booleanField(e, "reservation_recommended"),
    reservationMethod: stringField(e, "reservation_method"),
    reservationPhone: stringField(e, "reservation_phone"),
    walkUpsAllowed: booleanField(e, "walk_ups_allowed"),
    sameDayAvailable: booleanField(e, "same_day_available"),
    programFamily: stringField(e, "program_family"),
    activityVariant: stringField(e, "activity_variant"),
    weatherDependency: stringField(e, "weather_dependency"),
    scheduleValidFrom: stringField(e, "schedule_valid_from"),
    scheduleValidUntil: stringField(e, "schedule_valid_until"),
    nextScheduleExpectedDate: stringField(e, "next_schedule_expected_date"),
    hiddenCharacterName: stringField(e, "hidden_character_name"),
    redemptionLocation: stringField(e, "redemption_location"),
    prizeOrCompletionRule: stringField(e, "prize_or_completion_rule"),
    resortGuestOnly: booleanField(e, "resort_guest_only"),
    poolGated: booleanField(e, "pool_gated"),
    openToNonResortGuests: booleanField(e, "open_to_non_resort_guests"),
    sisterResortAccess: booleanField(e, "sister_resort_access"),
  };
  return Object.values(enrichment).some((value) => value !== undefined)
    ? enrichment
    : undefined;
}

function externalFactsFromRow(row: GoldActivityRow): ExternalActivityFact[] | undefined {
  if (!Array.isArray(row.external_facts) || row.external_facts.length === 0) {
    return undefined;
  }
  return row.external_facts.map((fact) => ({
    source: stringField(fact, "source"),
    sourceUrl: stringField(fact, "source_url"),
    sourcePageKind: stringField(fact, "source_page_kind"),
    facts: typeof fact.facts === "object" && fact.facts !== null
      ? (fact.facts as Record<string, unknown>)
      : undefined,
    evidence: Array.isArray(fact.evidence)
      ? (fact.evidence as Record<string, unknown>[])
      : undefined,
    match: typeof fact.match === "object" && fact.match !== null
      ? (fact.match as Record<string, unknown>)
      : undefined,
  }));
}

function sourceUrl(row: GoldActivityRow): string {
  return row.source_url ?? row.source?.url ?? row.source?.path ?? "";
}

function sourceHash(row: GoldActivityRow): string | undefined {
  return row.source_sha256 ?? row.source?.documentHash ?? undefined;
}

function resortForSlug(
  slug: string,
  resortMeta: MapOptions["resortMeta"]
): ActivityOccurrence["resort"] {
  const meta =
    resortMeta instanceof Map
      ? resortMeta.get(slug)
      : Array.isArray(resortMeta)
        ? resortMeta.find((row) => row.slug === slug)
        : resortMeta?.[slug];
  return {
    slug,
    name: meta?.name?.replace(/^Disney's\s+/i, "") ?? slugToTitle(slug),
    tier: formatResortTier(meta?.category ?? "unknown"),
    area: meta?.area ?? "unknown",
  };
}

export function mapGoldActivityRowToOccurrences(
  row: GoldActivityRow,
  options: MapOptions = {}
): ActivityOccurrence[] {
  const startTime = scheduleTime(row, "start_time") ?? untimedEveningDisplayStart(row);
  const resortSlugs =
    row.resort_slugs && row.resort_slugs.length > 0
      ? row.resort_slugs
      : [row.calendar_group_key];
  const enrichment = enrichmentFromRow(row);
  const externalFacts = externalFactsFromRow(row);
  const common = {
    activitySlug: row.canonical_slug,
    activityCatalogId: row.activity_catalog_id,
    title: row.title,
    summary: row.description ?? "",
    category: row.category,
    section: row.section ?? "Resort Activities",
    price: priceFromRow(row),
    location: {
      label: row.location.label ?? row.location.value ?? "Location unavailable",
    },
    eligibility: {
      ages: enrichment?.ageMinimum
        ? [`${enrichment.ageMinimum}_plus`]
        : ["all_ages"],
      reservation:
        enrichment?.reservationRequired != null
          ? { required: enrichment.reservationRequired }
          : undefined,
    },
    freshness: {
      lastVerified: new Date().toISOString(),
      sourceUrl: sourceUrl(row),
      badge: "verified" as const,
    },
    source: {
      url: sourceUrl(row),
      documentHash: sourceHash(row),
      documentId: row.source_document_id ?? row.source?.documentId ?? undefined,
      edition: row.source_pdf_edition ?? row.source?.edition ?? undefined,
      documentKeyLegends: row.source?.documentKeyLegends ?? undefined,
    },
    fieldProvenance: row.field_provenance ?? undefined,
    claims: normalizeClaims(row.claims),
    enrichment,
    externalFacts,
    validFrom: row.valid_from ?? undefined,
    validUntil: row.valid_until ?? undefined,
    trustState: row.trust_state ?? "source_backed",
    status: "active" as const,
    scheduleText: row.schedule.text ?? undefined,
  };

  if (!startTime) {
    return resortSlugs.map((resortSlug) => ({
      ...common,
      id: `${row.id ?? row.activity_catalog_id}:${resortSlug}:untimed`,
      resort: resortForSlug(resortSlug, options.resortMeta),
      daypart: "anytime",
      isHappeningNow: false,
    }));
  }

  const endTime = scheduleTime(row, "end_time");
  const dateRangeDays = options.dateRangeDays ?? 7;
  const baseDateStr = orlandoDateString(options.referenceDate ?? new Date());
  const occurrences: ActivityOccurrence[] = [];
  const days = recurrenceDays(row);

  for (let day = 0; day < dateRangeDays; day++) {
    const dateStr = addOrlandoDays(baseDateStr, day);
    if (days && !days.has(getDayOfWeekIndex(dateStr))) continue;

    const start = parseTimeOnDate(startTime, dateStr);
    const end = endTime ? parseTimeOnDate(endTime, dateStr) : undefined;
    const startIso = toIsoInOrlando(start);
    const endIso = end ? toIsoInOrlando(end) : undefined;

    for (const resortSlug of resortSlugs) {
      occurrences.push({
        ...common,
        id: `${row.id ?? row.activity_catalog_id}:${resortSlug}:${dateStr}`,
        resort: resortForSlug(resortSlug, options.resortMeta),
        startDateTime: startIso,
        endDateTime: endIso,
        daypart: daypartFromHour(Number(startTime.slice(0, 2))),
      });
    }
  }

  return occurrences;
}

const fetchResortMetaRowsFromSupabase = cachePublicData(
  async function fetchResortMetaRowsFromSupabase(): Promise<ResortMeta[]> {
    const supabase = createServiceClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("resorts")
      .select("slug, name, category, resort_area");
    if (error) {
      console.error("fetchGoldResortMeta:", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      slug: row.slug,
      name: row.name,
      category: row.category,
      area: row.resort_area,
    }));
  },
  ["gold-resort-meta-rows-v2"]
);

const fetchResortMeta = cache(async function fetchResortMeta(): Promise<
  Map<string, ResortMeta>
> {
  const rows = await fetchResortMetaRowsFromSupabase();
  return new Map(rows.map((row) => [row.slug, row]));
});

const fetchGoldActivityRowsFromSupabase = cachePublicData(
  async function fetchGoldActivityRowsFromSupabase(): Promise<GoldActivityRow[]> {
    const supabase = createServiceClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("v_public_activity_gold")
      .select("*");
    if (error) {
      if (!/does not exist|schema cache/i.test(error.message)) {
        console.error("fetchGoldActivityOccurrences:", error.message);
      }
      return [];
    }

    return (data ?? []) as GoldActivityRow[];
  },
  ["gold-activity-rows"]
);

const fetchGoldActivityRows = cache(fetchGoldActivityRowsFromSupabase);

export async function fetchGoldActivityOccurrences(
  dateRangeDays = 7
): Promise<ActivityOccurrence[]> {
  const [rows, resortMeta] = await Promise.all([
    fetchGoldActivityRows(),
    fetchResortMeta(),
  ]);

  return rows.flatMap((row) =>
    mapGoldActivityRowToOccurrences(row, { dateRangeDays, resortMeta })
  );
}

export async function loadGoldPreviewOccurrences(
  dateRangeDays = 7,
  previewPath = path.join(process.cwd(), "data/processed/activity_gold_v2_preview.json")
): Promise<ActivityOccurrence[]> {
  try {
    const rows = JSON.parse(await readFile(previewPath, "utf8")) as GoldActivityRow[];
    return rows.flatMap((row) =>
      mapGoldActivityRowToOccurrences(row, { dateRangeDays })
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("loadGoldPreviewOccurrences:", error);
    }
    return [];
  }
}
