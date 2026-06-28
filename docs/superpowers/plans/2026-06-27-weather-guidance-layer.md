# Weather Guidance Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a weather-aware planning layer that uses free-first forecast sources, NWS official safety data, and After the Parks planning intelligence to guide resort activities, event cards, saved plans, and the story of a guest's day.

**Architecture:** Server-only provider clients fetch and normalize weather data into app-owned types through a hard-cache layer, then a provider router chooses the correct source by forecast horizon and runtime availability. The guidance engine converts forecast windows and alerts into activity decisions, Weather Windows, Story of the Day chapters, Storm Mode, and plan resilience guidance. UI components consume normalized weather summaries and never render provider JSON or provider icon URLs directly.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase/Postgres, WeatherAPI.com `forecast.json` for optional rich 0-3 day friendly data, NWS `points`, `forecastHourly`, `forecast`, and `alerts/active?point=LAT,LON` for official free 0-7 day forecast and alerts, optional Visual Crossing timeline forecast for 8-15 day planning outlooks, local `tsx` contract tests, existing After the Parks design tokens and card/list patterns.

---

## Consolidated Direction

The source plans agree on the core product move: weather should not be a generic forecast widget. It should become a dynamic decision layer that explains what the weather means for resort activities, tonight's plans, saved itineraries, and the way a resort day should flow.

The consolidated product rules are:

- Use NWS as the official U.S. safety alert source and the free official 0-7 day forecast backbone.
- Use WeatherAPI.com Free only for optional rich/friendly 0-3 day current, hourly, AQI, condition-code, and dual-unit forecast fields.
- Use Visual Crossing Free only for optional 8-15 day long-range planning outlooks when `VISUAL_CROSSING_ENABLED=true`.
- Show no live forecast beyond 15 days; show "Forecast will appear closer to your plan date."
- Keep all provider keys and provider fetches server-side.
- Normalize provider data into app-owned types before UI use.
- Render custom After the Parks weather icons, not provider icon URLs.
- Show weather only on current or future date/time cards and current or future plan items.
- Hide weather completely for past events and completed plan items.
- Show both Fahrenheit and Celsius everywhere weather appears.
- Let weather affect recommendations, backup prompts, filters, and plan warnings.
- Put NWS alerts above normal guidance and make them visually authoritative.
- Integrate weather into existing high-value pages instead of creating thin SEO weather pages.
- Make Weather Windows, event-card decision copy, Storm Mode, Story of the Day, and Plan Resilience first-class product modules.

## Integration Review

### Current Repo Fit

This repo already has the right foundations:

- Timed activity records live as `ActivityOccurrence` in `lib/types/occurrence.ts`.
- Timed fields already exist as `startDateTime` and `endDateTime`.
- Activity cards flow through `lib/events/mapToEventCard.ts` into `components/events/EventCard.tsx`.
- Today and tonight surfaces already exist at `app/today/page.tsx`, `app/tonight/page.tsx`, `components/atlas/TodayClient.tsx`, and `components/atlas/TonightClient.tsx`.
- Saved plans already exist through `itineraries` and `itinerary_items` in `supabase/migrations/20260624120000_guest_itinerary.sql`.
- Plan UI already has `components/plan/PlanItem.tsx`, `components/plan/PlanTimeline.tsx`, and shared/public plan routes.
- SEO-fit weather hints already exist in `lib/seo/fit.ts`, including rain-safe, heat-safe, lightning-risk, and transport weather risk fields.
- Design tokens already live in `src/styles/tokens.css`, and UI polish lives in `src/styles/polish.css`.
- Existing repo tests are mostly direct `tsx` scripts under `scripts/`, so new weather contract tests should follow that style.

### Adjustments To The Original Plans

- Do not create separate `/api/weather/current`, `/api/weather/forecast`, and `/api/weather/alerts` endpoints first. Start with a single composed `GET /api/weather/guidance` endpoint because the app surfaces need decisions more than raw forecast fragments. Add raw/debug endpoints only behind development or admin needs.
- Add `POST /api/weather/guidance/batch` before card/page integrations so cards summarize from cached weather snapshots instead of triggering per-card provider fetches.
- Do not rely on server in-memory cache as quota protection. Weather provider calls must use a hard cache: request memoization, shared provider snapshot cache, and durable last-known-good snapshots. Use the repo's current Next caching model: if Cache Components are enabled, prefer `use cache`; otherwise use `unstable_cache` or cached `fetch` with `next.revalidate`.
- Do not make Figma work a blocker for the first engineering slice. Build an accessible CSS/SVG placeholder icon registry with final semantic keys, then replace asset paths after the Figma icon library is exported.
- Do not create new public weather SEO pages. Weather belongs inside `/today`, `/tonight`, `/resorts/[slug]`, `/activities/[slug]`, guide modules, and plan pages.
- Keep WeatherAPI alerts off in the forecast request for launch. The official safety layer is NWS.
- Treat WeatherAPI condition-code coverage as a CI contract. The condition-code seed should be checked into `data/weather/weatherapi-conditions.json`.
- Enforce the free MVP policy in code: paid providers are disabled, WeatherAPI Free cannot exceed 3 days, NWS forecast covers through 168 hours, Visual Crossing is optional for 8-15 day planning outlooks, and no provider shows weather beyond 15 days.
- Do not add Tomorrow.io, OpenWeather paid forecast products, Google Weather, or hosted Open-Meteo free commercial usage to the MVP without explicit approval.
- Make partial provider failure non-fatal. Forecast failure must not erase NWS alert status; NWS alert failure must not erase an otherwise usable forecast.
- Expired NWS alerts must never activate Storm Mode or render as active, even if stale cached alert data exists.

### Source Verification

Reviewed on 2026-06-27:

- WeatherAPI pricing still lists 100K calls/month on Free, 3-day forecast/future weather on Free, 7-day forecast/future weather on Starter, realtime updates every 10-15 minutes, and forecast updates every 4-6 hours.
- WeatherAPI docs still document `forecast.json`, latitude/longitude `q`, `days` values from 1 to 14, `alerts=yes|no`, and `aqi=yes|no`.
- WeatherAPI publishes a condition-code JSON list with `code`, day label, night label, and icon id.
- NWS docs still require a unique User-Agent, describe the API as cache-friendly, and support `Accept: application/geo+json`.
- NWS alerts docs still list `https://api.weather.gov/alerts/active?point=39,-90` style point queries and recommend requests no more than every 30 seconds.
- NWS `points/{latitude},{longitude}` exposes `forecast`, `forecastHourly`, and `forecastGridData` links suitable for the official 0-7 day forecast layer.
- Visual Crossing is optional for the 8-15 day long-range planning outlook; it must be attribution-aware and must not expose raw provider data for public download.
- Rechecked live provider docs while updating this plan: NWS confirms open/free API usage, User-Agent requirement, and seven-day `forecast`/`forecastHourly`/`forecastGridData` links from `/points`; Visual Crossing confirms 1,000 free records/day and public-display/raw-download licensing constraints.
- Next.js docs say `unstable_cache` has been replaced by `use cache` in Next.js 16 when Cache Components are enabled; this repo should use its current caching model rather than forcing a framework-wide migration.

Official source links:

- WeatherAPI pricing: `https://www.weatherapi.com/pricing.aspx`
- WeatherAPI forecast docs: `https://www.weatherapi.com/docs/`
- WeatherAPI condition codes: `https://www.weatherapi.com/docs/weather_conditions.json`
- NWS API docs: `https://www.weather.gov/documentation/services-web-api`
- NWS alerts docs: `https://www.weather.gov/documentation/services-web-alerts`
- Visual Crossing pricing: `https://www.visualcrossing.com/weather-data-pricing/`
- Visual Crossing Weather API: `https://www.visualcrossing.com/weather-api/`
- Next.js `unstable_cache`: `https://nextjs.org/docs/app/api-reference/functions/unstable_cache`

## File Structure

Create:

- `lib/weather/types.ts` - app-owned weather types, risk enums, icon keys, and UI detail shapes.
- `lib/weather/sourcePolicy.ts` - free MVP source policy, paid-provider guardrails, attribution flags, and provider allowlist.
- `lib/weather/forecastHorizon.ts` - forecast horizon confidence policy and provider routing constants.
- `lib/weather/locations.ts` - WDW weather location points and resort-to-location mapping.
- `lib/weather/weatherapi.ts` - server-only WeatherAPI client and normalizer.
- `lib/weather/nws.ts` - server-only NWS alerts client and normalizer.
- `lib/weather/nwsForecast.ts` - server-only NWS points, hourly forecast, and period forecast client.
- `lib/weather/visualcrossing.ts` - optional server-only Visual Crossing 8-15 day planning outlook client.
- `lib/weather/providerRouter.ts` - provider selection by event timing and forecast horizon.
- `lib/weather/cache.ts` - cache wrappers, TTL constants, and stale-data helpers.
- `lib/weather/hardCache.ts` - shared provider snapshot cache, last-known-good fallback, single-flight dedupe, cache keys, and quota modes.
- `lib/weather/time.ts` - timezone-safe parsing for WeatherAPI local strings, NWS ISO strings, and WDW plan times.
- `lib/weather/icons.ts` - WeatherAPI condition-code to After the Parks icon mapping.
- `lib/weather/nwsIconMap.ts` - NWS phrase/forecast icon mapping to `WeatherIconKey`.
- `lib/weather/visualCrossingIconMap.ts` - Visual Crossing icon mapping to `WeatherIconKey`.
- `lib/weather/format.ts` - dual-unit formatting helpers.
- `lib/weather/occurrence.ts` - `shouldShowWeatherForOccurrence` and time-span summarization.
- `lib/weather/guidance.ts` - rules engine for forecast, alerts, activity profile, and plan impact.
- `lib/weather/activityProfiles.ts` - conversion from existing SEO fit metadata to weather profiles.
- `lib/weather/thresholds.ts` - activity-specific weather thresholds for rain, storm, heat, wind, and audience sensitivity.
- `lib/weather/windows.ts` - Weather Window generator for go-now, shift-earlier, save-for-later, and stay-indoors planning blocks.
- `lib/weather/dayStory.ts` - Story of the Day chapter generator.
- `lib/weather/resilience.ts` - saved-plan resilience scoring.
- `lib/weather/stormMode.ts` - site-wide Storm Mode state and outdoor suppression rules.
- `lib/weather/forecastCompare.ts` - constrained "if we go earlier" comparison logic.
- `lib/weather/resortWeatherProfiles.ts` - data-backed resort weather personality profiles.
- `lib/weather/routeWeather.ts` - later V2 route-weather impact model for resort-hop legs.
- `lib/weather/materialChange.ts` - saved-plan weather material-change detection.
- `data/weather/weatherapi-conditions.json` - checked-in WeatherAPI condition-code seed.
- `app/api/weather/guidance/route.ts` - composed guidance endpoint.
- `app/api/weather/guidance/batch/route.ts` - batch occurrence weather endpoint that groups by weather location and reuses cached snapshots.
- `components/weather/WeatherIcon.tsx` - custom icon renderer using semantic icon keys.
- `components/weather/WeatherIconButton.tsx` - compact card control.
- `components/weather/WeatherTimeSpanPopover.tsx` - desktop/mobile detail surface using native dialog semantics.
- `components/weather/WeatherStatusStrip.tsx` - page-level status strip.
- `components/weather/NwsAlertBanner.tsx` - official alert banner.
- `components/weather/ForecastTimeline.tsx` - compact today/tonight forecast windows.
- `components/weather/PlanWeatherPanel.tsx` - saved-plan weather summary and actions.
- `components/weather/ActivityWeatherBadge.tsx` - weather-fit badges for cards/detail pages.
- `components/weather/WeatherWindowStrip.tsx` - page-level Weather Windows.
- `components/weather/WeatherWindowCard.tsx` - individual Weather Window card.
- `components/weather/WeatherStoryStrip.tsx` - Story of the Day chapter strip.
- `components/weather/PlanResilienceScore.tsx` - plan resilience label, score, reasons, and improvements.
- `components/weather/StormModeBanner.tsx` - official alert and storm posture banner.
- `components/weather/StormModeActivitySuppression.tsx` - suppressed outdoor recommendation state.
- `components/weather/ForecastCompare.tsx` - constrained timing comparison UI.
- `components/weather/ResortWeatherPersonality.tsx` - resort weather-fit profile module.
- `components/weather/RouteWeatherImpact.tsx` - later V2 UI only; do not render in MVP unless `ROUTE_WEATHER_ENABLED=true`.
- `scripts/test-weather-free-source-policy.ts` - free source policy and paid-provider guardrail contract.
- `scripts/test-forecast-horizon-policy.ts` - provider horizon routing contract.
- `scripts/test-weather-cache-contract.ts` - hard-cache and provider-call contract.
- `scripts/test-weather-partial-failure.ts` - `Promise.allSettled` and fallback behavior contract.
- `scripts/test-weather-alert-expiry.ts` - expired/future/stale alert status and Storm Mode contract.
- `scripts/test-weather-timezone.ts` - timezone-safe parsing and occurrence timing contract.
- `scripts/test-weather-api-validation.ts` - guidance endpoint input validation contract.
- `scripts/test-weather-server-only.ts` - provider modules cannot enter client bundles.
- `scripts/test-weather-condition-map.ts` - icon parity and asset contract.
- `scripts/test-nws-forecast.ts` - NWS points/forecast normalizer contract.
- `scripts/test-visualcrossing-normalizer.ts` - Visual Crossing planning outlook normalizer contract.
- `scripts/test-weather-provider-routing.ts` - provider selection contract by time span.
- `scripts/test-weather-occurrence.ts` - no-weather-on-past-events and time-span selection.
- `scripts/test-weather-guidance.ts` - rules engine coverage.
- `scripts/test-weather-thresholds.ts` - activity-specific threshold contract.
- `scripts/test-weather-windows.ts` - Weather Window output contract.
- `scripts/test-weather-day-story.ts` - Story of the Day chapter/action contract.
- `scripts/test-plan-resilience.ts` - plan resilience scoring contract.
- `scripts/test-weather-storm-mode.ts` - Storm Mode suppression and safety-language contract.
- `scripts/test-forecast-compare.ts` - constrained timing comparison contract.
- `scripts/test-resort-weather-profiles.ts` - resort weather profile coverage contract.
- `scripts/test-route-weather.ts` - later V2 route-weather contract.
- `scripts/test-plan-weather-material-change.ts` - saved-plan weather material-change contract.
- `scripts/test-weather-card-decision-copy.ts` - event card action-copy contract.
- `scripts/test-weather-format.ts` - dual-unit formatting coverage.
- `scripts/test-weather-ui-contracts.ts` - static checks for no WeatherAPI icon URL use and visible dual units.
- `supabase/migrations/20260627130000_weather_guidance_layer.sql` - weather plan snapshot tables and activity weather profile tables.

Modify:

- `lib/types/occurrence.ts` - add optional weather profile fields to activities and plan item snapshot types.
- `lib/seo/fit.ts` - keep existing SEO fit source, export helpers that weather profiles can reuse.
- `lib/events/mapToEventCard.ts` - include weather query input in card props.
- `components/events/EventCard.tsx` - render weather icon button when weather summary exists.
- `components/activity/ActivityCard.tsx` - pass activity occurrence weather context.
- `components/tonight/MovieCard.tsx` and `components/tonight/NightActivityCard.tsx` - pass movie/activity weather context.
- `components/atlas/TodayClient.tsx` - fetch and render status strip plus card weather summaries.
- `components/atlas/TonightClient.tsx` - fetch and render status strip, timeline, and card weather summaries.
- `components/plan/PlanItem.tsx` - hide past weather, show future/current item weather.
- `components/plan/PlanTimeline.tsx` - render plan-level weather panel.
- `app/resorts/[slug]/page.tsx` - render resort-area weather module.
- `app/activities/[slug]/page.tsx` - render activity caveats and upcoming occurrence weather.
- `src/styles/tokens.css` - add semantic weather tokens.
- `src/styles/polish.css` - add weather component styling.
- `package.json` - add weather test scripts to `validate:contracts`.
- `.env.example` - document WeatherAPI, NWS, Visual Crossing, attribution, forecast horizon, and paid-provider guardrail variables.

## Data Contracts

Use these contracts as the source of truth for implementation.

