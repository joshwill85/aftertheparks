import assert from "node:assert/strict";
import {
  buildWeatherGuidanceForTimeSpan,
  calculateWeatherRisk,
  inferActivityWeatherFit,
} from "@/lib/weather/guidance";
import type { WeatherAlert, WeatherSnapshot } from "@/lib/weather/types";
import { DEFAULT_WEATHER_RISK } from "@/lib/weather/types";

const snapshot: WeatherSnapshot = {
  locationKey: "all_wdw",
  provider: "weatherapi",
  confidence: "near_term_hourly",
  fetchedAt: "2026-06-27T12:00:00.000Z",
  expiresAt: "2026-06-27T12:15:00.000Z",
  staleAfter: "2026-06-27T12:30:00.000Z",
  isStale: false,
  risk: DEFAULT_WEATHER_RISK,
  hourly: [
    {
      source: "weatherapi",
      time: "2026-06-27T20:00:00.000Z",
      conditionText: "Thunderstorms nearby",
      iconKey: "rain_with_thunder",
      tempF: 91,
      tempC: 33,
      feelsLikeF: 101,
      feelsLikeC: 38,
      chanceOfRainPct: 70,
      chanceOfThunderPct: 40,
      windMph: 18,
      windKph: 29,
      isDay: true,
    },
  ],
  daily: [],
};

const movieFit = inferActivityWeatherFit({
  title: "Movie Under the Stars",
  category: "Outdoor movie",
  enrichment: { weatherDependency: "Weather permitting" },
});
assert.ok(movieFit.includes("outdoor_movie"));
assert.ok(movieFit.includes("storm_sensitive"));

const risk = calculateWeatherRisk({
  hour: snapshot.hourly[0],
  fits: movieFit,
});
assert.equal(risk.rainRisk, "high");
assert.equal(risk.stormRisk, "high");
assert.equal(risk.heatRisk, "high");
assert.equal(risk.indoorBackupRecommended, true);
assert.equal(risk.outdoorMoviesLikelyAffected, true);

const guidance = buildWeatherGuidanceForTimeSpan({
  locationKey: "all_wdw",
  startsAt: "2026-06-27T16:00:00-04:00",
  endsAt: "2026-06-27T17:00:00-04:00",
  snapshot,
  activityWeatherFits: movieFit,
  now: new Date("2026-06-27T12:00:00-04:00"),
});
assert.equal(guidance.forecastStatus, "available");
assert.equal(guidance.iconKey, "rain_with_thunder");
assert.equal(guidance.headline, "Storms could interrupt outdoor plans");
assert.equal(guidance.rainChancePct, 70);

const ongoingGuidance = buildWeatherGuidanceForTimeSpan({
  locationKey: "all_wdw",
  startsAt: "2026-06-27T15:30:00-04:00",
  endsAt: "2026-06-27T17:30:00-04:00",
  snapshot,
  now: new Date("2026-06-27T16:00:00-04:00"),
});
assert.equal(
  ongoingGuidance.shouldDisplayWeather,
  true,
  "weather should remain visible while an event is in progress"
);
assert.equal(
  ongoingGuidance.isPast,
  false,
  "events should become past only after their end time"
);

const completedGuidance = buildWeatherGuidanceForTimeSpan({
  locationKey: "all_wdw",
  startsAt: "2026-06-27T15:30:00-04:00",
  endsAt: "2026-06-27T15:59:00-04:00",
  snapshot,
  now: new Date("2026-06-27T16:00:00-04:00"),
});
assert.equal(
  completedGuidance.shouldDisplayWeather,
  false,
  "weather should be removed once an event is past"
);
assert.equal(completedGuidance.isPast, true);

const alert: WeatherAlert = {
  provider: "nws",
  id: "alert-1",
  event: "Severe Thunderstorm Warning",
  headline: "Severe Thunderstorm Warning",
  severity: "Severe",
  urgency: "Immediate",
  certainty: "Observed",
  effective: "2026-06-27T19:00:00.000Z",
  expires: "2026-06-27T21:00:00.000Z",
};
const alertGuidance = buildWeatherGuidanceForTimeSpan({
  locationKey: "all_wdw",
  startsAt: "2026-06-27T16:00:00-04:00",
  snapshot,
  alerts: [alert],
  now: new Date("2026-06-27T12:00:00-04:00"),
});
assert.equal(alertGuidance.headline, "Official weather alert in effect");
assert.equal(alertGuidance.risk.overallOutdoorFit, "unsafe");

const futureGuidance = buildWeatherGuidanceForTimeSpan({
  locationKey: "all_wdw",
  startsAt: "2026-07-20T16:00:00-04:00",
  snapshot: null,
  now: new Date("2026-06-27T12:00:00-04:00"),
});
assert.equal(futureGuidance.forecastStatus, "not_available_yet");
assert.equal(futureGuidance.headline, "Forecast appears closer to the date");

console.log("weather guidance contract passed");
