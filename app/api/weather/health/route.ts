import { publicCacheJson } from "@/lib/cache/http";
import { getCachedNwsAlerts, getCachedWeatherSnapshot } from "@/lib/weather/cache";
import { isVisualCrossingAvailable, isWeatherApiAvailable } from "@/lib/weather/forecastHorizon";
import { WEATHER_LOCATIONS } from "@/lib/weather/locations";
import { trackWeatherEvent } from "@/lib/weather/analytics";

export async function GET() {
  const weatherApiEnabled = isWeatherApiAvailable();
  const nwsAlertsEnabled =
    process.env.NWS_ALERTS_ENABLED !== "false" && Boolean(process.env.NWS_USER_AGENT);
  const locations = Object.values(WEATHER_LOCATIONS);
  const checkedAt = new Date().toISOString();

  const rows = await Promise.all(
    locations.map(async (location) => {
      const [snapshotResult, alertsResult] = await Promise.allSettled([
        weatherApiEnabled
          ? getCachedWeatherSnapshot({ location, provider: "weatherapi" })
          : Promise.resolve(null),
        nwsAlertsEnabled ? getCachedNwsAlerts({ location }) : Promise.resolve([]),
      ]);
      const snapshot =
        snapshotResult.status === "fulfilled" ? snapshotResult.value : null;
      const alerts =
        alertsResult.status === "fulfilled" ? alertsResult.value : [];

      return {
        locationKey: location.key,
        forecastStatus:
          !weatherApiEnabled
            ? "disabled"
            : snapshotResult.status === "rejected"
              ? "error"
              : snapshot?.isStale
                ? "stale"
                : snapshot
                  ? "available"
                  : "unavailable",
        latestFetchedAt: snapshot?.fetchedAt ?? null,
        staleAfter: snapshot?.staleAfter ?? null,
        activeAlertCount: alerts.length,
        alertStatus:
          !nwsAlertsEnabled
            ? "disabled"
            : alertsResult.status === "rejected"
              ? "error"
              : "available",
      };
    })
  );

  const degraded = rows.some(
    (row) =>
      row.forecastStatus === "error" ||
      row.forecastStatus === "stale" ||
      row.alertStatus === "error"
  );
  if (degraded) {
    trackWeatherEvent("weather_health_degraded", {
      checkedAt,
      degradedCount: rows.filter(
        (row) =>
          row.forecastStatus === "error" ||
          row.forecastStatus === "stale" ||
          row.alertStatus === "error"
      ).length,
    });
  }

  return publicCacheJson({
    ok: !degraded,
    checkedAt,
    providers: {
      weatherapi: weatherApiEnabled ? "enabled" : "disabled",
      nwsAlerts: nwsAlertsEnabled ? "enabled" : "disabled",
      visualCrossing: isVisualCrossingAvailable() ? "enabled" : "disabled",
      routeWeather: process.env.ROUTE_WEATHER_ENABLED === "true" ? "enabled" : "disabled",
    },
    flags: {
      weatherNowcast: process.env.WEATHER_NOWCAST_ENABLED !== "false",
      precipMaps: process.env.WEATHER_PRECIP_MAPS_ENABLED !== "false",
      warmCache: process.env.WEATHER_WARM_CACHE_ENABLED !== "false",
    },
    locations: rows,
  }, "weather");
}
