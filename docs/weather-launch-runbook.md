# Weather Launch Runbook

## Production Setup

1. Confirm `.env.local` contains:
   - `WEATHERAPI_KEY`
   - `WEATHERAPI_ENABLED=true`
   - `WEATHERAPI_PLAN=free`
   - `WEATHERAPI_FORECAST_DAYS=3`
   - `WEATHER_NOWCAST_ENABLED=true`
   - `WEATHER_PRECIP_MAPS_ENABLED=true`
   - `WEATHER_WARM_CACHE_ENABLED=true`
   - `NWS_USER_AGENT="AfterTheParks.com, contact@aftertheparks.com"`
   - `NWS_ALERTS_ENABLED=true`
   - `NWS_FORECAST_ENABLED=true`
   - `NWS_FORECAST_HOURS=168`
2. Sync weather env vars:
   ```bash
   npm run setup:weather-env:push
   ```
3. Verify Supabase weather tables, RLS, and service-role grants:
   ```bash
   npm run verify:weather-db
   ```
4. Keep these disabled unless a separate launch plan changes them:
   - `VISUAL_CROSSING_ENABLED=false`
   - `ROUTE_WEATHER_ENABLED=false`
   - `NEXT_PUBLIC_ROUTE_WEATHER_ENABLED=false`

## Smoke Checks

After deploy, verify:

```bash
curl "https://aftertheparks.com/api/weather/guidance?locationKey=all_wdw&includePrecipMap=true"
curl -X POST "https://aftertheparks.com/api/weather/guidance/batch" \
  -H "content-type: application/json" \
  -d '{"occurrences":[{"id":"smoke","locationKey":"all_wdw","startsAt":"2026-06-27T20:00:00-04:00"}]}'
curl "https://aftertheparks.com/api/weather/health"
```

Expected response fields:

- `guidance.forecastStatus`
- `guidance.nearTermRain`
- `guidance.precipMap` when `includePrecipMap=true`
- `officialAlertStatus`
- `alerts`
- `location.key`

Also check `/today`, `/tonight`, one resort page, one activity detail page, and `/plan`.

## Rollback Flags

Use these flags instead of removing code during an incident:

- `WEATHER_NOWCAST_ENABLED=false` hides near-term rain signals.
- `WEATHER_PRECIP_MAPS_ENABLED=false` hides precipitation map context.
- `WEATHER_WARM_CACHE_ENABLED=false` stops cron warming work while leaving the endpoint deployable.
- `WEATHERAPI_ENABLED=false` falls back toward NWS forecast behavior where available.
- `NWS_ALERTS_ENABLED=false` stops NWS alert fetches if api.weather.gov is unhealthy.

Never print or commit `WEATHERAPI_KEY`, Supabase service-role keys, or `CRON_SECRET`.
