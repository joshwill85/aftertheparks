import { createServiceClient } from "@/lib/supabase/server";
import type {
  ActivityClaim,
  ActivityOffering,
  ActivityPriceOption,
  SourceSpan,
} from "@/lib/types/occurrence";
import { formatResortTier, slugToTitle } from "@/lib/utils";

export interface OfficialOfferingRow {
  id: string;
  program_id: string;
  program_key: string;
  offering_key: string;
  resort_slug: string;
  resort_name: string;
  resort_category: string;
  resort_area: string;
  variant_key?: string | null;
  title: string;
  description?: string | null;
  category: string;
  tags?: string[] | null;
  location?: {
    label?: string | null;
    value?: string | null;
    lat?: number;
    lng?: number;
  } | null;
  availability?: {
    kind?: ActivityOffering["availability"]["kind"];
    hours_state?: string | null;
    label?: string | null;
  } | null;
  price?: {
    state?: "free" | "fee" | "unknown";
    notes?: string;
    amountCents?: number;
    amount_cents?: number;
    minAmountCents?: number;
    min_amount_cents?: number;
    maxAmountCents?: number;
    max_amount_cents?: number;
    options?: Array<Record<string, unknown>>;
  } | null;
  booking?: {
    reservation_required?: boolean;
    reservationRequired?: boolean;
    reservation_recommended?: boolean;
    reservationRecommended?: boolean;
    cancellation_notice_hours?: number;
    cancellationNoticeHours?: number;
    method?: string;
    phone?: string;
    url?: string;
  } | null;
  eligibility?: {
    ages?: string[];
    resort_guest_only?: boolean;
    resortGuestOnly?: boolean;
  } | null;
  amenities?: string[] | null;
  claims?: Record<string, ActivityClaim> | null;
  source_url: string;
  source_sha256?: string | null;
  source_document_id?: string | null;
  field_provenance?: Record<string, SourceSpan[]> | null;
  trust_state?: ActivityOffering["trustState"] | null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function normalizePriceOptions(
  options?: Array<Record<string, unknown>> | null
): ActivityPriceOption[] | undefined {
  if (!Array.isArray(options) || options.length === 0) return undefined;
  return options.map((option) => ({
    optionName: stringValue(option.optionName ?? option.option_name),
    priceCentsMin: numberValue(option.priceCentsMin ?? option.price_cents_min),
    priceCentsMax: numberValue(option.priceCentsMax ?? option.price_cents_max),
    priceBasis: stringValue(option.priceBasis ?? option.price_basis),
    dayOfWeek: stringValue(option.dayOfWeek ?? option.day_of_week),
    notes: stringValue(option.notes),
  }));
}

function sourceBacked(row: OfficialOfferingRow): boolean {
  return Boolean(
    row.source_url &&
      row.source_sha256 &&
      row.field_provenance?.title?.length &&
      row.field_provenance?.resort_join?.length
  );
}

function mapFieldProvenance(
  provenance: OfficialOfferingRow["field_provenance"]
): ActivityOffering["fieldProvenance"] | undefined {
  if (!provenance) return undefined;
  return {
    title: provenance.title,
    resortJoin: provenance.resort_join,
    location: provenance.location,
    description: provenance.description,
    availability: provenance.availability,
    booking: provenance.booking,
    amenities: provenance.amenities,
  };
}

function mapAvailability(
  row: OfficialOfferingRow
): ActivityOffering["availability"] {
  return {
    kind: row.availability?.kind ?? "evergreen_all_day",
    hoursState: row.availability?.hours_state ?? undefined,
    label: row.availability?.label ?? "Available daily; hours vary",
  };
}

function mapPrice(row: OfficialOfferingRow): ActivityOffering["price"] {
  const price = row.price ?? {};
  return {
    state: price.state ?? "unknown",
    notes: price.notes,
    amountCents: price.amountCents ?? price.amount_cents,
    minAmountCents: price.minAmountCents ?? price.min_amount_cents,
    maxAmountCents: price.maxAmountCents ?? price.max_amount_cents,
    options: normalizePriceOptions(price.options),
  };
}

function mapBooking(
  booking: OfficialOfferingRow["booking"]
): ActivityOffering["booking"] {
  if (!booking) return undefined;
  const mapped: ActivityOffering["booking"] = {
    reservationRequired:
      booking.reservationRequired ?? booking.reservation_required,
    reservationRecommended:
      booking.reservationRecommended ?? booking.reservation_recommended,
    cancellationNoticeHours:
      booking.cancellationNoticeHours ?? booking.cancellation_notice_hours,
    method: booking.method,
    phone: booking.phone,
    url: booking.url,
  };
  return Object.values(mapped).some((value) => value !== undefined)
    ? mapped
    : undefined;
}

export function mapOfficialOfferingRow(
  row: OfficialOfferingRow
): ActivityOffering {
  const location = row.location ?? {};
  const eligibility = row.eligibility ?? {};
  const verified = sourceBacked(row);

  return {
    id: row.id,
    activitySlug: row.program_key,
    activityCatalogId: row.program_id,
    offeringKey: row.offering_key,
    resort: {
      slug: row.resort_slug,
      name: row.resort_name?.replace(/^Disney's\s+/i, "") ?? slugToTitle(row.resort_slug),
      tier: formatResortTier(row.resort_category ?? "unknown"),
      area: row.resort_area ?? "unknown",
    },
    title: row.title,
    summary: row.description ?? "",
    category: row.category,
    tags: row.tags ?? [],
    availability: mapAvailability(row),
    price: mapPrice(row),
    location: {
      label: location.label ?? location.value ?? row.resort_name ?? slugToTitle(row.resort_slug),
      lat: location.lat,
      lng: location.lng,
    },
    booking: mapBooking(row.booking),
    eligibility: {
      ages: eligibility.ages ?? ["all_ages"],
      resortGuestOnly:
        eligibility.resortGuestOnly ?? eligibility.resort_guest_only,
    },
    amenities: row.amenities ?? [],
    freshness: {
      lastVerified: new Date().toISOString(),
      sourceUrl: row.source_url,
      badge: verified ? "verified" : "stale",
    },
    source: {
      url: row.source_url,
      documentHash: row.source_sha256 ?? undefined,
      documentId: row.source_document_id ?? undefined,
    },
    fieldProvenance: mapFieldProvenance(row.field_provenance),
    claims: row.claims ?? undefined,
    trustState: row.trust_state ?? "source_backed",
    status: "active",
  };
}

export function mapOfficialOfferingRows(
  rows: OfficialOfferingRow[]
): ActivityOffering[] {
  return rows.map(mapOfficialOfferingRow);
}

export async function fetchOfficialActivityOfferings(): Promise<ActivityOffering[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("v_public_activity_offerings")
    .select("*");

  if (error) {
    if (!/does not exist|schema cache/i.test(error.message)) {
      console.error("fetchOfficialActivityOfferings:", error.message);
    }
    return [];
  }

  return mapOfficialOfferingRows((data ?? []) as OfficialOfferingRow[]);
}

export async function getOfficialOfferingsForResort(
  resortSlug: string
): Promise<ActivityOffering[]> {
  const offerings = await fetchOfficialActivityOfferings();
  return offerings.filter((offering) => offering.resort.slug === resortSlug);
}
