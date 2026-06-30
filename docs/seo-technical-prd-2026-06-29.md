# After the Parks SEO Technical PRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build product-led SEO surfaces that make After the Parks the strongest current-intent result for Disney World resort activities today, tonight, resort calendars, movies, campfires, free activities, and no-ticket-friendly decisions.

**Architecture:** Use the existing Next.js App Router routes as canonical product surfaces, add shared server-rendered answer/freshness modules, centralize canonical/noindex decisions, and harden public copy/schema tests so SEO work improves actual guest decision-making instead of creating thin content.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, server-rendered metadata and JSON-LD, existing `lib/seo/*` helpers, `tsx` audit scripts, Playwright where visual verification is needed.

---

**Source input:** `docs/seo-expert-feedback-2026-06-29.md`  
**Status:** Ready for implementation planning  
**Date:** 2026-06-29  
**Owner:** After the Parks  

## Goal

Make After the Parks the best product-led organic result for current Walt Disney World resort activity planning: today, tonight, resort activity calendars, movie schedules, campfires, free and low-cost activities, rainy-day backups, and no-ticket-friendly resort decisions.

This PRD intentionally removes stale work from the consultant feedback:

- The public Guides section has been removed. Do not recreate `/guides`, `/guides/[slug]`, guide hubs, or article-only guide pages.
- Weather UI redesign work is out of scope because the relevant weather experience has already been addressed.
- Do not add keyword-stuffed prose, hidden SEO text, generic blog filler, or pages that exist only because a keyword has volume.

## Product Positioning

After the Parks should rank because it is useful, current, and easier to act on than static Disney planning articles. The positioning is:

> A current, source-aware resort activity planner for Disney World resort days, arrival nights, evening plans, free activities, movies, campfires, and weather-sensitive backups.

The site should not try to become a generic Disney blog. Each SEO surface must help a guest decide what to do, where to go, what to confirm, and what to avoid.

## Current Repo Reality

The current App Router surface includes:

- `app/page.tsx`
- `app/today/page.tsx`
- `app/tonight/page.tsx`
- `app/activities/page.tsx`
- `app/activities/[slug]/page.tsx`
- `app/resorts/page.tsx`
- `app/resorts/[slug]/page.tsx`
- `app/calendar/page.tsx`
- `app/disney-world-resort-activity-calendars/page.tsx`
- `app/disney-world-resort-activity-calendars/[season]/page.tsx`
- `app/weather/page.tsx`
- `app/search/page.tsx`
- `app/source-and-accuracy-policy/page.tsx`

The public Guides route files are deleted in the current worktree:

- `app/guides/page.tsx`
- `app/guides/[slug]/page.tsx`
- `app/guides/first-night-at-the-resort/page.tsx`

The repo already has substantial SEO infrastructure:

- `app/sitemap.ts`
- `app/robots.ts`
- `lib/seo/jsonLd.ts`
- `lib/seo/metadata.ts`
- `lib/seo/routes.ts`
- `lib/seo/pageQualification.ts`
- `lib/seo/comparisonPages.ts`
- `lib/seo/faqs.ts`
- SEO test and audit scripts under `scripts/test-seo-*` and `scripts/audit-seo-*`

Important current mismatch:

- `scripts/test-public-copy-audit.ts` still lists deleted `app/guides/*` files. Implementation must update this audit so it matches the removed public Guides surface.

## Non-Goals

- No public `/guides` route restoration.
- No article hub whose primary value is prose.
- No broad “Disney World tips” content.
- No fake, speculative, or invalid structured data.
- No indexing arbitrary combinations of filters, sorts, dates, search terms, or resort/category/free/weather permutations.
- No hidden text written for crawlers.
- No “SEO paragraph” blocks that repeat keywords without improving guest decisions.
- No new weather UI redesign work.
- No marketing-only outreach, email capture, or backlink campaign implementation in this PRD. Those can be separate growth plans.

## Success Metrics

### Organic Discovery

- Google Search Console impressions and clicks improve for:
  - `disney resort activities today`
  - `disney resort activities tonight`
  - `disney world resort activity calendars`
  - `disney resort movie schedule`
  - `disney movies under the stars schedule`
  - `disney resort campfire schedule`
  - `free disney resort activities`
  - `[resort] activity calendar`
  - `[resort] movie schedule`

### Index Quality

- Sitemap includes only canonical, durable, useful URLs.
- Strategic filtered URLs are self-canonical only when they have distinct search intent and useful content.
- Low-value filtered and search-result URLs are canonicalized or noindexed according to this PRD.
- No deleted `/guides` URLs are linked from navigation, footer, sitemap, search documents, llms files, or public copy.

### Page Quality

