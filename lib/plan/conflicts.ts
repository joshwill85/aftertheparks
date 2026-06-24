import { parseISO } from "date-fns";
import type { PlanItem } from "@/lib/types/occurrence";

export interface PlanConflict {
  a: PlanItem;
  b: PlanItem;
  message: string;
}

function itemWindow(item: PlanItem): { start: number; end: number } | null {
  if (!item.startDateTime) return null;
  const start = parseISO(item.startDateTime).getTime();
  const end = item.endDateTime
    ? parseISO(item.endDateTime).getTime()
    : start + 60 * 60 * 1000;
  return { start, end };
}

/** Overlapping scheduled items on the same calendar day. */
export function findPlanConflicts(items: PlanItem[]): PlanConflict[] {
  const conflicts: PlanConflict[] = [];
  const scheduled = items.filter((item) => item.startDateTime);

  for (let i = 0; i < scheduled.length; i++) {
    for (let j = i + 1; j < scheduled.length; j++) {
      const a = scheduled[i];
      const b = scheduled[j];
      const windowA = itemWindow(a);
      const windowB = itemWindow(b);
      if (!windowA || !windowB) continue;

      const overlaps =
        windowA.start < windowB.end && windowB.start < windowA.end;
      if (!overlaps) continue;

      const overlapMins = Math.round(
        (Math.min(windowA.end, windowB.end) - Math.max(windowA.start, windowB.start)) /
          60000
      );

      conflicts.push({
        a,
        b,
        message: `Two good options at the same time — these overlap by ${overlapMins} minutes. Keep both and decide later.`,
      });
    }
  }

  return conflicts;
}
