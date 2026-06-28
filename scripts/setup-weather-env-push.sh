#!/usr/bin/env bash
# Push weather provider env vars from .env.local to Vercel.
# Values are never printed. WEATHERAPI_KEY is sent as sensitive/encrypted.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env.local ]; then
  echo "Missing .env.local with weather env values." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

required=(
  WEATHERAPI_KEY
  WEATHERAPI_ENABLED
  WEATHERAPI_PLAN
  WEATHERAPI_FORECAST_DAYS
  WEATHER_NOWCAST_ENABLED
  WEATHER_PRECIP_MAPS_ENABLED
  WEATHER_WARM_CACHE_ENABLED
  NWS_USER_AGENT
  NWS_ALERTS_ENABLED
  NWS_FORECAST_ENABLED
  NWS_FORECAST_HOURS
)

for name in "${required[@]}"; do
  if [ -z "${!name:-}" ]; then
    echo "Missing required weather env var: $name" >&2
    exit 1
  fi
done

vercel_set() {
  local name="$1" value="$2" env="$3" sensitive="$4"
  if [ "$env" = "preview" ]; then
    ./scripts/vercel-env-preview-all.sh "$name" "$value" "$sensitive"
    return
  fi

  vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true
  if [ "$sensitive" = "true" ]; then
    vercel env add "$name" "$env" --value "$value" --yes --force >/dev/null
  else
    vercel env add "$name" "$env" --value "$value" --no-sensitive --yes --force >/dev/null
  fi
  echo "  Vercel $env: $name"
}

push_var() {
  local name="$1" sensitive="${2:-false}"
  local value="${!name}"
  for env in production preview development; do
    vercel_set "$name" "$value" "$env" "$sensitive"
  done
}

echo "==> Pushing weather env vars to Vercel"
push_var WEATHERAPI_KEY true
push_var WEATHERAPI_ENABLED false
push_var WEATHERAPI_PLAN false
push_var WEATHERAPI_FORECAST_DAYS false
push_var WEATHER_NOWCAST_ENABLED false
push_var WEATHER_PRECIP_MAPS_ENABLED false
push_var WEATHER_WARM_CACHE_ENABLED false
push_var NWS_USER_AGENT false
push_var NWS_ALERTS_ENABLED false
push_var NWS_FORECAST_ENABLED false
push_var NWS_FORECAST_HOURS false

echo "Done. Weather env vars synced to Vercel without printing values."
