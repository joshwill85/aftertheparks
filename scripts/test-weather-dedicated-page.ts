import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const pagePath = "app/weather/page.tsx";
assert.ok(existsSync(pagePath), "Dedicated Disney weather page should exist at /weather.");

const page = readFileSync(pagePath, "utf8");

for (const key of [
  "magic_kingdom_resort_area",
  "epcot_boardwalk_area",
  "skyliner_area",
  "animal_kingdom_lodge_area",
  "disney_springs_area",
  "all_wdw",
]) {
  assert.match(page, new RegExp(key), `/weather should include ${key}.`);
}

assert.match(page, /"Now" \| "Next" \| "Later"/, "/weather should model Now, Next, Later states.");
assert.match(page, /Now, Next, Later/, "/weather should render Now, Next, Later copy.");

for (const label of ["Hourly", "Daily", "Weekly"]) {
  assert.match(page, new RegExp(`${label} Forecast|${label} By Day`), `/weather should render ${label}.`);
}

assert.match(page, /getCachedWeatherSnapshot/, "/weather should use cached forecast snapshots.");
assert.match(page, /getCachedNwsAlerts/, "/weather should include official NWS alerts.");
assert.match(page, /buildWeatherGuidanceForTimeSpan/, "/weather should use shared guidance logic.");
assert.match(page, /WeatherFreshnessLine/, "/weather should show freshness/confidence copy.");
assert.match(page, /NearTermRainLine/, "/weather should show near-term rain guidance.");
assert.match(page, /WeatherPrecipMapPreview/, "/weather should show precipitation map context.");
assert.match(page, /id=\{weatherAreaAnchorId\(area\.location\.key\)\}/, "/weather should expose area anchors for icon deep links.");

const header = readFileSync("components/layout/SiteHeader.tsx", "utf8");
assert.match(header, /href:\s*"\/weather"[\s\S]*label:\s*"Weather"/, "Desktop nav should link to /weather.");

const sitemap = readFileSync("app/sitemap.ts", "utf8");
assert.match(sitemap, /seoEntry\(base,\s*"\/weather"/, "Sitemap should include /weather.");

console.log("Dedicated weather page contract passed.");
