# Decision-First Browse UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken Tonight route and make Today, Tonight, Activities, Weather, cards, filters, and mobile browse surfaces decision-first while keeping every preset/tag source-backed and truthfully named.

**Architecture:** Add a small planning intelligence layer that normalizes activity facts into conservative, explainable signals. UI components consume those signals for intent presets, decision summaries, compact trust lines, weather guidance, and card hierarchy instead of duplicating heuristics in each page.

**Tech Stack:** Next.js App Router, React 19, TypeScript, existing script-style tests with `tsx`, source-backed JSON/Supabase activity rows, existing weather guidance services.

---

## Research Findings And Product Rules

### Route Health

- `app/tonight/page.tsx` exists and does not directly call `notFound()`.
- Local verification showed `HEAD /today` returning `200`, while `HEAD /tonight` returned `404`.
- `app/activities/tonight/page.tsx` exists and permanently redirects to `/tonight`.
- Many navigation and CTA links point to `/tonight`, including `components/layout/SiteHeader.tsx`, `components/layout/MobileBottomNav.tsx`, home quick links, resort pages, weather CTAs, SEO links, and recovery actions.

### Truth-Sensitive Data Reality

Current usable runtime fields:

- Reservation: `activity.eligibility.reservation?.required`, `activity.enrichment?.reservationRequired`, `activity.enrichment?.reservationRecommended`, `activity.enrichment?.reservationMethod`, `activity.enrichment?.walkUpsAllowed`.
- Age: `activity.eligibility.ages`, `activity.enrichment?.ageMinimum`, source text in `summary`, `claims`, and `externalFacts`.
- Time: `startDateTime`, `endDateTime`, `daypart`, `scheduleText`.
- Weather: `activity.enrichment?.weatherDependency`, `DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG`, `WeatherForTimeSpan`, `weatherDecisionLabel`.
- Place/travel: `resort.slug`, `resort.area`, `location.label`, `exactVenue`, `routeTaxonomy` area/transport clusters.
- Trust: `freshness`, `source`, `fieldProvenance`, `claims`, `externalFacts`, `trustState`.

Important caveat:

- The gold preview has complete enrichment objects, but many source rows are still missing explicit age and reservation facts. In one local count, 225 rows had walkability claims set to `unknown`; only 9 had `age_minimum`, 7 had `reservation_required`, and 111 had `weather_dependency`.
- Runtime mapping in `lib/data/goldActivities.ts` converts snake_case enrichment fields into camelCase. Any new preset layer must consume the runtime `ActivityOccurrence` shape and add tests that prove the mapping remains intact.

### External Official-Source Evidence

Use official Disney pages as model examples for how precise our labels must be:

- Fireworks Cruises: Disney says reservations may be made up to 60 days out, bookings close after noon the prior day, weather can cancel experiences, guests 17 and younger need a paying adult, and guests should allow up to 1 hour 30 minutes for travel. Source: https://disneyworld.disney.go.com/recreation/fireworks-cruises/
- Fort Wilderness Archery: Disney lists guests 7 years and older, a 75-minute session, and a paid price. Source: https://disneyworld.disney.go.com/recreation/fort-wilderness-archery-experience/
- Horseback Riding: Disney lists age 9+, height/weight limits, reservations highly recommended, same-day/walk-ins limited. Source: https://disneyworld.disney.go.com/recreation/campsites-at-fort-wilderness-resort/horse-trail-rides/
- Tri-Circle-D Ranch: Disney distinguishes experiences with advance reservations recommended from pony/wagon rides that are walk-in only. Source: https://disneyworld.disney.go.com/recreation/tri-circle-d-ranch/
- Wagon Rides: Disney says reservations are not accepted, tickets are sold before departure, weather permitting, and guests must climb steps to board. Source: https://disneyworld.disney.go.com/recreation/campsites-at-fort-wilderness-resort/wagon-rides/
- Carriage Rides: Disney says reservations are highly recommended, walk-ins may be limited, weather can cancel, and Fort Wilderness arrivals may require parking plus an internal bus. Source: https://disneyworld.disney.go.com/recreation/fort-wilderness-carriage-rides/
- Pony Rides: Disney says walk-in only, ages 3-9, height/weight constraints, and parent/guardian participation. Source: https://disneyworld.disney.go.com/recreation/campsites-at-fort-wilderness-resort/pony-rides/
- Bike Rentals: Disney says rentals are first-come, first-served and must remain within the resort where rented. Source: https://disneyworld.disney.go.com/recreation/bike-rentals/
- Sangria University: Disney categorizes it as a dining event and shows availability/cancellation behavior in dining reservation materials. Source: https://disneyworld.disney.go.com/dining/coronado-springs-resort/sangria-university/
- Spanish Mosaic Art: Disney publishes explicit time/location/price and cancellation details. Source: https://disneyworld.disney.go.com/events-tours/coronado-springs-resort/spanish-mosaic-art/

### Conservative Preset Rules

Ship these now:

- **At my resort:** Requires `homeResortSlug` and `activity.resort.slug === homeResortSlug`. This is true and high value.
- **Nearby resort area:** Existing `near=my-resort` behavior can stay, but copy must say "same resort area" rather than low walking.
- **After 7 PM:** Replace vague "After dinner" copy. Qualifies when `startDateTime` is in Orlando time at or after `19:00` and before `23:59`, or movie/campfire display time is explicitly in that range.
- **Dinner window:** If used, define as `17:00 <= start < 19:00` Orlando time. Do not imply the guest has eaten dinner.
- **Rain backup:** Requires source-backed `weatherFit` of `indoor` or `covered`, and no high lightning/outdoor dependency. Do not include outdoor movies, campfires, pools, trails, boats, bikes, sports, or rentals unless an explicit covered/indoor venue exists.
- **No booking required:** Requires affirmative evidence: `reservationStatus === "walkup_only"` or `reservationStatus === "not_required_verified"`. Do not infer from absence of reservation data.
- **Reservation needed:** Includes `reservationRequired` and `reservationRecommended`, but label individual cards as "Required" or "Recommended"; do not collapse both into one hidden meaning.
- **Little kids:** Requires explicit source-backed age fit such as age range including preschool/young kids, Disney labels including `Preschoolers` or `Kids`, or source text like ages `2-5`, `3-9`, `5-12`, `all ages` plus a child-oriented category. Do not treat runtime default `all_ages` as enough by itself.
- **Free now / free today:** Requires `price.state === "free"` and a current/later-today availability state.
- **Low transfer:** Use this instead of "low walking." Qualifies same resort, same resort area, or known direct-route clusters. Explain the basis.

Do not ship yet:

- **Low walking:** Current data does not know walking distance from room/building, transit stop, lobby, or venue coordinates. Most resort activities are low-intensity, but that is not the same as low walking. Add this only after venue coordinates or explicit accessibility/walking evidence exist.
- **Low sensory / quiet:** Not enough structured source evidence.
- **Stroller friendly / wheelchair friendly:** Not enough structured source evidence; official pages often include specific boarding constraints that must not be guessed.

