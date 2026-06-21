import { getCategoryMeta } from "@/lib/categories/meta";
import type { PlanItem } from "@/lib/types/occurrence";

export interface PassportStamp {
  id: string;
  label: string;
  icon: string;
  count: number;
}

/** Collect unique category stamps from saved plan items. */
export function collectPassportStamps(items: PlanItem[]): PassportStamp[] {
  const counts = new Map<string, PassportStamp>();

  for (const item of items) {
    const category = item.category ?? "resort_activity";
    const meta = getCategoryMeta(category);
    const id = meta.stamp;
    const existing = counts.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(id, {
        id,
        label: meta.label,
        icon: meta.icon,
        count: 1,
      });
    }
  }

  return Array.from(counts.values()).sort((a, b) => a.label.localeCompare(b.label));
}
