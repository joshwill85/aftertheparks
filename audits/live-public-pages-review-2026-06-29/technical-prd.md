# Live Public Pages Technical PRD

Date: 2026-06-30  
Source audit: `audits/live-public-pages-review-2026-06-29/audit.md`  
Product: After the Parks  
Repo basis: current Next.js app in `app/`, `components/`, `lib/`, `scripts/`, `data/processed/`, and `src/styles/`.

## 1. Executive Summary

After the Parks already has the right product direction: current Disney resort activities, today and tonight, with freshness and source trust. The remaining work is to make the public experience feel like a calm planning assistant instead of a visible database.

This PRD converts the live-page audit into implementation-ready requirements. It removes items that are no longer relevant to the current repo state, including deleted editorial routes and other already-handled work. It focuses on the public surfaces that still exist:

- Home: `app/page.tsx`
- Today: `app/today/page.tsx`
- Tonight: `app/tonight/page.tsx`
- Activities and filtered category URLs: `app/activities/page.tsx`
- Activity details: `app/activities/[slug]/page.tsx`
- Resorts index and detail pages: `app/resorts/page.tsx`, `app/resorts/[slug]/page.tsx`
- Plan Ahead calendar: `app/calendar/page.tsx`
- My Plan: `app/plan/page.tsx`, `app/plan/[shareId]/page.tsx`
- Search: `app/search/page.tsx`, `app/api/search/route.ts`, `app/api/search/suggest/route.ts`
- Weather guidance content: `app/weather/page.tsx` and reusable weather labels
- Trust, data quality, search, SEO, and ingest support in `lib/` and `scripts/`

North star:

> A guest can quickly answer what is worth doing now, tonight, or on a future resort day, with enough source confidence and planning judgment to avoid wasted travel.

## 2. Source Audit Triage

### 2.1 Keep And Implement

The following audit themes remain relevant and become requirements in this PRD:

- Remove internal/product-development language from public copy.
- Catch data-quality glitches before they reach public cards or detail pages.
- Make activity cards decision-first: time, place, cost, access, weather fit, and why it is useful.
- Make filters more guest-centered and less database-shaped.
- Make category-filtered Activity URLs speak like focused category pages.
- Clarify source-count scope between Home and Resorts.
- Add resort-card decision judgment, especially whether a resort is worth traveling to.
- Move access, booking, cost, and weather caveats higher on activity detail pages.
- Improve Today and Tonight urgency and repeated confirmation language.
- Make Plan Ahead a date-planning tool, not another broad Activity list.
- Make My Plan the functional center: conflicts, pace, transportation edges, weather swaps, and feasibility checks.
- Make Search grouped, truthful, and recoverable without overpromising natural-language intelligence.
- Keep visual/motion delight subtle, accessible, and subordinate to planning decisions.
- Add pre-publish validation gates for titles, time, OCR, cost, booking, weather fit, access, and location duplication.

### 2.2 Remove From Implementation Scope

The following audit items must not become implementation tasks in this PRD:

- Deleted editorial index, long-article, ranking-page, and editorial-card content.
- Any requirement to recreate deleted editorial route files.
- SEO plans that depend on deleted editorial pages as the primary destination.
- Decorative ideas that cannot be tied to an explicit user task, accessibility contract, or performance budget.

Remaining deleted-route references in SEO/test infrastructure should be handled only as cleanup for the removed public surface, not as product work.

## 3. Product Goals

1. Public copy sounds like a practical Disney-planning friend, not an ingest pipeline.
2. No visibly corrupt or contradictory activity data reaches public UI.
3. Every card helps the guest decide whether to go, save, skip, or confirm.
4. Filters communicate guest needs and result consequences.
5. Calendar and My Plan graduate from lists into planning tools.
6. Search answers "what can I find?" with grouped, useful results and recovery paths.
7. Verification gates prevent regressions in copy, data trust, route removal, accessibility, and visual layout.

## 4. Non-Goals

- Do not build a chatbot or imply concierge-grade natural language understanding unless the search backend supports it.
- Do not create deleted editorial pages or route-centered navigation for removed surfaces.
- Do not display raw source text, source reasoning, reviewer notes, OCR artifacts, or editorial scaffolding in visitor copy.
- Do not infer cost, booking, access, weather fit, age, or transportation claims without source evidence.
- Do not add Disney IP, characters, official marks, castle silhouettes, Disney type, or protected art.
- Do not ship visual flourishes that harm scan speed, motion accessibility, mobile layout, or Core Web Vitals.

## 5. Current Repo Evidence

This PRD is aligned to current code observed on 2026-06-30:

- Home already has improved freshness copy in `app/page.tsx`.
- `app/calendar/page.tsx` exists, server-renders metadata/JSON-LD, and passes data to `CalendarClient`.
- `components/atlas/CalendarClient.tsx` already supports date range, resort, area, category, time, density bands, insights, weather fetch, and save-to-plan.
- `components/atlas/PlanPageClient.tsx` already supports stay details, saved activities, title editing, conflicts, pace, plan story, resort passport, share link, calendar export, delete, undo, and settings.
- `lib/plan/transportConnections.ts` already models transportation connections and can support richer My Plan edge display.
- `lib/displayActivity.ts`, `lib/activityDisplay.ts`, `lib/displayQuality.ts`, and `lib/api/publicActivities.ts` already form a display-safe activity layer.
- `components/events/EventCard.tsx` and `lib/events/mapToEventCard.ts` are the main cross-route card system.
- `components/explore/FilterRail.tsx`, `lib/explore/browseParams.ts`, and `lib/explore/filterImpact.ts` are the Activities filter system.
- `components/atlas/SearchClient.tsx`, `lib/search/*`, and `app/api/search/*` are the search surface.
- Deleted editorial route files are removed in git status, and `scripts/test-no-guides-surface.ts` exists.
- Several legacy SEO/test files still mention deleted route paths and should be cleaned up only to preserve build/test health.

## 6. Priorities

| Priority | Theme | Why |
| --- | --- | --- |
| P0 | Trust blockers and public copy | Broken titles, impossible times, contradictory booking/access text, and internal language directly reduce credibility. |
| P1 | Decision-first cards, filters, Today/Tonight, category pages, search grouping | These are the highest-traffic planning surfaces and determine whether guests can act quickly. |
| P2 | My Plan intelligence and Calendar planning depth | These turn the site from a browser into a planning product. |
| P3 | Delight layer, sharing artifacts, and advanced personalization | Valuable after trust and core workflows are stable. |