- Top entry pages answer the guest's question in the first screen.
- Resort and activity pages include visible freshness/source context.
- No public route exposes internal planning language, malformed snippets, or awkward generated copy.
- Structured data matches visible page content.

### UX Quality

- SEO improvements make scanning and decision-making faster.
- Desktop and mobile layouts remain dense, readable, and product-first.
- No content block exists only to repeat keywords.

## Voice and Copy Standards

Every SEO-facing content block must pass these rules:

- Lead with the guest decision, not the keyword.
- Prefer concise factual language over sales language.
- Use “current,” “tracked,” “verified,” and “confirm” only where the data supports those words.
- Avoid repeating the same query phrase more than naturally needed.
- Avoid robotic constructions such as “X is a Y activity activity.”
- Avoid vague claims such as “best on the internet,” “ultimate,” or “complete” unless the page proves it.
- Do not imply Disney affiliation.
- Do not imply public resort access, parking, pool access, or transportation access when the guest may need a stay, dining/experience reservation, rideshare, or confirmation.
- Do not frame Disney Springs as a free resort-transfer workaround.

Definition of acceptable SEO copy:

> “Tonight at Disney World resorts, use this page to compare currently tracked evening activities, including outdoor movies, campfires, crafts, and low-effort resort plans. Confirm time, location, access, and weather decisions before leaving your resort.”

Definition of unacceptable SEO copy:

> “Disney resort activities tonight are the best Disney resort activities tonight for Disney resort activity tonight planning. Read our ultimate guide to Disney resort activities tonight.”

## Information Architecture Decisions

### Canonical Product Surfaces

| Search Intent | Canonical Destination | Notes |
| --- | --- | --- |
| Current resort activities today | `/today` | Existing route. Strengthen answer block and counts. |
| Current resort activities tonight | `/tonight` | Existing route. Strengthen movie/campfire/evening summaries. |
| Resort activity calendars | `/disney-world-resort-activity-calendars` | Existing route. Treat as primary calendar hub. |
| Activity directory | `/activities` | Existing route. Keep as canonical browse surface. |
| Resort directory | `/resorts` | Existing route. Keep as resort chooser and calendar directory. |
| Specific resort activity calendar | `/resorts/[slug]` | Existing route. Treat as resort landing page. |
| Specific activity type | `/activities/[slug]` | Existing route. Use for movies, campfires, arcades, crafts, etc. |
| Free activities | `/activities?free=true` | Existing strategic filter. Must have useful visible intro/content. |
| Indoor or weather-safer activities | `/activities?weather=indoor`, `/today?weather=indoor`, `/tonight?weather=indoor` | Existing strategic filters. Improve metadata and copy only where it helps users choose. |
| No-ticket-friendly resorts | `/resorts?no_ticket_friendly=true` | Existing strategic filter. Must preserve access caveats. |

### Routes Not Approved By This PRD

- `/guides`
- `/guides/[slug]`
- `/disney-world-no-park-day` as an article page
- `/free-disney-resort-activities` as a duplicate of `/activities?free=true`
- `/disney-world-resort-movie-schedule` as a duplicate of `/activities/movies-under-the-stars`
- `/disney-resort-campfire-schedule` as a duplicate of `/activities/campfire` or the chosen campfire slug

If future clean URLs are desired for marketing or memorability, they must be implemented as redirects or canonical product pages with unique UI value, not duplicate prose pages.

## Implementation Epics

### Epic 1: Remove Stale Guide Surface Assumptions

**Why:** The consultant feedback recommended guide hubs and guide pages, but the public Guides section has been removed. SEO infrastructure must stop treating guides as a public surface.

**Files likely touched:**

- `scripts/test-public-copy-audit.ts`
- `scripts/test-no-guides-surface.ts`
- `lib/seo/routes.ts`
- `lib/seo/pageQualification.ts`
- `lib/seo/comparisonPages.ts`
- `lib/seo/guideDossiers.ts`
- `lib/seo/llms.ts`
- `lib/search/documents.ts`
- `lib/search/runSearch.ts`
- `lib/search/schema.ts`
- `lib/search/types.ts`
- `components/layout/SiteHeader.tsx`
- `components/layout/SiteFooter.tsx`
- `app/sitemap.ts`

**Requirements:**

- [ ] Public code contains no links to `/guides` or `/guides/*`.
- [ ] Search documents do not return deleted guide routes.
- [ ] Sitemap does not include deleted guide URLs.
- [ ] Header and footer do not link to Guides.
- [ ] `scripts/test-public-copy-audit.ts` no longer reads deleted route files.
- [ ] Internal SEO definitions are renamed away from `Guide` terminology where practical, or explicitly documented as non-public planning/landing definitions.
- [ ] Any internal page matrix entry currently pointing to `/guides/*` is changed to an existing product path such as `/today`, `/tonight`, `/activities`, `/resorts`, `/activities?free=true`, or `/resorts?no_ticket_friendly=true`.

