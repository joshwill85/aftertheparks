"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ActivityOccurrence, PlanItem } from "@/lib/types/occurrence";
import type { PlanStaySettings } from "@/lib/plan/types";
import {
  broadcastPlanUpdate,
  createPlanItem,
  loadLocalPlanCache,
  saveLocalPlanCache,
  subscribePlanUpdates,
  type LocalPlanCache,
  type PendingPlanOperation,
} from "@/lib/plan/store";
import {
  activityToPlanSnapshot,
  isActivityOccurrenceSaved,
  planItemDedupeKey,
} from "@/lib/plan/snapshot";
import type { PlanSyncStatus } from "@/lib/plan/types";
import {
  buildAddItemPayload,
  ensureAnonymousSession,
  fetchServerPlan,
  hasAuthSession,
  mergeServerPlan,
  replayPendingOperations,
  syncAddItem,
  syncRemoveItem,
  syncUpdateItem,
  syncUpdatePlanSettings,
} from "@/lib/plan/sync-client";
import { migrateLocalItemsToServer } from "@/lib/plan/migrate";
import { trackPlanEvent } from "@/lib/plan/analytics";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { executeTurnstile } from "@/lib/turnstile/browser";

interface PlanContextValue {
  items: PlanItem[];
  planTitle: string;
  homeResortSlug?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  itemCount: number;
  syncStatus: PlanSyncStatus;
  previewOpen: boolean;
  lastSavedId: string | null;
  interestPromptDismissed: boolean;
  shareUrl: string | null;
  hasExistingShare: boolean;
  undoItem: UndoPlanItem | null;
  addActivity: (activity: ActivityOccurrence) => void;
  addActivities: (activities: ActivityOccurrence[]) => void;
  removeItem: (id: string) => void;
  undoRemove: () => void;
  updateNotes: (id: string, notes: string) => void;
  renamePlan: (title: string) => void;
  updatePlanSettings: (settings: PlanStaySettings) => void;
  isInPlan: (catalogId: string) => boolean;
  isActivitySaved: (activity: ActivityOccurrence) => boolean;
  openPreview: () => void;
  closePreview: () => void;
  dismissInterestPrompt: () => void;
  createShare: () => Promise<string | null>;
  revokeShare: () => Promise<void>;
  rotateShare: () => Promise<string | null>;
  deletePlan: () => Promise<void>;
  refreshFromServer: () => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | null>(null);

const UNDO_MS = 5000;

type UndoPlanItem = PlanItem & { removeOperationId?: string };

function restorePlanItemOrder(items: PlanItem[]): PlanItem[] {
  return [...items].sort((a, b) => {
    const time = (a.startDateTime ?? "").localeCompare(b.startDateTime ?? "");
    if (time !== 0) return time;
    return a.addedAt.localeCompare(b.addedAt);
  });
}

function planItemToActivityOccurrence(item: PlanItem): ActivityOccurrence {
  return {
    id: item.sourceOccurrenceId ?? item.id,
    activityCatalogId: item.activityCatalogId,
    activitySlug: item.activitySlug,
    title: item.title,
    resort: {
      slug: item.resortSlug,
      name: item.resortName,
      tier: "",
      area: "",
    },
    summary: String(item.snapshotJson?.summary ?? ""),
    category: item.category ?? "resort_activity",
    section: "",
    daypart: "anytime",
    price: { state: "unknown" },
    location: { label: item.location ?? "" },
    eligibility: {
      ages: [],
      reservation: {
        required: item.snapshotJson?.reservationRequired === true,
      },
    },
    freshness: {
      lastVerified: item.sourceVerifiedAt ?? new Date().toISOString(),
      sourceUrl: item.sourceUrl ?? "",
      badge: "verified",
    },
    status: "active",
    startDateTime: item.startDateTime,
    endDateTime: item.endDateTime,
    scheduleText: String(item.snapshotJson?.scheduleText ?? ""),
  };
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<LocalPlanCache | null>(null);
  const [syncStatus, setSyncStatus] = useState<PlanSyncStatus>("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [hasExistingShare, setHasExistingShare] = useState(false);
  const [undoItem, setUndoItem] = useState<UndoPlanItem | null>(null);
  const [interestPromptDismissed, setInterestPromptDismissed] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);

  const persist = useCallback((next: LocalPlanCache) => {
    setCache(next);
    void saveLocalPlanCache(next);
    broadcastPlanUpdate(next);
  }, []);

  const resolvePendingOperation = useCallback((operationId: string) => {
    setCache((current) => {
      if (
        !current ||
        !current.pendingOperations.some((op) => op.operationId === operationId)
      ) {
        return current;
      }

      const next: LocalPlanCache = {
        ...current,
        pendingOperations: current.pendingOperations.filter(
          (op) => op.operationId !== operationId
        ),
      };
      void saveLocalPlanCache(next);
      broadcastPlanUpdate(next);
      return next;
    });
  }, []);

  const runSync = useCallback(
    async (base: LocalPlanCache) => {
      if (!isSupabaseConfigured() || syncingRef.current) return;

      const session = await hasAuthSession();
      if (!session) {
        setSyncStatus(
          base.pendingOperations.length > 0 || base.items.length > 0
            ? "offline"
            : "idle"
        );
        return;
      }

      syncingRef.current = true;
      setSyncStatus("syncing");

      try {
        let replayed = await replayPendingOperations(base);
        const server = await fetchServerPlan();

        if (server?.plan) {
          replayed = mergeServerPlan(replayed, {
            plan: server.plan,
            items: server.items,
          });
        }

        if (replayed.pendingOperations.length > 0) {
          setSyncStatus("offline");
        } else {
          setSyncStatus("synced");
        }

        persist(replayed);
      } catch {
        setSyncStatus("offline");
      } finally {
        syncingRef.current = false;
      }
    },
    [persist]
  );

  useEffect(() => {
    loadLocalPlanCache().then((loaded) => {
      setCache(loaded);
      if (typeof window !== "undefined") {
        const dismissed = sessionStorage.getItem("plan-interest-dismissed");
        if (dismissed === "1") setInterestPromptDismissed(true);
      }
      void runSync(loaded);
    });
  }, [runSync]);

  useEffect(() => {
    return subscribePlanUpdates((remote) => {
      setCache(remote);
    });
  }, []);

  const items = useMemo(() => cache?.items ?? [], [cache?.items]);

  const queueAndSyncAdd = useCallback(
    async (activity: ActivityOccurrence, openPreviewAfter: boolean) => {
      const operationId = crypto.randomUUID();
      const partial = activityToPlanSnapshot(activity);
      const optimistic = createPlanItem(partial);
      const dedupeKey = planItemDedupeKey(optimistic);

      const base = cache ?? (await loadLocalPlanCache());
      if (base.items.some((i) => planItemDedupeKey(i) === dedupeKey)) {
        return;
      }

      const op: PendingPlanOperation = {
        operationId,
        type: "add_item",
        planId: base.planId ?? undefined,
        payload: {
          ...(buildAddItemPayload(activity, operationId) as unknown as Record<
            string,
            unknown
          >),
          localItemId: optimistic.id,
        },
        createdAt: new Date().toISOString(),
      };

      const next: LocalPlanCache = {
        ...base,
        items: [...base.items, optimistic],
        pendingOperations: [...base.pendingOperations, op],
        version: base.version,
      };

      persist(next);
      setLastSavedId(optimistic.id);
      trackPlanEvent("plan_item_saved_local");

      if (openPreviewAfter) {
        setPreviewOpen(true);
        trackPlanEvent("plan_preview_opened");
      }

      if (!isSupabaseConfigured()) {
        setSyncStatus("offline");
        return;
      }

      const isFirstServerSave = !base.planId;
      let turnstileToken: string | undefined;
      if (isFirstServerSave) {
        turnstileToken =
          (await executeTurnstile("plan_first_save")) ?? undefined;
        const user = await ensureAnonymousSession(turnstileToken);
        if (!user) {
          setSyncStatus("offline");
          trackPlanEvent("plan_item_sync_failed");
          return;
        }
      } else {
        await ensureAnonymousSession();
      }

      const latestBeforeAdd = await loadLocalPlanCache();
      const latestLocalAddItem = latestBeforeAdd.items.find(
        (i) => i.id === optimistic.id
      );
      const payload = {
        ...buildAddItemPayload(activity, operationId, turnstileToken),
        userNote: latestLocalAddItem?.notes?.trim() || undefined,
      };
      const result = await syncAddItem(payload);

      if (result) {
        const latestCache = await loadLocalPlanCache();
        const latestLocalAddItemAfterSync =
          latestCache.items.find((i) => i.id === optimistic.id) ?? optimistic;
        const latestAddNote = latestLocalAddItemAfterSync.notes?.trim() ?? "";
        let pendingOperations = latestCache.pendingOperations.filter(
          (p) => p.operationId !== operationId
        );

        if (latestAddNote !== (result.item.notes ?? "")) {
          const noteOperationId = crypto.randomUUID();
          const noteSynced = await syncUpdateItem(
            result.item.id,
            latestAddNote,
            noteOperationId
          );
          if (!noteSynced) {
            pendingOperations = [
              ...pendingOperations,
              {
                operationId: noteOperationId,
                type: "update_note",
                payload: { itemId: result.item.id, notes: latestAddNote },
                createdAt: new Date().toISOString(),
              },
            ];
          }
        }

        const serverItem = {
          ...result.item,
          notes: latestAddNote || undefined,
        };
        let synced: LocalPlanCache = {
          ...latestCache,
          planId: result.plan.id,
          title: result.plan.title,
          version: result.plan.version,
          items: latestCache.items.map((i) =>
            i.id === optimistic.id ? serverItem : i
          ),
          pendingOperations,
        };

        if (isFirstServerSave && synced.items.length > 1) {
          synced = await migrateLocalItemsToServer(synced, {
            skipItemIds: [result.item.id],
          });
        }

        persist(synced);
        setSyncStatus("synced");
        trackPlanEvent("plan_item_synced");
      } else {
        setSyncStatus("offline");
        trackPlanEvent("plan_item_sync_failed");
      }
    },
    [cache, persist]
  );

  const addActivity = useCallback(
    (activity: ActivityOccurrence) => {
      trackPlanEvent("plan_save_clicked");
      queueAndSyncAdd(activity, true).catch(() => setSyncStatus("offline"));
    },
    [queueAndSyncAdd]
  );

  const addActivities = useCallback(
    (activities: ActivityOccurrence[]) => {
      void (async () => {
        let opened = false;
        for (const activity of activities) {
          await queueAndSyncAdd(activity, !opened);
          opened = true;
        }
      })();
    },
    [queueAndSyncAdd]
  );

  const removeItem = useCallback(
    (id: string) => {
      const base = cache;
      if (!base) return;
      const removed = base.items.find((i) => i.id === id);
      if (!removed) return;

      const operationId = crypto.randomUUID();
      const op: PendingPlanOperation = {
        operationId,
        type: "remove_item",
        payload: { itemId: id },
        createdAt: new Date().toISOString(),
      };

      const next: LocalPlanCache = {
        ...base,
        items: base.items.filter((i) => i.id !== id),
        pendingOperations: [...base.pendingOperations, op],
      };

      persist(next);
      trackPlanEvent("plan_item_removed");
      setUndoItem({ ...removed, removeOperationId: operationId });
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setUndoItem(null), UNDO_MS);

      if (!base.planId) return;

      void (async () => {
        await ensureAnonymousSession();
        const ok = await syncRemoveItem(id, operationId);
        if (ok) {
          resolvePendingOperation(operationId);
          setSyncStatus("synced");
        } else {
          setSyncStatus("offline");
        }
      })();
    },
    [cache, persist, resolvePendingOperation]
  );