---

## File Structure

Create:

- `lib/planning/activityFacts.ts`  
  Normalizes ActivityOccurrence, ActivityOffering, and MovieNightOccurrence into source-backed facts: reservation status, age fit, time bucket, travel fit, weather fit, and confidence.

- `lib/planning/presetDefinitions.ts`  
  Defines conservative preset metadata, URL params, match rules, explanation copy, and visibility rules.

- `lib/planning/decisionSummary.ts`  
  Builds page-level "what to do now" summaries from filtered results, weather, and home resort.

- `components/planning/DecisionSummaryBar.tsx`  
  Renders compact decision actions for Today, Tonight, Activities, Weather, and Resort contexts.

- `components/planning/TrustInline.tsx`  
  Renders compact source/freshness line and opens/links to source details.

- `components/explore/PresetChips.tsx`  
  Replaces generic mood chips with explainable intent chips.

- `scripts/test-planning-facts.ts`  
  Contract tests for reservation, age, time, travel, weather, and confidence classification.

- `scripts/test-preset-definitions.ts`  
  Tests URL params, labels, no-guess rules, and preset counts.

- `scripts/test-route-smoke.ts`  
  HTTP route smoke test for core pages, especially `/tonight`.

- `scripts/test-decision-summary.ts`  
  Tests summary selection order and weather action behavior.

Modify:

- `lib/types/occurrence.ts`  
  Add optional filter fields only if URL-backed filters need them: `preset`, `booking`, `timeWindow`, `travel`.

- `lib/explore/browseParams.ts`  
  Parse and preserve new conservative params.

- `lib/explore/applyBrowseFilters.ts`  
  Apply fact-based presets through `activityFacts.ts`.

- `lib/explore/filterImpact.ts`  
  Count presets through fact-based logic; remove duplicated text heuristics where superseded.

- `components/explore/BrowseFilterShell.tsx`  
  Render `DecisionSummaryBar`, `PresetChips`, and compact trust/result summary.

- `components/explore/FilterRail.tsx` and `components/explore/FilterSheet.tsx`  
  Add preset group and explainers; keep taxonomy filters below.

- `components/events/EventCard.tsx`, `components/events/event-ui.tsx`, `components/activity/DecisionSignals.tsx`  
  Reorder card hierarchy around when/where/fit/weather/cost/booking/save.

- `app/activities/page.tsx`, `app/today/page.tsx`, `app/tonight/page.tsx`, `app/weather/page.tsx`, `app/resorts/[slug]/page.tsx`  
  Use the shared decision summary and compact trust line.

- `components/layout/SiteHeader.tsx`, `components/layout/MobileBottomNav.tsx`, all `/tonight` CTA sources  
  Keep routes consistent after fixing route health.

- `src/styles/polish.css` and possibly `app/globals.css`  
  Add compact mobile browse layout, preset chips, decision summary, trust line, and card hierarchy styles.

- `package.json`  
  Add new scripts to `validate:contracts`.

---

## Task 1: Reproduce And Fix `/tonight` Route Health

**Files:**
- Create: `scripts/test-route-smoke.ts`
- Modify: `package.json`
- Inspect/possibly modify: `app/tonight/page.tsx`, `app/activities/tonight/page.tsx`, `middleware.ts`, `next.config.ts`

- [x] **Step 1: Write the failing route smoke test**

```ts
// scripts/test-route-smoke.ts
import assert from "node:assert/strict";

const baseUrl = process.env.ROUTE_SMOKE_BASE_URL ?? "http://localhost:3000";

const expectedOkRoutes = [
  "/",
  "/activities",
  "/today",
  "/tonight",
  "/weather",
  "/resorts",
] as const;

for (const route of expectedOkRoutes) {
  const response = await fetch(`${baseUrl}${route}`, { method: "HEAD" });
  assert.equal(
    response.status,
    200,
    `${route} should return 200 from ${baseUrl}, got ${response.status}`
  );
}

const legacyTonight = await fetch(`${baseUrl}/activities/tonight`, {
  method: "HEAD",
  redirect: "manual",
});
assert.equal(
  legacyTonight.status,
  308,
  `/activities/tonight should permanently redirect to /tonight, got ${legacyTonight.status}`
);
assert.equal(
  legacyTonight.headers.get("location"),
  "/tonight",
  `/activities/tonight should redirect to /tonight`
);

console.log("Route smoke test passed.");
```

- [x] **Step 2: Run it against the current dev server and verify `/tonight` fails**

Run:

```bash
npm run dev
ROUTE_SMOKE_BASE_URL=http://localhost:3000 npx tsx scripts/test-route-smoke.ts
```

Expected before fix:

```text
AssertionError: /tonight should return 200 from http://localhost:3000, got 404
```

- [x] **Step 3: Inspect route registration**

Run:

```bash
find app -maxdepth 3 -type f -name 'page.tsx' | sort | rg 'tonight|activities'
curl -I http://localhost:3000/tonight
curl -I http://localhost:3000/activities/tonight
```

Expected before fix:

```text
app/activities/tonight/page.tsx
app/tonight/page.tsx
HTTP/1.1 404 Not Found
HTTP/1.1 308 Permanent Redirect
location: /tonight
```

- [x] **Step 4: Fix the smallest actual cause**

Use the smoke test and route inspection to choose one of these concrete fixes:

1. If `app/tonight/page.tsx` is absent from the route manifest after `next build`, remove the duplicate redirect page at `app/activities/tonight/page.tsx` and move the redirect to `middleware.ts`:

```ts
// middleware.ts
if (request.nextUrl.pathname === "/activities/tonight") {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/tonight";
  return NextResponse.redirect(redirectUrl, 308);
}
```

2. If `app/tonight/page.tsx` is present but runtime data throws a not-found fallback, isolate the throwing call by temporarily replacing the page body with a minimal `return <main>Tonight route health</main>;`, then restore data calls one at a time and patch the throwing helper.

3. If `/tonight` only fails in dev after the redirect page compiles, keep `app/tonight/page.tsx` and delete `app/activities/tonight/page.tsx`; implement the middleware redirect above.

- [x] **Step 5: Verify route health**

Run:

```bash
ROUTE_SMOKE_BASE_URL=http://localhost:3000 npx tsx scripts/test-route-smoke.ts
npm run build
```

Expected:

```text
Route smoke test passed.
```

- [x] **Step 6: Add script to package contracts**

Modify `package.json`:

```json
{
  "scripts": {
    "test:routes": "tsx scripts/test-route-smoke.ts"
  }
}
```

Do not add `test:routes` to `validate:contracts` until it can start or target a known running server in CI. If CI has no server, add a separate route manifest test instead.

- [ ] **Step 7: Commit**

```bash
git add app middleware.ts scripts/test-route-smoke.ts package.json
git commit -m "fix: restore tonight route"
```

---

## Task 2: Add Source-Backed Planning Facts

**Files:**
- Create: `lib/planning/activityFacts.ts`
- Create: `scripts/test-planning-facts.ts`
- Modify: `package.json`

