import type { PlanItem } from "@/lib/types/occurrence";
import type { AddItemPayload } from "@/lib/plan/types";
import type { LocalPlanCache } from "@/lib/plan/local-store";
import { syncAddItem } from "@/lib/plan/sync-client";

function itemToPayload(item: PlanItem, operationId: string): AddItemPayload {
  return {
    operationId,
    sourceActivityId: item.activityCatalogId,
    sourceOccurrenceId: item.sourceOccurrenceId,
    title: item.title,
    resortId: item.resortSlug,
    resortName: item.resortName,
    location: item.location,
    startsAt: item.startDateTime,
    endsAt: item.endDateTime,
    category: item.category,
    priceLabel: item.priceLabel,
    sourceUrl: item.sourceUrl,
    sourceVerifiedAt: item.sourceVerifiedAt,
    savedSourceVersion: item.savedSourceVersion,
    snapshotJson: {
      ...(item.snapshotJson ?? {}),
      activitySlug: item.activitySlug,
    },
    userNote: item.notes,
  };
}

/** Push legacy IndexedDB-only items to the server when a guest session first connects. */
export async function migrateLocalItemsToServer(
  cache: LocalPlanCache
): Promise<LocalPlanCache> {
  if (cache.planId || cache.items.length === 0) return cache;

  let next = { ...cache };
  for (const item of cache.items) {
    const operationId = crypto.randomUUID();
    const result = await syncAddItem(itemToPayload(item, operationId));
    if (result) {
      next = {
        ...next,
        planId: result.plan.id,
        title: result.plan.title,
        version: result.plan.version,
        items: next.items.map((i) =>
          i.id === item.id ? result.item : i
        ),
      };
    }
  }

  return next;
}
