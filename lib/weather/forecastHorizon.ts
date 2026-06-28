import type { ForecastConfidence, WeatherProviderId } from "@/lib/weather/types";

export const FORECAST_HORIZON_POLICY = {
  hours0To72: {
    preferredProvider: "weatherapi",
    fallbackProvider: "nws_forecast",
    confidence: "near_term_hourly",
    allowEventTimeDecisions: true,
  },
  hours72To168: {
    preferredProvider: "nws_forecast",
    fallbackProvider: "visual_crossing",
    confidence: "official_7_day",
    allowEventTimeDecisions: true,
  },
  days8To15: {
    preferredProvider: "visual_crossing",
    fallbackProvider: null,
    confidence: "long_range_planning",
    allowEventTimeDecisions: false,
  },
  beyondDay15: {
    preferredProvider: null,
    fallbackProvider: null,
    confidence: "not_available_yet",
    allowEventTimeDecisions: false,
  },
} as const;

export function isWeatherApiAvailable() {
  return (
    process.env.WEATHERAPI_ENABLED === "true" &&
    Boolean(process.env.WEATHERAPI_KEY) &&
    process.env.WEATHERAPI_PLAN === "free" &&
    Number(process.env.WEATHERAPI_FORECAST_DAYS ?? "3") <= 3
  );
}

export function isVisualCrossingAvailable() {
  return (
    process.env.VISUAL_CROSSING_ENABLED === "true" &&
    Boolean(process.env.VISUAL_CROSSING_KEY) &&
    Number(process.env.VISUAL_CROSSING_FORECAST_DAYS ?? "15") <= 15
  );
}

export function chooseForecastHorizon(input: {
  now: Date;
  startsAt?: string | null;
  weatherApiAvailable?: boolean;
  visualCrossingAvailable?: boolean;
}): {
  provider: WeatherProviderId;
  confidence: ForecastConfidence;
  allowEventTimeDecisions: boolean;
  reason: string;
} {
  if (!input.startsAt) {
    return {
      provider: "nws_forecast",
      confidence: "official_7_day",
      allowEventTimeDecisions: false,
      reason: "No event time; use the general official WDW-area forecast.",
    };
  }

  const startsAt = new Date(input.startsAt);
  const hoursOut = (startsAt.getTime() - input.now.getTime()) / (1000 * 60 * 60);

  if (hoursOut < 0) {
    return {
      provider: "none",
      confidence: "not_available_yet",
      allowEventTimeDecisions: false,
      reason: "Past events do not show weather.",
    };
  }

  if (hoursOut <= 72) {
    if (input.weatherApiAvailable === false) {
      return {
        provider: "nws_forecast",
        confidence: "official_7_day",
        allowEventTimeDecisions: true,
        reason: "WeatherAPI disabled or unavailable; using NWS forecast.",
      };
    }
    return {
      provider: "weatherapi",
      confidence: "near_term_hourly",
      allowEventTimeDecisions: true,
      reason: "WeatherAPI Free supports rich 0-3 day forecast.",
    };
  }

  if (hoursOut <= 168) {
    return {
      provider: "nws_forecast",
      confidence: "official_7_day",
      allowEventTimeDecisions: true,
      reason: "NWS supports free official forecast through 7 days.",
    };
  }

  if (hoursOut <= 15 * 24) {
    if (input.visualCrossingAvailable === false) {
      return {
        provider: "none",
        confidence: "not_available_yet",
        allowEventTimeDecisions: false,
        reason: "Long-range outlook provider is disabled.",
      };
    }
    return {
      provider: "visual_crossing",
      confidence: "long_range_planning",
      allowEventTimeDecisions: false,
      reason: "Visual Crossing Free supports a 15-day planning outlook.",
    };
  }

  return {
    provider: "none",
    confidence: "not_available_yet",
    allowEventTimeDecisions: false,
    reason: "Forecast appears closer to the plan date.",
  };
}
