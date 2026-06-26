export type Daypart = "morning" | "afternoon" | "evening" | "late" | "anytime";

export type ActivitySortKey =
  | "time"
  | "resort"
  | "category"
  | "quality";

export type ActivityStatus = "active" | "seasonal" | "paused";

export interface SourceSpan {
  page?: number;
  line?: number;
  line_no?: number;
  bbox?: number[];
  text?: string;
}

export interface DocumentKeyLegend {
  kind: string;
  marker?: string;
  label?: string;
  spans?: SourceSpan[];
}

export interface ActivitySourceEvidence {
  url?: string;
  documentHash?: string;
  documentId?: string;
  edition?: string;
  documentKeyLegends?: DocumentKeyLegend[];
}

export interface ActivityClaim {
  value: string;
  evidence?: Record<string, unknown>[];
  confidence?: number;
  status?: "active" | "needs_review" | "rejected";
}

export interface ActivityPriceOption {
  optionName?: string;
  priceCentsMin?: number;
  priceCentsMax?: number;
  priceBasis?: string;
  dayOfWeek?: string;
  notes?: string;
}

export interface ActivityFactualEnrichment {
  exactVenue?: string;
  hostAreaOrWing?: string;
  ageMinimum?: number;
  adultRequired?: boolean;
  durationMinutes?: number;
  checkInOffsetMinutes?: number;
  reservationRequired?: boolean;
  reservationRecommended?: boolean;
  reservationMethod?: string;
  reservationPhone?: string;
  walkUpsAllowed?: boolean;
  sameDayAvailable?: boolean;
  programFamily?: string;
  activityVariant?: string;
  weatherDependency?: string;
  scheduleValidFrom?: string;
  scheduleValidUntil?: string;
  nextScheduleExpectedDate?: string;
  hiddenCharacterName?: string;
  redemptionLocation?: string;
  prizeOrCompletionRule?: string;
  resortGuestOnly?: boolean;
  poolGated?: boolean;
  openToNonResortGuests?: boolean;
  sisterResortAccess?: boolean;
}

export interface ExternalActivityFact {
  source?: string;
  sourceUrl?: string;
  sourcePageKind?: string;
  facts?: Record<string, unknown>;
  evidence?: Record<string, unknown>[];
  match?: Record<string, unknown>;
}

export interface ActivityOccurrence {
  id: string;
  activitySlug: string;
  activityCatalogId: string;
  resort: {
    slug: string;
    name: string;
    tier: string;
    area: string;
  };
  title: string;
  summary: string;
  category: string;
  section: string;
  startDateTime?: string;
  endDateTime?: string;
  daypart: Daypart;
  price: {
    state: "free" | "fee" | "unknown";
    notes?: string;
    amountCents?: number;
    minAmountCents?: number;
    maxAmountCents?: number;
    options?: ActivityPriceOption[];
  };
  location: {
    label: string;
    lat?: number;
    lng?: number;
  };
  eligibility: {
    ages: string[];
    reservation?: {
      required: boolean;
      url?: string;
    };
  };
  freshness: {
    lastVerified: string;
    sourceUrl: string;
    badge: "verified" | "stale";
  };
  source?: ActivitySourceEvidence;
  fieldProvenance?: Partial<
    Record<"title" | "schedule" | "location" | "description", SourceSpan[]>
  >;
  claims?: Record<string, ActivityClaim>;
  enrichment?: ActivityFactualEnrichment;
  externalFacts?: ExternalActivityFact[];
  validFrom?: string;
  validUntil?: string;
  trustState?:
    | "source_backed"
    | "reviewed"
    | "confirm_before_going"
    | "needs_review"
    | "source_unclear";
  status: ActivityStatus;
  isHappeningNow?: boolean;
  scheduleText?: string;
}

