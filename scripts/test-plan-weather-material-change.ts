import assert from "node:assert/strict";
import { detectPlanWeatherMaterialChanges } from "@/lib/weather/materialChange";

const changes = detectPlanWeatherMaterialChanges({
  previous: {
    itemId: "movie-1",
    rainChancePct: 20,
    stormRisk: "low",
    feelsLikeF: 88,
    windRisk: "low",
    outdoorFit: "good",
    confidence: "near_term_hourly",
  },
  current: {
    itemId: "movie-1",
    rainChancePct: 55,
    stormRisk: "high",
    feelsLikeF: 96,
    windRisk: "medium",
    outdoorFit: "poor",
    confidence: "near_term_hourly",
  },
  activityTags: ["outdoor_movie"],
});

assert.ok(changes.some((change) => change.severity === "warning"));
assert.ok(changes.some((change) => /Rain/i.test(change.title)));
assert.ok(changes.some((change) => change.suggestedActions.length > 0));

console.log("Plan weather material-change detection passed.");
