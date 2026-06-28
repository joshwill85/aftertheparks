export type WeatherLocationKey =
  | "magic_kingdom_resort_area"
  | "epcot_boardwalk_area"
  | "skyliner_area"
  | "animal_kingdom_lodge_area"
  | "disney_springs_area"
  | "all_wdw";

export type WeatherIconKey =
  | "sunny_day"
  | "clear_night"
  | "partly_cloudy_day"
  | "partly_cloudy_night"
  | "cloudy"
  | "overcast"
  | "mist"
  | "fog"
  | "haze"
  | "smoke"
  | "dust"
  | "patchy_rain"
  | "light_rain"
  | "moderate_rain"
  | "heavy_rain"
  | "rain_shower"
  | "torrential_rain"
  | "drizzle"
  | "freezing_drizzle"
  | "freezing_rain"
  | "thunder_possible"
  | "rain_with_thunder"
  | "snow"
  | "sleet"
  | "ice_pellets"
  | "wind"
  | "heat"
  | "official_alert"
  | "unknown";

export type WeatherRiskLevel = "low" | "medium" | "high";
export type OutdoorFit = "great" | "good" | "mixed" | "poor" | "unsafe";

export type ForecastConfidence =
  | "current_conditions"
  | "near_term_hourly"
  | "official_7_day"
  | "long_range_planning"
  | "not_available_yet";

export type WeatherProviderId =
  | "weatherapi"
  | "nws_alerts"
  | "nws_forecast"
  | "visual_crossing"
  | "none";

export type WeatherProviderRole =
  | "friendly_current_0_3_day"
  | "official_alerts"
  | "official_0_7_day_forecast"
  | "free_8_15_day_planning_outlook";

export type OfficialAlertStatus = "available" | "stale" | "unavailable";
export type ForecastStatus =
  | "available"
  | "stale"
  | "unavailable"
  | "not_available_yet";
export type WeatherTimeBasis =
  | "exact_event_time"
  | "flexible_activity_window"
  | "page_area_window";

export type NearTermRainAnswer =
  | "unlikely"
  | "possible"
  | "likely"
  | "storm_alert"
  | "unknown";

export interface WeatherLocation {
  key: WeatherLocationKey;
  name: string;
  lat: number;
  lon: number;
  timezone: "America/New_York";
}

export interface WeatherHour {
  source: "weatherapi" | "nws_forecast" | "visual_crossing";
  time: string;
  conditionText: string;
  conditionCode?: number;
  providerConditionCode?: string | number;
  iconKey: WeatherIconKey;
  tempF: number;
  tempC: number;
  feelsLikeF?: number;
  feelsLikeC?: number;
  chanceOfRainPct?: number;
  chanceOfThunderPct?: number;
  precipIn?: number;
  precipMm?: number;
  windMph?: number;
  windKph?: number;
  gustMph?: number;
  gustKph?: number;
  uvIndex?: number;
  isDay: boolean;
}

export interface WeatherAttribution {
  provider: "weatherapi" | "nws" | "visual_crossing";
  label: string;
  required: boolean;
  href?: string;
}

export interface WeatherDay {
  source: "weatherapi" | "nws_forecast" | "visual_crossing";
  date: string;
  conditionText: string;
  iconKey: WeatherIconKey;
  maxTempF?: number;
  maxTempC?: number;
  minTempF?: number;
  minTempC?: number;
  avgTempF?: number;
  avgTempC?: number;
  chanceOfRainPct?: number;
  chanceOfThunderPct?: number;
  totalPrecipIn?: number;
  totalPrecipMm?: number;
  maxWindMph?: number;
  maxWindKph?: number;
  uvIndex?: number;
  confidence: ForecastConfidence;
}

export interface WeatherAlert {
  provider: "nws";
  id: string;
  event: string;
  headline: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  urgency: "Immediate" | "Expected" | "Future" | "Past" | "Unknown";
  certainty: "Observed" | "Likely" | "Possible" | "Unlikely" | "Unknown";
  effective: string;
  expires: string;
  areaDesc?: string;
  instruction?: string;
  description?: string;
  sourceUrl?: string;
}

export interface NearTermRainSignal {
  answer: NearTermRainAnswer;
  headline: string;
  summary: string;
  detail: string;
  startsInMinutes: number;
  windowMinutes: number;
  source: "weatherapi_hourly" | "nws_alert" | "forecast_unavailable";
  sourceLabel: string;
  notRadarConfirmed: boolean;
  rainChancePct?: number;
  thunderChancePct?: number;
  precipIn?: number;
  generatedAt: string;
}

export interface WeatherPrecipMapFrame {
  validAt: string;
  tileUrlTemplate: string;
  previewTileUrl: string;
}

export interface WeatherPrecipMapContext {
  provider: "weatherapi";
  label: string;
  description: string;
  locationKey: WeatherLocationKey;
  center: { lat: number; lon: number };
  zoom: number;
  attribution: WeatherAttribution;
  frames: WeatherPrecipMapFrame[];
}

export interface WeatherRisk {
  overallOutdoorFit: OutdoorFit;
  rainRisk: WeatherRiskLevel;
  stormRisk: WeatherRiskLevel;
  heatRisk: WeatherRiskLevel;
  windRisk: WeatherRiskLevel;
  indoorBackupRecommended: boolean;
  outdoorActivitiesLikelyAffected: boolean;
  poolActivitiesLikelyAffected: boolean;
  campfiresLikelyAffected: boolean;
  outdoorMoviesLikelyAffected: boolean;
  skylinerCaution: boolean;
  boatCaution: boolean;
}

