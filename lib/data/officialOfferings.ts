import type {
  ActivityClaim,
  ActivitySourceEvidence,
  SourceSpan,
} from "@/lib/types/occurrence";
import { formatResortTier } from "@/lib/utils";

export interface OfficialOfferingRow {
  id: string;
  program_id: string;
  program_key: string;
  offering_key: string;
  resort_slug: string;
  resort_name: string;
  resort_category: string;
  resort_area: string;
  title: string;
  description?: string | null;
  category: string;
  tags?: string[] | null;
  location?: {
    label?: string | null;
    value?: string | null;
  } | null;
  availability?: {
    kind?: string;
    hours_state?: string;
    label?: string;
  } | null;
  price?: {
    state?: "free" | "fee" | "unknown";
    notes?: string;
    amountCents?: number;
  } | null;
  booking?: {
    reservation_required?: boolean;
    reservation_recommended?: boolean;
    cancellation_notice_hours?: number;
  } | null;
  eligibility?: {
    resort_guest_only?: boolean;
  } | null;
  amenities?: string[] | null;
  claims?: Record<string, ActivityClaim> | null;
  source_url?: string | null;
  source_sha256?: string | null;
  source_document_id?: string | null;
  field_provenance?: {
    title?: SourceSpan[];
    resort_join?: SourceSpan[];
    description?: SourceSpan[];
    location?: SourceSpan[];
  } | null;
  trust_state?: "source_backed" | "reviewed" | "confirm_before_going" | "needs_review" | null;
}

export interface OfficialActivityOffering {
  id: string;
  activitySlug: string;
  programId: string;
  programKey: string;
  offeringKey: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  resort: {
    slug: string;
    name: string;
    tier: string;
    area: string;
  };
  location: {
    label: string;
  };
  availability: {
    kind: string;
    hoursState: string;
    label: string;
  };
  price: {
    state: "free" | "fee" | "unknown";
    notes?: string;
    amountCents?: number;
  };
  booking?: {
    reservationRequired?: boolean;
    reservationRecommended?: boolean;
    cancellationNoticeHours?: number;
  };
  eligibility: {
    resortGuestOnly?: boolean;
  };
  amenities: string[];
  source?: ActivitySourceEvidence;
  fieldProvenance?: {
    title?: SourceSpan[];
    resortJoin?: SourceSpan[];
    description?: SourceSpan[];
    location?: SourceSpan[];
  };
  claims?: Record<string, ActivityClaim>;
  freshness: {
    lastVerified: string;
    sourceUrl: string;
    badge: "verified" | "stale";
  };
  trustState: "source_backed" | "reviewed" | "confirm_before_going" | "needs_review" | "source_unclear";
}

function hasVerifiedSourceContract(row: OfficialOfferingRow): boolean {
  return Boolean(
    row.source_url &&
      row.source_sha256 &&
      row.field_provenance?.title?.length &&
      row.field_provenance?.resort_join?.length
  );
}

export function mapOfficialOfferingRow(
  row: OfficialOfferingRow
): OfficialActivityOffering {
  const sourceUrl = row.source_url ?? "";
  const sourceHash = row.source_sha256 ?? undefined;
  const sourceVerified = hasVerifiedSourceContract(row);

  return {
    id: row.id,
    activitySlug: row.program_key,
    programId: row.program_id,
    programKey: row.program_key,
    offeringKey: row.offering_key,
    title: row.title,
    summary: row.description ?? "",
    category: row.category,
    tags: row.tags ?? [],
    resort: {
      slug: row.resort_slug,
      name: row.resort_name.replace(/^Disney's\s+/i, ""),
      tier: formatResortTier(row.resort_category),
      area: row.resort_area,
    },
    location: {
      label: row.location?.label ?? row.location?.value ?? row.resort_name,
    },
    availability: {
      kind: row.availability?.kind ?? "source_unspecified",
      hoursState: row.availability?.hours_state ?? "source_unspecified",
      label: row.availability?.label ?? "Availability varies",
    },
    price: {
      state: row.price?.state ?? "unknown",
      notes: row.price?.notes,
      amountCents: row.price?.amountCents,
    },
    booking: row.booking
      ? {
          reservationRequired: row.booking.reservation_required,
          reservationRecommended: row.booking.reservation_recommended,
          cancellationNoticeHours: row.booking.cancellation_notice_hours,
        }
      : undefined,
    eligibility: {
      resortGuestOnly: row.eligibility?.resort_guest_only,
    },
    amenities: row.amenities ?? [],
    source: {
      url: sourceUrl,
      documentHash: sourceHash,
      documentId: row.source_document_id ?? undefined,
    },
    fieldProvenance: {
      title: row.field_provenance?.title,
      resortJoin: row.field_provenance?.resort_join,
      description: row.field_provenance?.description,
      location: row.field_provenance?.location,
    },
    claims: row.claims ?? undefined,
    freshness: {
      lastVerified: new Date().toISOString(),
      sourceUrl,
      badge: sourceVerified ? "verified" : "stale",
    },
    trustState: row.trust_state ?? (sourceVerified ? "source_backed" : "source_unclear"),
  };
}

export function mapOfficialOfferingRows(
  rows: OfficialOfferingRow[]
): OfficialActivityOffering[] {
  return rows.map(mapOfficialOfferingRow);
}
