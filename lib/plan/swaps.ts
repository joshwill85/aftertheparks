import { timeWindowIdForStart, weatherFitValueForActivity } from "@/lib/planning/activityFacts";
import type { WeatherFit } from "@/lib/seo/fit";
import type { ActivityOccurrence, PlanItem } from "@/lib/types/occurrence";

export interface PlanBackupSuggestion {
  activity: ActivityOccurrence;
  weatherFit: WeatherFit;
  score: number;
  reasons: string[];
}

type WeatherFitCandidate = {
  activity: ActivityOccurrence;
  weatherFit: WeatherFit;
};

const WEATHER_SENSITIVE_CATEGORIES = new Set([
  "campfire",
  "movies_under_stars",
  "nighttime_entertainment",
  "poolside",
  "nature",
  "sports_games",
  "sports_rec",
]);

function truthySnapshotValue(item: PlanItem, keys: string[]): boolean {
  return keys.some((key) => item.snapshotJson?.[key] === true);
}

export function planItemNeedsWeatherBackup(item: PlanItem): boolean {
  return (
    WEATHER_SENSITIVE_CATEGORIES.has(item.category ?? "") ||
    truthySnapshotValue(item, ["weatherSensitive", "outdoor", "weatherRisk"])
  );
}

function isSameSavedActivity(item: PlanItem, activity: ActivityOccurrence): boolean {
  return (
    item.sourceOccurrenceId === activity.id ||
    item.activityCatalogId === activity.activityCatalogId ||
    (item.activitySlug === activity.activitySlug && item.resortSlug === activity.resort.slug)
  );
}

function hasAccessRestriction(activity: ActivityOccurrence): boolean {
  return Boolean(
    activity.eligibility.reservation?.required ||
      activity.enrichment?.reservationRequired ||
      activity.enrichment?.reservationRecommended ||
      activity.enrichment?.resortGuestOnly
  );
}

function isFreeOrLowCost(activity: ActivityOccurrence): boolean {
  return (
    activity.price.state === "free" ||
    (activity.price.maxAmountCents != null && activity.price.maxAmountCents <= 2000) ||
    (activity.price.amountCents != null && activity.price.amountCents <= 2000)
  );
}

function sameTimeWindow(item: PlanItem, activity: ActivityOccurrence): boolean {
  if (!item.startDateTime || !activity.startDateTime) return false;
  return timeWindowIdForStart(item.startDateTime) === timeWindowIdForStart(activity.startDateTime);
}

function scoreBackup(item: PlanItem, activity: ActivityOccurrence, weatherFit: WeatherFit) {
  const reasons: string[] = [];
  let score = 0;

  if (activity.resort.slug === item.resortSlug) {
    score += 60;
    reasons.push("Same resort");
  }
  if (sameTimeWindow(item, activity)) {
    score += 28;
    reasons.push("Same time window");
  }
  if (weatherFit === "indoor") {
    score += 24;
    reasons.push("Indoor");
  } else if (weatherFit === "covered") {
    score += 18;
    reasons.push("Covered");
  }
  if (isFreeOrLowCost(activity)) {
    score += 12;
    reasons.push("Free or low-cost");
  }
  if (!hasAccessRestriction(activity)) {
    score += 10;
    reasons.push("Fewer access restrictions");
  }
  if (activity.startDateTime) score += 4;

  return { score, reasons };
}

export function buildPlanBackupSuggestions(
  item: PlanItem,
  candidates: ActivityOccurrence[],
  options: { limit?: number } = {}
): PlanBackupSuggestion[] {
  if (!planItemNeedsWeatherBackup(item)) return [];

  const suggestions = candidates
    .map((activity) => ({
      activity,
      weatherFit: weatherFitValueForActivity(activity),
    }))
    .filter(
      (candidate): candidate is WeatherFitCandidate =>
        !isSameSavedActivity(item, candidate.activity) &&
        (candidate.weatherFit === "indoor" || candidate.weatherFit === "covered")
    )
    .map((candidate) => {
      const ranking = scoreBackup(item, candidate.activity, candidate.weatherFit);
      return {
        ...candidate,
        score: ranking.score,
        reasons: ranking.reasons,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.activity.startDateTime ?? "").localeCompare(b.activity.startDateTime ?? "") ||
        a.activity.title.localeCompare(b.activity.title)
    );

  return suggestions.slice(0, options.limit ?? 3);
}
