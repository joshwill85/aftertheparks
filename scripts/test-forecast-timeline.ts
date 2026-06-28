import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildForecastTimelineGroups,
  formatDisneyForecastTime,
} from "@/lib/weather/forecastTimeline";
import type { WeatherHour } from "@/lib/weather/types";

function hour(time: string, conditionText = "Mostly Cloudy"): WeatherHour {
  return {
    source: "weatherapi",
    time,
    conditionText,
    iconKey: "cloudy",
    tempF: 82,
    tempC: 28,
    isDay: false,
  };
}

assert.equal(
  formatDisneyForecastTime("2026-06-28T01:10:00.000Z"),
  "9:10 PM",
  "weather timeline times should always render in Disney local time"
);
assert.equal(
  formatDisneyForecastTime("2026-06-28T02:00:00.000Z"),
  "10 PM",
  "whole-hour weather timeline times should not show seconds"
);

const lateEveningGroups = buildForecastTimelineGroups({
  hours: [
    hour("2026-06-28T01:00:00.000Z", "Current nearby hour"),
    hour("2026-06-28T02:00:00.000Z", "Next hour"),
    hour("2026-06-28T03:00:00.000Z", "Two hours out"),
    hour("2026-06-28T17:00:00.000Z", "Tomorrow afternoon"),
  ],
  now: new Date("2026-06-28T01:10:00.000Z"),
});

assert.deepEqual(
  lateEveningGroups.map((group) => group.label),
  ["Now", "Next 2 hours", "Tonight"],
  "past afternoon/evening labels should be omitted instead of showing tomorrow under today's labels"
);
assert.equal(lateEveningGroups[0].rows[0]?.displayTime, "9:10 PM");
assert.equal(lateEveningGroups[0].rows[0]?.hour.conditionText, "Current nearby hour");
assert.equal(lateEveningGroups[1].rows.length, 2, "Next 2 hours should contain useful data");

const sparseLateGroups = buildForecastTimelineGroups({
  hours: [hour("2026-06-28T02:00:00.000Z", "Only upcoming hour")],
  now: new Date("2026-06-28T01:50:00.000Z"),
});
assert.deepEqual(
  sparseLateGroups.map((group) => group.label),
  ["Now", "Next 2 hours", "Tonight"],
  "a sparse forecast should still show the available upcoming hour in Next 2 hours"
);
assert.equal(sparseLateGroups[1].rows[0]?.displayTime, "10 PM");

const componentSource = readFileSync("components/weather/ForecastTimeline.tsx", "utf8");
assert.match(componentSource, /WeatherIcon/);
assert.doesNotMatch(componentSource, /toLocaleTimeString/);
assert.doesNotMatch(componentSource, /\.getHours\(\)/);

const popoverSource = readFileSync("components/weather/WeatherTimeSpanPopover.tsx", "utf8");
assert.match(popoverSource, /formatDisneyForecastTime/);
assert.doesNotMatch(popoverSource, /toLocaleTimeString/);

console.log("Forecast timeline contracts passed.");