  const cancelPendingRemove = useCallback(
    (item: UndoPlanItem, operationId: string): boolean => {
      const base = cache;
      if (
        !base ||
        !base.pendingOperations.some((op) => op.operationId === operationId)
      ) {
        return false;
      }

      const next: LocalPlanCache = {
        ...base,
        items: base.items.some((existing) => existing.id === item.id)
          ? base.items
          : restorePlanItemOrder([...base.items, item]),
        pendingOperations: base.pendingOperations.filter(
          (op) => op.operationId !== operationId
        ),
      };
      persist(next);
      return true;
    },
    [cache, persist]
  );

  const restoreRemovedItem = useCallback(
    (item: PlanItem) => {
      queueAndSyncAdd(planItemToActivityOccurrence(item), false).catch(() =>
        setSyncStatus("offline")
      );
    },
    [queueAndSyncAdd]
  );

  const undoRemove = useCallback(() => {
    if (!undoItem) return;
    trackPlanEvent("plan_item_undo");
    if (
      !undoItem.removeOperationId ||
      !cancelPendingRemove(undoItem, undoItem.removeOperationId)
    ) {
      restoreRemovedItem(undoItem);
    }
    setUndoItem(null);
  }, [cancelPendingRemove, restoreRemovedItem, undoItem]);

