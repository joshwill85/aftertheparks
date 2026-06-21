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

interface PlanContextValue {
  items: PlanItem[];
  addActivity: (activity: ActivityOccurrence) => void;
  addActivities: (activities: ActivityOccurrence[]) => void;
  removeItem: (id: string) => void;
  reorderItems: (items: PlanItem[]) => void;
  updateNotes: (id: string, notes: string) => void;
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadPlanItems().then((loaded) => {
      setItems(loaded);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePlanItems(items);
  }, [items, hydrated]);

  const addActivity = useCallback((activity: ActivityOccurrence) => {
    const item = createPlanItem({
      activityCatalogId: activity.activityCatalogId,
      activitySlug: activity.activitySlug,
      title: activity.title,
      resortSlug: activity.resort.slug,
      resortName: activity.resort.name,
      category: activity.category,
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
  }, []);

  const addActivities = useCallback((activities: ActivityOccurrence[]) => {
    setItems((prev) => {
      const existing = new Set(prev.map((p) => p.activityCatalogId));
      const next = [...prev];
      let lastId: string | null = null;

      for (const activity of activities) {
        if (existing.has(activity.activityCatalogId)) continue;
        const item = createPlanItem({
          activityCatalogId: activity.activityCatalogId,
          activitySlug: activity.activitySlug,
          title: activity.title,
          resortSlug: activity.resort.slug,
          resortName: activity.resort.name,
          category: activity.category,
          startDateTime: activity.startDateTime,
          endDateTime: activity.endDateTime,
        });
        existing.add(item.activityCatalogId);
        next.push(item);
        lastId = item.id;
      }

      if (lastId) setLastSavedId(lastId);
      return next;
    });
  }, []);

  const updateNotes = useCallback((id: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    );
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
      /* offline — plan still saved locally */
    }
    return null;
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      addActivity,
      addActivities,
      removeItem,
      reorderItems,
      updateNotes,
      isInPlan,
      shareUrl,
      createShare,
      lastSavedId,
    }),
    [
      items,
      addActivity,
      addActivities,
      removeItem,
      reorderItems,
      updateNotes,
      isInPlan,
      shareUrl,
      createShare,
      lastSavedId,
    ]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}
