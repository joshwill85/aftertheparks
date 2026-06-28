import {
  DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG,
  type ActivitySeoFit,
} from "@/lib/seo/fit";
import type { ActivityWeatherFit } from "@/lib/weather/types";

export interface ActivityWeatherProfile {
  weatherFit: ActivityWeatherFit[];
  rainFit: "great" | "okay" | "poor" | "not_recommended";
  heatFit: "great" | "okay" | "poor" | "not_recommended";
  stormFit: "safe_indoor" | "avoid" | "likely_canceled" | "ask_resort";
  windFit: "great" | "okay" | "poor" | "not_recommended";
  defaultWeatherCaveat?: string;
  indoorBackupActivityIds: string[];
}

function tagsFromSeoFit(fit: ActivitySeoFit): ActivityWeatherFit[] {
  if (fit.weatherFit === "indoor") return ["indoor"];
  if (fit.weatherFit === "covered") return ["covered"];
  const tags: ActivityWeatherFit[] = ["outdoor_uncovered"];
  if (fit.weatherFit === "outdoor_not_rainy") tags.push("storm_sensitive");
  if (fit.lightningRisk) tags.push("storm_sensitive");
  if (fit.transportWeatherRisk !== "low") tags.push("walking_heavy");
  return Array.from(new Set(tags));
}

export function activityWeatherProfileFromSeoFit(
  fit: ActivitySeoFit
): ActivityWeatherProfile {
  return {
    weatherFit: tagsFromSeoFit(fit),
    rainFit:
      fit.rainSafe === "yes"
        ? "great"
        : fit.rainSafe === "partial"
          ? "okay"
          : "not_recommended",
    heatFit:
      fit.heatSafe === "yes"
        ? "great"
        : fit.heatSafe === "partial"
          ? "okay"
          : "poor",
    stormFit: fit.lightningRisk
      ? fit.requiresClearWeather
        ? "likely_canceled"
        : "avoid"
      : "safe_indoor",
    windFit: fit.transportWeatherRisk === "high" ? "poor" : "okay",
    defaultWeatherCaveat: fit.requiresClearWeather
      ? "This activity may pause or cancel during rain, lightning, or unsafe conditions."
      : undefined,
    indoorBackupActivityIds: fit.backupActivitySlug ? [fit.backupActivitySlug] : [],
  };
}

export function getActivityWeatherProfile(
  activitySlug: string
): ActivityWeatherProfile {
  const fit =
    DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG[activitySlug] ??
    DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG[activitySlug.replace(/_/g, "-")];
  if (fit) return activityWeatherProfileFromSeoFit(fit);
  return {
    weatherFit: ["mostly_indoor"],
    rainFit: "okay",
    heatFit: "okay",
    stormFit: "ask_resort",
    windFit: "okay",
    indoorBackupActivityIds: [],
  };
}
