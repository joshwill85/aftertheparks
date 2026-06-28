# After the Parks SEO Strategy, 2026

## Goal

Make After the Parks the strongest organic result for Walt Disney World resort recreation, resort activity calendars, no-park-day planning, and current "what can we do today/tonight at our resort?" searches.

The winning position is not "another Disney blog." It is:

> The current, source-backed, resort-by-resort activity atlas for Walt Disney World resort days.

That matters because the competitors split the market:

- [Magical Resort Guide](https://www.magicalresortguide.com/resort-activities-main) wins on current activity-calendar directory intent. It explicitly publishes current calendar windows, resort calendar links, and seasonal activity updates.
- [Mama's on Vacation](https://mamasonvacation.com/what-to-do-at-disney-on-non-park-days/) wins on broad planning intent with long, personal, internally linked guides for non-park days, resort hopping, dining, pools, and family use cases.

After the Parks can beat both by combining their strengths: current data depth plus guide-quality planning context.

## Research Baseline

Google's current guidance still centers on crawlable pages, useful unique content, clear titles/descriptions, logical site structure, good internal links, image context/alt text, and Search Console monitoring. Google also says there are no guaranteed tricks to rank first, and that changes can take weeks to months to show up. Source: [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

Google's people-first content guidance says helpful content should be created for people, demonstrate experience/expertise, provide substantial value, and avoid search-engine-first production. Source: [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

For AI search, Google says the same SEO fundamentals apply because AI features are grounded in Search index retrieval. The big 2026 guidance is to create non-commodity content, keep pages crawlable, use clear technical structure, avoid scaled-content abuse, and ignore most "GEO/AEO hacks" such as special AI-only markup for Google. Source: [Google's guide to optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), last updated June 15, 2026.

OpenAI separates search visibility from model-training crawling. `OAI-SearchBot` is used for ChatGPT search results, while `GPTBot` is for model training; allowing one does not require allowing the other. Source: [OpenAI crawler documentation](https://platform.openai.com/docs/bots).

Google structured data remains useful for rich-result eligibility, especially Event, BreadcrumbList, Organization/WebSite, and ItemList patterns. It is not a substitute for visible page quality. Sources: [Structured data intro](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) and [Event structured data](https://developers.google.com/search/docs/appearance/structured-data/event).

Core Web Vitals still matter as user-experience quality signals. Current thresholds are LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 at the 75th percentile. Source: [web.dev Web Vitals](https://web.dev/articles/vitals).

Do not hide SEO text from users while showing it to crawlers. Google defines cloaking as presenting different content to users and search engines to manipulate ranking, including inserting text only when the requester is a search engine. Source: [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies). Hidden content can be fine for legitimate UX/accessibility patterns, but the content should be available to users and not exist only for bots.

Bing now frames its webmaster guidance across Bing Search, Copilot, and grounding APIs. Its 2026 AI Performance guidance recommends clear headings, tables, FAQ sections, evidence, and freshness for AI references. On June 16, 2026, Microsoft expanded Bing Webmaster Tools AI visibility reporting with Intents, Topics, Citation Share, and Compare in global preview; treat these as diagnostic signals for why and where the site is cited, not as a single AI ranking score. Sources: [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a), [Bing AI Performance public preview](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview), and [Bing AI Visibility Insights](https://blogs.bing.com/search/June-2026/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare).

AI readiness also needs to account for browser agents, not just search snippets. Current Google guidance for agent-friendly sites emphasizes accessible page structure, stable headings, descriptive interactive controls, and content that agents can perceive through the DOM and accessibility tree. For After the Parks, this means the first answer, source/freshness facts, schedule summaries, correction paths, and transportation caveats should be reachable as real page content and controls, not hidden behind hover-only UI or client-only state. Source: [web.dev agent-friendly website best practices](https://web.dev/articles/ai-agent-site-ux).

Crawler policy should separate search/referral visibility from model-training permission where possible. OpenAI separates `OAI-SearchBot` and `ChatGPT-User` from `GPTBot`; Anthropic separates `Claude-User` and `ClaudeBot`; Apple documents Applebot for search experiences and separate controls for model training; Google says `Google-Extended` does not affect Google Search inclusion or ranking. Sources: [OpenAI crawlers](https://platform.openai.com/docs/bots), [Anthropic crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), [Applebot](https://support.apple.com/en-us/119829), [Applebot model training controls](https://support.apple.com/en-us/120320), and [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers).

For freshness beyond Google, IndexNow can notify participating search engines when URLs are added, updated, or deleted. Use it for changed URLs, not daily unchanged-site pings. Sources: [IndexNow documentation](https://www.indexnow.org/documentation) and [IndexNow FAQ](https://www.indexnow.org/faq).

Because the site runs behind Cloudflare, AI Crawl Control should be part of crawl QA. Cloudflare says AI Crawl Control gives visibility into AI services accessing content and provides tools to manage access. Source: [Cloudflare AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/).

## Current Site Advantage

The repo already has a rare moat:

- Source-backed activity ingest with official Disney source URLs, hashes, validity windows, confidence, and review gates.
- Pages for `/today`, `/tonight`, `/activities`, `/resorts`, individual resorts, individual activities, calendar, search, and planning.
- A correction workflow, data freshness states, and user-facing schedule caveats.
- Search documents, synonyms, resort/activity relationships, and category taxonomy.

This should become the SEO story. Every important page should make the source-backed, currently verified nature obvious to humans and machines.

## Current Gaps

These are the biggest opportunities visible in the codebase today:

1. Public launch/crawl unblocking must be verified before SEO work can compound. Canonical public routes should return 200, not redirect to a gate, and should not carry accidental `noindex`.
2. The sitemap only includes top-level pages. It does not include individual resort pages, activity detail pages, guide pages, calendar variants, or key landing pages.
3. There is a global metadata default, but no `generateMetadata` for resort pages, activity detail pages, today/tonight states, or guide pages.
4. I did not find JSON-LD for Organization, WebSite, BreadcrumbList, ItemList, Event, or guide/article pages.
5. Resort and activity pages are mostly app UI, not yet fully search landing pages. They need crawlable explanatory sections, FAQs, source/freshness summaries, and internal links.
6. Programmatic pages exist, but the keyword architecture is not yet explicit: "Disney resort activity calendars", "Disney World resort activities today", "Movies Under the Stars tonight", "what to do at Disney on a non-park day", "things to do at [resort]", and "free Disney resort activities" should each have clear canonical destinations.
7. AI crawler policy is generic. `robots.txt` allows all, which is okay, but we should explicitly validate that Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Applebot, and major preview/social crawlers can fetch rendered pages through Cloudflare and Vercel.

## Implementation Status

The gaps above are the original implementation targets. Current code now includes the core SEO foundation: dynamic public sitemap and robots metadata routes, expanded canonical sitemap coverage, source-derived sitemap `lastModified` dates for resort and activity pages when verified activity freshness exists, noindex controls for utility/share routes, visible source/freshness content, structured data helpers, guide and comparison page qualification gates, guide research dossiers with editorial review, official-source links, update notes, and anti-thin-content checks, `/llms.txt` and `/llms-full.txt` with matching guide trust context for non-Google discovery, crawler QA scripts, IndexNow tooling, explicit search/referral-vs-training crawler separation, 50-query rank-tracking evidence validation, full prompt/tool matrix AI visibility evidence validation, page-type scorecard evidence validation, Core Web Vitals field-evidence validation, a Disney Springs transportation policy audit, and tested Disney Springs transportation caveats.

External launch tasks remain outside the repository and must be verified in the deployed environment:

- Confirm production pages return public 200 HTML without deployment protection or password prompts.
- Submit and monitor `https://aftertheparks.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
- Run `SEO_QA_BASE_URL=https://aftertheparks.com npm run seo:qa` after deploy.
- Run `CRAWLER_QA_BASE_URL=https://aftertheparks.com npm run seo:crawlers` after deploy and after Cloudflare rule changes.
- Check Cloudflare AI Crawl Control for search/referral crawler challenges.
- Use Bing Webmaster Tools AI Performance Intents, Topics, Citation Share, and Compare for AI citation diagnostics.
- Use IndexNow only for meaningful changed URLs.

## Strategic Pillars

### 1. Own the "Current Resort Activity Calendar" Lane

Build a canonical hub:

- `/disney-world-resort-activity-calendars`
- H1: "Walt Disney World Resort Activity Calendars"
- Opening answer: current schedule window, last verified date, number of resorts covered, next expected refresh.
- Resort index with activity counts, today/tonight counts, movie/campfire indicators, and last verified date.
- Internal links to every resort page.
- Seasonal archive links: Summer 2026, Fall 2026, Holiday 2026.
- Visible source policy: official Disney sources first; third-party enrichment only where clearly labeled.

This directly challenges Magical Resort Guide's current calendar directory, but with better structured data, freshness, filters, and page-level trust.

### 1A. Make the Site Current-First

Every major entry page should lead with a compact freshness block:

- Last verified
- Current schedule window
- Resorts covered
- Activities tracked
- Official sources checked
- Next expected refresh
- Correction link

This is the brand promise. Disney is the official authority, but Disney's information is fragmented by resort and activity. After the Parks can be more useful for cross-resort planning while making it clear that Disney remains the official source.

The freshness block should be visible but compact: a slim status strip, a small facts row, or an expandable "source and freshness" panel. Do not hide it only for machines.

### 1B. Answer the Query in the First Screen

Each important page should open with a short answer block that is useful to humans, featured snippets, and AI retrieval systems.

Examples:

- `/today`: "Today at Walt Disney World resorts, guests can find poolside games, crafts, campfires, Movies Under the Stars, scavenger hunts, fitness activities, and community hall events. This page shows currently known resort activities for today, grouped by time, resort, cost, and activity type."
- `/tonight`: "Tonight's Walt Disney World resort activities include evening campfires, outdoor movies, poolside events, and resort-specific entertainment. Always confirm times with the official resort source before heading out."
- `/resorts/[slug]`: "`[Resort Name]` usually offers activities such as poolside recreation, Movies Under the Stars, campfires, crafts, and seasonal events. Below are the currently tracked activities, today/tonight highlights, and no-park-day ideas for guests staying here."

The answer block should be part of the actual page UI. Keep it concise, helpful, and skimmable.

### 2. Turn Every Resort Page Into a Search Landing Page

Each `/resorts/[slug]` page should have:

- Unique title: "`Disney's Polynesian Village Resort Activities, Movies & Recreation Calendar | After the Parks`"
- Unique meta description with date/freshness.
- H1 with full resort name.
- Crawlable intro paragraph: who the resort is best for, what activities are usually available, where to start tonight.
- "Today at this resort" and "Tonight at this resort" summaries in static server-rendered text.
- Activity sections by intent: free, paid, kids, evening, rainy day, pool/wellness, crafts, movies, campfires.
- "Best no-park-day plan if you're staying here" mini itinerary.
- Source/freshness block: last verified, current schedule window, official source link, correction link.
- Breadcrumbs and internal links to related resorts in the same area/tier.
- JSON-LD: BreadcrumbList, TouristAccommodation or LodgingBusiness-like entity when appropriate, ItemList of activities, Event nodes for dated occurrences.

This beats both competitors because it answers planning questions and provides current schedules on the same page.

Use this resort page template:

- H1: "`[Resort Name]` Activities, Movies & Recreation Calendar"
- Opening answer: currently tracked activities, today/tonight highlights, recurring recreation, movies, campfires, crafts, poolside activities, and no-park-day ideas.
- Freshness block: last verified, current schedule window, official source URL, confidence state, correction link.
- Sections: Today at this resort, Tonight at this resort, Full activity calendar, Free activities, Paid activities, Best for kids, Best for adults, Rainy-day options, Evening options, No-park-day mini itinerary, Transportation notes, Nearby resorts with activities tonight, Related activities, Related guides, FAQ, Source and caveat block.
- Structured data: BreadcrumbList, ItemList of activities, Event nodes only for dated occurrences, and LodgingBusiness/TouristAccommodation only if implemented carefully and without implying official Disney ownership.

### 3. Make Activity Pages the Best Answer on the Web

Each `/activities/[slug]` page should answer:

- What is it?
- Where is it offered?
- Is it free or paid?
- Who is it best for?
- When is the next occurrence?
- Which resorts have it today/tonight?
- What should a guest confirm before walking over?
- Similar activities and nearby alternatives.

Priority activity pages:

- Movies Under the Stars
- Campfires / marshmallow roasting
- Scavenger hunts / hidden character hunts
- Poolside activities
- Crafts, mosaics, painting, tie-dye
- Community halls
- Arcades
- Yoga / fitness classes
- Electrical Water Pageant viewing
- Resort-hopping-friendly activities

These pages should target both head terms and fan-out queries without creating thin duplicates.

Use this activity page template:

- H1: "`[Activity Name]` at Walt Disney World Resorts"
- Opening answer: what it is, where offered, whether it is free, who it is best for, next known occurrence, which resorts have it today/tonight, and what to confirm before going.
- Sections: Overview, Today/tonight schedule, Participating resorts, Cost/reservation notes, Best resorts for this activity, Tips, Weather/cancellation caveats, Similar activities, Official-source notes, FAQ.

### 4. Build a Planning Guide Cluster

Mama's on Vacation has broad guide coverage and internal links. We need a tighter, data-powered guide cluster:

- What to do at Disney World on a non-park day
- Free things to do at Disney World resorts
- Disney resort hopping guide
- Best Disney resorts for activities
- Best Disney resort activities for toddlers
- Best Disney resort activities for teens
- Best Disney resort activities for adults
- Rainy day activities at Disney resorts
- First night at your Disney resort
- Check-in day activities at Disney World resorts
- Best Disney resorts for Movies Under the Stars
- Best Disney resort campfires
- Disney World resort activities by month or season

Each guide should link into live resort/activity data. Each data page should link back to relevant guides. This creates a topical graph that pure blogs and pure directories both struggle to match.

Guide page template:

- H1 matching the core intent, such as "What to Do at Disney World on a Non-Park Day"
- Opening answer: "The best Disney World non-park day usually combines a slow morning, resort recreation, pool time, a meal or resort hop, and an evening activity like a campfire or Movies Under the Stars."
- Sections: Best overall plan, Free plan, Toddler plan, Teen plan, Adult/couple plan, Rainy-day plan, First-night plan, Resort-hopping plan, Live activities today, Best resorts for this plan, Mistakes to avoid, Transportation notes, FAQ, Sources and update notes.

### 4A. Add Comparison Pages Competitors Will Struggle to Match

These should be editorial pages powered by live data:

- Best Disney resorts for activities today
- Best Disney resorts for a no-park day
- Best Disney resorts for evening activities
- Best Disney resorts for free activities
- Best Disney resorts for toddlers
- Best Disney resorts for teens
- Best Disney resorts for adults
- Best Disney resorts for rainy days
- Best resorts for Movies Under the Stars
- Best resorts for campfires
- Best resorts for check-in day
- Best resorts if you do not have a park ticket
- Best monorail resort activities
- Best Skyliner resort activities
- Best BoardWalk-area resort activities
- Best Fort Wilderness activities without a park ticket

Each page should include a short answer, live data snapshot, top picks, who it is best for, who should skip it, transportation notes, free vs paid notes, last verified date, links to resort and activity pages, and official-source caveats.

### 4B. Research-Gated Guide Creation

No guide or comparison page should be created solely because a keyword exists. Every new SEO page must pass a page qualification gate proving real user intent, unique After the Parks value, live data integration, research depth, transportation accuracy, bad-fit exclusions, and deep links into the core product. Pages that cannot pass should be merged into stronger guides or skipped.

The standard:

> Every SEO page must solve a real planning problem better than a generic Disney blog, better than a static activity calendar, and better than Disney's own fragmented pages for cross-resort planning.

Before creating any new page, require a one-page brief:

| Gate | Required proof |
| --- | --- |
| User intent | What exact question is the guest trying to answer? |
| Primary user action | What should they do after landing: view today, compare resorts, filter indoor activities, open a resort page, save an activity, or plan tonight? |
| After the Parks advantage | What can this page do that a normal blog cannot? |
| Live data dependency | Which live activity, resort, schedule, freshness, audience, route, and source fields power the page? |
| Research sources | Official Disney pages, After the Parks database, current calendars, community sentiment, competitor gaps, and transportation validation. |
| Exclusion rules | What should not appear on this page? |
| Deep-link map | Which product pages and filters does this page route to? |
| Freshness rule | How often should the page be rechecked? |
| Kill rule | When should it be merged, noindexed, or deleted? |

A page that cannot answer these fields should not be created.

Each proposed guide must also produce a research dossier before drafting:

1. Official-source facts: Disney resort recreation pages, transportation pages, parking/access pages, dining/experience pages, and official activity pages.
2. After the Parks data facts: indoor/outdoor state, free/paid state, schedule, resort, location, age suitability, reservation requirement, weather sensitivity, and last verified date.
3. Community sentiment: Reddit, planDisney, Disney forums, YouTube comments, travel blogs, Facebook groups where accessible, and trip reports. Use this for "what people love," "what people regret," and "mistakes to avoid," not for official policy.
4. Competitor gap analysis: Magical Resort Guide, Mama's on Vacation, Disney Tourist Blog, DFB, AllEars, WDW Prep School, TouringPlans, planDisney, and official Disney pages.
5. Transportation validation: every itinerary must use realistic Disney transportation routes.
6. Bad-fit exclusions: activities that are wrong for the intent must be explicitly excluded.
7. Deep-link plan: the exact `/today`, `/tonight`, `/activities`, `/resorts`, resort, activity, filtered-view, or planning URLs the page should send users to.

### 4C. Decision Pages, Not Keyword Pages

The audience and use-case guides should exist only when they apply a unique decision filter:

| Page type | Real decision filter |
| --- | --- |
| Grandparents | Low walking, nearby seating, shade/AC, easy transport, flexible timing, not too loud, no long waits. |
| Couples | Atmosphere, evening timing, dining nearby, lounges, scenic walks, adult-friendly feel, lower child-density options. |
| Toddlers | Short duration, stroller-friendly, early timing, shade/indoor, nap compatibility, bathrooms nearby. |
| Teens | Autonomy, food/snacks, games, arcades, fitness, late-night vibe, photo-worthy areas. |
| Rainy day | Indoor/covered only, low transfer risk, no weather-dependent transport unless clearly caveated. |
| First night | Low stakes, flexible, close to resort, not reservation-fragile unless pre-booked. |
| Resort hopping | Direct route preferred, one transportation mode where possible, no bus-to-park-to-bus chains unless labeled as advanced/multi-hop. |
| No park ticket | No admission required, access allowed, parking/transport caveats, resort-guest-only restrictions where relevant. |

This is how the site avoids thin content. The page exists because it filters the world in a way the homepage cannot.

### 5. Ship AI-Friendly Pages Without Falling for AI SEO Myths

Do:

- Ensure every important fact appears in server-rendered HTML, not only hidden in client state.
- Add concise "answer blocks" near the top of pages.
- Include dateModified, last verified, source, and current schedule window visibly.
- Use descriptive headings that match real user questions.
- Keep page content human-readable and citation-friendly.
- Allow `OAI-SearchBot` for ChatGPT Search.
- Test pages with text browsers, no-JS fetches, and rich-result validators.

Do not:

- Create dozens of thin pages for every keyword variation.
- Stuff "AI Overview", "ChatGPT", or long-tail phrases unnaturally.
- Depend on `llms.txt` for Google visibility. Google explicitly says it does not use special AI text files for Search or generative AI visibility.
- Hide content from users while exposing it to bots.

Optional:

- Add `/llms.txt` and `/llms-full.txt` for non-Google tools, but treat them as a supplemental discovery convenience, not a ranking lever. The files should point to canonical hubs, data source policy, sitemap, and high-value guide pages.

### 5A. UX-Safe Crawlable Content Policy

Do not create text that users cannot access but crawlers can. That is risky, low-quality, and contrary to the trust position of the site.

Use these patterns instead:

- Compact answer blocks near the top of the page.
- Source/freshness strips that summarize last verified date, schedule window, and caveats.
- Expandable accordions using native HTML or accessible components for FAQs, source notes, transportation notes, and "how to use this page."
- End-of-page "Planning notes" or "Source and accuracy notes" sections for longer explanatory copy that would clutter the top of the experience.
- Tabs or segmented views where the content remains reachable via normal user interaction and is not generated only for bots.
- Visually hidden text only for accessibility labels, not for keyword stuffing or crawler-only paragraphs.
- JSON-LD only when it describes content that is also visible or meaningfully available on the page.

Implementation rule: if a sentence is important enough for SEO, it must be useful enough to a human somewhere on the page.

Preferred placement by content type:

- First-screen answer: 1-3 sentences.
- Freshness/source facts: compact strip near the top.
- Detailed sourcing/caveats: bottom of page or expandable panel.
- Long planning guidance: dedicated guide pages, not bloated transactional pages.
- Repeated definitions: reusable small components, not hidden duplicate paragraphs.

### 5B. Build a Real Entity Graph

Treat the site as a structured knowledge graph:

> Resort -> Activity -> Occurrence -> Location -> Cost -> Audience -> Source -> Freshness -> Related Guide

Every activity occurrence should have:

- Name
- Resort
- Venue/location
- Start time
- End time if known
- Date
- Activity category
- Free/paid state
- Reservation requirement
- Age suitability
- Accessibility notes where known
- Source URL
- Source type
- Last verified
- Confidence state
- Caveat

Reuse the graph everywhere:

- Resort pages show current occurrences.
- Activity pages show all resorts offering the activity.
- Guide pages embed live recommendations.
- The calendar hub aggregates everything.
- Sitemap and JSON-LD are generated from the same canonical data.
- Internal links are generated from real relationships, not manual guesses.

### 5C. Audience, Weather, and Route Fit Data

Extend the entity graph with audience-fit, weather-fit, and transportation-fit fields. Rainy-day pages must only surface indoor or covered activities by default. Audience pages must rank activities by suitability, not generic popularity. Transportation pages must distinguish direct routes, one-transfer routes, and multi-hop routes, and should not promote complex transfers as easy resort hopping.

Weather taxonomy for every activity:

| Field | Values |
| --- | --- |
| `weather_fit` | `indoor`, `covered`, `outdoor_ok`, `outdoor_weather_dependent`, `outdoor_not_rainy` |
| `rain_safe` | `yes`, `partial`, `no` |
| `heat_safe` | `yes`, `partial`, `no` |
| `lightning_risk` | `yes`, `no` |
| `requires_clear_weather` | `yes`, `no` |
| `transport_weather_risk` | `low`, `medium`, `high` |
| `backup_activity_id` | linked fallback activity |

Rainy-day pages should use:

- Primary rainy-day picks: indoor or covered activities.
- Conditional picks: partly covered options or light-rain-only activities.
- Not recommended in rain: campfires, outdoor movies, poolside activities, playgrounds, jogging trails, surrey bikes, outdoor scavenger hunts, fireworks viewing, and outdoor recreation unless the data confirms an indoor/covered variant.

Rainy-day deep links:

- `/activities?weather=indoor`
- `/activities?weather=covered`
- `/today?weather=indoor`
- `/tonight?weather=indoor`
- `/resorts/[slug]#rainy-day-options`
- `/activities/arcades`
- `/activities/community-halls`
- `/activities/crafts`
- `/activities/fitness`

Route model:

| Field | Example values |
| --- | --- |
| `route_type` | `direct`, `one_transfer`, `multi_transfer` |
| `transport_mode` | `monorail`, `skyliner`, `boat`, `walk`, `bus`, `rideshare` |
| `transfer_count` | `0`, `1`, `2_plus` |
| `park_ticket_required` | `yes`, `no` |
| `weather_exposure` | `low`, `medium`, `high` |
| `mobility_difficulty` | `low`, `medium`, `high` |
| `recommended_for_page` | `yes`, `no` |
| `caveat` | "Skyliner may close for weather," "requires park admission," "long outdoor walk," etc. |

For SEO guides, default to direct or near-direct routes. Good route-page boundaries:

- Monorail resort activities: Contemporary, Polynesian, Grand Floridian, Transportation and Ticket Center, Magic Kingdom-area loop.
- Skyliner resort activities: Pop Century, Art of Animation, Caribbean Beach, Riviera, EPCOT International Gateway, and BoardWalk-area walk connections.
- BoardWalk-area activities: BoardWalk, Beach Club, Yacht Club, Swan/Dolphin, EPCOT International Gateway area.
- Fort Wilderness activities: Fort Wilderness-focused activities and clean water-launch/Wilderness Lodge adjacency only when the route is simple.
- Disney Springs-area resort activities: Saratoga Springs, Old Key West, Port Orleans Riverside/French Quarter by Sassagoula River Cruise, with current access caveats.

Transportation policy freshness check:

- Disney's official transportation and parking pages should be treated as the source of record when they clearly answer access rules.
- As of June 27, 2026, current reporting says that beginning June 28, 2026, Disney Springs buses and boats to resort hotels will be restricted to guests with resort stays or dining/experience reservations, with verification at Disney Springs. Source: [FOX 35 Orlando](https://www.fox35orlando.com/news/disney-world-restricts-disney-springs-bus-boat-access), with additional reporting from [People](https://people.com/disney-world-is-permanently-restricting-this-beloved-free-transportation-perk-reports-12000854). Treat this as a dated caveat until Disney's official transportation pages are updated and checked.
- "Things to do without park tickets" and "resort hopping from Disney Springs" pages need a prominent, dated transportation caveat.

No-ticket guide structure:

1. No-ticket activities that are usually straightforward: Disney Springs shopping/dining/entertainment, resort dining with reservation, resort lobbies where access is allowed, BoardWalk area, monorail resort loop where accessible, Skyliner where accessible, Electrical Water Pageant viewing, and some resort recreation.
2. No-ticket but access-sensitive: resort parking, resort dining, resort recreation, Disney Springs-to-resort transportation, holiday decor visits, beaches/lounges/lobbies, and lounges with capacity limits.
3. Not no-ticket: anything inside Magic Kingdom, EPCOT, Hollywood Studios, Animal Kingdom, or a ticketed event.
4. Transportation caveats: theme park parking, Disney Springs parking, resort self-parking, rideshare, Minnie Van, walking routes, monorail/Skyliner/boat access, and what recently changed.

No-ticket deep links:

- `/activities?ticket_required=false`
- `/activities?free=true`
- `/activities?transport=monorail`
- `/activities?transport=skyliner`
- `/activities?area=disney-springs`
- `/resorts?no_ticket_friendly=true`
- `/today?ticket_required=false`
- `/tonight?ticket_required=false`

Audience-fit fields:

| Field | Why it matters |
| --- | --- |
| `walking_intensity` | Grandparents, mobility, toddlers. |
| `seating_available` | Grandparents, multi-generational groups. |
| `noise_level` | Grandparents, toddlers, sensory-sensitive guests. |
| `shade_or_ac` | Heat and rain planning. |
| `stroller_friendly` | Toddlers. |
| `wheelchair_ecv_friendly` | Accessibility and multi-generational planning. |
| `date_night_fit` | Couples. |
| `teen_independence_fit` | Teens. |
| `duration_minutes` | First night, toddlers, grandparents. |
| `reservation_needed` | First night, couples. |
| `cost_level` | Free/no-ticket pages. |
| `transport_complexity` | All audience guides. |
| `best_time_of_day` | Couples/evening, toddlers/morning. |
| `weather_fit` | Rainy-day and heat-safe pages. |

Audience pages should show Best picks, Good backups, Avoid if..., Best resorts for this audience today, Live activities for this audience today/tonight, and deep links into filtered product views.

First-night logic:

- First-night pages are not the same as no-park-day pages.
- They should assume tired travelers, possible flight delays, rooms not ready until afternoon, overstimulated kids, reservation fragility, and slower nighttime transportation.
- Favor the guest's own resort, a nearby direct-route resort, Disney Springs only when it makes logistical sense, or a reservation-backed dinner.
- Deep links: `/tonight?near=my-resort`, `/activities?duration=short&time=evening`, `/activities?weather=indoor`, `/resorts/[slug]#tonight`, `/activities/electrical-water-pageant`, `/activities/movies-under-the-stars` when weather-appropriate, and `/activities/community-halls` where relevant.

### 6. Structured Data Plan

Add JSON-LD in this order:

1. Sitewide `Organization` and `WebSite` with `SearchAction`.
2. `BreadcrumbList` on every nested page.
3. `ItemList` on resort directory, activity directory, and calendar hub pages.
4. `Event` on dated activity occurrences with exact `startDate`, `endDate` when known, `eventStatus`, `location`, `organizer`, `offers` where appropriate, and current availability caveats.
5. `Article` or `BlogPosting` on editorial guides with author/reviewer/dateModified.
6. FAQ content only when genuinely useful on-page; avoid schema-first FAQ stuffing.

Validation rule: if a claim cannot be visible on the page and supported by data, do not put it in JSON-LD.

### 6A. Source and Accuracy Policy

Create `/source-and-accuracy-policy` and link it from the footer, calendar hub, resort pages, activity pages, guide pages, and correction flow.

It should explain:

- Official Disney sources are preferred.
- Third-party sources are labeled.
- Schedules change.
- Activities may be weather-dependent.
- Some resort calendars are temporary or seasonal.
- A "verified" badge means the source was checked on a specific date.
- A "needs review" or stale state means the schedule may need confirmation.
- Corrections are welcome.
- After the Parks is independent and not affiliated with Disney.

This page is a trust asset, not just legal copy.

### 7. Technical SEO Implementation

Priority fixes:

- Remove the public preview gate from canonical launch pages or make sure canonical public pages bypass it when the site is launched.
- Confirm public routes return 200, have no accidental `noindex`, and include H1, intro copy, internal links, schedule summaries, metadata, canonical tags, and JSON-LD in rendered HTML.
- Expand `app/sitemap.ts` to include:
  - all resorts
  - all canonical activity pages
  - all guide pages
  - calendar/current-season hub pages
  - `lastModified` from source or enrichment data when available
  - high-value filtered landing pages only
  - image sitemap entries when real images exist
  - video sitemap entries if short videos are added
- Add canonical URLs for all public pages and canonicalize query-heavy pages.
- `noindex,follow` internal search-result URLs and private/share/preview pages that should not rank.
- Add `generateMetadata` to dynamic pages.
- Create reusable JSON-LD helpers.
- Add OG images for hub, resort, activity, and guide pages.
- Add image sitemap entries once real resort/activity images are available.
- Improve internal link modules:
  - "Tonight at nearby resorts"
  - "Similar activities"
  - "Planning guides for this resort"
  - "People also plan"
- Add HTML breadcrumbs.
- Ensure all important UI content is present in initial HTML.
- Add IndexNow submission for changed URLs.
- Monitor Core Web Vitals with real-user data and keep route-level budgets:
  - LCP <= 2.5s
  - INP <= 200ms
  - CLS <= 0.1
  - mobile JS route budget
  - server-rendered first schedule block
  - lazy-loaded filters, maps, modals, and secondary widgets

### 8. Crawl and Bot Policy

Robots policy should explicitly separate visibility crawlers from training/model-use crawlers where vendors allow it:

```txt
User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Googlebot-Image
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Applebot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

# Training / broader model-use decisions:
# Allow these only if we want model-training or broader AI model use.
# User-agent: GPTBot
# Allow: /
#
# User-agent: ClaudeBot
# Allow: /
#
# User-agent: Google-Extended
# Allow: /
#
# User-agent: Applebot-Extended
# Allow: /

Sitemap: https://aftertheparks.com/sitemap.xml
```

Also verify Cloudflare does not challenge:

- Googlebot
- Bingbot
- OAI-SearchBot
- ChatGPT-User
- Claude-User
- Claude-SearchBot
- GPTBot, if allowed
- PerplexityBot
- Applebot
- social preview bots

Robots.txt is not security. Use `noindex` or authentication for pages that truly should not appear in search.

### 8A. Cloudflare and IndexNow Operations

Use Cloudflare AI Crawl Control as a visibility QA tool:

- Which AI services request the site?
- Which paths do they request?
- Are they seeing 200 HTML or blocked/gated responses?
- Are they respecting robots rules?
- Are Cloudflare bot/security rules challenging legitimate search/referral crawlers?

Use IndexNow when:

- A resort calendar changes.
- A movie schedule changes.
- A campfire schedule changes.
- A new seasonal guide launches.
- A guide gets a meaningful update.
- A stale page becomes verified.
- An activity is removed or canceled.
- A canonical URL changes.

Do not ping every unchanged URL every day.

### 9. Editorial Standards

Every guide should have:

- A byline or editorial review line.
- Last updated date.
- Clear independent-site disclaimer.
- First-hand planning perspective where possible.
- Source links to official Disney pages when stating official details.
- Links into live After the Parks data.
- "Best for" and "avoid if" judgments.
- A short answer near the top.
- Tables/lists where they genuinely help scanning.
- "What changed in this update" for major guides.
- Practical caveats: weather, transportation, crowd flow, stroller logistics, check-in timing, and bus/boat/Skyliner dependencies.

The voice should be helpful and practical, not generic travel-blog filler.

### 9A. Media Standards

Use media where it strengthens trust:

- Original resort/activity photos where permitted.
- Official-source screenshots only if usage rights allow.
- Simple maps or diagrams created by After the Parks.
- Short videos: "How to use a resort activity calendar," "What is Movies Under the Stars," and "How to plan a no-park day."
- Alt text that describes the actual image, not keyword stuffing.

Avoid generic stock photos that make the site feel less current or less trustworthy.

### 9B. Research Dossiers and Evidence Logs

Every major guide should have an internal evidence log: official sources, After the Parks data, current community sentiment, competitor gaps, route validation, exclusion rules, and update triggers. Community research can inform "favorites" and "mistakes," but official policy and live data control factual claims.

Mistakes-to-avoid sections should be research-backed, not generic. Create a reusable mistakes database or editorial module:

| Field | Example |
| --- | --- |
| `mistake` | "Planning a rainy-day itinerary around outdoor movies." |
| `applies_to_pages` | `rainy_day`, `first_night`, `grandparents` |
| `evidence_type` | `official_policy`, `community_pattern`, `editor_experience`, `data_pattern` |
| `severity` | `low`, `medium`, `high` |
| `fix` | "Filter for indoor/covered activities first." |
| `deep_link` | `/today?weather=indoor` |

Examples:

- Rainy day mistakes: planning around campfires, pools, outdoor movies, playgrounds, or Skyliner-heavy routes in stormy weather.
- First night mistakes: making a hard-to-reach dinner reservation, assuming the room will be ready early, going to Disney Springs without a plan during peak dinner hours, or scheduling an activity that cannot survive a flight delay.
- Resort hopping mistakes: assuming every resort connects directly to every other resort, building bus-to-park-to-bus routes, not checking return transportation, and ignoring weather impacts on boats/Skyliner.
- No-ticket mistakes: assuming resort parking is unlimited, assuming Disney Springs transportation can always be used for resort access, assuming park restaurants do not need admission, and assuming every resort activity is open to non-guests.
- Grandparents mistakes: too much walking, not enough seating, too many transfers, outdoor midday heat, and noisy environments.
- Couples mistakes: overstuffing the night, relying on child-heavy poolside entertainment, choosing atmosphere-poor plans when a lounge or scenic route would work better, and underestimating travel time.

Deep linking must be designed into every page, not added later. Every SEO page needs a primary product path:

| Module | Purpose |
| --- | --- |
| Live today module | "See activities matching this guide today." |
| Tonight module | "See what is happening tonight." |
| Best resorts module | Links to resort pages ranked by this intent. |
| Activity cards | Links to activity pages with schedules. |
| Transportation-safe picks | Links to filtered resort/activity views by route type. |
| Weather backup module | Links to indoor/covered alternatives. |
| Nearby alternatives | Links to nearby resorts or activities. |
| Save/share plan CTA | Leads to planning functionality. |

Examples:

- A rainy-day page deep links to live indoor/covered activities.
- A Skyliner page deep links to Skyliner-area resorts and activities.
- A grandparents page deep links to low-walking, seated, indoor, direct-route options.
- A first-night page deep links to tonight-at-my-resort and short-duration evening activities.

### 10. Keyword and Page Map

Primary keywords and destinations:

- "Disney World resort activity calendars" -> `/disney-world-resort-activity-calendars`
- "Disney resort activities today" -> `/today`
- "Disney resort activities tonight" -> `/tonight`
- "Disney World non park day" -> guide
- "things to do at Disney resorts" -> guide + `/activities`
- "free Disney resort activities" -> guide + filtered activity page
- "Disney Movies Under the Stars schedule" -> activity page
- "Disney resort campfire schedule" -> activity page
- "`[resort] activities`" -> resort page
- "`[resort] recreation calendar`" -> resort page
- "`[activity] at Disney resorts`" -> activity page

Secondary long-tail clusters:

- by audience: toddlers, teens, adults, couples, grandparents
- by time: check-in day, first night, rest day, rainy day, after parks close
- by cost: free, paid, reservation required
- by resort tier: value, moderate, deluxe, DVC
- by transportation area: monorail, Skyliner, BoardWalk, Magic Kingdom area

Additional clusters:

- without park ticket: Disney World things to do without park tickets, Disney resort activities without park ticket, can you do Disney resort activities without staying there, Disney World no-ticket activities, free Disney activities outside the parks.
- right now: Disney resort activities today, Disney resort activities tonight, Disney resort movies tonight, Disney campfires tonight, Disney poolside activities today.
- calendar: Disney resort recreation calendars, Disney World activity calendars, Disney hotel activity schedule, Disney resort movie schedule, Disney resort campfire schedule.
- logistics: Disney check-in day activities, Disney first night activities, Disney rest day itinerary, Disney rainy day resort activities, Disney resort hopping by Skyliner, Disney monorail resort activities, Disney BoardWalk activities at night.

### 10A. Build / Merge / Reject Rules

Each proposed page receives a `build`, `merge`, `defer`, or `reject` decision.

- Build only if the page has unique planning value, current/source-backed information, enough strong recommendations, and deep links into the product.
- Merge if it overlaps another guide or would have the same top picks.
- Defer if research is insufficient, transportation/access rules are unclear, or required data fields are missing.
- Reject if it is only a keyword variation, depends on stale/anecdotal advice, cannot stay fresh, or cannot route into live product views.

Do not create a separate page when:

- The page would have the same top picks as another page.
- The only difference is keyword wording.
- There are fewer than 5-7 strong activity/resort recommendations.
- The page cannot link meaningfully into live data.
- The page depends on stale or anecdotal advice.
- Route logic is too complicated to be useful.
- The page would mostly say "check the app" or "it depends."
- The page cannot be updated reliably.

Examples:

| Weak idea | Better approach |
| --- | --- |
| "Disney resort activities for grandparents at night in the rain" | Section inside grandparents page plus rainy-day filter. |
| "Best Disney resort activities by boat for toddlers" | Section inside boat/transportation guide or toddler guide. |
| "Free Disney activities for couples after parks close" | Section inside free guide plus couples guide. |
| "Skyliner rainy-day resort hopping" | Usually avoid; Skyliner can be weather-sensitive, so use a caveated section only. |

### 10B. High-Value Page Matrix

Tier 1: Must build because they are core, high-value, and product-connected:

- `/today`
- `/tonight`
- `/disney-world-resort-activity-calendars`
- `/activities`
- `/resorts`
- `/resorts/[slug]`
- `/activities/[slug]`
- `/guides/disney-world-non-park-day`
- `/guides/free-disney-resort-activities`
- `/guides/disney-resort-hopping`
- `/guides/rainy-day-disney-resort-activities`
- `/guides/first-night-at-disney-resort`
- `/guides/things-to-do-without-park-ticket`

Tier 2: Build after research dossiers:

- `/guides/best-disney-resorts-for-grandparents`
- `/guides/best-disney-resort-activities-for-couples`
- `/guides/best-disney-resort-activities-for-toddlers`
- `/guides/best-disney-resort-activities-for-teens`
- `/guides/best-disney-resorts-for-rainy-days`
- `/guides/best-disney-resorts-for-evening-activities`
- `/guides/best-disney-resorts-without-park-ticket`

Tier 3: Transportation/area pages that need route validation:

- `/guides/monorail-resort-activities`
- `/guides/skyliner-resort-activities`
- `/guides/boardwalk-area-resort-activities`
- `/guides/fort-wilderness-activities-without-park-ticket`
- `/guides/disney-springs-area-resort-activities`

Tier 4: Avoid or merge unless data proves value:

- Monthly pages without real seasonal data.
- Very narrow audience + activity + transport combinations.
- Pages whose recommendations are identical to another page.
- Pages that cannot stay fresh.
- Pages that do not create a useful filtered product entry point.

### 10C. Research Prompt Template

Use this before drafting any new page:

```text
Research this page as if it must be the best Walt Disney World resort-planning answer on the web.

Page idea:
[PAGE TITLE]

User intent:
What is the user trying to decide?

Required research:
1. Official Disney sources for activities, access, transportation, parking, hours, reservations, age limits, and weather caveats.
2. After the Parks live data: resorts, activities, occurrences, location, time, cost, source, last verified, weather fit, audience fit, route complexity.
3. Community sentiment: current Reddit/forum/trip-report patterns for favorite activities, common frustrations, mistakes, and advice.
4. Competitor review: what current top-ranking pages cover, what they miss, and where After the Parks can be more useful.
5. Transportation verification: only include direct or simple routes unless the section is explicitly labeled advanced/multi-hop.
6. Exclusions: list activities that should not appear because they are weather-inappropriate, access-restricted, not audience-appropriate, or too hard to reach.
7. Deep links: define the exact After the Parks pages and filters this guide should route users to.

Output:
- Recommended page title and URL
- One-sentence user promise
- Must-have sections
- Activities/resorts to include
- Activities/resorts to exclude
- Mistakes to avoid
- Deep-link modules
- Source list
- Update frequency
- Decision: build, merge, defer, or reject
```

### 10D. SEO Page Launch Checklist

Before publishing, every page must answer yes:

- Does it solve a real guest planning problem?
- Does it contain current, source-backed information?
- Does it include first-screen value, not just intro fluff?
- Does it link into live After the Parks data?
- Does it have at least one primary CTA into the product?
- Does it avoid recommending bad-fit activities?
- Does it include mistakes/caveats specific to the page?
- Does it have transportation logic where relevant?
- Does it have a freshness date and source policy?
- Does it avoid duplicating another guide?
- Would a user be happy if this was the first page they landed on?
- Would this page still be useful if search engines sent zero traffic?

That last question is the anti-thin-content test.

### 11. Measurement Plan

Set up dashboards for:

- Google Search Console: impressions, clicks, CTR, average position, indexed pages, crawl errors.
- Bing Webmaster Tools: index status, query visibility, and AI Performance citation reporting.
- Server logs / Vercel logs: bot fetches, status codes, render latency.
- Cloudflare AI Crawl Control: AI crawler access, blocked/allowed requests, robots compliance signals.
- Core Web Vitals: route-level LCP, INP, CLS.
- Rank tracking for 50 priority queries.
- AI visibility spot checks:
  - ChatGPT Search
  - Google AI Mode / AI Overviews where available
  - Perplexity
  - Bing Copilot

Track wins by page type, not just total traffic:

- resort pages
- activity pages
- guides
- calendar hub
- today/tonight pages

### 12. 90-Day Execution Plan

#### Days 1-7: Launch/Crawl Unblock

- Remove the preview gate from canonical public pages before launch.
- Confirm 200 status for all public routes.
- Confirm no accidental `noindex`.
- Confirm HTML contains H1, intro, links, and schedule summary.
- Submit sitemap to Google Search Console and Bing Webmaster Tools.
- Enable Bing/IndexNow.

#### Days 8-14: Technical SEO Foundation

- Expand sitemap to all public canonical pages.
- Add dynamic metadata and canonical URLs.
- Add sitewide Organization/WebSite/SearchAction JSON-LD.
- Add BreadcrumbList JSON-LD and visible breadcrumbs.
- Add intentional robots policy.
- Verify Cloudflare/Vercel bot access.
- Create SEO QA script that fetches key routes and checks title, description, canonical, h1, JSON-LD, indexability, and status code.
- Add the SEO page qualification template and make it mandatory before any net-new guide or comparison page enters drafting.

#### Days 15-30: Resort and Activity Page Upgrade

- Upgrade `/today`.
- Upgrade `/tonight`.
- Launch `/disney-world-resort-activity-calendars`.
- Upgrade top 10 resort pages by likely demand:
  - Polynesian Village
  - Contemporary
  - Grand Floridian
  - Fort Wilderness
  - Wilderness Lodge
  - Beach/Yacht Club
  - BoardWalk
  - Art of Animation
  - Pop Century
  - Port Orleans French Quarter/Riverside
- Upgrade top 10 activity pages:
  - Movies Under the Stars
  - Campfires
  - Scavenger hunts
  - Poolside activities
  - Crafts
  - Mosaic classes
  - Painting
  - Community halls
  - Arcades
  - Fitness/yoga
- Add Event/ItemList JSON-LD where valid.
- Add visible source/freshness blocks.
- Add the first data fields for weather fit, audience fit, and route complexity where they are needed by top pages.

#### Days 31-45: Hub and Guide Cluster

- Launch non-park day guide.
- Launch free resort activities guide.
- Launch resort hopping guide.
- Launch first-night/check-in-day guide.
- Launch rainy-day resort activities guide.
- Add internal links between guides, resort pages, activity pages, and today/tonight.
- Require research dossiers for each guide and preserve source/evidence logs for future updates.

#### Days 46-60: Seasonal and Comparative Authority

- Launch Summer 2026 current activities page.
- Prepare Fall 2026 calendar page before calendars switch.
- Add "best resort for..." comparison guides:
  - best resort activities for kids
  - best resort activities for adults
  - best resorts for a rest day
  - best resorts for evening entertainment
  - best resorts for Movies Under the Stars
  - best resorts for campfires
  - monorail, Skyliner, BoardWalk, and Fort Wilderness activity guides
- Add update badges and freshness summaries.
- Use build/merge/reject decisions before adding any new comparison page.

#### Days 61-90: Optimization Loop

- Use Search Console query data to refine titles and intros.
- Add missing internal links for pages with impressions but low CTR.
- Improve pages ranking positions 4-15.
- Add real photos or high-quality allowed imagery where possible.
- Validate rich results and fix structured-data errors.
- Compare AI search citations weekly and adjust pages for clarity, not keyword stuffing.
- Use Bing AI Performance to find cited pages and grounding phrases.
- Prune or consolidate weak pages before they become thin-content liabilities.

## Definition of "Second to None"

We should not judge success only by rank #1 for a few vanity terms. The site should become second to none when:

- Every canonical resort and activity page is indexed.
- The site owns top 3 positions for most resort/activity calendar long-tail queries.
- The calendar hub competes directly with or beats Magical Resort Guide for resort activity calendar terms.
- The non-park-day guide competes directly with Mama's on Vacation for planning intent.
- Today/tonight pages earn impressions for current-intent searches.
- ChatGPT Search and other AI tools can retrieve and cite the site for current Disney resort activity questions.
- Search engines can fetch the same useful content users see.
- Users can land on any page and immediately understand what is current, what is verified, what is unofficial, and what to do next.
- No SEO page exists unless it is also a useful product landing page.

## Highest-Leverage First Build

The first implementation sprint should be:

1. Public crawl unblock and noindex audit.
2. SEO page qualification gate and research dossier template.
3. Sitemap expansion.
4. Dynamic metadata/canonicals.
5. JSON-LD helper layer.
6. Current-first answer/freshness modules.
7. Resort page SEO template.
8. Activity page SEO template.
9. Current activity calendar hub.
10. Non-park-day guide.
11. IndexNow and Cloudflare crawler QA.

That gives search engines more URLs, more clarity, richer context, and stronger user-facing pages without waiting for a massive content program.
