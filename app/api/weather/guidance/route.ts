import { publicCacheJson } from "@/lib/cache/http";
import { getCachedNwsAlerts, getCachedNwsAlertsForAllWdw, getCachedWeatherSnapshot } from "@/lib/weather/cache";
import {
  getWeatherLocation,
  getWeatherLocationForResort,
  parseWeatherLocationKey,
} from "@/lib/weather/locations";
import { buildWeatherGuidanceForTimeSpan } from "@/lib/weather/guidance";
import { chooseWeatherProviderForTimeSpan } from "@/lib/weather/providerRouter";
import { validateWeatherGuidanceSearchParams } from "@/lib/weather/apiValidation";
import { getWeatherApiPrecipMapContext } from "@/lib/weather/precipMap";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { locationKey, resortSlug, startsAt, endsAt, includeNearTerm, includePrecipMap } =
    validateWeatherGuidanceSearchParams(searchParams);
  const location = locationKey
    ? getWeatherLocation(parseWeatherLocationKey(locationKey))
    : getWeatherLocationForResort(resortSlug);
  const selection = chooseWeatherProviderForTimeSpan({
    now: new Date(),
    startsAt,
    endsAt,
  });

  const [snapshotResult, alertsResult] = await Promise.allSettled([
    getCachedWeatherSnapshot({ location, provider: selection.provider }),
    location.key === "all_wdw"
      ? getCachedNwsAlertsForAllWdw()
      : getCachedNwsAlerts({ location }),
  ]);
  const snapshot =
    snapshotResult.status === "fulfilled" ? snapshotResult.value : null;
  const alertState =
    alertsResult.status === "fulfilled"
      ? { status: "available" as const, alerts: alertsResult.value }
      : { status: "unavailable" as const, alerts: [] };
  const guidance = buildWeatherGuidanceForTimeSpan({
    locationKey: location.key,
    startsAt,
    endsAt,
    snapshot,
    alerts: alertState.alerts,
    officialAlertStatus: alertState.status,
    includeNearTerm,
    precipMap: includePrecipMap
      ? getWeatherApiPrecipMapContext({ location })
      : undefined,
  });

  return publicCacheJson({
    location,
    snapshot,
    guidance,
    alerts: alertState.alerts,
    nearTermRain: guidance.nearTermRain,
    precipMap: guidance.precipMap,
    officialAlertStatus: alertState.status,
    forecastStatus: guidance.forecastStatus,
  }, "weather");
}
