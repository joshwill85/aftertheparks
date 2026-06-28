import { createServiceClient } from "@/lib/supabase/server";
import { cache } from "react";
import { cachePublicData } from "@/lib/cache/publicData";
import type {
  ActivityClaim,
  ActivityFilters,
  ActivityOccurrence,
  ActivityOffering,
  ActivityPriceOption,
  SourceSpan,
} from "@/lib/types/occurrence";
import {
  expandTokens,
  normalizeSearchQuery,
  tokenizeQuery,
} from "@/lib/search/normalize";
import { scoreOffering } from "@/lib/search/score";
import {
  areaMatchesFilter,
  transportMatchesFilter,
} from "@/lib/explore/routeTaxonomy";
import { selectedResortSlugs } from "@/lib/explore/resortFilters";
import { formatResortTier, slugToTitle } from "@/lib/utils";

const OFFERING_QUERY_MIN_SCORE = 18;
const SHA256_HEX = /^[a-f0-9]{64}$/i;

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
    priceBasis?: string;
    price_basis?: string;
    taxNotes?: string;
    tax_notes?: string;
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
  status?: ActivityOffering["status"] | null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function priceConfidenceValue(value: unknown): ActivityPriceOption["priceConfidence"] | undefined {
  return typeof value === "string"
    ? (value as ActivityPriceOption["priceConfidence"])
    : undefined;
}

function verificationStatusValue(value: unknown): ActivityPriceOption["verificationStatus"] | undefined {
  return typeof value === "string"
    ? (value as ActivityPriceOption["verificationStatus"])
    : undefined;
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
    priceConfidence: priceConfidenceValue(option.priceConfidence ?? option.price_confidence),
    verificationStatus: verificationStatusValue(option.verificationStatus ?? option.verification_status),
    sourceUrl: stringValue(option.sourceUrl ?? option.source_url),
    sourceLabel: stringValue(option.sourceLabel ?? option.source_label),
    notes: stringValue(option.notes),
  }));
}

export function isSourceBackedOfficialOfferingRow(row: OfficialOfferingRow): boolean {
  return Boolean(
    row.source_url &&
      row.source_sha256 &&
      SHA256_HEX.test(row.source_sha256) &&
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
    price: provenance.price,
    booking: provenance.booking,
    eligibility: provenance.eligibility,
    amenities: provenance.amenities,
  };
}

function mapAvailability(
  row: OfficialOfferingRow
): ActivityOffering["availability"] {
  const availability = row.availability ?? {};
  const hasAvailabilityProvenance = Boolean(row.field_provenance?.availability?.length);

  return {
    kind: availability.kind ?? "evergreen_all_day",
    hoursState: availability.hours_state ?? "source_unspecified",
    label: hasAvailabilityProvenance ? availability.label ?? undefined : undefined,
  };
}

function mapStatus(row: OfficialOfferingRow): ActivityOffering["status"] {
  if (row.status) return row.status;
  if (row.availability?.hours_state === "currently_unavailable") {
    return "paused";
  }
  return "active";
}

function mapPrice(row: OfficialOfferingRow): ActivityOffering["price"] {
  const price = row.price ?? {};
  const state = price.state ?? "unknown";
  const hasPriceProvenance = Boolean(row.field_provenance?.price?.length);
  const publicState =
    state === "fee" || state === "free"
      ? hasPriceProvenance
        ? state
        : "unknown"
      : "unknown";

  return {
    state: publicState,
    notes: price.notes,
    amountCents: price.amountCents ?? price.amount_cents,
    minAmountCents: price.minAmountCents ?? price.min_amount_cents,
    maxAmountCents: price.maxAmountCents ?? price.max_amount_cents,
    priceBasis: price.priceBasis ?? price.price_basis,
    taxNotes: price.taxNotes ?? price.tax_notes,
    options: normalizePriceOptions(price.options),
  };
}

function mapBooking(row: OfficialOfferingRow): ActivityOffering["booking"] {
  const booking = row.booking;
  if (!booking) return undefined;
  const hasBookingProvenance = Boolean(row.field_provenance?.booking?.length);
  const mapped: ActivityOffering["booking"] = {
    reservationRequired:
      hasBookingProvenance
        ? booking.reservationRequired ?? booking.reservation_required
        : undefined,
    reservationRecommended:
      hasBookingProvenance
        ? booking.reservationRecommended ?? booking.reservation_recommended
        : undefined,
    cancellationNoticeHours:
      hasBookingProvenance
        ? booking.cancellationNoticeHours ?? booking.cancellation_notice_hours
        : undefined,
    method: hasBookingProvenance ? booking.method : undefined,
    phone: hasBookingProvenance ? booking.phone : undefined,
    url: hasBookingProvenance ? booking.url : undefined,
  };
  return Object.values(mapped).some((value) => value !== undefined)
    ? mapped
    : undefined;
}

function mapEligibility(row: OfficialOfferingRow): ActivityOffering["eligibility"] {
  const eligibility = row.eligibility ?? {};
  const hasEligibilityProvenance = Boolean(row.field_provenance?.eligibility?.length);
  return {
    ages: eligibility.ages ?? ["all_ages"],
    resortGuestOnly: hasEligibilityProvenance
      ? eligibility.resortGuestOnly ?? eligibility.resort_guest_only
      : undefined,
  };
}

