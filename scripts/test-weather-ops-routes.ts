import assert from "node:assert/strict";
import { GET as warmWeather } from "@/app/api/cron/weather-warm/route";
import { GET as weatherHealth } from "@/app/api/weather/health/route";

async function main() {
  const unauthorized = await warmWeather(
    new Request("https://aftertheparks.com/api/cron/weather-warm")
  );
  assert.equal(unauthorized.status, 401);

  process.env.CRON_SECRET = "test-cron-secret";
  process.env.WEATHER_WARM_CACHE_ENABLED = "false";
  const disabled = await warmWeather(
    new Request("https://aftertheparks.com/api/cron/weather-warm", {
      headers: { authorization: "Bearer test-cron-secret" },
    })
  );
  assert.equal(disabled.status, 200);
  assert.equal((await disabled.json()).disabled, true);

  process.env.WEATHERAPI_ENABLED = "false";
  process.env.NWS_ALERTS_ENABLED = "false";
  const health = await weatherHealth();
  assert.equal(health.status, 200);
  const body = await health.json();
  assert.equal(body.providers.weatherapi, "disabled");
  assert.equal(body.providers.nwsAlerts, "disabled");
  assert.equal(typeof body.flags.weatherNowcast, "boolean");
  assert.equal(JSON.stringify(body).includes("WEATHERAPI_KEY"), false);

  console.log("Weather ops routes passed.");
}

void main();
