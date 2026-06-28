import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";

export type WeatherFit =
  | "indoor"
  | "covered"
  | "outdoor_ok"
  | "outdoor_weather_dependent"
  | "outdoor_not_rainy";

export type FitFlag = "yes" | "partial" | "no";
export type RiskLevel = "low" | "medium" | "high";

export interface ActivitySeoFit {
  weatherFit: WeatherFit;
  rainSafe: FitFlag;
  heatSafe: FitFlag;
  lightningRisk: boolean;
  requiresClearWeather: boolean;
  transportWeatherRisk: RiskLevel;
  backupActivitySlug?: string;
}

export type RouteType = "direct" | "one_transfer" | "multi_transfer";
export type TransportMode =
  | "monorail"
  | "skyliner"
  | "boat"
  | "walk"
  | "bus"
  | "rideshare";
export type TransferCount = 0 | 1 | "2_plus";

export interface RouteSeoFit {
  routeType: RouteType;
  transportMode: TransportMode;
  transferCount: TransferCount;
  parkTicketRequired: boolean;
  weatherExposure: RiskLevel;
  mobilityDifficulty: RiskLevel;
  recommendedForSeoGuide: boolean;
  caveat?: string;
}

export interface AudienceSeoFit {
  walkingIntensity: RiskLevel;
  seatingAvailable: FitFlag;
  noiseLevel: RiskLevel;
  shadeOrAc: FitFlag;
  strollerFriendly: FitFlag;
  wheelchairEcvFriendly: FitFlag;
  dateNightFit: FitFlag;
  teenIndependenceFit: FitFlag;
  durationMinutes?: number;
  reservationNeeded: FitFlag;
  costLevel: "free" | "low" | "moderate" | "high" | "varies";
  transportComplexity: RiskLevel;
  bestTimeOfDay: "morning" | "afternoon" | "evening" | "any";
  weatherFit: WeatherFit;
}

export interface SeoMistake {
  mistake: string;
  appliesToPages: string[];
  evidenceType:
    | "official_policy"
    | "community_pattern"
    | "editor_experience"
    | "data_pattern";
  severity: RiskLevel;
  fix: string;
  deepLink: string;
}

export const DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG: Record<string, ActivitySeoFit> = {
  "movies-under-the-stars": {
    weatherFit: "outdoor_weather_dependent",
    rainSafe: "no",
    heatSafe: "partial",
    lightningRisk: true,
    requiresClearWeather: true,
    transportWeatherRisk: "medium",
    backupActivitySlug: "arcades",
  },
  campfire: {
    weatherFit: "outdoor_weather_dependent",
    rainSafe: "no",
    heatSafe: "partial",
    lightningRisk: true,
    requiresClearWeather: true,
    transportWeatherRisk: "medium",
    backupActivitySlug: "community-halls",
  },
  "poolside-activities": {
    weatherFit: "outdoor_not_rainy",
    rainSafe: "no",
    heatSafe: "partial",
    lightningRisk: true,
    requiresClearWeather: true,
    transportWeatherRisk: "medium",
    backupActivitySlug: "crafts",
  },
  arcades: {
    weatherFit: "indoor",
    rainSafe: "yes",
    heatSafe: "yes",
    lightningRisk: false,
    requiresClearWeather: false,
    transportWeatherRisk: "low",
  },
  crafts: {
    weatherFit: "covered",
    rainSafe: "yes",
    heatSafe: "yes",
    lightningRisk: false,
    requiresClearWeather: false,
    transportWeatherRisk: "low",
  },
  "electrical-water-pageant": {
    weatherFit: "outdoor_weather_dependent",
    rainSafe: "partial",
    heatSafe: "yes",
    lightningRisk: true,
    requiresClearWeather: true,
    transportWeatherRisk: "medium",
    backupActivitySlug: "arcades",
  },
  fitness: {
    weatherFit: "outdoor_ok",
    rainSafe: "partial",
    heatSafe: "partial",
    lightningRisk: true,
    requiresClearWeather: false,
    transportWeatherRisk: "medium",
    backupActivitySlug: "arcades",
  },
  "community-halls": {
    weatherFit: "indoor",
    rainSafe: "yes",
    heatSafe: "yes",
    lightningRisk: false,
    requiresClearWeather: false,
    transportWeatherRisk: "low",
  },
};