## 7. Global Product Requirements

### GPR-01: Visitor-Facing Copy Contract

**Problem:** Public pages still risk exposing internal terms such as "currently tracked", "source-backed", "matching rows", "source text says", "soft planning", or filter taxonomy language.

**Implementation targets:**

- Update `scripts/test-public-copy-audit.ts`.
- Update public copy in:
  - `app/page.tsx`
  - `app/activities/page.tsx`
  - `app/today/page.tsx`
  - `app/tonight/page.tsx`
  - `app/calendar/page.tsx`
  - `app/plan/page.tsx`
  - `app/search/page.tsx`
  - `app/resorts/page.tsx`
  - `app/resorts/[slug]/page.tsx`
  - `app/weather/page.tsx`
  - `components/atlas/ActivityDetailClient.tsx`
  - `components/atlas/SearchClient.tsx`
  - `components/events/EventCard.tsx`
  - `components/explore/FilterRail.tsx`
  - `components/layout/SiteHeader.tsx`
  - `components/layout/SiteFooter.tsx`
  - `components/plan/*`
  - `components/resort/*`
  - `components/weather/*`
  - `lib/planning/*`
  - `lib/seo/faqs.ts`

**Required copy replacements:**

| Internal or weak phrase | Public replacement |
| --- | --- |
| Source-backed | Verified, or omit when context is clear |
| Currently tracked | Currently listed |
| Current matching activities | Current activities |
| Source text says all ages | Listed for all ages |
| Source-backed minimum age is 12 | Ages 12 and up |
| Source-backed reservation requirement is present | Reservation required. Confirm availability before you go. |
| Plan by need | Popular needs |
| Practical | Cost and booking |
| Weather backup | Weather fit |
| Category 1 | Category |
| Soft planning only | Remove |
| Fixed-time activities should not receive exact timing recommendations | Remove |
| Reusable editorial risk log | Remove |
| Thin one-off pages | Remove |
| Activity activity | Activity or the specific category |
| Other activity activities | More activities |
| Outdoor plans OK | Outdoor activities look reasonable right now |
| Clear should be manageable | Outdoor activities are reasonable right now. Keep checking weather. |

**Acceptance criteria:**

- `npm run test:public-copy-audit` passes after removing deleted route files from its file list.
- The test bans the weak phrases above from all public UI files.
- The test requires current public phrases for Home, Today, Tonight, Activities, Calendar, My Plan, Search, Resorts, Weather, Corrections, Source and Accuracy, Privacy, and Terms.
- The test does not require phrases from deleted editorial route files.
- Copy in source/ingest scripts may keep technical terms when they are not rendered publicly.

**Definition of done:**

- No visitor-facing route shows ingest, source reasoning, editorial, or database terminology.
- Banned-copy tests are green.
- Manual spot-check of `/`, `/activities`, `/today`, `/tonight`, `/calendar`, `/plan`, `/search`, `/resorts`, and one activity detail page finds no banned phrases.

### GPR-02: Display-Safe Activity Contract

**Problem:** Activity rows can carry OCR errors, impossible times, contradictory booking copy, or unsupported claims.

**Implementation targets:**

- `lib/activityDisplay.ts`
- `lib/displayActivity.ts`
- `lib/displayQuality.ts`
- `lib/api/publicActivities.ts`
- `lib/events/mapToEventCard.ts`
- `components/atlas/ActivityDetailClient.tsx`
- `scripts/validate-trust.mjs`
- `scripts/test-title-fidelity.ts`
- `scripts/test-card-decision-hierarchy.ts`
- `scripts/test-activity-answer-coverage.ts`
- `scripts/ingest/normalization_v3.py`
- `scripts/ingest/validate_v3.py`
- `scripts/ingest/promote_gold_v3.py`

**Required validators:**

1. **Title/OCR validator**
   - Reject or quarantine titles with letter-spaced words, mixed OCR punctuation, impossible casing, repeated tokens, or known bad strings.
   - Examples to block: `WI! LD Ww ILDERNESS BINGO`, `Wellnessscav Engerhunt`, duplicated movie titles.

2. **Time validator**
   - Reject public exact-time display when end time is before start time.
   - Reject suspicious all-day ranges unless explicitly marked as all-day/anytime.
   - For invalid ranges such as `10:30 AM - 10:15 AM`, public UI must show `Time unclear. Confirm with the resort before planning around this.`

3. **Age validator**
   - Normalize likely OCR `I2` to `12` only when source confidence supports it.
   - Otherwise suppress the age claim and show `Age requirement unclear. Confirm before you go.`

4. **Reservation validator**
   - Do not show `To book, please call` unless a phone number or supported booking method exists.
   - If source text says booking exists but method is missing, show `Reservation unclear. Confirm before you go.`

5. **Cost validator**
   - Free/Paid may display only with source-backed price evidence or an explicit reviewed decision.
   - Unknown cost must display as `Cost unclear`, never as a silent omission on detail pages.

6. **Weather-fit validator**
   - Campfires, outdoor movies, poolside activities, boats, outdoor walks, and outdoor fitness cannot render as indoor.
   - If weather dependency is uncertain, show `Weather fit unclear. Confirm location before you go.`

7. **Access validator**
   - Pool-gated or resort-guest-only activities must show access near the top of card/detail hierarchy.
   - Unknown access must not imply open access.

8. **Location-spacing validator**
   - Reject concatenated labels such as `Kidani VillageatDisney's Animal Kingdom Resort Area`.
   - Deduplicate repeated resort/location text on cards and details.

**Acceptance criteria:**

- Public APIs and pages never render the audit examples as-is.
- Unsafe rows are either corrected with source evidence, downgraded to uncertainty copy, or withheld from public UI.
- Every `DisplayActivity` includes safe labels for title, category, resort, location, time, cost, trust state, and display quality.
- Cards use only `DisplayActivity` or equivalent display-safe mapped props.
- Detail pages expose more uncertainty context than cards, not less.

**Definition of done:**

