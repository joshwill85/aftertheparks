import { getCategoryMeta } from "@/lib/categories/meta";
import type { IconKey } from "@/components/icons/iconRegistry";
import type { ActivityOccurrence, Daypart } from "@/lib/types/occurrence";

export const RESORT_CONSTELLATION_DAYPARTS: Array<{
  key: Daypart;
  label: string;
  shortLabel: string;
}> = [
  { key: "morning", label: "Morning", shortLabel: "AM" },
  { key: "afternoon", label: "Afternoon", shortLabel: "PM" },
  { key: "evening", label: "Evening", shortLabel: "EVE" },
  { key: "late", label: "Starlight", shortLabel: "STAR" },
  { key: "anytime", label: "All Day", shortLabel: "ALL" },
];

export type ResortConstellationNodeSize = "small" | "medium" | "large";

export interface ResortConstellationNode {
  category: string;
  label: string;
  iconKey: IconKey;
  count: number;
  size: ResortConstellationNodeSize;
  angle: number;
}

export interface ResortConstellationOrbit {
  key: Daypart;
  label: string;
  shortLabel: string;
  count: number;
  intensity: number;
  nodes: ResortConstellationNode[];
}

export interface ResortActivityConstellation {
  total: number;
  orbits: ResortConstellationOrbit[];
  topCategory?: Pick<ResortConstellationNode, "category" | "label" | "count">;
  strongestDaypart?: Pick<ResortConstellationOrbit, "key" | "label" | "count">;
  costMix: { free: number; paid: number; unknown: number };
  summary: string;
  ariaLabel: string;
}

function emptyCostMix(): ResortActivityConstellation["costMix"] {
  return { free: 0, paid: 0, unknown: 0 };
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function constellationCategoryLabel(category: string): string {
  return category === "other" ? "Resort fun" : getCategoryMeta(category).label;
}

function constellationCategoryIcon(category: string): IconKey {
  return getCategoryMeta(category).iconKey;
}

function nodeSize(count: number, topCount: number): ResortConstellationNodeSize {
  if (topCount <= 1) return "medium";
  if (count === topCount) return "large";
  if (count >= Math.ceil(topCount / 2)) return "medium";
  return "small";
}

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function avoidOrbitLabelLane(angle: number, nodeIndex: number): number {
  const normalized = normalizeAngle(angle);
  if (normalized <= 235 || normalized >= 305) return angle;
  return nodeIndex % 2 === 0 ? 325 : 215;
}

function buildAriaLabel({
  total,
  orbits,
  costMix,
}: Pick<ResortActivityConstellation, "total" | "orbits" | "costMix">): string {
  if (total === 0) return "No current calendar activities to show yet.";

  const orbitText = orbits
    .filter((orbit) => orbit.count > 0)
    .map((orbit) => {
      const nodes = orbit.nodes
        .map((node) => `${node.label} ${node.count}`)
        .join(", ");
      return `${orbit.label} has ${pluralize(
        orbit.count,
        "activity",
        "activities"
      )}: ${nodes}`;
    })
    .join(". ");

  return `Resort activity constellation: ${pluralize(
    total,
    "activity",
    "activities"
  )}. ${orbitText}. Cost mix: ${costMix.free} free, ${costMix.paid} paid.`;
}

export function buildResortActivityConstellation(
  activities: ActivityOccurrence[]
): ResortActivityConstellation {
  const costMix = emptyCostMix();
  const daypartBuckets = new Map<Daypart, ActivityOccurrence[]>();
  const globalCategoryCounts = new Map<
    string,
    { category: string; label: string; count: number }
  >();

  for (const activity of activities) {
    const key = activity.daypart;
    daypartBuckets.set(key, [...(daypartBuckets.get(key) ?? []), activity]);

    const category = globalCategoryCounts.get(activity.category) ?? {
      category: activity.category,
      label: constellationCategoryLabel(activity.category),
      count: 0,
    };
    category.count += 1;
    globalCategoryCounts.set(activity.category, category);

    if (activity.price.state === "free") costMix.free += 1;
    else if (activity.price.state === "fee") costMix.paid += 1;
    else costMix.unknown += 1;
  }

  const maxDaypartCount = Math.max(
    1,
    ...RESORT_CONSTELLATION_DAYPARTS.map(
      (daypart) => daypartBuckets.get(daypart.key)?.length ?? 0
    )
  );
  const maxCategoryCount = Math.max(
    1,
    ...Array.from(globalCategoryCounts.values()).map((category) => category.count)
  );

  const orbits = RESORT_CONSTELLATION_DAYPARTS.map((daypart, orbitIndex) => {
    const items = daypartBuckets.get(daypart.key) ?? [];
    const categoryCounts = new Map<
      string,
      { category: string; label: string; iconKey: IconKey; count: number }
    >();

    for (const item of items) {
      const category = categoryCounts.get(item.category) ?? {
        category: item.category,
        label: constellationCategoryLabel(item.category),
        iconKey: constellationCategoryIcon(item.category),
        count: 0,
      };
      category.count += 1;
      categoryCounts.set(item.category, category);
    }

    const nodes = Array.from(categoryCounts.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .map((node, nodeIndex, allNodes) => {
        const angle =
          32 +
          orbitIndex * 42 +
          (allNodes.length > 1 ? (nodeIndex * 240) / allNodes.length : 0);

        return {
          ...node,
          size: nodeSize(node.count, maxCategoryCount),
          angle: avoidOrbitLabelLane(angle, nodeIndex),
        };
      });

    const count = items.length;
    return {
      ...daypart,
      count,
      intensity: Number((count / maxDaypartCount).toFixed(2)),
      nodes,
    };
  });

  const topCategory = Array.from(globalCategoryCounts.values()).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  )[0];
  const strongestDaypart = orbits
    .filter((orbit) => orbit.count > 0)
    .sort((a, b) => b.count - a.count)[0];

  const total = activities.length;
  const summary =
    total === 0
      ? "No current calendar activities to show yet."
      : `${pluralize(total, "resort activity", "resort activities")}, led by ${
          strongestDaypart?.label ?? "this resort"
        } and ${topCategory?.label ?? "resort fun"}.`;

  return {
    total,
    orbits,
    topCategory,
    strongestDaypart,
    costMix,
    summary,
    ariaLabel: buildAriaLabel({ total, orbits, costMix }),
  };
}
