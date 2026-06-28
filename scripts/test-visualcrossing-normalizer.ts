import assert from "node:assert/strict";
import { normalizeVisualCrossingForecast } from "@/lib/weather/visualcrossing";

const visualCrossing = normalizeVisualCrossingForecast({
  locationKey: "all_wdw",
  fetchedAt: "2026-06-27T12:00:00.000Z",
  payload: {
    days: [
      {
        datetime: "2026-07-07",
        conditions: "Rain, Partially cloudy",
        icon: "rain",
        temp: 88,
        feelslike: 96,
        precipprob: 65,
        windspeed: 11,
      },
    ],
  },
});

assert.equal(visualCrossing.locationKey, "all_wdw");
assert.equal(visualCrossing.attributionRequired, true);
assert.equal(visualCrossing.days[0].source, "visual_crossing");
assert.equal(visualCrossing.days[0].iconKey, "rain_shower");
assert.equal(visualCrossing.days[0].confidence, "long_range_planning");

console.log("Visual Crossing normalizer passed.");