- `npm run validate:trust -- http://localhost:3000` passes against a local server.
- `npm run validate:contracts` passes.
- `npm run test:card-decision-hierarchy` passes.
- `npm run test:planning-ux` passes.
- Manual spot-check of known bad rows confirms corrected, uncertain, or suppressed output.

### GPR-03: Trust Badge And Caveat Hierarchy

**Problem:** Trust copy is valuable but repetitive or too technical. Important access/booking/weather caveats are sometimes lower than the decision moment.

**Implementation targets:**

- `components/activity/TrustBadge.tsx`
- `components/planning/TrustInline.tsx`
- `components/events/EventCard.tsx`
- `components/events/event-ui.tsx`
- `components/atlas/ActivityDetailClient.tsx`
- `lib/events/mapToEventCard.ts`
- `lib/planning/activityFacts.ts`
- `lib/planning/decisionSummary.ts`

**Requirements:**

- Cards may show at most two visible trust/caveat signals.
- Detail pages must show all material caveats in a structured summary.
- Use labels:
  - `Verified`
  - `Confirm time`
  - `Cost unclear`
  - `Reservation required`
  - `Reservation unclear`
  - `Access may be limited`
  - `Resort guests only`
  - `Outdoor and weather-sensitive`
  - `Indoor or covered`
- Do not show raw source URLs on cards.
- Source links belong on detail pages and source policy pages.

**Acceptance criteria:**

- Cards remain scan-friendly and do not stack repeated confirmation lines.
- Activity detail page summary always includes `When`, `Where`, `Cost`, `Reservation`, `Access`, `Weather`, and `Before you go`.
- Cards and details use the same underlying truth state.

**Definition of done:**

- Card hierarchy test covers badge count and required ordering.
- Activity detail tests cover complete caveat summary.
- Manual mobile and desktop screenshots show no text crowding or repeated caveat spam.

## 8. Page And Workflow Requirements

### HOME-01: Homepage Source Scope And Decision Sections

**Problem:** Home has improved copy, but source counts can feel inconsistent across Home and Resorts if scope is not explicit.

**Implementation targets:**

- `app/page.tsx`
- `lib/seo/activityPage.ts`
- `components/home/HomeHero.tsx`
- `components/atlas/MovieNightCard.tsx`
- `components/atlas/ActivityCollectionView.tsx`
- `lib/events/mapToEventCard.ts`

**Requirements:**

- Home source block must say the scope is sitewide.
- If the count uses only Today and Tonight data, label it as `currently visible Today/Tonight activity rows` instead of sitewide.
- Movie cards on Home use this hierarchy:
  - `Tonight: [Movie Title]`
  - `Outdoor movie at [Resort]`
  - `When`
  - `Where`
  - `Cost`
  - `Before you go`
- Activity cards on Home include a one-line decision reason:
  - `Good indoor backup`
  - `Weather-dependent pool activity`
  - `Hands-on craft activity`
  - `Low-effort evening option`

**Acceptance criteria:**

- The Home source count cannot contradict the Resorts source count without explaining scope.
- Home cards prioritize decisions over long imported descriptions.
- No card repeats the same confirmation sentence in multiple places.

**Definition of done:**

- `npm run test:public-copy-audit` covers Home source and card copy.
- Manual `/` review confirms Home answers: what this is, how current it is, what to do next.

### TODAY-01: Today Urgency And Weather Decision Copy

**Problem:** Today should be a now/next decision surface, not just a list sorted by time.

**Implementation targets:**

- `app/today/page.tsx`
- `components/atlas/TodayClient.tsx`
- `components/events/EventCard.tsx`
- `lib/events/mapToEventCard.ts`
- `lib/weather/guidance.ts`
- `components/weather/EventWeatherSignal.tsx`
- `components/weather/WeatherStatusStrip.tsx`
- `scripts/test-weather-card-decision-copy.ts`
- `scripts/test-weather-action-guidance.ts`

**Requirements:**

- Today cards get one urgency label when applicable:
  - `Starting soon`
  - `Happening now`
  - `Still available`
  - `Already started`
  - `Good backup now`
  - `Too late today`
- Weather copy uses decision labels:
  - Clear/comfortable: `Outdoor activities look reasonable right now`
  - Heat: `Heat may affect outdoor plans`
  - Rain: `Rain may affect the next hour`
  - Storm: `Storm risk: avoid outdoor plans`
- Heat messaging must not say outdoor plans are broadly fine when thresholds indicate high heat risk.
- Today empty state includes recovery:
  - clear filters
  - browse Tonight
  - browse indoor/covered
  - choose a resort

**Acceptance criteria:**

- A guest can tell what is still actionable within five seconds.
- Urgency labels are computed from `startDateTime`, `endDateTime`, current Orlando time, and time certainty.
- Uncertain times do not receive precise urgency labels.

**Definition of done:**

- `npm run test:weather-action-guidance` passes.
- `npm run test:weather-card-decision-copy` passes with updated labels.
- Route smoke test covers `/today`.

### TONIGHT-01: Tonight Low-Effort Evening Decisions

**Problem:** Tonight is one of the clearest product concepts, but repeated confirmation copy and filter labels can make cards heavy.

**Implementation targets:**

- `app/tonight/page.tsx`
- `components/atlas/TonightClient.tsx`
- `components/tonight/*`
- `components/events/EventCard.tsx`
- `lib/events/mapToEventCard.ts`
- `lib/planning/presetDefinitions.ts`

**Requirements:**

- Each Tonight card uses one `Before you go` line.
- Resort-limited activities show `Access may be limited to guests staying at this resort`.
- Outdoor movies show `Outdoor movie; confirm if rain or lightning is nearby`.
- Replace `No booking required` with `No reservation needed` when source evidence supports walk-up/no-booking.
- Tonight filters emphasize:
  - Movies
  - Campfires
  - Evening
  - Indoor or covered
  - Free
  - No reservation needed
  - Near my resort when stay details exist

**Acceptance criteria:**

- Tonight cards are shorter than activity-detail pages and do not repeat caveats.
- Reservation copy never implies no booking when evidence is absent.
- Tonight can be filtered by home resort or current resort if saved in My Plan.

**Definition of done:**

- `npm run test:preset-definitions` covers reservation label behavior.
- Route smoke test covers `/tonight`.
- Manual mobile review confirms cards remain one-column, readable, and saveable.

