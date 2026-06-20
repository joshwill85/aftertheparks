import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PlanItem } from "@/lib/types/occurrence";

interface PlanDB extends DBSchema {
  plan: {
    key: string;
    value: PlanItem[] | PlanItem;
  };
}

const DB_NAME = "aftertheparks-plan";
const STORE = "plan";
const PLAN_KEY = "current";

let dbPromise: Promise<IDBPDatabase<PlanDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PlanDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

export async function loadPlanItems(): Promise<PlanItem[]> {
  if (typeof window === "undefined") return [];
  const db = await getDb();
  const items = await db.get(STORE, PLAN_KEY);
  if (Array.isArray(items)) return items;
  return [];
}

export async function savePlanItems(items: PlanItem[]): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await getDb();
  await db.put(STORE, items as PlanDB["plan"]["value"], PLAN_KEY);
}

export async function clearPlan(): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await getDb();
  await db.put(STORE, [] as PlanDB["plan"]["value"], PLAN_KEY);
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
