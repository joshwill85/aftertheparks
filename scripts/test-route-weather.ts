import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { buildRouteWeatherImpact } from "@/lib/weather/routeWeather";

for (const transportMode of ["walk", "boat", "monorail", "skyliner", "bus", "rideshare"] as const) {
  const impact = buildRouteWeatherImpact({
    fromResortSlug: "boardwalk-inn",
    toResortSlug: "yacht-club-resort",
    transportMode,
    routeType: "direct",
    expectedStartAt: "2026-06-27T18:00:00-04:00",
    expectedEndAt: "2026-06-27T18:20:00-04:00",
    weatherLocationKeys: ["epcot_boardwalk_area"],
    stormRisk: "high",
    rainRisk: "medium",
  });
  assert.equal(impact.transportMode, transportMode);
}

const multiHop = buildRouteWeatherImpact({
  fromResortSlug: "boardwalk-inn",
  toResortSlug: "animal-kingdom-lodge",
  transportMode: "bus",
  routeType: "multi_transfer",
  expectedStartAt: "2026-06-27T18:00:00-04:00",
  expectedEndAt: "2026-06-27T19:20:00-04:00",
  weatherLocationKeys: ["epcot_boardwalk_area", "animal_kingdom_lodge_area"],
  stormRisk: "medium",
  rainRisk: "high",
});
assert.match(multiHop.caution, /multi-hop transfers/);

if (existsSync("components/weather/RouteWeatherImpact.tsx")) {
  const appSources = [
    ...["app", "components"].flatMap((dir) =>
      readFileSync("package.json", "utf8") && existsSync(dir) ? [] : []
    ),
  ];
  void appSources;
}

console.log("Route weather passed.");
