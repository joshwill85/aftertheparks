import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const appRoutes = readdirSync("app", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const forbidden of [
  "disney-world-weather-today",
  "weather-at-disney-resorts",
  "rain-at-disney-world-today",
]) {
  assert.equal(appRoutes.includes(forbidden), false, `${forbidden} route must not exist`);
}

for (const file of [
  "app/resorts/[slug]/page.tsx",
  "app/activities/[slug]/page.tsx",
  "app/guides/[slug]/page.tsx",
]) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /weather/i, `${file} should include weather integration`);
}

const resortPage = readFileSync("app/resorts/[slug]/page.tsx", "utf8");
assert.match(resortPage, /ResortWeatherPersonality/);
assert.match(resortPage, /WeatherWindowStrip/);
assert.match(resortPage, /rainy-day-options/);

const activityPage = readFileSync("app/activities/[slug]/page.tsx", "utf8");
assert.match(activityPage, /ForecastCompare/);
assert.match(activityPage, /ActivityWeatherBadge/);

const firstNight = readFileSync("app/guides/[slug]/page.tsx", "utf8");
assert.match(firstNight, /WeatherStatusStrip/);
assert.match(firstNight, /weather/i);

const legacyFirstNight = readFileSync("app/guides/first-night-at-the-resort/page.tsx", "utf8");
assert.match(
  legacyFirstNight,
  /permanentRedirect/,
  "legacy first-night guide route should permanently redirect to the canonical SEO slug"
);
assert.match(
  legacyFirstNight,
  /first-night-at-disney-resort/,
  "legacy first-night guide route should target /guides/first-night-at-disney-resort"
);

console.log("Weather SEO guardrails passed.");
