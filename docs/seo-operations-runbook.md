# After the Parks SEO Operations Runbook

This runbook keeps the 2026 SEO strategy operational after launch. It exists so crawler access, freshness, AI discovery, source changes, and transportation caveats are checked the same way every time.

## Launch Gate

Before a public launch or major deploy, verify public visibility and rendered HTML:

```bash
npm run build
npm run seo:performance-budgets
SEO_QA_BASE_URL=https://aftertheparks.com npm run seo:qa
CRAWLER_QA_BASE_URL=https://aftertheparks.com npm run seo:crawlers
npm run test:seo
```

Required launch evidence:

- Canonical pages return 200.
- Public pages do not render a password prompt or deployment protection page.
- Public pages do not carry `noindex`.
- `/robots.txt`, `/sitemap.xml`, `/llms.txt`, and `/llms-full.txt` return 200.
- HTML pages include title, meta description, canonical, H1, and JSON-LD.
- SEO-critical routes stay under the 320 KB gzip JS budget reported by `npm run seo:performance-budgets`.
- `npm run seo:external-readiness` is recorded so Search Console, Bing, and Cloudflare dashboard credential gaps are explicit before launch is called complete.

## Weekly Crawl Audit

Run crawler QA at least weekly and after any Cloudflare, Vercel, middleware, or robots change:

```bash
CRAWLER_QA_BASE_URL=https://aftertheparks.com npm run seo:crawlers
```

After crawler QA, review exported server, Vercel, or Cloudflare request logs for real crawler fetches:

```bash
npm run seo:server-logs -- path/to/exported-logs.jsonl
```

Use sanitized JSONL with fields such as `timestamp`, `path` or `url`, `status` or `statusCode`, `durationMs` or `responseTimeMs`, and `userAgent` or `ua`. The report should show hits, non-200 responses, slow responses above `SEO_LOG_MAX_LATENCY_MS` (default `1500`), max latency, and routes by crawler.

The crawler audit must include Googlebot, Googlebot-Image, Bingbot, Applebot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-User, Claude-SearchBot, facebookexternalhit, and Twitterbot. Each crawler should see public HTML or text, not challenge pages, password prompts, or accidental `noindex`.

If this fails:

1. Check Cloudflare WAF, bot, firewall, and cache rules for challenges or blocks.
2. Check Vercel deployment protection and preview protection.
3. Re-run `npm run seo:qa` for the affected routes.
4. Export the relevant Vercel or Cloudflare request logs and run `npm run seo:server-logs -- path/to/exported-logs.jsonl`.
5. Fix the blocking rule or route behavior before submitting updated URLs.

## Freshness And IndexNow

Use IndexNow for meaningful changed URLs only:

```bash
npm run seo:indexnow -- /today /tonight /resorts/polynesian-village-resort
```

Submit changed URLs when:

- A resort calendar changes.
- A movie schedule changes.
- A campfire schedule changes.
- A new seasonal guide launches.
- A guide receives a meaningful update.
- A stale page becomes verified.
- An activity is removed, canceled, or materially changed.
- A canonical URL changes.

Do not ping every unchanged URL every day. Use `npm run seo:indexnow` only when the changed URL list is real and bounded.

After submitting the launch or changed-URL set, record Bing Webmaster Tools IndexNow URL status as sanitized JSONL and validate it:

```bash
npm run seo:indexnow-status -- path/to/indexnow-status-evidence.jsonl
```

Each record should include `checkedAt`, `source` as `Bing Webmaster Tools IndexNow`, `url`, `submittedAt`, `submitted`, `accepted`, `processed`, `status`, `httpStatus`, `lastCrawled`, `error`, and `retryAfter`. The audit requires accepted and processed status for the 12 priority launch URLs used by `seo:indexnow`, including `/today`, `/tonight`, the calendar hub, source policy, no-ticket/Disney Springs guides, Movies Under the Stars, and a representative resort page. If a URL is rejected, rate-limited, outside `aftertheparks.com`, or missing from the dashboard export, fix the URL or wait for the retry window before submitting more changed URLs.

## Cloudflare AI Crawl Control

Use Cloudflare AI Crawl Control as the operational view for AI services accessing content. Check it after launch, after crawler QA failures, and during weekly SEO review.

Review:

