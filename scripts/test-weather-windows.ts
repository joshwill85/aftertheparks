import assert from "node:assert/strict";
import { buildWeatherWindows } from "@/lib/weather/windows";

const windows = buildWeatherWindows({
  locationKey: "all_wdw",
  startsAt: "2026-06-27T08:00:00-04:00",
  endsAt: "2026-06-27T23:00:00-04:00",
  risksByWindow: [
    {
      startsAt: "2026-06-27T08:00:00-04:00",
      endsAt: "2026-06-27T12:00:00-04:00",
      rainRisk: "low",
      stormRisk: "low",
      heatRisk: "low",
    },
    {
      startsAt: "2026-06-27T13:00:00-04:00",
      endsAt: "2026-06-27T17:00:00-04:00",
      rainRisk: "low",
      stormRisk: "low",
      heatRisk: "high",
    },
    {
      startsAt: "2026-06-27T18:00:00-04:00",
      endsAt: "2026-06-27T22:00:00-04:00",
      rainRisk: "high",
      stormRisk: "medium",
      heatRisk: "low",
    },
  ],
});

assert.ok(windows.some((window) => window.action === "go_now"));
assert.ok(windows.some((window) => window.action === "bring_backup"));
assert.ok(windows.some((window) => window.chapterLabel === "Rain Window"));
assert.ok(windows.every((window) => window.deepLinks.length > 0));

console.log("Weather Windows passed.");
