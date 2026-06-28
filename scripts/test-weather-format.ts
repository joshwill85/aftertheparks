import assert from "node:assert/strict";
import {
  formatPrecipDual,
  formatTempDual,
  formatWindDual,
} from "@/lib/weather/format";

assert.equal(formatTempDual(86.2, 30.1), "86°F / 30°C");
assert.equal(formatTempDual(86.2, 30.1, "celsius_first"), "30°C / 86°F");
assert.equal(formatWindDual(12.4, 20), "12 mph / 20 km/h");
assert.equal(formatWindDual(12.4, 20, "celsius_first"), "20 km/h / 12 mph");
assert.equal(formatWindDual(undefined, 20), null);
assert.equal(formatPrecipDual(0.126, 3.2), "0.13 in / 3 mm");
assert.equal(formatPrecipDual(0.126, 3.2, "celsius_first"), "3 mm / 0.13 in");
assert.equal(formatPrecipDual(0.126, undefined), null);

console.log("weather formatting contract passed");
