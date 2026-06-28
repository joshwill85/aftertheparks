import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const analytics = readFileSync("lib/weather/analytics.ts", "utf8");
for (const event of [
  "weather_module_impression",
  "weather_backup_cta_click",
  "weather_plan_change_prompt",
  "weather_plan_resilience_view",
  "weather_window_impression",
  "weather_story_chapter_click",
  "nws_alert_banner_view",
  "nws_forecast_used",
  "visual_crossing_outlook_used",
  "weather_provider_error",
  "weather_stale_served",
  "weather_provider_route_selected",
  "weather_api_quota_near_limit",
  "weather_near_term_rain_view",
  "weather_precip_map_view",
  "weather_warm_cache_result",
  "weather_health_degraded",
]) {
  assert.match(analytics, new RegExp(event), `${event} missing`);
}

const weatherapi = readFileSync("lib/weather/weatherapi.ts", "utf8");
assert.match(weatherapi, /WEATHERAPI_KEY/);
assert.match(weatherapi, /WEATHERAPI_FORECAST_DAYS/);
assert.doesNotMatch(weatherapi, /console\.log\(.*key/i);

const nws = readFileSync("lib/weather/nws.ts", "utf8");
assert.match(nws, /NWS_USER_AGENT/);
assert.match(nws, /User-Agent/);

const nwsForecast = readFileSync("lib/weather/nwsForecast.ts", "utf8");
assert.match(nwsForecast, /weather_provider_error|nws_forecast_used/);

const visualCrossing = readFileSync("lib/weather/visualcrossing.ts", "utf8");
assert.match(visualCrossing, /VISUAL_CROSSING_KEY/);
assert.match(visualCrossing, /visual_crossing_outlook_used/);
assert.match(visualCrossing, /attribution/i);

const router = readFileSync("lib/weather/providerRouter.ts", "utf8");
assert.match(router, /weather_provider_route_selected/);

const envPush = readFileSync("scripts/setup-weather-env-push.sh", "utf8");
for (const key of [
  "WEATHERAPI_KEY",
  "WEATHERAPI_ENABLED",
  "WEATHERAPI_PLAN",
  "WEATHERAPI_FORECAST_DAYS",
  "WEATHER_NOWCAST_ENABLED",
  "WEATHER_PRECIP_MAPS_ENABLED",
  "WEATHER_WARM_CACHE_ENABLED",
  "NWS_USER_AGENT",
  "NWS_ALERTS_ENABLED",
  "NWS_FORECAST_ENABLED",
  "NWS_FORECAST_HOURS",
]) {
  assert.match(envPush, new RegExp(key), `${key} missing from weather env push`);
}
assert.match(envPush, /push_var WEATHERAPI_KEY true/);
assert.doesNotMatch(envPush, /VISUAL_CROSSING_KEY/);
assert.doesNotMatch(envPush, /ROUTE_WEATHER_ENABLED/);

const verifyDb = readFileSync("scripts/verify-weather-db.sh", "utf8");
assert.match(verifyDb, /supabase db push --linked --dry-run/);
assert.match(verifyDb, /supabase db query --linked --file supabase\/sql\/verify_weather_guidance\.sql/);

const weatherWarm = readFileSync("app/api/cron/weather-warm/route.ts", "utf8");
assert.match(weatherWarm, /CRON_SECRET/);
assert.match(weatherWarm, /weather_warm_cache_result/);
assert.match(weatherWarm, /WEATHER_WARM_CACHE_ENABLED/);

const weatherHealth = readFileSync("app/api/weather/health/route.ts", "utf8");
assert.match(weatherHealth, /weather_health_degraded/);
assert.match(weatherHealth, /visualCrossing/);
assert.doesNotMatch(weatherHealth, /WEATHERAPI_KEY/);

const vercelConfig = readFileSync("vercel.json", "utf8");
assert.match(vercelConfig, /\/api\/cron\/weather-warm/);

const runbook = readFileSync("docs/weather-launch-runbook.md", "utf8");
assert.match(runbook, /setup:weather-env:push/);
assert.match(runbook, /verify:weather-db/);
assert.match(runbook, /Rollback Flags/);

const packageJson = readFileSync("package.json", "utf8");
assert.match(packageJson, /setup:weather-env:push/);
assert.match(packageJson, /verify:weather-db/);

console.log("Weather observability contracts passed.");
