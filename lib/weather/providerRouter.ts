import {
  chooseForecastHorizon,
  isVisualCrossingAvailable,
  isWeatherApiAvailable,
} from "@/lib/weather/forecastHorizon";
import { trackWeatherEvent } from "@/lib/weather/analytics";
import { getWeatherLocationForResort, parseWeatherLocationKey } from "@/lib/weather/locations";
import type {
  ForecastConfidence,
  WeatherLocationKey,
  WeatherTimeBasis,
} from "@/lib/weather/types";

export type WeatherGuidanceBatchOccurrence = {
  id: string;
  resortSlug?: string;
  locationKey?: WeatherLocationKey;
  startsAt: string;
  endsAt?: string;
  activitySlug?: string;
  timeBasis?: WeatherTimeBasis;
  timeBasisLabel?: string;
};

export function chooseWeatherProviderForTimeSpan(input: {
  now: Date;
  startsAt?: string | null;
  endsAt?: string | null;
  weatherApiAvailable?: boolean;
  visualCrossingAvailable?: boolean;
}): {
  provider: "weatherapi" | "nws_forecast" | "visual_crossing" | "none";
  confidence: ForecastConfidence;
  allowEventTimeDecisions: boolean;
  reason: string;
} {
  void input.endsAt;
  const selection = chooseForecastHorizon({
    now: input.now,
    startsAt: input.startsAt,
    weatherApiAvailable: input.weatherApiAvailable ?? isWeatherApiAvailable(),
    visualCrossingAvailable:
      input.visualCrossingAvailable ?? isVisualCrossingAvailable(),
  });
  const hoursOut = input.startsAt
    ? (new Date(input.startsAt).getTime() - input.now.getTime()) / (1000 * 60 * 60)
    : undefined;
  trackWeatherEvent("weather_provider_route_selected", {
    provider: selection.provider,
    confidence: selection.confidence,
    hoursOut,
  });
  return {
    provider:
      selection.provider === "nws_alerts" ? "none" : selection.provider,
    confidence: selection.confidence,
    allowEventTimeDecisions: selection.allowEventTimeDecisions,
    reason: selection.reason,
  };
}

export function groupOccurrencesByWeatherLocation(
  occurrences: WeatherGuidanceBatchOccurrence[]
): Record<WeatherLocationKey, WeatherGuidanceBatchOccurrence[]> {
  const grouped: Record<WeatherLocationKey, WeatherGuidanceBatchOccurrence[]> = {
    magic_kingdom_resort_area: [],
    epcot_boardwalk_area: [],
    skyliner_area: [],
    animal_kingdom_lodge_area: [],
    disney_springs_area: [],
    all_wdw: [],
  };

  for (const occurrence of occurrences) {
    const key = occurrence.locationKey
      ? parseWeatherLocationKey(occurrence.locationKey)
      : getWeatherLocationForResort(occurrence.resortSlug).key;
    grouped[key].push(occurrence);
  }

  return grouped;
}
