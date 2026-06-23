import {
  occurrenceToDisplayInput,
  shouldHideActivity,
} from "@/lib/activityDisplay";
import {
  computeDisplayQuality,
  meetsMinimumQuality,
  type DisplayQualityTier,
} from "@/lib/displayQuality";
import type {
  ActivityClaim,
  ActivityFactualEnrichment,
  ActivityOccurrence,
} from "@/lib/types/occurrence";

const REQUIRED_PROVENANCE_FIELDS = ["title", "schedule", "location"] as const;

function toDisplayInput(activity: ActivityOccurrence) {
  return occurrenceToDisplayInput({
    ...activity,
    title: activity.title,
    activitySlug: activity.activitySlug,
    scheduleText: activity.scheduleText,
    summary: activity.summary,
    parse_confidence: undefined,
  });
}

function hasSourceEvidence(activity: ActivityOccurrence): boolean {
  return Boolean(activity.source?.url && activity.source?.documentHash);
}

function hasRequiredProvenance(activity: ActivityOccurrence): boolean {
  return REQUIRED_PROVENANCE_FIELDS.every((field) => {
    const spans = activity.fieldProvenance?.[field];
    return Array.isArray(spans) && spans.length > 0;
  });
}

function hasUnsupportedClaims(activity: ActivityOccurrence): boolean {
  return Object.values(activity.claims ?? {}).some((claim) => {
    const value = claim.value?.trim().toLowerCase();
    if (!value || value === "unknown" || value === "not_applicable") return false;
    return !claim.evidence || claim.evidence.length === 0;
  });
}

function hasVerifiedSourceContract(activity: ActivityOccurrence): boolean {
  return (
    hasSourceEvidence(activity) &&
    hasRequiredProvenance(activity) &&
    !hasUnsupportedClaims(activity)
  );
}

function claimHasEvidence(claim?: ActivityClaim): boolean {
  return Array.isArray(claim?.evidence) && claim.evidence.length > 0;
}

function evidenceFields(activity: ActivityOccurrence): Set<string> {
  const fields = new Set<string>();

  for (const fact of activity.externalFacts ?? []) {
    for (const evidence of fact.evidence ?? []) {
      const field = evidence.field;
      if (typeof field === "string" && field.trim()) fields.add(field);
    }
  }

  for (const [kind, claim] of Object.entries(activity.claims ?? {})) {
    if (kind === "external_schedule_validity") {
      fields.add("schedule_validity");
    }
    for (const evidence of claim.evidence ?? []) {
      const nestedFields = evidence.fields;
      if (Array.isArray(nestedFields)) {
        for (const field of nestedFields) {
          if (typeof field === "string" && field.trim()) fields.add(field);
        }
      }
    }
  }

  return fields;
}

function hasAnyEvidenceField(
  fields: Set<string>,
  required: readonly string[]
): boolean {
  return required.some((field) => fields.has(field));
}

