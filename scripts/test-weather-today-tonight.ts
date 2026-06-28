import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const today = readFileSync("components/atlas/TodayClient.tsx", "utf8");
assert.match(today, /WeatherStatusStrip/);
assert.doesNotMatch(today, /WeatherWindowStrip/);
assert.doesNotMatch(today, /WeatherStoryStrip/);
assert.match(today, /\/api\/weather\/guidance\/batch/);
assert.match(today, /initialPageWeather/);
assert.match(today, /initialWeatherById/);
assert.match(today, /useState<WeatherForTimeSpan \| null>\(initialPageWeather\)/);
assert.match(today, /useState<Record<string, WeatherForTimeSpan>>\(initialWeatherById\)/);
assert.doesNotMatch(today, /weather=indoor/);
assert.match(today, /Covered Options/);
assert.match(today, /weatherById/);

const tonight = readFileSync("components/atlas/TonightClient.tsx", "utf8");
assert.match(tonight, /WeatherStatusStrip/);
assert.doesNotMatch(tonight, /WeatherWindowStrip/);
assert.doesNotMatch(tonight, /WeatherStoryStrip/);
assert.doesNotMatch(tonight, /StormModeBanner/);
assert.doesNotMatch(tonight, /NightfallTimeline/);
assert.match(tonight, /ForecastTimeline/);
assert.match(tonight, /timelineNow/);
assert.match(tonight, /initialTimelineNowIso/);
assert.match(tonight, /new Date\(initialTimelineNowIso\)/);
assert.match(tonight, /\/api\/weather\/guidance\/batch/);
assert.match(tonight, /initialPageWeather/);
assert.match(tonight, /initialWeatherById/);
assert.match(tonight, /useState<WeatherForTimeSpan \| null>\(initialPageWeather\)/);
assert.match(tonight, /useState<Record<string, WeatherForTimeSpan>>\(initialWeatherById\)/);
assert.doesNotMatch(tonight, /weather=indoor/);
assert.match(tonight, /Covered Options/);
assert.match(tonight, /weatherById/);
assert.match(tonight, /datedMovies/);
assert.match(tonight, /weatherForMovie/);

const todayPage = readFileSync("app/today/page.tsx", "utf8");
assert.match(todayPage, /loadWeatherGuidanceForLocation/);
assert.match(todayPage, /loadWeatherByOccurrence/);
assert.match(todayPage, /weatherQueryForActivity/);
assert.match(todayPage, /initialPageWeather=\{initialPageWeather\}/);
assert.match(todayPage, /initialWeatherById=\{initialWeatherById\}/);

const tonightPage = readFileSync("app/tonight/page.tsx", "utf8");
assert.match(tonightPage, /loadWeatherGuidanceForLocation/);
assert.match(tonightPage, /loadWeatherByOccurrence/);
assert.match(tonightPage, /weatherQueryForActivity/);
assert.match(tonightPage, /weatherQueryForMovie/);
assert.match(tonightPage, /initialPageWeather=\{initialPageWeather\}/);
assert.match(tonightPage, /initialWeatherById=\{initialWeatherById\}/);
assert.match(tonightPage, /initialTimelineNowIso=\{weatherNow\.toISOString\(\)\}/);

const resortPage = readFileSync("app/resorts/[slug]/page.tsx", "utf8");
assert.match(resortPage, /WeatherFreshnessLine/);
assert.match(resortPage, /NearTermRainLine/);
assert.match(resortPage, /WeatherPrecipMapPreview/);
assert.doesNotMatch(resortPage, /WeatherWindowStrip/);
assert.doesNotMatch(resortPage, /WeatherStoryStrip/);
assert.match(resortPage, /loadWeatherGuidanceForLocation/);

const activityPage = readFileSync("app/activities/[slug]/page.tsx", "utf8");
assert.match(activityPage, /WeatherFreshnessLine/);
assert.match(activityPage, /NearTermRainLine/);
assert.match(activityPage, /WeatherPrecipMapPreview/);
assert.match(activityPage, /loadWeatherGuidanceForLocation/);
assert.match(activityPage, /weatherQueryForActivity/);

console.log("Today and tonight weather integration contracts passed.");
