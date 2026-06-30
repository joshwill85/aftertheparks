import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20260627130000_weather_guidance_layer.sql",
  "utf8"
);
for (const table of [
  "weather_snapshots",
  "weather_alerts",
  "weather_material_changes",
]) {
  assert.match(migration, new RegExp(`create table if not exists public\\.${table}`), `${table} missing`);
}

const planItem = readFileSync("components/plan/PlanItem.tsx", "utf8");
assert.match(planItem, /EventWeatherSignal/);
assert.match(planItem, /item\.startDateTime/);
assert.match(planItem, /PlanSwapSuggestions/);

const swaps = readFileSync("lib/plan/swaps.ts", "utf8");
assert.match(swaps, /buildPlanBackupSuggestions/);
assert.match(swaps, /planItemNeedsWeatherBackup/);
assert.match(swaps, /weatherFitValueForActivity/);

const swapSuggestions = readFileSync("components/plan/PlanSwapSuggestions.tsx", "utf8");
for (const label of ["Find indoor backup", "Swap this", "Save backup"]) {
  assert.match(swapSuggestions, new RegExp(label));
}
assert.match(swapSuggestions, /buildPlanBackupSuggestions/);
assert.match(swapSuggestions, /Confirm swap/);

const timeline = readFileSync("components/plan/PlanTimeline.tsx", "utf8");
assert.doesNotMatch(timeline, /PlanWeatherPanel/);
assert.doesNotMatch(timeline, /scorePlanResilience/);
assert.doesNotMatch(timeline, /affectedItemCount/);

const panel = readFileSync("components/weather/PlanWeatherPanel.tsx", "utf8");
for (const label of [
  "Add backup",
  "Replace activity",
  "Move earlier",
  "Move later",
  "Keep as weather-dependent",
]) {
  assert.match(panel, new RegExp(label));
}
assert.match(panel, /PlanResilienceScore/);

console.log("Plan weather contracts passed.");