export interface ActivityOffering {
  id: string;
  activitySlug: string;
  activityCatalogId: string;
  offeringKey: string;
  resort: {
    slug: string;
    name: string;
    tier: string;
    area: string;
  };
  title: string;
  summary: string;
  category: string;
  tags: string[];
  availability: {
    kind:
      | "evergreen_all_day"
      | "evergreen_hours"
      | "reservation_based"
      | "calendar_dependent";
    hoursState?: string;
    label?: string;
  };
  price: ActivityOccurrence["price"];
  location: {
    label: string;
    lat?: number;
    lng?: number;
  };
  booking?: {
    reservationRequired?: boolean;
    reservationRecommended?: boolean;
    cancellationNoticeHours?: number;
    method?: string;
    phone?: string;
    url?: string;
  };
  eligibility: {
    ages: string[];
    resortGuestOnly?: boolean;
  };
  amenities: string[];
  freshness: {
    lastVerified: string;
    sourceUrl: string;
    badge: "verified" | "stale";
  };
  source?: ActivitySourceEvidence;
  fieldProvenance?: Partial<
    Record<
      | "title"
      | "resortJoin"
      | "location"
      | "description"
      | "availability"
      | "price"
      | "booking"
      | "eligibility"
      | "amenities",
      SourceSpan[]
    >
  >;
  claims?: Record<string, ActivityClaim>;
  trustState?:
    | "source_backed"
    | "reviewed"
    | "confirm_before_going"
    | "needs_review"
    | "source_unclear";
  status: ActivityStatus;
}

export interface ResortSummary {
  id: string;
  slug: string;
  name: string;
  category: string;
  area: string;
  disneyUrl: string;
  activityCount: number;
  offeringCount: number;
}

export interface MovieNightOccurrence {
  id: string;
  resortSlug: string;
  resortName: string;
  movieTitle: string;
  displayTitle: string;
  showTime: string;
  location?: string;
  dayOfWeek: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  releaseYear?: number;
  tmdbId?: number;
  isTonight?: boolean;
}

export interface PlanItem {
  id: string;
  activityCatalogId: string;
  activitySlug: string;
  sourceOccurrenceId?: string;
  title: string;
  resortSlug: string;
  resortName: string;
  category?: string;
  location?: string;
  startDateTime?: string;
  endDateTime?: string;
  notes?: string;
  addedAt: string;
  priceLabel?: string;
  sourceUrl?: string;
  sourceVerifiedAt?: string;
  savedSourceVersion?: string;
  sourceStatus?: "current" | "changed" | "unavailable";
  snapshotJson?: Record<string, unknown>;
}

export interface SharedPlan {
  shareSlug: string;
  items: PlanItem[];
  createdAt: string;
}

export interface ActivityFilters {
  resort?: string;
  category?: string;
  daypart?: Daypart;
  free?: boolean;
  reservation?: boolean;
  q?: string;
  sort?: ActivitySortKey;
  limit?: number;
}

export interface RawActivityRow {
  resort_id: string;
  resort_slug: string;
  resort_name: string;
  calendar_group_key: string;
  edition_id: string;
  activity_catalog_id: string;
  activity_edition_id: string;
  activity_name: string;
  normalized_name: string;
  category: string;
  section: string;
  location: string | null;
  schedule_text: string | null;
  description: string | null;
  is_fee_based: boolean;
  is_daily: boolean;
  fee_amount_cents: number | null;
  parse_confidence: number;
  needs_review: boolean;
  source_url: string | null;
  source_sha256: string | null;
}

export interface EnrichmentRow {
  activity_catalog_id: string;
  summary_original: string | null;
  duration_minutes: number | null;
  weather_dependency: string | null;
  price_state: string;
  price_notes: string | null;
  age_fit: Record<string, boolean>;
  environment: string[];
  reservation_required: boolean | null;
  reservation_url: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  meeting_location_detail: string | null;
  status: string;
  verification_last_checked: string | null;
  verification_source_url: string | null;
}

export interface OccurrenceRuleRow {
  id: string;
  activity_catalog_id: string;
  edition_id: string | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  effective_from: string | null;
  effective_until: string | null;
  timezone: string;
  schedule_notes: string | null;
  is_daily: boolean;
}
