import {
  looksCorruptedSlug,
  looksCorruptedTitle,
  type ActivityDisplayInput,
  type TrustState,
} from "@/lib/activityDisplay";
import { getCategoryMeta } from "@/lib/categories/meta";
import { formatScheduleTimeLabel, parseScheduleTimeRange24h } from "@/lib/text/time";
import { isPdfGarbageText, isUncertainSchedule, normalizeActivityTitle } from "@/lib/text/normalize";

export type DisplayQualityTier = "hide" | "low" | "medium" | "high";

export interface DisplayQualityResult {
  score: number;
  tier: DisplayQualityTier;
  flags: string[];
}

const GENERIC_TITLE_PATTERNS = [
  /^wellness activity$/i,
  /^resort activity$/i,
  /^evening activity$/i,
  /^signature activity$/i,
  /^arcade activity$/i,
  /^nature activity$/i,
  /^scavenger hunt$/i,
  /^arts?&?\s*cr\s*af\s*ts?$/i,
];

const BAD_LOCATION_PATTERNS = [
  /^(?:in a|pick up|enjoy the|located|check with|see the|visit the|from the)\b/i,
  /^(?:r\s*){3,}/i,
  /resort\s*activit/i,
  /\.{4,}/,
  /^[a-z].{60,}$/,
];

const SCHEDULE_FRAGMENT =
  /^(?:daily|nightly|weekly|throughout|available|check|scan|view|see|find|in a|partake|from \d|tuesday at|wednesday at)/i;

