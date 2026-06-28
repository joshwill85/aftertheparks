import assert from "node:assert/strict";
import {
  defaultWeatherEndTime,
  parseNwsIsoDateTime,
  parseWeatherApiLocalDateTime,
  toWeatherLocationTime,
} from "@/lib/weather/time";

const weatherApiDate = parseWeatherApiLocalDateTime("2026-06-27 15:30");
assert.equal(weatherApiDate.toISOString(), "2026-06-27T19:30:00.000Z");

const nwsDate = parseNwsIsoDateTime("2026-06-27T15:30:00-04:00");
assert.equal(nwsDate.toISOString(), "2026-06-27T19:30:00.000Z");

assert.equal(
  toWeatherLocationTime(new Date("2026-06-27T19:30:00.000Z")),
  "2026-06-27T15:30:00-04:00"
);

assert.equal(
  defaultWeatherEndTime(new Date("2026-06-27T19:30:00.000Z")).toISOString(),
  "2026-06-27T20:30:00.000Z"
);

console.log("weather timezone contract passed");
