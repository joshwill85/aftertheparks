import "server-only";

import { WEATHER_LOCATIONS } from "@/lib/weather/locations";
import type { WeatherLocation } from "@/lib/weather/types";
import {
  dedupeAlertsByProviderAlertId,
  filterActiveAlerts,
  getCachedNwsAlerts,
  getCachedWeatherSnapshot,
  isStale,
  singleFlight,
  weatherCacheKeys,
  WEATHER_QUOTA_MODES,
} from "@/lib/weather/hardCache";

export const WEATHER_TTL_SECONDS = {
  weatherApiCurrentHourly: 15 * 60,
  weatherApiDaily: 4 * 60 * 60,
  nwsAlertsNormal: 60,
  nwsAlertsSevereMinimum: 30,
  nwsForecastHourly: 60 * 60,
  nwsForecastPeriod: 4 * 60 * 60,
  nwsPointMetadata: 24 * 60 * 60,
  visualCrossingPlanning: 6 * 60 * 60,
};

export {
  dedupeAlertsByProviderAlertId,
  filterActiveAlerts,
  getCachedNwsAlerts,
  getCachedWeatherSnapshot,
  isStale,
  singleFlight,
  weatherCacheKeys,
  WEATHER_QUOTA_MODES,
};

export async function getCachedNwsAlertsForAllWdw() {
  const locations = Object.values(WEATHER_LOCATIONS).filter(
    (location) => location.key !== "all_wdw"
  );
  const results = await Promise.allSettled(
    locations.map((location: WeatherLocation) => getCachedNwsAlerts({ location }))
  );
  return dedupeAlertsByProviderAlertId(results);
}
