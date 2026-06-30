import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guidance = readFileSync("lib/weather/guidance.ts", "utf8");
const statusStrip = readFileSync("components/weather/WeatherStatusStrip.tsx", "utf8");
const today = readFileSync("components/atlas/TodayClient.tsx", "utf8");
const tonight = readFileSync("components/atlas/TonightClient.tsx", "utf8");

assert.ok(
  guidance.includes("WeatherActionGuidance"),
  "Weather guidance should expose action categories."
);
assert.ok(
  guidance.includes("weatherDecisionLabelForGuidance"),
  "Weather guidance should expose a shared decision-label formatter."
);
for (const label of [
  "Good for outdoor plans",
  "Use indoor backups first",
  "Heat caution",
  "Storm risk",
  "Rain nearby",
  "Transportation-sensitive weather",
]) {
  assert.ok(guidance.includes(label), `Weather guidance should define ${label}.`);
}
assert.ok(
  statusStrip.includes("choose_covered_backup") ||
    statusStrip.includes("Covered Options"),
  "Weather strip should route to covered backups."
);
assert.ok(
  today.includes("WeatherStatusStrip"),
  "Today should surface weather action guidance."
);
assert.ok(
  tonight.includes("WeatherStatusStrip"),
  "Tonight should use the same weather action guidance surface as Today."
);

console.log("Weather action guidance contract passed.");