- Which AI services request After the Parks.
- Which paths they request.
- Whether they receive 200 HTML/text or a blocked/gated response.
- Whether OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Applebot, Bingbot, and Googlebot are allowed to fetch public pages.
- Whether Cloudflare bot/security rules challenge legitimate crawlers.
- Whether training/model-use crawlers are configured separately from search/referral crawlers where the vendor supports that distinction.

If Cloudflare AI Crawl Control or logs show challenge/block events for search or referral crawlers, update Cloudflare rules before pushing IndexNow or Search Console recrawl requests.

Record Cloudflare AI Crawl Control, Cloudflare WAF, or Cloudflare Security Events evidence as sanitized JSONL and validate it:

```bash
npm run seo:cloudflare-ai-crawl -- path/to/cloudflare-ai-crawl-evidence.jsonl
```

Each record should include `checkedAt`, `source`, `crawler` or `userAgent`, `path`, `status`, `action`, and `contentType` when available. The audit requires allowed 200 evidence for OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Applebot, Bingbot, and Googlebot, and it fails any Cloudflare challenge, block, captcha, deny, 401, 403, or 429 result for those search/referral crawlers.

## Search Console And Bing

Check Google Search Console and Bing Webmaster Tools after launch, weekly, and after major calendar/guide updates.

Before a dashboard review, run:

```bash
npm run seo:external-readiness
```

Use this as a sanitized preflight. It reports whether Search Console, Bing Webmaster Tools, and Cloudflare AI Crawl Control credential material is available locally without printing API keys or tokens. For Cloudflare, configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID`; include `CLOUDFLARE_ACCOUNT_ID` when using dashboard/API exports that require account-scoped queries.

When `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN` is available, or when `GOOGLE_APPLICATION_CREDENTIALS` / `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` + `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` are configured for a service account with Search Console access, submit the production sitemap directly through the Search Console API:

```bash
NEXT_PUBLIC_SITE_URL=https://aftertheparks.com npm run seo:google-submit-sitemap
```

The command defaults to `https://aftertheparks.com/sitemap.xml` and the `sc-domain:aftertheparks.com` Search Console property. Set `GOOGLE_SEARCH_CONSOLE_SITE_URL=https://aftertheparks.com/` only if the verified property is URL-prefix rather than domain. Pass another sitemap URL as the first argument only if Google asks for a specific alternate feed. Record the command output or the Search Console sitemap status in launch evidence; the script intentionally prints sanitized status only.

After sitemap submission or a major SEO deploy, inspect the priority URL set through the Search Console URL Inspection API using the same Google credential options:

```bash
NEXT_PUBLIC_SITE_URL=https://aftertheparks.com npm run seo:google-inspect-urls
```

The default priority set covers the homepage, today/tonight, directories, calendar hub, source policy, the no-park/no-ticket/Disney Springs guides, Movies Under the Stars, and a representative resort page. Pass explicit URLs or paths after the command when investigating a specific route. Record the sanitized Markdown table in launch evidence; it should include verdict, coverage state, robots state, indexing state, fetch state, and last crawl time.

Record Google Search Console URL Inspection and Bing Webmaster Tools index status evidence as sanitized JSONL and validate it:

```bash
npm run seo:search-index -- path/to/search-index-evidence.jsonl
```

Each record should include `checkedAt`, `engine`, `path` or `url`, `sitemapSubmitted`, `indexed`, `crawlAllowed`, and `fetchSuccessful`; Google rows may also include `coverageState`, `robotsState`, `indexingState`, and `pageFetchState`. The audit requires passing Google Search Console and Bing Webmaster Tools evidence for the priority launch URL set, including `/today`, `/tonight`, the calendar hub, no-ticket/Disney Springs guides, Movies Under the Stars, and a representative resort page.

Record Google Search Console and Bing Webmaster Tools query visibility as sanitized JSONL and validate it:

```bash
npm run seo:query-visibility -- path/to/query-visibility-evidence.jsonl
```

Each record should include `checkedAt`, `engine`, `query`, `canonicalPath`, `pageType`, `intent`, `impressions`, `clicks`, `ctr`, `averagePosition`, `topPageUrl`, `country`, `device`, `searchType`, and `dateRangeDays`. The audit requires fresh Google Search Console and Bing Webmaster Tools evidence for all 50 priority SEO queries, validates metrics, confirms the top page maps to the intended canonical route, and flags low CTR opportunities where a query has meaningful impressions and strong averagePosition but weak click-through. Use this to refine titles, first-screen answers, and internal links without keyword stuffing.