function parseHourFromIso(iso?: string): number | null {
  if (!iso) return null;
  const match = iso.match(/T(\d{2}):/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function isBroadDayWindow(startIso?: string, endIso?: string): boolean {
  const startHour = parseHourFromIso(startIso);
  const endHour = parseHourFromIso(endIso);
  if (startHour == null || endHour == null) return false;
  const span = endHour - startHour;
  return span >= 10 && startHour <= 9 && endHour >= 20;
}

function isSuspiciousAllDayBlock(startIso?: string, endIso?: string): boolean {
  const startHour = parseHourFromIso(startIso);
  const endHour = parseHourFromIso(endIso);
  if (startHour == null || endHour == null) return false;
  const isEarlyStart = startHour <= 6 || startHour === 5;
  const isLateEnd = endHour >= 17;
  const spansMostOfDay = endHour - startHour >= 10;
  return isEarlyStart && isLateEnd && spansMostOfDay;
}

function isCamelCaseSmash(title: string): boolean {
  return title
    .split(/\s+/)
    .some((token) => token.length >= 8 && /[a-z][A-Z]/.test(token));
}

function resolveLocation(
  location?: string | { label?: string | null } | null
): string | undefined {
  if (!location) return undefined;
  if (typeof location === "string") return location.trim() || undefined;
  return location.label?.trim() || undefined;
}

function tierFromScore(score: number): DisplayQualityTier {
  if (score < 35) return "hide";
  if (score < 55) return "low";
  if (score < 75) return "medium";
  return "high";
}

/** Composite public-display quality score (0–100). */
export function computeDisplayQuality(
  activity: ActivityDisplayInput
): DisplayQualityResult {
  let score = 100;
  const flags: string[] = [];

  const raw =
    activity.rawTitle ??
    activity.title ??
    activity.name ??
    activity.activity_name ??
    "";
  const normalized = normalizeActivityTitle(raw);
  const repairedDisplayTitle =
    normalized && normalized !== raw && !looksCorruptedTitle(normalized)
      ? normalized
      : "";
  const slug = activity.normalized_name ?? activity.activitySlug ?? "";
  const displayTitle =
    activity.cleanTitle?.trim() ||
    repairedDisplayTitle ||
    (raw && !looksCorruptedTitle(raw)
      ? normalizeActivityTitle(raw)
      : "") ||
    raw.trim();
  const scheduleText =
    activity.scheduleText ?? activity.schedule_text ?? undefined;
  const location = resolveLocation(activity.location);

  if (looksCorruptedTitle(raw)) {
    score -= repairedDisplayTitle ? 8 : 30;
    flags.push(repairedDisplayTitle ? "repaired_raw_title" : "corrupt_raw_title");
  }

  if (normalized && looksCorruptedTitle(normalized)) {
    score -= 15;
    flags.push("corrupt_normalized_title");
  }

  if (GENERIC_TITLE_PATTERNS.some((p) => p.test(displayTitle))) {
    score -= 22;
    flags.push("generic_title");
  }

  if (isCamelCaseSmash(displayTitle) || isCamelCaseSmash(normalized)) {
    score -= 20;
    flags.push("camelcase_title");
  }

  if (slug && looksCorruptedSlug(slug)) {
    score -= 12;
    flags.push("corrupt_slug");
  }

  if (location) {
    if (
      (looksCorruptedTitle(location) && !/^throughout\b/i.test(location)) ||
      BAD_LOCATION_PATTERNS.some((p) => p.test(location)) ||
      isPdfGarbageText(location)
    ) {
      score -= 18;
      flags.push("bad_location");
    }
    if (location.length > 120) {
      score -= 8;
      flags.push("long_location");
    }
  }

  const eveningDefault =
    activity.category === "movies_under_stars" ||
    activity.category === "campfire" ||
    activity.category === "nighttime_entertainment";
  const parsedRange = scheduleText
    ? parseScheduleTimeRange24h(scheduleText, { eveningDefault })
    : null;
  const hasExplicitRange = Boolean(parsedRange?.end);

  if (scheduleText) {
    if (
      isPdfGarbageText(scheduleText) ||
      (SCHEDULE_FRAGMENT.test(scheduleText.trim()) && !parsedRange)
    ) {
      score -= 12;
      flags.push("bad_schedule");
    }
  }

  const timeUncertain = (() => {
    if (scheduleText && !isUncertainSchedule(scheduleText)) {
      if (formatScheduleTimeLabel(scheduleText, { eveningDefault })) {
        return false;
      }
    }
    return (
      isSuspiciousAllDayBlock(activity.startDateTime, activity.endDateTime) ||
      isBroadDayWindow(activity.startDateTime, activity.endDateTime)
    );
  })();

  if (timeUncertain) {
    score -= 14;
    flags.push("uncertain_time");
  }

  if (
    !hasExplicitRange &&
    (isSuspiciousAllDayBlock(activity.startDateTime, activity.endDateTime) ||
      isBroadDayWindow(activity.startDateTime, activity.endDateTime))
  ) {
    score -= 18;
    flags.push("suspicious_time_window");
  }

  const confidence = activity.parse_confidence ?? 0.85;
  score -= Math.round((1 - Math.min(confidence, 1)) * 18);
  if (confidence < 0.65) {
    flags.push("low_parse_confidence");
  }

  if (activity.freshness?.badge === "stale") {
    score -= 8;
    flags.push("stale_source");
  }

  const categoryLabel = getCategoryMeta(activity.category).label.toLowerCase();
  const titleLower = displayTitle.toLowerCase();
  if (
    activity.category === "fitness_wellness" &&
    (titleLower.includes("arcade") ||
      titleLower.includes("tie") ||
      titleLower.includes("craft") ||
      titleLower.includes("game"))
  ) {
    score -= 15;
    flags.push("category_mismatch");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    tier: tierFromScore(Math.max(0, Math.min(100, score))),
    flags,
  };
}

export function shouldHideByQuality(activity: ActivityDisplayInput): boolean {
  return computeDisplayQuality(activity).tier === "hide";
}

export function meetsMinimumQuality(
  activity: ActivityDisplayInput,
  minTier: DisplayQualityTier = "medium"
): boolean {
  const order: DisplayQualityTier[] = ["hide", "low", "medium", "high"];
  const result = computeDisplayQuality(activity);
  return order.indexOf(result.tier) >= order.indexOf(minTier);
}

export function trustStateFromQuality(
  activity: ActivityDisplayInput,
  baseTrust: TrustState
): TrustState {
  const quality = computeDisplayQuality(activity);
  if (quality.tier === "hide" || quality.tier === "low") {
    return "confirm_before_going";
  }
  if (quality.flags.includes("uncertain_time") || quality.flags.includes("suspicious_time_window")) {
    return baseTrust === "verified" || baseTrust === "recently_updated"
      ? "time_unclear"
      : baseTrust;
  }
  if (quality.tier === "medium" && (baseTrust === "verified" || baseTrust === "recently_updated")) {
    return "confirm_before_going";
  }
  return baseTrust;
}
