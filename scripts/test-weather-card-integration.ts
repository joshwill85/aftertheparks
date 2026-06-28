import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const eventCard = readFileSync("components/events/EventCard.tsx", "utf8");
assert.match(eventCard, /weatherSummary/);
assert.match(eventCard, /WeatherIconButton/);
assert.match(eventCard, /WeatherTimeSpanPopover/);

const mapper = readFileSync("lib/events/mapToEventCard.ts", "utf8");
assert.match(mapper, /weatherQuery/);
assert.match(mapper, /startDateTime/);
assert.match(mapper, /endDateTime/);

for (const file of [
  "components/activity/ActivityCard.tsx",
  "components/tonight/NightActivityCard.tsx",
  "components/tonight/MovieCard.tsx",
]) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /weather/i, `${file} must pass weather context`);
}

console.log("Weather card integration contracts passed.");
