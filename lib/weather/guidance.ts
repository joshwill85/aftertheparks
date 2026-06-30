import {
  DEFAULT_WEATHER_RISK,
  type ActivityWeatherFit,
  type ForecastStatus,
  type NearTermRainSignal,
  type OfficialAlertStatus,
  type OutdoorFit,
  type WeatherAlert,
  type WeatherDay,
  type WeatherForTimeSpan,
  type WeatherHour,
  type WeatherLocationKey,
  type WeatherTimeBasis,
  type WeatherRisk,
  type WeatherRiskLevel,
  type WeatherSnapshot,
  type WeatherPrecipMapContext,
} from "@/lib/weather/types";
import type { ActivityFactualEnrichment } from "@/lib/types/occurrence";
import { defaultWeatherEndTime } from "@/lib/weather/time";
import { trackWeatherEvent } from "@/lib/weather/analytics";

function maxRisk(...risks: WeatherRiskLevel[]): WeatherRiskLevel {
  if (risks.includes("high")) return "high";
  if (risks.includes("medium")) return "medium";
  return "low";
}

function pctRisk(value?: number): WeatherRiskLevel {
  if (value == null) return "low";
  if (value >= 60) return "high";
  if (value >= 30) return "medium";
  return "low";
}

function heatRisk(feelsLikeF?: number, tempF?: number): WeatherRiskLevel {
  const value = feelsLikeF ?? tempF;
  if (value == null) return "low";
  if (value >= 100) return "high";
  if (value >= 92) return "medium";
  return "low";
}

function windRisk(windMph?: number, gustMph?: number): WeatherRiskLevel {
  const value = Math.max(windMph ?? 0, gustMph ?? 0);
  if (value >= 25) return "high";
  if (value >= 15) return "medium";
  return "low";
}

function stormRisk(hour?: WeatherHour, day?: WeatherDay): WeatherRiskLevel {
  const condition = `${hour?.conditionText ?? ""} ${day?.conditionText ?? ""}`.toLowerCase();
  const chance = hour?.chanceOfThunderPct ?? day?.chanceOfThunderPct;
  if (chance != null && chance >= 25) return "high";
  if (chance != null && chance > 0) return "medium";
  if (condition.includes("thunder") || condition.includes("lightning")) return "high";
  return "low";
}

function alertRisk(alerts: WeatherAlert[]): WeatherRiskLevel {
  if (
    alerts.some(
      (alert) =>
        alert.severity === "Extreme" ||
        alert.severity === "Severe" ||
        alert.urgency === "Immediate"
    )
  ) {
    return "high";
  }
  if (alerts.length > 0) return "medium";
  return "low";
}

function isSevereOrImmediateAlert(alert: WeatherAlert): boolean {
  return (
    alert.severity === "Extreme" ||
    alert.severity === "Severe" ||
    alert.urgency === "Immediate"
  );
}

function isOutdoorFit(fits: ActivityWeatherFit[]): boolean {
  return fits.some((fit) =>
    [
      "outdoor_shaded",
      "outdoor_uncovered",
      "pool",
      "campfire",
      "outdoor_movie",
      "boat_dependent",
      "skyliner_dependent",
      "walking_heavy",
      "heat_sensitive",
      "storm_sensitive",
    ].includes(fit)
  );
}

function summarizeOutdoorFit(input: {
  fits: ActivityWeatherFit[];
  rainRisk: WeatherRiskLevel;
  stormRisk: WeatherRiskLevel;
  heatRisk: WeatherRiskLevel;
  windRisk: WeatherRiskLevel;
  alerts: WeatherAlert[];
}): OutdoorFit {
  if (alertRisk(input.alerts) === "high") return "unsafe";
  if (input.stormRisk === "high") return "poor";
  if (input.heatRisk === "high" && isOutdoorFit(input.fits)) return "poor";
  if (input.rainRisk === "high" && isOutdoorFit(input.fits)) return "mixed";
  if (
    input.rainRisk === "medium" ||
    input.heatRisk === "medium" ||
    input.windRisk === "medium"
  ) {
    return isOutdoorFit(input.fits) ? "mixed" : "good";
  }
  return isOutdoorFit(input.fits) ? "great" : "good";
}

