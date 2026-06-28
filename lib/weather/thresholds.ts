export const ACTIVITY_WEATHER_THRESHOLDS = {
  outdoor_movie: {
    rainChanceHighPct: 50,
    thunderChanceHighPct: 20,
    windGustCautionMph: 20,
  },
  pool: {
    thunderChanceHighPct: 10,
    heatIndexCautionF: 95,
  },
  campfire: {
    rainChanceHighPct: 40,
    thunderChanceHighPct: 15,
    windGustCautionMph: 18,
  },
  boat: {
    thunderChanceHighPct: 15,
    windGustCautionMph: 20,
  },
  skyliner: {
    thunderChanceHighPct: 15,
    windGustCautionMph: 25,
  },
  outdoor_walk: {
    rainChanceHighPct: 50,
    heatIndexCautionF: 95,
  },
  grandparents_plan: {
    heatIndexCautionF: 90,
    walkingHeavyPenalty: true,
  },
  toddlers_plan: {
    heatIndexCautionF: 90,
    rainChanceHighPct: 45,
    shortDurationPreferred: true,
  },
  first_night_plan: {
    walkingHeavyPenalty: true,
    multiHopPenalty: true,
  },
} as const;

export type ActivityWeatherThresholdKey = keyof typeof ACTIVITY_WEATHER_THRESHOLDS;