```ts
export type WeatherLocationKey =
  | "magic_kingdom_resort_area"
  | "epcot_boardwalk_area"
  | "skyliner_area"
  | "animal_kingdom_lodge_area"
  | "disney_springs_area"
  | "all_wdw";

export type WeatherIconKey =
  | "sunny_day"
  | "clear_night"
  | "partly_cloudy_day"
  | "partly_cloudy_night"
  | "cloudy"
  | "overcast"
  | "mist"
  | "fog"
  | "haze"
  | "smoke"
  | "dust"
  | "patchy_rain"
  | "light_rain"
  | "moderate_rain"
  | "heavy_rain"
  | "rain_shower"
  | "torrential_rain"
  | "drizzle"
  | "freezing_drizzle"
  | "freezing_rain"
  | "thunder_possible"
  | "rain_with_thunder"
  | "snow"
  | "sleet"
  | "ice_pellets"
  | "wind"
  | "heat"
  | "official_alert"
  | "unknown";

export type WeatherRiskLevel = "low" | "medium" | "high";
export type OutdoorFit = "great" | "good" | "mixed" | "poor" | "unsafe";

export interface WeatherHour {
  source: "weatherapi" | "nws_forecast" | "visual_crossing";
  time: string;
  conditionText: string;
  conditionCode?: number;
  providerConditionCode?: string | number;
  iconKey: WeatherIconKey;
  tempF: number;
  tempC: number;
  feelsLikeF?: number;
  feelsLikeC?: number;
  chanceOfRainPct?: number;
  chanceOfThunderPct?: number;
  precipIn?: number;
  precipMm?: number;
  windMph?: number;
  windKph?: number;
  gustMph?: number;
  gustKph?: number;
  uvIndex?: number;
  isDay: boolean;
}

export interface WeatherAttribution {
  provider: "weatherapi" | "nws" | "visual_crossing";
  label: string;
  required: boolean;
  href?: string;
}

export type ForecastConfidence =
  | "current_conditions"
  | "near_term_hourly"
  | "official_7_day"
  | "long_range_planning"
  | "not_available_yet";

export type WeatherProviderId =
  | "weatherapi"
  | "nws_alerts"
  | "nws_forecast"
  | "visual_crossing"
  | "none";

export type WeatherProviderRole =
  | "friendly_current_0_3_day"
  | "official_alerts"
  | "official_0_7_day_forecast"
  | "free_8_15_day_planning_outlook";

export interface WeatherDay {
  source: "weatherapi" | "nws_forecast" | "visual_crossing";
  date: string;
  conditionText: string;
  iconKey: WeatherIconKey;
  maxTempF?: number;
  maxTempC?: number;
  minTempF?: number;
  minTempC?: number;
  avgTempF?: number;
  avgTempC?: number;
  chanceOfRainPct?: number;
  chanceOfThunderPct?: number;
  totalPrecipIn?: number;
  totalPrecipMm?: number;
  maxWindMph?: number;
  maxWindKph?: number;
  uvIndex?: number;
  confidence: ForecastConfidence;
}

export interface WeatherAlert {
  provider: "nws";
  id: string;
  event: string;
  headline: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  urgency: "Immediate" | "Expected" | "Future" | "Past" | "Unknown";
  certainty: "Observed" | "Likely" | "Possible" | "Unlikely" | "Unknown";
  effective: string;
  expires: string;
  areaDesc?: string;
  instruction?: string;
  description?: string;
  sourceUrl?: string;
}

export interface WeatherRisk {
  overallOutdoorFit: OutdoorFit;
  rainRisk: WeatherRiskLevel;
  stormRisk: WeatherRiskLevel;
  heatRisk: WeatherRiskLevel;
  windRisk: WeatherRiskLevel;
  indoorBackupRecommended: boolean;
  outdoorActivitiesLikelyAffected: boolean;
  poolActivitiesLikelyAffected: boolean;
  campfiresLikelyAffected: boolean;
  outdoorMoviesLikelyAffected: boolean;
  skylinerCaution: boolean;
  boatCaution: boolean;
}

export interface WeatherSnapshot {
  locationKey: WeatherLocationKey;
  provider: WeatherProviderId;
  confidence: ForecastConfidence;
  fetchedAt: string;
  observedAt?: string;
  forecastUpdatedAt?: string;
  expiresAt: string;
  staleAfter: string;
  isStale: boolean;
  conditionText?: string;
  iconKey?: WeatherIconKey;
  tempF?: number;
  tempC?: number;
  feelsLikeF?: number;
  feelsLikeC?: number;
  risk: WeatherRisk;
  hourly: WeatherHour[];
  daily: WeatherDay[];
  attribution?: WeatherAttribution;
}

export type OfficialAlertStatus = "available" | "stale" | "unavailable";
export type ForecastStatus =
  | "available"
  | "stale"
  | "unavailable"
  | "not_available_yet";

export type WeatherWindowAction =
  | "go_now"
  | "shift_earlier"
  | "save_for_later"
  | "bring_backup"
  | "avoid_for_now"
  | "stay_indoors"
  | "official_alert";

export type ActivityWeatherFit =
  | "indoor"
  | "covered"
  | "mostly_indoor"
  | "outdoor_shaded"
  | "outdoor_uncovered"
  | "pool"
  | "campfire"
  | "outdoor_movie"
  | "boat_dependent"
  | "skyliner_dependent"
  | "walking_heavy"
  | "low_walking"
  | "heat_sensitive"
  | "storm_sensitive";

export type WeatherDecisionState =
  | "go"
  | "good_with_caveat"
  | "bring_backup"
  | "indoor_backup_recommended"
  | "likely_affected"
  | "avoid_outdoor"
  | "official_alert_follow_guidance";

export interface WeatherWindow {
  id: string;
  locationKey: WeatherLocationKey;
  startsAt: string;
  endsAt: string;
  title: string;
  chapterLabel:
    | "Sunshine Start"
    | "Heat Buildup"
    | "Rain Window"
    | "Starlight Reset"
    | "Storm Mode"
    | "Indoor Backup Window";
  action: WeatherWindowAction;
  headline: string;
  plainLanguageSummary: string;
  recommendedActivityTags: ActivityWeatherFit[];
  cautionActivityTags: ActivityWeatherFit[];
  avoidActivityTags: ActivityWeatherFit[];
  deepLinks: Array<{ label: string; href: string }>;
}

export type PlanResilienceLabel = "strong" | "flexible" | "fragile" | "unsafe";

export interface PlanResilienceScore {
  label: PlanResilienceLabel;
  score: number;
  headline: string;
  reasons: string[];
  improvements: Array<{
    action:
      | "add_same_resort_indoor_backup"
      | "move_pool_time_earlier"
      | "replace_outdoor_movie"
      | "reduce_transport_weather_risk"
      | "mark_weather_dependent"
      | "stay_indoors";
    label: string;
    href?: string;
  }>;
}

export interface StormModeState {
  active: boolean;
  level: "none" | "caution" | "official_alert" | "danger";
  headline: string;
  guidance: string;
  suppressOutdoorRecommendations: boolean;
  promoteIndoorOptions: boolean;
  affectedTags: ActivityWeatherFit[];
  source: "nws" | "forecast_risk";
}

export interface ResortWeatherProfile {
  resortSlug: string;
  indoorBackupDepth: "low" | "medium" | "high";
  coveredWanderingFit: "low" | "medium" | "high";
  outdoorExposure: "low" | "medium" | "high";
  transportWeatherSensitivity: "low" | "medium" | "high";
  heatWalkingIntensity: "low" | "medium" | "high";
  rainyDaySummary: string;
  heatDaySummary: string;
  stormDaySummary: string;
}

export interface RouteWeatherLegImpact {
  fromResortSlug: string;
  toResortSlug: string;
  transportMode: "walk" | "boat" | "monorail" | "skyliner" | "bus" | "rideshare";
  routeType: "direct" | "one_transfer" | "multi_transfer";
  expectedStartAt: string;
  expectedEndAt: string;
  weatherLocationKeys: WeatherLocationKey[];
  weatherDecisionState: WeatherDecisionState;
  caution: string;
}
```

## Product Weather Intelligence Modules

The weather layer must not stop at icons, condition text, and forecast timelines. It should produce planning intelligence:

- **Weather Windows:** action-oriented time blocks such as Go now, Shift earlier, Save for later, Bring backup, Avoid for now, Stay indoors, and Official alert.
- **Story of the Day:** calm chaptered narration such as Sunshine Start, Heat Buildup, Rain Window, Starlight Reset, Storm Mode, and Indoor Backup Window.
- **Event-card decision states:** visible card copy such as Good to go, Go earlier, Bring backup, Likely affected, Stay indoors, and Official alert.
- **Storm Mode:** site-wide safety posture that suppresses outdoor recommendations and promotes indoor options when NWS alerts or high storm risk require it.
- **Plan Resilience Score:** saved-plan score from 0-100 with strong/flexible/fragile/unsafe labels, reasons, and one-tap improvements.
- **Weather-aware resort personality:** data-backed resort modules explaining rainy-day, heat-day, and storm-day strengths without fluffy unsupported copy.
- **Forecast Compare:** constrained "if we go earlier" timing comparison only when the activity is flexible and forecast confidence supports it.
- **Activity thresholds:** internal per-activity thresholds for pool, boat, Skyliner, outdoor movie, campfire, walks, scavenger hunts, toddlers, grandparents, and first-night plans.
- **Route weather:** later V2 route-leg impact for same-resort, walk, monorail, Skyliner, boat, direct bus, and rideshare/Minnie Van fallback.

Priority order:

1. Free provider routing and forecast horizon policy.
2. NWS alerts plus NWS 7-day forecast.
3. WeatherAPI near-term friendly layer.
4. Visual Crossing 8-15 day planning outlook.
5. Occurrence time-span weather.
6. Event-card decision states.
7. Weather Windows.
8. Storm Mode.
9. Story of the Day.
10. Plan Resilience Score.
11. Weather-aware resort personality.
12. Forecast Compare.
13. Route-based resort-hop weather.
14. Minute-by-minute/hyperlocal provider evaluation.

## Task 0: Add Free Forecast Source And Horizon Guardrails

**Files:**
- Create: `lib/weather/sourcePolicy.ts`
- Create: `lib/weather/forecastHorizon.ts`
- Test: `scripts/test-weather-free-source-policy.ts`
- Test: `scripts/test-forecast-horizon-policy.ts`
- Modify: `.env.example`
- Modify: `package.json`

- [ ] **Step 1: Write the free source policy test**

```ts
import assert from "node:assert/strict";
import { WEATHER_SOURCE_POLICY } from "../lib/weather/sourcePolicy";

assert.equal(WEATHER_SOURCE_POLICY.paidProvidersAllowed, false);
assert.equal(WEATHER_SOURCE_POLICY.weatherApi.maxForecastDaysOnFree, 3);
assert.equal(WEATHER_SOURCE_POLICY.weatherApi.useAlerts, false);
assert.equal(WEATHER_SOURCE_POLICY.nws.maxForecastHours, 168);
assert.equal(WEATHER_SOURCE_POLICY.nws.requiresUserAgent, true);
assert.equal(WEATHER_SOURCE_POLICY.visualCrossing.enabled, false);
assert.equal(WEATHER_SOURCE_POLICY.visualCrossing.maxForecastDaysOnFree, 15);
assert.equal(WEATHER_SOURCE_POLICY.visualCrossing.requiresAttribution, true);
assert.ok(WEATHER_SOURCE_POLICY.disallowedFreeMvpProviders.includes("tomorrow_io_free_production"));
assert.ok(WEATHER_SOURCE_POLICY.disallowedFreeMvpProviders.includes("open_meteo_hosted_free_for_commercial"));
assert.ok(WEATHER_SOURCE_POLICY.disallowedFreeMvpProviders.includes("openweather_free_16_day"));

const envDays = Number(process.env.WEATHERAPI_FORECAST_DAYS ?? "3");
assert.ok(envDays <= 3, "Free MVP must not set WEATHERAPI_FORECAST_DAYS above 3");

console.log("Weather free source policy passed.");
```

- [ ] **Step 2: Write the forecast horizon test**

```ts
import assert from "node:assert/strict";
import {
  FORECAST_HORIZON_POLICY,
  chooseForecastHorizon,
} from "../lib/weather/forecastHorizon";

assert.equal(FORECAST_HORIZON_POLICY.hours0To72.preferredProvider, "weatherapi");
assert.equal(FORECAST_HORIZON_POLICY.hours72To168.preferredProvider, "nws_forecast");
assert.equal(FORECAST_HORIZON_POLICY.days8To15.preferredProvider, "visual_crossing");
assert.equal(FORECAST_HORIZON_POLICY.beyondDay15.preferredProvider, null);

const now = new Date("2026-06-27T12:00:00-04:00");
assert.equal(chooseForecastHorizon({ now, startsAt: "2026-06-27T18:00:00-04:00" }).provider, "weatherapi");
assert.equal(chooseForecastHorizon({ now, startsAt: "2026-07-01T18:00:00-04:00" }).provider, "nws_forecast");
assert.equal(chooseForecastHorizon({ now, startsAt: "2026-07-08T18:00:00-04:00" }).provider, "visual_crossing");
assert.equal(chooseForecastHorizon({ now, startsAt: "2026-07-20T18:00:00-04:00" }).provider, "none");
assert.equal(chooseForecastHorizon({ now, startsAt: "2026-06-26T18:00:00-04:00" }).provider, "none");
assert.equal(
  chooseForecastHorizon({ now, startsAt: "2026-06-27T18:00:00-04:00", weatherApiAvailable: false }).provider,
  "nws_forecast"
);
assert.equal(
  chooseForecastHorizon({ now, startsAt: "2026-07-08T18:00:00-04:00", visualCrossingAvailable: false }).provider,
  "none"
);

console.log("Forecast horizon policy passed.");
```

- [ ] **Step 3: Run the failing tests**

Run:

```bash
npx tsx scripts/test-weather-free-source-policy.ts
npx tsx scripts/test-forecast-horizon-policy.ts
```

Expected: FAIL with module-not-found for `lib/weather/sourcePolicy` and `lib/weather/forecastHorizon`.

- [ ] **Step 4: Create `lib/weather/sourcePolicy.ts`**

```ts
export const WEATHER_SOURCE_POLICY = {
  paidProvidersAllowed: false,
  weatherApi: {
    enabled: true,
    role: "friendly_current_0_3_day",
    maxForecastDaysOnFree: 3,
    monthlyFreeCallLimit: 100_000,
    commercialUseAllowedOnFree: true,
    useAlerts: false,
  },
  nws: {
    enabled: true,
    role: "official_alerts_and_0_7_day_forecast",
    maxForecastHours: 168,
    alertsMinRefreshSeconds: 30,
    requiresUserAgent: true,
    commercialUseAllowed: true,
    cost: "free_open_data",
  },
  visualCrossing: {
    enabled: false,
    role: "free_8_15_day_planning_outlook",
    maxForecastDaysOnFree: 15,
    freeRecordsPerDay: 1000,
    commercialUseAllowedOnFree: true,
    requiresAttribution: true,
    publicRawDownloadAllowed: false,
  },
  disallowedFreeMvpProviders: [
    "tomorrow_io_free_production",
    "open_meteo_hosted_free_for_commercial",
    "openweather_free_16_day",
    "google_weather",
    "visualcrossing_paid",
  ],
} as const;
```

- [ ] **Step 5: Create `lib/weather/forecastHorizon.ts`**

```ts
import type { ForecastConfidence, WeatherProviderId } from "@/lib/weather/types";

export const FORECAST_HORIZON_POLICY = {
  hours0To72: {
    preferredProvider: "weatherapi",
    fallbackProvider: "nws_forecast",
    confidence: "near_term_hourly",
    allowEventTimeDecisions: true,
  },
  hours72To168: {
    preferredProvider: "nws_forecast",
    fallbackProvider: "visual_crossing",
    confidence: "official_7_day",
    allowEventTimeDecisions: true,
  },
  days8To15: {
    preferredProvider: "visual_crossing",
    fallbackProvider: null,
    confidence: "long_range_planning",
    allowEventTimeDecisions: false,
  },
  beyondDay15: {
    preferredProvider: null,
    fallbackProvider: null,
    confidence: "not_available_yet",
    allowEventTimeDecisions: false,
  },
} as const;

export function chooseForecastHorizon(input: {
  now: Date;
  startsAt?: string | null;
  weatherApiAvailable?: boolean;
  visualCrossingAvailable?: boolean;
}): {
  provider: WeatherProviderId;
  confidence: ForecastConfidence;
  allowEventTimeDecisions: boolean;
  reason: string;
} {
  if (!input.startsAt) {
    return {
      provider: "nws_forecast",
      confidence: "official_7_day",
      allowEventTimeDecisions: false,
      reason: "No event time; use the general official WDW-area forecast.",
    };
  }

  const startsAt = new Date(input.startsAt);
  const hoursOut = (startsAt.getTime() - input.now.getTime()) / (1000 * 60 * 60);

  if (hoursOut < 0) {
    return {
      provider: "none",
      confidence: "not_available_yet",
      allowEventTimeDecisions: false,
      reason: "Past events do not show weather.",
    };
  }
  if (hoursOut <= 72) {
    if (input.weatherApiAvailable === false) {
      return {
        provider: "nws_forecast",
        confidence: "official_7_day",
        allowEventTimeDecisions: true,
        reason: "WeatherAPI disabled or unavailable; using NWS forecast.",
      };
    }
    return {
      provider: "weatherapi",
      confidence: "near_term_hourly",
      allowEventTimeDecisions: true,
      reason: "WeatherAPI Free supports rich 0-3 day forecast.",
    };
  }
  if (hoursOut <= 168) {
    return {
      provider: "nws_forecast",
      confidence: "official_7_day",
      allowEventTimeDecisions: true,
      reason: "NWS supports free official forecast through 7 days.",
    };
  }
  if (hoursOut <= 15 * 24) {
    if (input.visualCrossingAvailable === false) {
      return {
        provider: "none",
        confidence: "not_available_yet",
        allowEventTimeDecisions: false,
        reason: "Long-range outlook provider is disabled.",
      };
    }
    return {
      provider: "visual_crossing",
      confidence: "long_range_planning",
      allowEventTimeDecisions: false,
      reason: "Visual Crossing Free supports a 15-day planning outlook.",
    };
  }
  return {
    provider: "none",
    confidence: "not_available_yet",
    allowEventTimeDecisions: false,
    reason: "Forecast appears closer to the plan date.",
  };
}
```

Add runtime availability helpers:

```ts
export function isWeatherApiAvailable() {
  return (
    process.env.WEATHERAPI_ENABLED === "true" &&
    Boolean(process.env.WEATHERAPI_KEY) &&
    process.env.WEATHERAPI_PLAN === "free" &&
    Number(process.env.WEATHERAPI_FORECAST_DAYS ?? "3") <= 3
  );
}

export function isVisualCrossingAvailable() {
  return (
    process.env.VISUAL_CROSSING_ENABLED === "true" &&
    Boolean(process.env.VISUAL_CROSSING_KEY) &&
    Number(process.env.VISUAL_CROSSING_FORECAST_DAYS ?? "15") <= 15
  );
}
```

- [ ] **Step 6: Update `.env.example`**

Replace the weather env section with:

```bash
# WeatherAPI.com Free: optional friendly current / 0-3 day layer
WEATHERAPI_KEY=
WEATHERAPI_PLAN=free
WEATHERAPI_FORECAST_DAYS=3
WEATHERAPI_ENABLED=true
WEATHERAPI_MONTHLY_FREE_CALL_LIMIT=100000

# National Weather Service: official alerts + free 0-7 day forecast
NWS_USER_AGENT="AfterTheParks.com, contact@aftertheparks.com"
NWS_ALERTS_ENABLED=true
NWS_FORECAST_ENABLED=true
NWS_FORECAST_HOURS=168

# Visual Crossing Free: optional 8-15 day planning outlook
VISUAL_CROSSING_KEY=
VISUAL_CROSSING_ENABLED=false
VISUAL_CROSSING_FORECAST_DAYS=15
VISUAL_CROSSING_FREE_RECORDS_PER_DAY=1000
VISUAL_CROSSING_ATTRIBUTION_ENABLED=true

# Safety and cost guardrails
PAID_WEATHER_PROVIDERS_ALLOWED=false
WEATHER_LONG_RANGE_MAX_DAYS=15
WEATHER_SHOW_PAST_EVENTS=false
```

- [ ] **Step 7: Run the passing tests**

Run:

```bash
npx tsx scripts/test-weather-free-source-policy.ts
npx tsx scripts/test-forecast-horizon-policy.ts
```

Expected: both commands pass.

- [ ] **Step 8: Commit**

```bash
git add lib/weather/sourcePolicy.ts lib/weather/forecastHorizon.ts scripts/test-weather-free-source-policy.ts scripts/test-forecast-horizon-policy.ts .env.example package.json
git commit -m "feat: add weather source guardrails"
```

## Task 0B: Add Hard Cache, Server-Only, Alert Expiry, And Time Safety

