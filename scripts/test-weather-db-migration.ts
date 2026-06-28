import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20260627130000_weather_guidance_layer.sql",
  "utf8"
);
const alertCacheMigration = readFileSync(
  "supabase/migrations/20260627183926_weather_alert_cache_state.sql",
  "utf8"
);

for (const table of [
  "weather_locations",
  "activity_weather_profiles",
  "weather_snapshots",
  "weather_alerts",
  "plan_weather_snapshots",
  "weather_material_changes",
]) {
  assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(migration, new RegExp(`Service role manages .*${table.replace(/_/g, " ")}`));
}

for (const locationKey of [
  "magic_kingdom_resort_area",
  "epcot_boardwalk_area",
  "skyliner_area",
  "animal_kingdom_lodge_area",
  "disney_springs_area",
  "all_wdw",
]) {
  assert.match(migration, new RegExp(locationKey));
}

assert.match(migration, /provider in \('weatherapi', 'nws_forecast', 'visual_crossing'\)/);
assert.match(migration, /official_alert_started/);
assert.match(migration, /official_alert_expired/);
assert.match(migration, /weather_alerts_active_idx/);
assert.match(migration, /activity_weather_profiles_tags_idx/);
assert.match(migration, /plan_weather_snapshots_plan_idx/);
assert.match(migration, /weather_material_changes_unacknowledged_idx/);
assert.match(migration, /revoke all on table[\s\S]*from anon, authenticated/);
assert.match(migration, /grant all on table[\s\S]*to service_role/);

assert.match(
  alertCacheMigration,
  /create table if not exists public\.weather_alert_cache_state/
);
assert.match(alertCacheMigration, /cache_key text primary key/);
assert.match(alertCacheMigration, /fetched_at timestamptz not null/);
assert.match(alertCacheMigration, /stale_after timestamptz not null/);
assert.match(alertCacheMigration, /active_alert_count integer not null default 0/);
assert.match(
  alertCacheMigration,
  /alter table public\.weather_alert_cache_state enable row level security/
);
assert.match(alertCacheMigration, /Service role manages weather alert cache state/);
assert.match(alertCacheMigration, /revoke all on table public\.weather_alert_cache_state from anon, authenticated/);
assert.match(alertCacheMigration, /grant all on table public\.weather_alert_cache_state to service_role/);

const verificationSql = readFileSync("supabase/sql/verify_weather_guidance.sql", "utf8");
assert.match(verificationSql, /weather_alert_cache_state/);
assert.match(verificationSql, /rls_enabled/);
assert.match(verificationSql, /service_role_can_insert/);

console.log("weather db migration contract passed");
