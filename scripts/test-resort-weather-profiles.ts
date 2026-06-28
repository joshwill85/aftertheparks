import assert from "node:assert/strict";
import {
  getResortWeatherProfile,
  RESORT_WEATHER_PROFILES,
} from "@/lib/weather/resortWeatherProfiles";

for (const slug of [
  "polynesian-village-resort",
  "boardwalk-inn",
  "fort-wilderness-resort",
  "animal-kingdom-lodge",
]) {
  const profile = getResortWeatherProfile(slug);
  assert.ok(profile, `${slug} profile missing`);
  assert.match(profile.rainyDaySummary, /rain|Rain|indoor|backup/);
  assert.match(profile.heatDaySummary, /heat|Heat|shade|indoor|short/i);
  assert.match(profile.stormDaySummary, /storm|Storm|lightning|alert|inside/i);
}

assert.equal(Object.keys(RESORT_WEATHER_PROFILES).length >= 4, true);

console.log("Resort weather profiles passed.");
