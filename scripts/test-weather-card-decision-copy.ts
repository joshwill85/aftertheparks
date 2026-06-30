import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const eventCard = readFileSync("components/events/EventCard.tsx", "utf8");
const guidance = readFileSync("lib/weather/guidance.ts", "utf8");
const statusStrip = readFileSync("components/weather/WeatherStatusStrip.tsx", "utf8");
const eventWeatherSignal = readFileSync("components/weather/EventWeatherSignal.tsx", "utf8");
const weatherIconButton = readFileSync("components/weather/WeatherIconButton.tsx", "utf8");
const forecastCompare = readFileSync("components/weather/ForecastCompare.tsx", "utf8");

for (const label of [
  "Good for outdoor plans",
  "Use indoor backups first",
  "Heat caution",
  "Storm risk",
  "Rain nearby",
  "Transportation-sensitive weather",
]) {
  assert.match(guidance, new RegExp(label), `${label} decision copy missing`);
}

for (const source of [statusStrip, eventWeatherSignal, weatherIconButton]) {
  assert.match(source, /weatherDecisionLabelForGuidance/);
}
assert.match(forecastCompare, /WEATHER_DECISION_LABELS/);

assert.match(eventCard, /weatherDecisionLabel/);
assert.match(guidance, /Outdoor activities are reasonable right now\. Keep checking for rain, lightning, heat, or wind\./);
assert.match(guidance, /Rain may affect the next hour\./);
assert.match(guidance, /Rain looks unlikely in the next hour\. This is forecast guidance, not live radar\./);
assert.match(weatherIconButton, /formatTempDual/);

console.log("Weather card decision copy passed.");
