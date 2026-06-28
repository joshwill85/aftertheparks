import type { ActivityWeatherFit, StormModeState, WeatherAlert, WeatherRiskLevel } from "@/lib/weather/types";

const STORM_AFFECTED_TAGS: ActivityWeatherFit[] = [
  "outdoor_uncovered",
  "pool",
  "campfire",
  "outdoor_movie",
  "boat_dependent",
  "skyliner_dependent",
  "storm_sensitive",
];

export function getStormModeState(input: {
  alerts?: WeatherAlert[];
  stormRisk?: WeatherRiskLevel;
}): StormModeState {
  const alerts = input.alerts ?? [];
  const severe = alerts.some(
    (alert) =>
      alert.severity === "Extreme" ||
      alert.severity === "Severe" ||
      alert.urgency === "Immediate"
  );
  if (severe) {
    return {
      active: true,
      level: "danger",
      headline: "Official weather alert in effect",
      guidance: "Stay indoors and follow official guidance until the alert expires.",
      suppressOutdoorRecommendations: true,
      promoteIndoorOptions: true,
      affectedTags: STORM_AFFECTED_TAGS,
      source: "nws",
    };
  }
  if (input.stormRisk === "high") {
    return {
      active: true,
      level: "caution",
      headline: "Storm risk may interrupt outdoor plans",
      guidance: "Favor indoor and covered options while storm risk is high.",
      suppressOutdoorRecommendations: true,
      promoteIndoorOptions: true,
      affectedTags: STORM_AFFECTED_TAGS,
      source: "forecast_risk",
    };
  }
  return {
    active: false,
    level: "none",
    headline: "No storm mode",
    guidance: "No storm-specific posture is active.",
    suppressOutdoorRecommendations: false,
    promoteIndoorOptions: false,
    affectedTags: [],
    source: "forecast_risk",
  };
}
