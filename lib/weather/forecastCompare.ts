import type { ForecastConfidence } from "@/lib/weather/types";

export interface ForecastCompareResult {
  allowed: boolean;
  recommendation?: "go_earlier" | "keep_time" | "soft_planning_only";
  reason: string;
}

export function compareForecastTiming(input: {
  now: Date;
  startsAt: string;
  isFlexible: boolean;
  confidence: ForecastConfidence;
  currentRainChancePct?: number;
  earlierRainChancePct?: number;
}): ForecastCompareResult {
  const startsAt = new Date(input.startsAt);
  const hoursOut = (startsAt.getTime() - input.now.getTime()) / (1000 * 60 * 60);
  if (hoursOut < 0) {
    return { allowed: false, reason: "Past events cannot use forecast compare." };
  }
  if (!input.isFlexible) {
    return { allowed: false, reason: "Fixed-time activities should not receive exact timing recommendations." };
  }
  if (input.confidence === "long_range_planning") {
    return {
      allowed: false,
      recommendation: "soft_planning_only",
      reason: "8-15 day outlooks are planning signals, not exact timing advice.",
    };
  }
  if (hoursOut > 72) {
    return {
      allowed: false,
      recommendation: "soft_planning_only",
      reason: "Exact go-earlier advice is limited to the 0-72 hour window.",
    };
  }
  if (
    input.earlierRainChancePct != null &&
    input.currentRainChancePct != null &&
    input.currentRainChancePct - input.earlierRainChancePct >= 20
  ) {
    return {
      allowed: true,
      recommendation: "go_earlier",
      reason: "Earlier looks meaningfully drier in the near-term forecast.",
    };
  }
  return {
    allowed: true,
    recommendation: "keep_time",
    reason: "No strong weather reason to move this flexible activity earlier.",
  };
}