- [x] **Step 1: Write fact contract tests**

```ts
// scripts/test-planning-facts.ts
import assert from "node:assert/strict";
import {
  ageFitForActivity,
  bookingStatusForActivity,
  timeWindowForActivity,
  travelFitForActivity,
  weatherFitForActivity,
} from "@/lib/planning/activityFacts";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

function baseActivity(overrides: Partial<ActivityOccurrence>): ActivityOccurrence {
  return {
    id: "a1",
    activitySlug: "test",
    activityCatalogId: "cat1",
    resort: { slug: "poly", name: "Polynesian", tier: "Deluxe", area: "magic_kingdom" },
    title: "Test Activity",
    summary: "",
    category: "arts_crafts",
    section: "Resort Activities",
    daypart: "anytime",
    price: { state: "unknown" },
    location: { label: "Lobby" },
    eligibility: { ages: ["unknown"] },
    freshness: { lastVerified: "2026-06-28T00:00:00.000Z", sourceUrl: "source", badge: "verified" },
    status: "active",
    ...overrides,
  };
}

assert.equal(
  bookingStatusForActivity(baseActivity({
    eligibility: { ages: ["unknown"], reservation: { required: true } },
  })).status,
  "required"
);

assert.equal(
  bookingStatusForActivity(baseActivity({
    enrichment: { reservationRecommended: true },
  })).status,
  "recommended"
);

assert.equal(
  bookingStatusForActivity(baseActivity({
    enrichment: { walkUpsAllowed: true, reservationRequired: false },
    claims: {
      booking: { value: "walkup_only", evidence: [{ text: "Reservations are not accepted." }] },
    },
  })).status,
  "walkup_only"
);

assert.equal(
  bookingStatusForActivity(baseActivity({})).status,
  "unknown",
  "Absence of reservation fields must not become no-booking-required"
);

assert.equal(
  ageFitForActivity(baseActivity({
    enrichment: { ageMinimum: 12 },
    eligibility: { ages: ["12_plus"] },
  })).littleKids,
  false
);

assert.equal(
  ageFitForActivity(baseActivity({
    summary: "This play area is for children ages 2-5 years old.",
    claims: { age: { value: "2-5", evidence: [{ text: "children ages 2-5 years old" }] } },
  })).littleKids,
  true
);

assert.equal(
  timeWindowForActivity(baseActivity({
    startDateTime: "2026-06-28T23:30:00.000Z",
  })).id,
  "after_7_pm"
);

assert.equal(
  travelFitForActivity(baseActivity({ resort: { slug: "poly", name: "Polynesian", tier: "Deluxe", area: "magic_kingdom" } }), {
    homeResortSlug: "poly",
  }).atMyResort,
  true
);

assert.equal(
  weatherFitForActivity(baseActivity({ activitySlug: "movies-under-the-stars", category: "movies_under_stars" })).rainBackup,
  false
);

assert.equal(
  weatherFitForActivity(baseActivity({ activitySlug: "arcades", category: "arcade", enrichment: { weatherDependency: "indoor" } })).rainBackup,
  true
);

console.log("Planning facts contract passed.");
```

- [x] **Step 2: Run test to verify it fails**

```bash
npx tsx scripts/test-planning-facts.ts
```

Expected:

```text
Cannot find module '@/lib/planning/activityFacts'
```

- [x] **Step 3: Implement planning facts**

```ts
// lib/planning/activityFacts.ts
import { toZonedTime } from "date-fns-tz";
import { DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG, isPrimaryRainyDayFit } from "@/lib/seo/fit";
import { areaFilterForResort, resortAreaMatchesOrigin } from "@/lib/explore/routeTaxonomy";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

const ORLANDO_TZ = "America/New_York";

export type BookingStatus =
  | "required"
  | "recommended"
  | "walkup_only"
  | "not_required_verified"
  | "unknown";

export interface BookingFact {
  status: BookingStatus;
  label: string;
  confidence: "verified" | "inferred" | "unknown";
  reason: string;
}

export interface AgeFitFact {
  littleKids: boolean;
  familyFriendly: boolean;
  minAge?: number;
  maxAge?: number;
  confidence: "verified" | "text_match" | "unknown";
  reason: string;
}

export interface TimeWindowFact {
  id: "now" | "dinner_window" | "after_7_pm" | "daytime" | "flexible" | "unknown";
  label: string;
  reason: string;
}

export interface TravelFitFact {
  atMyResort: boolean;
  nearbyResortArea: boolean;
  lowTransfer: boolean;
  reason: string;
}

export interface WeatherFitFact {
  rainBackup: boolean;
  label: string;
  reason: string;
}

function hasEvidence(activity: ActivityOccurrence, key: string): boolean {
  const claim = activity.claims?.[key];
  return Array.isArray(claim?.evidence) && claim.evidence.length > 0;
}

export function bookingStatusForActivity(activity: ActivityOccurrence): BookingFact {
  if (activity.eligibility.reservation?.required || activity.enrichment?.reservationRequired) {
    return {
      status: "required",
      label: "Reservation required",
      confidence: "verified",
      reason: "Source-backed reservation requirement is present.",
    };
  }
  if (activity.enrichment?.reservationRecommended) {
    return {
      status: "recommended",
      label: "Reservation recommended",
      confidence: "verified",
      reason: "Source-backed reservation recommendation is present.",
    };
  }
  if (
    activity.enrichment?.walkUpsAllowed &&
    activity.enrichment.reservationRequired === false &&
    (hasEvidence(activity, "booking") || hasEvidence(activity, "reservation"))
  ) {
    return {
      status: "walkup_only",
      label: "Walk-up only",
      confidence: "verified",
      reason: "Source evidence says walk-ups are allowed and reservations are not required.",
    };
  }
  if (
    activity.enrichment?.reservationRequired === false &&
    (hasEvidence(activity, "booking") || hasEvidence(activity, "reservation"))
  ) {
    return {
      status: "not_required_verified",
      label: "No booking required",
      confidence: "verified",
      reason: "Source evidence says no reservation is required.",
    };
  }
  return {
    status: "unknown",
    label: "Booking unclear",
    confidence: "unknown",
    reason: "No affirmative source-backed booking status is available.",
  };
}

function parseAgeRange(text: string): { min?: number; max?: number } {
  const range = text.match(/\bages?\s+(\d{1,2})\s*(?:-|to|–|—)\s*(\d{1,2})\b/i);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const plus = text.match(/\bages?\s+(\d{1,2})\s*(?:and|&)?\s*up\b/i) ?? text.match(/\b(\d{1,2})\s*(?:and|&)?\s*up\b/i);
  if (plus) return { min: Number(plus[1]) };
  return {};
}

export function ageFitForActivity(activity: ActivityOccurrence): AgeFitFact {
  const minAge = activity.enrichment?.ageMinimum;
  if (minAge != null) {
    return {
      littleKids: minAge <= 5,
      familyFriendly: minAge <= 12,
      minAge,
      confidence: "verified",
      reason: `Source-backed minimum age is ${minAge}.`,
    };
  }

  const text = `${activity.summary} ${activity.scheduleText ?? ""}`.toLowerCase();
  const parsed = parseAgeRange(text);
  if (parsed.min != null || parsed.max != null) {
    const littleKids = (parsed.min ?? 0) <= 5 && (parsed.max ?? 99) <= 12;
    return {
      littleKids,
      familyFriendly: (parsed.min ?? 0) <= 12,
      minAge: parsed.min,
      maxAge: parsed.max,
      confidence: "text_match",
      reason: "Source text contains an explicit age range.",
    };
  }

  if (/\ball ages\b|\bguests of all ages\b/.test(text)) {
    return {
      littleKids: ["arts_crafts", "scavenger_hunt", "poolside", "arcade"].includes(activity.category),
      familyFriendly: true,
      confidence: "text_match",
      reason: "Source text says all ages; little-kid fit only applies to child-oriented categories.",
    };
  }

  return {
    littleKids: false,
    familyFriendly: false,
    confidence: "unknown",
    reason: "No explicit source-backed age fit is available.",
  };
}

export function timeWindowForActivity(activity: ActivityOccurrence, now = new Date()): TimeWindowFact {
  if (activity.isHappeningNow) {
    return { id: "now", label: "Happening now", reason: "Availability state marks this as happening now." };
  }
  if (!activity.startDateTime) {
    return { id: "flexible", label: "Flexible timing", reason: "No exact start time is available." };
  }
  const zoned = toZonedTime(new Date(activity.startDateTime), ORLANDO_TZ);
  const minutes = zoned.getHours() * 60 + zoned.getMinutes();
  if (minutes >= 19 * 60 && minutes <= 23 * 60 + 59) {
    return { id: "after_7_pm", label: "After 7 PM", reason: "Start time is at or after 7:00 PM Orlando time." };
  }
  if (minutes >= 17 * 60 && minutes < 19 * 60) {
    return { id: "dinner_window", label: "5-7 PM", reason: "Start time falls in the defined dinner window." };
  }
  return { id: "daytime", label: "Daytime", reason: "Start time is before 5:00 PM Orlando time." };
}

export function travelFitForActivity(
  activity: ActivityOccurrence,
  options: { homeResortSlug?: string } = {}
): TravelFitFact {
  const home = options.homeResortSlug;
  const atMyResort = Boolean(home && activity.resort.slug === home);
  const nearbyResortArea = Boolean(home && resortAreaMatchesOrigin(home, activity.resort.slug, activity.resort.area));
  return {
    atMyResort,
    nearbyResortArea,
    lowTransfer: atMyResort || nearbyResortArea,
    reason: atMyResort
      ? "Activity is at the selected home resort."
      : nearbyResortArea
        ? `Activity is in the same resort area (${areaFilterForResort(activity.resort.slug, activity.resort.area) ?? "unknown"}).`
        : "Activity requires leaving the selected resort area or no home resort is set.",
  };
}

export function weatherFitForActivity(activity: ActivityOccurrence): WeatherFitFact {
  const fit = DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG[activity.activitySlug];
  const explicit = activity.enrichment?.weatherDependency;
  const rainBackup =
    explicit === "indoor" ||
    explicit === "covered" ||
    Boolean(fit && isPrimaryRainyDayFit(fit));
  return {
    rainBackup,
    label: rainBackup ? "Rain backup" : "Weather check",
    reason: rainBackup
      ? "Source-backed or curated weather fit is indoor/covered."
      : "No source-backed indoor/covered rain-backup fit is available.",
  };
}
```

