import assert from "node:assert/strict";
import { scorePlanResilience } from "@/lib/weather/resilience";

const score = scorePlanResilience({
  futureItems: 5,
  weatherSensitiveItems: 3,
  itemsWithIndoorBackups: 4,
  sameResortBackupCount: 3,
  transportWeatherRisk: "medium",
  stormModeActive: false,
  heatRisk: "medium",
  rainRisk: "medium",
  groupContext: ["grandparents"],
});

assert.ok(score.score >= 0 && score.score <= 100);
assert.ok(["strong", "flexible", "fragile", "unsafe"].includes(score.label));
assert.ok(score.reasons.length > 0);
assert.ok(score.improvements.length > 0);

console.log("Plan resilience passed.");