export const DEFAULT_ROUTE_SEO_FIT_BY_CLUSTER: Record<string, RouteSeoFit> = {
  monorail: {
    routeType: "direct",
    transportMode: "monorail",
    transferCount: 0,
    parkTicketRequired: false,
    weatherExposure: "low",
    mobilityDifficulty: "low",
    recommendedForSeoGuide: true,
    caveat:
      "Some destinations may require connecting transportation; keep the main plan on the Magic Kingdom-area resort loop.",
  },
  skyliner: {
    routeType: "direct",
    transportMode: "skyliner",
    transferCount: 0,
    parkTicketRequired: false,
    weatherExposure: "high",
    mobilityDifficulty: "low",
    recommendedForSeoGuide: true,
    caveat: "Skyliner service can pause for weather, especially lightning.",
  },
  "disney-springs-resort-transfer": {
    routeType: "one_transfer",
    transportMode: "bus",
    transferCount: 1,
    parkTicketRequired: false,
    weatherExposure: "medium",
    mobilityDifficulty: "medium",
    recommendedForSeoGuide: false,
    caveat: DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary,
  },
  "bus-to-park-to-bus": {
    routeType: "multi_transfer",
    transportMode: "bus",
    transferCount: "2_plus",
    parkTicketRequired: false,
    weatherExposure: "medium",
    mobilityDifficulty: "high",
    recommendedForSeoGuide: false,
    caveat:
      "Use only when the guide explicitly labels the plan as advanced or multi-hop.",
  },
};

export const SEO_MISTAKE_LOG: SeoMistake[] = [
  {
    mistake: "Planning a rainy-day itinerary around outdoor movies, campfires, pools, or playgrounds.",
    appliesToPages: ["rainy_day", "first_night"],
    evidenceType: "data_pattern",
    severity: "high",
    fix: "Filter for indoor or covered activities first.",
    deepLink: "/today?weather=indoor",
  },
  {
    mistake: "Using Disney Springs as a free resort-transfer hub.",
    appliesToPages: ["no_ticket", "resort_hopping", "disney_springs_area"],
    evidenceType: "official_policy",
    severity: "high",
    fix: "Use a resort stay, dining/experience reservation, rideshare, or a direct official route that is currently allowed.",
    deepLink: "/source-and-accuracy-policy",
  },
  {
    mistake: "Building first-night plans around hard-to-reach reservations after a travel day.",
    appliesToPages: ["first_night", "couples", "families"],
    evidenceType: "editor_experience",
    severity: "medium",
    fix: "Start with tonight's activities at your own resort or a direct-route nearby resort.",
    deepLink: "/tonight",
  },
  {
    mistake: "Choosing grandparent-friendly plans without checking walking, seating, shade, or transfer complexity.",
    appliesToPages: ["grandparents", "multi_generational"],
    evidenceType: "editor_experience",
    severity: "medium",
    fix: "Prefer low-walking, seated, shaded or indoor, direct-route activities.",
    deepLink: "/resorts",
  },
];

export function isPrimaryRainyDayFit(fit: ActivitySeoFit): boolean {
  return (
    (fit.weatherFit === "indoor" || fit.weatherFit === "covered") &&
    fit.rainSafe === "yes" &&
    !fit.lightningRisk
  );
}

export function isRecommendedSeoRoute(route: RouteSeoFit): boolean {
  return (
    route.recommendedForSeoGuide &&
    !route.parkTicketRequired &&
    route.routeType !== "multi_transfer" &&
    route.transferCount !== "2_plus"
  );
}

export function weatherFitLabel(fit: ActivitySeoFit): string {
  if (isPrimaryRainyDayFit(fit)) return "Primary rainy-day fit";
  if (fit.rainSafe === "partial") return "Conditional weather fit";
  return "Not recommended in rain";
}
