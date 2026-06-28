import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GET } from "@/app/api/weather/guidance/route";

async function main() {
  const batchRoute = readFileSync("app/api/weather/guidance/batch/route.ts", "utf8");
  assert.match(batchRoute, /loadWeatherByOccurrence/);

  const serverGuidance = readFileSync("lib/weather/serverGuidance.ts", "utf8");
  assert.match(serverGuidance, /Promise\.allSettled/);
  assert.match(serverGuidance, /officialAlertStatus/);
  assert.match(serverGuidance, /snapshots\.set/);
  assert.match(serverGuidance, /snapshot/);

  const response = await GET(
    new Request(
      "https://aftertheparks.com/api/weather/guidance?locationKey=all_wdw&startsAt=2026-07-20T12:00:00-04:00"
    )
  );
  assert.equal(response.status, 200);
  const body = await response.json();

  assert.equal(body.location.key, "all_wdw");
  assert.equal(body.snapshot, null);
  assert.equal(body.forecastStatus, "not_available_yet");
  assert.equal(body.officialAlertStatus, "available");
  assert.deepEqual(body.alerts, []);

  console.log("weather partial failure route contract passed");
}

void main();