- [x] **Step 4: Run the fact tests**

```bash
npx tsx scripts/test-planning-facts.ts
```

Expected:

```text
Planning facts contract passed.
```

- [x] **Step 5: Add package script**

```json
{
  "scripts": {
    "test:planning-facts": "tsx scripts/test-planning-facts.ts"
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/planning/activityFacts.ts scripts/test-planning-facts.ts package.json
git commit -m "feat: add source-backed planning facts"
```

---

## Task 3: Define Conservative Presets And URL Params

**Files:**
- Create: `lib/planning/presetDefinitions.ts`
- Create: `scripts/test-preset-definitions.ts`
- Modify: `lib/types/occurrence.ts`
- Modify: `lib/explore/browseParams.ts`
- Modify: `lib/explore/applyBrowseFilters.ts`
- Modify: `lib/explore/filterImpact.ts`

- [x] **Step 1: Write preset tests**

```ts
// scripts/test-preset-definitions.ts
import assert from "node:assert/strict";
import { INTENT_PRESETS, itemMatchesPreset } from "@/lib/planning/presetDefinitions";
import { parseBrowseParams, preserveBrowseParams } from "@/lib/explore/browseParams";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

function activity(overrides: Partial<ActivityOccurrence>): ActivityOccurrence {
  return {
    id: "a1",
    activitySlug: "arcades",
    activityCatalogId: "cat1",
    resort: { slug: "poly", name: "Polynesian", tier: "Deluxe", area: "magic_kingdom" },
    title: "Arcade",
    summary: "",
    category: "arcade",
    section: "Resort Activities",
    daypart: "afternoon",
    price: { state: "free" },
    location: { label: "Lobby" },
    eligibility: { ages: ["unknown"] },
    freshness: { lastVerified: "2026-06-28T00:00:00.000Z", sourceUrl: "source", badge: "verified" },
    status: "active",
    ...overrides,
  };
}

assert.ok(INTENT_PRESETS.some((preset) => preset.id === "at_my_resort"));
assert.ok(INTENT_PRESETS.some((preset) => preset.label === "After 7 PM"));
assert.ok(!INTENT_PRESETS.some((preset) => preset.label === "After dinner"));
assert.ok(!INTENT_PRESETS.some((preset) => preset.label === "Low walking"));

assert.equal(
  itemMatchesPreset(activity({ resort: { slug: "poly", name: "Polynesian", tier: "Deluxe", area: "magic_kingdom" } }), "at_my_resort", { homeResortSlug: "poly" }),
  true
);
assert.equal(
  itemMatchesPreset(activity({ startDateTime: "2026-06-28T23:30:00.000Z" }), "after_7_pm", {}),
  true
);
assert.equal(
  itemMatchesPreset(activity({ enrichment: { reservationRequired: false } }), "no_booking_required", {}),
  false,
  "No booking required must not match without affirmative evidence"
);
assert.equal(
  itemMatchesPreset(activity({ enrichment: { weatherDependency: "indoor" } }), "rain_backup", {}),
  true
);
assert.equal(
  itemMatchesPreset(activity({ activitySlug: "movies-under-the-stars", category: "movies_under_stars" }), "rain_backup", {}),
  false
);

const parsed = parseBrowseParams(new URLSearchParams("preset=after_7_pm"));
assert.equal(parsed.preset, "after_7_pm");

const preserved = preserveBrowseParams(new URLSearchParams("preset=rain_backup&ignored=yes"));
assert.equal(preserved.toString(), "preset=rain_backup");

console.log("Preset definitions contract passed.");
```

