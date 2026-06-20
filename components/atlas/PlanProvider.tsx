"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ActivityOccurrence, PlanItem } from "@/lib/types/occurrence";
import {
  createPlanItem,
  loadPlanItems,
  savePlanItems,
} from "@/lib/plan/store";
import { SaveStamp } from "@/components/magic/SaveStamp";
import { EmberBurst } from "@/components/magic/EmberBurst";

interface PlanContextValue {
  items: PlanItem[];
  addActivity: (activity: ActivityOccurrence) => void;
  removeItem: (id: string) => void;
  reorderItems: (items: PlanItem[]) => void;
  isInPlan: (catalogId: string) => boolean;
  shareUrl: string | null;
  createShare: () => Promise<string | null>;
  lastSavedId: string | null;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [showEmber, setShowEmber] = useState(false);

  useEffect(() => {
    loadPlanItems().then(setItems);
  }, []);

  useEffect(() => {
    if (items.length > 0) savePlanItems(items);
  }, [items]);

  const addActivity = useCallback((activity: ActivityOccurrence) => {
    const item = createPlanItem({
      activityCatalogId: activity.activityCatalogId,
      activitySlug: activity.activitySlug,
      title: activity.title,
      resortSlug: activity.resort.slug,
      resortName: activity.resort.name,
      startDateTime: activity.startDateTime,
      endDateTime: activity.endDateTime,
    });
    setItems((prev) => {
      if (prev.some((p) => p.activityCatalogId === item.activityCatalogId)) {
        return prev;
      }
      return [...prev, item];
    });
    setLastSavedId(item.id);
    setShowEmber(true);
    if (navigator.vibrate) navigator.vibrate(10);
    setTimeout(() => setShowEmber(false), 600);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const reorderItems = useCallback((next: PlanItem[]) => {
    setItems(next);
  }, []);

  const isInPlan = useCallback(
    (catalogId: string) => items.some((i) => i.activityCatalogId === catalogId),
    [items]
  );

  const createShare = useCallback(async () => {
    try {
      const res = await fetch("/api/plan/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.shareSlug) {
        const url = `${window.location.origin}/plan/${data.shareSlug}`;
        setShareUrl(url);
        return url;
      }
    } catch {
      /* offline fallback */
    }
    return null;
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      addActivity,
      removeItem,
      reorderItems,
      isInPlan,
      shareUrl,
      createShare,
      lastSavedId,
    }),
    [
      items,
      addActivity,
      removeItem,
      reorderItems,
      isInPlan,
      shareUrl,
      createShare,
      lastSavedId,
    ]
  );

  return (
    <PlanContext.Provider value={value}>
      {children}
      <EmberBurst active={showEmber} />
      {lastSavedId && <SaveStamp itemId={lastSavedId} />}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}
