import assert from "node:assert/strict";
import { getStormModeState } from "@/lib/weather/stormMode";

const state = getStormModeState({
  alerts: [
    {
      provider: "nws",
      id: "alert-1",
      event: "Severe Thunderstorm Warning",
      headline: "Severe Thunderstorm Warning",
      severity: "Severe",
      urgency: "Immediate",
      certainty: "Observed",
      effective: "2026-06-27T20:00:00-04:00",
      expires: "2026-06-27T21:00:00-04:00",
    },
  ],
  stormRisk: "high",
});

assert.equal(state.active, true);
assert.equal(state.level, "danger");
assert.equal(state.suppressOutdoorRecommendations, true);
assert.equal(state.promoteIndoorOptions, true);
assert.ok(state.affectedTags.includes("pool"));
assert.match(state.guidance, /Stay indoors|official guidance/i);

console.log("Storm Mode passed.");