### ACT-01: Activities Filter System

**Problem:** Activities filters are powerful but can feel like a database UI.

**Implementation targets:**

- `app/activities/page.tsx`
- `components/explore/ExploreLayout.tsx`
- `components/explore/FilterRail.tsx`
- `components/explore/FilterSheet.tsx`
- `components/explore/ResultSummary.tsx`
- `lib/explore/browseParams.ts`
- `lib/explore/filterImpact.ts`
- `lib/planning/presetDefinitions.ts`
- `scripts/test-filter-pane-ux.ts`
- `scripts/test-mobile-browse-efficiency.ts`
- `scripts/test-filter-impact.ts`
- `scripts/test-public-browse-filters.ts`

**Requirements:**

- Primary filters:
  - Resort
  - Time of day
  - Free
  - Indoor or covered
  - Category
  - Good for kids
  - Tonight
- Secondary filters under `More filters`:
  - Reservation required
  - Adults
  - Resort area
  - Getting there
  - Source freshness
- Filter labels:
  - `Helpful filters` becomes `Popular needs` if the list is mostly intent presets.
  - `Cost` becomes `Cost and booking` when reservation appears in the same section.
  - `Reservations` becomes `Reservation required`.
  - `Weather` becomes `Weather fit`.
  - `Getting there` stays as-is.
  - `Category` stays as-is.
- Active summary chip sentence:
  - `Showing 18 activities: Free + Indoor or covered + Tonight`
- Filter groups with zero result impact are hidden unless active.
- Selecting a filter must update URL state, result count, and active summary without layout jumps.

**Acceptance criteria:**

- Mobile uses a bottom sheet with focus management, apply/clear actions, and no covered controls.
- Desktop keeps the rail scannable and avoids long always-open filter walls.
- All selected filters are visible as active state and in the result summary.
- Transportation filters with very high coverage are secondary unless the route context makes them primary.

**Definition of done:**

- `npm run test:mobile-browse-efficiency` passes.
- `npm run test-filter-pane-ux` passes.
- `npm run test-filter-impact` passes.
- Manual check on mobile and desktop confirms no horizontal overflow or hidden filter actions.

### ACT-02: Category-Focused Activity URLs

**Problem:** Filtered category URLs work, but they can still read like the generic Activities page.

**Implementation targets:**

- `app/activities/page.tsx`
- `lib/categories/meta.ts`
- `lib/explore/browseParams.ts`
- `components/explore/ExploreLayout.tsx`
- `components/explore/FilterRail.tsx`
- `scripts/test-public-browse-filters.ts`

**Requirements:**

- When a single category is selected, render category-specific title/subtitle.
- Required category page copy:
  - `category=campfire`: `Disney Resort Campfires`; explain outdoor/weather-sensitive.
  - `category=poolside`: `Disney Resort Poolside Activities`; explain pool access is usually limited to resort guests.
  - `category=arcade` or game equivalent: `Arcades and Games at Disney Resorts`; explain indoor, low-effort backup use.
- If URL category and visual category label differ, the title must explain the grouping.
- Hide the full category selector behind `Change category` when category context is already selected.
- Do not show `Category 1`.

**Acceptance criteria:**

- Metadata title, H1, subtitle, selected chip, and canonical URL agree for category pages.
- Category pages do not expose unrelated category lists before the selected category context.
- Users can clear or change category in one action.

**Definition of done:**

- Public browse filter tests cover `?category=campfire`, `?category=poolside`, and `?category=arcade`.
- Manual check confirms each category page answers what it is and what to confirm before going.

### RESORT-01: Resort Index Decision Cards

**Problem:** Resort cards can become repetitive and need more travel judgment.

**Implementation targets:**

- `app/resorts/page.tsx`
- `components/resort/ResortGrid.tsx`
- `components/resort/ResortCard.tsx`
- `lib/resorts/enrichment.ts`
- `lib/resorts/seoFilters.ts`

**Requirements:**

- Resort index freshness block must label scope as resort calendar coverage.
- Resort cards include:
  - today count
  - tonight count
  - free/low-cost count
  - weather-backup count where available
  - source freshness
  - one `Best for` line that varies by resort area/type
  - travel-worth label
- Travel-worth labels:
  - `Best if staying here`
  - `Worth visiting if nearby`
  - `Worth a dedicated trip`
  - `Not worth crossing property for`
- Travel-worth scoring inputs:
  - activity count
  - uniqueness of activity categories
  - evening availability
  - free/low-cost availability
  - transportation mode difficulty
  - access restrictions
  - weather sensitivity

**Acceptance criteria:**

- Resort cards do not reuse one generic best-for sentence across most resorts.
- Travel-worth label includes a short reason, not only a badge.
- Access-restricted resorts/activities do not receive inflated travel-worth scores.

**Definition of done:**

- Add or update resort-card tests to assert varied best-for copy and travel-worth labels.
- Manual `/resorts` check confirms a guest can choose whether to stay put, nearby-hop, or plan a dedicated resort visit.

### RESORT-02: Resort Detail Structure

**Problem:** Resort detail pages have useful data but can expose system language and bury access restrictions.

**Implementation targets:**

- `app/resorts/[slug]/page.tsx`
- `components/resort/ResortTimeline.tsx`
- `components/resort/ResortCategorySections.tsx`
- `components/resort/ResortEmptyState.tsx`
- `components/events/EventCard.tsx`
- `lib/data/activities.ts`

**Required structure:**

1. Resort name and today/tonight summary
2. What's happening today
3. Best options tonight
4. Free or low-cost options
5. Indoor/weather backups
6. Anytime resort options
7. Transportation and access notes
8. Source freshness
9. Nearby resorts and related activity links

**Copy requirements:**

- Replace `Official Disney recreation offerings that are not tied to a dated calendar time` with:
  - `Anytime resort options`
  - `These are resort activities or amenities that may not have a specific calendar time. Confirm hours, access, and availability before you go.`
- Empty states must avoid `currently tracked`.
- Disney Springs transfer caveat short form:
  - `Do not use Disney Springs as a free resort-transfer hub. Confirm resort access and return transportation before you go.`

**Acceptance criteria:**

- Resort detail pages do not use internal language.
- Access restrictions appear in card summaries when material.
- Empty states give recovery links to Today, Tonight, Activities, and Weather fit filters.

