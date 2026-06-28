import assert from "node:assert/strict";
import {
  chooseWeatherProviderForTimeSpan,
  groupOccurrencesByWeatherLocation,
} from "@/lib/weather/providerRouter";

const now = new Date("2026-06-27T12:00:00-04:00");

assert.equal(
  chooseWeatherProviderForTimeSpan({
    now,
    startsAt: "2026-06-27T18:00:00-04:00",
    weatherApiAvailable: true,
  }).provider,
  "weatherapi"
);
assert.equal(
  chooseWeatherProviderForTimeSpan({
    now,
    startsAt: "2026-07-01T18:00:00-04:00",
  }).provider,
  "nws_forecast"
);
assert.equal(
  chooseWeatherProviderForTimeSpan({
    now,
    startsAt: "2026-07-07T18:00:00-04:00",
    visualCrossingAvailable: true,
  }).provider,
  "visual_crossing"
);
assert.equal(
  chooseWeatherProviderForTimeSpan({
    now,
    startsAt: "2026-07-20T18:00:00-04:00",
    visualCrossingAvailable: true,
  }).provider,
  "none"
);

const grouped = groupOccurrencesByWeatherLocation([
  {
    id: "mk",
    resortSlug: "polynesian-village-resort",
    startsAt: "2026-06-27T18:00:00-04:00",
  },
  {
    id: "boardwalk",
    resortSlug: "boardwalk-inn",
    startsAt: "2026-06-27T18:00:00-04:00",
  },
  {
    id: "bad-location",
    locationKey: "not-real" as never,
    startsAt: "2026-06-27T18:00:00-04:00",
  },
]);
assert.deepEqual(
  grouped.magic_kingdom_resort_area.map((item) => item.id),
  ["mk"]
);
assert.deepEqual(grouped.epcot_boardwalk_area.map((item) => item.id), [
  "boardwalk",
]);
assert.deepEqual(grouped.all_wdw.map((item) => item.id), ["bad-location"]);

console.log("weather provider routing contract passed");