Record Google Search Console and Bing Webmaster Tools sitemap ingestion status as sanitized JSONL and validate it:

```bash
npm run seo:sitemap-status -- path/to/sitemap-status-evidence.jsonl
```

Each record should include `checkedAt`, `engine`, `sitemapUrl`, `submitted`, `processed`, `status`, `discoveredUrls`, `submittedUrls`, `indexedUrls`, `errors`, `warnings`, `lastSubmitted`, and `lastDownloaded`. The audit requires fresh passing evidence from both Google Search Console and Bing Webmaster Tools for `https://aftertheparks.com/sitemap.xml`, at least 60 discovered/submitted URLs, zero sitemap errors, and recent dashboard processing. This proves the sitemap feed itself is being consumed, while the URL Inspection audit proves priority routes are indexable and fetchable.

Record Google Search Console and Bing Webmaster Tools crawl-error status as sanitized JSONL and validate it:

```bash
npm run seo:crawl-errors -- path/to/crawl-error-evidence.jsonl
```

Each record should include `checkedAt`, `engine`, `reportType`, `siteUrl`, `openErrorCount`, `priorityRouteErrorCount`, `affectedUrls`, `errorCategory`, `status`, `validationState`, `sampleUrls`, `lastDetected`, and `recommendedAction`. The audit requires fresh passing evidence from both Google Search Console and Bing Webmaster Tools for `https://aftertheparks.com`, zero open crawl errors, zero priority-route crawl errors, and no open server, robots, noindex, redirect, DNS, timeout, access-denied, soft-404, or fetch-error categories. Keep `sampleUrls` sanitized and limited to After the Parks URLs.

Google Search Console:

- Pages indexed vs. discovered but not indexed.
- Crawl stats and fetch errors.
- Sitemap status.
- Rich result or structured data issues.
- Queries for resort activity calendars, today/tonight intent, no-park-day planning, and activity-specific pages.

Record Rich Results, Search Console enhancement, or schema validator evidence as sanitized JSONL and validate it:

```bash
npm run seo:structured-data -- path/to/structured-data-evidence.jsonl
```

Each record should include `checkedAt`, `source`, `routeGroup`, `representativePath`, `schemaType`, `valid`, `errors`, `warnings`, `warningBlocking`, and `visibleContentMatched`. The audit requires valid evidence for Organization, WebSite, BreadcrumbList, ItemList, Event, Article, FAQPage, and TouristAccommodation across the representative SEO route groups. Warnings are allowed only when they are explicitly non-blocking, and every schema claim must match visible or meaningfully available page content.

Bing Webmaster Tools:

- Sitemap ingestion.
- Crawl errors.
- IndexNow URL status where available.
- Bing AI Performance reporting when available.
- AI visibility Intents, Topics, Citation Share, and Compare, introduced in global preview on June 16, 2026.
- Query and citation patterns for guide pages.

When `BING_WEBMASTER_API_KEY` is available, submit the production sitemap directly through Bing Webmaster Tools SubmitFeed:

```bash
NEXT_PUBLIC_SITE_URL=https://aftertheparks.com npm run seo:bing-submit-sitemap
```

The command defaults to `https://aftertheparks.com/sitemap.xml` and sends `NEXT_PUBLIC_SITE_URL` as the verified Bing site URL. Set `BING_WEBMASTER_SITE_URL=https://aftertheparks.com/` only if Bing's verified site entry requires that exact URL form. Record the sanitized command output or the Bing Webmaster Tools sitemap status in launch evidence.

Use Bing's AI visibility metrics as diagnostic reporting: Intents and Topics reveal where Bing/Copilot groups the site's citations, Citation Share shows the site's share of cited sources for a grounding query, and Compare shows whether visibility is changing over time. Do not treat Citation Share as a standalone ranking score; use it to decide which visible answer blocks, source notes, internal links, and guide sections need refinement.

If a page has impressions but weak CTR, revise visible title/description/answer content. If a page has crawler errors, fix crawl access before editing content.

## Core Web Vitals

Review Core Web Vitals after launch, after major UI changes, and during the weekly SEO review. Use field data when available, and use lab tools only as supporting evidence before enough real-user data exists.

Route-level targets:

