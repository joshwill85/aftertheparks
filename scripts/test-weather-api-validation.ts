import assert from "node:assert/strict";
import {
  validateWeatherGuidanceBatchOptions,
  validateWeatherGuidanceBatchRequest,
  validateWeatherGuidanceSearchParams,
} from "@/lib/weather/apiValidation";

const params = new URLSearchParams({
  locationKey: "not-real",
  startsAt: "not-a-date",
  endsAt: "2026-06-27T20:00:00-04:00",
  includeNearTerm: "false",
  includePrecipMap: "false",
});
const validated = validateWeatherGuidanceSearchParams(params);
assert.equal(validated.locationKey, "not-real");
assert.equal(validated.startsAt, null);
assert.equal(validated.endsAt, "2026-06-27T20:00:00-04:00");
assert.equal(validated.includeNearTerm, false);
assert.equal(validated.includePrecipMap, false);

const batch = validateWeatherGuidanceBatchRequest({
  occurrences: Array.from({ length: 200 }, (_, index) => ({
    id: `item-${index}`,
    startsAt: index === 5 ? "bad-date" : "2026-06-27T20:00:00-04:00",
    resortSlug: "polynesian-village-resort",
  })),
});
assert.equal(batch.length, 150);
assert.equal(batch.some((item) => item.startsAt === "bad-date"), false);
assert.equal(validateWeatherGuidanceBatchRequest({ occurrences: "bad" }).length, 0);
assert.deepEqual(validateWeatherGuidanceBatchOptions({}), {
  includeNearTerm: true,
  includePrecipMap: false,
});
assert.deepEqual(validateWeatherGuidanceBatchOptions({ includeNearTerm: false, includePrecipMap: true }), {
  includeNearTerm: false,
  includePrecipMap: true,
});

console.log("Weather API validation passed.");