  const updateNotes = useCallback(
    (id: string, notes: string) => {
      if (!cache) return;
      const operationId = crypto.randomUUID();
      const hasPendingAdd = cache.pendingOperations.some(
        (op) => op.type === "add_item" && op.payload.localItemId === id
      );
      const next: LocalPlanCache = {
        ...cache,
        items: cache.items.map((item) =>
          item.id === id ? { ...item, notes } : item
        ),
        pendingOperations: hasPendingAdd
          ? cache.pendingOperations.map((op) =>
              op.type === "add_item" && op.payload.localItemId === id
                ? { ...op, payload: { ...op.payload, userNote: notes } }
                : op
            )
          : [
              ...cache.pendingOperations.filter(
                (op) =>
                  !(
                    op.type === "update_note" &&
                    String(op.payload.itemId ?? "") === id
                  )
              ),
              {
                operationId,
                type: "update_note",
                payload: { itemId: id, notes },
                createdAt: new Date().toISOString(),
              },
            ],
      };

      persist(next);

      if (!cache.planId || hasPendingAdd) return;

      void (async () => {
        await ensureAnonymousSession();
        const ok = await syncUpdateItem(id, notes, operationId);
        if (ok) {
          resolvePendingOperation(operationId);
          setSyncStatus("synced");
        } else {
          setSyncStatus("offline");
        }
      })();
    },
    [cache, persist, resolvePendingOperation]
  );