- LCP <= 2.5s at the 75th percentile.
- INP <= 200ms at the 75th percentile.
- CLS <= 0.1 at the 75th percentile.
- SEO-critical route JS <= 320 KB gzip in the built app manifest.

After every production build that affects SEO-critical pages, run:

```bash
npm run seo:performance-budgets
```

This local audit reads `.next/app-build-manifest.json` and reports gzip JS for the homepage, today/tonight, resort pages, activity pages, guide pages, calendar hub, and calendar route groups. Treat it as a pre-field-data guard: passing this script does not replace Search Console/Core Web Vitals field data, but failing it blocks launch until route chunks are split, lazy-loaded, or simplified.

When Search Console, CrUX, Vercel, or another real-user monitoring export is available, record it as sanitized JSONL and validate it:

```bash
npm run seo:core-web-vitals -- path/to/core-web-vitals.jsonl
```

Each `core-web-vitals.jsonl` record should include `checkedAt`, `source`, `routeGroup`, `representativePath`, `device`, `percentile`, `lcpMs`, `inpMs`, `cls`, `sampleSize`, and `collectionWindowDays`. Use the 75th percentile for the same route groups tracked by the local bundle budget: homepage/calendar hub, today/tonight, resort pages, activity pages, and guide pages. The audit fails stale evidence, missing route groups, invalid representative paths, low sample sizes, and field metrics above LCP 2500 ms, INP 200 ms, or CLS 0.1.

Track these page groups separately:

- Homepage and calendar hub.
- `/today` and `/tonight`.
- Resort directory and resort detail pages.
- Activity directory and activity detail pages.
- Guide index and guide detail pages.

If a route regresses, check image loading, server-rendered first content, client bundle growth, filters, maps, modals, third-party scripts, and layout shifts before editing SEO copy. Do not ship large guide or comparison modules that make the first useful resort/activity answer slower to render.

## Rank Tracking

Maintain a bounded Rank Tracking list of 50 priority queries. Review it weekly and after major guide, calendar, or activity-page launches.

The list should include:

- Resort activity calendar terms.
- Today/tonight resort activity terms.
- No-park-day and without-park-ticket planning terms.
- Activity-specific terms such as Movies Under the Stars, campfires, arcades, crafts, community halls, and poolside activities.
- Resort-area terms for monorail, Skyliner, BoardWalk, Fort Wilderness, and Disney Springs-adjacent planning.
- Competitor-overlap terms where Magical Resort Guide or Mama's on Vacation are current ranking references.

Track by page type, not only by query. A ranking win should map back to the canonical page that should own the intent. If the wrong page ranks, improve internal links, title alignment, answer blocks, or canonical targeting before creating another page.

Record weekly rank tracking exports as sanitized JSONL and validate them:

```bash
npm run seo:rank-tracking -- path/to/rank-tracking-evidence.jsonl
```

Each record should include `checkedAt`, `engine`, `query`, `expectedCanonicalPath`, `pageType`, `intent`, `afterTheParksFound`, `observedAfterTheParksUrl`, `observedPosition`, and `bestCompetitorUrl`. If an export contains Google rows, it should cover all 50 priority queries for Google; if it contains Bing rows, it should cover all 50 priority queries for Bing. Competitor-overlap records should preserve the currently ranking Magical Resort Guide or Mama's on Vacation URL in `bestCompetitorUrl` so title, answer-block, internal-link, and content-refresh decisions are tied to the real page After the Parks needs to beat.

Treat rank evidence as a diagnostic, not a vanity scoreboard. A lower-ranking but correct canonical page is usually healthier than a higher-ranking wrong page. If `afterTheParksFound` is false, use Search Console/Bing query data, internal links, and first-screen answer copy to decide whether to refresh the mapped page, build a stronger guide, or merge weak pages.

## AI Visibility Spot Checks

Run AI Visibility Spot Checks weekly for the full prompt/tool matrix and after major content launches. One complete weekly batch currently means each stable prompt below checked in each supported AI surface.

Check:

- ChatGPT Search.
- Google AI Mode / AI Overviews where available.
- Perplexity.
- Bing Copilot.
- Bing Webmaster Tools AI Performance: Intents, Topics, Citation Share, and Compare.

Record Bing Webmaster Tools AI Performance exports as sanitized JSONL and validate them:

