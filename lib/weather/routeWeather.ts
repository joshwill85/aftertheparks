import type { RouteWeatherLegImpact, WeatherDecisionState, WeatherLocationKey, WeatherRiskLevel } from "@/lib/weather/types";

function decisionForMode(input: {
  transportMode: RouteWeatherLegImpact["transportMode"];
  routeType: RouteWeatherLegImpact["routeType"];
  stormRisk: WeatherRiskLevel;
  rainRisk: WeatherRiskLevel;
}): WeatherDecisionState {
  if (input.routeType === "multi_transfer") return "bring_backup";
  if (
    input.stormRisk === "high" &&
    ["walk", "boat", "skyliner"].includes(input.transportMode)
  ) {
    return "avoid_outdoor";
  }
  if (input.rainRisk === "high" && input.transportMode === "walk") {
    return "indoor_backup_recommended";
  }
  return "go";
}

export function buildRouteWeatherImpact(input: {
  fromResortSlug: string;
  toResortSlug: string;
  transportMode: RouteWeatherLegImpact["transportMode"];
  routeType: RouteWeatherLegImpact["routeType"];
  expectedStartAt: string;
  expectedEndAt: string;
  weatherLocationKeys: WeatherLocationKey[];
  stormRisk: WeatherRiskLevel;
  rainRisk: WeatherRiskLevel;
}): RouteWeatherLegImpact {
  const weatherDecisionState = decisionForMode(input);
  return {
    fromResortSlug: input.fromResortSlug,
    toResortSlug: input.toResortSlug,
    transportMode: input.transportMode,
    routeType: input.routeType,
    expectedStartAt: input.expectedStartAt,
    expectedEndAt: input.expectedEndAt,
    weatherLocationKeys: input.weatherLocationKeys,
    weatherDecisionState,
    caution:
      input.routeType === "multi_transfer"
        ? "Do not treat multi-hop transfers as easy weather workarounds."
        : weatherDecisionState === "avoid_outdoor"
          ? "This route can pause or become uncomfortable during storms."
          : "Route weather impact is manageable.",
  };
}