  const updatePlanSettings = useCallback(
    (settings: PlanStaySettings) => {
      void (async () => {
        const base = cache ?? (await loadLocalPlanCache());
        const operationId = crypto.randomUUID();
        const normalized = {
          homeResortSlug: settings.homeResortSlug?.trim() || undefined,
          tripStartDate: settings.tripStartDate?.trim() || undefined,
          tripEndDate: settings.tripEndDate?.trim() || undefined,
        };
        const op: PendingPlanOperation = {
          operationId,
          type: "update_plan_settings",
          planId: base.planId ?? undefined,
          payload: normalized,
          createdAt: new Date().toISOString(),
        };
        const next: LocalPlanCache = {
          ...base,
          homeResortSlug: normalized.homeResortSlug ?? null,
          tripStartDate: normalized.tripStartDate ?? null,
          tripEndDate: normalized.tripEndDate ?? null,
          pendingOperations: [
            ...base.pendingOperations.filter((pending) => pending.type !== "update_plan_settings"),
            op,
          ],
        };

        persist(next);
        trackPlanEvent("plan_stay_settings_saved");

        if (!isSupabaseConfigured()) {
          setSyncStatus("offline");
          return;
        }

        let turnstileToken: string | undefined;
        if (!(await hasAuthSession())) {
          turnstileToken =
            (await executeTurnstile("plan_first_save")) ?? undefined;
        }
        const user = await ensureAnonymousSession(turnstileToken);
        if (!user) {
          setSyncStatus("offline");
          return;
        }

        const result = await syncUpdatePlanSettings(normalized, operationId);
        if (!result) {
          setSyncStatus("offline");
          return;
        }

        const latest = await loadLocalPlanCache();
        const synced: LocalPlanCache = {
          ...latest,
          planId: result.id,
          title: result.title,
          version: result.version,
          homeResortSlug: result.homeResortSlug ?? null,
          tripStartDate: result.tripStartDate ?? null,
          tripEndDate: result.tripEndDate ?? null,
          pendingOperations: latest.pendingOperations.filter(
            (pending) => pending.operationId !== operationId
          ),
        };
        persist(synced);
        setSyncStatus("synced");
      })();
    },
    [cache, persist]
  );