**Acceptance Criteria:**

- `npm run test:no-guides-surface` passes.
- `npm run test:public-copy-audit` passes without file-not-found errors.
- The following command returns no public-surface links except the no-guides test itself or historical docs:

```bash
rg '"/guides|`/guides|href="/guides|@/lib/guides' app components lib scripts
```
- Search UI copy does not say “guides” as a searchable entity unless there is a non-route concept intentionally named that way.

**Definition of Done:**

- Deleted guide routes remain deleted.
- No public crawler, sitemap, search, llms, header, footer, or copy audit path suggests the Guides section still exists.

### Epic 2: Canonical and Indexation Policy

**Why:** Faceted URLs are useful for guests but can create duplicate or thin indexed pages.

**Files likely touched:**

- `app/activities/page.tsx`
- `app/today/page.tsx`
- `app/tonight/page.tsx`
- `app/resorts/page.tsx`
- `app/search/page.tsx`
- `app/sitemap.ts`
- `lib/seo/metadata.ts`
- New: `lib/seo/canonicalPolicy.ts`
- Tests: `scripts/test-seo-route-metadata.ts`, `scripts/test-seo-discovery.ts`, `scripts/test-seo-sitemap-status-evidence.ts`

**Canonical rules:**

- Self-canonical:
  - `/`
  - `/today`
  - `/tonight`
  - `/activities`
  - `/resorts`
  - `/calendar`
  - `/disney-world-resort-activity-calendars`
  - `/disney-world-resort-activity-calendars/[season]`
  - `/activities/[slug]`
  - `/resorts/[slug]`
  - Approved strategic single-filter views listed in this PRD.
- Parent-canonical and usually noindex:
  - Multi-filter combinations such as `/activities?free=true&resort=...`
  - Sort-only views.
  - Search-term views.
  - Empty-result filtered views.
  - Date filters outside the current durable schedule window.
  - Low-volume category/resort combinations without unique content.
- Noindex:
  - `/search` result states with query params.
  - Plan/share/private/utility routes unless intentionally public.
  - Preview, gated, or tokenized URLs.

**Requirements:**

- [ ] Create a single canonical policy helper so every route applies the same strategic-filter rules.
- [ ] Add `robots: { index: false, follow: true }` metadata to non-strategic parameter states where appropriate.
- [ ] Keep strategic filter URLs in the sitemap only if they have visible content beyond the generic grid.
- [ ] Exclude arbitrary query combinations from `app/sitemap.ts`.
- [ ] Preserve current access caveats on no-ticket and Disney Springs-adjacent pages.

**Acceptance Criteria:**

- `/activities?free=true` is self-canonical and indexable.
- `/activities?weather=indoor` is self-canonical and indexable.
- `/today?weather=indoor` is self-canonical and indexable.
- `/tonight?weather=indoor` is self-canonical and indexable.
- `/resorts?no_ticket_friendly=true` is self-canonical and indexable.
- `/activities?q=pool&resort=polynesian-village-resort` canonicalizes to `/activities` and is noindexed.
- `/today?ticket_required=false` canonicalizes to `/today`.
- `/tonight?near=my-resort` canonicalizes to `/tonight` until a stable resort context exists.
- Sitemap contains canonical routes and approved strategic filters only.

**Definition of Done:**

- `npm run test:seo` passes for metadata, discovery, sitemap, and hidden-content tests.
- Manual metadata spot checks confirm canonical/noindex behavior for at least five strategic and five non-strategic parameter states.

### Epic 3: Public Copy QA and Programmatic Content Guardrails

**Why:** The highest SEO risk in the feedback is not lack of keywords; it is malformed programmatic language and contradictions.

**Files likely touched:**

- `scripts/test-public-copy-audit.ts`
- New: `scripts/test-seo-content-quality.ts`
- `package.json`
- `components/seo/*`
- `lib/activityDisplay.ts`
- `lib/displayQuality.ts`
- `app/resorts/[slug]/page.tsx`
- `app/activities/[slug]/page.tsx`

**Requirements:**

- [ ] Add a public copy audit that fails on known bad patterns:
  - `activity activity`
  - `a activity`
  - `Fixed-time activities should`
  - `Soft planning only`
  - `Coa:`
  - `Source-backed` in user-facing marketing copy unless it is part of a precise source explanation.
  - Internal labels such as `data pattern`, `severity`, `research dossier`, `kill rule`, `decision filter`, `ranked resorts 0`.
  - Truncated phone/source text.
  - Empty tonight modules when evening rows exist.
  - “No verified tonight listing” on a resort page when `getTonightActivities({ resort })` has visible results.
- [ ] Add a title/H1 alignment audit for primary route pages.
- [ ] Add a contradiction audit for counts and empty states.
- [ ] Add a route smoke audit that renders the top routes and checks for banned copy in HTML.
- [ ] Ensure generated copy uses display helpers rather than raw enum labels where helpers exist.

**Acceptance Criteria:**

- Running the copy audit fails if a fixture contains `Family Activities And Crafts is a activity activity`.
- Running the contradiction audit fails if a resort page says no tonight listing while the server data returns tonight rows for that resort.
- Running the route HTML audit fails if a public page exposes internal QA terminology.
- No user-facing page uses SEO-only phrases that do not help a guest make a decision.

**Definition of Done:**

- `npm run test:public-copy-audit` passes.
- `npm run test:seo` includes the new content-quality audit.
- Copy QA is strict enough to catch the exact examples cited in the expert feedback.

### Epic 4: Shared Answer and Freshness Components

**Why:** The same trust information appears across pages. It should be consistent, compact, and visible without becoming repetitive.

**Files likely touched:**

- New: `components/seo/AnswerBlock.tsx`
- New: `components/seo/FreshnessFacts.tsx`
- New: `components/seo/IntentLinkCluster.tsx`
- Existing: `components/seo/Breadcrumbs.tsx`
- Existing: `components/seo/SeoFaq.tsx`
- `lib/seo/activityPage.ts`
- `app/page.tsx`
- `app/today/page.tsx`
- `app/tonight/page.tsx`
- `app/activities/page.tsx`
- `app/resorts/page.tsx`
- `app/disney-world-resort-activity-calendars/page.tsx`

**Requirements:**

- [ ] `AnswerBlock` renders a concise query answer with:
  - Page-specific heading.
  - One paragraph under 90 words.
  - Primary action link.
  - Optional secondary links.
- [ ] `FreshnessFacts` renders:
  - Last verified date.
  - Current schedule window when available.
  - Activity row count.
  - Official source count.
  - Correction link.
  - Confirm-before-going caveat.
- [ ] `IntentLinkCluster` renders human-readable links to relevant product paths, not SEO phrase farms.
- [ ] Components must be server-rendered where possible.
- [ ] Components must not create nested card layouts.

**Acceptance Criteria:**

- `/today` first screen includes date-aware answer text, result count, and confirmation caveat.
- `/tonight` first screen includes date/time-aware answer text and movie/campfire/evening framing.
- `/activities` first screen includes browse purpose, filters available, and source/freshness context.
- `/resorts` first screen explains resort activity calendars without article-like filler.
- `/disney-world-resort-activity-calendars` includes a compact status/freshness block.

**Definition of Done:**

- The shared components are used by at least four primary pages.
- No answer block repeats the exact same paragraph across multiple pages.
- Mobile screenshots show the answer and primary action without text overflow.

### Epic 5: Today and Tonight Page Upgrades

**Why:** “Today” and “tonight” are the strongest current-intent search opportunities and the most product-native routes.

**Files likely touched:**

- `app/today/page.tsx`
- `app/tonight/page.tsx`
- `components/atlas/TodayClient.tsx`
- `components/atlas/TonightClient.tsx`
- `components/explore/BrowseFilterShell.tsx`
- `lib/tonight/visibleResults.ts`
- `lib/weather/serverGuidance.ts`
- Tests: `scripts/test-weather-today-tonight.ts`, `scripts/test-tonight-visible-result-count.ts`, `scripts/test-seo-route-metadata.ts`

**Requirements for `/today`:**

- [ ] Show current Orlando date.
- [ ] Show total visible activities.
- [ ] Show free count.
- [ ] Show evening count.
- [ ] Show indoor or covered count when available.
- [ ] Include “best bets today” generated from current data with deterministic rules:
  - Prefer activities starting soon.
  - Prefer same-resort or low-friction options when resort filter exists.
  - Prefer free and indoor/covered options as secondary tags, not always top rank.
- [ ] Include tomorrow preview only after today content.
- [ ] Maintain filters for resort, category, cost, weather, time, and transportation where currently supported.

**Requirements for `/tonight`:**

- [ ] Show current Orlando date and evening window.
- [ ] Show activities after 5 PM and after 7 PM when data supports it.
- [ ] Split or tag movies, campfires, and other evening recreation.
- [ ] Include indoor/weather-safer backups using the existing weather UI patterns.
- [ ] Show weather caveat for outdoor movies, campfires, pools, boats, and exposed walking plans.
- [ ] Include “low-effort” language only when the plan is same-resort, direct-route, or otherwise easy to execute.

**Acceptance Criteria:**

- A guest can land on `/today` and answer “what can I still do today?” without opening filters first.
- A guest can land on `/tonight` and answer “what movies, campfires, or easy evening activities are available?” without opening filters first.
- If no results exist, the page suggests useful adjacent paths instead of thin empty content.
- Metadata titles and H1s remain aligned with the page intent.

**Definition of Done:**

- `npm run test:weather:pages`
- `npm run test:seo`
- Manual responsive review at mobile and desktop widths for `/today` and `/tonight`.

### Epic 6: Resort Calendar Hub and Resort Detail Pages

**Why:** Resort-specific searches are high-intent and better suited to After the Parks than generic blogs.

**Files likely touched:**

- `app/disney-world-resort-activity-calendars/page.tsx`
- `app/disney-world-resort-activity-calendars/[season]/page.tsx`
- `app/resorts/page.tsx`
- `app/resorts/[slug]/page.tsx`
- `components/resort/ResortGrid.tsx`
- `components/resort/ResortCard.tsx`
- `components/resort/ResortActivityConstellation.tsx`
- `lib/resorts/enrichment.ts`
- `lib/resorts/seoFilters.ts`
- `lib/seo/faqs.ts`
- Tests: `scripts/test-resort-seo-filters.ts`, `scripts/test-seo-seasonal-calendar-pages.ts`

**Requirements for calendar hub:**

- [ ] 31 resort links are visible and crawlable.
- [ ] Each resort card includes today count, tonight count, activity count, standing offering count, and last verified/source context where available.
- [ ] The page explains what “activity calendar” means in one concise paragraph.
- [ ] Seasonal calendar links remain supportive, not the primary experience.
- [ ] Include links to `/today`, `/tonight`, `/activities?free=true`, `/activities/movies-under-the-stars`, and the chosen campfire activity route if those pages exist.

**Requirements for resort detail pages:**

- [ ] H1 format: `[Resort Name] Activities, Movies & Recreation Calendar`.
- [ ] Opening answer states what is currently tracked for the resort.
- [ ] Today and tonight summaries cannot contradict the underlying data.
- [ ] Free, paid, kid-friendly, adult-friendly, rainy-day, and evening sections use actual row counts or clearly say when data is not available.
- [ ] Transportation notes preserve access caveats.
- [ ] Source/freshness block includes last verified, schedule window, official sources, and correction path.
- [ ] FAQ content is visible if FAQ schema is emitted.

**Acceptance Criteria:**

- Every resort page has unique metadata and a self-canonical URL.
- Resort page sections do not rely on generic repeated intros.
- The empty state is useful and honest when no current row exists.
- Resort pages link to product filters rather than deleted guide routes.

**Definition of Done:**

- `npm run test:seo-route-metadata`
- `npm run test:resort-seo-filters` if script exists independently, otherwise `npm run test:seo`
- Manual spot checks for at least:
  - All-Star Music Resort
  - Riviera Resort
  - Fort Wilderness
  - Polynesian Village Resort
  - Grand Floridian Resort and Spa

### Epic 7: Activity Type Pages for Movies, Campfires, and Free Activities

**Why:** The feedback identifies movie schedule, campfire schedule, and free activities as high-value clusters. This repo should satisfy those through product pages, not duplicate article pages.

**Files likely touched:**

- `app/activities/[slug]/page.tsx`
- `app/activities/page.tsx`
- `lib/seo/routes.ts`
- `lib/seo/faqs.ts`
- `lib/seo/jsonLd.ts`
- `components/atlas/ActivityDetailClient.tsx`
- New or existing activity schedule components under `components/activity/*`
- Tests: `scripts/test-activity-answer-coverage.ts`, `scripts/test-seo-route-metadata.ts`, `scripts/test-seo-schema.ts`

**Approved canonical strategy:**

- Movie schedule intent maps to `/activities/movies-under-the-stars`.
- Campfire schedule intent maps to the canonical campfire activity slug selected in `lib/seo/routes.ts`.
- Free activities intent maps to `/activities?free=true`.

**Requirements for movie activity page:**

- [ ] Current listings by resort.
- [ ] Tonight and this-week views when data supports them.
- [ ] Movie title filter or search affordance if titles are available in data.
- [ ] Weather/cancellation caveat.
- [ ] Nearby backup suggestions from current activity data.
- [ ] FAQ: time, cost, resort access, weather, confirmation.

**Requirements for campfire activity page:**

- [ ] Current campfire listings by resort.
- [ ] Time, location, cost/free state, and source notes where available.
- [ ] Weather/cancellation caveat.
- [ ] S'mores/supplies note only when data supports it.
- [ ] FAQ: free or paid, resorts offering campfires, weather, confirmation.

**Requirements for free activities view:**

- [ ] Visible intro explaining free versus access-limited.
- [ ] Current free count.
- [ ] Today and tonight free shortcuts.
- [ ] Clear note that free activity does not guarantee unrestricted resort access.
- [ ] Filters remain usable and not hidden behind prose.

**Acceptance Criteria:**

- The movie and campfire pages are useful even if there are no current rows, by routing to today/tonight and explaining confirmation.
- No page claims “all resorts” or “complete schedule” unless backed by data.
- No duplicate clean URL is created without canonical and redirect decisions.

**Definition of Done:**

- `npm run test:activity-answer-coverage`
- `npm run test:seo-schema`
- Manual HTML inspection confirms visible FAQ content matches FAQ schema.

### Epic 8: Structured Data Integrity

**Why:** Structured data should clarify real page content, not invent unsupported facts.

**Files likely touched:**

- `lib/seo/jsonLd.ts`
- `app/layout.tsx`
- `app/today/page.tsx`
- `app/tonight/page.tsx`
- `app/activities/page.tsx`
- `app/activities/[slug]/page.tsx`
- `app/resorts/page.tsx`
- `app/resorts/[slug]/page.tsx`
- `app/disney-world-resort-activity-calendars/page.tsx`
- Tests: `scripts/test-seo-schema.ts`, `scripts/test-seo-structured-data-evidence.ts`

**Requirements:**

- [ ] Keep `Organization` and `WebSite` schema at root.
- [ ] Add `BreadcrumbList` to resort and activity detail pages.
- [ ] Add `ItemList` to list pages when the visible page includes corresponding items.
- [ ] Add `FAQPage` only when the FAQ is visible on the page.
- [ ] Add `Event` only for activities with a specific name, start time, location, and status.
- [ ] Do not emit `Event` for generic recurring offerings without a precise occurrence.
- [ ] Use source/freshness facts in structured data only when also visible on-page.
- [ ] Avoid schema that implies After the Parks owns or officially represents Disney resorts.

**Acceptance Criteria:**

- Structured data parser can read every JSON-LD script.
- Event schema is omitted for activities without `startDateTime`.
- FAQ schema count equals visible FAQ count.
- ItemList URLs match canonical page routes.

**Definition of Done:**

- `npm run test:seo-schema`
- `npm run seo:structured-data` after deploy or against local build if configured.

### Epic 9: Internal Linking and Search Graph

**Why:** The site should help users and crawlers move between today, tonight, resorts, activities, calendar, and source policy.

**Files likely touched:**

- `components/layout/SiteHeader.tsx`
- `components/layout/SiteFooter.tsx`
- `app/page.tsx`
- `app/search/page.tsx`
- `components/atlas/SearchClient.tsx`
- `lib/search/documents.ts`
- `lib/search/synonyms.ts`
- `lib/search/types.ts`
- `lib/search/schema.ts`
- `lib/seo/llms.ts`

**Requirements:**

- [ ] Header and footer expose primary product routes:
  - Today
  - Tonight
  - Activities
  - Resorts
  - Calendar
  - Weather
  - Source and accuracy policy
- [ ] Homepage links prominently to today, tonight, activities, resorts, and calendar hub.
- [ ] Search index includes activities, resorts, approved calendar pages, and approved strategic surfaces.
- [ ] Search index excludes deleted guides and rejected thin pages.
- [ ] Search synonyms map common user language to product pages:
  - `movie schedule` -> movies activity page
  - `campfire` -> campfire activity page
  - `free activities` -> `/activities?free=true`
  - `tonight` -> `/tonight`
  - `today` -> `/today`
  - `resort calendar` -> `/disney-world-resort-activity-calendars`

**Acceptance Criteria:**

- Search for `movie schedule` returns the movie activity page or tonight movie results.
- Search for `campfire tonight` returns tonight/campfire-relevant results.
- Search for `guide` does not send users to deleted guide routes.
- llms files do not list removed guide URLs.

**Definition of Done:**

- `npm run test:search`
- `npm run test:no-guides-surface`
- `npm run test:seo`

### Epic 10: Trust, Source, and Correction Experience

**Why:** Trust is the main differentiator against static blogs and copied calendars.

**Files likely touched:**

- `app/source-and-accuracy-policy/page.tsx`
- `app/corrections/page.tsx`
- `app/corrections/CorrectionsClient.tsx`
- `components/planning/TrustInline.tsx`
- `components/seo/FreshnessFacts.tsx`
- `lib/seo/activityPage.ts`
- Optional new data file: `data/content/correction-log.json`

**Requirements:**

- [ ] Source policy explains:
  - Official sources first.
  - What last verified means.
  - What current schedule window means.
  - How conflicting sources are handled.
  - How users report corrections.
  - Why guests should confirm before changing plans.
- [ ] Add a lightweight correction/update log if there is durable data to power it.
- [ ] Correction links appear from major pages.
- [ ] Source facts are phrased as product trust facts, not marketing claims.

**Acceptance Criteria:**

- A user can reach the correction flow from home, calendar hub, resort pages, and activity pages.
- Source policy does not overpromise completeness.
- Correction log entries, if added, include date, scope, and what changed.

**Definition of Done:**

- `npm run test:public-copy-audit`
- `npm run test:seo`
- Manual review of `/source-and-accuracy-policy` and `/corrections`.

### Epic 11: Page Qualification for Future SEO Surfaces

**Why:** The feedback lists many possible pages. The repo must prevent keyword-only pages.

**Files likely touched:**

- `lib/seo/pageQualification.ts`
- `lib/seo/comparisonPages.ts`
- `lib/seo/routes.ts`
- `scripts/test-seo-page-qualification.ts`

**Requirements:**

- [ ] Replace public-facing “guide” assumptions with “planning surface,” “landing page,” or “comparison page.”
- [ ] Every proposed SEO page must have:
  - User intent.
  - Primary user action.
  - After the Parks advantage.
  - Live data dependency.
  - Research sources.
  - Exclusion rules.
  - Deep-link map.
  - Freshness rule.
  - Kill rule.
- [ ] Build decisions must require at least five strong recommendations or current data points.
- [ ] Merge/reject decisions must point to existing product routes, not `/guides/*`.
- [ ] Page qualification tests must include negative examples for over-narrow keyword variants.

**Acceptance Criteria:**

- A proposed “grandparents at night in rain by boat” page is rejected or merged.
- A proposed no-ticket-friendly planning surface cannot pass without transportation/access caveats.
- A proposed rainy-day surface cannot rank outdoor-only activities as default recommendations.
- A proposed Disney Springs-area surface cannot pass if it treats Disney Springs as a free resort-transfer hub.

**Definition of Done:**

- `npm run test-seo-page-qualification` equivalent passes through `npm run test:seo`.
- All build/merge/reject paths are existing product paths.

### Epic 12: Measurement and External Readiness

**Why:** Technical SEO work only matters if deployment, crawlability, sitemap status, and query evidence are monitored.

**Files likely touched:**

- `docs/seo-operations-runbook.md`
- `docs/seo-launch-evidence-2026-06-27.md`
- `docs/seo-cloudflare-ai-crawl-evidence-2026-06-28.jsonl`
- `scripts/audit-seo-routes.ts`
- `scripts/audit-crawler-access.ts`
- `scripts/audit-search-index-evidence.ts`
- `scripts/audit-sitemap-status-evidence.ts`
- `scripts/audit-query-visibility-evidence.ts`

**Requirements:**

- [ ] Run route QA against production after deploy:
  - `SEO_QA_BASE_URL=https://aftertheparks.com npm run seo:qa`
  - `CRAWLER_QA_BASE_URL=https://aftertheparks.com npm run seo:crawlers`
- [ ] Submit and monitor sitemap in Google Search Console and Bing Webmaster Tools.
- [ ] Track query clusters from this PRD.
- [ ] Track excluded duplicate/canonical/noindex pages.
- [ ] Use IndexNow only for changed URLs.
- [ ] Keep AI crawler policy evidence separate from model-training crawler permission.

**Acceptance Criteria:**

- Production canonical routes return public `200` HTML.
- No canonical route is blocked by deployment protection, password gate, robots, or Cloudflare challenge.
- Sitemap status evidence exists for latest production sitemap.
- Query visibility evidence includes the primary clusters from this PRD.

**Definition of Done:**

- `npm run seo:external-readiness`
- `npm run seo:crawlers`
- Evidence docs updated with production results.

## Page-by-Page Requirements

### Homepage: `app/page.tsx`

**Must do:**

- Keep H1/value proposition focused on current resort activities today and tonight.
- Keep source/freshness panel compact.
- Link to Today, Tonight, Activities, Resorts, Calendar, Weather, Source Policy.
- Show useful current examples from data.
- Avoid making the homepage a marketing landing page.

**Acceptance Criteria:**

- First screen says what the site does and gives a path to current activity discovery.
- Source/freshness facts are visible.
- No guide links.

### Today: `app/today/page.tsx`

**Must do:**

- Answer “what can I do today?” immediately.
- Show date, counts, filters, weather-aware notes, and source caveat.
- Preserve speed and scan density.

**Acceptance Criteria:**

- Today page is useful with zero, few, or many activities.
- Strategic indoor filter remains self-canonical.

### Tonight: `app/tonight/page.tsx`

**Must do:**

- Answer “what can I do tonight?” immediately.
- Highlight movies, campfires, and low-effort evening options when data supports them.
- Include outdoor/weather caveats.

**Acceptance Criteria:**

- Results count matches visible activity/movie cards.
- No “easy” claim is made for hard transportation plans.

### Activities Directory: `app/activities/page.tsx`

**Must do:**

- Keep filter UI as the primary experience.
- Add product-useful intros for approved strategic filters.
- Canonicalize/noindex low-value parameter combinations.

**Acceptance Criteria:**

- Strategic filters have distinct metadata and visible context.
- Arbitrary multi-filter views do not become indexable landing pages.

### Resort Directory: `app/resorts/page.tsx`

**Must do:**

- Serve as the resort activity calendar chooser.
- Preserve no-ticket-friendly caveats.
- Show freshness/source summary.

**Acceptance Criteria:**

- Resort cards are crawlable links.
- No-ticket-friendly view does not overpromise public access.

### Resort Detail: `app/resorts/[slug]/page.tsx`

**Must do:**

- Provide resort-specific current schedule, tonight, free, paid, weather, audience, and transportation facts.
- Avoid contradictions.
- Link to product filters.

**Acceptance Criteria:**

- Every section is backed by counts or honest empty-state copy.
- FAQ schema only appears when FAQ content is visible.

### Activity Detail: `app/activities/[slug]/page.tsx`

**Must do:**

- Answer what the activity is, where it is offered, whether it is free/paid, who it fits, next known occurrence, current resorts, source notes, and confirm-before-going caveats.
- Provide enhanced treatment for movies and campfires.

**Acceptance Criteria:**

- Evergreen fallback pages do not pretend to have current schedule rows.
- Activity pages route users to today/tonight/current listings.

### Calendar Hub: `app/disney-world-resort-activity-calendars/page.tsx`

**Must do:**

- Be the strongest canonical page for resort activity calendar intent.
- Show 31 resort links, counts, current status, source policy, and activity paths.

**Acceptance Criteria:**

- No duplicate “calendar hub” page exists elsewhere.
- Seasonal pages support the hub without becoming thin duplicates.

## Rollout Plan

### Phase 1: Guardrails and Current-Surface Cleanup

- [ ] Fix stale guide assumptions in copy tests and SEO page matrices.
- [ ] Add canonical policy helper.
- [ ] Add content quality audit.
- [ ] Update sitemap/search/llms to exclude deleted guide routes.

**Exit criteria:** no-guide tests, copy audit, metadata tests, and SEO tests pass.

### Phase 2: Primary Page Product SEO

- [ ] Add shared answer/freshness/link components.
- [ ] Upgrade `/today`.
- [ ] Upgrade `/tonight`.
- [ ] Upgrade `/activities`.
- [ ] Upgrade `/resorts`.
- [ ] Upgrade calendar hub.

**Exit criteria:** primary routes have answer-first UX, source facts, canonical metadata, and no copy audit failures.

### Phase 3: Resort and Activity Depth

- [ ] Strengthen resort detail pages.
- [ ] Strengthen movie activity page.
- [ ] Strengthen campfire activity page.
- [ ] Strengthen free activities strategic view.
- [ ] Add or refine visible FAQs and schema.

**Exit criteria:** resort/activity pages answer current-intent questions with data-backed sections and pass schema tests.

### Phase 4: Measurement and Production Verification

- [ ] Run production route QA.
- [ ] Run crawler access QA.
- [ ] Submit/monitor sitemap.
- [ ] Update evidence docs.
- [ ] Track primary query clusters.

**Exit criteria:** production pages are crawlable, canonical, and externally monitored.

## Global Definition of Done

- `npm run test:no-guides-surface`
- `npm run test:public-copy-audit`
- `npm run test:search`
- `npm run test:seo`
- `npm run build`
- Production post-deploy:
  - `SEO_QA_BASE_URL=https://aftertheparks.com npm run seo:qa`
  - `CRAWLER_QA_BASE_URL=https://aftertheparks.com npm run seo:crawlers`

The work is not done if:

- Any public route links to `/guides`.
- Any public page includes internal planning/audit language.
- Any page has visible keyword stuffing.
- Any structured data describes content that is not visible.
- Any arbitrary filtered URL is self-canonical without strategic justification.
- Any source/freshness copy overpromises data completeness.
- Any no-ticket or Disney Springs-adjacent content omits access and transportation caveats.

## Implementation Notes for Engineers

- Preserve existing user changes. The worktree currently has many modified files unrelated to this PRD.
- Prefer shared helpers over one-off route-specific metadata logic.
- Keep UI dense and useful. This is an operational planning tool, not a marketing site.
- When creating tests, include the exact bad examples from the expert feedback as fixtures or string assertions.
- When adding content, use data-backed claims first and editorial judgment second.
- When data is missing, say what is missing and route to the best next product path.
- When uncertain whether a page should exist, fail closed: merge, canonicalize, noindex, or defer.