**Definition of done:**

- `npm run test:public-copy-audit` covers resort detail copy.
- Route smoke test covers at least one resort detail page.
- Manual spot-check confirms no repeated caveat blocks overwhelm the top of the page.

### ACTDET-01: Activity Detail Decision Summary

**Problem:** Activity detail pages are where trust matters most, but current patterns can show database phrases or contradictory booking details.

**Implementation targets:**

- `app/activities/[slug]/page.tsx`
- `components/atlas/ActivityDetailClient.tsx`
- `lib/displayActivity.ts`
- `lib/planning/activityFacts.ts`
- `lib/seo/faqs.ts`

**Required anatomy:**

1. `[Activity Name] at [Resort]`
2. One plain-language sentence explaining what it is and who it helps.
3. Summary facts:
   - `When`
   - `Where`
   - `Cost`
   - `Reservation`
   - `Access`
   - `Weather`
4. `Before you go`
5. `What to expect`
6. `Good fit`
7. `What to confirm`
8. `More at this resort`
9. `Source and freshness`

**Specific data behavior:**

- If booking method is incomplete, show:
  - `Booking details are incomplete in the current data. Confirm with the official source before planning around this activity.`
- If exact location is duplicated in title/summary, show it once.
- If weather fit is outdoor, never show indoor language.
- If access is resort-guest-only, show it in the summary facts.

**Acceptance criteria:**

- No detail page renders `is a activity activity`, `Other activity activities`, `Soft planning only`, `currently tracked`, or unsupported booking method copy.
- Detail pages are more explicit than cards about uncertainty.
- Source/freshness exists but does not dominate the top decision block.

**Definition of done:**

- Add focused tests for three audit examples: campfire, yoga, and paid craft/booking-unclear page.
- Manual details review confirms top-of-page summary is complete.

### CAL-01: Plan Ahead Calendar As Date Planning Tool

**Problem:** Calendar should answer what to do on a specific trip day, not repeat the Activities database.

**Implementation targets:**

- `app/calendar/page.tsx`
- `components/atlas/CalendarClient.tsx`
- `lib/calendar/params.ts`
- `lib/calendar/insights.ts`
- `lib/visualizations/calendarDensity.ts`
- `scripts/test-plan-ahead-ux.ts`
- `scripts/test-calendar-density.ts`

**Requirements:**

- Page title remains `Plan Ahead` or becomes `Plan by date`; choose one public label and use it consistently in nav, metadata, H1, and mobile bottom nav.
- Calendar hero/subtitle:
  - `Pick a day of your trip to see resort activities, weather context, and easy backup ideas.`
- Quick controls:
  - Today
  - Tomorrow
  - This weekend
  - Trip dates
  - Choose a date
- Secondary filters:
  - Resort
  - Time of day
  - Free
  - Indoor or covered
  - Category
- Date summary must include:
  - selected date
  - count of listed activities
  - busiest daypart
  - free count
  - leading resort/category when available
  - weather availability state
  - confidence label
- Confidence labels:
  - `Strong schedule coverage`
  - `Some current listings`
  - `Limited current listings`
  - `Weather not available yet`
  - `Schedule details may change`
- Calendar cards have direct actions:
  - `Add to My Plan`
  - `View details`
  - `Find indoor backup`

**Acceptance criteria:**

- `/calendar` returns a valid server-rendered HTML shell with metadata and JSON-LD before hydration.
- Date controls are usable by keyboard and touch.
- Date summaries do not imply weather precision outside the forecast horizon.
- Adding an activity from Calendar saves the same plan item shape as Today/Tonight/Activities.

**Definition of done:**

- `npm run test:plan-ahead-ux` passes.
- `npm run test-calendar-density` passes.
- Route smoke test covers `/calendar`.
- Manual mobile/desktop review confirms the calendar works as a trip-date planner.

### SEARCH-01: Search Grouping, Truthfulness, And Removed-Surface Cleanup

**Problem:** Search copy is clearer than before, but it should not overpromise natural-language search or route users to removed public surfaces.

**Implementation targets:**

- `app/search/page.tsx`
- `components/atlas/SearchClient.tsx`
- `components/search/SearchHitRow.tsx`
- `app/api/search/route.ts`
- `app/api/search/suggest/route.ts`
- `lib/search/documents.ts`
- `lib/search/runSearch.ts`
- `lib/search/schema.ts`
- `lib/search/types.ts`
- `lib/search/score.ts`
- `lib/search/synonyms.ts`
- `scripts/test-search-documents.ts`
- `scripts/test-search-relevance.ts`
- `scripts/test-no-guides-surface.ts`

**Requirements:**

- Search heading: `Search After the Parks`.
- Search description:
  - `Search activities, resorts, movies, categories, and planning pages.`
- Empty state:
  - `Search by what you need`
  - Examples: `campfire tonight`, `Polynesian movie`, `pool games`, `arcade`, `rainy day`, `free activities`.
- Results are grouped when enough hits exist:
  - Activities
  - Resorts
  - Movies
  - Categories
  - Pages
- If a backend hit points to a removed surface, suppress it or redirect to the closest active page.
- No search label may imply true concierge Q&A unless backed by a ranking/parser feature.
- No-result recovery:
  - browse Activities
  - browse Resorts
  - browse Tonight
  - try shorter search

**Acceptance criteria:**

- Search payload contains no public links to removed route paths.
- Suggestions use actual searchable concepts and not stale surfaces.
- Result grouping works with keyboard and screen readers.
- Facets append useful terms without degrading the query into nonsense.

**Definition of done:**

- `npm run test:search` passes.
- `npm run test:no-guides-surface` passes.
- `npm run test:public-copy-audit` passes with updated Search copy.
- Manual searches for `campfire`, `rainy day`, `free`, `Polynesian movie`, and a no-result query all recover gracefully.

### NAV-01: Navigation Consistency

**Problem:** Header/nav labels can drift between pages, especially Calendar vs Plan Ahead.

**Implementation targets:**

- `components/layout/SiteHeader.tsx`
- `components/layout/MobileBottomNav.tsx`
- `components/layout/SiteFooter.tsx`
- `components/atlas/SiteChrome.tsx`
- `app/sitemap.ts`
- `lib/seo/llms.ts`
- `scripts/test-no-guides-surface.ts`
- `scripts/test-route-smoke.ts`

