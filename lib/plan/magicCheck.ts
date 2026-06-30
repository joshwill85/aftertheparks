import { parseISO } from "date-fns";
import type { PlanItem } from "@/lib/types/occurrence";

export type MagicCheckLabel =
  | "Easy plan"
  | "Doable with checks"
  | "Too tight"
  | "Needs backup";

export type MagicCheckActionLabel =
  | "Find backup"
  | "Swap this"
  | "Remove one"
  | "Add travel buffer";

export interface MagicCheckIssue {
  label:
    | "Two activities overlap"
    | "This resort hop may be tight"
    | "Outdoor activity may need a backup"
    | "Access may be limited"
    | "Reservation required"
    | "Cost unclear"
    | "Time uncertain";
  detail: string;
  actionLabel: MagicCheckActionLabel;
  severity: "risk" | "warning";
  itemIds: string[];
}

export interface MagicCheckResult {
  label: MagicCheckLabel;
  summary: string;
  issues: MagicCheckIssue[];
  ariaLabel: string;
}

interface ScheduledItem {
  item: PlanItem;
  start: number;
  end?: number;
  dateKey: string;
}

const OUTDOOR_CATEGORIES = new Set([
  "campfire",
  "movies_under_stars",
  "poolside",
  "nighttime_entertainment",
  "nature",
  "sports_rec",
]);