- [x] **Step 2: Run test to verify it fails**

```bash
npx tsx scripts/test-preset-definitions.ts
```

Expected:

```text
Cannot find module '@/lib/planning/presetDefinitions'
```

- [x] **Step 3: Extend filter types**

Modify `lib/types/occurrence.ts`:

```ts
export type ActivityIntentPreset =
  | "at_my_resort"
  | "nearby_resort_area"
  | "after_7_pm"
  | "dinner_window"
  | "rain_backup"
  | "no_booking_required"
  | "reservation_needed"
  | "little_kids"
  | "free_now"
  | "low_transfer";

export interface ActivityFilters {
  resort?: string;
  category?: string;
  daypart?: Daypart;
  near?: ActivityNearFilter;
  weather?: ActivityWeatherFilter;
  transport?: ActivityTransportFilter;
  area?: ActivityAreaFilter;
  free?: boolean;
  reservation?: boolean;
  preset?: ActivityIntentPreset;
  q?: string;
  sort?: ActivitySortKey;
  limit?: number;
}
```

- [x] **Step 4: Implement preset definitions**

```ts
// lib/planning/presetDefinitions.ts
import {
  ageFitForActivity,
  bookingStatusForActivity,
  timeWindowForActivity,
  travelFitForActivity,
  weatherFitForActivity,
} from "@/lib/planning/activityFacts";
import type { ActivityIntentPreset, ActivityOccurrence } from "@/lib/types/occurrence";

export interface PresetContext {
  homeResortSlug?: string;
  now?: Date;
}

export interface IntentPresetDefinition {
  id: ActivityIntentPreset;
  label: string;
  description: string;
  href: string;
  requiresHomeResort?: boolean;
}

export const INTENT_PRESETS: IntentPresetDefinition[] = [
  {
    id: "at_my_resort",
    label: "At my resort",
    description: "Only activities at your selected resort.",
    href: "?preset=at_my_resort",
    requiresHomeResort: true,
  },
  {
    id: "nearby_resort_area",
    label: "Same area",
    description: "Activities in the same resort area, not a walking-distance claim.",
    href: "?preset=nearby_resort_area",
    requiresHomeResort: true,
  },
  {
    id: "after_7_pm",
    label: "After 7 PM",
    description: "Activities starting at or after 7:00 PM Orlando time.",
    href: "?preset=after_7_pm",
  },
  {
    id: "dinner_window",
    label: "5-7 PM",
    description: "Activities starting in the defined 5:00-7:00 PM Orlando window.",
    href: "?preset=dinner_window",
  },
  {
    id: "rain_backup",
    label: "Rain backup",
    description: "Indoor or covered options backed by source or curated weather fit.",
    href: "?preset=rain_backup",
  },
  {
    id: "no_booking_required",
    label: "No booking required",
    description: "Only when source evidence says reservations are not required or walk-up only.",
    href: "?preset=no_booking_required",
  },
  {
    id: "reservation_needed",
    label: "Reservation needed",
    description: "Activities with required or recommended reservations.",
    href: "?preset=reservation_needed",
  },
  {
    id: "little_kids",
    label: "Little kids",
    description: "Only source-backed young-kid fits; no age guessing.",
    href: "?preset=little_kids",
  },
  {
    id: "free_now",
    label: "Free now",
    description: "Free activities happening now or still ahead today.",
    href: "?preset=free_now",
  },
  {
    id: "low_transfer",
    label: "Low transfer",
    description: "Same resort or same resort area; not a walking-distance claim.",
    href: "?preset=low_transfer",
    requiresHomeResort: true,
  },
];

export function itemMatchesPreset(
  activity: ActivityOccurrence,
  preset: ActivityIntentPreset,
  context: PresetContext = {}
): boolean {
  switch (preset) {
    case "at_my_resort":
      return travelFitForActivity(activity, context).atMyResort;
    case "nearby_resort_area":
      return travelFitForActivity(activity, context).nearbyResortArea;
    case "after_7_pm":
      return timeWindowForActivity(activity, context.now).id === "after_7_pm";
    case "dinner_window":
      return timeWindowForActivity(activity, context.now).id === "dinner_window";
    case "rain_backup":
      return weatherFitForActivity(activity).rainBackup;
    case "no_booking_required": {
      const status = bookingStatusForActivity(activity).status;
      return status === "walkup_only" || status === "not_required_verified";
    }
    case "reservation_needed": {
      const status = bookingStatusForActivity(activity).status;
      return status === "required" || status === "recommended";
    }
    case "little_kids":
      return ageFitForActivity(activity).littleKids;
    case "free_now":
      return activity.price.state === "free" && Boolean(activity.isHappeningNow || activity.startDateTime);
    case "low_transfer":
      return travelFitForActivity(activity, context).lowTransfer;
  }
}
```

- [x] **Step 5: Parse and preserve `preset`**

Modify `lib/explore/browseParams.ts` to accept only `INTENT_PRESETS` ids:

```ts
import { INTENT_PRESETS } from "@/lib/planning/presetDefinitions";

const PRESET_IDS = new Set(INTENT_PRESETS.map((preset) => preset.id));

const preset = params.get("preset");
if (preset && PRESET_IDS.has(preset as ActivityIntentPreset)) {
  filters.preset = preset as ActivityIntentPreset;
}

if (filters.preset) params.set("preset", filters.preset);
```

- [x] **Step 6: Apply presets in filtering**

Modify `lib/explore/applyBrowseFilters.ts`:

```ts
import { itemMatchesPreset } from "@/lib/planning/presetDefinitions";

if (filters.preset && !itemMatchesPreset(activity, filters.preset, { homeResortSlug: firstSelectedResort })) {
  return false;
}
```

Use the first selected resort only for home-resort-dependent presets. If no resort anchor exists, home-dependent presets should match nothing and the UI should hide them.

- [x] **Step 7: Count presets in filter impact**

Modify `lib/explore/filterImpact.ts` to add:

```ts
presets: INTENT_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.label,
  count: countWith(items, filters, { preset: preset.id }),
  active: filters.preset === preset.id,
})).filter((option) => option.count > 0 || option.active)
```

- [x] **Step 8: Run tests**

```bash
npx tsx scripts/test-planning-facts.ts
npx tsx scripts/test-preset-definitions.ts
npx tsx scripts/test-filter-impact.ts
```

Expected:

```text
Planning facts contract passed.
Preset definitions contract passed.
Filter impact coverage passed.
```

- [ ] **Step 9: Commit**

```bash
git add lib/types/occurrence.ts lib/planning/presetDefinitions.ts lib/explore/browseParams.ts lib/explore/applyBrowseFilters.ts lib/explore/filterImpact.ts scripts/test-preset-definitions.ts package.json
git commit -m "feat: add truthful intent presets"
```

---

## Task 4: Add Decision Summary And Compact Trust Line

