import assert from "node:assert/strict";
import {
  normalizeNwsHourlyForecast,
  normalizeNwsPeriodForecast,
  resolveNwsPointMetadata,
} from "@/lib/weather/nwsForecast";

const metadata = resolveNwsPointMetadata({
  properties: {
    forecast: "https://api.weather.gov/gridpoints/MLB/33,70/forecast",
    forecastHourly: "https://api.weather.gov/gridpoints/MLB/33,70/forecast/hourly",
    forecastGridData: "https://api.weather.gov/gridpoints/MLB/33,70",
    timeZone: "America/New_York",
  },
});
assert.match(metadata.forecastHourlyUrl, /hourly$/);
assert.equal(metadata.timeZone, "America/New_York");

const hourly = normalizeNwsHourlyForecast({
  locationKey: "all_wdw",
  payload: {
    properties: {
      periods: [
        {
          startTime: "2026-06-27T16:00:00-04:00",
          temperature: 90,
          windSpeed: "10 to 15 mph",
          shortForecast: "Showers and thunderstorms likely",
          probabilityOfPrecipitation: { value: 70 },
          isDaytime: true,
        },
      ],
    },
  },
});
assert.equal(hourly[0].iconKey, "rain_with_thunder");
assert.equal(hourly[0].windMph, 10);
assert.equal(hourly[0].chanceOfRainPct, 70);

const periods = normalizeNwsPeriodForecast({
  locationKey: "all_wdw",
  payload: {
    properties: {
      periods: [
        {
          startTime: "2026-06-27T06:00:00-04:00",
          temperature: 93,
          windSpeed: "12 mph",
          shortForecast: "Sunny",
          probabilityOfPrecipitation: { value: 20 },
        },
      ],
    },
  },
});
assert.equal(periods[0].date, "2026-06-27");
assert.equal(periods[0].confidence, "official_7_day");

console.log("NWS forecast normalizer passed.");
