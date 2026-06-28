import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { parseISO } from "date-fns";
import {
  addOrlandoDays,
  hourInOrlando,
  orlandoDateString,
  TIMEZONE,
} from "@/lib/daypart";
import type { IconKey } from "@/components/icons/iconRegistry";
import type { PlanItem } from "@/lib/types/occurrence";
import type { PlanStaySettings } from "@/lib/plan/types";

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
  { title: string; iconKey: IconKey }
> = {
  morning: { title: "Morning Reset", iconKey: "today_nav" },
  afternoon: { title: "Afternoon Adventure", iconKey: "resort_activity" },
  dinner: { title: "Dinner Glow", iconKey: "search_offering" },
  evening: { title: "Golden Hour", iconKey: "nighttime_entertainment" },
  starlight: { title: "Starlight", iconKey: "tonight_nav" },
  unscheduled: { title: "Folded Notes", iconKey: "plan_nav" },
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

    for (const sectionItems of sections.values()) {
      sectionItems.sort((a, b) => {
        if (!a.startDateTime && !b.startDateTime) return a.title.localeCompare(b.title);
        if (!a.startDateTime) return 1;
        if (!b.startDateTime) return -1;
        return a.startDateTime.localeCompare(b.startDateTime) || a.title.localeCompare(b.title);
      });
    }

    return {
      dateKey,
      label: planDateLabel(dateKey),
      sections,
    };
  });
}

export interface PlanStayShellDay {
  dateKey: string;
  label: string;
  items: PlanItem[];
  sections: Map<PlanSectionKey, PlanItem[]>;
}

export interface PlanStayShell {
  enabled: boolean;
  stayDays: PlanStayShellDay[];
  outsideStayItems: PlanItem[];
  flexibleItems: PlanItem[];
  findHomeResortHref?: string;
  findNearbyHref?: string;
}

function isDateOnly(value?: string): value is string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "");
}

function sectionMapForItems(items: PlanItem[]): Map<PlanSectionKey, PlanItem[]> {
  const sections = new Map<PlanSectionKey, PlanItem[]>(
    PLAN_SECTION_ORDER.map((key) => [key, []])
  );

  for (const item of items) {
    sections.get(itemPlanSection(item))!.push(item);
  }

  for (const sectionItems of sections.values()) {
    sectionItems.sort((a, b) => {
      if (!a.startDateTime && !b.startDateTime) return a.title.localeCompare(b.title);
      if (!a.startDateTime) return 1;
      if (!b.startDateTime) return -1;
      return a.startDateTime.localeCompare(b.startDateTime) || a.title.localeCompare(b.title);
    });
  }

  return sections;
}

function stayDateKeys(startDate: string, endDate: string): string[] {
  const keys: string[] = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    keys.push(cursor);
    cursor = addOrlandoDays(cursor, 1);
  }
  return keys;
}

export function buildPlanStayShell(
  items: PlanItem[],
  settings: PlanStaySettings
): PlanStayShell {
  const { homeResortSlug, tripStartDate, tripEndDate } = settings;
  const hasValidRange =
    isDateOnly(tripStartDate) &&
    isDateOnly(tripEndDate) &&
    tripStartDate <= tripEndDate;

  if (!hasValidRange) {
    return {
      enabled: false,
      stayDays: [],
      outsideStayItems: [],
      flexibleItems: items.filter((item) => !item.startDateTime),
    };
  }

  const flexibleItems = items.filter((item) => !item.startDateTime);
  const timedItems = items.filter((item) => item.startDateTime);
  const byDate = new Map<string, PlanItem[]>();
  const outsideStayItems: PlanItem[] = [];

  for (const item of timedItems) {
    const key = planDateKey(item);
    if (key >= tripStartDate && key <= tripEndDate) {
      byDate.set(key, [...(byDate.get(key) ?? []), item]);
    } else {
      outsideStayItems.push(item);
    }
  }

  outsideStayItems.sort((a, b) =>
    (a.startDateTime ?? "").localeCompare(b.startDateTime ?? "") ||
    a.title.localeCompare(b.title)
  );

  const stayDays = stayDateKeys(tripStartDate, tripEndDate).map((dateKey) => {
    const dayItems = [...(byDate.get(dateKey) ?? [])].sort((a, b) =>
      (a.startDateTime ?? "").localeCompare(b.startDateTime ?? "") ||
      a.title.localeCompare(b.title)
    );
    return {
      dateKey,
      label: planDateLabel(dateKey),
      items: dayItems,
      sections: sectionMapForItems(dayItems),
    };
  });

  return {
    enabled: true,
    stayDays,
    outsideStayItems,
    flexibleItems,
    findHomeResortHref: homeResortSlug ? `/activities?resort=${homeResortSlug}` : undefined,
    findNearbyHref: homeResortSlug
      ? `/activities?near=my-resort&resort=${homeResortSlug}`
      : undefined,
  };
}
