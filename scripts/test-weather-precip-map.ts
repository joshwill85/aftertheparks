import assert from "node:assert/strict";
import { getWeatherLocation } from "@/lib/weather/locations";
import { getWeatherApiPrecipMapContext } from "@/lib/weather/precipMap";

const context = getWeatherApiPrecipMapContext({
  location: getWeatherLocation("all_wdw"),
  now: new Date("2026-06-27T16:42:00.000Z"),
});

assert.equal(context?.provider, "weatherapi");
assert.equal(context?.locationKey, "all_wdw");
assert.equal(context?.frames.length, 2);
assert.match(context?.description ?? "", /Nearby precipitation for planning context\. This is not live radar\./);
assert.match(context?.frames[0]?.previewTileUrl ?? "", /weathermaps\.weatherapi\.com\/precip\/tiles\/2026062716\/8\//);
assert.match(context?.frames[0]?.tileUrlTemplate ?? "", /\{z\}\/\{x\}\/\{y\}/);

console.log("Weather precip map context passed.");
