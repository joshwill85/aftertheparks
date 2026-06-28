import assert from "node:assert/strict";
import { compareForecastTiming } from "@/lib/weather/forecastCompare";

const now = new Date("2026-06-27T12:00:00-04:00");

assert.equal(
  compareForecastTiming({
    now,
    startsAt: "2026-06-26T18:00:00-04:00",
    isFlexible: true,
    confidence: "near_term_hourly",
  }).allowed,
  false
);
assert.equal(
  compareForecastTiming({
    now,
    startsAt: "2026-06-27T18:00:00-04:00",
    isFlexible: false,
    confidence: "near_term_hourly",
  }).allowed,
  false
);
assert.equal(
  compareForecastTiming({
    now,
    startsAt: "2026-07-07T18:00:00-04:00",
    isFlexible: true,
    confidence: "long_range_planning",
  }).recommendation,
  "soft_planning_only"
);
assert.equal(
  compareForecastTiming({
    now,
    startsAt: "2026-06-28T18:00:00-04:00",
    isFlexible: true,
    confidence: "near_term_hourly",
    currentRainChancePct: 65,
    earlierRainChancePct: 30,
  }).recommendation,
  "go_earlier"
);

console.log("Forecast compare passed.");