function timestamp(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dateKey(value?: string): string {
  return value?.slice(0, 10) ?? "unscheduled";
}

function scheduledItem(item: PlanItem): ScheduledItem | null {
  const start = timestamp(item.startDateTime);
  if (!start) return null;
  const end = timestamp(item.endDateTime);
  return {
    item,
    start,
    end: end && end > start ? end : undefined,
    dateKey: dateKey(item.startDateTime),
  };
}

function issue(issue: MagicCheckIssue): MagicCheckIssue {
  return issue;
}

function truthySnapshotValue(item: PlanItem, keys: string[]): boolean {
  return keys.some((key) => item.snapshotJson?.[key] === true);
}

function textSnapshotValue(item: PlanItem, keys: string[]): string {
  return keys
    .map((key) => item.snapshotJson?.[key])
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function isWeatherSensitive(item: PlanItem): boolean {
  return (
    truthySnapshotValue(item, ["weatherSensitive", "outdoor", "weatherRisk"]) ||
    OUTDOOR_CATEGORIES.has(item.category ?? "")
  );
}

function accessMayBeLimited(item: PlanItem): boolean {
  const access = textSnapshotValue(item, ["access", "eligibility", "accessLabel"]);
  return (
    truthySnapshotValue(item, ["resortGuestOnly", "accessLimited"]) ||
    /guest|limited|eligib|pool/i.test(access) ||
    item.category === "poolside"
  );
}

function reservationRequired(item: PlanItem): boolean {
  return truthySnapshotValue(item, ["reservationRequired", "bookingRequired"]);
}

function costUnclear(item: PlanItem): boolean {
  const label = item.priceLabel?.trim() ?? "";
  return !label || /unknown|unclear|not listed|confirm/i.test(label);
}

function dedupeIssues(issues: MagicCheckIssue[]): MagicCheckIssue[] {
  const seen = new Set<string>();
  const result: MagicCheckIssue[] = [];
  for (const current of issues) {
    const key = `${current.label}:${current.itemIds.join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(current);
  }
  return result;
}

function labelFor(issues: MagicCheckIssue[]): MagicCheckLabel {
  if (issues.some((current) => current.label === "Two activities overlap")) {
    return "Too tight";
  }
  if (
    issues.some(
      (current) =>
        current.label === "Outdoor activity may need a backup" &&
        current.severity === "risk"
    )
  ) {
    return "Needs backup";
  }
  if (issues.length > 0) return "Doable with checks";
  return "Easy plan";
}

function summaryFor(label: MagicCheckLabel, issues: MagicCheckIssue[]): string {
  if (label === "Easy plan") {
    return "No overlaps, tight resort hops, or major planning warnings found.";
  }
  if (label === "Too tight") {
    return "At least two saved activities overlap or leave too little room.";
  }
  if (label === "Needs backup") {
    return "This plan has an outdoor or weather-sensitive stop worth backing up.";
  }
  return `${issues.length} ${issues.length === 1 ? "check" : "checks"} to confirm before you go.`;
}

export function buildMagicCheck(items: PlanItem[]): MagicCheckResult {
  const issues: MagicCheckIssue[] = [];
  const scheduled = items
    .map(scheduledItem)
    .filter((item): item is ScheduledItem => Boolean(item))
    .sort((a, b) => a.start - b.start || a.item.title.localeCompare(b.item.title));

  for (let index = 0; index < scheduled.length; index++) {
    const current = scheduled[index];
    if (!current.end) {
      issues.push(
        issue({
          label: "Time uncertain",
          detail: "This saved idea has a start time but no confirmed end time.",
          actionLabel: "Add travel buffer",
          severity: "warning",
          itemIds: [current.item.id],
        })
      );
    }

    for (let nextIndex = index + 1; nextIndex < scheduled.length; nextIndex++) {
      const next = scheduled[nextIndex];
      if (current.dateKey !== next.dateKey) continue;
      if (!current.end || !next.end) continue;
      if (current.start < next.end && next.start < current.end) {
        issues.push(
          issue({
            label: "Two activities overlap",
            detail: "Two saved activities share the same time window. Choose one or keep both as alternates.",
            actionLabel: "Remove one",
            severity: "risk",
            itemIds: [current.item.id, next.item.id],
          })
        );
      }
    }
  }

  for (let index = 1; index < scheduled.length; index++) {
    const previous = scheduled[index - 1];
    const current = scheduled[index];
    if (previous.dateKey !== current.dateKey) continue;
    if (!previous.end) continue;
    if (previous.item.resortSlug === current.item.resortSlug) continue;
    if (current.start - previous.end <= 45 * 60_000) {
      issues.push(
        issue({
          label: "This resort hop may be tight",
          detail: `Confirm transportation before moving from ${previous.item.resortName} to ${current.item.resortName}. Build in a buffer instead of assuming a fixed travel time.`,
          actionLabel: "Add travel buffer",
          severity: "warning",
          itemIds: [previous.item.id, current.item.id],
        })
      );
    }
  }

  for (const item of items) {
    if (isWeatherSensitive(item)) {
      issues.push(
        issue({
          label: "Outdoor activity may need a backup",
          detail: "Outdoor or weather-sensitive activities can change day-of. Keep an indoor or covered option nearby.",
          actionLabel: "Find backup",
          severity: "risk",
          itemIds: [item.id],
        })
      );
    }
    if (accessMayBeLimited(item)) {
      issues.push(
        issue({
          label: "Access may be limited",
          detail: "Confirm resort access, eligibility, and whether this activity is limited to resort guests.",
          actionLabel: "Swap this",
          severity: "warning",
          itemIds: [item.id],
        })
      );
    }
    if (reservationRequired(item)) {
      issues.push(
        issue({
          label: "Reservation required",
          detail: "Book or confirm the reservation before planning around this stop.",
          actionLabel: "Swap this",
          severity: "warning",
          itemIds: [item.id],
        })
      );
    }
    if (costUnclear(item)) {
      issues.push(
        issue({
          label: "Cost unclear",
          detail: "Confirm current cost, supplies, and payment details before you go.",
          actionLabel: "Swap this",
          severity: "warning",
          itemIds: [item.id],
        })
      );
    }
  }

  const deduped = dedupeIssues(issues);
  const label = labelFor(deduped);
  const summary = summaryFor(label, deduped);

  return {
    label,
    summary,
    issues: deduped,
    ariaLabel: `Magic Check: ${label}. ${summary}`,
  };
}
