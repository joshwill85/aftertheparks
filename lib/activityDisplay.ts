import { formatOrlandoTime } from "@/lib/daypart";
import { getCategoryMeta } from "@/lib/categories/meta";
import {
  formatScheduleTimeLabel,
  parseScheduleTimeRange24h,
} from "@/lib/text/time";
import {
  isPdfGarbageText,
  isUncertainSchedule,
  normalizeActivityTitle,
} from "@/lib/text/normalize";
import {
  isBlockedActivityTitle,
  isOcrSpacedTitle,
} from "@/lib/text/titleRepairs";
import { slugToTitle } from "@/lib/utils";
import { shouldHideByQuality, trustStateFromQuality } from "@/lib/displayQuality";

export type TrustState =
  | "verified"
  | "recently_updated"
  | "confirm_before_going"
  | "time_unclear"
  | "price_unclear"
  | "source_unclear"
  | "weather_dependent";

export const TRUST_STATE_LABELS: Record<TrustState, string> = {
  verified: "Verified",
  recently_updated: "Updated recently",
  confirm_before_going: "Confirm before going",
  time_unclear: "Time unclear",
  price_unclear: "Price unclear",
  source_unclear: "Source needs review",
  weather_dependent: "Weather dependent",
};

export interface ActivityDisplayInput {
  rawTitle?: string;
  title?: string;
  name?: string;
  activity_name?: string;
  category: string;
  normalized_name?: string;
  activitySlug?: string;
  cleanTitle?: string;
  description?: string | null;
  summary?: string | null;
  summary_original?: string | null;
  scheduleText?: string | null;
  schedule_text?: string | null;
  startDateTime?: string;
  endDateTime?: string;
  price?: { state: "free" | "fee" | "unknown" };
  freshness?: {
    badge: "verified" | "stale";
    lastVerified: string;
  };
  weather_dependency?: string | null;
  location?: string | { label?: string | null } | null;
  resort?: { name?: string };
  parse_confidence?: number;
}

const CATEGORY_TITLE_FALLBACKS: Record<string, string> = {
  movies_under_stars: "Movie Under the Stars",
  movies: "Movie Under the Stars",
  campfire: "Campfire Activities",
  poolside: "Poolside Activities",
  arts_crafts: "Arts & Crafts",
  arcade: "Arcade Activity",
  fitness_wellness: "Wellness Activity",
  signature: "Signature Activity",
  resort_activity: "Resort Activity",
  scavenger_hunt: "Scavenger Hunt",
  nature: "Nature Activity",
  nighttime_entertainment: "Evening Activity",
};

const REPEATED_JUNK = /(.)\1{5,}/;
const PDF_DOTS = /\.{4,}/;
const SPACED_CAPS = /^(?:[A-Z]\s+){3,}[A-Z]$/;
const SPACED_MIXED = /^(?:[A-Za-z]\s+){4,}[A-Za-z]$/;
const RANDOM_MIXED_WORDS = /\b[A-Z][a-z]?\s+[A-Z][a-z]?\s+[A-Z][a-z]?\b/;
const SOURCE_FRAGMENT = /\bS\s*O\s*R\s*C\b/i;
const SCHEDULE_FRAGMENT =
  /^(?:daily|nightly|weekly|throughout|available|check|scan|view|see|find|in a|partake|from \d)/i;

function resolveLocation(
  location?: string | { label?: string | null } | null
): string | undefined {
  if (!location) return undefined;
  if (typeof location === "string") return location.trim() || undefined;
  return location.label?.trim() || undefined;
}

function getRawTitle(activity: ActivityDisplayInput): string {
  return (
    activity.rawTitle ??
    activity.title ??
    activity.name ??
    activity.activity_name ??
    ""
  ).trim();
}

function getNormalizedSlug(activity: ActivityDisplayInput): string | undefined {
  return activity.normalized_name ?? activity.activitySlug;
}