**Files:**
- Create: `lib/planning/decisionSummary.ts`
- Create: `components/planning/DecisionSummaryBar.tsx`
- Create: `components/planning/TrustInline.tsx`
- Create: `scripts/test-decision-summary.ts`
- Modify: `app/activities/page.tsx`
- Modify: `app/today/page.tsx`
- Modify: `app/tonight/page.tsx`
- Modify: `app/weather/page.tsx`
- Modify: `app/resorts/[slug]/page.tsx`

- [x] **Step 1: Write decision summary tests**

```ts
// scripts/test-decision-summary.ts
import assert from "node:assert/strict";
import { buildDecisionSummary } from "@/lib/planning/decisionSummary";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

function activity(id: string, overrides: Partial<ActivityOccurrence>): ActivityOccurrence {
  return {
    id,
    activitySlug: "arcades",
    activityCatalogId: id,
    resort: { slug: "poly", name: "Polynesian", tier: "Deluxe", area: "magic_kingdom" },
    title: id,
    summary: "",
    category: "arcade",
    section: "Resort Activities",
    daypart: "afternoon",
    price: { state: "free" },
    location: { label: "Lobby" },
    eligibility: { ages: ["unknown"] },
    freshness: { lastVerified: "2026-06-28T00:00:00.000Z", sourceUrl: "source", badge: "verified" },
    status: "active",
    ...overrides,
  };
}

const summary = buildDecisionSummary({
  activities: [
    activity("rain", { enrichment: { weatherDependency: "indoor" } }),
    activity("home", { resort: { slug: "poly", name: "Polynesian", tier: "Deluxe", area: "magic_kingdom" } }),
    activity("after7", { startDateTime: "2026-06-28T23:30:00.000Z" }),
  ],
  homeResortSlug: "poly",
  scope: "today",
});

assert.ok(summary.actions.some((action) => action.id === "at_my_resort"));
assert.ok(summary.actions.some((action) => action.id === "rain_backup"));
assert.ok(summary.primaryText.includes("source-backed"));
assert.ok(summary.trustText.includes("verified"));

console.log("Decision summary contract passed.");
```

- [x] **Step 2: Implement summary builder**

```ts
// lib/planning/decisionSummary.ts
import { INTENT_PRESETS, itemMatchesPreset } from "@/lib/planning/presetDefinitions";
import type { ActivityOccurrence, ActivityIntentPreset } from "@/lib/types/occurrence";

export interface DecisionSummaryAction {
  id: ActivityIntentPreset;
  label: string;
  href: string;
  count: number;
}

export interface DecisionSummary {
  primaryText: string;
  trustText: string;
  actions: DecisionSummaryAction[];
}

export function buildDecisionSummary({
  activities,
  homeResortSlug,
  scope,
}: {
  activities: ActivityOccurrence[];
  homeResortSlug?: string;
  scope: "activities" | "today" | "tonight" | "weather" | "resort";
}): DecisionSummary {
  const actionOrder: ActivityIntentPreset[] =
    scope === "tonight"
      ? ["at_my_resort", "after_7_pm", "rain_backup", "no_booking_required"]
      : ["at_my_resort", "rain_backup", "free_now", "little_kids"];

  const actions = actionOrder
    .map((id) => {
      const preset = INTENT_PRESETS.find((item) => item.id === id)!;
      if (preset.requiresHomeResort && !homeResortSlug) return null;
      const count = activities.filter((activity) =>
        itemMatchesPreset(activity, id, { homeResortSlug })
      ).length;
      if (count === 0) return null;
      return { id, label: preset.label, href: `?preset=${id}`, count };
    })
    .filter((value): value is DecisionSummaryAction => Boolean(value));

  return {
    primaryText:
      activities.length > 0
        ? `${activities.length} source-backed options are ready to narrow.`
        : "No source-backed options match this view yet.",
    trustText: "Times and source freshness are verified where shown; confirm before heading out.",
    actions,
  };
}
```

- [x] **Step 3: Implement UI components**

```tsx
// components/planning/DecisionSummaryBar.tsx
import Link from "next/link";
import type { DecisionSummary } from "@/lib/planning/decisionSummary";

export function DecisionSummaryBar({ summary }: { summary: DecisionSummary }) {
  return (
    <section className="decision-summary" aria-label="Planning shortcuts">
      <p className="decision-summary__text">{summary.primaryText}</p>
      {summary.actions.length > 0 && (
        <div className="decision-summary__actions">
          {summary.actions.map((action) => (
            <Link key={action.id} href={action.href} className="decision-summary__chip">
              {action.label}
              <span>{action.count}</span>
            </Link>
          ))}
        </div>
      )}
      <p className="decision-summary__trust">{summary.trustText}</p>
    </section>
  );
}
```

```tsx
// components/planning/TrustInline.tsx
import Link from "next/link";

export function TrustInline({
  lastVerified,
  sourceCount,
  rowCount,
}: {
  lastVerified?: string | null;
  sourceCount: number;
  rowCount: number;
}) {
  return (
    <p className="trust-inline">
      {rowCount} source-backed rows
      {lastVerified ? ` · verified ${lastVerified}` : ""}
      {sourceCount > 0 ? ` · ${sourceCount} official sources` : ""}
      {" · "}
      <Link href="/source-and-accuracy-policy">How we verify</Link>
    </p>
  );
}
```

- [x] **Step 4: Replace repeated source cards with compact line**

On `app/activities/page.tsx`, `app/today/page.tsx`, and `app/tonight/page.tsx`:

- Keep "Quick answer" only if it is short and above controls.
- Replace large source/freshness cards with `TrustInline`.
- Render `DecisionSummaryBar` immediately before `BrowseFilterShell`.

- [x] **Step 5: Run tests**

```bash
npx tsx scripts/test-decision-summary.ts
npx tsx scripts/test-browse-controls-layout.ts
```

Expected:

```text
Decision summary contract passed.
Browse controls layout coverage passed.
```

- [ ] **Step 6: Commit**

```bash
git add lib/planning/decisionSummary.ts components/planning/DecisionSummaryBar.tsx components/planning/TrustInline.tsx app/activities/page.tsx app/today/page.tsx app/tonight/page.tsx app/weather/page.tsx app/resorts/[slug]/page.tsx scripts/test-decision-summary.ts
git commit -m "feat: add decision-first page summaries"
```

---

## Task 5: Replace Mood Chips With Truthful Preset Chips

**Files:**
- Create: `components/explore/PresetChips.tsx`
- Modify: `components/explore/BrowseFilterShell.tsx`
- Modify: `components/explore/FilterRail.tsx`
- Modify: `components/explore/FilterSheet.tsx`
- Modify: `lib/categories/meta.ts`
- Modify: `scripts/test-filter-impact.ts`

- [x] **Step 1: Remove vague mood definitions**

In `lib/categories/meta.ts`, replace:

```ts
{ id: "evening", label: "After dinner", href: "/tonight" }
```

with:

```ts
{ id: "after_7_pm", label: "After 7 PM", href: "/tonight?preset=after_7_pm" }
```

Do not add "Low walking."

- [x] **Step 2: Add preset chips component**

