import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const serverOnlyFiles = [
  "lib/weather/cache.ts",
  "lib/weather/hardCache.ts",
  "lib/weather/weatherapi.ts",
  "lib/weather/nws.ts",
  "lib/weather/nwsForecast.ts",
  "lib/weather/visualcrossing.ts",
];

for (const file of serverOnlyFiles) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /import "server-only";/, `${file} must be server-only`);
}

const browserSafeFiles = [
  "lib/weather/types.ts",
  "lib/weather/format.ts",
  "lib/weather/icons.ts",
  "lib/weather/sourcePolicy.ts",
];

for (const file of browserSafeFiles) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(source, /process\.env/, `${file} should not read env`);
  assert.doesNotMatch(source, /fetch\(/, `${file} should not fetch`);
}

console.log("weather server-only boundary contract passed");
