import { parseISO } from "date-fns";
import type { IconKey } from "@/components/icons/iconRegistry";
import type { PlanItem } from "@/lib/types/occurrence";

export type PlanPaceTone = "easy_start" | "low_stress" | "balanced" | "needs_attention";
export type PlanPaceSignalKey =
  | "overlap"
  | "short_transfer"
  | "backtracking"
  | "reservation_risk"
  | "breathing_room"
  | "unscheduled";

export interface PlanPaceSignal {
  key: PlanPaceSignalKey;
  label: string;
  value: string;
  helper: string;
  iconKey: IconKey;
  severity: "good" | "watch" | "risk";
}

export interface PlanPace {
  score: number;
  tone: PlanPaceTone;
  summary: string;
  story: string;
  ariaLabel: string;
  metrics: {
    scheduledCount: number;
    unscheduledCount: number;
    overlaps: number;
    shortTransfers: number;
    longGaps: number;
    backtracks: number;
    reservationRisks: number;
  };
  signals: PlanPaceSignal[];
}

interface ScheduledPlanItem {
  item: PlanItem;
  start: number;
  end: number;
}

function scheduledWindow(item: PlanItem): ScheduledPlanItem | null {
  if (!item.startDateTime) return null;
  const start = parseISO(item.startDateTime).getTime();
  const explicitEnd = item.endDateTime ? parseISO(item.endDateTime).getTime() : NaN;
  const end = Number.isFinite(explicitEnd) && explicitEnd > start
    ? explicitEnd
    : start + 45 * 60_000;
  if (!Number.isFinite(start)) return null;
  return { item, start, end };
}

function plural(count: number, singular: string, pluralWord = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

function reservationRequired(item: PlanItem): boolean {
  return item.snapshotJson?.reservationRequired === true;
}

function toneFor({
  score,
  scheduledCount,
}: {
  score: number;
  scheduledCount: number;
}): PlanPaceTone {
  if (scheduledCount <= 1) return "easy_start";
  if (score >= 82) return "low_stress";
  if (score >= 58) return "balanced";
  return "needs_attention";
}

function summaryFor(tone: PlanPaceTone): string {
  if (tone === "easy_start") return "A good start";
  if (tone === "low_stress") return "Low-stress daybook";
  if (tone === "balanced") return "Balanced resort day";
  return "A few choices need attention";
}

function storyFor(
  tone: PlanPaceTone,
  metrics: PlanPace["metrics"]
): string {
  if (tone === "easy_start") {
    return "You have one saved activity. Add something nearby so the day has a clear next step.";
  }

  const parts: string[] = [];
  if (metrics.overlaps > 0) parts.push(`${plural(metrics.overlaps, "overlap")} to resolve`);
  if (metrics.shortTransfers > 0) {
    parts.push(`${plural(metrics.shortTransfers, "short gap")} under 30 minutes`);
  }
  if (metrics.backtracks > 0) {
    parts.push(`${plural(metrics.backtracks, "resort-to-resort move")} to consider`);
  }
  if (metrics.reservationRisks > 0) {
    parts.push(`${plural(metrics.reservationRisks, "reservation-sensitive stop")} to confirm`);
  }
  if (metrics.longGaps > 0) {
    parts.push(`${plural(metrics.longGaps, "breathing gap")} with room to breathe`);
  }
  if (metrics.unscheduledCount > 0) {
    parts.push(`${plural(metrics.unscheduledCount, "unscheduled idea")} waiting for a time`);
  }

  if (parts.length === 0) {
    return "Your plan moves cleanly from one resort activity to the next.";
  }

  return parts.join(", ") + ".";
}

function signal(
  key: PlanPaceSignalKey,
  label: string,
  value: string,
  helper: string,
  iconKey: IconKey,
  severity: PlanPaceSignal["severity"]
): PlanPaceSignal {
  return { key, label, value, helper, iconKey, severity };
}

export function buildPlanPace(items: PlanItem[]): PlanPace {
  const scheduled = items
    .map(scheduledWindow)
    .filter((item): item is ScheduledPlanItem => Boolean(item))
    .sort((a, b) => a.start - b.start);

  let overlaps = 0;
  let shortTransfers = 0;
  let longGaps = 0;
  let backtracks = 0;

  for (let index = 1; index < scheduled.length; index++) {
    const previous = scheduled[index - 1];
    const current = scheduled[index];
    const gapMinutes = Math.round((current.start - previous.end) / 60_000);
    if (gapMinutes < 0) overlaps += 1;
    else if (gapMinutes < 30) shortTransfers += 1;
    else if (gapMinutes >= 90) longGaps += 1;

    if (current.item.resortSlug !== previous.item.resortSlug) {
      backtracks += 1;
    }
  }

  const reservationRisks = items.filter(reservationRequired).length;
  const unscheduledCount = items.length - scheduled.length;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        92 -
          overlaps * 22 -
          shortTransfers * 13 -
          Math.max(0, backtracks - 1) * 7 -
          reservationRisks * 5 -
          unscheduledCount * 3
      )
    )
  );
  const metrics = {
    scheduledCount: scheduled.length,
    unscheduledCount,
    overlaps,
    shortTransfers,
    longGaps,
    backtracks,
    reservationRisks,
  };
  const tone = toneFor({ score, scheduledCount: scheduled.length });

  const signals: PlanPaceSignal[] = [];
  if (overlaps > 0) {
    signals.push(
      signal(
        "overlap",
        "Overlap",
        String(overlaps),
        "Two saved ideas share the same time window.",
        "nighttime_entertainment",
        "risk"
      )
    );
  }
  if (shortTransfers > 0) {
    signals.push(
      signal(
        "short_transfer",
        "Short gap",
        String(shortTransfers),
        "Less than 30 minutes between activities.",
        "today_nav",
        "risk"
      )
    );
  }
  if (backtracks > 0) {
    signals.push(
      signal(
        "backtracking",
        "Resort moves",
        String(backtracks),
        "Each resort change adds travel and orientation time.",
        "nearby_area",
        backtracks > 1 ? "watch" : "good"
      )
    );
  }
  if (reservationRisks > 0) {
    signals.push(
      signal(
        "reservation_risk",
        "Reservation",
        String(reservationRisks),
        "Confirm booking-sensitive stops before building around them.",
        "search_offering",
        "watch"
      )
    );
  }
  if (longGaps > 0) {
    signals.push(
      signal(
        "breathing_room",
        "Breathing room",
        String(longGaps),
        "Open time for snacks, transportation, or a pool reset.",
        "poolside",
        "good"
      )
    );
  }
  if (unscheduledCount > 0) {
    signals.push(
      signal(
        "unscheduled",
        "Needs a time",
        String(unscheduledCount),
        "Saved ideas without a date stay flexible until you anchor them.",
        "plan_nav",
        "watch"
      )
    );
  }

  if (signals.length === 0) {
    signals.push(
      signal(
        "breathing_room",
        "Looks easy",
        "Ready",
        "No overlaps, short gaps, or extra resort changes found.",
        "check_mark",
        "good"
      )
    );
  }

  const summary = summaryFor(tone);
  const story = storyFor(tone, metrics);
  const ariaLabel = `${summary}. Plan pace score ${score} percent. ${story}`;

  return {
    score,
    tone,
    summary,
    story,
    ariaLabel,
    metrics,
    signals,
  };
}
