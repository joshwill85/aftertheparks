import assert from "node:assert/strict";
import {
  getWeatherLocation,
  getWeatherLocationForResort,
  parseWeatherLocationKey,
  WEATHER_LOCATIONS,
} from "@/lib/weather/locations";

assert.equal(Object.keys(WEATHER_LOCATIONS).length, 6);
assert.equal(
  getWeatherLocation("magic_kingdom_resort_area").timezone,
  "America/New_York"
);
assert.equal(
  getWeatherLocationForResort("polynesian-village-resort").key,
  "magic_kingdom_resort_area"
);
assert.equal(
  getWeatherLocationForResort("boardwalk-inn").key,
  "epcot_boardwalk_area"
);
assert.equal(
  getWeatherLocationForResort("caribbean-beach-resort").key,
  "skyliner_area"
);
assert.equal(
  getWeatherLocationForResort("animal-kingdom-lodge").key,
  "animal_kingdom_lodge_area"
);
assert.equal(
  getWeatherLocationForResort("old-key-west-resort").key,
  "disney_springs_area"
);
assert.equal(getWeatherLocationForResort("unknown-resort").key, "all_wdw");
assert.equal(parseWeatherLocationKey("skyliner_area"), "skyliner_area");
assert.equal(parseWeatherLocationKey("not-real"), "all_wdw");

for (const location of Object.values(WEATHER_LOCATIONS)) {
  assert.equal(location.timezone, "America/New_York");
  assert.ok(location.lat > 28 && location.lat < 29);
  assert.ok(location.lon < -81 && location.lon > -82);
}

console.log("weather location contract passed");