**Requirements:**

- Primary desktop nav order:
  - Today
  - Tonight
  - Plan Ahead
  - Activities
  - Resorts
  - Weather
  - My Plan
  - Search
- Mobile bottom nav order:
  - Today
  - Tonight
  - Plan Ahead
  - Resorts
  - My Plan
- Use `Plan Ahead` everywhere if the route is `/calendar`.
- Do not mix `Calendar` and `Plan Ahead` as separate concepts.
- Removed public surfaces do not appear in header, footer, sitemap, search, or generated crawler docs.

**Acceptance criteria:**

- Navigation labels match across desktop, mobile, footer, sitemap, and metadata.
- Active state is correct on `/calendar`.
- Mobile nav does not cover bottom actions or save controls.

**Definition of done:**

- Route smoke test passes.
- No-guides-surface test passes.
- Manual keyboard navigation through header and mobile nav is successful.

## 9. My Plan Requirements

### PLAN-01: Magic Check Plan Auditor

**Problem:** My Plan currently saves activities and shows conflicts, pace, and story, but it should actively answer whether the plan is realistic.

**Implementation targets:**

- New: `lib/plan/magicCheck.ts`
- New or modify: `components/plan/PlanMagicCheck.tsx`
- Modify:
  - `components/atlas/PlanPageClient.tsx`
  - `components/plan/PlanTimeline.tsx`
  - `components/plan/PlanPaceMeter.tsx`
  - `components/plan/PlanStorySummary.tsx`
  - `components/plan/PlanItem.tsx`
  - `lib/plan/conflicts.ts`
  - `lib/plan/pace.ts`
  - `lib/plan/transportConnections.ts`
  - `lib/plan/useTransportConnections.ts`
  - `lib/weather/resilience.ts`
  - `scripts/test-plan-system.ts`
  - `scripts/test-plan-transport-connections.ts`
  - `scripts/test-plan-pace.ts`

**Magic Check inputs:**

- saved plan items
- start/end times
- same-day overlaps
- gaps between items
- resort changes
- transport connections
- weather risk
- access restrictions
- reservation requirements
- cost uncertainty
- home resort and trip dates

**Magic Check outputs:**

- Score label:
  - `Easy plan`
  - `Doable with checks`
  - `Too tight`
  - `Needs backup`
- Issue list:
  - `Two activities overlap`
  - `This resort hop may be tight`
  - `Outdoor activity may need a backup`
  - `Access may be limited`
  - `Reservation required`
  - `Cost unclear`
- Action buttons:
  - `Find backup`
  - `Swap this`
  - `Remove one`
  - `Add travel buffer`

**Acceptance criteria:**

- Magic Check never invents exact travel times.
- Transport warnings say what is known and what must be confirmed.
- Weather warnings use the existing weather guidance and forecast horizon rules.
- The auditor handles untimed activities by excluding them from overlap math and flagging them as time-uncertain.

**Definition of done:**

- Tests cover overlap, tight gap, cross-resort sequence, outdoor weather risk, reservation required, unknown cost, and access-limited scenarios.
- Manual populated plan shows a clear Magic Check summary above the timeline.

### PLAN-02: Transportation Nodes And Edges

**Problem:** A plan is not realistic unless resort-to-resort movement is visible.

**Implementation targets:**

- `lib/plan/transportConnections.ts`
- `lib/plan/useTransportConnections.ts`
- `components/plan/PlanTimeline.tsx`
- `components/plan/PlanItem.tsx`
- New: `components/plan/PlanTransportEdge.tsx`
- `scripts/test-plan-transport-connections.ts`

**Requirements:**

- Insert visual transport edges between consecutive timed activities on the same date when resort slugs differ.
- Edge content:
  - origin resort
  - destination resort
  - best known mode
  - transfer count when known
  - evidence/disclosure
  - confirm-current-transport note
- Edge labels:
  - `Easy hop`
  - `Transfer likely`
  - `Confirm route`
  - `Return route needed`
  - `Same resort`
- Do not create edges between untimed activities unless the user manually orders them.

**Acceptance criteria:**

- Transportation edges are visible in My Plan timeline and share view when applicable.
- Edge copy uses existing transport disclosure from `lib/plan/transportConnections.ts`.
- Users can still scan activities without transport edges overwhelming the timeline.

**Definition of done:**

- Transport connection tests pass.
- Manual plan with two different resorts shows a transport edge and disclosure.

### PLAN-03: Rain Swap And Backup Finder

**Problem:** Weather-sensitive plans need a fast backup path.

**Implementation targets:**

- New: `lib/plan/swaps.ts`
- New: `components/plan/PlanSwapSuggestions.tsx`
- Modify:
  - `components/atlas/PlanPageClient.tsx`
  - `components/plan/PlanItem.tsx`
  - `lib/data/activities.ts`
  - `lib/explore/applyBrowseFilters.ts`
  - `lib/weather/occurrence.ts`
  - `scripts/test-plan-weather.ts`
  - `scripts/test-plan-resilience.ts`

**Requirements:**

- For outdoor/weather-sensitive plan items, offer backup suggestions:
  - same resort first
  - same time window second
  - indoor or covered first
  - free/low-cost when possible
  - fewer access restrictions preferred
- Button labels:
  - `Find indoor backup`
  - `Swap this`
  - `Save backup`
- Swap action replaces the original item only after confirmation.
- Save backup adds the backup without deleting the original.

**Acceptance criteria:**

- Suggestions never include the same activity as its own backup.
- Suggestions respect current public quality filters.
- Weather not available yet does not trigger urgent rain-copy.

**Definition of done:**

- Plan weather/resilience tests cover backup ranking.
- Manual outdoor plan item displays backup options only when appropriate.

### PLAN-04: Start With My Resort

**Problem:** Guests should not have to repeatedly reselect their resort.

**Implementation targets:**

- `components/plan/PlanStayDetails.tsx`
- `components/home/HomeHero.tsx`
- `components/home/QuickFinder.tsx`
- `components/explore/FilterRail.tsx`
- `components/atlas/TodayClient.tsx`
- `components/atlas/TonightClient.tsx`
- `lib/plan/local-store.ts`
- `components/atlas/PlanProvider.tsx`

