import { getCategoryMeta } from "@/lib/categories/meta";
import type { IconKey } from "@/components/icons/iconRegistry";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

export interface CategoryGroup {
  category: string;
  label: string;
  iconKey: IconKey;
  activities: ActivityOccurrence[];
}

export function groupByCategory(
  activities: ActivityOccurrence[]
): CategoryGroup[] {
  const groups = new Map<string, ActivityOccurrence[]>();

  for (const activity of activities) {
    const list = groups.get(activity.category) ?? [];
    list.push(activity);
    groups.set(activity.category, list);
  }

  return [...groups.entries()]
    .map(([category, items]) => {
      const meta = getCategoryMeta(category);
      return {
        category,
        label: meta.label,
        iconKey: meta.iconKey,
        activities: items,
      };
    })
    .sort((a, b) => b.activities.length - a.activities.length);
}

export function filterFreeActivities(
  activities: ActivityOccurrence[]
): ActivityOccurrence[] {
  return activities.filter((activity) => activity.price.state === "free");
}

export function getTopCategoryBadges(
  activities: ActivityOccurrence[],
  limit = 3
): string[] {
  const counts = new Map<string, number>();
  for (const activity of activities) {
    counts.set(activity.category, (counts.get(activity.category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => getCategoryMeta(category).label);
}
