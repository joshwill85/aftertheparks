import {
  occurrenceToDisplayInput,
  shouldHideActivity,
} from "@/lib/activityDisplay";
import {
  computeDisplayQuality,
  meetsMinimumQuality,
  type DisplayQualityTier,
} from "@/lib/displayQuality";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

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