**Requirements:**

- Home resort from My Plan becomes available as a first-class filter.
- CTA set when home resort exists:
  - `Today at your resort`
  - `Tonight near your resort`
  - `Indoor backups near your resort`
  - `Worth leaving your resort`
- If no home resort exists, prompt lightly from Home/My Plan without blocking browsing.

**Acceptance criteria:**

- Saved home resort updates filters without full-page data mismatch.
- Clearing home resort removes personal CTAs.
- Personalization works locally before login/sync.

**Definition of done:**

- Planning UX tests cover home-resort filter propagation.
- Manual Home -> Today -> My Plan flow preserves selected home resort.

### PLAN-05: Shareable Resort Day Ticket

**Problem:** Shared plans should be more useful and delightful than a raw list.

**Implementation targets:**

- `app/plan/[shareId]/page.tsx`
- `components/plan/PublicPlanClient.tsx`
- `components/plan/PlanStorySummary.tsx`
- `components/plan/ResortPassport.tsx`
- `lib/plan/snapshot.ts`
- `lib/plan/share.ts`
- `scripts/test-plan-system.ts`

**Requirements:**

- Public share view includes:
  - plan title
  - date/stay context when available
  - timeline grouped by date/daypart
  - Magic Check read-only summary
  - transport disclosures
  - weather caveats
  - source/freshness reminder
- No edit controls on public view.
- Shared view must not expose private auth/session details.

**Acceptance criteria:**

- Share URL remains view-only.
- Public plan is understandable without the owner's local storage.
- Export/share controls are not shown to anonymous viewers unless explicitly supported.

**Definition of done:**

- Plan system tests cover read-only share payload.
- Manual shared plan review on mobile and desktop confirms readable day-ticket format.

## 10. Weather Copy Requirements

### WX-01: Reusable Weather Decision Labels

**Problem:** Weather guidance should be action-based, but this PRD does not re-open already completed visual card contrast work.

**Implementation targets:**

- `lib/weather/guidance.ts`
- `components/weather/WeatherStatusStrip.tsx`
- `components/weather/EventWeatherSignal.tsx`
- `components/weather/WeatherIconButton.tsx`
- `components/weather/ForecastCompare.tsx`
- `scripts/test-weather-action-guidance.ts`
- `scripts/test-weather-card-decision-copy.ts`

**Requirements:**

- Reusable labels:
  - `Good for outdoor plans`
  - `Use indoor backups first`
  - `Heat caution`
  - `Storm risk`
  - `Rain nearby`
  - `Transportation-sensitive weather`
- Replace vague copy:
  - `Clear should be manageable for most resort plans.` becomes `Outdoor activities are reasonable right now. Keep checking for rain, lightning, heat, or wind.`
  - `Rain possible soon` becomes `Rain may affect the next hour.`
  - `Rain looks unlikely in next hour based on forecast guidance, but this is not radar-confirmed.` becomes `Rain looks unlikely in the next hour. This is forecast guidance, not live radar.`

**Acceptance criteria:**

- Weather copy varies by threshold and does not understate heat/storm risk.
- Weather labels are consistent across Today, Tonight, Plan Ahead, My Plan, Weather, and event cards.
- Forecast horizon limits are explicit when weather is unavailable.

**Definition of done:**

- Weather action and card-decision tests pass.
- Manual Weather page review confirms action labels are present and not visually overbearing.

## 11. Visual And Motion Requirements

### VIS-01: Practical Magic Visual System

**Problem:** The site should feel warm and distinctive without letting decoration compete with planning tasks.

**Implementation targets:**

- `src/styles/tokens.css`
- `src/styles/polish.css`
- `components/magic/*`
- `components/events/EventCard.tsx`
- `components/plan/*`
- `components/atlas/CalendarClient.tsx`
- `components/layout/*`

**Requirements:**

- Visual direction: practical planning cards with warmth, atmosphere, and small moments of delight.
- Route mood is allowed but must not reduce readability:
  - Home: bright arrival-day energy
  - Today: clear daylight planning
  - Tonight: evening emphasis
  - My Plan: organized daybook
  - Plan Ahead: date-focused planning
- Decorative details must be:
  - `aria-hidden` unless interactive
  - disabled or simplified under reduced motion
  - never the only indicator of state
  - small enough not to affect Core Web Vitals
- Add-to-plan animation can use the existing save/stamp language but must not block interaction.

**Acceptance criteria:**

- No animation runs continuously near dense text unless it communicates state and respects reduced motion.
- No decorative asset causes text overlap, layout shift, or horizontal scroll.
- Controls use icons where established in the app and keep text labels for clarity.

**Definition of done:**

- Existing visual/UI tests remain green.
- Playwright or manual screenshots cover Home, Activities mobile filter, Calendar, Search, and My Plan.

### VIS-02: After-Dark Emphasis

**Problem:** The audit's after-dark concept is useful only if it helps guests choose evening options.

**Implementation targets:**

- `lib/daypart.ts`
- `components/layout/AppShell.tsx`
- `components/tonight/*`
- `app/page.tsx`
- `app/tonight/page.tsx`

**Requirements:**

- After local sunset or configured evening threshold, Home may emphasize:
  - Tonight
  - movies
  - campfires
  - low-effort return routes
  - indoor backups if weather risk exists
- Do not globally darken all pages in a way that changes reading contrast or page identity.
- Server and client should avoid hydration mismatch by using a stable daypart source.

**Acceptance criteria:**

- The emphasis changes content priority, not just decoration.
- Users can still access Today/Activities/Resorts normally.
- Reduced-motion and no-JS users receive the same content hierarchy through server-rendered sections.

**Definition of done:**

- Daypart tests cover evening threshold behavior.
- Manual Home review before/after threshold confirms useful priority change.

## 12. Data Quality And Release Gates

### DQ-01: Pre-Publish Quality Gate

**Problem:** Trust blockers should fail before deploy, not after a live audit.

**Implementation targets:**

- `scripts/ingest/validate_v3.py`
- `scripts/ingest/normalization_v3.py`
- `scripts/ingest/promote_gold_v3.py`
- `scripts/validate-trust.mjs`
- `scripts/validate-db-trust.mjs`
- `scripts/test-public-copy-audit.ts`
- `scripts/test-title-fidelity.ts`
- `package.json`