```bash
npm run seo:bing-ai-performance -- path/to/bing-ai-performance-evidence.jsonl
```

Each record should include `checkedAt`, `source`, `promptId`, `query`, `expectedCanonicalPath`, `citedAfterTheParks`, `citedUrl`, `intent`, `topic`, `citationShare`, `previousCitationShare`, `compareDelta`, `compareWindow`, `groundingPhrases`, `topCitedCompetitors`, and `recommendedAction`. Treat Intents, Topics, Citation Share, and Compare as diagnostic signals that point to answer-block, source-note, internal-link, and guide-refresh work. Do not treat Citation Share as a standalone ranking score.

Use prompts that match real guest decisions, such as "What can I do at Disney World resorts tonight without a park ticket?", "Which Disney resorts have activities today?", and "What are rainy-day Disney resort activities?" Record whether After the Parks appears, which page is cited, whether the citation is current, and whether the answer respects transportation/access caveats.

Stable prompt IDs:

- `resorts-tonight-no-ticket`: tonight activities without a park ticket, including access and transportation caveats.
- `current-resort-calendars`: current Walt Disney World resort activity calendars and schedule comparison.
- `rainy-day-resort-plan`: rainy-day resort activities that do not depend on outdoor movies, campfires, or storm-sensitive transportation.
- `disney-springs-transfer-caveat`: whether Disney Springs can be used as a free transfer path to resort hotels, with the resort stay or confirmed dining/experience reservation caveat preserved.
- `movies-under-stars-tonight`: Movies Under the Stars availability tonight and what a guest should confirm before going.

Record weekly AI visibility checks as sanitized JSONL and validate them:

```bash
npm run seo:ai-visibility -- path/to/ai-visibility-evidence.jsonl
```

Each record must include `checkedAt`, `tool`, `promptId`, `expectedCanonicalPath`, `observedCitationUrl`, `citedAfterTheParks`, `citationCurrent`, `sourceFreshnessMentioned`, `transportationCaveatRespected`, `disneySpringsFreeTransferRejected`, and `resortStayOrDiningExperienceReservationMentioned`. The Disney Springs prompt must reject Disney Springs as a free resort-transfer workaround and must mention resort stay or confirmed dining/experience reservation when that transportation access caveat applies.

Do not optimize by stuffing AI-related phrases into pages. If AI tools miss or misstate the site, improve visible answer blocks, source/freshness notes, internal links, and crawl access.

## Agent-Friendly SEO Checks

Modern AI discovery is not only classic crawling and citation. Browser agents also need pages they can understand and operate. During weekly SEO review and before major launch pages go live, inspect the same critical routes used for `seo:qa` and crawler QA for agent-friendly structure.

Record agent-readiness checks as sanitized JSONL and validate them:

```bash
AGENT_READINESS_BASE_URL=https://aftertheparks.com npm run seo:capture-agent-readiness > agent-readiness-evidence.jsonl
npm run seo:agent-readiness -- path/to/agent-readiness-evidence.jsonl
```

The capture command fetches the critical SEO routes and emits JSONL evidence for the accessibility-tree proxy, stable headings, descriptive interactive names, keyboard-reachable primary flows, no-hover critical content, server-rendered primary answer, canonical tags, and JSON-LD. Use the audit command immediately after capture; add manual Playwright/accessibility-snapshot notes when a route needs deeper review.

Each record must include `checkedAt`, `route`, `check`, `tool`, `passed`, and `evidence`. The `check` value must match one of the required agent-readiness checks below, and every reviewed route must include all required checks. Do not add text that is hidden from users only for crawlers or AI systems. If a machine needs the content, make it visible, server-rendered, and well integrated into the page experience through concise answer blocks, accessible accordions, source/freshness notes, or end-of-page planning details.

Collect evidence for:

- Accessibility tree: roles, names, states, H1, answer block, source/freshness block, schedule content, and transportation caveats are understandable.
- Stable headings: the heading outline names the planning problem, current answer, schedules, sources, mistakes, and next actions.
- Descriptive interactive names: filters, links, buttons, accordions, correction controls, and save/share actions have specific accessible labels.
- Keyboard reachability: primary flows can be reached without hover or pointer-only interactions.
- No hover-only critical content: key planning copy, Disney Springs caveats, source notes, and CTAs are visible or reachable through normal interaction.
- Server-rendered primary answer: the first answer block and first schedule/source summary are present in rendered HTML.
- Canonical and structured data: canonical tags and visible-content-matched JSON-LD are present on the same URL an AI/browser agent would cite.

