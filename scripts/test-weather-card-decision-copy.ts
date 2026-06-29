import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const eventCard = readFileSync("components/events/EventCard.tsx", "utf8");
for (const label of [
  "Outdoor plans OK",
  "Go earlier",
  "Bring backup",
  "Likely affected",
  "Stay indoors",
  "Official alert",
]) {
  assert.match(eventCard, new RegExp(label), `${label} decision copy missing`);
}
assert.match(eventCard, /weatherDecisionLabel/);
assert.match(readFileSync("components/weather/WeatherIconButton.tsx", "utf8"), /formatTempDual/);

console.log("Weather card decision copy passed.");
