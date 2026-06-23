import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { parseISO } from "date-fns";
import {
  addOrlandoDays,
  hourInOrlando,
  orlandoDateString,
  TIMEZONE,
} from "@/lib/daypart";
import type { PlanItem } from "@/lib/types/occurrence";

export type PlanSectionKey =
  | "morning"
  | "afternoon"
  | "dinner"
  | "evening"
  | "starlight"
  | "unscheduled";

export const PLAN_SECTION_ORDER: PlanSectionKey[] = [
  "morning",
  "afternoon",
  "dinner",
  "evening",
  "starlight",
  "unscheduled",
];

export const PLAN_SECTION_META: Record<
  PlanSectionKey,
  { title: string; icon: string }
> = {
  morning: { title: "Morning", icon: "☀️" },
  afternoon: { title: "Afternoon", icon: "🌴" },
  dinner: { title: "Dinner hour", icon: "🍽️" },
  evening: { title: "Evening", icon: "🏮" },
  starlight: { title: "Starlight", icon: "🌙" },
  unscheduled: { title: "Unscheduled", icon: "📋" },
};

export function planSectionFromHour(hour: number): PlanSectionKey {
  if (hour < 11) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 19) return "dinner";
  if (hour < 21) return "evening";
  return "starlight";
}

export function planDateKey(item: PlanItem): string {
  if (!item.startDateTime) return "unscheduled";
  return formatInTimeZone(parseISO(item.startDateTime), TIMEZONE, "yyyy-MM-dd");
}

export function planDateLabel(dateKey: string): string {
  if (dateKey === "unscheduled") return "No date set";

  const today = orlandoDateString();
  const tomorrow = addOrlandoDays(today, 1);
  if (dateKey === today) return "Today";
  if (dateKey === tomorrow) return "Tomorrow";

  return formatInTimeZone(
    fromZonedTime(`${dateKey}T12:00:00`, TIMEZONE),
    TIMEZONE,
    "EEEE, MMM d"
  );
}

export function itemPlanSection(item: PlanItem): PlanSectionKey {
  if (!item.startDateTime) return "unscheduled";
  const hour = hourInOrlando(parseISO(item.startDateTime));
  return planSectionFromHour(hour);
}

export function groupPlanByDate(
  items: PlanItem[]
): { dateKey: string; label: string; sections: Map<PlanSectionKey, PlanItem[]> }[] {
  const byDate = new Map<string, PlanItem[]>();

  for (const item of items) {
    const key = planDateKey(item);
    const list = byDate.get(key) ?? [];
    list.push(item);
    byDate.set(key, list);
  }

  const sortedKeys = [...byDate.keys()].sort((a, b) => {
    if (a === "unscheduled") return 1;
    if (b === "unscheduled") return -1;
    return a.localeCompare(b);
  });

  return sortedKeys.map((dateKey) => {
    const dateItems = byDate.get(dateKey) ?? [];
    const sections = new Map<PlanSectionKey, PlanItem[]>(
      PLAN_SECTION_ORDER.map((key) => [key, []])
    );

    for (const item of dateItems) {
      sections.get(itemPlanSection(item))!.push(item);
    }

    return {
      dateKey,
      label: planDateLabel(dateKey),
      sections,
    };
  });
}
