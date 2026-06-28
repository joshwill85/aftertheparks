import type { PlanResilienceScore, WeatherRiskLevel } from "@/lib/weather/types";

export function scorePlanResilience(input: {
  futureItems: number;
  weatherSensitiveItems: number;
  itemsWithIndoorBackups: number;
  sameResortBackupCount: number;
  transportWeatherRisk: WeatherRiskLevel;
  stormModeActive: boolean;
  heatRisk: WeatherRiskLevel;
  rainRisk: WeatherRiskLevel;
  groupContext?: string[];
}): PlanResilienceScore {
  if (input.stormModeActive) {
    return {
      label: "unsafe",
      score: 20,
      headline: "Plan resilience: Unsafe during current weather",
      reasons: ["Storm Mode is active, so outdoor plans should pause."],
      improvements: [{ action: "stay_indoors", label: "Stay indoors" }],
    };
  }

  const backupCoverage =
    input.futureItems === 0 ? 1 : input.itemsWithIndoorBackups / input.futureItems;
  let score = 55 + backupCoverage * 30 + Math.min(input.sameResortBackupCount, 3) * 5;
  if (input.weatherSensitiveItems > input.itemsWithIndoorBackups) score -= 15;
  if (input.transportWeatherRisk === "high") score -= 15;
  if (input.transportWeatherRisk === "medium") score -= 8;
  if (input.rainRisk === "high" || input.heatRisk === "high") score -= 12;
  if (input.groupContext?.includes("grandparents")) score -= 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const label: PlanResilienceScore["label"] =
    score >= 82 ? "strong" : score >= 60 ? "flexible" : "fragile";
  const reasons = [
    `${input.itemsWithIndoorBackups} of ${input.futureItems} future activities have indoor or covered backups.`,
  ];
  if (input.sameResortBackupCount > 0) {
    reasons.push(`${input.sameResortBackupCount} backup options stay near the same resort.`);
  }
  if (input.weatherSensitiveItems > input.itemsWithIndoorBackups) {
    reasons.push("Some weather-sensitive plans still need backups.");
  }

  return {
    label,
    score,
    headline: `Plan resilience: ${label[0].toUpperCase()}${label.slice(1)}`,
    reasons,
    improvements: [
      {
        action: "add_same_resort_indoor_backup",
        label: "Add a same-resort indoor backup",
        href: "/activities?weather=indoor",
      },
      {
        action: "reduce_transport_weather_risk",
        label: "Reduce weather-sensitive transportation",
      },
    ],
  };
}