**Gate checks:**

- no known OCR title artifacts
- no impossible time ranges
- no unsupported free/paid claims
- no unsupported reservation claims
- no outdoor activities marked indoor
- no pool-gated activity missing access caveat
- no missing booking phone after `call` copy
- no concatenated resort/location labels
- no public banned copy
- no removed public surface links

**Acceptance criteria:**

- Gate fails with actionable error messages that name row ID, title, resort, source, and field.
- Gate distinguishes corrected, quarantined, and publishable rows.
- Gate is deterministic and can run locally without live network unless explicitly in a live audit command.

**Definition of done:**

- Add the gate to an existing aggregate validation script or document when it must run.
- CI/local validation gives a clear failure if an audit example regresses.

### DQ-02: Public Surface Verification Matrix

**Acceptance criteria:**

- Verification covers static typing, copy, removed-surface links, planning UX, search, weather UI/pages, route smoke, data contracts, and live trust checks.
- Manual checks include at least one representative route for each active public surface.
- Any skipped command must include a reason tied to environment availability, not convenience.
- Any failed command must produce either a blocking issue or an explicit product-owner acceptance note.

**Required commands before release:**

```bash
npx tsc --noEmit --pretty false
npm run test:public-copy-audit
npm run test:no-guides-surface
npm run test:planning-ux
npm run test:search
npm run test:weather:ui
npm run test:weather:pages
npm run test:routes
npm run validate:contracts
npm run validate:trust -- http://localhost:3000
```

**Manual checks:**

- `/`
- `/today`
- `/tonight`
- `/activities`
- `/activities?free=true`
- `/activities?category=campfire`
- `/activities?category=poolside`
- `/activities?category=arcade`
- one known campfire detail page
- one paid craft/detail page
- `/resorts`
- one resort detail page
- `/calendar`
- `/plan` empty and populated
- one shared plan URL
- `/search?q=campfire`
- `/search?q=rainy%20day`
- `/weather`

**Definition of done:**

- Commands pass or have documented non-product blockers.
- Manual checks confirm no internal language, no known data glitches, no removed public-surface links, and no mobile layout overlap.

## 13. Implementation Breakdown

### Phase 0: Trust And Copy Stabilization

Deliverables:

- Updated public copy test with deleted route files removed.
- Banned phrase list aligned to this PRD.
- Display/data validators for the known audit examples.
- Activity detail caveat summary.
- No removed public surface links in public nav/search/sitemap.

Exit criteria:

- P0 tests and route smoke pass.
- Known audit data bugs are corrected, uncertain, or suppressed.

### Phase 1: Decision-First Browse

Deliverables:

- Home card/source-scope refinements.
- Today urgency labels.
- Tonight one-line caveats and filter wording.
- Activities primary/secondary filter redesign.
- Category-focused Activity URLs.
- Resort-card travel-worth labels.

Exit criteria:

- A guest can scan Home, Today, Tonight, Activities, and Resorts without interpreting database taxonomy.

### Phase 2: Planning Intelligence

Deliverables:

- Calendar date-planning controls and confidence labels.
- Magic Check plan auditor.
- Transportation edges.
- Rain Swap/backup suggestions.
- Start-with-my-resort personalization.
- Shareable day-ticket plan view.

Exit criteria:

- My Plan can tell a guest when a day is too tight, weather-sensitive, access-limited, or transport-sensitive.

### Phase 3: Delight And Polish

Deliverables:

- Practical magic visual rules applied to selected routes.
- After-dark content emphasis.
- Reduced-motion-safe save and calendar interactions.
- Screenshot verification on mobile and desktop.

Exit criteria:

- Delight improves orientation or feedback without reducing clarity, accessibility, or performance.

## 14. Requirement Traceability

| Audit theme | PRD requirement |
| --- | --- |
| Internal language leaking | GPR-01 |
| OCR/data glitches | GPR-02, DQ-01 |
| Activity detail contradictions | ACTDET-01 |
| Homepage source-count scope | HOME-01 |
| Today weather/urgency | TODAY-01, WX-01 |
| Tonight repeated confirmation | TONIGHT-01 |
| Database-first filters | ACT-01 |
| Category pages too generic | ACT-02 |
| Resort cards repetitive | RESORT-01 |
| Resort details too system-shaped | RESORT-02 |
| Calendar as date planner | CAL-01 |
| My Plan underpowered | PLAN-01 through PLAN-05 |
| Search overpromise/grouping | SEARCH-01 |
| Navigation inconsistency | NAV-01 |
| Motion/visual delight | VIS-01, VIS-02 |
| Pre-publish validation | DQ-01, DQ-02 |

## 15. Open Decisions For Implementation

These are intentionally constrained decisions an implementer can resolve without product ambiguity:

1. **Calendar label:** Use `Plan Ahead` everywhere unless the product owner explicitly prefers `Calendar`. Do not use both as separate nav labels.
2. **Travel-worth scoring weights:** Start with deterministic heuristic weights in `lib/resorts/enrichment.ts`; tune after manual review.
3. **Magic Check score threshold:** Start with rule-based severity counts. A plan with any hard overlap is at least `Too tight`; a plan with weather/access/booking warnings but no overlaps is `Doable with checks` or `Needs backup` depending on severity.
4. **Category URL naming:** If `arcade` covers broader games, public label should be `Arcades and Games`; keep URL stable for SEO/backward compatibility.
5. **Source count scope:** Prefer explicit scope labels over forcing counts to match.
6. **Removed public surface cleanup:** Remove or suppress stale links in public outputs first; deeper SEO research modules can be removed or rewritten later if they block tests.

## 16. Final Definition Of Done

The PRD is implemented when:

- Every P0 and P1 requirement above is complete.
- P2 requirements are either complete or separately accepted as a follow-up milestone.
- No public route exposes the banned internal language.
- Known audit data bugs do not render publicly.
- Cards and detail pages use display-safe data.
- Calendar, Search, Activities, Today, Tonight, Resorts, and My Plan each have route-specific decision behavior.
- Public navigation contains only active product surfaces.
- Required verification commands pass.
- Manual mobile and desktop checks find no text overlap, hidden controls, or incoherent layout.
