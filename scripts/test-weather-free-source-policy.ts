import assert from "node:assert/strict";
import { WEATHER_SOURCE_POLICY } from "@/lib/weather/sourcePolicy";

assert.equal(
  WEATHER_SOURCE_POLICY.paidProvidersAllowed,
  false,
  "Weather MVP must not allow paid providers by default."
);
assert.equal(WEATHER_SOURCE_POLICY.weatherApi.maxForecastDaysOnFree, 3);
assert.equal(WEATHER_SOURCE_POLICY.weatherApi.useAlerts, false);
assert.equal(WEATHER_SOURCE_POLICY.nws.maxForecastHours, 168);
assert.equal(WEATHER_SOURCE_POLICY.nws.requiresUserAgent, true);
assert.equal(WEATHER_SOURCE_POLICY.visualCrossing.enabled, false);
assert.equal(WEATHER_SOURCE_POLICY.visualCrossing.maxForecastDaysOnFree, 15);
assert.equal(WEATHER_SOURCE_POLICY.visualCrossing.requiresAttribution, true);
assert.ok(
  WEATHER_SOURCE_POLICY.disallowedFreeMvpProviders.includes(
    "tomorrow_io_free_production"
  )
);
assert.ok(
  WEATHER_SOURCE_POLICY.disallowedFreeMvpProviders.includes(
    "open_meteo_hosted_free_for_commercial"
  )
);

console.log("weather free source policy contract passed");
