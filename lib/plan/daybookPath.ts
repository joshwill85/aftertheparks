import { parseISO } from "date-fns";
import type { IconKey } from "@/components/icons/iconRegistry";
import type { PlanItem } from "@/lib/types/occurrence";

export type PlanDaybookConnectorTone =
  | "breathing"
  | "conflict"
  | "flexible"
  | "tight"
  | "travel";

export interface PlanDaybookConnector {
  tone: PlanDaybookConnectorTone;
  severity: "good" | "watch" | "risk";
  label: string;
  detail: string;
  iconKey: IconKey;
  ariaLabel: string;
}

export interface PlanDaybookStop {
  itemId: string;
  connectorBefore?: PlanDaybookConnector;
}

export interface PlanDaybookPath {
  stops: PlanDaybookStop[];
  ariaLabel: string;
}

interface ScheduledItem {
  item: PlanItem;
  start: number;
  end: number;
}

function scheduledWindow(item: PlanItem): ScheduledItem | null {
  if (!item.startDateTime) return null;
  const start = parseISO(item.startDateTime).getTime();
  const explicitEnd = item.endDateTime ? parseISO(item.endDateTime).getTime() : NaN;
  const end =
    Number.isFinite(explicitEnd) && explicitEnd > start
      ? explicitEnd
      : start + 45 * 60_000;

  if (!Number.isFinite(start)) return null;
  return { item, start, end };
}

function formatMinutes(minutes: number): string {
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

function formatMinutesForSpeech(minutes: number): string {
  const absolute = Math.abs(minutes);
  if (absolute < 60) return `${absolute} ${absolute === 1 ? "minute" : "minutes"}`;
  return formatMinutes(absolute);
}

function plural(count: number, singular: string, pluralWord = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

function flexibleConnector(item: PlanItem): PlanDaybookConnector {
  return {
    tone: "flexible",
    severity: "watch",
    label: "Needs a time",
    detail: "Keep this as a folded note until you know where it belongs.",
    iconKey: "plan_nav",
    ariaLabel: `${item.title} is saved without a scheduled time.`,
  };
}

function connectorBetween(
  previous: ScheduledItem,
  current: ScheduledItem
): PlanDaybookConnector {
  const gapMinutes = Math.round((current.start - previous.end) / 60_000);
  const sameResort = previous.item.resortSlug === current.item.resortSlug;

  if (gapMinutes < 0) {
    const overlapMinutes = Math.abs(gapMinutes);
    return {
      tone: "conflict",
      severity: "risk",
      label: `${formatMinutes(overlapMinutes)} overlap`,
      detail: "These saved ideas share time. Keep both as options or choose one.",
      iconKey: "nighttime_entertainment",
      ariaLabel: `${previous.item.title} and ${current.item.title} overlap by ${formatMinutesForSpeech(
        overlapMinutes
      )}.`,
    };
  }

  if (!sameResort) {
    return {
      tone: "travel",
      severity: gapMinutes < 30 ? "risk" : "watch",
      label: `${formatMinutes(gapMinutes)} resort change`,
      detail: `Build in travel time before moving from ${previous.item.resortName} to ${current.item.resortName}.`,
      iconKey: "nearby_area",
      ariaLabel: `${formatMinutes(gapMinutes)} between ${previous.item.title} and ${
        current.item.title
      } with a resort change from ${previous.item.resortName} to ${current.item.resortName}.`,
    };
  }

  if (gapMinutes >= 90) {
    return {
      tone: "breathing",
      severity: "good",
      label: `${formatMinutes(gapMinutes)} breathing room`,
      detail: "Same resort. Good room for snacks, reset time, or a slow walk.",
      iconKey: "poolside",
      ariaLabel: `${formatMinutes(gapMinutes)} between ${previous.item.title} and ${
        current.item.title
      } at the same resort.`,
    };
  }

  return {
    tone: "tight",
    severity: gapMinutes < 30 ? "risk" : "watch",
    label: `${formatMinutes(gapMinutes)} gap`,
    detail:
      gapMinutes < 30
        ? "Same resort, but there is not much time between activities."
        : "Same resort with enough time between activities.",
    iconKey: "today_nav",
    ariaLabel: `${formatMinutes(gapMinutes)} between ${previous.item.title} and ${
      current.item.title
    } at the same resort.`,
  };
}

function summaryFor(stops: PlanDaybookStop[]): string {
  const connectors = stops
    .map((stop) => stop.connectorBefore)
    .filter((connector): connector is PlanDaybookConnector => Boolean(connector));
  const overlaps = connectors.filter((connector) => connector.tone === "conflict").length;
  const breathing = connectors.filter((connector) => connector.tone === "breathing").length;
  const travel = connectors.filter((connector) => connector.tone === "travel").length;
  const flexible = connectors.filter((connector) => connector.tone === "flexible").length;
  const parts = [`${plural(stops.length, "saved stop")}`];

  if (overlaps > 0) parts.push(plural(overlaps, "overlap"));
  if (breathing > 0) parts.push(plural(breathing, "breathing gap"));
  if (travel > 0) parts.push(plural(travel, "resort change"));
  if (flexible > 0) parts.push(plural(flexible, "flexible idea"));

  return `Plan daybook path with ${parts.join(", ")}.`;
}

export function buildPlanDaybookPath(items: PlanItem[]): PlanDaybookPath {
  const scheduled = items
    .map(scheduledWindow)
    .filter((item): item is ScheduledItem => Boolean(item))
    .sort((a, b) => a.start - b.start || a.item.title.localeCompare(b.item.title));
  const flexible = items
    .filter((item) => !scheduled.some((scheduledItem) => scheduledItem.item.id === item.id))
    .sort((a, b) => a.title.localeCompare(b.title));
  const stops: PlanDaybookStop[] = [];

  scheduled.forEach((scheduledItem, index) => {
    stops.push({
      itemId: scheduledItem.item.id,
      connectorBefore:
        index > 0 ? connectorBetween(scheduled[index - 1], scheduledItem) : undefined,
    });
  });

  for (const item of flexible) {
    stops.push({
      itemId: item.id,
      connectorBefore: flexibleConnector(item),
    });
  }

  return {
    stops,
    ariaLabel: summaryFor(stops),
  };
}
