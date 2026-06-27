import type { IconKey } from "@/components/icons/iconRegistry";
import { isUncertainSchedule } from "@/lib/text/normalize";
import type { ActivityOccurrence, ActivityOffering } from "@/lib/types/occurrence";

export type SourceConfidenceState = "good" | "mixed" | "needs_confirmation";
export type SourceConfidenceTone = "strong" | "mixed" | "needs_confirmation";

export interface SourceConfidenceItem {
  key:
    | "source_link"
    | "verified_recently"
    | "time_clear"
    | "cost_clear"
    | "source_contract";
  label: string;
  helper: string;
  state: SourceConfidenceState;
  iconKey: IconKey;
}

export interface SourceConfidenceLedger {
  score: number;
  tone: SourceConfidenceTone;
  summary: string;
  items: SourceConfidenceItem[];
  ariaLabel: string;
}

export interface SourceConfidenceSummary {
  total: number;
  strong: number;
  mixed: number;
  needsConfirmation: number;
  averageScore: number;
  summary: string;
  ariaLabel: string;
}

type SourceConfidenceInput = Pick<
  ActivityOccurrence | ActivityOffering,
  "price" | "freshness" | "source" | "trustState"
> &
  Partial<Pick<ActivityOccurrence, "startDateTime" | "scheduleText">> &
  Partial<Pick<ActivityOffering, "availability">>;

interface SourceConfidenceOptions {
  now?: Date;
}

const RECENT_DAYS = 60;