function getScheduleText(activity: ActivityDisplayInput): string | undefined {
  const text = activity.scheduleText ?? activity.schedule_text ?? undefined;
  return text?.trim() || undefined;
}

/** Detect spaced letters, junk strings, PDF fragments, and oversized titles. */
export function looksCorruptedTitle(raw: string): boolean {
  const title = raw.trim();
  if (!title) return true;
  if (title.length > 80) return true;
  if (REPEATED_JUNK.test(title)) return true;
  if (PDF_DOTS.test(title)) return true;
  if (isBlockedActivityTitle(title)) return true;
  if (SPACED_CAPS.test(title) || SPACED_MIXED.test(title)) return true;
  if (isOcrSpacedTitle(title)) return true;
  if (SOURCE_FRAGMENT.test(title)) return true;
  if (SCHEDULE_FRAGMENT.test(title)) return true;
  if (isPdfGarbageText(title)) return true;

  const tokens = title.split(/\s+/);
  const singleLetterTokens = tokens.filter((t) => t.length === 1).length;
  if (tokens.length >= 4 && singleLetterTokens >= 3) return true;
  if (tokens.length >= 4) {
    const shortTokens = tokens.filter((t) => t.length <= 2).length;
    if (shortTokens / tokens.length >= 0.65) return true;
  }

  if (RANDOM_MIXED_WORDS.test(title) && singleLetterTokens >= 2) return true;

  const letters = [...title].filter((c) => /[a-zA-Z]/.test(c)).length;
  if (letters > 0 && letters / title.length < 0.35) return true;

  return false;
}

export function looksCorruptedSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return true;

  const parts = normalized.split("-").filter(Boolean);
  if (parts.length === 0) return true;

  const singleCharParts = parts.filter((p) => p.length === 1).length;
  if (parts.length >= 5 && singleCharParts / parts.length >= 0.55) return true;

  if (
    parts.length >= 3 &&
    parts.every((p) => p.length <= 2) &&
    normalized.length <= 14
  ) {
    return true;
  }

  return false;
}

function categoryTitleFallback(category: string): string {
  return (
    CATEGORY_TITLE_FALLBACKS[category] ??
    `${getCategoryMeta(category).label} Activity`
  );
}

function slugTitleFallback(slug?: string): string | null {
  if (!slug || looksCorruptedSlug(slug)) return null;
  const title = slugToTitle(slug);
  return looksCorruptedTitle(title) ? null : title;
}

/** Human-facing title with slug and category fallbacks. */
export function getDisplayTitle(activity: ActivityDisplayInput): string {
  if (activity.cleanTitle?.trim()) return activity.cleanTitle.trim();

  const raw = getRawTitle(activity);
  const normalized = normalizeActivityTitle(raw);
  const hasReliableRepair =
    normalized &&
    normalized !== raw &&
    !looksCorruptedTitle(normalized);

  if (hasReliableRepair) return normalized;

  if (!raw || looksCorruptedTitle(raw) || looksCorruptedTitle(normalized)) {
    return (
      slugTitleFallback(getNormalizedSlug(activity)) ??
      categoryTitleFallback(activity.category)
    );
  }

  return normalized;
}

function stripPdfGarbage(text: string): string {
  let cleaned = text.trim().replace(/\s+/g, " ");
  cleaned = cleaned.replace(PDF_DOTS, " ");
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  if (!cleaned || isPdfGarbageText(cleaned)) {
    return "";
  }

  if (cleaned.length <= 80 && looksCorruptedTitle(cleaned)) {
    return "";
  }
  return cleaned;
}

/** Human-readable summary with PDF garbage stripped. */
export function getDisplaySummary(
  activity: ActivityDisplayInput
): string | undefined {
  const enriched =
    activity.summary_original?.trim() ??
    activity.summary?.trim() ??
    undefined;
  if (enriched) {
    const cleaned = stripPdfGarbage(enriched);
    if (cleaned) return cleaned;
  }

  const description = activity.description?.trim();
  if (description) {
    const cleaned = stripPdfGarbage(description);
    if (cleaned) return cleaned;
  }

  return undefined;
}

