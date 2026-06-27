import { getCategoryMeta } from "@/lib/categories/meta";
import type { IconKey } from "@/components/icons/iconRegistry";
import type { PlanItem } from "@/lib/types/occurrence";

export type PlanStoryTone = "start" | "story" | "flexible";

export interface PlanStoryHighlight {
  label: string;
  value: string;
  iconKey: IconKey;
}

export interface PlanStoryAction {
  label: string;
  href: string;
  reason: string;
  iconKey: IconKey;
}

export interface PlanStory {
  tone: PlanStoryTone;
  headline: string;
  body: string;
  highlights: PlanStoryHighlight[];
  nextActions: PlanStoryAction[];
  ariaLabel: string;
}

function sortedTimedItems(items: PlanItem[]): PlanItem[] {
  return items
    .filter((item) => item.startDateTime)
    .sort((a, b) => a.startDateTime!.localeCompare(b.startDateTime!));
}

function topByCount<T extends string>(
  items: T[]
): { key: T; count: number } | undefined {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))[0];
}

function resortNameFor(items: PlanItem[], slug: string): string {
  return items.find((item) => item.resortSlug === slug)?.resortName ?? slug;
}

function categoryLabel(category?: string): string {
  return getCategoryMeta(category ?? "other").label;
}

function categoryIcon(category?: string): IconKey {
  return getCategoryMeta(category ?? "other").iconKey;
}

function timedStopLabel(count: number): string {
  return `${count} timed ${count === 1 ? "stop" : "stops"}`;
}

function firstResort(items: PlanItem[]): PlanItem {
  return items[0];
}

function action(
  label: string,
  href: string,
  reason: string,
  iconKey: IconKey
): PlanStoryAction {
  return { label, href, reason, iconKey };
}

export function buildPlanStory(items: PlanItem[]): PlanStory {
  const timed = sortedTimedItems(items);
  const primary = timed[0] ?? items[0];
  const topResort = topByCount(items.map((item) => item.resortSlug));
  const homeResortSlug = topResort?.key ?? primary?.resortSlug ?? "";
  const homeResortName = homeResortSlug
    ? resortNameFor(items, homeResortSlug)
    : "your resort";

  if (items.length === 0) {
    return {
      tone: "flexible",
      headline: "Your daybook is ready",
      body: "Save one activity to start your resort day.",
      highlights: [],
      nextActions: [
        action("Explore activities", "/activities", "Start with current resort activities.", "explore_nav"),
      ],
      ariaLabel: "Your daybook is ready. Save one activity to start your resort day.",
    };
  }

  if (timed.length === 0) {
    const first = firstResort(items);
    const body = `Give ${first.title} a time and this flexible idea can become the anchor for ${first.resortName}.`;
    return {
      tone: "flexible",
      headline: "A flexible idea is waiting",
      body,
      highlights: [
        { label: "Flexible ideas", value: String(items.length), iconKey: "plan_nav" },
        { label: "Resort", value: first.resortName, iconKey: "nearby_resort" },
      ],
      nextActions: [
        action(
          "Find it on the calendar",
          `/calendar?resort=${first.resortSlug}`,
          "Pick the best day before you build around it.",
          "today_nav"
        ),
        action(
          "Add another option",
          `/activities?resort=${first.resortSlug}`,
          "Keep a backup close to the same resort.",
          "explore_nav"
        ),
      ],
      ariaLabel: `${body} ${items.length} flexible ideas saved.`,
    };
  }

  if (timed.length === 1) {
    const first = timed[0];
    const body = `${first.title} at ${first.resortName} is saved. Add something nearby or an evening activity so you know what comes next.`;
    return {
      tone: "start",
      headline: "Your daybook has its first anchor",
      body,
      highlights: [
        { label: "Anchor", value: first.title, iconKey: categoryIcon(first.category) },
        { label: "Resort", value: first.resortName, iconKey: "nearby_resort" },
      ],
      nextActions: [
        action(
          "Add a nearby idea",
          `/activities?resort=${first.resortSlug}`,
          "Stay nearby and keep choices simple.",
          "explore_nav"
        ),
        action(
          "Find tonight's follow-up",
          `/tonight?resort=${first.resortSlug}`,
          "Give the day a starlight ending.",
          "tonight_nav"
        ),
      ],
      ariaLabel: `${body} One timed stop saved.`,
    };
  }

  const first = timed[0];
  const second = timed[1];
  const last = timed[timed.length - 1];
  const primaryCategory = last.category ?? "other";
  const mood = categoryLabel(primaryCategory);
  const body = `Start with ${first.title} at ${first.resortName}, then ${second.title}, and finish with ${last.title} at ${last.resortName}.`;
  return {
    tone: "story",
    headline: "Your resort day is coming together",
    body,
    highlights: [
      { label: "Planned stops", value: timedStopLabel(timed.length), iconKey: "plan_nav" },
      { label: "Home base", value: homeResortName, iconKey: "nearby_resort" },
      { label: "Primary mood", value: mood, iconKey: categoryIcon(primaryCategory) },
    ],
    nextActions: [
      action(
        "Balance with a low-key break",
        `/activities?resort=${homeResortSlug}&category=poolside`,
        "A softer stop keeps the day from feeling packed.",
        "poolside"
      ),
      action(
        "Check calendar density",
        `/calendar?resort=${homeResortSlug}`,
        "See whether another day has a calmer pattern.",
        "today_nav"
      ),
    ],
    ariaLabel: `${body} ${timedStopLabel(timed.length)}. Primary resort ${homeResortName}. Primary mood ${mood}.`,
  };
}