**Files:**
- Create: `lib/weather/hardCache.ts`
- Create: `lib/weather/time.ts`
- Test: `scripts/test-weather-cache-contract.ts`
- Test: `scripts/test-weather-partial-failure.ts`
- Test: `scripts/test-weather-alert-expiry.ts`
- Test: `scripts/test-weather-timezone.ts`
- Test: `scripts/test-weather-server-only.ts`
- Modify: `lib/weather/cache.ts`
- Modify: `lib/weather/nws.ts`
- Modify: `lib/weather/weatherapi.ts`
- Modify: `lib/weather/nwsForecast.ts`
- Modify: `lib/weather/visualcrossing.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the cache contract test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { weatherCacheKeys, WEATHER_QUOTA_MODES } from "../lib/weather/hardCache";

assert.equal(
  weatherCacheKeys.weatherApi3Day("all_wdw"),
  "weather:v1:weatherapi:all_wdw:days3:aqi1:alerts0"
);
assert.match(weatherCacheKeys.nwsAlerts("all_wdw"), /weather:v1:nws-alerts:all_wdw/);
assert.match(weatherCacheKeys.visualCrossingDaily15("all_wdw"), /days15:include-days/);
assert.ok(WEATHER_QUOTA_MODES.conserve.weatherApiTtlSeconds > WEATHER_QUOTA_MODES.normal.weatherApiTtlSeconds);
assert.ok(WEATHER_QUOTA_MODES.critical.visualCrossingTtlSeconds > WEATHER_QUOTA_MODES.conserve.visualCrossingTtlSeconds);

const batchRoute = readFileSync("app/api/weather/guidance/batch/route.ts", "utf8");
assert.match(batchRoute, /getCachedWeatherSnapshot/);
assert.doesNotMatch(batchRoute, /occurrences\.map\(.*fetchWeatherApiForecast/s);

for (const file of [
  "components/atlas/TodayClient.tsx",
  "components/atlas/TonightClient.tsx",
  "components/events/EventCard.tsx",
  "components/plan/PlanItem.tsx",
]) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(source, /fetchWeatherApiForecast|fetchNwsAlerts|fetchVisualCrossing/i, `${file} must not import provider clients`);
}

console.log("Weather hard cache contract passed.");
```

- [ ] **Step 2: Write partial-failure and alert-expiry tests**

Create `scripts/test-weather-partial-failure.ts` to assert:

- Guidance route uses `Promise.allSettled`.
- `forecastStatus` can be `available`, `stale`, `unavailable`, or `not_available_yet`.
- `officialAlertStatus` can be `available`, `stale`, or `unavailable`.
- NWS alert failure does not erase forecast guidance.
- Forecast provider failure does not erase NWS alert status.
- Visual Crossing failure does not affect 0-7 day guidance.

Create `scripts/test-weather-alert-expiry.ts` to assert:

- `filterActiveAlerts` excludes expired alerts.
- `filterActiveAlerts` excludes future alerts from active Storm Mode.
- Stale alert cache returns `officialAlertStatus="stale"`.
- Alert provider failure returns `officialAlertStatus="unavailable"`.
- Storm Mode cannot activate from expired alerts.

- [ ] **Step 3: Write timezone and server-only tests**

Create `scripts/test-weather-timezone.ts` to cover:

- `parseWeatherApiLocalDateTime("2026-06-27 20:00", "America/New_York")`.
- NWS ISO parsing.
- Summer EDT and winter EST offsets.
- DST transition dates.
- Missing end time defaulting to 60 minutes.
- Past/current/future occurrence logic.

Create `scripts/test-weather-server-only.ts` to assert these modules import `server-only`:

```txt
lib/weather/weatherapi.ts
lib/weather/nws.ts
lib/weather/nwsForecast.ts
lib/weather/visualcrossing.ts
lib/weather/cache.ts
lib/weather/hardCache.ts
```

And assert no `"use client"` file imports provider modules.

- [ ] **Step 4: Run the failing tests**

Run:

```bash
npx tsx scripts/test-weather-cache-contract.ts
npx tsx scripts/test-weather-partial-failure.ts
npx tsx scripts/test-weather-alert-expiry.ts
npx tsx scripts/test-weather-timezone.ts
npx tsx scripts/test-weather-server-only.ts
```

Expected: FAIL until `hardCache`, `time`, and server-only imports exist.

- [ ] **Step 5: Implement `lib/weather/hardCache.ts`**

```ts
import "server-only";

export const weatherCacheKeys = {
  weatherApi3Day(locationKey: string) {
    return `weather:v1:weatherapi:${locationKey}:days3:aqi1:alerts0`;
  },
  nwsAlerts(locationKey: string) {
    return `weather:v1:nws-alerts:${locationKey}`;
  },
  nwsPoint(locationKey: string, lat: number, lon: number) {
    return `weather:v1:nws-point:${locationKey}:${lat},${lon}`;
  },
  nwsHourly(locationKey: string, gridId: string) {
    return `weather:v1:nws-hourly:${locationKey}:${gridId}`;
  },
  nwsPeriod(locationKey: string, gridId: string) {
    return `weather:v1:nws-period:${locationKey}:${gridId}`;
  },
  visualCrossingDaily15(locationKey: string) {
    return `weather:v1:visualcrossing:${locationKey}:days15:include-days`;
  },
};

export type WeatherQuotaMode = "normal" | "conserve" | "critical";

export const WEATHER_QUOTA_MODES = {
  normal: {
    weatherApiTtlSeconds: 15 * 60,
    visualCrossingTtlSeconds: 6 * 60 * 60,
    backgroundPrefetch: true,
  },
  conserve: {
    weatherApiTtlSeconds: 30 * 60,
    visualCrossingTtlSeconds: 12 * 60 * 60,
    backgroundPrefetch: false,
  },
  critical: {
    weatherApiTtlSeconds: 60 * 60,
    visualCrossingTtlSeconds: 24 * 60 * 60,
    backgroundPrefetch: false,
    weatherApiDisabledForNonCriticalSurfaces: true,
  },
} as const;

const inflight = new Map<string, Promise<unknown>>();

export async function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fn().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}
```

Rules:

- Provider calls must always go through `getCachedWeatherSnapshot` or `getCachedNwsAlerts`.
- No UI/page code may call provider clients directly.
- No card may trigger a provider fetch.
- No batch endpoint may fetch per occurrence.
- Provider snapshots are keyed by provider, location, horizon, and request options.
- The cache stores normalized data and provider metadata.
- The cache can serve stale-if-error with visible stale labels.
- Expired NWS alerts must never be shown as active.
- For `all_wdw` page-level alerts, fetch and union alerts from every configured WDW weather location rather than trusting only the central fallback point.
- For resort/activity cards, use the specific resort-area location.
- For saved plans spanning multiple locations, union alerts across involved locations.

All-WDW aggregation shape:

```ts
export async function getCachedNwsAlertsForAllWdw() {
  const locations = Object.values(WEATHER_LOCATIONS).filter(
    (location) => location.key !== "all_wdw"
  );
  const results = await Promise.allSettled(
    locations.map((location) => getCachedNwsAlerts({ location }))
  );
  return dedupeAlertsByProviderAlertId(results);
}
```

- [ ] **Step 6: Implement alert and time helpers**

Add to alert helper module:

```ts
export function filterActiveAlerts(alerts: WeatherAlert[], now = new Date()) {
  return alerts.filter((alert) => {
    const effective = new Date(alert.effective).getTime();
    const expires = new Date(alert.expires).getTime();
    const t = now.getTime();
    return effective <= t && expires >= t;
  });
}
```

Create `lib/weather/time.ts`:

```ts
export function parseWeatherApiLocalDateTime(value: string, timezone: "America/New_York"): Date;
export function parseNwsIsoDateTime(value: string): Date;
export function toWeatherLocationTime(date: Date, timezone: "America/New_York"): string;
```

Use timezone-safe parsing and formatting utilities already available in the repo, such as `date-fns-tz`.

- [ ] **Step 7: Add quota mode behavior**

Trigger conserve/critical behavior:

- WeatherAPI 85% monthly usage -> conserve.
- WeatherAPI 95% monthly usage -> critical.
- Visual Crossing 80% daily records -> conserve.
- Visual Crossing 95% daily records -> critical.

Critical mode:

- Disables WeatherAPI for non-critical surfaces.
- Extends WeatherAPI TTL to 60 minutes.
- Extends Visual Crossing TTL to 24 hours.
- Disables background prefetch.

- [ ] **Step 8: Run the passing tests**

Run:

```bash
npx tsx scripts/test-weather-cache-contract.ts
npx tsx scripts/test-weather-partial-failure.ts
npx tsx scripts/test-weather-alert-expiry.ts
npx tsx scripts/test-weather-timezone.ts
npx tsx scripts/test-weather-server-only.ts
```

Expected: all commands pass.

- [ ] **Step 9: Commit**

```bash
git add lib/weather/hardCache.ts lib/weather/time.ts lib/weather/cache.ts lib/weather/nws.ts lib/weather/weatherapi.ts lib/weather/nwsForecast.ts lib/weather/visualcrossing.ts scripts/test-weather-cache-contract.ts scripts/test-weather-partial-failure.ts scripts/test-weather-alert-expiry.ts scripts/test-weather-timezone.ts scripts/test-weather-server-only.ts package.json
git commit -m "feat: harden weather cache and provider safety"
```

## Task 1: Add Weather Types And Locations

**Files:**
- Create: `lib/weather/types.ts`
- Create: `lib/weather/locations.ts`
- Test: `scripts/test-weather-locations.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the location contract test**

```ts
import assert from "node:assert/strict";
import {
  WEATHER_LOCATIONS,
  getWeatherLocationForResort,
  parseWeatherLocationKey,
} from "../lib/weather/locations";

const requiredKeys = [
  "magic_kingdom_resort_area",
  "epcot_boardwalk_area",
  "skyliner_area",
  "animal_kingdom_lodge_area",
  "disney_springs_area",
  "all_wdw",
] as const;

for (const key of requiredKeys) {
  const location = WEATHER_LOCATIONS[key];
  assert.ok(location, `${key} must be defined`);
  assert.equal(location.timezone, "America/New_York");
  assert.equal(typeof location.lat, "number");
  assert.equal(typeof location.lon, "number");
}

assert.equal(
  getWeatherLocationForResort("polynesian-village-resort").key,
  "magic_kingdom_resort_area"
);
assert.equal(
  getWeatherLocationForResort("boardwalk-inn").key,
  "epcot_boardwalk_area"
);
assert.equal(
  getWeatherLocationForResort("pop-century-resort").key,
  "skyliner_area"
);
assert.equal(
  getWeatherLocationForResort("animal-kingdom-lodge").key,
  "animal_kingdom_lodge_area"
);
assert.equal(
  getWeatherLocationForResort("old-key-west-resort").key,
  "disney_springs_area"
);
assert.equal(
  getWeatherLocationForResort("unknown-resort").key,
  "all_wdw"
);
assert.equal(parseWeatherLocationKey("skyliner_area"), "skyliner_area");
assert.equal(parseWeatherLocationKey("bad-input"), "all_wdw");
assert.equal(parseWeatherLocationKey(null), "all_wdw");

