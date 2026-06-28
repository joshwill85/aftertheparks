#!/usr/bin/env bash
# Verify live Supabase weather tables, RLS, and service-role grants.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f "supabase/sql/verify_weather_guidance.sql" ]; then
  echo "Missing supabase/sql/verify_weather_guidance.sql" >&2
  exit 1
fi

echo "==> Weather migration dry-run"
echo "Run before applying: SUPABASE_TELEMETRY_DISABLED=1 supabase db push --linked --dry-run"

echo "==> Live weather schema verification"
SUPABASE_TELEMETRY_DISABLED=1 supabase db query --linked --file supabase/sql/verify_weather_guidance.sql --output table

echo "Expected: every row has exists=true, rls_enabled=true, and service_role_can_* = true."
