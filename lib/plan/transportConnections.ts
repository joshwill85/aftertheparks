import { formatInTimeZone } from "date-fns-tz";
import { parseISO } from "date-fns";
import type { PlanItem } from "@/lib/types/occurrence";
import { TIMEZONE } from "@/lib/daypart";

export type PlanTransportMode =
  | "monorail"
  | "skyliner"
  | "boat"
  | "walk"
  | "bus";

export type PlanTransportOptionKind = "od_service" | "direct_edge";

export interface PlanTransportConnectionOption {
  id: string;
  originResortSlug: string;
  originName: string;
  destinationResortSlug: string;
  destinationName: string;
  transportMode: PlanTransportMode;
  routeLabel: string | null;
  routeColorOrFlag: string | null;
  serviceType: string | null;
  directness: string | null;
  transferCount: number;
  viaPlaceIds: string[];
  viaPlaceNames: string[];
  evidenceLevel: string | null;
  sourceIds: string[];
  notes: string[];
  optionKind: PlanTransportOptionKind;
}

export interface PlanTransportConnectionPair {
  originResortSlug: string;
  originResortName: string;
  destinationResortSlug: string;
  destinationResortName: string;
}

export type PlanTransportConnectionMap = Map<
  string,
  PlanTransportConnectionOption[]
>;

const MODE_LABELS: Record<PlanTransportMode, string> = {
  monorail: "Monorail",
  skyliner: "Skyliner",
  boat: "Boat",
  walk: "Walk",
  bus: "Bus",
};

const MODE_PRIORITY: Record<PlanTransportMode, number> = {
  monorail: 0,
  skyliner: 1,
  boat: 2,
  walk: 3,
  bus: 4,
};

function validTime(value?: string): number | null {
  if (!value) return null;
  const time = parseISO(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function planDateKey(item: PlanItem): string | null {
  if (!item.startDateTime) return null;
  const time = validTime(item.startDateTime);
  if (time === null) return null;
  return formatInTimeZone(new Date(time), TIMEZONE, "yyyy-MM-dd");
}

function scheduledItems(items: PlanItem[]): PlanItem[] {
  return items
    .filter((item) => validTime(item.startDateTime) !== null)
    .sort((a, b) => {
      const byTime = (validTime(a.startDateTime) ?? 0) - (validTime(b.startDateTime) ?? 0);
      if (byTime !== 0) return byTime;
      return a.title.localeCompare(b.title);
    });
}

export function transportPairKey(
  originResortSlug: string,
  destinationResortSlug: string
): string {
  return `${originResortSlug}→${destinationResortSlug}`;
}

export function transportConnectionPairsForItems(
  items: PlanItem[]
): PlanTransportConnectionPair[] {
  const scheduled = scheduledItems(items);
  const seen = new Set<string>();
  const pairs: PlanTransportConnectionPair[] = [];

  for (let i = 1; i < scheduled.length; i += 1) {
    const previous = scheduled[i - 1];
    const current = scheduled[i];
    if (planDateKey(previous) !== planDateKey(current)) continue;
    if (!previous.resortSlug || !current.resortSlug) continue;
    if (previous.resortSlug === current.resortSlug) continue;

    const key = transportPairKey(previous.resortSlug, current.resortSlug);
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({
      originResortSlug: previous.resortSlug,
      originResortName: previous.resortName,
      destinationResortSlug: current.resortSlug,
      destinationResortName: current.resortName,
    });
  }

  return pairs;
}

function normalizedText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function displayDedupeKey(option: PlanTransportConnectionOption): string {
  return [
    option.originResortSlug,
    option.destinationResortSlug,
    option.transportMode,
    normalizedText(option.routeLabel),
    normalizedText(option.routeColorOrFlag),
    option.transferCount,
  ].join("|");
}

function optionScore(option: PlanTransportConnectionOption): number[] {
  const generatedNotePenalty = option.notes.some((note) =>
    /generated from route[_ ]pattern/i.test(note)
  )
    ? 1
    : 0;
  const directnessPenalty =
    option.directness === "direct" || option.serviceType === "adjacent_segment"
      ? 0
      : option.serviceType?.includes("intermediate")
        ? 1
        : 2;

  return [
    option.transferCount,
    directnessPenalty,
    MODE_PRIORITY[option.transportMode],
    option.optionKind === "od_service" ? 0 : 1,
    generatedNotePenalty,
  ];
}

function compareOptions(
  left: PlanTransportConnectionOption,
  right: PlanTransportConnectionOption
): number {
  const leftScore = optionScore(left);
  const rightScore = optionScore(right);
  for (let i = 0; i < leftScore.length; i += 1) {
    const delta = leftScore[i] - rightScore[i];
    if (delta !== 0) return delta;
  }
  return (left.routeLabel ?? left.id).localeCompare(right.routeLabel ?? right.id);
}

export function dedupeAndRankTransportOptions(
  options: PlanTransportConnectionOption[]
): PlanTransportConnectionOption[] {
  const bestByDisplayKey = new Map<string, PlanTransportConnectionOption>();

  for (const option of options) {
    const key = displayDedupeKey(option);
    const existing = bestByDisplayKey.get(key);
    if (!existing || compareOptions(option, existing) < 0) {
      bestByDisplayKey.set(key, option);
    }
  }

  return [...bestByDisplayKey.values()].sort(compareOptions);
}

export function buildTransportConnectionMap(
  options: PlanTransportConnectionOption[]
): PlanTransportConnectionMap {
  const grouped = new Map<string, PlanTransportConnectionOption[]>();

  for (const option of options) {
    const key = transportPairKey(option.originResortSlug, option.destinationResortSlug);
    grouped.set(key, [...(grouped.get(key) ?? []), option]);
  }

  for (const [key, rows] of grouped.entries()) {
    grouped.set(key, dedupeAndRankTransportOptions(rows));
  }

  return grouped;
}

export function connectionOptionsForPair(
  connections: PlanTransportConnectionMap | undefined,
  originResortSlug: string,
  destinationResortSlug: string
): PlanTransportConnectionOption[] {
  return connections?.get(transportPairKey(originResortSlug, destinationResortSlug)) ?? [];
}

export function transportModeLabel(mode: PlanTransportMode): string {
  return MODE_LABELS[mode];
}

export function transportOptionLabel(
  option: PlanTransportConnectionOption
): string {
  const mode = transportModeLabel(option.transportMode);
  if (option.routeLabel) return `${mode} via ${option.routeLabel}`;
  return mode;
}

export function transportOptionDetail(
  option: PlanTransportConnectionOption
): string {
  const transferCopy =
    option.transferCount === 0
      ? "Direct route"
      : `${option.transferCount} transfer${option.transferCount === 1 ? "" : "s"}`;
  const viaCopy =
    option.transferCount > 0 && option.viaPlaceNames.length > 0
      ? ` via ${option.viaPlaceNames.join(", ")}`
      : "";
  const caveat =
    option.notes.find((note) => !/generated from route[_ ]pattern/i.test(note)) ??
    "Confirm current transportation day-of.";
  return `${transferCopy}${viaCopy}. ${caveat}`;
}