```tsx
// components/explore/PresetChips.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { INTENT_PRESETS } from "@/lib/planning/presetDefinitions";
import { cn } from "@/lib/utils";

export function PresetChips({
  homeResortSlug,
}: {
  homeResortSlug?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePreset = searchParams.get("preset");

  const visible = INTENT_PRESETS.filter(
    (preset) => !preset.requiresHomeResort || Boolean(homeResortSlug)
  );

  return (
    <div className="preset-chips" aria-label="Planning presets">
      {visible.map((preset) => {
        const params = new URLSearchParams(searchParams.toString());
        if (activePreset === preset.id) params.delete("preset");
        else params.set("preset", preset.id);
        const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        return (
          <Link
            key={preset.id}
            href={href}
            className={cn("preset-chip", activePreset === preset.id && "preset-chip--active")}
            title={preset.description}
            aria-current={activePreset === preset.id ? "page" : undefined}
          >
            {preset.label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [x] **Step 3: Render presets in browse shell**

In `components/explore/BrowseFilterShell.tsx`, replace the `MOOD_CHIPS` render block with:

```tsx
<PresetChips homeResortSlug={homeResortSlug} />
```

- [x] **Step 4: Add preset group to rail/sheet**

Add a top `FilterSection` titled `Plan by need` in `FilterRail.tsx` and `FilterSheet.tsx`. Use `INTENT_PRESETS`, hide `requiresHomeResort` options until `homeResortSlug` exists, and show `description` as helper text.

- [x] **Step 5: Run tests**

```bash
npx tsx scripts/test-preset-definitions.ts
npx tsx scripts/test-filter-impact.ts
npx tsx scripts/test-filter-pane-ux.ts
```

Expected existing filter tests to pass and new preset assertions to pass.

- [ ] **Step 6: Commit**

```bash
git add components/explore/PresetChips.tsx components/explore/BrowseFilterShell.tsx components/explore/FilterRail.tsx components/explore/FilterSheet.tsx lib/categories/meta.ts scripts/test-filter-impact.ts
git commit -m "feat: replace mood chips with truthful presets"
```

---

## Task 6: Rework Card Decision Hierarchy

**Files:**
- Modify: `components/events/EventCard.tsx`
- Modify: `components/events/event-ui.tsx`
- Modify: `components/activity/DecisionSignals.tsx`
- Modify: `lib/activityDecision.ts`
- Create: `scripts/test-card-decision-hierarchy.ts`

- [x] **Step 1: Expand decision signals**

In `lib/activityDecision.ts`, add signal ids:

```ts
export interface DecisionSignal {
  id: "time" | "place" | "weather" | "cost" | "booking" | "fit";
  label: string;
  value: string;
  helper: string;
  tone: DecisionTone;
}
```

Add `bookingStatusForActivity`, `ageFitForActivity`, and `weatherFitForActivity` to `activityDecisionProfile`.

- [x] **Step 2: Update card ordering**

In `EventCard`, visual order should be:

1. Media/icon
2. Title
3. Time
4. Resort/location
5. Decision signals: weather, cost, booking, fit
6. Badges/trust
7. Save

Keep source/trust visible but not competing with title/time.

- [x] **Step 3: Write structural test**

```ts
// scripts/test-card-decision-hierarchy.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const eventCard = readFileSync("components/events/EventCard.tsx", "utf8");
const activityDecision = readFileSync("lib/activityDecision.ts", "utf8");

assert.ok(activityDecision.includes('"booking"'), "Decision signals should include booking.");
assert.ok(activityDecision.includes('"weather"'), "Decision signals should include weather.");
assert.ok(activityDecision.includes("bookingStatusForActivity"), "Activity decision profile should use planning facts.");
assert.ok(activityDecision.includes("weatherFitForActivity"), "Activity decision profile should use weather fit facts.");

assert.ok(
  eventCard.indexOf("<EventTitleBlock") < eventCard.indexOf("<DecisionSignals"),
  "Title/time/location should render before decision signals."
);

assert.ok(
  eventCard.indexOf("<DecisionSignals") < eventCard.indexOf("<EventBadgeRow"),
  "Decision signals should render before lower-priority badges."
);

console.log("Card decision hierarchy contract passed.");
```

- [x] **Step 4: Run tests**

```bash
npx tsx scripts/test-card-decision-hierarchy.ts
npx tsx scripts/test-event-card-layout.ts
npx tsx scripts/test-weather-card-integration.ts
```

Expected:

```text
Card decision hierarchy contract passed.
```

- [ ] **Step 5: Commit**

```bash
git add components/events/EventCard.tsx components/events/event-ui.tsx components/activity/DecisionSignals.tsx lib/activityDecision.ts scripts/test-card-decision-hierarchy.ts
git commit -m "feat: make activity cards decision-first"
```

---

## Task 7: Mobile Browse Efficiency

**Files:**
- Modify: `components/atlas/Hero.tsx`
- Modify: `app/activities/page.tsx`
- Modify: `app/today/page.tsx`
- Modify: `components/explore/BrowseFilterShell.tsx`
- Modify: `src/styles/polish.css`
- Create: `scripts/test-mobile-browse-efficiency.ts`

- [x] **Step 1: Add compact browse hero mode**

Modify `components/atlas/Hero.tsx`:

```ts
interface HeroProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children?: React.ReactNode;
  image?: boolean;
  dark?: boolean;
  compactBrowse?: boolean;
}
```

Apply class:

```tsx
className={`relative mb-10 overflow-hidden rounded-3xl border border-[var(--color-card-border)] ${
  compactBrowse ? "browse-hero-compact p-6 md:p-10" : image ? "min-h-[320px] md:min-h-[380px]" : "p-8 md:p-12"
}`}
```

- [x] **Step 2: Use compact mode on browse pages**

In `app/activities/page.tsx`, `app/today/page.tsx`, and `app/tonight/page.tsx`:

```tsx
<Hero title={...} subtitle={...} compactBrowse />
```

- [x] **Step 3: Mobile CSS requirements**

Add to `src/styles/polish.css`:

```css
@media (max-width: 640px) {
  .browse-hero-compact {
    margin-bottom: 1rem;
    padding: 1.5rem;
  }

  .browse-hero-compact h1 {
    font-size: 2rem;
    line-height: 1.05;
  }

  .browse-hero-compact p {
    font-size: 1rem;
  }

  .decision-summary {
    margin-bottom: 0.75rem;
  }

  .browse-controls {
    top: 0;
  }
}
```

- [x] **Step 4: Write mobile structure test**

```ts
// scripts/test-mobile-browse-efficiency.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const hero = readFileSync("components/atlas/Hero.tsx", "utf8");
const activities = readFileSync("app/activities/page.tsx", "utf8");
const today = readFileSync("app/today/page.tsx", "utf8");
const css = readFileSync("src/styles/polish.css", "utf8");

assert.ok(hero.includes("compactBrowse"), "Hero should support compact browse mode.");
assert.ok(activities.includes("compactBrowse"), "Activities should use compact hero.");
assert.ok(today.includes("compactBrowse"), "Today should use compact hero.");
assert.ok(css.includes(".browse-hero-compact"), "Compact browse hero CSS should exist.");
assert.ok(css.includes("@media (max-width: 640px)"), "Mobile-specific compact styles should exist.");

