import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PlanItem } from "@/lib/types/occurrence";

export type PlanOperationType =
  | "add_item"
  | "remove_item"
  | "rename_plan"
  | "reorder_items";

export interface PendingPlanOperation {
  operationId: string;
  type: PlanOperationType;
  planId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface LocalPlanCache {
  planId: string | null;
  title: string;
  version: number;
  items: PlanItem[];
  pendingOperations: PendingPlanOperation[];
  updatedAt: string;
}

interface PlanDB extends DBSchema {
  plan: {
    key: string;
    value: LocalPlanCache | PlanItem[] | PlanItem;
  };
}

const DB_NAME = "aftertheparks-plan";
const STORE = "plan";
const CACHE_KEY = "cache";
const LEGACY_KEY = "current";

let dbPromise: Promise<IDBPDatabase<PlanDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PlanDB>(DB_NAME, 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
        if (oldVersion < 2) {
          /* legacy data migrated on read */
        }
      },
    });
  }
  return dbPromise;
}

const EMPTY_CACHE: LocalPlanCache = {
  planId: null,
  title: "My Rest Day Plan",
  version: 0,
  items: [],
  pendingOperations: [],
  updatedAt: new Date().toISOString(),
};

export async function loadLocalPlanCache(): Promise<LocalPlanCache> {
  if (typeof window === "undefined") return { ...EMPTY_CACHE };
  const db = await getDb();
  const cached = await db.get(STORE, CACHE_KEY);
  if (cached && !Array.isArray(cached) && "items" in cached) {
    return cached as LocalPlanCache;
  }

  const legacy = await db.get(STORE, LEGACY_KEY);
  if (Array.isArray(legacy)) {
    const migrated: LocalPlanCache = {
      ...EMPTY_CACHE,
      items: legacy,
      updatedAt: new Date().toISOString(),
    };
    await db.put(STORE, migrated, CACHE_KEY);
    return migrated;
  }

  return { ...EMPTY_CACHE };
}

export async function saveLocalPlanCache(cache: LocalPlanCache): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await getDb();
  await db.put(STORE, { ...cache, updatedAt: new Date().toISOString() }, CACHE_KEY);
}

export async function clearLocalPlanCache(): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await getDb();
  await db.put(STORE, { ...EMPTY_CACHE }, CACHE_KEY);
}

export function createPlanItem(
  partial: Omit<PlanItem, "id" | "addedAt">
): PlanItem {
  return {
    ...partial,
    id: crypto.randomUUID(),
    addedAt: new Date().toISOString(),
  };
}

/** @deprecated use loadLocalPlanCache */
export async function loadPlanItems(): Promise<PlanItem[]> {
  const cache = await loadLocalPlanCache();
  return cache.items;
}

/** @deprecated use saveLocalPlanCache */
export async function savePlanItems(items: PlanItem[]): Promise<void> {
  const cache = await loadLocalPlanCache();
  await saveLocalPlanCache({ ...cache, items });
}

/** @deprecated use clearLocalPlanCache */
export async function clearPlan(): Promise<void> {
  await clearLocalPlanCache();
}

const CHANNEL_NAME = "aftertheparks-plan-sync";

export function broadcastPlanUpdate(cache: LocalPlanCache) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({ type: "plan-updated", cache });
  channel.close();
}

export function subscribePlanUpdates(
  handler: (cache: LocalPlanCache) => void
): () => void {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return () => {};
  }
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    if (event.data?.type === "plan-updated" && event.data.cache) {
      handler(event.data.cache as LocalPlanCache);
    }
  };
  return () => channel.close();
}