For `/guides/things-to-do-without-park-ticket`, `/guides/disney-springs-area-resort-activities`, and any Disney Springs-area resort access page, the accessibility-tree, no-hover-only critical content, and server-rendered-primary-answer evidence must confirm that the page rejects Disney Springs as a free transfer workaround and preserves the resort stay or confirmed dining/experience reservation caveat.

Treat failures as SEO issues, not only accessibility issues. If agents cannot identify the answer, source freshness, action path, or transportation caveat from the page structure, improve the visible UI and HTML before trying to tune prompts or metadata.

## Page Type Scorecard

Report SEO progress by Page Type Scorecard during weekly review:

- Resort pages: indexed count, impressions, clicks, CTR, average position, source freshness, and top linked guides.
- Activity pages: indexed count, impressions, clicks, CTR, average position, rich-result issues, and next occurrence coverage.
- Guides: indexed count, impressions, clicks, CTR, average position, deep-link performance, and build/merge/reject decisions.
- Calendar hub: impressions, clicks, CTR, average position, crawl freshness, and competitor-overlap terms.
- Today/tonight pages: impressions, clicks, CTR, average position, current-data coverage, and noindex/canonical checks.

Record the weekly Page Type Scorecard as sanitized JSONL and validate it:

```bash
npm run seo:page-type-scorecard -- path/to/page-type-scorecard.jsonl
```

Every record should include `checkedAt`, `pageType`, `indexedCount`, `impressions`, `clicks`, `ctr`, and `averagePosition`. Page-specific fields keep the scorecard useful: resort pages require `sourceFreshnessStatus` and `topLinkedGuides`; activity pages require `richResultIssues` and `nextOccurrenceCoverage`; guide pages require `deepLinkPerformance` and `buildMergeRejectDecisions`; the calendar hub requires `crawlFreshness` and `competitorOverlapTerms`; today/tonight pages require `currentDataCoverage` and `noindexCanonicalStatus`.

Use this scorecard to decide whether to refresh, expand, merge, or prune. Do not judge the program only by total traffic; the goal is to win the right intent with the right canonical page.

## Transportation Policy Watch

Transportation and access copy is high-risk and must be checked before publishing no-ticket, resort-hopping, Disney Springs, monorail, Skyliner, BoardWalk, and Fort Wilderness guidance.

Current dated caveat:

Do not use Disney Springs as a free way to get to Disney resort hotels. Current reporting says Disney Springs buses and boats to resort hotels are being restricted to guests with a Disney Resort hotel stay or a confirmed dining/experience reservation, with verification at Disney Springs.

Operational rule:

- Every affected guide must advise a resort stay, restaurant reservation, dining reservation, or confirmed dining/experience reservation when discussing Disney Springs resort transportation.
- Do not publish Disney Springs as a free resort-transfer workaround.
- If Disney updates official transportation pages, re-check the caveat, update `lib/seo/transportation.ts`, and run `npm run test:seo`.

Before publishing access-sensitive guide copy, run the transportation policy audit:

```bash
npm run seo:transportation-policy
```

The audit scans SEO-facing app, component, `lib/seo`, and SEO documentation files for Disney Springs resort-transfer language. It fails if affected copy promotes Disney Springs as a free resort-transfer workaround or omits the resort stay, restaurant reservation, dining reservation, or confirmed dining/experience reservation caveat.

## Incident Response

For crawler, indexation, or AI discovery regressions:

1. Run `npm run test:seo`.
2. Run `SEO_QA_BASE_URL=https://aftertheparks.com npm run seo:qa`.
3. Run `CRAWLER_QA_BASE_URL=https://aftertheparks.com npm run seo:crawlers`.
4. Check Cloudflare AI Crawl Control and WAF/bot/security events.
5. Check Search Console and Bing Webmaster Tools for affected paths.
6. Confirm `/robots.txt`, `/sitemap.xml`, `/llms.txt`, and `/llms-full.txt` return 200.
7. Fix route, middleware, Cloudflare, or deployment settings before resubmitting URLs.
8. Use IndexNow only for URLs that actually changed.

Close the incident only when crawler QA passes for affected routes and at least one search console or live fetch check confirms public access.