console.log("Mobile browse efficiency contract passed.");
```

- [x] **Step 5: Run tests**

```bash
npx tsx scripts/test-mobile-browse-efficiency.ts
npx tsx scripts/test-browse-controls-layout.ts
npx tsx scripts/test-text-overflow-guards.ts
```

Expected:

```text
Mobile browse efficiency contract passed.
```

- [ ] **Step 6: Visual verify**

Run the app and capture:

```bash
npm run dev
```

Open mobile-width browser or Playwright screenshot for:

- `/activities`
- `/today`
- `/weather`

Acceptance:

- First mobile viewport shows title, one-line context, search/filter controls or decision chips, and the beginning of actionable content.
- Bottom nav does not cover critical controls.
- Source/freshness does not push results below the first two screens.

- [ ] **Step 7: Commit**

```bash
git add components/atlas/Hero.tsx app/activities/page.tsx app/today/page.tsx app/tonight/page.tsx components/explore/BrowseFilterShell.tsx src/styles/polish.css scripts/test-mobile-browse-efficiency.ts
git commit -m "feat: tighten mobile browse entry"
```

---

## Task 8: Weather As Action Guidance

**Files:**
- Modify: `lib/weather/guidance.ts`
- Modify: `components/weather/WeatherStatusStrip.tsx`
- Modify: `components/weather/EventWeatherSignal.tsx`
- Modify: `components/weather/WeatherIconButton.tsx`
- Modify: `components/atlas/TodayClient.tsx`
- Modify: `components/atlas/TonightClient.tsx`
- Create: `scripts/test-weather-action-guidance.ts`

- [x] **Step 1: Define action labels**

Add a small action category to weather guidance output:

```ts
export type WeatherActionGuidance =
  | "good_now"
  | "go_earlier"
  | "choose_covered_backup"
  | "stay_inside"
  | "official_alert";
```

Map:

- official alert -> `official_alert`
- high storm or lightning risk -> `stay_inside`
- high rain risk for outdoor activity -> `choose_covered_backup`
- rising later risk -> `go_earlier`
- low risk -> `good_now`

- [x] **Step 2: Write test**

```ts
// scripts/test-weather-action-guidance.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guidance = readFileSync("lib/weather/guidance.ts", "utf8");
const statusStrip = readFileSync("components/weather/WeatherStatusStrip.tsx", "utf8");
const today = readFileSync("components/atlas/TodayClient.tsx", "utf8");
const tonight = readFileSync("components/atlas/TonightClient.tsx", "utf8");

assert.ok(guidance.includes("WeatherActionGuidance"), "Weather guidance should expose action categories.");
assert.ok(statusStrip.includes("choose_covered_backup") || statusStrip.includes("Covered Options"), "Weather strip should route to covered backups.");
assert.ok(today.includes("WeatherStatusStrip"), "Today should surface weather action guidance.");
assert.ok(tonight.includes("ForecastTimeline"), "Tonight should keep timeline weather guidance.");

console.log("Weather action guidance contract passed.");
```

- [x] **Step 3: Update UI copy**

Use direct labels:

- `Good to go`
- `Go earlier`
- `Pick covered backup`
- `Stay inside`
- `Official alert`

Avoid meteorological jargon in card primary text.

- [x] **Step 4: Run tests**

```bash
npx tsx scripts/test-weather-action-guidance.ts
npm run test:weather:ui
```

Expected:

```text
Weather action guidance contract passed.
```

- [ ] **Step 5: Commit**

```bash
git add lib/weather/guidance.ts components/weather/WeatherStatusStrip.tsx components/weather/EventWeatherSignal.tsx components/weather/WeatherIconButton.tsx components/atlas/TodayClient.tsx components/atlas/TonightClient.tsx scripts/test-weather-action-guidance.ts
git commit -m "feat: make weather guidance action-oriented"
```

---

## Task 9: Validation And Rollout

**Files:**
- Modify: `package.json`
- Modify: `docs/seo-strategy-2026.md` if public copy changes affect SEO language

- [x] **Step 1: Add tests to package scripts**

```json
{
  "scripts": {
    "test:planning-ux": "tsx scripts/test-planning-facts.ts && tsx scripts/test-preset-definitions.ts && tsx scripts/test-decision-summary.ts && tsx scripts/test-card-decision-hierarchy.ts && tsx scripts/test-mobile-browse-efficiency.ts && tsx scripts/test-weather-action-guidance.ts"
  }
}
```

- [x] **Step 2: Run focused validation**

```bash
npm run test:planning-ux
npx tsx scripts/test-filter-impact.ts
npx tsx scripts/test-browse-controls-layout.ts
npx tsx scripts/test-event-card-layout.ts
npm run test:weather:ui
```

Expected:

```text
Planning facts contract passed.
Preset definitions contract passed.
Decision summary contract passed.
Card decision hierarchy contract passed.
Mobile browse efficiency contract passed.
Weather action guidance contract passed.
```

- [ ] **Step 3: Run full validation if time permits**

```bash
npm run validate:contracts
```

Expected: pass. If it fails due unrelated dirty-worktree changes, capture the failure and do not revert user changes.

- [ ] **Step 4: Manual QA**

Check:

- `/tonight` returns 200.
- `/activities/tonight` redirects to `/tonight`.
- `/activities?preset=after_7_pm` shows only activities starting 7 PM or later.
- `/activities?preset=no_booking_required` does not include unknown-booking activities.
- `/activities?preset=little_kids` is sparse if source-backed age data is sparse.
- Mobile `/activities` reaches controls/results quickly.
- Card labels explain required vs recommended reservation.
- Weather cards offer actions, not just conditions.

- [ ] **Step 5: Commit**

```bash
git add package.json docs/seo-strategy-2026.md
git commit -m "test: cover decision-first browse ux"
```

---

## Open Product Questions Before Execution

1. Should "At my resort" require the user to set a home resort in plan state, or should selected `resort=` in filters count as the home-resort anchor?
2. Should "Nearby resort area" remain in first release, or is it too easy for guests to misread as walking distance?
3. Should "No booking required" be shown if it produces very few results, or hidden until enough rows have affirmative booking evidence?
4. Should "Little kids" be renamed "Source-backed kid picks" until age coverage improves?
5. Should detail pages show a visible "why this matched" popover for every preset chip?

## Self-Review

- Spec coverage: Fix plan for item 1 is Task 1. Decision-first summaries are Task 4. Compact trust/source presentation is Task 4. Truthful presets are Tasks 2-5. Card hierarchy is Task 6. Mobile efficiency is Task 7. Weather action guidance is Task 8.
- Placeholder scan: No placeholder instructions remain. The route fix task intentionally branches based on observed cause, with concrete commands and concrete fix choices.
- Type consistency: `ActivityIntentPreset`, `BookingStatus`, and decision summary action ids use the same string ids across tests, facts, presets, and filters.
