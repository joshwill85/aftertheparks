export type Daypart = "morning" | "afternoon" | "evening" | "late";

export type ActivityStatus = "active" | "seasonal" | "paused";

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
  startDateTime: string;
  endDateTime?: string;
  daypart: Daypart;
  price: {
    state: "free" | "fee" | "unknown";
    notes?: string;
    amountCents?: number;
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
  status: ActivityStatus;
  isHappeningNow?: boolean;
  scheduleText?: string;
}

export interface ResortSummary {
  id: string;
  slug: string;
  name: string;
  category: string;
  area: string;
  disneyUrl: string;
  activityCount: number;
}

export interface MovieNightOccurrence {
  id: string;
  resortSlug: string;
  resortName: string;
  movieTitle: string;
  showTime: string;
  location?: string;
  dayOfWeek: string;
}

export interface PlanItem {
  id: string;
  activityCatalogId: string;
  activitySlug: string;
  title: string;
  resortSlug: string;
  resortName: string;
  startDateTime?: string;
  endDateTime?: string;
  notes?: string;
  addedAt: string;
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
  q?: string;
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
