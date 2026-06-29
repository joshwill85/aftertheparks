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

export type PlanTransportOptionKind = "od_service" | "direct_edge" | "graph_path";

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

export interface PlanTransportInstructions {
  lines: string[];
  disclosure?: string;
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

const TRANSPORT_DISCLOSURE =
  "Live schedules and exact pickup points are not included here; confirm current routes, bus bays, and timing in My Disney Experience, posted signage, or with a Cast Member.";

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

function routeLabelParts(routeLabel: string | null): string[] {
  return (routeLabel ?? "")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
}

function modeFromRoutePart(
  routePart: string | undefined,
  fallback: PlanTransportMode
): PlanTransportMode {
  const normalized = normalizedText(routePart);
  if (/monorail/.test(normalized)) return "monorail";
  if (/skyliner|aerial/.test(normalized)) return "skyliner";
  if (/boat|water|launch|ferry/.test(normalized)) return "boat";
  if (/walk/.test(normalized)) return "walk";
  if (/bus/.test(normalized)) return "bus";
  return fallback;
}

function graphPathLegModes(option: PlanTransportConnectionOption): PlanTransportMode[] {
  const legCount = Math.max(1, option.viaPlaceNames.length + 1);
  const routeParts = routeLabelParts(option.routeLabel);

  return Array.from({ length: legCount }, (_, index) =>
    modeFromRoutePart(
      routeParts[index] ?? (routeParts.length === 1 ? routeParts[0] : undefined),
      option.transportMode
    )
  );
}

function uniqueModeLabels(modes: PlanTransportMode[]): string[] {
  const labels: string[] = [];
  for (const mode of modes) {
    const label = transportModeLabel(mode);
    if (labels[labels.length - 1] !== label) labels.push(label);
  }
  return labels;
}

function displayDedupeKey(option: PlanTransportConnectionOption): string {
  const viaKey =
    option.optionKind === "graph_path" && option.viaPlaceIds.length > 0
      ? option.viaPlaceIds.join(",")
      : "";
  return [
    option.originResortSlug,
    option.destinationResortSlug,
    option.transportMode,
    normalizedText(option.routeLabel),
    normalizedText(option.routeColorOrFlag),
    option.transferCount,
    viaKey,
  ].join("|");
}

function optionScore(option: PlanTransportConnectionOption): number[] {
  const generatedNotePenalty = option.notes.some((note) =>
    /generated from route[_ ]pattern/i.test(note)
  )
    ? 1
    : 0;
  const modeChangePenalty =
    option.optionKind === "graph_path"
      ? Math.max(0, uniqueModeLabels(graphPathLegModes(option)).length - 1)
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
    modeChangePenalty,
    MODE_PRIORITY[option.transportMode],
    option.optionKind === "od_service" ? 0 : option.optionKind === "direct_edge" ? 1 : 2,
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
  return [
    left.routeLabel ?? "",
    left.viaPlaceIds.join(","),
    left.id,
  ]
    .join("|")
    .localeCompare(
      [right.routeLabel ?? "", right.viaPlaceIds.join(","), right.id].join("|")
    );
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
  if (option.optionKind === "graph_path") {
    const modeLabels = uniqueModeLabels(graphPathLegModes(option));
    const modeLabel = modeLabels.join(" + ");
    const viaLabel = option.viaPlaceNames[0] ? ` via ${option.viaPlaceNames[0]}` : "";
    return option.transferCount > 0 && modeLabels.length === 1
      ? `${modeLabel} transfer${viaLabel}`
      : `${modeLabel}${viaLabel}`;
  }
  if (option.routeLabel) return `${mode} via ${option.routeLabel}`;
  return mode;
}

function travelVerb(mode: PlanTransportMode, transfer: boolean): string {
  if (mode === "walk") return transfer ? "walk" : "Walk";
  if (mode === "bus") return transfer ? "transfer to a bus" : "Take bus transportation";
  if (mode === "boat") return transfer ? "transfer to boat transportation" : "Take boat transportation";
  if (mode === "monorail") return transfer ? "transfer to the monorail" : "Take the monorail";
  return transfer ? "transfer to the Skyliner" : "Take the Skyliner";
}

function waypointSentence(mode: PlanTransportMode, index: number): string | null {
  if (mode === "boat" && index === 0) {
    return "Look for the resort boat launch or posted water transportation signs.";
  }
  if (mode === "bus" && index === 0) {
    return "Use the resort bus stop and check posted destination signs.";
  }
  if (mode === "bus") {
    return "Check the bus directory/signage for the current bus bay.";
  }
  if (mode === "monorail") {
    return "Follow posted monorail entrance signs.";
  }
  if (mode === "skyliner") {
    return "Follow posted Disney Skyliner station signs.";
  }
  return null;
}

function graphPathInstructions(
  option: PlanTransportConnectionOption
): PlanTransportInstructions {
  const places = [option.originName, ...option.viaPlaceNames, option.destinationName];
  const modes = graphPathLegModes(option);
  const sentences: string[] = [];

  modes.forEach((mode, index) => {
    const from = places[index];
    const to = places[index + 1];
    if (!from || !to) return;
    const transfer = index > 0;
    sentences.push(
      transfer
        ? `At ${from}, ${travelVerb(mode, true)} to ${to}.`
        : `${travelVerb(mode, false)} from ${from} to ${to}.`
    );
    const waypoint = waypointSentence(mode, index);
    if (waypoint) sentences.push(waypoint);
  });

  return {
    lines: sentences,
    disclosure: TRANSPORT_DISCLOSURE,
  };
}

export function transportOptionInstructions(
  option: PlanTransportConnectionOption
): PlanTransportInstructions {
  if (option.optionKind === "graph_path") {
    return graphPathInstructions(option);
  }

  return {
    lines: [transportOptionDetail(option)],
  };
}

export function transportOptionDetail(
  option: PlanTransportConnectionOption
): string {
  if (option.optionKind === "graph_path") {
    const instructions = graphPathInstructions(option);
    return `${instructions.lines.join(" ")} *${instructions.disclosure}*`;
  }

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
