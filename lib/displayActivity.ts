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

export interface DisplayActivity {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  resortName: string;
  resortSlug: string;
  locationLabel: string;
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

/** UI-safe activity object — never render raw ingest fields. */
export function toDisplayActivity(
  activity: ActivityOccurrence
): DisplayActivity {
  const input = occurrenceToDisplayInput(activity);
  const time = getDisplayTime(input);
  const quality = computeDisplayQuality(input);

  return {
    id: activity.id,
    title: getDisplayTitle(input),
    category: activity.category,
    categoryLabel: getCategoryMeta(activity.category).label,
    resortName: activity.resort.name,
    resortSlug: activity.resort.slug,
    locationLabel: sanitizeLocationLabel(activity.location.label),
    timeLabel: time.label,
    timeUncertain: time.uncertain,
    daypart: time.uncertain ? "unclear" : activity.daypart,
    costLabel: publicPriceLabel(activity.price.state),
    summary: getDisplaySummary(input),
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
