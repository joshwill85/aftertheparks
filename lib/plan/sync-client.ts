import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ActivityOccurrence, PlanItem } from "@/lib/types/occurrence";
import { activityToPlanSnapshot } from "@/lib/plan/snapshot";
import type { AddItemPayload, PlanStaySettings } from "@/lib/plan/types";
import type { LocalPlanCache, PendingPlanOperation } from "@/lib/plan/local-store";

export async function hasAuthSession(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}

export async function ensureAnonymousSession(captchaToken?: string | null) {
  if (!isSupabaseConfigured()) return null;
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user;

  const { data, error } = await supabase.auth.signInAnonymously(
    captchaToken ? { options: { captchaToken } } : undefined
  );
  if (error) {
    console.warn("anonymous-auth-failed", error.message);
    return null;
  }
  return data.user;
}

export function buildAddItemPayload(
  activity: ActivityOccurrence,
  operationId: string,
  turnstileToken?: string
): AddItemPayload {
  const snap = activityToPlanSnapshot(activity);
  return {
    operationId,
    turnstileToken,
    sourceActivityId: snap.activityCatalogId,
    sourceOccurrenceId: snap.sourceOccurrenceId,
    title: snap.title,
    resortId: snap.resortSlug,
    resortName: snap.resortName,
    location: snap.location,
    startsAt: snap.startDateTime,
    endsAt: snap.endDateTime,
    category: snap.category,
    priceLabel: snap.priceLabel,
    sourceUrl: snap.sourceUrl,
    sourceVerifiedAt: snap.sourceVerifiedAt,
    savedSourceVersion: snap.savedSourceVersion,
    snapshotJson: {
      ...snap.snapshotJson,
      activitySlug: snap.activitySlug,
    },
  };
}

export async function fetchServerPlan(): Promise<{
  plan: import("@/lib/plan/types").PlanMeta | null;
  items: PlanItem[];
} | null> {
  try {
    const res = await fetch("/api/plan", { credentials: "include" });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function syncUpdatePlanSettings(
  settings: PlanStaySettings,
  operationId: string
): Promise<import("@/lib/plan/types").PlanMeta | null> {
  try {
    const res = await fetch("/api/plan", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings, operationId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.plan ?? null;
  } catch {
    return null;
  }
}

export async function syncAddItem(
  payload: AddItemPayload
): Promise<{ plan: { id: string; version: number; title: string }; item: PlanItem } | null> {
  try {
    const res = await fetch("/api/plan/items", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

export async function syncRemoveItem(
  itemId: string,
  operationId: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/plan/items/${itemId}?operationId=${encodeURIComponent(operationId)}`,
      { method: "DELETE", credentials: "include" }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncUpdateItem(
  itemId: string,
  notes: string,
  operationId: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/plan/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, operationId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function replayPendingOperations(
  cache: LocalPlanCache
): Promise<LocalPlanCache> {
  if (cache.pendingOperations.length === 0) return cache;

  let next = { ...cache, pendingOperations: [] as PendingPlanOperation[] };
  const remaining: PendingPlanOperation[] = [];

  for (const op of cache.pendingOperations) {
    if (op.type === "add_item") {
      const result = await syncAddItem(op.payload as unknown as AddItemPayload);
      if (!result) {
        remaining.push(op);
        continue;
      }
      next = {
        ...next,
        planId: result.plan.id,
        title: result.plan.title,
        version: result.plan.version,
        items: mergeServerItem(next.items, result.item),
      };
    } else if (op.type === "remove_item") {
      const itemId = String(op.payload.itemId ?? "");
      const ok = await syncRemoveItem(itemId, op.operationId);
      if (!ok) remaining.push(op);
    } else if (op.type === "update_note") {
      const itemId = String(op.payload.itemId ?? "");
      const notes = String(op.payload.notes ?? "");
      const ok = await syncUpdateItem(itemId, notes, op.operationId);
      if (!ok) remaining.push(op);
    } else if (op.type === "update_plan_settings") {
      const result = await syncUpdatePlanSettings(
        {
          homeResortSlug: String(op.payload.homeResortSlug ?? "") || undefined,
          tripStartDate: String(op.payload.tripStartDate ?? "") || undefined,
          tripEndDate: String(op.payload.tripEndDate ?? "") || undefined,
        },
        op.operationId
      );
      if (!result) {
        remaining.push(op);
        continue;
      }
      next = {
        ...next,
        planId: result.id,
        title: result.title,
        version: result.version,
        homeResortSlug: result.homeResortSlug ?? null,
        tripStartDate: result.tripStartDate ?? null,
        tripEndDate: result.tripEndDate ?? null,
      };
    }
  }

  return { ...next, pendingOperations: remaining };
}

function mergeServerItem(items: PlanItem[], serverItem: PlanItem): PlanItem[] {
  const key = serverItem.sourceOccurrenceId ?? serverItem.activityCatalogId;
  const filtered = items.filter((i) => {
    const k = i.sourceOccurrenceId ?? i.activityCatalogId;
    return k !== key && i.id !== serverItem.id;
  });
  return [...filtered, serverItem].sort((a, b) =>
    (a.startDateTime ?? "").localeCompare(b.startDateTime ?? "")
  );
}

export function mergeServerPlan(
  local: LocalPlanCache,
  server: {
    plan: (import("@/lib/plan/types").PlanMeta & { id: string; title: string; version: number }) | null;
    items: PlanItem[];
  }
): LocalPlanCache {
  if (!server.plan) {
    if (local.items.length === 0) return local;
    return local;
  }

  if (server.plan.version >= local.version && local.pendingOperations.length === 0) {
    return {
      ...local,
      planId: server.plan.id,
      title: server.plan.title,
      version: server.plan.version,
      homeResortSlug: server.plan.homeResortSlug ?? null,
      tripStartDate: server.plan.tripStartDate ?? null,
      tripEndDate: server.plan.tripEndDate ?? null,
      items: server.items,
    };
  }

  return {
    ...local,
    planId: server.plan.id ?? local.planId,
    title: server.plan.title || local.title,
    homeResortSlug: local.homeResortSlug ?? server.plan.homeResortSlug ?? null,
    tripStartDate: local.tripStartDate ?? server.plan.tripStartDate ?? null,
    tripEndDate: local.tripEndDate ?? server.plan.tripEndDate ?? null,
  };
}
