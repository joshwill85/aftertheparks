import type { ActivityOccurrence, PlanItem } from "@/lib/types/occurrence";

export function priceLabelFromActivity(activity: ActivityOccurrence): string {
  if (activity.price.state === "free") return "Free";
  if (activity.price.state === "fee") return "Paid";
  return "Unclear";
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
      summary: activity.summary,
      daypart: activity.daypart,
      scheduleText: activity.scheduleText,
      reservationRequired: activity.eligibility?.reservation?.required ?? false,
    },
  };
}

export function planItemDedupeKey(item: Pick<PlanItem, "sourceOccurrenceId" | "activityCatalogId">): string {
  return item.sourceOccurrenceId ?? item.activityCatalogId;
}