function sanitizeEnrichment(
  activity: ActivityOccurrence
): ActivityFactualEnrichment | undefined {
  const enrichment = activity.enrichment;
  if (!enrichment) return undefined;

  const fields = evidenceFields(activity);
  const keep = <K extends keyof ActivityFactualEnrichment>(
    key: K,
    required: readonly string[]
  ): ActivityFactualEnrichment[K] | undefined =>
    hasAnyEvidenceField(fields, required) ? enrichment[key] : undefined;

  const sanitized: ActivityFactualEnrichment = {
    exactVenue: keep("exactVenue", ["schedule_location"]),
    hostAreaOrWing: keep("hostAreaOrWing", ["schedule_location"]),
    ageMinimum: keep("ageMinimum", ["age_access", "age", "access_rules"]),
    adultRequired: keep("adultRequired", ["age_access", "access_rules"]),
    durationMinutes: keep("durationMinutes", ["duration", "check_in", "reservation"]),
    checkInOffsetMinutes: keep("checkInOffsetMinutes", ["check_in", "reservation"]),
    reservationRequired: keep("reservationRequired", ["reservation"]),
    reservationRecommended: keep("reservationRecommended", ["reservation"]),
    reservationMethod: keep("reservationMethod", ["reservation"]),
    reservationPhone: keep("reservationPhone", ["reservation"]),
    walkUpsAllowed: keep("walkUpsAllowed", ["reservation"]),
    sameDayAvailable: keep("sameDayAvailable", ["reservation"]),
    programFamily: keep("programFamily", ["schedule_location"]),
    activityVariant: keep("activityVariant", ["schedule_location"]),
    weatherDependency: keep("weatherDependency", ["schedule_location"]),
    scheduleValidFrom: keep("scheduleValidFrom", [
      "schedule_validity",
      "valid_from",
    ]),
    scheduleValidUntil: keep("scheduleValidUntil", [
      "schedule_validity",
      "valid_until",
    ]),
    nextScheduleExpectedDate: keep("nextScheduleExpectedDate", [
      "schedule_validity",
      "next_expected_schedule_date",
    ]),
    hiddenCharacterName: keep("hiddenCharacterName", [
      "schedule_location",
      "description",
    ]),
    redemptionLocation: keep("redemptionLocation", [
      "schedule_location",
      "description",
    ]),
    prizeOrCompletionRule: keep("prizeOrCompletionRule", [
      "description",
      "access_rules",
    ]),
    resortGuestOnly: keep("resortGuestOnly", ["access_rules"]),
    poolGated: keep("poolGated", ["pool_gated"]),
    openToNonResortGuests: keep("openToNonResortGuests", [
      "open_to_non_resort_guests",
    ]),
    sisterResortAccess: keep("sisterResortAccess", ["sister_resort_access"]),
  };

  return Object.values(sanitized).some((value) => value !== undefined)
    ? sanitized
    : undefined;
}

function sanitizePrice(activity: ActivityOccurrence): ActivityOccurrence["price"] {
  const hasPriceEvidence =
    claimHasEvidence(activity.claims?.fee) ||
    hasAnyEvidenceField(evidenceFields(activity), ["price"]);
  const state =
    (activity.price.state === "fee" || activity.price.state === "free") &&
    hasPriceEvidence
      ? activity.price.state
      : "unknown";

  if (!hasPriceEvidence || state === "unknown") {
    return { state };
  }

  return activity.price;
}

/** Ensure every public activity has honest freshness metadata. */
export function ensurePublicActivity(
  activity: ActivityOccurrence
): ActivityOccurrence {
  const quality = computeDisplayQuality(toDisplayInput(activity));
  const sourceContractVerified = hasVerifiedSourceContract(activity);
  const displaySafe = quality.tier !== "hide" && quality.tier !== "low";
  const badge =
    activity.freshness?.badge === "stale"
      ? "stale"
      : displaySafe && sourceContractVerified
        ? "verified"
        : "stale";
  const trustState =
    activity.trustState ??
    (sourceContractVerified ? "source_backed" : "source_unclear");

  return {
    ...activity,
    price: sanitizePrice(activity),
    enrichment: sanitizeEnrichment(activity),
    trustState,
    freshness: {
      lastVerified: activity.freshness?.lastVerified ?? new Date().toISOString(),
      sourceUrl: activity.freshness?.sourceUrl ?? "",
      badge,
    },
  };
}

export function sanitizePublicActivities(
  activities: ActivityOccurrence[],
  options: { minTier?: DisplayQualityTier } = {}
): ActivityOccurrence[] {
  const minTier = options.minTier ?? "low";

  return activities
    .filter((activity) => {
      if (activity.status === "paused") return false;
      const input = toDisplayInput(activity);
      if (shouldHideActivity(input)) return false;
      return meetsMinimumQuality(input, minTier);
    })
    .map(ensurePublicActivity);
}

export function publicActivitiesResponse(
  activities: ActivityOccurrence[],
  options: { minTier?: DisplayQualityTier } = {}
) {
  const sanitized = sanitizePublicActivities(activities, options);
  return {
    activities: sanitized,
    count: sanitized.length,
    meta: {
      verified: sanitized.filter((a) => a.freshness.badge === "verified").length,
      stale: sanitized.filter((a) => a.freshness.badge === "stale").length,
    },
  };
}

export function dedupeOccurrences(
  activities: ActivityOccurrence[]
): ActivityOccurrence[] {
  const seen = new Map<string, ActivityOccurrence>();
  for (const activity of activities) {
    if (!seen.has(activity.id)) {
      seen.set(activity.id, activity);
    }
  }
  return Array.from(seen.values());
}
