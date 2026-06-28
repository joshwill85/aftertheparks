import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const today = readFileSync("components/atlas/TodayClient.tsx", "utf8");
assert.match(today, /WeatherStatusStrip/);
assert.match(today, /WeatherWindowStrip/);
assert.match(today, /WeatherStoryStrip/);
assert.match(today, /\/api\/weather\/guidance\/batch/);
assert.match(today, /weather=indoor/);
assert.match(today, /weatherById/);

const tonight = readFileSync("components/atlas/TonightClient.tsx", "utf8");
assert.match(tonight, /WeatherStatusStrip/);
assert.match(tonight, /WeatherWindowStrip/);
assert.match(tonight, /WeatherStoryStrip/);
assert.match(tonight, /StormModeBanner/);
assert.match(tonight, /ForecastTimeline/);
assert.match(tonight, /\/api\/weather\/guidance\/batch/);
assert.match(tonight, /weather=indoor/);
assert.match(tonight, /weatherById/);

const resortPage = readFileSync("app/resorts/[slug]/page.tsx", "utf8");
assert.match(resortPage, /WeatherFreshnessLine/);
assert.match(resortPage, /NearTermRainLine/);
assert.match(resortPage, /WeatherPrecipMapPreview/);
assert.match(resortPage, /buildWeatherGuidanceForTimeSpan/);
assert.match(resortPage, /getCachedWeatherSnapshot/);

const activityPage = readFileSync("app/activities/[slug]/page.tsx", "utf8");
assert.match(activityPage, /WeatherFreshnessLine/);
assert.match(activityPage, /NearTermRainLine/);
assert.match(activityPage, /WeatherPrecipMapPreview/);
assert.match(activityPage, /buildWeatherGuidanceForTimeSpan/);
assert.match(activityPage, /getCachedWeatherSnapshot/);

console.log("Today and tonight weather integration contracts passed.");
