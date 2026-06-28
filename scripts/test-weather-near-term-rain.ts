import assert from "node:assert/strict";
import {
  buildNearTermRainSignal,
  buildWeatherGuidanceForTimeSpan,
} from "@/lib/weather/guidance";
import type { WeatherAlert, WeatherSnapshot } from "@/lib/weather/types";
import { DEFAULT_WEATHER_RISK } from "@/lib/weather/types";

const now = new Date("2026-06-27T12:00:00-04:00");

function snapshot(chanceOfRainPct: number, precipIn = 0): WeatherSnapshot {
  return {
    locationKey: "all_wdw",
    provider: "weatherapi",
    confidence: "near_term_hourly",
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
    staleAfter: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    isStale: false,
    risk: DEFAULT_WEATHER_RISK,
    hourly: [
      {
        source: "weatherapi",
        time: "2026-06-27T16:00:00.000Z",
        conditionText: "Rain shower",
        iconKey: "rain_shower",
        tempF: 88,
        tempC: 31,
        chanceOfRainPct,
        precipIn,
        precipMm: precipIn * 25.4,
        isDay: true,
      },
    ],
    daily: [],
  };
}

const likely = buildNearTermRainSignal({
  startsAt: new Date("2026-06-27T12:30:00-04:00"),
  endsAt: new Date("2026-06-27T13:30:00-04:00"),
  now,
  snapshot: snapshot(70),
  alerts: [],
});
assert.equal(likely?.answer, "likely");
assert.match(likely?.detail ?? "", /not radar-confirmed/);

const possible = buildNearTermRainSignal({
  startsAt: new Date("2026-06-27T13:00:00-04:00"),
  endsAt: new Date("2026-06-27T14:00:00-04:00"),
  now,
  snapshot: snapshot(35),
  alerts: [],
});
assert.equal(possible?.answer, "possible");

const alert: WeatherAlert = {
  provider: "nws",
  id: "storm-alert",
  event: "Severe Thunderstorm Warning",
  headline: "Severe Thunderstorm Warning",
  severity: "Severe",
  urgency: "Immediate",
  certainty: "Observed",
  effective: "2026-06-27T15:45:00.000Z",
  expires: "2026-06-27T17:00:00.000Z",
};
const stormAlert = buildNearTermRainSignal({
  startsAt: new Date("2026-06-27T12:45:00-04:00"),
  endsAt: new Date("2026-06-27T13:45:00-04:00"),
  now,
  snapshot: snapshot(10),
  alerts: [alert],
});
assert.equal(stormAlert?.answer, "storm_alert");

const outsideWindow = buildNearTermRainSignal({
  startsAt: new Date("2026-06-27T16:00:00-04:00"),
  endsAt: new Date("2026-06-27T17:00:00-04:00"),
  now,
  snapshot: snapshot(80),
  alerts: [],
});
assert.equal(outsideWindow?.answer, "unknown");

const guidance = buildWeatherGuidanceForTimeSpan({
  locationKey: "all_wdw",
  startsAt: "2026-06-27T12:30:00-04:00",
  endsAt: "2026-06-27T13:30:00-04:00",
  now,
  snapshot: snapshot(70),
});
assert.equal(guidance.nearTermRain?.answer, "likely");

console.log("Weather near-term rain passed.");
