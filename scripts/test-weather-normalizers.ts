import assert from "node:assert/strict";
import { normalizeNwsAlerts } from "@/lib/weather/nws";
import {
  normalizeNwsHourlyForecast,
  normalizeNwsPeriodForecast,
  resolveNwsPointMetadata,
} from "@/lib/weather/nwsForecast";
import { normalizeVisualCrossingForecast } from "@/lib/weather/visualcrossing";
import { normalizeWeatherApiForecast } from "@/lib/weather/weatherapi";

const weatherApi = normalizeWeatherApiForecast({
  locationKey: "all_wdw",
  lat: 28.37,
  lon: -81.57,
  fetchedAt: "2026-06-27T12:00:00.000Z",
  payload: {
    current: {
      last_updated: "2026-06-27 07:45",
      temp_f: 86,
      temp_c: 30,
      feelslike_f: 96,
      feelslike_c: 36,
      is_day: 1,
      condition: { text: "Partly cloudy", code: 1003 },
    },
  },
});
assert.equal(weatherApi.provider, "weatherapi");
assert.equal(weatherApi.iconKey, "partly_cloudy_day");
assert.equal(weatherApi.tempF, 86);
assert.equal(weatherApi.attribution?.label, "WeatherAPI.com");

const alerts = normalizeNwsAlerts({
  features: [
    {
      id: "https://api.weather.gov/alerts/abc",
      properties: {
        id: "abc",
        event: "Special Weather Statement",
        headline: "Storms possible",
        severity: "Moderate",
        urgency: "Expected",
        certainty: "Possible",
        effective: "2026-06-27T18:00:00Z",
        expires: "2026-06-27T20:00:00Z",
        areaDesc: "Orange County",
      },
    },
  ],
});
assert.equal(alerts[0].id, "abc");
assert.equal(alerts[0].provider, "nws");
assert.equal(alerts[0].sourceUrl, "https://api.weather.gov/alerts/abc");

const metadata = resolveNwsPointMetadata({
  properties: {
    forecast: "https://api.weather.gov/gridpoints/MLB/33,70/forecast",
    forecastHourly: "https://api.weather.gov/gridpoints/MLB/33,70/forecast/hourly",
    forecastGridData: "https://api.weather.gov/gridpoints/MLB/33,70",
    timeZone: "America/New_York",
  },
});
assert.equal(metadata.timeZone, "America/New_York");
assert.match(metadata.forecastHourlyUrl, /hourly$/);

const nwsHourly = normalizeNwsHourlyForecast({
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
assert.equal(nwsHourly[0].iconKey, "rain_with_thunder");
assert.equal(nwsHourly[0].windMph, 10);
assert.equal(nwsHourly[0].chanceOfRainPct, 70);

const nwsPeriods = normalizeNwsPeriodForecast({
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
assert.equal(nwsPeriods[0].date, "2026-06-27");
assert.equal(nwsPeriods[0].iconKey, "sunny_day");
assert.equal(nwsPeriods[0].confidence, "official_7_day");

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
assert.equal(visualCrossing.attributionRequired, true);
assert.equal(visualCrossing.days[0].source, "visual_crossing");
assert.equal(visualCrossing.days[0].iconKey, "rain_shower");
assert.equal(visualCrossing.days[0].confidence, "long_range_planning");

console.log("weather normalizer contract passed");
