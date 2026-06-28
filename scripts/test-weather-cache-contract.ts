import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getCachedWeatherSnapshot,
  singleFlight,
  weatherCacheKeys,
  WEATHER_QUOTA_MODES,
} from "@/lib/weather/cache";
import { getWeatherLocation } from "@/lib/weather/locations";

assert.equal(
  weatherCacheKeys.weatherApi3Day("all_wdw"),
  "weather:v1:weatherapi:all_wdw:days3:aqi1:alerts0"
);
assert.equal(
  weatherCacheKeys.nwsAlerts("all_wdw"),
  "weather:v1:nws-alerts:all_wdw"
);
assert.equal(
  weatherCacheKeys.visualCrossingDaily15("all_wdw"),
  "weather:v1:visualcrossing:all_wdw:days15:include-days"
);
assert.ok(
  WEATHER_QUOTA_MODES.normal.weatherApiTtlSeconds <
    WEATHER_QUOTA_MODES.conserve.weatherApiTtlSeconds
);
assert.equal(
  WEATHER_QUOTA_MODES.critical.weatherApiDisabledForNonCriticalSurfaces,
  true
);

const hardCache = readFileSync("lib/weather/hardCache.ts", "utf8");
assert.match(hardCache, /type WeatherAlertCacheEntry/);
assert.match(hardCache, /NWS_ALERT_CACHE_TTL_MS\s*=\s*60 \* 1000/);
assert.match(hardCache, /isUsableAlertCache/);
assert.match(hardCache, /weather_alert_cache_state/);
assert.match(hardCache, /stale_after/);
assert.match(hardCache, /isStale\(snapshot\.fetchedAt, snapshot\.staleAfter, now\)/);
assert.match(hardCache, /active_alert_count/);
assert.doesNotMatch(
  hardCache,
  /const memoryAlerts = new Map<string, WeatherAlert\[\]>/,
  "NWS alert memory cache must include fetched/stale timestamps, not bare alert arrays"
);

async function main() {
  let calls = 0;
  const [first, second] = await Promise.all([
    singleFlight("weather-test-single-flight", async () => {
      calls += 1;
      return "shared-result";
    }),
    singleFlight("weather-test-single-flight", async () => {
      calls += 1;
      return "unexpected";
    }),
  ]);
  assert.equal(first, "shared-result");
  assert.equal(second, "shared-result");
  assert.equal(calls, 1);

  const location = getWeatherLocation("all_wdw");
  const snapshot = await getCachedWeatherSnapshot({
    location,
    provider: "weatherapi",
  });
  assert.equal(snapshot?.locationKey, "all_wdw");
  assert.equal(snapshot?.provider, "weatherapi");
  assert.equal(snapshot?.confidence, "near_term_hourly");

  const noSnapshot = await getCachedWeatherSnapshot({
    location,
    provider: "none",
  });
  assert.equal(noSnapshot, null);

  console.log("weather cache contract passed");
}

void main();