function dayDifference(fromIso: string | undefined, now: Date): number | undefined {
  if (!fromIso) return undefined;
  const date = new Date(fromIso);
  if (Number.isNaN(date.getTime())) return undefined;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

function hasSourceLink(input: SourceConfidenceInput): boolean {
  return Boolean(input.freshness?.sourceUrl || input.source?.url);
}

function hasSourceContract(input: SourceConfidenceInput): boolean {
  return Boolean(input.source?.documentHash || input.source?.documentId);
}

function isRecentlyVerified(input: SourceConfidenceInput, now: Date): boolean {
  const ageDays = dayDifference(input.freshness?.lastVerified, now);
  return input.freshness?.badge === "verified" && ageDays != null && ageDays <= RECENT_DAYS;
}

function hasClearTime(input: SourceConfidenceInput): boolean {
  if (input.startDateTime) return true;
  if (input.availability?.kind === "evergreen_all_day") return true;
  if (input.availability?.label && input.availability.hoursState !== "source_unspecified") {
    return true;
  }
  const scheduleText = input.scheduleText?.trim();
  if (!scheduleText || isUncertainSchedule(scheduleText)) return false;
  return !/^(check|confirm|see|ask|visit|scan)\b/i.test(scheduleText);
}

function hasClearCost(input: SourceConfidenceInput): boolean {
  return input.price.state !== "unknown";
}

function item(
  key: SourceConfidenceItem["key"],
  label: string,
  helper: string,
  state: SourceConfidenceState,
  iconKey: IconKey
): SourceConfidenceItem {
  return { key, label, helper, state, iconKey };
}

function stateScore(state: SourceConfidenceState): number {
  if (state === "good") return 20;
  if (state === "mixed") return 10;
  return 0;
}

function toneFor(score: number): SourceConfidenceTone {
  if (score >= 80) return "strong";
  if (score >= 40) return "mixed";
  return "needs_confirmation";
}

function summaryFor(tone: SourceConfidenceTone): string {
  if (tone === "strong") return "Source looks current";
  if (tone === "mixed") return "Some details need a second look";
  return "Confirm before you go";
}

function formatSummaryParts(parts: string[]): string {
  if (parts.length === 0) return "No activities from current resort calendars.";
  return `${parts.join(", ")}.`;
}

export function buildSourceConfidenceLedger(
  input: SourceConfidenceInput,
  options: SourceConfidenceOptions = {}
): SourceConfidenceLedger {
  const now = options.now ?? new Date();
  const linkState: SourceConfidenceState = hasSourceLink(input)
    ? "good"
    : "needs_confirmation";
  const recentState: SourceConfidenceState = isRecentlyVerified(input, now)
    ? "good"
    : "needs_confirmation";
  const timeState: SourceConfidenceState = hasClearTime(input)
    ? "good"
    : "needs_confirmation";
  const costState: SourceConfidenceState = hasClearCost(input)
    ? "good"
    : "needs_confirmation";
  const contractState: SourceConfidenceState = hasSourceContract(input)
    ? "good"
    : hasSourceLink(input)
      ? "mixed"
      : "needs_confirmation";

  const items: SourceConfidenceItem[] = [
    item(
      "source_link",
      linkState === "good" ? "Official source linked" : "Source link missing",
      linkState === "good"
        ? "There is a source link for guest confirmation."
        : "Use the resort or recreation desk before relying on this.",
      linkState,
      "search_offering"
    ),
    item(
      "verified_recently",
      recentState === "good" ? "Verified recently" : "Verification is aging",
      recentState === "good"
        ? `Checked within the last ${RECENT_DAYS} days.`
        : "Schedule details may have changed since the last check.",
      recentState,
      "check_mark"
    ),
    item(
      "time_clear",
      timeState === "good" ? "Time is clear" : "Time needs confirmation",
      timeState === "good"
        ? "The schedule has a usable time or availability label."
        : "Check the current recreation guide before heading over.",
      timeState,
      "today_nav"
    ),
    item(
      "cost_clear",
      costState === "good" ? "Cost is clear" : "Cost needs confirmation",
      costState === "good"
        ? "The source supports the displayed cost state."
        : "Pricing was not clear enough to rely on without asking.",
      costState,
      "search_category"
    ),
    item(
      "source_contract",
      contractState === "good"
        ? "Source saved"
        : contractState === "mixed"
          ? "Source linked"
          : "Source details missing",
      contractState === "good"
        ? "The saved source can be checked again later."
        : contractState === "mixed"
          ? "Guests can still confirm from the link."
          : "Check the resort guide before relying on this.",
      contractState,
      "search_guide"
    ),
  ];

  const score = items.reduce((sum, next) => sum + stateScore(next.state), 0);
  const tone = toneFor(score);
  const goodCount = items.filter((next) => next.state === "good").length;
  const mixedCount = items.filter((next) => next.state === "mixed").length;
  const needsCount = items.length - goodCount - mixedCount;
  const ariaLabel = `${summaryFor(tone)}. Source check ${score} percent. ${goodCount} of ${items.length} checks are strong, ${mixedCount} mixed, ${needsCount} need confirmation.`;

  return {
    score,
    tone,
    summary: summaryFor(tone),
    items,
    ariaLabel,
  };
}

export function buildSourceConfidenceSummary(
  inputs: SourceConfidenceInput[],
  options: SourceConfidenceOptions = {}
): SourceConfidenceSummary {
  const ledgers = inputs.map((input) => buildSourceConfidenceLedger(input, options));
  const total = ledgers.length;
  const strong = ledgers.filter((ledger) => ledger.tone === "strong").length;
  const mixed = ledgers.filter((ledger) => ledger.tone === "mixed").length;
  const needsConfirmation = ledgers.filter(
    (ledger) => ledger.tone === "needs_confirmation"
  ).length;
  const averageScore =
    total === 0
      ? 0
      : Math.round(ledgers.reduce((sum, ledger) => sum + ledger.score, 0) / total);
  const parts = [
    strong > 0 ? `${strong} strong` : "",
    mixed > 0 ? `${mixed} mixed` : "",
    needsConfirmation > 0 ? `${needsConfirmation} needs confirmation` : "",
  ].filter(Boolean);

  return {
    total,
    strong,
    mixed,
    needsConfirmation,
    averageScore,
    summary: formatSummaryParts(parts),
    ariaLabel: `${total} source check ${
      total === 1 ? "item" : "items"
    }. Average source check ${averageScore} percent. ${formatSummaryParts(parts)}`,
  };
}
