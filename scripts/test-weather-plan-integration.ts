import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const planItemSource = readFileSync("components/plan/PlanItem.tsx", "utf8");
assert.match(planItemSource, /EventWeatherSignal/);
assert.match(planItemSource, /resortSlug=\{item\.resortSlug\}/);
assert.match(planItemSource, /startsAt=\{item\.startDateTime\}/);
assert.match(planItemSource, /endsAt=\{item\.endDateTime\}/);

const css = readFileSync("src/styles/polish.css", "utf8");
assert.match(css, /\.plan-item__weather/);

const planTimelineSource = readFileSync("components/plan/PlanTimeline.tsx", "utf8");
assert.match(planTimelineSource, /includePrecipMap/);
assert.match(planTimelineSource, /onApplyWeatherNote/);
assert.match(planTimelineSource, /backupHref/);

const planWeatherPanel = readFileSync("components/weather/PlanWeatherPanel.tsx", "utf8");
assert.match(planWeatherPanel, /Move earlier/);
assert.match(planWeatherPanel, /Keep as weather-dependent/);
assert.doesNotMatch(planWeatherPanel, /disabled/);

console.log("weather plan integration contract passed");