  const renamePlan = useCallback(
    (title: string) => {
      if (!cache) return;
      persist({ ...cache, title });
      void (async () => {
        if (!(await hasAuthSession())) return;
        await fetch("/api/plan", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            operationId: crypto.randomUUID(),
          }),
        });
      })();
    },
    [cache, persist]
  );

  const isInPlan = useCallback(
    (catalogId: string) =>
      items.some(
        (i) =>
          i.activityCatalogId === catalogId ||
          i.sourceOccurrenceId === catalogId
      ),
    [items]
  );

  const isActivitySaved = useCallback(
    (activity: ActivityOccurrence) => isActivityOccurrenceSaved(items, activity),
    [items]
  );

  const createShare = useCallback(async () => {
    try {
      const turnstileToken = await executeTurnstile("plan_share_create");
      const res = await fetch("/api/plan/share", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnstileToken }),
      });
      const data = await res.json();
      if (data.reused) {
        setHasExistingShare(true);
        trackPlanEvent("plan_share_created");
        return shareUrl;
      }
      if (data.fullUrl) {
        setShareUrl(data.fullUrl);
        setHasExistingShare(true);
        trackPlanEvent("plan_share_created");
        return data.fullUrl as string;
      }
    } catch {
      /* offline */
    }
    return null;
  }, [shareUrl]);

  const revokeShare = useCallback(async () => {
    await fetch("/api/plan/share", {
      method: "DELETE",
      credentials: "include",
    });
    setShareUrl(null);
    setHasExistingShare(false);
    trackPlanEvent("plan_share_revoked");
  }, []);

  const rotateShare = useCallback(async () => {
    const turnstileToken = await executeTurnstile("plan_share_rotate");
    const res = await fetch("/api/plan/share/rotate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turnstileToken }),
    });
    const data = await res.json();
    if (data.fullUrl) {
      setShareUrl(data.fullUrl);
      setHasExistingShare(true);
      trackPlanEvent("plan_share_rotated");
      return data.fullUrl as string;
    }
    return null;
  }, []);

  const deletePlan = useCallback(async () => {
    if (await hasAuthSession()) {
      await fetch("/api/plan", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationId: crypto.randomUUID() }),
      });
    }
    const empty = {
      planId: null,
      title: "My Rest Day Plan",
      version: 0,
      homeResortSlug: null,
      tripStartDate: null,
      tripEndDate: null,
      items: [],
      pendingOperations: [],
      updatedAt: new Date().toISOString(),
    };
    persist(empty);
    setShareUrl(null);
    setHasExistingShare(false);
    trackPlanEvent("plan_deleted");
  }, [persist]);

  const refreshFromServer = useCallback(async () => {
    if (!(await hasAuthSession())) return;
    const base = cache ?? (await loadLocalPlanCache());
    const server = await fetchServerPlan();
    if (!server) return;
    persist(
      mergeServerPlan(base, {
        plan: server.plan,
        items: server.items,
      })
    );
    setSyncStatus("synced");
  }, [cache, persist]);

  const value = useMemo(
    () => ({
      items,
      planTitle: cache?.title ?? "My Rest Day Plan",
      homeResortSlug: cache?.homeResortSlug ?? undefined,
      tripStartDate: cache?.tripStartDate ?? undefined,
      tripEndDate: cache?.tripEndDate ?? undefined,
      itemCount: items.length,
      syncStatus,
      previewOpen,
      lastSavedId,
      interestPromptDismissed,
      shareUrl,
      hasExistingShare,
      undoItem,
      addActivity,
      addActivities,
      removeItem,
      undoRemove,
      updateNotes,
      renamePlan,
      updatePlanSettings,
      isInPlan,
      isActivitySaved,
      openPreview: () => setPreviewOpen(true),
      closePreview: () => {
        setPreviewOpen(false);
        trackPlanEvent("plan_preview_closed");
      },
      dismissInterestPrompt: () => {
        setInterestPromptDismissed(true);
        sessionStorage.setItem("plan-interest-dismissed", "1");
      },
      createShare,
      revokeShare,
      rotateShare,
      deletePlan,
      refreshFromServer,
    }),
    [
      items,
      cache?.title,
      cache?.homeResortSlug,
      cache?.tripStartDate,
      cache?.tripEndDate,
      syncStatus,
      previewOpen,
      lastSavedId,
      interestPromptDismissed,
      shareUrl,
      hasExistingShare,
      undoItem,
      addActivity,
      addActivities,
      removeItem,
      undoRemove,
      updateNotes,
      renamePlan,
      updatePlanSettings,
      isInPlan,
      isActivitySaved,
      createShare,
      revokeShare,
      rotateShare,
      deletePlan,
      refreshFromServer,
    ]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}
