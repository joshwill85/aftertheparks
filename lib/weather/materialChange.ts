import type { ActivityWeatherFit, ForecastConfidence, OutdoorFit, PlanResilienceScore, WeatherRiskLevel } from "@/lib/weather/types";

export interface PlanWeatherMaterialChange {
  itemId?: string;
  severity: "info" | "caution" | "warning" | "official_alert";
  title: string;
  message: string;
  suggestedActions: PlanResilienceScore["improvements"];
}

export interface PlanWeatherMaterialChangeSnapshot {
  itemId?: string;
  rainChancePct?: number;
  stormRisk?: WeatherRiskLevel;
  feelsLikeF?: number;
  windRisk?: WeatherRiskLevel;
  outdoorFit?: OutdoorFit;
  confidence?: ForecastConfidence;
  officialAlertActive?: boolean;
}

const BACKUP_ACTIONS: PlanResilienceScore["improvements"] = [
  {
    action: "add_same_resort_indoor_backup",
    label: "Add an indoor backup",
    href: "/activities?weather=indoor",
  },
  { action: "mark_weather_dependent", label: "Keep as weather-dependent" },
];

function worsenedFit(previous?: OutdoorFit, current?: OutdoorFit): boolean {
  const rank: Record<OutdoorFit, number> = {
    great: 0,
    good: 1,
    mixed: 2,
    poor: 3,
    unsafe: 4,
  };
  return previous != null && current != null && rank[current] - rank[previous] >= 2;
}

export function detectPlanWeatherMaterialChanges(input: {
  previous: PlanWeatherMaterialChangeSnapshot;
  current: PlanWeatherMaterialChangeSnapshot;
  activityTags?: ActivityWeatherFit[];
}): PlanWeatherMaterialChange[] {
  const changes: PlanWeatherMaterialChange[] = [];
  const itemId = input.current.itemId ?? input.previous.itemId;

  if (input.current.officialAlertActive && !input.previous.officialAlertActive) {
    changes.push({
      itemId,
      severity: "official_alert",
      title: "Official weather alert started",
      message: "An official alert is now active during this plan window.",
      suggestedActions: [{ action: "stay_indoors", label: "Stay indoors" }],
    });
  }

  if (
    (input.current.rainChancePct ?? 0) - (input.previous.rainChancePct ?? 0) >=
    25
  ) {
    changes.push({
      itemId,
      severity: "warning",
      title: "Rain risk increased",
      message: "Rain risk increased enough to affect outdoor or walking-heavy plans.",
      suggestedActions: BACKUP_ACTIONS,
    });
  }

  if (input.previous.stormRisk !== "high" && input.current.stormRisk === "high") {
    changes.push({
      itemId,
      severity: "warning",
      title: "Storm risk is now high",
      message: "Storm risk crossed into the high range for this plan item.",
      suggestedActions: [{ action: "stay_indoors", label: "Stay indoors" }, ...BACKUP_ACTIONS],
    });
  }

  if ((input.previous.feelsLikeF ?? 0) < 95 && (input.current.feelsLikeF ?? 0) >= 95) {
    changes.push({
      itemId,
      severity: "caution",
      title: "Heat threshold crossed",
      message: "Feels-like temperature now calls for shade, water, and indoor resets.",
      suggestedActions: BACKUP_ACTIONS,
    });
  }

  if (input.previous.windRisk === "low" && input.current.windRisk !== "low") {
    changes.push({
      itemId,
      severity: "caution",
      title: "Wind risk increased",
      message: "Wind may affect boats, campfires, outdoor movies, or exposed transfers.",
      suggestedActions: BACKUP_ACTIONS,
    });
  }

  if (worsenedFit(input.previous.outdoorFit, input.current.outdoorFit)) {
    changes.push({
      itemId,
      severity: input.current.outdoorFit === "unsafe" ? "warning" : "caution",
      title: "Outdoor fit worsened",
      message: "This plan now needs a stronger indoor or covered backup.",
      suggestedActions: BACKUP_ACTIONS,
    });
  }

  if (
    input.previous.confidence === "near_term_hourly" &&
    input.current.confidence === "not_available_yet"
  ) {
    changes.push({
      itemId,
      severity: "info",
      title: "Forecast confidence changed",
      message: "Weather timing is no longer available for this item.",
      suggestedActions: [{ action: "mark_weather_dependent", label: "Keep as weather-dependent" }],
    });
  }

  return changes;
}
