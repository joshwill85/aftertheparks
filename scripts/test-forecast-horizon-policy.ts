import assert from "node:assert/strict";
import { chooseForecastHorizon } from "@/lib/weather/forecastHorizon";

const now = new Date("2026-06-27T12:00:00-04:00");

assert.deepEqual(
  chooseForecastHorizon({
    now,
    startsAt: "2026-06-27T16:00:00-04:00",
    weatherApiAvailable: true,
  }),
  {
    provider: "weatherapi",
    confidence: "near_term_hourly",
    allowEventTimeDecisions: true,
    reason: "WeatherAPI Free supports rich 0-3 day forecast.",
  }
);

assert.equal(
  chooseForecastHorizon({
    now,
    startsAt: "2026-06-27T16:00:00-04:00",
    weatherApiAvailable: false,
  }).provider,
  "nws_forecast"
);

assert.equal(
  chooseForecastHorizon({
    now,
    startsAt: "2026-07-02T12:00:00-04:00",
  }).provider,
  "nws_forecast"
);

assert.equal(
  chooseForecastHorizon({
    now,
    startsAt: "2026-07-07T12:00:00-04:00",
    visualCrossingAvailable: true,
  }).provider,
  "visual_crossing"
);

const longRangeDisabled = chooseForecastHorizon({
  now,
  startsAt: "2026-07-07T12:00:00-04:00",
  visualCrossingAvailable: false,
});
assert.equal(longRangeDisabled.provider, "none");
assert.equal(longRangeDisabled.allowEventTimeDecisions, false);

const tooFarOut = chooseForecastHorizon({
  now,
  startsAt: "2026-07-20T12:00:00-04:00",
  visualCrossingAvailable: true,
});
assert.equal(tooFarOut.provider, "none");
assert.equal(tooFarOut.confidence, "not_available_yet");

const past = chooseForecastHorizon({
  now,
  startsAt: "2026-06-26T12:00:00-04:00",
});
assert.equal(past.provider, "none");
assert.equal(past.reason, "Past events do not show weather.");

console.log("weather forecast horizon policy contract passed");
