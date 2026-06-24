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
import {
  broadcastPlanUpdate,
  createPlanItem,
  loadLocalPlanCache,
  saveLocalPlanCache,
  subscribePlanUpdates,
  type LocalPlanCache,
  type PendingPlanOperation,
} from "@/lib/plan/store";
import { planItemDedupeKey } from "@/lib/plan/snapshot";
import { activityToPlanSnapshot } from "@/lib/plan/snapshot";
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
} from "@/lib/plan/sync-client";
import { migrateLocalItemsToServer } from "@/lib/plan/migrate";
import { trackPlanEvent } from "@/lib/plan/analytics";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { executeTurnstile } from "@/lib/turnstile/browser";

interface PlanContextValue {
  items: PlanItem[];
  planTitle: string;
  itemCount: number;
  syncStatus: PlanSyncStatus;
  previewOpen: boolean;
  lastSavedId: string | null;
  interestPromptDismissed: boolean;
  shareUrl: string | null;
  undoItem: PlanItem | null;
  addActivity: (activity: ActivityOccurrence) => void;
  addActivities: (activities: ActivityOccurrence[]) => void;
  removeItem: (id: string) => void;
  undoRemove: () => void;
  reorderItems: (items: PlanItem[]) => void;
  updateNotes: (id: string, notes: string) => void;
  renamePlan: (title: string) => void;
  isInPlan: (catalogId: string) => boolean;
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

export function PlanProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<LocalPlanCache | null>(null);
  const [syncStatus, setSyncStatus] = useState<PlanSyncStatus>("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [undoItem, setUndoItem] = useState<PlanItem | null>(null);
  const [interestPromptDismissed, setInterestPromptDismissed] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);

  const persist = useCallback((next: LocalPlanCache) => {
    setCache(next);
    void saveLocalPlanCache(next);
    broadcastPlanUpdate(next);
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
      syncingRef.current = false;
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
        payload: buildAddItemPayload(activity, operationId) as unknown as Record<
          string,
          unknown
        >,
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

      const payload = buildAddItemPayload(activity, operationId, turnstileToken);
      const result = await syncAddItem(payload);

      if (result) {
        let synced: LocalPlanCache = {
          ...next,
          planId: result.plan.id,
          title: result.plan.title,
          version: result.plan.version,
          items: next.items.map((i) =>
            i.id === optimistic.id ? result.item : i
          ),
          pendingOperations: next.pendingOperations.filter(
            (p) => p.operationId !== operationId
          ),
        };

        if (isFirstServerSave && synced.items.length > 1) {
          synced = await migrateLocalItemsToServer(synced);
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
      void queueAndSyncAdd(activity, true);
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
      setUndoItem(removed);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setUndoItem(null), UNDO_MS);

      if (!base.planId) return;

      void (async () => {
        await ensureAnonymousSession();
        const ok = await syncRemoveItem(id, operationId);
        if (ok) {
          persist({
            ...next,
            pendingOperations: next.pendingOperations.filter(
              (p) => p.operationId !== operationId
            ),
          });
          setSyncStatus("synced");
        } else {
          setSyncStatus("offline");
        }
      })();
    },
    [cache, persist]
  );

  const undoRemove = useCallback(() => {
    if (!undoItem) return;
    trackPlanEvent("plan_item_undo");
    void queueAndSyncAdd(
      {
        id: undoItem.sourceOccurrenceId ?? undoItem.id,
        activityCatalogId: undoItem.activityCatalogId,
        activitySlug: undoItem.activitySlug,
        title: undoItem.title,
        resort: {
          slug: undoItem.resortSlug,
          name: undoItem.resortName,
          tier: "",
          area: "",
        },
        summary: "",
        category: undoItem.category ?? "",
        section: "",
        daypart: "anytime",
        price: { state: "unknown" },
        location: { label: undoItem.location ?? "" },
        eligibility: { ages: [] },
        freshness: {
          lastVerified: undoItem.sourceVerifiedAt ?? new Date().toISOString(),
          sourceUrl: undoItem.sourceUrl ?? "",
          badge: "verified",
        },
        status: "active",
        startDateTime: undoItem.startDateTime,
        endDateTime: undoItem.endDateTime,
      } as ActivityOccurrence,
      false
    );
    setUndoItem(null);
  }, [undoItem, queueAndSyncAdd]);

  const updateNotes = useCallback(
    (id: string, notes: string) => {
      if (!cache) return;
      persist({
        ...cache,
        items: cache.items.map((item) =>
          item.id === id ? { ...item, notes } : item
        ),
      });
    },
    [cache, persist]
  );

  const reorderItems = useCallback(
    (nextItems: PlanItem[]) => {
      if (!cache) return;
      persist({ ...cache, items: nextItems });
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
      if (data.reused && shareUrl) {
        trackPlanEvent("plan_share_created");
        return shareUrl;
      }
      if (data.fullUrl) {
        setShareUrl(data.fullUrl);
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
      items: [],
      pendingOperations: [],
      updatedAt: new Date().toISOString(),
    };
    persist(empty);
    setShareUrl(null);
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
      itemCount: items.length,
      syncStatus,
      previewOpen,
      lastSavedId,
      interestPromptDismissed,
      shareUrl,
      undoItem,
      addActivity,
      addActivities,
      removeItem,
      undoRemove,
      reorderItems,
      updateNotes,
      renamePlan,
      isInPlan,
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
      syncStatus,
      previewOpen,
      lastSavedId,
      interestPromptDismissed,
      shareUrl,
      undoItem,
      addActivity,
      addActivities,
      removeItem,
      undoRemove,
      reorderItems,
      updateNotes,
      renamePlan,
      isInPlan,
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
