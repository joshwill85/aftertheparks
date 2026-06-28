import {
  getDisplaySummary,
  getDisplayTime,
  getDisplayTitle,
  getTrustState,
  occurrenceToDisplayInput,
  type TrustState,
} from "@/lib/activityDisplay";
import { getCategoryMeta } from "@/lib/categories/meta";
import {
  computeDisplayQuality,
  type DisplayQualityResult,
} from "@/lib/displayQuality";
import { sanitizeLocationLabel } from "@/lib/location/sanitize";
import { publicPriceLabel, type PublicPriceLabel } from "@/lib/priceLabels";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

export type ActivityAnswerState = "source_backed" | "fallback";

export interface ActivityAnswerCoverage {
  what: {
    label: string;
    state: ActivityAnswerState;
  };
  when: {
    label: string;
    state: ActivityAnswerState;
  };
  where: {
    label: string;
    state: ActivityAnswerState;
  };
  complete: boolean;
}

export interface DisplayActivity {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  resortName: string;
  resortSlug: string;
  locationLabel: string;
  whatLabel: string;
  whenLabel: string;
  whereLabel: string;
  answerCoverage: ActivityAnswerCoverage;
  timeLabel?: string;
  timeUncertain: boolean;
  daypart: ActivityOccurrence["daypart"] | "unclear";
  costLabel?: PublicPriceLabel;
  summary?: string;
  trustState: TrustState;
  displayQuality: DisplayQualityResult;
  activitySlug: string;
  activityCatalogId: string;
  startDateTime?: string;
  endDateTime?: string;
  isHappeningNow: boolean;
  scheduleText?: string;
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function cleanVenueLabel(value?: string | null): string | undefined {
  const label = value?.trim().replace(/\s+/g, " ");
  if (!label) return undefined;
  const withoutLocated = label.replace(/^located\s+(?:at\s+)?/i, "");
  return capitalizeFirst(withoutLocated);
}

function fallbackWhat(activity: ActivityOccurrence): string | undefined {
  if (activity.category === "movies_under_stars") {
    return "Outdoor Disney movie screening; title varies by resort schedule.";
  }
  if (activity.category === "poolside") {
    return "Family-friendly poolside games and activities.";
  }
  return undefined;
}

function displayWhere(activity: ActivityOccurrence, sanitizedLocation: string): {
  label: string;
  state: ActivityAnswerState;
} {
  const exactVenue = cleanVenueLabel(activity.enrichment?.exactVenue);
  if (exactVenue) {
    return { label: exactVenue, state: "source_backed" };
  }

  if (
    sanitizedLocation &&
    sanitizedLocation !== "Resort" &&
    sanitizedLocation !== activity.resort.name
  ) {
    return { label: sanitizedLocation, state: "source_backed" };
  }

  const rawLocation = cleanVenueLabel(activity.location.label);
  if (
    rawLocation &&
    rawLocation !== "Resort" &&
    rawLocation !== activity.resort.name &&
    rawLocation.length <= 120
  ) {
    return { label: rawLocation, state: "source_backed" };
  }

  return { label: "Confirm exact spot", state: "fallback" };
}

/** UI-safe activity object — never render raw ingest fields. */
export function toDisplayActivity(
  activity: ActivityOccurrence
): DisplayActivity {
  const input = occurrenceToDisplayInput(activity);
  const time = getDisplayTime(input);
  const quality = computeDisplayQuality(input);
  const summary = getDisplaySummary(input);
  const whatFallback = fallbackWhat(activity);
  const whatLabel = whatFallback ?? summary ?? getDisplayTitle(input);
  const whenLabel = time.label ?? "Time not posted by Disney";
  const sanitizedLocation = sanitizeLocationLabel(activity.location.label);
  const where = displayWhere(activity, sanitizedLocation);
  const answerCoverage: ActivityAnswerCoverage = {
    what: {
      label: whatLabel,
      state: whatFallback || !summary ? "fallback" : "source_backed",
    },
    when: {
      label: whenLabel,
      state: time.label ? "source_backed" : "fallback",
    },
    where,
    complete: Boolean(whatLabel && whenLabel && where.label),
  };

  return {
    id: activity.id,
    title: getDisplayTitle(input),
    category: activity.category,
    categoryLabel: getCategoryMeta(activity.category).label,
    resortName: activity.resort.name,
    resortSlug: activity.resort.slug,
    locationLabel: where.label,
    whatLabel,
    whenLabel,
    whereLabel: where.label,
    answerCoverage,
    timeLabel: whenLabel,
    timeUncertain: time.uncertain,
    daypart: time.uncertain ? "unclear" : activity.daypart,
    costLabel: publicPriceLabel(activity.price.state),
    summary: summary ?? whatFallback,
    trustState: getTrustState(input),
    displayQuality: quality,
    activitySlug: activity.activitySlug,
    activityCatalogId: activity.activityCatalogId,
    startDateTime: activity.startDateTime,
    endDateTime: activity.endDateTime,
    isHappeningNow: Boolean(activity.isHappeningNow),
    scheduleText: activity.scheduleText,
  };
}