export function inferActivityWeatherFit(
  item: {
    title: string;
    category: string;
    enrichment?: Pick<ActivityFactualEnrichment, "weatherDependency">;
  }
): ActivityWeatherFit[] {
  const text = `${item.title} ${item.category} ${item.enrichment?.weatherDependency ?? ""}`.toLowerCase();
  const fits = new Set<ActivityWeatherFit>();

  if (/indoor|arcade|craft|lobby|community hall|animation|learn to draw/.test(text)) {
    fits.add("indoor");
  }
  if (/covered|porch|pavilion/.test(text)) fits.add("covered");
  if (/pool|aquatic|swim/.test(text)) fits.add("pool");
  if (/campfire|s'more|smore/.test(text)) fits.add("campfire");
  if (/movie|under the stars/.test(text)) fits.add("outdoor_movie");
  if (/boat|ferry|water taxi|marina/.test(text)) fits.add("boat_dependent");
  if (/skyliner|gondola/.test(text)) fits.add("skyliner_dependent");
  if (/walk|trail|jog|run|scavenger|hunt/.test(text)) fits.add("walking_heavy");
  if (/outdoor|lawn|courtyard|beach|fireworks|pageant/.test(text)) {
    fits.add("outdoor_uncovered");
  }
  if (/heat|sun|midday/.test(text)) fits.add("heat_sensitive");
  if (/weather|lightning|storm|rain/.test(text)) fits.add("storm_sensitive");

  if (fits.size === 0) fits.add("mostly_indoor");
  return Array.from(fits);
}

export function selectWeatherHour(input: {
  snapshot?: WeatherSnapshot | null;
  startsAt: Date;
  endsAt: Date;
}): WeatherHour | undefined {
  const hours = input.snapshot?.hourly ?? [];
  if (hours.length === 0) return undefined;
  const start = input.startsAt.getTime();
  const end = input.endsAt.getTime();
  return (
    hours.find((hour) => {
      const time = new Date(hour.time).getTime();
      return time >= start && time <= end;
    }) ??
    hours.reduce<WeatherHour | undefined>((closest, hour) => {
      if (!closest) return hour;
      const currentDistance = Math.abs(new Date(hour.time).getTime() - start);
      const closestDistance = Math.abs(new Date(closest.time).getTime() - start);
      return currentDistance < closestDistance ? hour : closest;
    }, undefined)
  );
}

export function selectWeatherDay(input: {
  snapshot?: WeatherSnapshot | null;
  startsAt: Date;
}): WeatherDay | undefined {
  const date = input.startsAt.toISOString().slice(0, 10);
  return input.snapshot?.daily.find((day) => day.date === date) ?? input.snapshot?.daily[0];
}

export function calculateWeatherRisk(input: {
  hour?: WeatherHour;
  day?: WeatherDay;
  alerts?: WeatherAlert[];
  fits?: ActivityWeatherFit[];
}): WeatherRisk {
  const alerts = input.alerts ?? [];
  const fits = input.fits ?? ["mostly_indoor"];
  const rainRisk = pctRisk(input.hour?.chanceOfRainPct ?? input.day?.chanceOfRainPct);
  const calculatedStormRisk = maxRisk(stormRisk(input.hour, input.day), alertRisk(alerts));
  const calculatedHeatRisk = heatRisk(
    input.hour?.feelsLikeF,
    input.hour?.tempF ?? input.day?.avgTempF ?? input.day?.maxTempF
  );
  const calculatedWindRisk = windRisk(
    input.hour?.windMph ?? input.day?.maxWindMph,
    input.hour?.gustMph
  );
  const overallOutdoorFit = summarizeOutdoorFit({
    fits,
    rainRisk,
    stormRisk: calculatedStormRisk,
    heatRisk: calculatedHeatRisk,
    windRisk: calculatedWindRisk,
    alerts,
  });

  return {
    overallOutdoorFit,
    rainRisk,
    stormRisk: calculatedStormRisk,
    heatRisk: calculatedHeatRisk,
    windRisk: calculatedWindRisk,
    indoorBackupRecommended:
      overallOutdoorFit === "mixed" ||
      overallOutdoorFit === "poor" ||
      overallOutdoorFit === "unsafe",
    outdoorActivitiesLikelyAffected:
      calculatedStormRisk === "high" ||
      rainRisk === "high" ||
      calculatedWindRisk === "high",
    poolActivitiesLikelyAffected:
      calculatedStormRisk !== "low" || rainRisk === "high" || calculatedWindRisk === "high",
    campfiresLikelyAffected:
      calculatedStormRisk !== "low" || rainRisk !== "low" || calculatedWindRisk !== "low",
    outdoorMoviesLikelyAffected:
      calculatedStormRisk !== "low" || rainRisk !== "low" || calculatedWindRisk === "high",
    skylinerCaution: calculatedStormRisk !== "low" || calculatedWindRisk === "high",
    boatCaution: calculatedStormRisk !== "low" || calculatedWindRisk !== "low",
  };
}

export type WeatherVisualState =
  | "normal"
  | "rain"
  | "heat"
  | "storm"
  | "official_alert"
  | "stale"
  | "unavailable";

export type WeatherActionGuidance =
  | "good_now"
  | "go_earlier"
  | "choose_covered_backup"
  | "stay_inside"
  | "official_alert";

export type WeatherDecisionLabel =
  | "Good for outdoor plans"
  | "Use indoor backups first"
  | "Heat caution"
  | "Storm risk"
  | "Rain nearby"
  | "Transportation-sensitive weather";

export const WEATHER_DECISION_LABELS = {
  goodForOutdoorPlans: "Good for outdoor plans",
  useIndoorBackupsFirst: "Use indoor backups first",
  heatCaution: "Heat caution",
  stormRisk: "Storm risk",
  rainNearby: "Rain nearby",
  transportationSensitiveWeather: "Transportation-sensitive weather",
} as const satisfies Record<string, WeatherDecisionLabel>;

export function weatherDecisionLabelForGuidance(
  weather?: Pick<WeatherForTimeSpan, "actionGuidance" | "nearTermRain" | "risk"> | null
): WeatherDecisionLabel | undefined {
  if (!weather) return undefined;
  if (
    weather.actionGuidance === "official_alert" ||
    weather.actionGuidance === "stay_inside" ||
    weather.risk.stormRisk === "high" ||
    weather.nearTermRain?.answer === "storm_alert"
  ) {
    return WEATHER_DECISION_LABELS.stormRisk;
  }
  if (weather.risk.heatRisk !== "low") {
    return WEATHER_DECISION_LABELS.heatCaution;
  }
  if (
    weather.risk.windRisk !== "low" ||
    weather.risk.boatCaution ||
    weather.risk.skylinerCaution
  ) {
    return WEATHER_DECISION_LABELS.transportationSensitiveWeather;
  }
  if (
    weather.nearTermRain?.answer === "likely" ||
    weather.nearTermRain?.answer === "possible" ||
    weather.risk.rainRisk !== "low"
  ) {
    return WEATHER_DECISION_LABELS.rainNearby;
  }
  if (weather.actionGuidance === "choose_covered_backup") {
    return WEATHER_DECISION_LABELS.useIndoorBackupsFirst;
  }
  return WEATHER_DECISION_LABELS.goodForOutdoorPlans;
}

export interface WeatherGuidanceDecision {
  safetyLevel: "normal" | "caution" | "danger";
  decisionState: import("@/lib/weather/types").WeatherDecisionState;
  actionGuidance: WeatherActionGuidance;
  visualState: WeatherVisualState;
  headline: string;
  recommendedAction: string;
  affectedActivityTags: ActivityWeatherFit[];
}

function hasOutdoorSensitiveTag(tags: ActivityWeatherFit[]): boolean {
  return tags.some((tag) =>
    [
      "outdoor_uncovered",
      "outdoor_shaded",
      "pool",
      "campfire",
      "outdoor_movie",
      "boat_dependent",
      "skyliner_dependent",
      "walking_heavy",
      "storm_sensitive",
    ].includes(tag)
  );
}

function chooseWeatherActionGuidance(input: {
  risk: WeatherRisk;
  alerts?: WeatherAlert[];
  activityWeatherTags?: ActivityWeatherFit[];
  forecastStatus?: ForecastStatus;
}): WeatherActionGuidance {
  const alerts = input.alerts ?? [];
  const tags = input.activityWeatherTags ?? [];
  const severeAlert = alerts.some(isSevereOrImmediateAlert);
  const outdoorSensitive = hasOutdoorSensitiveTag(tags);

  if (severeAlert) return "official_alert";
  if (input.risk.stormRisk === "high") return "stay_inside";
  if (input.risk.rainRisk === "high" && outdoorSensitive) {
    return "choose_covered_backup";
  }
  if (
    outdoorSensitive &&
    (input.risk.rainRisk === "medium" ||
      input.risk.heatRisk === "medium" ||
      input.risk.windRisk === "medium")
  ) {
    return "go_earlier";
  }
  if (input.forecastStatus === "stale" || input.forecastStatus === "unavailable") {
    return "go_earlier";
  }
  return "good_now";
}

export function getWeatherGuidance(input: {
  risk: WeatherRisk;
  alerts?: WeatherAlert[];
  activityWeatherTags?: ActivityWeatherFit[];
  forecastStatus?: ForecastStatus;
}): WeatherGuidanceDecision {
  const alerts = input.alerts ?? [];
  const tags = input.activityWeatherTags ?? [];
  const severeAlert = alerts.find(
    (alert) =>
      alert.severity === "Extreme" ||
      alert.severity === "Severe" ||
      alert.urgency === "Immediate"
  );
  const actionGuidance = chooseWeatherActionGuidance(input);

  if (severeAlert) {
    return {
      safetyLevel: "danger",
      decisionState: "official_alert_follow_guidance",
      actionGuidance,
      visualState: "official_alert",
      headline: "Official weather alert in effect",
      recommendedAction: severeAlert.instruction ?? "Follow official guidance and move indoors if instructed.",
      affectedActivityTags: tags,
    };
  }

  if (input.forecastStatus === "stale" || input.forecastStatus === "unavailable") {
    return {
      safetyLevel: "caution",
      decisionState: "good_with_caveat",
      actionGuidance,
      visualState: input.forecastStatus,
      headline: "Weather guidance needs a fresh check",
      recommendedAction: "Keep the plan visible, but confirm conditions before leaving.",
      affectedActivityTags: tags,
    };
  }

  if (input.risk.stormRisk === "high" && hasOutdoorSensitiveTag(tags)) {
    return {
      safetyLevel: "danger",
      decisionState: "avoid_outdoor",
      actionGuidance,
      visualState: "storm",
      headline: "Stay indoors for storm-sensitive plans",
      recommendedAction: "Avoid outdoor, pool, campfire, boat, and Skyliner-dependent plans until risk drops.",
      affectedActivityTags: tags,
    };
  }

  if (input.risk.rainRisk === "high" && hasOutdoorSensitiveTag(tags)) {
    return {
      safetyLevel: "caution",
      decisionState: "indoor_backup_recommended",
      actionGuidance,
      visualState: "rain",
      headline: "Rain backup recommended",
      recommendedAction: "Add a nearby indoor backup before you commit to this plan.",
      affectedActivityTags: tags,
    };
  }

  if (
    input.risk.heatRisk === "high" &&
    tags.some((tag) =>
      ["walking_heavy", "heat_sensitive", "outdoor_uncovered", "pool"].includes(tag)
    )
  ) {
    return {
      safetyLevel: "caution",
      decisionState: "bring_backup",
      actionGuidance,
      visualState: "heat",
      headline: "Heat-friendly backup recommended",
      recommendedAction: "Bring water, shade time, and an indoor reset option.",
      affectedActivityTags: tags,
    };
  }

  if (input.risk.overallOutdoorFit === "great" || input.risk.overallOutdoorFit === "good") {
    return {
      safetyLevel: "normal",
      decisionState: "go",
      actionGuidance,
      visualState: "normal",
      headline: "Outdoor activities look reasonable right now",
      recommendedAction: "Outdoor activities are reasonable right now. Keep checking for rain, lightning, heat, or wind.",
      affectedActivityTags: [],
    };
  }

  return {
    safetyLevel: "caution",
    decisionState: "good_with_caveat",
    actionGuidance,
    visualState: "normal",
    headline: "Good with a caveat",
    recommendedAction: "Keep a flexible backup nearby.",
    affectedActivityTags: tags,
  };
}

function buildHeadline(input: {
  forecastStatus: ForecastStatus;
  risk: WeatherRisk;
  alerts: WeatherAlert[];
  conditionText?: string;
}): string {
  if (input.alerts.length > 0 && input.risk.stormRisk === "high") {
    return "Official weather alert in effect";
  }
  if (input.forecastStatus === "not_available_yet") {
    return "Forecast appears closer to the date";
  }
  if (input.forecastStatus === "unavailable") {
    return "Weather is temporarily unavailable";
  }
  if (input.risk.stormRisk === "high") return "Storms could interrupt outdoor plans";
  if (input.risk.rainRisk === "high") return "Rain could reshape this window";
  if (input.risk.heatRisk === "high") return "Heat will matter for this plan";
  if (input.risk.overallOutdoorFit === "great") return "Weather looks good for outdoor time";
  return input.conditionText ? `${input.conditionText} for this window` : "Weather looks workable";
}

function buildSummary(input: {
  forecastStatus: ForecastStatus;
  risk: WeatherRisk;
  alerts: WeatherAlert[];
  rainChancePct?: number;
  conditionText?: string;
}): string {
  if (input.forecastStatus === "not_available_yet") {
    return "This event is outside the useful free forecast window, so show schedule guidance and invite a later recheck.";
  }
  if (input.forecastStatus === "unavailable") {
    return "Keep the activity visible, but do not make weather-specific promises until a provider responds.";
  }
  if (input.alerts.length > 0) {
    return "Lead with the official alert, then steer guests toward flexible indoor or covered backups.";
  }
  if (input.risk.indoorBackupRecommended) {
    return `Build the day with a nearby backup${
      input.rainChancePct != null ? `; rain chance is ${input.rainChancePct}%` : ""
    }.`;
  }
  return input.conditionText
    ? `${input.conditionText} is reasonable right now. Keep checking for rain, lightning, heat, or wind.`
    : "Outdoor activities are reasonable right now. Keep checking for rain, lightning, heat, or wind.";
}

function nearTermHours(input: {
  snapshot?: WeatherSnapshot | null;
  now: Date;
  startsAt: Date;
  endsAt: Date;
}): WeatherHour[] {
  const hours = input.snapshot?.hourly ?? [];
  const startWindow = input.now.getTime() - 15 * 60 * 1000;
  const endWindow = Math.max(
    input.endsAt.getTime(),
    input.startsAt.getTime() + 60 * 60 * 1000
  );
  return hours.filter((hour) => {
    const time = new Date(hour.time).getTime();
    return time >= startWindow && time <= endWindow;
  });
}

export function buildNearTermRainSignal(input: {
  startsAt: Date;
  endsAt: Date;
  now: Date;
  snapshot?: WeatherSnapshot | null;
  alerts?: WeatherAlert[];
}): NearTermRainSignal | undefined {
  if (process.env.WEATHER_NOWCAST_ENABLED === "false") return undefined;

  const startsInMinutes = Math.round(
    (input.startsAt.getTime() - input.now.getTime()) / (60 * 1000)
  );
  const base = {
    startsInMinutes,
    windowMinutes: 120,
    notRadarConfirmed: true,
    generatedAt: input.now.toISOString(),
  };

  if (startsInMinutes < 0 || startsInMinutes > 120) {
    return {
      ...base,
      answer: "unknown",
      headline: "Near-term rain check is closer to the event",
      summary: "This signal appears for events starting within about two hours.",
      detail: "Outside the near-term window",
      source: "forecast_unavailable",
      sourceLabel: "Near-term forecast",
    };
  }

  const severeAlert = (input.alerts ?? []).find(isSevereOrImmediateAlert);
  if (severeAlert) {
    trackWeatherEvent("weather_near_term_rain_view", {
      source: "nws_alert",
      answer: "storm_alert",
      hoursOut: startsInMinutes / 60,
    });
    return {
      ...base,
      answer: "storm_alert",
      headline: "Official storm alert near this plan",
      summary: "Follow official guidance before relying on outdoor or transportation-sensitive plans.",
      detail: "Official NWS alert · not radar-confirmed by After the Parks",
      source: "nws_alert",
      sourceLabel: "Official NWS alert",
    };
  }

  const hours = nearTermHours(input);
  if (!input.snapshot || hours.length === 0) {
    return {
      ...base,
      answer: "unknown",
      headline: "Near-term rain guidance is unavailable",
      summary: "Keep the plan visible, but confirm conditions before leaving.",
      detail: "Provider unavailable",
      source: "forecast_unavailable",
      sourceLabel: "Near-term forecast",
    };
  }

  const rainChancePct = Math.max(...hours.map((hour) => hour.chanceOfRainPct ?? 0));
  const thunderChancePct = Math.max(...hours.map((hour) => hour.chanceOfThunderPct ?? 0));
  const precipIn = Math.max(...hours.map((hour) => hour.precipIn ?? 0));
  const conditionText = hours.map((hour) => hour.conditionText.toLowerCase()).join(" ");
  const mentionsRain = /rain|shower|drizzle|storm|thunder/.test(conditionText);
  const sourceLabel = "Hourly forecast";

  if (rainChancePct >= 60 || thunderChancePct >= 25 || precipIn >= 0.05) {
    trackWeatherEvent("weather_near_term_rain_view", {
      source: "weatherapi_hourly",
      answer: "likely",
      hoursOut: startsInMinutes / 60,
      rainChancePct,
    });
    return {
      ...base,
      answer: "likely",
      headline: "Rain likely in the next hour",
      summary: "Use an indoor or covered backup before committing to outdoor plans.",
      detail: "Hourly forecast · not radar-confirmed",
      source: "weatherapi_hourly",
      sourceLabel,
      rainChancePct,
      thunderChancePct,
      precipIn,
    };
  }

  if (rainChancePct >= 30 || precipIn > 0 || mentionsRain) {
    trackWeatherEvent("weather_near_term_rain_view", {
      source: "weatherapi_hourly",
      answer: "possible",
      hoursOut: startsInMinutes / 60,
      rainChancePct,
    });
    return {
      ...base,
      answer: "possible",
      headline: "Rain may affect the next hour.",
      summary: "Keep the plan flexible and choose a nearby backup.",
      detail: "Hourly forecast · not radar-confirmed",
      source: "weatherapi_hourly",
      sourceLabel,
      rainChancePct,
      thunderChancePct,
      precipIn,
    };
  }

  trackWeatherEvent("weather_near_term_rain_view", {
    source: "weatherapi_hourly",
    answer: "unlikely",
    hoursOut: startsInMinutes / 60,
    rainChancePct,
  });
  return {
    ...base,
    answer: "unlikely",
    headline: "Rain looks unlikely in the next hour",
    summary: "Rain looks unlikely in the next hour. This is forecast guidance, not live radar.",
    detail: "Hourly forecast · not radar-confirmed",
    source: "weatherapi_hourly",
    sourceLabel,
    rainChancePct,
    thunderChancePct,
    precipIn,
  };
}

export function buildWeatherGuidanceForTimeSpan(input: {
  locationKey: WeatherLocationKey;
  startsAt?: string | null;
  endsAt?: string | null;
  snapshot?: WeatherSnapshot | null;
  alerts?: WeatherAlert[];
  now?: Date;
  officialAlertStatus?: OfficialAlertStatus;
  activityWeatherFits?: ActivityWeatherFit[];
  includeNearTerm?: boolean;
  precipMap?: WeatherPrecipMapContext;
  timeBasis?: WeatherTimeBasis;
  timeBasisLabel?: string;
}): WeatherForTimeSpan {
  const now = input.now ?? new Date();
  const startsAt = input.startsAt ? new Date(input.startsAt) : now;
  const endsAt = input.endsAt ? new Date(input.endsAt) : defaultWeatherEndTime(startsAt);
  const isPast = endsAt.getTime() < now.getTime();
  const representativeStart = startsAt.getTime() < now.getTime() && !isPast ? now : startsAt;
  const snapshot = input.snapshot ?? null;
  const alerts = input.alerts ?? [];
  const hour = selectWeatherHour({ snapshot, startsAt: representativeStart, endsAt });
  const day = selectWeatherDay({ snapshot, startsAt: representativeStart });
  const risk = snapshot
    ? calculateWeatherRisk({
        hour,
        day,
        alerts,
        fits: input.activityWeatherFits,
      })
    : alerts.length > 0
      ? calculateWeatherRisk({ alerts, fits: input.activityWeatherFits })
      : DEFAULT_WEATHER_RISK;
  const forecastStatus: ForecastStatus = snapshot
    ? snapshot.isStale
      ? "stale"
      : "available"
    : startsAt.getTime() - now.getTime() > 15 * 24 * 60 * 60 * 1000
      ? "not_available_yet"
      : "unavailable";
  const conditionText = hour?.conditionText ?? day?.conditionText ?? snapshot?.conditionText;
  const rainChancePct = hour?.chanceOfRainPct ?? day?.chanceOfRainPct;
  const headline = buildHeadline({
    forecastStatus,
    risk,
    alerts,
    conditionText,
  });
  const nearTermRain =
    input.includeNearTerm === false
      ? undefined
      : buildNearTermRainSignal({
          startsAt: representativeStart,
          endsAt,
          now,
          snapshot,
          alerts,
      });
  const actionGuidance = chooseWeatherActionGuidance({
    risk,
    alerts,
    activityWeatherTags: input.activityWeatherFits,
    forecastStatus,
  });

  return {
    locationKey: input.locationKey,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    isPast,
    shouldDisplayWeather: !isPast,
    representativeHour: (hour?.time ? new Date(hour.time) : representativeStart).toISOString(),
    iconKey: hour?.iconKey ?? day?.iconKey ?? snapshot?.iconKey ?? "unknown",
    headline,
    plainLanguageSummary: buildSummary({
      forecastStatus,
      risk,
      alerts,
      rainChancePct,
      conditionText,
    }),
    tempF: hour?.tempF ?? day?.avgTempF ?? day?.maxTempF ?? snapshot?.tempF,
    tempC: hour?.tempC ?? day?.avgTempC ?? day?.maxTempC ?? snapshot?.tempC,
    feelsLikeF: hour?.feelsLikeF ?? snapshot?.feelsLikeF,
    feelsLikeC: hour?.feelsLikeC ?? snapshot?.feelsLikeC,
    rainChancePct,
    thunderChancePct: hour?.chanceOfThunderPct ?? day?.chanceOfThunderPct,
    windMph: hour?.windMph ?? day?.maxWindMph,
    windKph: hour?.windKph ?? day?.maxWindKph,
    hourlyBreakdown: hour ? [hour] : [],
    risk,
    nwsAlerts: alerts,
    fetchedAt: snapshot?.fetchedAt ?? now.toISOString(),
    expiresAt: snapshot?.expiresAt ?? now.toISOString(),
    staleAfter: snapshot?.staleAfter ?? now.toISOString(),
    isStale: snapshot?.isStale ?? false,
    forecastProvider: snapshot?.provider,
    forecastConfidence: snapshot?.confidence,
    forecastStatus,
    officialAlertStatus: input.officialAlertStatus ?? "available",
    actionGuidance,
    timeBasis: input.timeBasis,
    timeBasisLabel: input.timeBasisLabel,
    nearTermRain,
    precipMap: input.precipMap,
  };
}