function displayResortName(row: Pick<OfficialOfferingRow, "resort_name" | "resort_slug">): string {
  return row.resort_name?.replace(/^Disney's\s+/i, "") ?? slugToTitle(row.resort_slug);
}

function mapLocation(row: OfficialOfferingRow): ActivityOffering["location"] {
  const location = row.location ?? {};
  const hasLocationProvenance = Boolean(row.field_provenance?.location?.length);

  return {
    label: hasLocationProvenance
      ? location.label ?? location.value ?? displayResortName(row)
      : displayResortName(row),
    lat: hasLocationProvenance ? location.lat : undefined,
    lng: hasLocationProvenance ? location.lng : undefined,
  };
}

function mapAmenities(row: OfficialOfferingRow): string[] {
  if (!row.field_provenance?.amenities?.length) return [];
  return row.amenities ?? [];
}

export function mapOfficialOfferingRow(
  row: OfficialOfferingRow
): ActivityOffering {
  const verified = isSourceBackedOfficialOfferingRow(row);

  return {
    id: row.id,
    activitySlug: row.program_key,
    activityCatalogId: row.program_id,
    offeringKey: row.offering_key,
    resort: {
      slug: row.resort_slug,
      name: displayResortName(row),
      tier: formatResortTier(row.resort_category ?? "unknown"),
      area: row.resort_area ?? "unknown",
    },
    title: row.title,
    summary: row.description ?? "",
    category: row.category,
    tags: row.tags ?? [],
    availability: mapAvailability(row),
    price: mapPrice(row),
    location: mapLocation(row),
    booking: mapBooking(row),
    eligibility: mapEligibility(row),
    amenities: mapAmenities(row),
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
    trustState: verified ? row.trust_state ?? "source_backed" : "source_unclear",
    status: mapStatus(row),
  };
}

export function mapOfficialOfferingRows(
  rows: OfficialOfferingRow[]
): ActivityOffering[] {
  return rows
    .filter(isSourceBackedOfficialOfferingRow)
    .map(mapOfficialOfferingRow);
}

export function filterOfficialOfferingsWithoutActivityCollisions(
  offerings: ActivityOffering[],
  activities: Pick<ActivityOccurrence, "activitySlug" | "resort">[]
): ActivityOffering[] {
  if (activities.length === 0 || offerings.length === 0) return offerings;

  const coveredResortSlugs = new Set(
    activities
      .map((activity) => `${activity.resort.slug}:${activity.activitySlug}`)
      .filter(Boolean)
  );

  return offerings.filter(
    (offering) =>
      !coveredResortSlugs.has(`${offering.resort.slug}:${offering.activitySlug}`)
  );
}

const fetchOfficialActivityOfferingsFromSupabase = cachePublicData(
  async function fetchOfficialActivityOfferingsFromSupabase(): Promise<
    ActivityOffering[]
  > {
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
  },
  ["official-activity-offerings"]
);

export const fetchOfficialActivityOfferings = cache(
  fetchOfficialActivityOfferingsFromSupabase
);

export async function getOfficialOfferingsForResort(
  resortSlug: string
): Promise<ActivityOffering[]> {
  const offerings = await fetchOfficialActivityOfferings();
  return offerings.filter((offering) => offering.resort.slug === resortSlug);
}

export async function getFilteredOfficialOfferings(
  filters: ActivityFilters = {}
): Promise<ActivityOffering[]> {
  if (filters.daypart) return [];

  let offerings = await fetchOfficialActivityOfferings();

  offerings = offerings.filter((offering) => offering.status !== "paused");

  const selectedResorts = selectedResortSlugs(filters.resort);
  if (selectedResorts.length > 0) {
    const resortSet = new Set(selectedResorts);
    offerings = offerings.filter(
      (offering) => resortSet.has(offering.resort.slug)
    );
  }

  if (filters.category) {
    offerings = offerings.filter(
      (offering) => offering.category === filters.category
    );
  }

  if (filters.transport) {
    offerings = offerings.filter((offering) =>
      transportMatchesFilter(offering.resort.slug, offering.resort.area, filters.transport!)
    );
  }

  if (filters.area) {
    offerings = offerings.filter((offering) =>
      areaMatchesFilter(offering.resort.slug, offering.resort.area, filters.area!)
    );
  }

  if (filters.free) {
    offerings = offerings.filter((offering) => offering.price.state === "free");
  }

  if (filters.reservation) {
    offerings = offerings.filter(
      (offering) =>
        offering.booking?.reservationRequired ||
        offering.booking?.reservationRecommended
    );
  }

  const q = normalizeSearchQuery(filters.q ?? "");
  if (q) {
    const tokens = expandTokens(tokenizeQuery(q));
    offerings = offerings
      .map((offering) => ({
        offering,
        score: scoreOffering(offering, q, tokens),
      }))
      .filter((row) => row.score >= OFFERING_QUERY_MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .map((row) => row.offering);
  } else {
    offerings = [...offerings].sort((a, b) => {
      const resort = a.resort.name.localeCompare(b.resort.name);
      if (resort !== 0) return resort;
      return a.title.localeCompare(b.title);
    });
  }

  return offerings.slice(0, filters.limit ?? 100);
}