export const DEFAULT_WEATHER_RISK: WeatherRisk = {
  overallOutdoorFit: "good",
  rainRisk: "low",
  stormRisk: "low",
  heatRisk: "low",
  windRisk: "low",
  indoorBackupRecommended: false,
  outdoorActivitiesLikelyAffected: false,
  poolActivitiesLikelyAffected: false,
  campfiresLikelyAffected: false,
  outdoorMoviesLikelyAffected: false,
  skylinerCaution: false,
  boatCaution: false,
};

export interface WeatherSnapshot {
  locationKey: WeatherLocationKey;
  provider: WeatherProviderId;
  confidence: ForecastConfidence;
  fetchedAt: string;
  observedAt?: string;
  forecastUpdatedAt?: string;
  expiresAt: string;
  staleAfter: string;
  isStale: boolean;
  conditionText?: string;
  iconKey?: WeatherIconKey;
  tempF?: number;
  tempC?: number;
  feelsLikeF?: number;
  feelsLikeC?: number;
  risk: WeatherRisk;
  hourly: WeatherHour[];
  daily: WeatherDay[];
  attribution?: WeatherAttribution;
}

export interface WeatherForTimeSpan {
  locationKey: WeatherLocationKey;
  startsAt: string;
  endsAt?: string;
  isPast: boolean;
  shouldDisplayWeather: boolean;
  representativeHour: string;
  iconKey: WeatherIconKey;
  headline: string;
  plainLanguageSummary: string;
  tempF?: number;
  tempC?: number;
  feelsLikeF?: number;
  feelsLikeC?: number;
  rainChancePct?: number;
  thunderChancePct?: number;
  windMph?: number;
  windKph?: number;
  hourlyBreakdown: WeatherHour[];
  risk: WeatherRisk;
  nwsAlerts: WeatherAlert[];
  fetchedAt: string;
  expiresAt: string;
  staleAfter: string;
  isStale: boolean;
  forecastProvider?: WeatherProviderId;
  forecastConfidence?: ForecastConfidence;
  forecastStatus: ForecastStatus;
  officialAlertStatus: OfficialAlertStatus;
  actionGuidance?: import("@/lib/weather/guidance").WeatherActionGuidance;
  timeBasis?: WeatherTimeBasis;
  timeBasisLabel?: string;
  nearTermRain?: NearTermRainSignal;
  precipMap?: WeatherPrecipMapContext;
}

export type ActivityWeatherFit =
  | "indoor"
  | "covered"
  | "mostly_indoor"
  | "outdoor_shaded"
  | "outdoor_uncovered"
  | "pool"
  | "campfire"
  | "outdoor_movie"
  | "boat_dependent"
  | "skyliner_dependent"
  | "walking_heavy"
  | "low_walking"
  | "heat_sensitive"
  | "storm_sensitive";

export type WeatherDecisionState =
  | "go"
  | "good_with_caveat"
  | "bring_backup"
  | "indoor_backup_recommended"
  | "likely_affected"
  | "avoid_outdoor"
  | "official_alert_follow_guidance";

export type WeatherWindowAction =
  | "go_now"
  | "shift_earlier"
  | "save_for_later"
  | "bring_backup"
  | "avoid_for_now"
  | "stay_indoors"
  | "official_alert";

export interface WeatherWindow {
  id: string;
  locationKey: WeatherLocationKey;
  startsAt: string;
  endsAt: string;
  title: string;
  chapterLabel:
    | "Sunshine Start"
    | "Heat Buildup"
    | "Rain Window"
    | "Starlight Reset"
    | "Storm Mode"
    | "Indoor Backup Window";
  action: WeatherWindowAction;
  headline: string;
  plainLanguageSummary: string;
  recommendedActivityTags: ActivityWeatherFit[];
  cautionActivityTags: ActivityWeatherFit[];
  avoidActivityTags: ActivityWeatherFit[];
  deepLinks: Array<{ label: string; href: string }>;
}

export type PlanResilienceLabel = "strong" | "flexible" | "fragile" | "unsafe";

export interface PlanResilienceScore {
  label: PlanResilienceLabel;
  score: number;
  headline: string;
  reasons: string[];
  improvements: Array<{
    action:
      | "add_same_resort_indoor_backup"
      | "move_pool_time_earlier"
      | "replace_outdoor_movie"
      | "reduce_transport_weather_risk"
      | "mark_weather_dependent"
      | "stay_indoors";
    label: string;
    href?: string;
  }>;
}

export interface StormModeState {
  active: boolean;
  level: "none" | "caution" | "official_alert" | "danger";
  headline: string;
  guidance: string;
  suppressOutdoorRecommendations: boolean;
  promoteIndoorOptions: boolean;
  affectedTags: ActivityWeatherFit[];
  source: "nws" | "forecast_risk";
}

export interface ResortWeatherProfile {
  resortSlug: string;
  indoorBackupDepth: "low" | "medium" | "high";
  coveredWanderingFit: "low" | "medium" | "high";
  outdoorExposure: "low" | "medium" | "high";
  transportWeatherSensitivity: "low" | "medium" | "high";
  heatWalkingIntensity: "low" | "medium" | "high";
  rainyDaySummary: string;
  heatDaySummary: string;
  stormDaySummary: string;
}

export interface RouteWeatherLegImpact {
  fromResortSlug: string;
  toResortSlug: string;
  transportMode: "walk" | "boat" | "monorail" | "skyliner" | "bus" | "rideshare";
  routeType: "direct" | "one_transfer" | "multi_transfer";
  expectedStartAt: string;
  expectedEndAt: string;
  weatherLocationKeys: WeatherLocationKey[];
  weatherDecisionState: WeatherDecisionState;
  caution: string;
}
