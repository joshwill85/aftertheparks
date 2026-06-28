import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "components/weather/WeatherIcon.tsx",
  "components/weather/WeatherIconButton.tsx",
  "components/weather/WeatherTimeSpanPopover.tsx",
  "components/weather/WeatherStatusStrip.tsx",
  "components/weather/NearTermRainLine.tsx",
  "components/weather/WeatherPrecipMapPreview.tsx",
  "components/weather/NwsAlertBanner.tsx",
  "components/weather/ForecastTimeline.tsx",
  "components/weather/ActivityWeatherBadge.tsx",
  "components/weather/WeatherWindowStrip.tsx",
  "components/weather/WeatherWindowCard.tsx",
  "components/weather/WeatherStoryStrip.tsx",
  "components/weather/PlanResilienceScore.tsx",
  "components/weather/StormModeBanner.tsx",
  "components/weather/StormModeActivitySuppression.tsx",
  "components/weather/ForecastCompare.tsx",
  "components/weather/ResortWeatherPersonality.tsx",
  "components/weather/RouteWeatherImpact.tsx",
];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /cdn\.weatherapi\.com|condition\.icon/,
    `${file} must not render WeatherAPI icons`
  );
}

const iconButton = readFileSync("components/weather/WeatherIconButton.tsx", "utf8");
assert.match(iconButton, /aria-label/);
assert.match(iconButton, /formatTempDual/);
assert.match(iconButton, /WeatherFreshnessLine/);

const popover = readFileSync("components/weather/WeatherTimeSpanPopover.tsx", "utf8");
assert.match(popover, /hourlyBreakdown/);
assert.match(popover, /nwsAlerts/);
assert.match(popover, /formatTempDual/);
assert.match(popover, /formatWindDual/);
assert.match(popover, /WeatherFreshnessLine/);
assert.match(popover, /NearTermRainLine/);
assert.match(popover, /WeatherPrecipMapPreview/);

const statusStrip = readFileSync("components/weather/WeatherStatusStrip.tsx", "utf8");
assert.match(statusStrip, /WeatherFreshnessLine/);
assert.match(statusStrip, /NearTermRainLine/);

const eventSignal = readFileSync("components/weather/EventWeatherSignal.tsx", "utf8");
assert.match(eventSignal, /WeatherFreshnessLine/);
assert.match(eventSignal, /nearTermRain/);

const nearTermRain = readFileSync("components/weather/NearTermRainLine.tsx", "utf8");
assert.match(nearTermRain, /not radar-confirmed|nearTermRainShortCopy/);

const precipMapPreview = readFileSync("components/weather/WeatherPrecipMapPreview.tsx", "utf8");
assert.match(precipMapPreview, /previewTileUrl/);
assert.match(precipMapPreview, /PrecipMapContext|precipMap/);

const freshness = readFileSync("lib/weather/freshness.ts", "utf8");
assert.match(freshness, /Updated \${minutes} min ago/);
assert.match(freshness, /Hourly forecast/);
assert.match(freshness, /weatherLocationLabel/);

const tokens = readFileSync("src/styles/tokens.css", "utf8");
for (const token of [
  "--weather-normal-bg",
  "--weather-rain-bg",
  "--weather-heat-bg",
  "--weather-storm-bg",
  "--weather-alert-bg",
  "--weather-stale-bg",
  "--weather-unavailable-bg",
]) {
  assert.match(tokens, new RegExp(token), `${token} missing`);
}

const stormMode = readFileSync("components/weather/StormModeBanner.tsx", "utf8");
assert.match(stormMode, /role="alert"/);
assert.match(stormMode, /Official/);

const windows = readFileSync("components/weather/WeatherWindowStrip.tsx", "utf8");
assert.match(windows, /WeatherWindowCard/);
assert.match(windows, /deepLinks/);

const story = readFileSync("components/weather/WeatherStoryStrip.tsx", "utf8");
assert.match(story, /chapters/);

const resilience = readFileSync("components/weather/PlanResilienceScore.tsx", "utf8");
assert.match(resilience, /score/);
assert.match(resilience, /improvements/);
assert.doesNotMatch(resilience, /disabled/);

const planWeatherPanel = readFileSync("components/weather/PlanWeatherPanel.tsx", "utf8");
assert.match(planWeatherPanel, /onApplyWeatherNote/);
assert.match(planWeatherPanel, /Add backup/);
assert.doesNotMatch(planWeatherPanel, /disabled/);

console.log("Weather UI contracts passed.");
