import type { ActivityOccurrence, PlanItem } from "@/lib/types/occurrence";
import { publicPriceLabel } from "@/lib/priceLabels";

const INTERNAL_NO_TIME_SCHEDULE_TEXT =
  /no posted time in PDF|Activities schedule available digitally/i;

export function priceLabelFromActivity(activity: ActivityOccurrence): string | undefined {
  return publicPriceLabel(activity.price.state);
}

function publicScheduleText(
  scheduleText: unknown,
  startDateTime?: string,
  endDateTime?: string
): string | undefined {
  const text = typeof scheduleText === "string" ? scheduleText.trim() : "";
  if (!text) return undefined;
  if (
    INTERNAL_NO_TIME_SCHEDULE_TEXT.test(text) &&
    !startDateTime &&
    !endDateTime
  ) {
    return undefined;
  }
  return text;
}

export function sanitizePlanSnapshotJson(
  snapshot: Record<string, unknown> | undefined,
  options: { startDateTime?: string; endDateTime?: string } = {}
): Record<string, unknown> {
  const sanitized = { ...(snapshot ?? {}) };
  const scheduleText = publicScheduleText(
    sanitized.scheduleText,
    options.startDateTime,
    options.endDateTime
  );
  if (scheduleText) {
    sanitized.scheduleText = scheduleText;
  } else {
    delete sanitized.scheduleText;
  }
  return sanitized;
}

export function activityToPlanSnapshot(
  activity: ActivityOccurrence
): Omit<PlanItem, "id" | "addedAt"> {
  return {
    activityCatalogId: activity.activityCatalogId,
    activitySlug: activity.activitySlug,
    sourceOccurrenceId: activity.id,
    title: activity.title,
    resortSlug: activity.resort.slug,
    resortName: activity.resort.name,
    location: activity.location?.label,
    category: activity.category,
    startDateTime: activity.startDateTime,
    endDateTime: activity.endDateTime,
    priceLabel: priceLabelFromActivity(activity),
    sourceUrl: activity.freshness?.sourceUrl,
    sourceVerifiedAt: activity.freshness?.lastVerified,
    savedSourceVersion: activity.freshness?.lastVerified,
    sourceStatus: "current",
    snapshotJson: {
      ...sanitizePlanSnapshotJson(
        {
          summary: activity.summary,
          daypart: activity.daypart,
          scheduleText: activity.scheduleText,
          reservationRequired: activity.eligibility?.reservation?.required ?? false,
        },
        {
          startDateTime: activity.startDateTime,
          endDateTime: activity.endDateTime,
        }
      ),
    },
  };
}

export function planItemDedupeKey(item: Pick<PlanItem, "sourceOccurrenceId" | "activityCatalogId">): string {
  return item.sourceOccurrenceId ?? item.activityCatalogId;
}

export function isActivityOccurrenceSaved(
  items: Pick<PlanItem, "sourceOccurrenceId" | "activityCatalogId">[],
  activity: Pick<ActivityOccurrence, "id" | "activityCatalogId">
): boolean {
  if (items.some((item) => item.sourceOccurrenceId === activity.id)) {
    return true;
  }

  return items.some(
    (item) =>
      !item.sourceOccurrenceId &&
      item.activityCatalogId === activity.activityCatalogId
  );
}
