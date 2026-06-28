import assert from "node:assert/strict";
import { ACTIVITY_WEATHER_THRESHOLDS } from "@/lib/weather/thresholds";

for (const key of [
  "outdoor_movie",
  "pool",
  "campfire",
  "boat",
  "skyliner",
  "outdoor_walk",
  "grandparents_plan",
  "toddlers_plan",
  "first_night_plan",
] as const) {
  assert.ok(ACTIVITY_WEATHER_THRESHOLDS[key], `${key} threshold missing`);
}

assert.ok(
  ACTIVITY_WEATHER_THRESHOLDS.pool.thunderChanceHighPct <
    ACTIVITY_WEATHER_THRESHOLDS.outdoor_movie.thunderChanceHighPct
);
assert.ok(
  ACTIVITY_WEATHER_THRESHOLDS.campfire.thunderChanceHighPct <
    ACTIVITY_WEATHER_THRESHOLDS.outdoor_movie.thunderChanceHighPct
);
assert.equal(ACTIVITY_WEATHER_THRESHOLDS.grandparents_plan.walkingHeavyPenalty, true);
assert.equal(ACTIVITY_WEATHER_THRESHOLDS.toddlers_plan.shortDurationPreferred, true);

console.log("Weather threshold coverage passed.");