console.log("Weather location coverage passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-locations.ts`

Expected: FAIL with module-not-found for `lib/weather/locations`.

- [ ] **Step 3: Create `lib/weather/types.ts`**

Use the contracts from the "Data Contracts" section and add:

```ts
export interface WeatherLocation {
  key: WeatherLocationKey;
  name: string;
  lat: number;
  lon: number;
  timezone: "America/New_York";
}

export interface WeatherForTimeSpan {
  locationKey: WeatherLocationKey;
  startsAt: string;
  endsAt?: string;
  isPast: boolean;
  shouldDisplayWeather: boolean;
  representativeHour: string;
  iconKey: WeatherIconKey;
  headline: string;
  plainLanguageSummary: string;
  tempF: number;
  tempC: number;
  feelsLikeF: number;
  feelsLikeC: number;
  rainChancePct?: number;
  thunderChancePct?: number;
  windMph?: number;
  windKph?: number;
  hourlyBreakdown: WeatherHour[];
  risk: WeatherRisk;
  nwsAlerts: WeatherAlert[];
  fetchedAt: string;
  expiresAt: string;
  staleAfter: string;
  isStale: boolean;
  forecastStatus: ForecastStatus;
  officialAlertStatus: OfficialAlertStatus;
}
```

- [ ] **Step 4: Create `lib/weather/locations.ts`**

```ts
import type { WeatherLocation, WeatherLocationKey } from "@/lib/weather/types";

export const WEATHER_LOCATIONS: Record<WeatherLocationKey, WeatherLocation> = {
  magic_kingdom_resort_area: {
    key: "magic_kingdom_resort_area",
    name: "Magic Kingdom resort area",
    lat: 28.4158,
    lon: -81.5844,
    timezone: "America/New_York",
  },
  epcot_boardwalk_area: {
    key: "epcot_boardwalk_area",
    name: "EPCOT and BoardWalk resort area",
    lat: 28.3675,
    lon: -81.5553,
    timezone: "America/New_York",
  },
  skyliner_area: {
    key: "skyliner_area",
    name: "Skyliner resort area",
    lat: 28.3504,
    lon: -81.5459,
    timezone: "America/New_York",
  },
  animal_kingdom_lodge_area: {
    key: "animal_kingdom_lodge_area",
    name: "Animal Kingdom Lodge area",
    lat: 28.3522,
    lon: -81.6038,
    timezone: "America/New_York",
  },
  disney_springs_area: {
    key: "disney_springs_area",
    name: "Disney Springs resort area",
    lat: 28.3728,
    lon: -81.5187,
    timezone: "America/New_York",
  },
  all_wdw: {
    key: "all_wdw",
    name: "Walt Disney World area",
    lat: 28.3772,
    lon: -81.5707,
    timezone: "America/New_York",
  },
};

const RESORT_TO_WEATHER_LOCATION: Record<string, WeatherLocationKey> = {
  "contemporary-resort": "magic_kingdom_resort_area",
  "bay-lake-tower-at-contemporary": "magic_kingdom_resort_area",
  "grand-floridian-resort-and-spa": "magic_kingdom_resort_area",
  "polynesian-village-resort": "magic_kingdom_resort_area",
  "fort-wilderness-resort": "magic_kingdom_resort_area",
  "wilderness-lodge": "magic_kingdom_resort_area",
  "boardwalk-inn": "epcot_boardwalk_area",
  "boardwalk-villas": "epcot_boardwalk_area",
  "yacht-club-resort": "epcot_boardwalk_area",
  "beach-club-resort": "epcot_boardwalk_area",
  "beach-club-villas": "epcot_boardwalk_area",
  "pop-century-resort": "skyliner_area",
  "art-of-animation-resort": "skyliner_area",
  "caribbean-beach-resort": "skyliner_area",
  "riviera-resort": "skyliner_area",
  "animal-kingdom-lodge": "animal_kingdom_lodge_area",
  "animal-kingdom-villas-jambo-house": "animal_kingdom_lodge_area",
  "animal-kingdom-villas-kidani-village": "animal_kingdom_lodge_area",
  "saratoga-springs-resort-and-spa": "disney_springs_area",
  "old-key-west-resort": "disney_springs_area",
  "port-orleans-resort-riverside": "disney_springs_area",
  "port-orleans-resort-french-quarter": "disney_springs_area",
};

export function getWeatherLocation(key: WeatherLocationKey): WeatherLocation {
  return WEATHER_LOCATIONS[key] ?? WEATHER_LOCATIONS.all_wdw;
}

export function getWeatherLocationForResort(resortSlug?: string | null): WeatherLocation {
  if (!resortSlug) return WEATHER_LOCATIONS.all_wdw;
  return WEATHER_LOCATIONS[RESORT_TO_WEATHER_LOCATION[resortSlug] ?? "all_wdw"];
}

export function parseWeatherLocationKey(value: string | null): WeatherLocationKey {
  if (value && value in WEATHER_LOCATIONS) return value as WeatherLocationKey;
  return "all_wdw";
}
```

- [ ] **Step 5: Run the passing test**

Run: `npx tsx scripts/test-weather-locations.ts`

Expected: PASS with `Weather location coverage passed.`

- [ ] **Step 6: Add the test to `package.json`**

Add `tsx scripts/test-weather-locations.ts` to `validate:contracts` near the other `tsx scripts/test-*` checks.

- [ ] **Step 7: Commit**

```bash
git add lib/weather/types.ts lib/weather/locations.ts scripts/test-weather-locations.ts package.json
git commit -m "feat: add weather location contracts"
```

## Task 2: Add WeatherAPI Condition Seed And Icon Mapping

**Files:**
- Create: `data/weather/weatherapi-conditions.json`
- Create: `lib/weather/icons.ts`
- Create: `public/weather-icons/*.svg`
- Test: `scripts/test-weather-condition-map.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing icon map test**

```ts
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import conditions from "../data/weather/weatherapi-conditions.json";
import { weatherApiToAtpIconMap } from "../lib/weather/icons";

for (const condition of conditions) {
  const item = weatherApiToAtpIconMap[condition.code];
  assert.ok(item, `Missing WeatherAPI mapping for ${condition.code}`);
  assert.equal(item.code, condition.code);
  assert.ok(item.afterTheParksDayIcon, `${condition.code} missing day icon`);
  assert.ok(item.afterTheParksNightIcon, `${condition.code} missing night icon`);
  assert.ok(item.altText, `${condition.code} missing alt text`);
  assert.ok(item.ariaLabel, `${condition.code} missing aria label`);
  assert.ok(
    existsSync(`public/weather-icons/${item.afterTheParksDayIcon}.svg`),
    `${item.afterTheParksDayIcon} SVG missing`
  );
  assert.ok(
    existsSync(`public/weather-icons/${item.afterTheParksNightIcon}.svg`),
    `${item.afterTheParksNightIcon} SVG missing`
  );
}

console.log("Weather condition icon map coverage passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-condition-map.ts`

Expected: FAIL with missing seed or missing icon map.

- [ ] **Step 3: Create the condition seed**

Download the WeatherAPI condition JSON once from `https://www.weatherapi.com/docs/weather_conditions.json` and save the exact array to `data/weather/weatherapi-conditions.json`. Do not fetch this JSON at runtime.

- [ ] **Step 4: Create the icon mapping**

Create `lib/weather/icons.ts` with:

```ts
import conditions from "@/data/weather/weatherapi-conditions.json";
import type { WeatherIconKey } from "@/lib/weather/types";

export type WeatherStoryTone =
  | "bright"
  | "calm"
  | "cozy"
  | "rainy"
  | "stormy"
  | "foggy"
  | "caution";

export interface WeatherApiConditionMapItem {
  code: number;
  dayLabel: string;
  nightLabel: string;
  weatherApiIconId: number;
  afterTheParksDayIcon: WeatherIconKey;
  afterTheParksNightIcon: WeatherIconKey;
  storyTone: WeatherStoryTone;
  altText: string;
  ariaLabel: string;
}

function iconForCode(code: number, isDay: boolean): WeatherIconKey {
  if (code === 1000) return isDay ? "sunny_day" : "clear_night";
  if (code === 1003) return isDay ? "partly_cloudy_day" : "partly_cloudy_night";
  if (code === 1006) return "cloudy";
  if (code === 1009) return "overcast";
  if ([1012, 1015, 1018, 1021, 1024, 1027, 1045, 1048].includes(code)) return "dust";
  if ([1030].includes(code)) return "mist";
  if ([1033, 1036, 1039, 1042].includes(code)) return "smoke";
  if ([1135, 1147].includes(code)) return "fog";
  if ([1063, 1180].includes(code)) return "patchy_rain";
  if ([1072, 1150, 1153].includes(code)) return "drizzle";
  if ([1168, 1171].includes(code)) return "freezing_drizzle";
  if ([1183].includes(code)) return "light_rain";
  if ([1186, 1189].includes(code)) return "moderate_rain";
  if ([1192, 1195].includes(code)) return "heavy_rain";
  if ([1198, 1201].includes(code)) return "freezing_rain";
  if ([1240, 1243].includes(code)) return "rain_shower";
  if ([1246].includes(code)) return "torrential_rain";
  if ([1087].includes(code)) return "thunder_possible";
  if ([1273, 1276].includes(code)) return "rain_with_thunder";
  if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258, 1279, 1282].includes(code)) return "snow";
  if ([1069, 1204, 1207, 1249, 1252].includes(code)) return "sleet";
  if ([1237, 1261, 1264].includes(code)) return "ice_pellets";
  return "unknown";
}

function toneForIcon(iconKey: WeatherIconKey): WeatherStoryTone {
  if (["sunny_day", "clear_night"].includes(iconKey)) return "bright";
  if (["partly_cloudy_day", "partly_cloudy_night", "cloudy"].includes(iconKey)) return "calm";
  if (["overcast"].includes(iconKey)) return "cozy";
  if (["mist", "fog", "haze", "smoke", "dust"].includes(iconKey)) return "foggy";
  if (["thunder_possible", "rain_with_thunder"].includes(iconKey)) return "caution";
  if (["light_rain", "moderate_rain", "heavy_rain", "patchy_rain", "rain_shower", "torrential_rain", "drizzle"].includes(iconKey)) return "rainy";
  return "caution";
}

export const weatherApiToAtpIconMap: Record<number, WeatherApiConditionMapItem> =
  Object.fromEntries(
    conditions.map((condition) => {
      const dayIcon = iconForCode(condition.code, true);
      const nightIcon = iconForCode(condition.code, false);
      return [
        condition.code,
        {
          code: condition.code,
          dayLabel: condition.day,
          nightLabel: condition.night,
          weatherApiIconId: condition.icon,
          afterTheParksDayIcon: dayIcon,
          afterTheParksNightIcon: nightIcon,
          storyTone: toneForIcon(dayIcon),
          altText: `${condition.day} weather`,
          ariaLabel: `${condition.day} during the day, ${condition.night} at night`,
        },
      ];
    })
  );

export function getWeatherIconKey(conditionCode: number, isDay: boolean): WeatherIconKey {
  const item = weatherApiToAtpIconMap[conditionCode];
  if (!item) return "unknown";
  return isDay ? item.afterTheParksDayIcon : item.afterTheParksNightIcon;
}
```

- [ ] **Step 5: Add SVG placeholder assets**

Create one readable placeholder SVG per `WeatherIconKey` under `public/weather-icons/`. Use simple custom vector shapes with `currentColor`; do not use WeatherAPI icon URLs.

- [ ] **Step 6: Run the passing test**

Run: `npx tsx scripts/test-weather-condition-map.ts`

Expected: PASS with `Weather condition icon map coverage passed.`

- [ ] **Step 7: Commit**

```bash
git add data/weather/weatherapi-conditions.json lib/weather/icons.ts public/weather-icons scripts/test-weather-condition-map.ts package.json
git commit -m "feat: map weather conditions to app icons"
```

## Task 3: Add Dual-Unit Formatting

**Files:**
- Create: `lib/weather/format.ts`
- Test: `scripts/test-weather-format.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the formatting test**

```ts
import assert from "node:assert/strict";
import {
  formatPrecipDual,
  formatTempDual,
  formatWindDual,
} from "../lib/weather/format";

assert.equal(formatTempDual(86.4, 30.2), "86°F / 30°C");
assert.equal(formatTempDual(86.4, 30.2, "celsius_first"), "30°C / 86°F");
assert.equal(formatWindDual(8.2, 13.1), "8 mph / 13 km/h");
assert.equal(formatWindDual(8.2, 13.1, "celsius_first"), "13 km/h / 8 mph");
assert.equal(formatWindDual(undefined, 13.1), null);
assert.equal(formatPrecipDual(0.08, 2.03), "0.08 in / 2 mm");
assert.equal(formatPrecipDual(0.08, 2.03, "celsius_first"), "2 mm / 0.08 in");
assert.equal(formatPrecipDual(0.08, undefined), null);

console.log("Weather dual-unit formatting passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-format.ts`

Expected: FAIL with module-not-found for `lib/weather/format`.

- [ ] **Step 3: Create `lib/weather/format.ts`**

```ts
export type UnitDisplayPreference = "fahrenheit_first" | "celsius_first";

export function formatTempDual(
  tempF: number,
  tempC: number,
  preference: UnitDisplayPreference = "fahrenheit_first"
): string {
  const fahrenheit = `${Math.round(tempF)}°F`;
  const celsius = `${Math.round(tempC)}°C`;
  return preference === "celsius_first"
    ? `${celsius} / ${fahrenheit}`
    : `${fahrenheit} / ${celsius}`;
}

export function formatWindDual(
  mph?: number,
  kph?: number,
  preference: UnitDisplayPreference = "fahrenheit_first"
): string | null {
  if (mph == null || kph == null) return null;
  const imperial = `${Math.round(mph)} mph`;
  const metric = `${Math.round(kph)} km/h`;
  return preference === "celsius_first"
    ? `${metric} / ${imperial}`
    : `${imperial} / ${metric}`;
}

export function formatPrecipDual(
  inches?: number,
  mm?: number,
  preference: UnitDisplayPreference = "fahrenheit_first"
): string | null {
  if (inches == null || mm == null) return null;
  const imperial = `${inches.toFixed(2)} in`;
  const metric = `${Math.round(mm)} mm`;
  return preference === "celsius_first"
    ? `${metric} / ${imperial}`
    : `${imperial} / ${metric}`;
}
```

- [ ] **Step 4: Run the passing test**

Run: `npx tsx scripts/test-weather-format.ts`

Expected: PASS with `Weather dual-unit formatting passed.`

- [ ] **Step 5: Commit**

```bash
git add lib/weather/format.ts scripts/test-weather-format.ts package.json
git commit -m "feat: add weather dual-unit formatting"
```

## Task 4: Add Provider Clients And Normalizers

**Files:**
- Create: `lib/weather/weatherapi.ts`
- Create: `lib/weather/nws.ts`
- Create: `lib/weather/cache.ts`
- Test: `scripts/test-weather-normalizers.ts`
- Modify: `.env.example`
- Modify: `package.json`

- [ ] **Step 1: Write normalizer tests with fixtures**

Create small inline fixture objects in `scripts/test-weather-normalizers.ts`:

```ts
import assert from "node:assert/strict";
import { normalizeWeatherApiForecast } from "../lib/weather/weatherapi";
import { normalizeNwsAlerts } from "../lib/weather/nws";

const weatherApiFixture = {
  location: { localtime: "2026-06-27 12:00" },
  current: {
    last_updated: "2026-06-27 11:45",
    temp_c: 30,
    temp_f: 86,
    feelslike_c: 34,
    feelslike_f: 93,
    humidity: 70,
    cloud: 50,
    precip_in: 0.02,
    precip_mm: 0.5,
    wind_mph: 7,
    wind_kph: 11,
    gust_mph: 14,
    gust_kph: 23,
    uv: 8,
    is_day: 1,
    condition: { text: "Partly cloudy", code: 1003 },
  },
  forecast: {
    forecastday: [
      {
        date: "2026-06-27",
        day: {
          maxtemp_f: 91,
          maxtemp_c: 33,
          mintemp_f: 76,
          mintemp_c: 24,
          avgtemp_f: 83,
          avgtemp_c: 28,
          daily_chance_of_rain: 70,
          daily_chance_of_thunder: 30,
          maxwind_mph: 16,
          maxwind_kph: 26,
          totalprecip_in: 0.25,
          totalprecip_mm: 6.4,
          uv: 8,
          condition: { text: "Patchy rain possible", code: 1063 },
        },
        astro: { sunrise: "06:30 AM", sunset: "08:27 PM" },
        hour: [
          {
            time: "2026-06-27 20:00",
            temp_f: 82,
            temp_c: 28,
            feelslike_f: 88,
            feelslike_c: 31,
            chance_of_rain: 45,
            chance_of_thunder: 20,
            precip_in: 0.08,
            precip_mm: 2,
            wind_mph: 7,
            wind_kph: 11,
            gust_mph: 15,
            gust_kph: 24,
            uv: 0,
            is_day: 0,
            condition: { text: "Light rain shower", code: 1240 },
          },
        ],
      },
    ],
  },
};

const normalized = normalizeWeatherApiForecast({
  locationKey: "all_wdw",
  lat: 28.3772,
  lon: -81.5707,
  payload: weatherApiFixture,
  fetchedAt: "2026-06-27T16:00:00.000Z",
});

assert.equal(normalized.locationKey, "all_wdw");
assert.equal(normalized.tempF, 86);
assert.equal(normalized.tempC, 30);
assert.equal(normalized.iconKey, "partly_cloudy_day");
assert.equal(normalized.hourly[0].iconKey, "rain_shower");
assert.equal(normalized.hourly[0].tempC, 28);

const nwsFixture = {
  features: [
    {
      id: "https://api.weather.gov/alerts/urn:oid:example",
      properties: {
        id: "urn:oid:example",
        event: "Severe Thunderstorm Warning",
        headline: "Severe Thunderstorm Warning issued",
        severity: "Severe",
        urgency: "Immediate",
        certainty: "Observed",
        effective: "2026-06-27T20:00:00-04:00",
        expires: "2026-06-27T21:00:00-04:00",
        areaDesc: "Orange County",
        instruction: "Move indoors.",
        description: "Storms are nearby.",
      },
    },
  ],
};

const alerts = normalizeNwsAlerts(nwsFixture);
assert.equal(alerts.length, 1);
assert.equal(alerts[0].provider, "nws");
assert.equal(alerts[0].severity, "Severe");
assert.equal(alerts[0].event, "Severe Thunderstorm Warning");

console.log("Weather provider normalizers passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-normalizers.ts`

Expected: FAIL with module-not-found for provider modules.

- [ ] **Step 3: Implement `normalizeWeatherApiForecast`**

Create a server-only module that exports:

```ts
export function normalizeWeatherApiForecast(input: {
  locationKey: WeatherLocationKey;
  lat: number;
  lon: number;
  payload: WeatherApiForecastPayload;
  fetchedAt: string;
}): WeatherSnapshot
```

Map WeatherAPI fields to app fields, preserve both unit systems, and call `getWeatherIconKey(condition.code, is_day === 1)`.

- [ ] **Step 4: Implement `fetchWeatherApiForecast`**

Use this request shape:

```ts
const url = new URL("https://api.weatherapi.com/v1/forecast.json");
url.searchParams.set("key", apiKey);
url.searchParams.set("q", `${location.lat},${location.lon}`);
url.searchParams.set("days", String(days));
url.searchParams.set("aqi", "yes");
url.searchParams.set("alerts", "no");
```

Throw a typed provider error on non-2xx response. Never return the API key in error messages. Enforce `WEATHERAPI_FORECAST_DAYS <= 3` whenever `WEATHERAPI_PLAN=free`; this client is the optional friendly 0-3 day layer, not the full-trip forecast backbone.

- [ ] **Step 5: Implement `normalizeNwsAlerts` and `fetchNwsAlerts`**

Use:

```ts
const url = new URL("https://api.weather.gov/alerts/active");
url.searchParams.set("point", `${location.lat},${location.lon}`);
```

Headers:

```ts
{
  "User-Agent": process.env.NWS_USER_AGENT ?? "AfterTheParks.com, contact@aftertheparks.com",
  Accept: "application/geo+json",
}
```

Normalize CAP fields into `WeatherAlert`. Keep `sourceUrl` from feature `id` when available.

- [ ] **Step 6: Implement cache constants**

Create `lib/weather/cache.ts`:

```ts
export const WEATHER_TTL_SECONDS = {
  weatherApiCurrentHourly: 15 * 60,
  weatherApiDaily: 4 * 60 * 60,
  nwsAlertsNormal: 60,
  nwsAlertsSevereMinimum: 30,
};

export function isStale(fetchedAt: string, staleAfter: string, now = new Date()): boolean {
  return new Date(staleAfter).getTime() <= now.getTime();
}
```

- [ ] **Step 7: Update `.env.example`**

Ensure these variables exist from Task 0:

```bash
WEATHERAPI_KEY=
WEATHERAPI_PLAN=free
WEATHERAPI_FORECAST_DAYS=3
WEATHERAPI_ENABLED=true
NWS_USER_AGENT="AfterTheParks.com, contact@aftertheparks.com"
NWS_ALERTS_ENABLED=true
NWS_FORECAST_ENABLED=true
```

- [ ] **Step 8: Run the passing test**

Run: `npx tsx scripts/test-weather-normalizers.ts`

Expected: PASS with `Weather provider normalizers passed.`

- [ ] **Step 9: Commit**

```bash
git add lib/weather/weatherapi.ts lib/weather/nws.ts lib/weather/cache.ts scripts/test-weather-normalizers.ts .env.example package.json
git commit -m "feat: normalize weather provider data"
```

## Task 4B: Add NWS Forecast Client

**Files:**
- Create: `lib/weather/nwsForecast.ts`
- Create: `lib/weather/nwsIconMap.ts`
- Test: `scripts/test-nws-forecast.ts`
- Modify: `lib/weather/cache.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the NWS forecast normalizer test**

```ts
import assert from "node:assert/strict";
import {
  normalizeNwsHourlyForecast,
  normalizeNwsPeriodForecast,
  resolveNwsPointMetadata,
} from "../lib/weather/nwsForecast";

const pointFixture = {
  properties: {
    forecast: "https://api.weather.gov/gridpoints/MLB/25,69/forecast",
    forecastHourly: "https://api.weather.gov/gridpoints/MLB/25,69/forecast/hourly",
    forecastGridData: "https://api.weather.gov/gridpoints/MLB/25,69",
    timeZone: "America/New_York",
  },
};

const metadata = resolveNwsPointMetadata(pointFixture);
assert.equal(metadata.forecastUrl, pointFixture.properties.forecast);
assert.equal(metadata.forecastHourlyUrl, pointFixture.properties.forecastHourly);
assert.equal(metadata.forecastGridDataUrl, pointFixture.properties.forecastGridData);

const hourlyFixture = {
  properties: {
    periods: [
      {
        number: 1,
        name: "This Hour",
        startTime: "2026-07-01T18:00:00-04:00",
        endTime: "2026-07-01T19:00:00-04:00",
        isDaytime: true,
        temperature: 88,
        temperatureUnit: "F",
        shortForecast: "Chance Showers And Thunderstorms",
        probabilityOfPrecipitation: { value: 55 },
        windSpeed: "10 mph",
        windDirection: "E",
      },
    ],
  },
};

const hours = normalizeNwsHourlyForecast({
  locationKey: "all_wdw",
  payload: hourlyFixture,
});
assert.equal(hours[0].tempF, 88);
assert.equal(hours[0].tempC, 31);
assert.equal(hours[0].chanceOfRainPct, 55);
assert.equal(hours[0].conditionText, "Chance Showers And Thunderstorms");

const periodFixture = {
  properties: {
    periods: [
      {
        number: 1,
        name: "Wednesday",
        startTime: "2026-07-01T06:00:00-04:00",
        endTime: "2026-07-01T18:00:00-04:00",
        isDaytime: true,
        temperature: 91,
        temperatureUnit: "F",
        shortForecast: "Showers Likely",
        probabilityOfPrecipitation: { value: 60 },
        windSpeed: "8 to 13 mph",
        windDirection: "SE",
      },
    ],
  },
};

const days = normalizeNwsPeriodForecast({
  locationKey: "all_wdw",
  payload: periodFixture,
});
assert.equal(days[0].conditionText, "Showers Likely");
assert.equal(days[0].maxTempF, 91);
assert.equal(days[0].chanceOfRainPct, 60);

console.log("NWS forecast normalizer passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-nws-forecast.ts`

Expected: FAIL with module-not-found for `lib/weather/nwsForecast`.

- [ ] **Step 3: Implement NWS point resolution**

Create `lib/weather/nwsForecast.ts` with:

```ts
export function resolveNwsPointMetadata(payload: unknown): {
  forecastUrl: string;
  forecastHourlyUrl: string;
  forecastGridDataUrl: string;
  timeZone: string;
}
```

Fetch flow:

1. Call `https://api.weather.gov/points/{lat},{lon}`.
2. Cache returned grid metadata for 24 hours.
3. Read `properties.forecast`, `properties.forecastHourly`, and `properties.forecastGridData`.
4. Fetch `forecastHourly` for event-level windows through seven days.
5. Fetch `forecast` for page summaries and broader daypart language.

- [ ] **Step 4: Implement NWS forecast normalizers**

Normalize NWS hourly periods into `WeatherHour` and period forecasts into `WeatherDay`. Preserve source confidence as `official_7_day`, derive Celsius/KPH from Fahrenheit/MPH when NWS only returns imperial values, and never treat NWS forecast language as an NWS alert. Map NWS `shortForecast` phrases into semantic `WeatherIconKey` through `lib/weather/nwsIconMap.ts`.

- [ ] **Step 5: Update cache constants**

Add:

```ts
nwsForecastHourly: 60 * 60,
nwsForecastPeriod: 4 * 60 * 60,
nwsPointMetadata: 24 * 60 * 60,
```

- [ ] **Step 6: Run the passing test**

Run: `npx tsx scripts/test-nws-forecast.ts`

Expected: PASS with `NWS forecast normalizer passed.`

- [ ] **Step 7: Commit**

```bash
git add lib/weather/nwsForecast.ts lib/weather/nwsIconMap.ts lib/weather/cache.ts scripts/test-nws-forecast.ts package.json
git commit -m "feat: add NWS forecast provider"
```

## Task 4C: Add Visual Crossing Planning Outlook Client

**Files:**
- Create: `lib/weather/visualcrossing.ts`
- Create: `lib/weather/visualCrossingIconMap.ts`
- Test: `scripts/test-visualcrossing-normalizer.ts`
- Modify: `lib/weather/cache.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the Visual Crossing normalizer test**

```ts
import assert from "node:assert/strict";
import { normalizeVisualCrossingForecast } from "../lib/weather/visualcrossing";

const fixture = {
  days: [
    {
      datetime: "2026-07-08",
      conditions: "Rain, Partially cloudy",
      temp: 86,
      feelslike: 93,
      precipprob: 55,
      windspeed: 12,
      icon: "rain",
    },
  ],
};

const forecast = normalizeVisualCrossingForecast({
  locationKey: "all_wdw",
  payload: fixture,
  fetchedAt: "2026-06-27T16:00:00.000Z",
});

assert.equal(forecast.days[0].date, "2026-07-08");
assert.equal(forecast.days[0].conditionText, "Rain, Partially cloudy");
assert.equal(forecast.days[0].tempF, 86);
assert.equal(forecast.days[0].tempC, 30);
assert.equal(forecast.days[0].precipProbabilityPct, 55);
assert.equal(forecast.days[0].confidence, "long_range_planning");
assert.equal(forecast.attributionRequired, true);

console.log("Visual Crossing planning normalizer passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-visualcrossing-normalizer.ts`

Expected: FAIL with module-not-found for `lib/weather/visualcrossing`.

- [ ] **Step 3: Implement the Visual Crossing client**

Use only for 8-15 day planning outlooks:

```txt
GET /VisualCrossingWebServices/rest/services/timeline/{lat},{lon}/next15days
  ?unitGroup=us
  &key=VISUAL_CROSSING_KEY
  &contentType=json
  &include=days
```

Requirements:

- Normalize only fields the app needs.
- Map Visual Crossing `icon` values into semantic `WeatherIconKey` through `lib/weather/visualCrossingIconMap.ts`.
- Mark confidence as `long_range_planning`.
- Set `allowEventTimeDecisions=false` for 8-15 day output even when hourly data exists.
- Do not fetch hourly data at launch; the long-range layer is daily-only because the UI must not make exact "go at 6:30 PM" claims for days 8-15.
- Add attribution support.
- Track quota usage.
- Never show raw provider JSON.
- Never expose raw provider data for public download.
- Never use Visual Crossing alerts as the official safety alert layer.

- [ ] **Step 4: Add Visual Crossing cache constants**

Add:

```ts
visualCrossingPlanning: 6 * 60 * 60,
```

- [ ] **Step 5: Run the passing test**

Run: `npx tsx scripts/test-visualcrossing-normalizer.ts`

Expected: PASS with `Visual Crossing planning normalizer passed.`

- [ ] **Step 6: Commit**

```bash
git add lib/weather/visualcrossing.ts lib/weather/visualCrossingIconMap.ts lib/weather/cache.ts scripts/test-visualcrossing-normalizer.ts package.json
git commit -m "feat: add long-range weather outlook provider"
```

## Task 4D: Add Provider Router And Batch Grouping

**Files:**
- Create: `lib/weather/providerRouter.ts`
- Test: `scripts/test-weather-provider-routing.ts`
- Modify: `package.json`

- [ ] **Step 1: Write provider routing test**

```ts
import assert from "node:assert/strict";
import {
  chooseWeatherProviderForTimeSpan,
  groupOccurrencesByWeatherLocation,
} from "../lib/weather/providerRouter";

const now = new Date("2026-06-27T12:00:00-04:00");

assert.equal(chooseWeatherProviderForTimeSpan({ now, startsAt: "2026-06-27T18:00:00-04:00" }).provider, "weatherapi");
assert.equal(chooseWeatherProviderForTimeSpan({ now, startsAt: "2026-07-01T18:00:00-04:00" }).provider, "nws_forecast");
assert.equal(chooseWeatherProviderForTimeSpan({ now, startsAt: "2026-07-08T18:00:00-04:00" }).provider, "visual_crossing");
assert.equal(chooseWeatherProviderForTimeSpan({ now, startsAt: "2026-07-20T18:00:00-04:00" }).provider, "none");
assert.equal(chooseWeatherProviderForTimeSpan({ now, startsAt: "2026-06-26T18:00:00-04:00" }).provider, "none");
assert.equal(
  chooseWeatherProviderForTimeSpan({ now, startsAt: "2026-06-27T18:00:00-04:00", weatherApiAvailable: false }).provider,
  "nws_forecast"
);

const grouped = groupOccurrencesByWeatherLocation([
  { id: "a", resortSlug: "polynesian-village-resort", startsAt: "2026-06-27T18:00:00-04:00" },
  { id: "b", resortSlug: "grand-floridian-resort-and-spa", startsAt: "2026-06-27T19:00:00-04:00" },
  { id: "c", resortSlug: "boardwalk-inn", startsAt: "2026-06-27T20:00:00-04:00" },
]);

assert.equal(grouped.magic_kingdom_resort_area.length, 2);
assert.equal(grouped.epcot_boardwalk_area.length, 1);

console.log("Weather provider routing passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-provider-routing.ts`

Expected: FAIL with module-not-found for `lib/weather/providerRouter`.

- [ ] **Step 3: Implement provider routing**

Create:

```ts
export function chooseWeatherProviderForTimeSpan(input: {
  now: Date;
  startsAt?: string | null;
  endsAt?: string | null;
  weatherApiAvailable?: boolean;
  visualCrossingAvailable?: boolean;
}): {
  provider: "weatherapi" | "nws_forecast" | "visual_crossing" | "none";
  confidence: ForecastConfidence;
  allowEventTimeDecisions: boolean;
  reason: string;
}
```

Routing:

- Past event -> `none`.
- 0-72 hours -> WeatherAPI preferred when enabled and keyed, NWS forecast fallback.
- 72-168 hours -> NWS forecast preferred.
- 8-15 days -> Visual Crossing preferred when enabled and keyed, planning outlook only.
- Beyond 15 days -> `none`.

- [ ] **Step 4: Implement occurrence grouping**

Create:

```ts
export type WeatherGuidanceBatchOccurrence = {
  id: string;
  resortSlug?: string;
  locationKey?: WeatherLocationKey;
  startsAt: string;
  endsAt?: string;
  activitySlug?: string;
};

export function groupOccurrencesByWeatherLocation(
  occurrences: WeatherGuidanceBatchOccurrence[]
): Record<WeatherLocationKey, WeatherGuidanceBatchOccurrence[]>
```

Group by explicit `locationKey`, then `resortSlug`, then `all_wdw`.

- [ ] **Step 5: Run the passing test**

Run: `npx tsx scripts/test-weather-provider-routing.ts`

Expected: PASS with `Weather provider routing passed.`

- [ ] **Step 6: Commit**

```bash
git add lib/weather/providerRouter.ts scripts/test-weather-provider-routing.ts package.json
git commit -m "feat: route weather providers by forecast horizon"
```

## Task 5: Add Occurrence Time-Span Weather Selection

**Files:**
- Create: `lib/weather/occurrence.ts`
- Test: `scripts/test-weather-occurrence.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the occurrence test**

```ts
import assert from "node:assert/strict";
import {
  getWeatherForOccurrence,
  shouldShowWeatherForOccurrence,
} from "../lib/weather/occurrence";
import type { WeatherHour } from "../lib/weather/types";

const now = new Date("2026-06-27T19:30:00-04:00");

assert.equal(
  shouldShowWeatherForOccurrence(now, new Date("2026-06-27T17:00:00-04:00"), new Date("2026-06-27T18:00:00-04:00")),
  false
);
assert.equal(
  shouldShowWeatherForOccurrence(now, new Date("2026-06-27T19:00:00-04:00"), new Date("2026-06-27T20:00:00-04:00")),
  true
);
assert.equal(
  shouldShowWeatherForOccurrence(now, new Date("2026-06-27T20:00:00-04:00")),
  true
);

const hour = (time: string, chanceOfRainPct: number, conditionCode: number): WeatherHour => ({
  source: "weatherapi",
  time,
  conditionText: conditionCode === 1276 ? "Rain with thunder" : "Light rain shower",
  conditionCode,
  iconKey: conditionCode === 1276 ? "rain_with_thunder" : "rain_shower",
  tempF: 82,
  tempC: 28,
  feelsLikeF: 88,
  feelsLikeC: 31,
  chanceOfRainPct,
  chanceOfThunderPct: conditionCode === 1276 ? 60 : 10,
  windMph: 7,
  windKph: 11,
  isDay: false,
});

const detail = getWeatherForOccurrence({
  now,
  startsAt: "2026-06-27T20:30:00-04:00",
  endsAt: "2026-06-27T22:00:00-04:00",
  locationKey: "all_wdw",
  hourlyForecast: [
    hour("2026-06-27T19:00:00-04:00", 20, 1240),
    hour("2026-06-27T20:00:00-04:00", 35, 1240),
    hour("2026-06-27T21:00:00-04:00", 65, 1276),
  ],
  fetchedAt: "2026-06-27T23:00:00.000Z",
});

assert.ok(detail);
assert.equal(detail.shouldDisplayWeather, true);
assert.equal(detail.iconKey, "rain_with_thunder");
assert.equal(detail.rainChancePct, 65);
assert.equal(detail.thunderChancePct, 60);
assert.equal(detail.hourlyBreakdown.length, 2);

const past = getWeatherForOccurrence({
  now,
  startsAt: "2026-06-27T17:00:00-04:00",
  endsAt: "2026-06-27T18:00:00-04:00",
  locationKey: "all_wdw",
  hourlyForecast: [],
  fetchedAt: "2026-06-27T23:00:00.000Z",
});

assert.equal(past, null);

console.log("Weather occurrence selection passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-occurrence.ts`

Expected: FAIL with module-not-found for `lib/weather/occurrence`.

- [ ] **Step 3: Implement occurrence selection**

Create:

```ts
export function shouldShowWeatherForOccurrence(
  now: Date,
  startsAt: Date,
  endsAt?: Date
): boolean {
  const effectiveEnd = endsAt ?? startsAt;
  return effectiveEnd >= now;
}
```

Implement `getWeatherForOccurrence` so it:

- Returns `null` when the event is fully past.
- Uses `now` as `spanStart` for in-progress events.
- Uses `startsAt` as `spanStart` for future events.
- Defaults a missing end time to 60 minutes after start.
- Selects overlapping hourly forecast rows.
- Surfaces the worst meaningful condition, not the nicest average.
- Uses maximum rain chance and maximum thunder chance.
- Uses `official_alert` only when alerts are passed in and active.

- [ ] **Step 4: Run the passing test**

Run: `npx tsx scripts/test-weather-occurrence.ts`

Expected: PASS with `Weather occurrence selection passed.`

- [ ] **Step 5: Commit**

```bash
git add lib/weather/occurrence.ts scripts/test-weather-occurrence.ts package.json
git commit -m "feat: select weather by occurrence window"
```

## Task 6: Add Weather Guidance Engine

**Files:**
- Create: `lib/weather/activityProfiles.ts`
- Create: `lib/weather/thresholds.ts`
- Create: `lib/weather/guidance.ts`
- Test: `scripts/test-weather-guidance.ts`
- Test: `scripts/test-weather-thresholds.ts`
- Modify: `lib/seo/fit.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the guidance test**

```ts
import assert from "node:assert/strict";
import { getWeatherGuidance } from "../lib/weather/guidance";
import type { WeatherAlert, WeatherRisk } from "../lib/weather/types";

const baseRisk: WeatherRisk = {
  overallOutdoorFit: "good",
  rainRisk: "low",
  stormRisk: "low",
  heatRisk: "low",
  windRisk: "low",
  indoorBackupRecommended: false,
  outdoorActivitiesLikelyAffected: false,
  poolActivitiesLikelyAffected: false,
  campfiresLikelyAffected: false,
  outdoorMoviesLikelyAffected: false,
  skylinerCaution: false,
  boatCaution: false,
};

const severeAlert: WeatherAlert = {
  provider: "nws",
  id: "alert-1",
  event: "Severe Thunderstorm Warning",
  headline: "Severe Thunderstorm Warning",
  severity: "Severe",
  urgency: "Immediate",
  certainty: "Observed",
  effective: "2026-06-27T20:00:00-04:00",
  expires: "2026-06-27T21:00:00-04:00",
  instruction: "Move indoors.",
};

const alertGuidance = getWeatherGuidance({
  risk: baseRisk,
  alerts: [severeAlert],
  activityWeatherTags: ["outdoor_movie"],
});

assert.equal(alertGuidance.safetyLevel, "danger");
assert.equal(alertGuidance.decisionState, "official_alert_follow_guidance");
assert.match(alertGuidance.headline, /Official weather alert/);
assert.equal(alertGuidance.visualState, "official_alert");

const rainyGuidance = getWeatherGuidance({
  risk: { ...baseRisk, overallOutdoorFit: "poor", rainRisk: "high", indoorBackupRecommended: true },
  alerts: [],
  activityWeatherTags: ["outdoor_movie"],
});

assert.equal(rainyGuidance.safetyLevel, "caution");
assert.equal(rainyGuidance.decisionState, "indoor_backup_recommended");
assert.match(rainyGuidance.recommendedAction, /indoor backup/i);
assert.ok(rainyGuidance.affectedActivityTags.includes("outdoor_movie"));

const heatGuidance = getWeatherGuidance({
  risk: { ...baseRisk, overallOutdoorFit: "mixed", heatRisk: "high", indoorBackupRecommended: true },
  alerts: [],
  activityWeatherTags: ["walking_heavy"],
});

assert.equal(heatGuidance.decisionState, "bring_backup");
assert.match(heatGuidance.headline, /Heat-friendly/);

console.log("Weather guidance rules passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-guidance.ts`

Expected: FAIL with module-not-found for `lib/weather/guidance`.

- [ ] **Step 3: Implement activity weather profile helpers**

Create `lib/weather/activityProfiles.ts` and import or re-export the canonical `ActivityWeatherFit` from `lib/weather/types.ts`:

```ts
import type { ActivityWeatherFit } from "@/lib/weather/types";

export interface ActivityWeatherProfile {
  weatherFit: ActivityWeatherFit[];
  rainFit: "great" | "okay" | "poor" | "not_recommended";
  heatFit: "great" | "okay" | "poor" | "not_recommended";
  stormFit: "safe_indoor" | "avoid" | "likely_canceled" | "ask_resort";
  windFit: "great" | "okay" | "poor" | "not_recommended";
  defaultWeatherCaveat?: string;
  indoorBackupActivityIds: string[];
}
```

Add helper functions that map existing `DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG` records into this richer shape.

- [ ] **Step 4: Implement activity-specific thresholds**

Create `lib/weather/thresholds.ts`:

```ts
export const ACTIVITY_WEATHER_THRESHOLDS = {
  outdoor_movie: {
    rainChanceHighPct: 50,
    thunderChanceHighPct: 20,
    windGustCautionMph: 20,
  },
  pool: {
    thunderChanceHighPct: 10,
    heatIndexCautionF: 95,
  },
  campfire: {
    rainChanceHighPct: 40,
    thunderChanceHighPct: 15,
    windGustCautionMph: 18,
  },
  boat: {
    thunderChanceHighPct: 15,
    windGustCautionMph: 20,
  },
  skyliner: {
    thunderChanceHighPct: 15,
    windGustCautionMph: 25,
  },
  outdoor_walk: {
    rainChanceHighPct: 50,
    heatIndexCautionF: 95,
  },
  grandparents_plan: {
    heatIndexCautionF: 90,
    walkingHeavyPenalty: true,
  },
  toddlers_plan: {
    heatIndexCautionF: 90,
    rainChanceHighPct: 45,
    shortDurationPreferred: true,
  },
  first_night_plan: {
    walkingHeavyPenalty: true,
    multiHopPenalty: true,
  },
} as const;
```

Add `scripts/test-weather-thresholds.ts` to assert the keys above exist and pool/storm-sensitive activities have lower thunder thresholds than normal outdoor activities.

- [ ] **Step 5: Implement `getWeatherGuidance`**

Use these output states:

```ts
export type WeatherDecisionState =
  | "go"
  | "good_with_caveat"
  | "bring_backup"
  | "indoor_backup_recommended"
  | "likely_affected"
  | "avoid_outdoor"
  | "official_alert_follow_guidance";

export type WeatherVisualState =
  | "normal"
  | "rain"
  | "heat"
  | "storm"
  | "official_alert"
  | "stale"
  | "unavailable";
```

Rules:

- Severe or Extreme NWS alert returns `official_alert_follow_guidance` and `danger`.
- High storm risk returns `avoid_outdoor` for outdoor, pool, campfire, outdoor movie, boat, and skyliner tags.
- High rain risk returns `indoor_backup_recommended` for outdoor movie, campfire, pool, outdoor uncovered, playground, and walking-heavy tags.
- High heat risk returns `bring_backup` for walking-heavy, heat-sensitive, outdoor uncovered, and pool tags.
- Great or good outdoor fit with low risks returns `go`.
- Mixed fit returns `good_with_caveat`.

- [ ] **Step 6: Run the passing tests**

Run:

```bash
npx tsx scripts/test-weather-thresholds.ts
npx tsx scripts/test-weather-guidance.ts
```

Expected: PASS with `Weather guidance rules passed.` and threshold coverage passing.

- [ ] **Step 7: Commit**

```bash
git add lib/weather/activityProfiles.ts lib/weather/thresholds.ts lib/weather/guidance.ts scripts/test-weather-thresholds.ts scripts/test-weather-guidance.ts lib/seo/fit.ts package.json
git commit -m "feat: add weather guidance engine"
```

## Task 6B: Add Weather Intelligence Modules

**Files:**
- Create: `lib/weather/windows.ts`
- Create: `lib/weather/dayStory.ts`
- Create: `lib/weather/stormMode.ts`
- Create: `lib/weather/resilience.ts`
- Create: `lib/weather/forecastCompare.ts`
- Create: `lib/weather/resortWeatherProfiles.ts`
- Create: `lib/weather/routeWeather.ts`
- Test: `scripts/test-weather-windows.ts`
- Test: `scripts/test-weather-day-story.ts`
- Test: `scripts/test-weather-storm-mode.ts`
- Test: `scripts/test-plan-resilience.ts`
- Test: `scripts/test-forecast-compare.ts`
- Test: `scripts/test-resort-weather-profiles.ts`
- Test: `scripts/test-route-weather.ts`
- Modify: `package.json`

- [ ] **Step 1: Write Weather Windows test**

```ts
import assert from "node:assert/strict";
import { buildWeatherWindows } from "../lib/weather/windows";

const windows = buildWeatherWindows({
  locationKey: "all_wdw",
  startsAt: "2026-06-27T08:00:00-04:00",
  endsAt: "2026-06-27T23:00:00-04:00",
  risksByWindow: [
    { startsAt: "2026-06-27T08:00:00-04:00", endsAt: "2026-06-27T12:00:00-04:00", rainRisk: "low", stormRisk: "low", heatRisk: "low" },
    { startsAt: "2026-06-27T13:00:00-04:00", endsAt: "2026-06-27T17:00:00-04:00", rainRisk: "low", stormRisk: "low", heatRisk: "high" },
    { startsAt: "2026-06-27T18:00:00-04:00", endsAt: "2026-06-27T22:00:00-04:00", rainRisk: "high", stormRisk: "medium", heatRisk: "low" },
  ],
});

assert.ok(windows.some((window) => window.action === "go_now"));
assert.ok(windows.some((window) => window.action === "bring_backup"));
assert.ok(windows.some((window) => window.chapterLabel === "Rain Window"));
assert.ok(windows.every((window) => window.deepLinks.length > 0));

console.log("Weather Windows passed.");
```

- [ ] **Step 2: Write Story of the Day test**

```ts
import assert from "node:assert/strict";
import { buildWeatherDayStory } from "../lib/weather/dayStory";

const story = buildWeatherDayStory({
  windows: [
    {
      id: "morning",
      locationKey: "all_wdw",
      startsAt: "2026-06-27T08:00:00-04:00",
      endsAt: "2026-06-27T12:00:00-04:00",
      title: "Morning",
      chapterLabel: "Sunshine Start",
      action: "go_now",
      headline: "Good outdoor window",
      plainLanguageSummary: "Outdoor resort exploring works best this morning.",
      recommendedActivityTags: ["outdoor_shaded"],
      cautionActivityTags: [],
      avoidActivityTags: [],
      deepLinks: [{ label: "See outdoor activities", href: "/today?weather=outdoor" }],
    },
  ],
  stormModeActive: false,
});

assert.match(story.headline, /Sunshine|outdoor|morning/i);
assert.ok(story.chapters[0].href);
assert.doesNotMatch(story.body, /cute|magical alert/i);

console.log("Weather day story passed.");
```

- [ ] **Step 3: Write Storm Mode test**

```ts
import assert from "node:assert/strict";
import { getStormModeState } from "../lib/weather/stormMode";

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
```

- [ ] **Step 4: Write Plan Resilience test**

```ts
import assert from "node:assert/strict";
import { scorePlanResilience } from "../lib/weather/resilience";

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
```

- [ ] **Step 5: Write Forecast Compare and Resort Profile tests**

Tests must prove:

- `ForecastCompare` returns no exact timing recommendation for past events, fixed-time events, and 8-15 day long-range planning outlooks.
- `ForecastCompare` allows exact "go earlier" comparison only for flexible activities in the 0-72 hour window.
- `ResortWeatherProfile` covers at least Polynesian, BoardWalk, Fort Wilderness, and Animal Kingdom Lodge with data-backed rain/heat/storm summaries.
- `RouteWeatherLegImpact` supports direct walking, boat, monorail, Skyliner, bus, and rideshare modes but does not recommend multi-hop resort transfers as easy weather workarounds.
- `RouteWeatherImpact.tsx` is not imported by production pages unless `ROUTE_WEATHER_ENABLED=true`.

- [ ] **Step 6: Implement modules**

Implement each module with deterministic inputs and no provider fetches. They should consume normalized weather, activity profiles, and plan data produced by earlier tasks.

Rules:

- Weather Windows replace generic forecast blocks as the primary page-level weather UX.
- Story of the Day must stay practical and action-linked; do not write horoscope-like copy.
- Storm Mode must use calm safety language and suppress outdoor recommendations.
- Plan Resilience must score saved plans from real weather-sensitive item coverage and backup availability.
- Forecast Compare must be constrained by forecast confidence and activity flexibility.
- Resort Weather Personality must be data-backed and concise.
- Route Weather is V2-ready but should not drive MVP UI until the route graph is mature.

- [ ] **Step 7: Run the passing tests**

Run:

```bash
npx tsx scripts/test-weather-windows.ts
npx tsx scripts/test-weather-day-story.ts
npx tsx scripts/test-weather-storm-mode.ts
npx tsx scripts/test-plan-resilience.ts
npx tsx scripts/test-forecast-compare.ts
npx tsx scripts/test-resort-weather-profiles.ts
npx tsx scripts/test-route-weather.ts
```

Expected: all commands pass.

- [ ] **Step 8: Commit**

```bash
git add lib/weather/windows.ts lib/weather/dayStory.ts lib/weather/stormMode.ts lib/weather/resilience.ts lib/weather/forecastCompare.ts lib/weather/resortWeatherProfiles.ts lib/weather/routeWeather.ts scripts/test-weather-windows.ts scripts/test-weather-day-story.ts scripts/test-weather-storm-mode.ts scripts/test-plan-resilience.ts scripts/test-forecast-compare.ts scripts/test-resort-weather-profiles.ts scripts/test-route-weather.ts package.json
git commit -m "feat: add weather intelligence modules"
```

## Task 7: Add Weather Guidance API Route

**Files:**
- Create: `app/api/weather/guidance/route.ts`
- Create: `app/api/weather/guidance/batch/route.ts`
- Test: `scripts/test-weather-api-contract.ts`
- Test: `scripts/test-weather-api-validation.ts`
- Modify: `package.json`

- [ ] **Step 1: Write route contract test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/api/weather/guidance/route.ts", "utf8");
const batchSource = readFileSync("app/api/weather/guidance/batch/route.ts", "utf8");

assert.match(source, /export const dynamic = "force-dynamic"/);
assert.match(source, /locationKey/);
assert.match(source, /getWeatherLocation/);
assert.match(source, /chooseWeatherProviderForTimeSpan/);
assert.match(source, /Promise\.allSettled/);
assert.match(source, /forecastStatus/);
assert.match(source, /officialAlertStatus/);
assert.match(source, /getCachedNwsAlerts/);
assert.match(source, /parseWeatherLocationKey/);
assert.doesNotMatch(source, /WEATHERAPI_KEY.*NextResponse\.json/s);
assert.doesNotMatch(source, /condition\.icon/);
assert.match(batchSource, /POST/);
assert.match(batchSource, /groupOccurrencesByWeatherLocation/);
assert.match(batchSource, /getCachedWeatherSnapshot/);
assert.match(batchSource, /validateWeatherGuidanceBatchRequest/);
assert.doesNotMatch(batchSource, /occurrences\.map\(.*fetchWeatherApiForecast/s);

console.log("Weather API route contract passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-api-contract.ts`

Expected: FAIL because route does not exist.

- [ ] **Step 3: Implement the API route**

Route behavior:

- Accepts `locationKey`, `resortSlug`, `startsAt`, `endsAt`, and optional `activitySlug`.
- Resolves location key from `locationKey` first, then `resortSlug`, then `all_wdw`.
- Calls the provider router first, then the selected server-side provider.
- Uses WeatherAPI for 0-72 hour rich forecast when enabled.
- Uses NWS forecast for 72-168 hour official forecast and as WeatherAPI fallback.
- Uses Visual Crossing for 8-15 day long-range planning outlooks when enabled.
- Uses no provider for past events or events beyond 15 days.
- Always fetches NWS alerts separately when alert status is needed.
- Uses `Promise.allSettled` so alert failures and forecast failures are isolated.
- Returns `officialAlertStatus: "available" | "stale" | "unavailable"`.
- Returns `forecastStatus: "available" | "stale" | "unavailable" | "not_available_yet"`.
- Returns page-level guidance when no `startsAt` is provided.
- Returns `WeatherForTimeSpan | null` when `startsAt` is provided.
- Returns stale/unavailable labels when provider calls fail.
- Never includes the WeatherAPI key.

Skeleton:

```ts
import { NextResponse } from "next/server";
import { getWeatherLocation, getWeatherLocationForResort, parseWeatherLocationKey } from "@/lib/weather/locations";
import { getCachedNwsAlerts, getCachedNwsAlertsForAllWdw } from "@/lib/weather/cache";
import { chooseWeatherProviderForTimeSpan } from "@/lib/weather/providerRouter";
import { getCachedWeatherSnapshot } from "@/lib/weather/cache";
import { getWeatherForOccurrence } from "@/lib/weather/occurrence";
import { getWeatherGuidance } from "@/lib/weather/guidance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationKey = searchParams.get("locationKey");
  const resortSlug = searchParams.get("resortSlug");
  const startsAt = searchParams.get("startsAt");
  const endsAt = searchParams.get("endsAt") ?? undefined;

  const location = locationKey
    ? getWeatherLocation(parseWeatherLocationKey(locationKey))
    : getWeatherLocationForResort(resortSlug);

  try {
    const selection = chooseWeatherProviderForTimeSpan({
      now: new Date(),
      startsAt,
      endsAt,
    });
    const [snapshotResult, alertsResult] = await Promise.allSettled([
      getCachedWeatherSnapshot({ location, provider: selection.provider }),
      location.key === "all_wdw"
        ? getCachedNwsAlertsForAllWdw()
        : getCachedNwsAlerts({ location }),
    ]);

    const snapshot =
      snapshotResult.status === "fulfilled" ? snapshotResult.value : null;
    const alertState =
      alertsResult.status === "fulfilled"
        ? { status: "available", alerts: alertsResult.value }
        : { status: "unavailable", alerts: [] };

    if (startsAt) {
      const detail = getWeatherForOccurrence({
        now: new Date(),
        startsAt,
        endsAt,
        locationKey: location.key,
        hourlyForecast: snapshot.hourly,
        alerts,
        fetchedAt: snapshot.fetchedAt,
      });
      return NextResponse.json({ location, weather: detail });
    }

    const guidance = getWeatherGuidance({
      risk: snapshot.risk,
      alerts,
      activityWeatherTags: [],
    });
    return NextResponse.json({
      location,
      snapshot,
      alerts: alertState.alerts,
      officialAlertStatus: alertState.status,
      forecastStatus: snapshot ? "available" : "unavailable",
      guidance,
    });
  } catch (error) {
    return NextResponse.json(
      {
        location,
        guidance: {
          headline: "Weather is temporarily unavailable.",
          recommendedAction: "Activity schedules are still available, but weather-based recommendations may be incomplete.",
          visualState: "unavailable",
        },
      },
      { status: 200 }
    );
  }
}
```

- [ ] **Step 4: Implement the batch API route**

Create `POST /api/weather/guidance/batch` with request:

```ts
type WeatherGuidanceBatchRequest = {
  occurrences: Array<{
    id: string;
    resortSlug?: string;
    locationKey?: WeatherLocationKey;
    startsAt: string;
    endsAt?: string;
    activitySlug?: string;
  }>;
};
```

Batch behavior:

- Validate max batch size using a conservative limit such as 150 occurrences.
- Validate `locationKey` through `parseWeatherLocationKey`; never cast untrusted strings.
- Validate `startsAt` and `endsAt` as ISO strings.
- Reject or drop entries where `endsAt` is before `startsAt`.
- Reject bodies over the configured request-size limit.
- Drop past events before provider selection.
- Return `not_available_yet` without provider fetch for entries beyond 15 days.
- Let unknown `activitySlug` safely fall back to generic guidance.
- Group occurrences by weather location.
- For each location and horizon provider, call `getCachedWeatherSnapshot` once.
- Summarize all occurrences from cached hourly/daily data.
- Return per-occurrence weather details keyed by occurrence id.
- Return "Forecast will appear closer to your plan date" for events beyond 15 days.
- Never run `occurrences.map(...fetchWeatherApiForecast...)`.

Quota math target:

```txt
6 locations x 96 WeatherAPI refreshes/day = 576 calls/day
576 calls/day x 31 days = 17,856 calls/month
```

The implementation should preserve this shape by caching at location/provider/horizon level, not by card.

- [ ] **Step 5: Write API validation test**

Create `scripts/test-weather-api-validation.ts` to assert:

- `locationKey` must be one of `WeatherLocationKey` or safely fallback to `all_wdw`.
- `resortSlug` must be known or safely fallback to `all_wdw`.
- `startsAt` and `endsAt` must be valid ISO strings.
- `endsAt` cannot be before `startsAt`.
- Request body must be below a size limit.
- Batch size max is 150.
- Events beyond 15 days return `not_available_yet` without provider fetch.
- Past events are dropped before provider selection.
- Unknown `activitySlug` does not break guidance.
- Route source does not contain `getWeatherLocation(locationKey as never)`.

- [ ] **Step 6: Run the passing tests**

Run:

```bash
npx tsx scripts/test-weather-api-contract.ts
npx tsx scripts/test-weather-api-validation.ts
```

Expected: PASS with `Weather API route contract passed.` and validation coverage passing.

- [ ] **Step 7: Commit**

```bash
git add app/api/weather/guidance/route.ts app/api/weather/guidance/batch/route.ts scripts/test-weather-api-contract.ts scripts/test-weather-api-validation.ts package.json
git commit -m "feat: expose weather guidance API"
```

## Task 8: Add Weather UI Components

**Files:**
- Create: `components/weather/WeatherIcon.tsx`
- Create: `components/weather/WeatherIconButton.tsx`
- Create: `components/weather/WeatherTimeSpanPopover.tsx`
- Create: `components/weather/WeatherStatusStrip.tsx`
- Create: `components/weather/NwsAlertBanner.tsx`
- Create: `components/weather/ForecastTimeline.tsx`
- Create: `components/weather/ActivityWeatherBadge.tsx`
- Create: `components/weather/WeatherWindowStrip.tsx`
- Create: `components/weather/WeatherWindowCard.tsx`
- Create: `components/weather/WeatherStoryStrip.tsx`
- Create: `components/weather/PlanResilienceScore.tsx`
- Create: `components/weather/StormModeBanner.tsx`
- Create: `components/weather/StormModeActivitySuppression.tsx`
- Create: `components/weather/ForecastCompare.tsx`
- Create: `components/weather/ResortWeatherPersonality.tsx`
- Create: `components/weather/RouteWeatherImpact.tsx`
- Test: `scripts/test-weather-ui-contracts.ts`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/polish.css`
- Modify: `package.json`

- [ ] **Step 1: Write static UI contract test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "components/weather/WeatherIcon.tsx",
  "components/weather/WeatherIconButton.tsx",
  "components/weather/WeatherTimeSpanPopover.tsx",
  "components/weather/WeatherStatusStrip.tsx",
  "components/weather/NwsAlertBanner.tsx",
  "components/weather/ForecastTimeline.tsx",
  "components/weather/ActivityWeatherBadge.tsx",
  "components/weather/WeatherWindowStrip.tsx",
  "components/weather/WeatherWindowCard.tsx",
  "components/weather/WeatherStoryStrip.tsx",
  "components/weather/PlanResilienceScore.tsx",
  "components/weather/StormModeBanner.tsx",
  "components/weather/StormModeActivitySuppression.tsx",
  "components/weather/ForecastCompare.tsx",
  "components/weather/ResortWeatherPersonality.tsx",
  "components/weather/RouteWeatherImpact.tsx",
];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(source, /cdn\.weatherapi\.com|condition\.icon/, `${file} must not render WeatherAPI icons`);
}

const iconButton = readFileSync("components/weather/WeatherIconButton.tsx", "utf8");
assert.match(iconButton, /aria-label/);
assert.match(iconButton, /formatTempDual/);

const popover = readFileSync("components/weather/WeatherTimeSpanPopover.tsx", "utf8");
assert.match(popover, /hourlyBreakdown/);
assert.match(popover, /nwsAlerts/);
assert.match(popover, /formatTempDual/);
assert.match(popover, /formatWindDual/);

const tokens = readFileSync("src/styles/tokens.css", "utf8");
for (const token of [
  "--weather-normal-bg",
  "--weather-rain-bg",
  "--weather-heat-bg",
  "--weather-storm-bg",
  "--weather-alert-bg",
  "--weather-stale-bg",
  "--weather-unavailable-bg",
]) {
  assert.match(tokens, new RegExp(token), `${token} missing`);
}

const stormMode = readFileSync("components/weather/StormModeBanner.tsx", "utf8");
assert.match(stormMode, /role="alert"/);
assert.match(stormMode, /Official/);

const windows = readFileSync("components/weather/WeatherWindowStrip.tsx", "utf8");
assert.match(windows, /WeatherWindowCard/);
assert.match(windows, /deepLinks/);

const story = readFileSync("components/weather/WeatherStoryStrip.tsx", "utf8");
assert.match(story, /chapters/);

const resilience = readFileSync("components/weather/PlanResilienceScore.tsx", "utf8");
assert.match(resilience, /score/);
assert.match(resilience, /improvements/);

console.log("Weather UI contracts passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-ui-contracts.ts`

Expected: FAIL because weather components do not exist.

- [ ] **Step 3: Add semantic weather tokens**

Add to `src/styles/tokens.css`:

```css
  --weather-normal-bg: rgba(22, 166, 182, 0.12);
  --weather-normal-text: var(--lagoon-deep);
  --weather-rain-bg: rgba(8, 121, 138, 0.12);
  --weather-rain-text: #075f6d;
  --weather-heat-bg: rgba(253, 185, 78, 0.18);
  --weather-heat-text: #7a4a00;
  --weather-storm-bg: rgba(7, 26, 38, 0.12);
  --weather-storm-text: var(--night);
  --weather-alert-bg: rgba(184, 50, 50, 0.12);
  --weather-alert-text: var(--danger);
  --weather-stale-bg: rgba(107, 114, 128, 0.14);
  --weather-stale-text: var(--muted);
  --weather-unavailable-bg: rgba(22, 33, 42, 0.08);
  --weather-unavailable-text: var(--brand-ink);
```

- [ ] **Step 4: Implement components**

Component requirements:

- `WeatherIcon` renders `/weather-icons/${iconKey}.svg` with an accessible label.
- `WeatherIconButton` uses a real `<button>`, 44px minimum tap target, visible text, and `formatTempDual`.
- `WeatherTimeSpanPopover` is keyboard openable and includes hourly rows, NWS alerts, timestamp, activity impact, dual units, and stale labels.
- `WeatherStatusStrip` supports states `normal`, `rain`, `heat`, `storm`, `official_alert`, `stale`, and `unavailable`.
- `NwsAlertBanner` uses `role="alert"` only for active Severe or Extreme alerts.
- `ForecastTimeline` groups forecast rows into now, next 2 hours, afternoon, evening, and tonight.
- `ActivityWeatherBadge` renders visible labels such as Indoor, Covered, Rain backup, Heat-friendly, May pause for storms, Pool/lightning sensitive, and Skyliner caution.
- `WeatherWindowStrip` renders action-oriented windows before raw forecast timelines.
- `WeatherStoryStrip` renders practical day chapters with links to weather-aware actions.
- `StormModeBanner` and `StormModeActivitySuppression` visibly shift the page into safety posture without playful alert copy.
- `PlanResilienceScore` renders label, score, reasons, and improvement actions.
- `ForecastCompare` clearly distinguishes exact 0-72 hour comparisons from soft 4-7 day planning language and suppresses 8-15 day exact timing.
- `ResortWeatherPersonality` renders concise, data-backed resort weather strengths.
- `RouteWeatherImpact` must not render in MVP unless `ROUTE_WEATHER_ENABLED=true`; route-weather UI is V2-ready only and must not promote multi-hop transfers as easy weather workarounds.

- [ ] **Step 5: Add CSS**

Add compact, non-nested weather classes to `src/styles/polish.css`. Keep cards at the existing app style and avoid new decorative page sections.

- [ ] **Step 6: Run the passing test**

Run: `npx tsx scripts/test-weather-ui-contracts.ts`

Expected: PASS with `Weather UI contracts passed.`

- [ ] **Step 7: Commit**

```bash
git add components/weather src/styles/tokens.css src/styles/polish.css scripts/test-weather-ui-contracts.ts package.json
git commit -m "feat: add weather UI components"
```

## Task 9: Integrate Weather Into Event Cards

**Files:**
- Modify: `components/events/EventCard.tsx`
- Modify: `lib/events/mapToEventCard.ts`
- Modify: `components/activity/ActivityCard.tsx`
- Modify: `components/tonight/NightActivityCard.tsx`
- Modify: `components/tonight/MovieCard.tsx`
- Test: `scripts/test-weather-card-integration.ts`
- Test: `scripts/test-weather-card-decision-copy.ts`
- Modify: `package.json`

- [ ] **Step 1: Write card integration test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const eventCard = readFileSync("components/events/EventCard.tsx", "utf8");
assert.match(eventCard, /weatherSummary/);
assert.match(eventCard, /WeatherIconButton/);
assert.match(eventCard, /WeatherTimeSpanPopover/);

const mapper = readFileSync("lib/events/mapToEventCard.ts", "utf8");
assert.match(mapper, /weatherQuery/);
assert.match(mapper, /startDateTime/);
assert.match(mapper, /endDateTime/);

for (const file of [
  "components/activity/ActivityCard.tsx",
  "components/tonight/NightActivityCard.tsx",
  "components/tonight/MovieCard.tsx",
]) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /weather/i, `${file} must pass weather context`);
}

console.log("Weather card integration contracts passed.");
```

Create `scripts/test-weather-card-decision-copy.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const eventCard = readFileSync("components/events/EventCard.tsx", "utf8");
for (const label of [
  "Good to go",
  "Go earlier",
  "Bring backup",
  "Likely affected",
  "Stay indoors",
  "Official alert",
]) {
  assert.match(eventCard, new RegExp(label), `${label} decision copy missing`);
}
assert.match(eventCard, /weatherDecisionLabel/);
assert.match(eventCard, /formatTempDual/);

console.log("Weather card decision copy passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-card-integration.ts`

Expected: FAIL because card props do not include weather.

- [ ] **Step 3: Add card prop types**

In `components/events/EventCard.tsx`, add:

```ts
import type { WeatherForTimeSpan } from "@/lib/weather/types";

export interface EventWeatherQuery {
  resortSlug?: string;
  locationKey?: string;
  startsAt?: string;
  endsAt?: string;
  activitySlug?: string;
}
```

Add optional props:

```ts
weatherSummary?: WeatherForTimeSpan | null;
weatherQuery?: EventWeatherQuery;
weatherDecisionLabel?:
  | "Good to go"
  | "Go earlier"
  | "Bring backup"
  | "Likely affected"
  | "Stay indoors"
  | "Official alert";
```

- [ ] **Step 4: Render weather controls**

Inside `EventCard`, render `WeatherIconButton` only when `weatherSummary?.shouldDisplayWeather` is true. Keep the popover controlled locally so cards remain reusable. The compact card must render an action label beside the icon; the icon should support the decision, not carry the whole meaning.

- [ ] **Step 5: Add mapper fields**

In `lib/events/mapToEventCard.ts`, include:

```ts
weatherQuery: display.startDateTime
  ? {
      resortSlug: display.resortSlug,
      startsAt: display.startDateTime,
      endsAt: display.endDateTime,
      activitySlug: display.activitySlug,
    }
  : undefined,
```

- [ ] **Step 6: Pass weather context through activity and movie cards**

For normal activity cards, pass `weatherSummary` when parent pages have fetched it. For movie cards, derive the resort slug and showtime date/time before requesting weather.

- [ ] **Step 7: Run the passing test**

Run:

```bash
npx tsx scripts/test-weather-card-integration.ts
npx tsx scripts/test-weather-card-decision-copy.ts
```

Expected: PASS with `Weather card integration contracts passed.` and `Weather card decision copy passed.`

- [ ] **Step 8: Commit**

```bash
git add components/events/EventCard.tsx lib/events/mapToEventCard.ts components/activity/ActivityCard.tsx components/tonight/NightActivityCard.tsx components/tonight/MovieCard.tsx scripts/test-weather-card-integration.ts scripts/test-weather-card-decision-copy.ts package.json
git commit -m "feat: surface weather on event cards"
```

## Task 10: Integrate Weather Into Today And Tonight

**Files:**
- Modify: `components/atlas/TodayClient.tsx`
- Modify: `components/atlas/TonightClient.tsx`
- Modify: `app/api/today/route.ts`
- Modify: `app/api/tonight/route.ts`
- Test: `scripts/test-weather-today-tonight.ts`
- Modify: `package.json`

- [ ] **Step 1: Write page integration test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const today = readFileSync("components/atlas/TodayClient.tsx", "utf8");
assert.match(today, /WeatherStatusStrip/);
assert.match(today, /WeatherWindowStrip/);
assert.match(today, /WeatherStoryStrip/);
assert.match(today, /\/api\/weather\/guidance\/batch/);
assert.match(today, /weather=indoor/);

const tonight = readFileSync("components/atlas/TonightClient.tsx", "utf8");
assert.match(tonight, /WeatherStatusStrip/);
assert.match(tonight, /WeatherWindowStrip/);
assert.match(tonight, /WeatherStoryStrip/);
assert.match(tonight, /StormModeBanner/);
assert.match(tonight, /ForecastTimeline/);
assert.match(tonight, /\/api\/weather\/guidance\/batch/);
assert.match(tonight, /weather=indoor/);

console.log("Today and tonight weather integration contracts passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-today-tonight.ts`

Expected: FAIL because weather UI is absent.

- [ ] **Step 3: Fetch page-level weather guidance**

In `TodayClient` and `TonightClient`, fetch `/api/weather/guidance?locationKey=all_wdw` for page-level guidance and `/api/weather/guidance/batch` for dated cards. Store guidance separately from activities so activity list failures do not erase weather state.

- [ ] **Step 4: Fetch card weather in batches**

For activities with `startDateTime`, send all visible occurrences to the batch endpoint with `id`, `resortSlug`, `startsAt`, and `endsAt`. Cache by `activity.id` in component state. Do not request weather for records without a date/time.

- [ ] **Step 5: Add page modules**

Add:

- `WeatherStatusStrip` above the Today timeline.
- `WeatherStatusStrip` below `TonightHero`.
- `WeatherWindowStrip` above raw forecast timelines as the primary planning UI.
- `WeatherStoryStrip` as a calm day-flow narrative with action links.
- `StormModeBanner` on Tonight and Today when NWS alerts or high storm risk require safety posture.
- `ForecastTimeline` on Tonight when hourly data exists.
- CTA links to `/today?weather=indoor`, `/tonight?weather=indoor`, and `/activities?weather=covered`.

- [ ] **Step 6: Run the passing test**

Run: `npx tsx scripts/test-weather-today-tonight.ts`

Expected: PASS with `Today and tonight weather integration contracts passed.`

- [ ] **Step 7: Commit**

```bash
git add components/atlas/TodayClient.tsx components/atlas/TonightClient.tsx app/api/today/route.ts app/api/tonight/route.ts scripts/test-weather-today-tonight.ts package.json
git commit -m "feat: add weather to today and tonight"
```

## Task 11: Add Plan Weather Persistence And UI

**Files:**
- Create: `supabase/migrations/20260627130000_weather_guidance_layer.sql`
- Modify: `lib/plan/types.ts`
- Modify: `lib/plan/server.ts`
- Modify: `components/plan/PlanItem.tsx`
- Modify: `components/plan/PlanTimeline.tsx`
- Create: `components/weather/PlanWeatherPanel.tsx`
- Create: `components/weather/PlanResilienceScore.tsx`
- Test: `scripts/test-plan-weather.ts`
- Test: `scripts/test-plan-resilience.ts`
- Modify: `package.json`

- [ ] **Step 1: Write plan weather contract test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260627130000_weather_guidance_layer.sql", "utf8");
for (const table of [
  "weather_locations",
  "weather_snapshots",
  "weather_alerts",
  "activity_weather_profiles",
  "plan_weather_snapshots",
]) {
  assert.match(migration, new RegExp(`create table public\\.${table}`), `${table} missing`);
}

const planItem = readFileSync("components/plan/PlanItem.tsx", "utf8");
assert.match(planItem, /shouldShowWeatherForOccurrence/);
assert.match(planItem, /WeatherIconButton/);

const timeline = readFileSync("components/plan/PlanTimeline.tsx", "utf8");
assert.match(timeline, /PlanWeatherPanel/);
assert.match(timeline, /PlanResilienceScore/);

console.log("Plan weather contracts passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-plan-weather.ts`

Expected: FAIL because migration and UI changes do not exist.

- [ ] **Step 3: Add weather tables**

Migration shape:

```sql
create table public.weather_locations (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  latitude numeric not null,
  longitude numeric not null,
  timezone text not null default 'America/New_York',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  weather_location_id uuid not null references public.weather_locations(id) on delete cascade,
  provider text not null,
  fetched_at timestamptz not null,
  observed_at timestamptz,
  raw_json jsonb not null default '{}'::jsonb,
  normalized_json jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  stale_after timestamptz not null,
  error_state text,
  created_at timestamptz not null default now()
);

create table public.weather_alerts (
  id uuid primary key default gen_random_uuid(),
  weather_location_id uuid not null references public.weather_locations(id) on delete cascade,
  provider text not null default 'nws',
  provider_alert_id text not null,
  event text not null,
  headline text not null,
  severity text not null,
  urgency text not null,
  certainty text not null,
  effective timestamptz not null,
  expires timestamptz not null,
  area_desc text,
  instruction text,
  description text,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_alert_id)
);

create table public.activity_weather_profiles (
  activity_id text primary key,
  rain_fit text not null,
  heat_fit text not null,
  storm_fit text not null,
  wind_fit text not null,
  weather_fit_tags text[] not null default '{}',
  default_weather_caveat text,
  indoor_backup_activity_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.plan_weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  weather_snapshot_id uuid references public.weather_snapshots(id) on delete set null,
  created_at timestamptz not null default now(),
  summary text not null,
  risk_json jsonb not null default '{}'::jsonb
);

create index weather_snapshots_location_provider_expires_idx
  on public.weather_snapshots (weather_location_id, provider, expires_at desc);

create index weather_snapshots_stale_after_idx
  on public.weather_snapshots (stale_after);

create index weather_alerts_location_expires_idx
  on public.weather_alerts (weather_location_id, expires);

create index weather_alerts_provider_alert_idx
  on public.weather_alerts (provider, provider_alert_id);

create index plan_weather_snapshots_itinerary_created_idx
  on public.plan_weather_snapshots (itinerary_id, created_at desc);

create index activity_weather_profiles_tags_idx
  on public.activity_weather_profiles using gin (weather_fit_tags);
```

Enable RLS. Owners can read `plan_weather_snapshots` only through owned itineraries. Service role can manage all weather tables.

Retention rules:

- Keep provider diagnostic snapshots for 7-14 days.
- Keep `plan_weather_snapshots` until the itinerary is deleted.
- Delete expired alerts after a safe audit window, such as 14-30 days.
- Never let `weather_snapshots` grow unbounded.

- [ ] **Step 4: Extend plan response types**

Add optional weather fields:

```ts
export interface PlanWeatherContext {
  planId: string;
  date: string;
  locationKey: WeatherLocationKey;
  forecastSnapshotId?: string;
  generatedAt: string;
  planWeatherSummary: string;
  warnings: PlanWeatherWarning[];
}
```

- [ ] **Step 5: Add plan item weather UI**

In `PlanItem.tsx`:

- Use `shouldShowWeatherForOccurrence`.
- Show weather only when the item has current/future `startDateTime`.
- Hide weather for completed/past items.
- Show item-level warning text for rain, heat, storm, wind, and NWS alert states.

- [ ] **Step 6: Add `PlanWeatherPanel` to timeline**

At the top of `PlanTimeline`, render plan-level summary, affected-item count, and actions:

- Add backup
- Replace activity
- Move earlier
- Move later
- Keep as weather-dependent
- Plan resilience label and score
- Reasons the plan is strong, flexible, fragile, or unsafe

Initial implementation may render actions as links or disabled buttons until plan-edit operations exist; labels and state must be present.

- [ ] **Step 7: Add plan resilience scoring**

Use `scorePlanResilience` from `lib/weather/resilience.ts`. Scoring inputs:

- Future plan item count.
- Weather-sensitive item count.
- Indoor/covered backup coverage.
- Same-resort backup availability.
- Transportation weather risk.
- NWS alert state.
- Storm risk.
- Heat risk.
- Rain risk.
- Toddlers, grandparents, and mobility-sensitive group context when available.
- Fixed vs flexible events.

Examples:

```txt
Plan resilience: Strong
4 of 5 activities have indoor or covered backups.
```

```txt
Plan resilience: Fragile
Tonight depends on an outdoor movie and Skyliner timing during storm risk.
```

- [ ] **Step 8: Run the passing tests**

Run:

```bash
npx tsx scripts/test-plan-weather.ts
npx tsx scripts/test-plan-resilience.ts
```

Expected: PASS with `Plan weather contracts passed.` and `Plan resilience passed.`

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260627130000_weather_guidance_layer.sql lib/plan/types.ts lib/plan/server.ts components/plan/PlanItem.tsx components/plan/PlanTimeline.tsx components/weather/PlanWeatherPanel.tsx components/weather/PlanResilienceScore.tsx scripts/test-plan-weather.ts scripts/test-plan-resilience.ts package.json
git commit -m "feat: add weather to saved plans"
```

## Task 11B: Add Plan Weather Material Change Detection

**Files:**
- Create: `lib/weather/materialChange.ts`
- Test: `scripts/test-plan-weather-material-change.ts`
- Modify: `components/weather/PlanWeatherPanel.tsx`
- Modify: `lib/plan/types.ts`
- Modify: `package.json`

- [ ] **Step 1: Write material-change test**

```ts
import assert from "node:assert/strict";
import { detectPlanWeatherMaterialChanges } from "../lib/weather/materialChange";

const changes = detectPlanWeatherMaterialChanges({
  previous: {
    itemId: "movie-1",
    rainChancePct: 20,
    stormRisk: "low",
    feelsLikeF: 88,
    windRisk: "low",
    outdoorFit: "good",
    confidence: "near_term_hourly",
  },
  current: {
    itemId: "movie-1",
    rainChancePct: 55,
    stormRisk: "high",
    feelsLikeF: 96,
    windRisk: "medium",
    outdoorFit: "poor",
    confidence: "near_term_hourly",
  },
  activityTags: ["outdoor_movie"],
});

assert.ok(changes.some((change) => change.severity === "warning"));
assert.ok(changes.some((change) => /Rain/i.test(change.title)));
assert.ok(changes.some((change) => change.suggestedActions.length > 0));

console.log("Plan weather material-change detection passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-plan-weather-material-change.ts`

Expected: FAIL until `lib/weather/materialChange.ts` exists.

- [ ] **Step 3: Implement material-change detection**

Create:

```ts
export interface PlanWeatherMaterialChange {
  itemId?: string;
  severity: "info" | "caution" | "warning" | "official_alert";
  title: string;
  message: string;
  suggestedActions: PlanResilienceScore["improvements"];
}
```

Rules:

- Rain chance increases by 25+ points during a future plan item.
- Storm risk moves from low/medium to high.
- NWS alert becomes active.
- Feels-like temperature crosses activity/audience threshold.
- Wind/gust risk crosses activity threshold.
- Outdoor fit worsens from good/mixed to poor/unsafe.
- Forecast confidence changes from near-term to unavailable/stale.

- [ ] **Step 4: Add UI copy to `PlanWeatherPanel`**

Example:

```txt
Weather changed for your plan.
Rain risk increased during your 8:30 PM outdoor movie. Add an indoor backup?
```

Actions:

- Add backup.
- Replace activity.
- Move earlier.
- Move later.
- Keep as weather-dependent.
- Show same-resort indoor options.

- [ ] **Step 5: Run the passing test**

Run: `npx tsx scripts/test-plan-weather-material-change.ts`

Expected: PASS with `Plan weather material-change detection passed.`

- [ ] **Step 6: Commit**

```bash
git add lib/weather/materialChange.ts scripts/test-plan-weather-material-change.ts components/weather/PlanWeatherPanel.tsx lib/plan/types.ts package.json
git commit -m "feat: detect plan weather changes"
```

## Task 12: Integrate Resort, Activity, And Guide Pages

**Files:**
- Modify: `app/resorts/[slug]/page.tsx`
- Modify: `app/activities/[slug]/page.tsx`
- Modify: `app/guides/[slug]/page.tsx`
- Modify: `app/guides/first-night-at-the-resort/page.tsx`
- Modify: `lib/guides/index.ts`
- Test: `scripts/test-weather-seo-guardrails.ts`
- Test: `scripts/test-resort-weather-profiles.ts`
- Test: `scripts/test-forecast-compare.ts`
- Modify: `package.json`

- [ ] **Step 1: Write SEO guardrail test**

```ts
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const appRoutes = readdirSync("app", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const forbidden of [
  "disney-world-weather-today",
  "weather-at-disney-resorts",
  "rain-at-disney-world-today",
]) {
  assert.equal(appRoutes.includes(forbidden), false, `${forbidden} route must not exist`);
}

for (const file of [
  "app/resorts/[slug]/page.tsx",
  "app/activities/[slug]/page.tsx",
  "app/guides/[slug]/page.tsx",
]) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /weather/i, `${file} should include weather integration`);
}

const resortPage = readFileSync("app/resorts/[slug]/page.tsx", "utf8");
assert.match(resortPage, /ResortWeatherPersonality/);
assert.match(resortPage, /WeatherWindowStrip/);

const activityPage = readFileSync("app/activities/[slug]/page.tsx", "utf8");
assert.match(activityPage, /ForecastCompare/);
assert.match(activityPage, /ActivityWeatherBadge/);

console.log("Weather SEO guardrails passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-seo-guardrails.ts`

Expected: FAIL until weather modules are added to the existing pages.

- [ ] **Step 3: Add resort page module**

On `app/resorts/[slug]/page.tsx`, resolve resort weather location and add:

- Weather near this resort area.
- Today/tonight outdoor fit.
- Weather-safe backups section.
- Outdoor activities to confirm section.
- `#rainy-day-options` anchor for deep links.
- `WeatherWindowStrip` for the resort area.
- `WeatherStoryStrip` when enough forecast windows exist.
- `ResortWeatherPersonality` using data-backed resort profile fields.

- [ ] **Step 4: Add activity page module**

On `app/activities/[slug]/page.tsx`, add:

- Weather caveat from activity weather profile.
- Upcoming occurrence weather summaries.
- Backup recommendation links for weather-sensitive activities.
- NWS alert banner when active.
- `ActivityWeatherBadge` labels for weather fit.
- `ForecastCompare` only when the activity is flexible, within 0-72 hours for exact timing, or 4-7 days for soft planning guidance.
- No exact "go at X time" comparison for fixed-time events or 8-15 day long-range outlooks.

- [ ] **Step 5: Add guide modules**

For rainy-day, first-night, grandparents/toddlers/couples, and transportation-sensitive guide content, add live modules that hydrate weather client-side and keep source-backed guide copy server-rendered.

Guide behavior:

- Rainy-day modules prioritize indoor and covered activities from Weather Windows.
- First-night modules avoid walking-heavy and multi-hop suggestions during heat, rain, and storm risk.
- Grandparents/toddlers modules apply lower heat thresholds and low-walking recommendations.
- Resort-hopping modules mark Skyliner/boat legs weather-sensitive and avoid multi-hop transfer workarounds.

- [ ] **Step 6: Run the passing tests**

Run:

```bash
npx tsx scripts/test-weather-seo-guardrails.ts
npx tsx scripts/test-resort-weather-profiles.ts
npx tsx scripts/test-forecast-compare.ts
```

Expected: PASS with `Weather SEO guardrails passed.` plus resort profile and forecast compare tests passing.

- [ ] **Step 7: Commit**

```bash
git add app/resorts/[slug]/page.tsx app/activities/[slug]/page.tsx app/guides/[slug]/page.tsx app/guides/first-night-at-the-resort/page.tsx lib/guides/index.ts scripts/test-weather-seo-guardrails.ts scripts/test-resort-weather-profiles.ts scripts/test-forecast-compare.ts package.json
git commit -m "feat: integrate weather into resort and guide pages"
```

## Task 13: Add Observability And Quota Guardrails

**Files:**
- Create: `lib/weather/analytics.ts`
- Modify: `components/analytics/WebVitals.tsx` or existing analytics hook point
- Modify: `lib/weather/weatherapi.ts`
- Modify: `lib/weather/nws.ts`
- Modify: `lib/weather/nwsForecast.ts`
- Modify: `lib/weather/visualcrossing.ts`
- Modify: `lib/weather/providerRouter.ts`
- Test: `scripts/test-weather-observability.ts`
- Modify: `package.json`

- [ ] **Step 1: Write observability test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const analytics = readFileSync("lib/weather/analytics.ts", "utf8");
for (const event of [
  "weather_module_impression",
  "weather_backup_cta_click",
  "weather_plan_change_prompt",
  "weather_plan_resilience_view",
  "weather_window_impression",
  "weather_story_chapter_click",
  "nws_alert_banner_view",
  "nws_forecast_used",
  "visual_crossing_outlook_used",
  "weather_provider_error",
  "weather_stale_served",
  "weather_provider_route_selected",
  "weather_api_quota_near_limit",
]) {
  assert.match(analytics, new RegExp(event), `${event} missing`);
}

const weatherapi = readFileSync("lib/weather/weatherapi.ts", "utf8");
assert.match(weatherapi, /WEATHERAPI_KEY/);
assert.match(weatherapi, /WEATHERAPI_FORECAST_DAYS/);
assert.doesNotMatch(weatherapi, /console\.log\(.*key/i);

const nws = readFileSync("lib/weather/nws.ts", "utf8");
assert.match(nws, /NWS_USER_AGENT/);
assert.match(nws, /User-Agent/);

const nwsForecast = readFileSync("lib/weather/nwsForecast.ts", "utf8");
assert.match(nwsForecast, /weather_provider_error|nws_forecast_used/);

const visualCrossing = readFileSync("lib/weather/visualcrossing.ts", "utf8");
assert.match(visualCrossing, /VISUAL_CROSSING_KEY/);
assert.match(visualCrossing, /visual_crossing_outlook_used/);
assert.match(visualCrossing, /attribution/i);

const router = readFileSync("lib/weather/providerRouter.ts", "utf8");
assert.match(router, /weather_provider_route_selected/);

console.log("Weather observability contracts passed.");
```

- [ ] **Step 2: Run the failing test**

Run: `npx tsx scripts/test-weather-observability.ts`

Expected: FAIL until analytics helper exists.

- [ ] **Step 3: Add analytics helper**

Create a typed analytics event helper with these events:

- `weather_module_impression`
- `weather_window_impression`
- `weather_story_chapter_click`
- `weather_backup_cta_click`
- `weather_plan_change_prompt`
- `weather_plan_item_warning_view`
- `weather_plan_resilience_view`
- `nws_alert_banner_view`
- `nws_alert_detail_open`
- `nws_forecast_used`
- `visual_crossing_outlook_used`
- `weather_provider_route_selected`
- `weather_provider_error`
- `weather_stale_served`
- `weather_api_quota_near_limit`
- `visual_crossing_quota_near_limit`
- `weather_forecast_not_available_yet`

- [ ] **Step 4: Add provider error logging**

Provider clients should emit structured events without secrets:

```ts
trackWeatherEvent("weather_provider_error", {
  provider: "weatherapi",
  status,
  locationKey: location.key,
});
```

Provider router should emit:

```ts
trackWeatherEvent("weather_provider_route_selected", {
  provider,
  confidence,
  locationKey,
  hoursOut,
});
```

Visual Crossing usage should emit attribution-aware, quota-aware events. NWS forecast usage should emit separate events from NWS alerts so alert monitoring remains distinct from forecast monitoring.

- [ ] **Step 5: Run the passing test**

Run: `npx tsx scripts/test-weather-observability.ts`

Expected: PASS with `Weather observability contracts passed.`

- [ ] **Step 6: Commit**

```bash
git add lib/weather/analytics.ts components/analytics/WebVitals.tsx lib/weather/weatherapi.ts lib/weather/nws.ts scripts/test-weather-observability.ts package.json
git commit -m "feat: add weather observability"
```

## Task 14: Figma Icon Library Handoff

**Files:**
- Modify: `public/weather-icons/*.svg`
- Modify: `lib/weather/icons.ts`
- Test: `scripts/test-weather-condition-map.ts`

- [ ] **Step 1: Create the Figma component system**

Use Figma MCP to inspect the existing After the Parks design system and create a page named `After the Parks Weather Icons`.

Create a `WeatherIcon` component set with these variant axes:

- `condition`: every `WeatherIconKey`
- `size`: `xs`, `sm`, `md`, `lg`, `hero`
- `mode`: `day`, `night`, `neutral`
- `state`: `normal`, `caution`, `alert`, `disabled`
- `motion`: `static`, `subtle`

Style rules:

- Magical, warm, storybook, resort-planning focused.
- No Disney characters, Mickey silhouettes, castle silhouettes, attraction likenesses, official Disney marks, or Disney-like branding.
- Readable at 16px and 24px.
- Accessible contrast.
- Reduced-motion safe.

- [ ] **Step 2: Export SVG assets**

Export SVG assets using semantic names that match `WeatherIconKey`, then replace placeholder files in `public/weather-icons/`.

- [ ] **Step 3: Update icon map metadata**

If Figma component IDs are available, add them to `WeatherApiConditionMapItem` and update `scripts/test-weather-condition-map.ts` to assert every mapped icon has a component ID and SVG.

- [ ] **Step 4: Run icon coverage**

Run: `npx tsx scripts/test-weather-condition-map.ts`

Expected: PASS with `Weather condition icon map coverage passed.`

- [ ] **Step 5: Commit**

```bash
git add public/weather-icons lib/weather/icons.ts scripts/test-weather-condition-map.ts
git commit -m "feat: replace placeholder weather icons"
```

## Task 15: Final Verification

**Files:**
- All weather files touched above

- [ ] **Step 1: Run weather tests**

```bash
npx tsx scripts/test-weather-locations.ts
npx tsx scripts/test-weather-free-source-policy.ts
npx tsx scripts/test-forecast-horizon-policy.ts
npx tsx scripts/test-weather-cache-contract.ts
npx tsx scripts/test-weather-partial-failure.ts
npx tsx scripts/test-weather-alert-expiry.ts
npx tsx scripts/test-weather-timezone.ts
npx tsx scripts/test-weather-server-only.ts
npx tsx scripts/test-weather-condition-map.ts
npx tsx scripts/test-weather-format.ts
npx tsx scripts/test-weather-normalizers.ts
npx tsx scripts/test-nws-forecast.ts
npx tsx scripts/test-visualcrossing-normalizer.ts
npx tsx scripts/test-weather-provider-routing.ts
npx tsx scripts/test-weather-occurrence.ts
npx tsx scripts/test-weather-thresholds.ts
npx tsx scripts/test-weather-guidance.ts
npx tsx scripts/test-weather-windows.ts
npx tsx scripts/test-weather-day-story.ts
npx tsx scripts/test-weather-storm-mode.ts
npx tsx scripts/test-plan-resilience.ts
npx tsx scripts/test-plan-weather-material-change.ts
npx tsx scripts/test-forecast-compare.ts
npx tsx scripts/test-resort-weather-profiles.ts
npx tsx scripts/test-route-weather.ts
npx tsx scripts/test-weather-api-contract.ts
npx tsx scripts/test-weather-api-validation.ts
npx tsx scripts/test-weather-ui-contracts.ts
npx tsx scripts/test-weather-card-integration.ts
npx tsx scripts/test-weather-card-decision-copy.ts
npx tsx scripts/test-weather-today-tonight.ts
npx tsx scripts/test-plan-weather.ts
npx tsx scripts/test-weather-seo-guardrails.ts
npx tsx scripts/test-weather-observability.ts
```

Expected: every command exits 0.

- [ ] **Step 2: Run full contracts**

Run: `npm run validate:contracts`

Expected: all existing and new contracts pass.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: Next.js production build succeeds.

- [ ] **Step 4: Manual QA**

Run: `npm run dev`

Open:

- `http://localhost:3000/today`
- `http://localhost:3000/tonight`
- `http://localhost:3000/resorts/polynesian-village-resort`
- `http://localhost:3000/activities/movies-under-the-stars`
- `http://localhost:3000/plan`

Verify:

- Today and tonight show page-level weather guidance.
- Weather Windows appear before raw forecast timelines.
- Story of the Day chapters describe how the day should flow and link to actions.
- Storm Mode suppresses outdoor recommendations when severe alert test data is injected.
- Expired NWS alerts do not activate Storm Mode.
- NWS alert refresh failures show "Official alert status could not be refreshed" and do not claim there are no alerts.
- Current/future timed cards show icon, dual units, and popover.
- Current/future timed cards show decision labels such as Good to go, Go earlier, Bring backup, Likely affected, Stay indoors, or Official alert.
- Past cards do not show weather.
- NWS alert states override normal cheerful icon treatment when test data is injected.
- WeatherAPI icon URLs do not appear in DOM.
- Dual units appear everywhere weather appears.
- Stale/unavailable states are visible.
- Plan pages show Plan Resilience Score and weather improvement actions.
- Plan pages detect material weather changes since the saved snapshot.
- Resort pages show data-backed weather personality modules.
- Mobile popover/bottom-sheet interaction is keyboard and tap accessible.
- Provider clients are server-only and do not appear in client bundles.
- Batch endpoint groups by location/provider horizon and does not fetch per occurrence.
- No new standalone weather SEO pages exist.

- [ ] **Step 5: Commit verification fixes**

If verification requires fixes, commit them:

```bash
git add <fixed-files>
git commit -m "fix: verify weather guidance layer"
```

## Launch Notes

### MVP Forecast Horizon

Use WeatherAPI.com Free only for the optional rich 0-3 day friendly forecast layer.
Use NWS `forecastHourly` and `forecast` for the official free 0-7 day planning layer.
Use Visual Crossing Free for 8-15 day long-range planning outlooks only when `VISUAL_CROSSING_ENABLED=true`.
Do not request WeatherAPI forecast days above 3 while `WEATHERAPI_PLAN=free`.
Do not show live forecast weather beyond 15 days.
Do not show weather on past events or completed plan items.
Use NWS alerts as the only official safety alert layer.

Forecast confidence language:

- 0-3 days: `Weather during this activity window`
- 4-7 days: `7-day forecast outlook`
- 8-15 days: `Long-range planning outlook`
- Beyond 15 days: `Forecast not available yet`

### Refresh Strategy

- Current/hourly WeatherAPI data: 10-15 minute user-facing freshness, 15 minute cache.
- Daily WeatherAPI data: 4 hour cache.
- NWS alerts: 60 second normal cache.
- NWS severe-weather mode: never request more often than every 30 seconds.
- NWS hourly forecast: 30-60 minute cache.
- NWS period forecast: 4 hour cache.
- NWS point/grid metadata: 24 hour cache with periodic refresh.
- Visual Crossing 8-15 day planning outlook: 6-12 hour cache.
- Stale WeatherAPI data: may be shown with "Weather may be stale" if current data is older than 30 minutes or forecast data is older than 8 hours.
- NWS failure: never say "no alerts"; say "Official alert status could not be refreshed."
- Visual Crossing failure: say "Long-range outlook is temporarily unavailable"; do not affect 0-7 day NWS forecast or alerts.

### Live Update Policy

Current/today surfaces:

- Refresh page-level current weather and Weather Windows every 10-15 minutes.
- Refresh NWS alert state every 60 seconds while the page is visible.
- Refresh immediately on `visibilitychange` or focus when cached data is stale.

Tonight surfaces:

- Same as today.
- Tighten visible alert refresh behavior when active alerts exist, while still respecting the NWS 30-second recommendation.

Event-card detail:

- Fetch on popover open if the card weather summary is stale.
- Do not poll every card.

Saved plans:

- Recalculate on page open.
- Recalculate on manual refresh.
- Recalculate on focus if the plan weather snapshot is stale.
- Push notifications are future work, not MVP.

Long-range outlooks:

- Do not poll 8-15 day Visual Crossing data frequently.
- Treat it as daily/planning data, not event-time nowcasting.

### Quota Strategy

Provider calls must happen by weather location and cache window, not by card.

WeatherAPI target:

```txt
6 locations x 96 refreshes/day = 576 calls/day
576 calls/day x 31 days = 17,856 calls/month
```

Visual Crossing target when enabled:

```txt
6 locations x 4 refreshes/day = 24 forecast queries/day
```

The batch endpoint must group occurrences by weather location and provider horizon before fetching snapshots.

### Safety Language

Use:

- Normal
- Heads up
- Plan around it
- Official alert
- Stay indoors

Avoid:

- Claims that an activity is safe during an active warning.
- Claims that a resort activity is canceled unless direct resort cancellation data exists.
- Raw meteorology jargon in primary UI.

### Measurement

Track:

- Weather module impressions.
- Indoor backup CTA clicks.
- Plan changes caused by weather.
- Activity replacements from weather warnings.
- Weather-aware filter usage.
- NWS alert banner views.
- NWS alert detail opens.
- Forecast stale events.
- WeatherAPI quota usage.
- NWS rate-limit errors.
- NWS forecast usage.
- Visual Crossing quota usage.
- Provider route selections by horizon.
- Weather Window impressions.
- Story of the Day chapter clicks.
- Plan Resilience Score views and improvement actions.

Success means guests make better activity decisions, not merely that they see weather data.

## Self-Review

Spec coverage:

- Free provider routing and horizon guardrails: Task 0 and Task 4D.
- Hard cache, partial provider failure, server-only safety, alert expiry, quota modes, timezone parsing, and stampede protection: Task 0B.
- WeatherAPI friendly 0-3 day layer: Tasks 2, 4, 7, 10.
- NWS official alerts and 0-7 day forecast layer: Tasks 4, 4B, 6, 7, 8, 13.
- Visual Crossing free 8-15 day planning layer: Task 4C, Task 7, Task 11, Task 13.
- Custom icon mapping for every condition code: Tasks 2 and 14.
- No weather on past events: Task 5, Task 9, Task 11.
- Dual Fahrenheit/Celsius display: Task 3 and Task 8.
- Dynamic event-card weather and decision copy: Tasks 5, 7, 8, 9, 10.
- Weather Windows, Story of the Day, Storm Mode, Plan Resilience, resort weather personality, Forecast Compare, and route-weather readiness: Task 6B, Task 8, Task 10, Task 11, Task 12.
- Plan weather snapshots and material-change prompts: Task 11, Task 11B, and Task 13.
- SEO guardrails and no standalone weather pages: Task 12.
- Repo integration points: File Structure and Tasks 9-12.

Placeholder scan:

- No task depends on unspecified file names.
- Every test command includes expected output.
- Every new module has a defined responsibility.
- Provider API keys remain server-side.

Type consistency:

- `WeatherLocationKey`, `WeatherIconKey`, `WeatherHour`, `WeatherDay`, `WeatherSnapshot`, `WeatherAttribution`, `WeatherAlert`, `WeatherRisk`, `ForecastConfidence`, `WeatherProviderId`, `WeatherWindow`, `StormModeState`, `PlanResilienceScore`, and `WeatherForTimeSpan` are introduced once in `lib/weather/types.ts`.
- UI components consume `WeatherForTimeSpan` and not provider payloads.
- Activity weather profile tags are separate from existing `WeatherFit` SEO values, with mapping helpers in `lib/weather/activityProfiles.ts`.
- Provider routing consumes forecast horizon and source policy constants; provider clients do not choose paid providers directly.
- Provider clients are server-only and are accessed through hard-cache wrappers, not UI/page/card imports.
