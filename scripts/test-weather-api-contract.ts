import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guidance = readFileSync("app/api/weather/guidance/route.ts", "utf8");
assert.match(guidance, /Promise\.allSettled/);
assert.match(guidance, /getCachedWeatherSnapshot/);
assert.match(guidance, /getCachedNwsAlerts/);
assert.match(guidance, /buildWeatherGuidanceForTimeSpan/);
assert.match(guidance, /officialAlertStatus/);
assert.match(guidance, /forecastStatus/);
assert.match(guidance, /includeNearTerm/);
assert.match(guidance, /includePrecipMap/);
assert.match(guidance, /nearTermRain/);
assert.match(guidance, /precipMap/);

const batch = readFileSync("app/api/weather/guidance/batch/route.ts", "utf8");
assert.match(batch, /validateWeatherGuidanceBatchRequest/);
assert.match(batch, /validateWeatherGuidanceBatchOptions/);
assert.match(batch, /groupOccurrencesByWeatherLocation/);
assert.match(batch, /getCachedNwsAlerts/);
assert.match(batch, /getCachedNwsAlertsForAllWdw/);
assert.match(batch, /Promise\.allSettled/);
assert.match(batch, /officialAlertStatus/);
assert.match(batch, /alertState\.alerts/);
assert.match(batch, /weatherById/);
assert.match(batch, /includeNearTerm/);

const validation = readFileSync("lib/weather/apiValidation.ts", "utf8");
assert.match(validation, /validateWeatherGuidanceSearchParams/);
assert.match(validation, /validateWeatherGuidanceBatchOptions/);
assert.match(validation, /slice\(0, 150\)/);

console.log("Weather API contract passed.");