function parseHourFromIso(iso?: string): number | null {
  if (!iso) return null;
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

function isSuspiciousAllDayBlock(
  startIso?: string,
  endIso?: string
): boolean {
  const startHour = parseHourFromIso(startIso);
  const endHour = parseHourFromIso(endIso);
  if (startHour == null || endHour == null) return false;

  const isEarlyStart = startHour <= 9;
  const isLateEnd = endHour >= 20;
  const spansMostOfDay = endHour - startHour >= 10;

  return isEarlyStart && isLateEnd && spansMostOfDay;
}

/** Display time label; marks suspicious all-day parser defaults as uncertain. */
export function getDisplayTime(activity: ActivityDisplayInput): {
  label?: string;
  uncertain: boolean;
} {
  const scheduleText = getScheduleText(activity);
  const eveningDefault =
    activity.category === "movies_under_stars" ||
    activity.category === "campfire" ||
    activity.category === "nighttime_entertainment";

  if (scheduleText && !isUncertainSchedule(scheduleText)) {
    const parsedRange = parseScheduleTimeRange24h(scheduleText, {
      eveningDefault,
    });
    const hasExplicitRange = Boolean(parsedRange?.end);
    const fromText = formatScheduleTimeLabel(scheduleText, {
      eveningDefault,
    });
    if (fromText) {
      if (
        isSuspiciousAllDayBlock(activity.startDateTime, activity.endDateTime) &&
        !hasExplicitRange
      ) {
        return { label: "Time needs confirmation", uncertain: true };
      }
      return { label: fromText, uncertain: false };
    }

    if (
      isSuspiciousAllDayBlock(activity.startDateTime, activity.endDateTime) &&
      !hasExplicitRange
    ) {
      return { label: "Time needs confirmation", uncertain: true };
    }
    const label =
      scheduleText.length > 80
        ? `${scheduleText.slice(0, 77)}…`
        : scheduleText;
    if (!activity.startDateTime) {
      return { label: undefined, uncertain: false };
    }
    return { label, uncertain: false };
  }

  if (scheduleText && isUncertainSchedule(scheduleText)) {
    if (!activity.startDateTime) {
      return { label: undefined, uncertain: false };
    }
    return { label: "Time needs confirmation", uncertain: true };
  }

  if (isSuspiciousAllDayBlock(activity.startDateTime, activity.endDateTime)) {
    return { label: "Time needs confirmation", uncertain: true };
  }

  if (activity.startDateTime) {
    const start = formatOrlandoTime(activity.startDateTime);
    if (activity.endDateTime) {
      const end = formatOrlandoTime(activity.endDateTime);
      if (isSuspiciousAllDayBlock(activity.startDateTime, activity.endDateTime)) {
        return { label: "Time needs confirmation", uncertain: true };
      }
      if (start === end) return { label: start, uncertain: false };
      return { label: `${start} – ${end}`, uncertain: false };
    }
    return { label: start, uncertain: !scheduleText };
  }

  if (scheduleText) {
    return { label: undefined, uncertain: false };
  }

  return { label: undefined, uncertain: false };
}

export function getTrustState(activity: ActivityDisplayInput): TrustState {
  const time = getDisplayTime(activity);
  const priceUnclear = activity.price?.state === "unknown";

  const lastVerified = activity.freshness?.lastVerified;
  const ageMs = lastVerified
    ? Date.now() - new Date(lastVerified).getTime()
    : Number.POSITIVE_INFINITY;
  const recentlyUpdated = ageMs <= 7 * 24 * 60 * 60 * 1000;
  const sourceStale =
    activity.freshness?.badge === "stale" ||
    (activity.parse_confidence != null && activity.parse_confidence < 0.6);

  if (time.uncertain && priceUnclear) {
    return trustStateFromQuality(activity, "confirm_before_going");
  }
  if (time.uncertain) {
    return trustStateFromQuality(activity, "time_unclear");
  }
  if (priceUnclear) {
    return trustStateFromQuality(activity, "price_unclear");
  }
  if (sourceStale) {
    return trustStateFromQuality(activity, "source_unclear");
  }
  if (recentlyUpdated && activity.freshness?.badge === "verified") {
    return trustStateFromQuality(activity, "recently_updated");
  }
  if (activity.freshness?.badge === "verified") {
    return trustStateFromQuality(activity, "verified");
  }

  return trustStateFromQuality(activity, "confirm_before_going");
}

export function getTrustLabel(state: TrustState): string {
  return TRUST_STATE_LABELS[state];
}

function isColumnBleedFragment(slug: string): boolean {
  const parts = slug.split("-").filter(Boolean);
  return parts.length >= 3 && parts.every((p) => p.length === 1);
}

/** Hide entries too corrupted to show even with fallbacks. */
export function shouldHideActivity(activity: ActivityDisplayInput): boolean {
  const raw =
    activity.rawTitle ?? activity.name ?? activity.activity_name ?? "";
  const slug = getNormalizedSlug(activity) ?? "";

  if (!raw.trim() && !slug.trim()) return true;
  if (slug === "resort" && looksCorruptedTitle(raw)) return true;
  if (isColumnBleedFragment(slug)) return true;
  if (SCHEDULE_FRAGMENT.test(raw.trim())) return true;

  const rawCorrupted = looksCorruptedTitle(raw);
  const slugCorrupted = looksCorruptedSlug(slug);

  if (rawCorrupted && slugCorrupted && !activity.cleanTitle) return true;

  if (
    rawCorrupted &&
    slugCorrupted &&
    (activity.parse_confidence ?? 1) < 0.7
  ) {
    return true;
  }

  if (shouldHideByQuality(activity)) return true;

  const displayTitle = getDisplayTitle(activity);
  const genericFallback =
    /^(Wellness|Resort|Evening|Arcade|Nature|Signature) Activity$/i.test(
      displayTitle
    );
  if (genericFallback && (rawCorrupted || slugCorrupted)) return true;

  return false;
}

/** Map occurrence fields into display input. */
export function occurrenceToDisplayInput(
  activity: ActivityDisplayInput & {
    title?: string;
    activitySlug?: string;
    scheduleText?: string | null;
    summary?: string | null;
  }
): ActivityDisplayInput {
  return {
    rawTitle: activity.rawTitle ?? activity.title ?? activity.name,
    category: activity.category,
    normalized_name: activity.normalized_name ?? activity.activitySlug,
    cleanTitle: activity.cleanTitle,
    description: activity.description,
    summary: activity.summary,
    summary_original: activity.summary_original,
    scheduleText: activity.scheduleText ?? activity.schedule_text ?? undefined,
    startDateTime: activity.startDateTime,
    endDateTime: activity.endDateTime,
    price: activity.price,
    freshness: activity.freshness,
    weather_dependency: activity.weather_dependency,
    location: activity.location,
    resort: activity.resort,
    parse_confidence: activity.parse_confidence,
  };
}

/** Map occurrence or raw row fields into display input. */
export function toDisplayInput(
  row: ActivityDisplayInput & {
    activity_name?: string;
    schedule_text?: string | null;
  }
): ActivityDisplayInput {
  return {
    rawTitle: row.rawTitle ?? row.activity_name ?? row.name,
    category: row.category,
    normalized_name: row.normalized_name,
    cleanTitle: row.cleanTitle,
    description: row.description,
    summary: row.summary,
    summary_original: row.summary_original,
    scheduleText: row.scheduleText ?? row.schedule_text ?? undefined,
    startDateTime: row.startDateTime,
    endDateTime: row.endDateTime,
    price: row.price,
    freshness: row.freshness,
    weather_dependency: row.weather_dependency,
    location: row.location,
    resort: row.resort,
    parse_confidence: row.parse_confidence,
  };
}
