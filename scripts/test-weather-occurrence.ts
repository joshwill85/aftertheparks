import assert from "node:assert/strict";
import {
  getWeatherForOccurrence,
  shouldShowWeatherForOccurrence,
} from "@/lib/weather/occurrence";
import type { WeatherHour } from "@/lib/weather/types";

const now = new Date("2026-06-27T19:30:00-04:00");

assert.equal(
  shouldShowWeatherForOccurrence(
    now,
    new Date("2026-06-27T17:00:00-04:00"),
    new Date("2026-06-27T18:00:00-04:00")
  ),
  false
);
assert.equal(
  shouldShowWeatherForOccurrence(
    now,
    new Date("2026-06-27T19:00:00-04:00"),
    new Date("2026-06-27T20:00:00-04:00")
  ),
  true
);
assert.equal(
  shouldShowWeatherForOccurrence(now, new Date("2026-06-27T20:00:00-04:00")),
  true
);

const hour = (
  time: string,
  chanceOfRainPct: number,
  conditionCode: number
): WeatherHour => ({
  source: "weatherapi",
  time,
  conditionText:
    conditionCode === 1276 ? "Rain with thunder" : "Light rain shower",
  conditionCode,
  iconKey: conditionCode === 1276 ? "rain_with_thunder" : "rain_shower",
  tempF: 82,
  tempC: 28,
  feelsLikeF: 88,
  feelsLikeC: 31,
  chanceOfRainPct,
  chanceOfThunderPct: conditionCode === 1276 ? 60 : 10,
  windMph: 7,
  windKph: 11,
  isDay: false,
});

const detail = getWeatherForOccurrence({
  now,
  startsAt: "2026-06-27T20:30:00-04:00",
  endsAt: "2026-06-27T22:00:00-04:00",
  locationKey: "all_wdw",
  hourlyForecast: [
    hour("2026-06-27T19:00:00-04:00", 20, 1240),
    hour("2026-06-27T20:00:00-04:00", 35, 1240),
    hour("2026-06-27T21:00:00-04:00", 65, 1276),
  ],
  fetchedAt: "2026-06-27T23:00:00.000Z",
});

assert.ok(detail);
assert.equal(detail.shouldDisplayWeather, true);
assert.equal(detail.iconKey, "rain_with_thunder");
assert.equal(detail.rainChancePct, 65);
assert.equal(detail.thunderChancePct, 60);
assert.equal(detail.hourlyBreakdown.length, 1);

const past = getWeatherForOccurrence({
  now,
  startsAt: "2026-06-27T17:00:00-04:00",
  endsAt: "2026-06-27T18:00:00-04:00",
  locationKey: "all_wdw",
  hourlyForecast: [],
  fetchedAt: "2026-06-27T23:00:00.000Z",
});

assert.equal(past, null);

console.log("Weather occurrence selection passed.");
