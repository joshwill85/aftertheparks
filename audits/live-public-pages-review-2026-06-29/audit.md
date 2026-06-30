I re-reviewed the live public pages and page templates I could fetch. One important limitation: the crawler could not fetch `/calendar` successfully; it returned a failed `400 OK` response in the browsing tool, so I could not inspect the full rendered calendar page the same way I inspected the other pages. That itself is worth investigating because a planning/calendar page should return a clean HTML shell for crawlers and previews. I applied the same recommendations to Calendar/Plan Ahead based on the visible navigation, the related Today/Tonight/My Plan patterns, and the dark weather-card issue you flagged. 

The site has improved language in several places since the earlier audit: the homepage now leads with “Disney resort activities, today and tonight,” freshness, verified rows, and clear CTAs, which is much stronger than a vague “magic” opener. But the current product still has three major problems: **backend language leaking into visitor copy, data/OCR glitches that damage trust, and too many page templates exposing the database instead of guiding the guest.** ([After the Parks][1])

---

# First: what pushes people away vs. what grounds them

## What pushes people away

People leave when they cannot quickly tell what the site does. NN/g’s classic web behavior research says users often leave pages within **10–20 seconds**, and pages need a clear value proposition quickly to keep them. Your homepage is now close to this standard, but many deeper pages still make visitors interpret internal terms like “currently tracked,” “source-backed,” “matching activities,” “planning modules,” and “reusable editorial risk log.” ([Nielsen Norman Group][2])

People do not read websites like documents; they scan. NN/g’s research says users scan web pages instead of reading word-by-word, and their study on concise, scannable, objective copy found large usability improvements when copy was shortened, structured, and stripped of promotional or low-value wording. This matters heavily for After the Parks because your users are often tired, on phones, outdoors, with kids, trying to make a decision quickly. ([Nielsen Norman Group][3])

Trust breaks fast when users see errors. Stanford’s web credibility guidelines emphasize making information easy to verify, showing real-world trust signals, making contact easy, and avoiding errors, including typos and broken links. Your site is doing some of this well with source/freshness language, but visible OCR glitches, impossible times, contradictory reservation language, and broken age/cost text are credibility leaks. ([Web Credibility Project][4])

Choice overload also pushes people away. Baymard’s product-list and filtering research emphasizes that filters help users narrow large sets into manageable options, but poor filter design makes users struggle to find relevant items. Your Activities page has powerful filters, but it also exposes too many filters with labels that are not always guest-centered. ([Baymard Institute][5])

Low contrast pushes people away, especially on mobile. WCAG 2.2 requires **4.5:1 contrast for normal text** and **3:1 for large text** at AA, while AAA raises that to **7:1 for normal text**. For dark weather cards, I would target AAA for important text because this is functional planning content, not decoration. ([W3C][6])

Motion can help, but constant decorative animation distracts. NN/g and Material Design both frame motion as useful when it explains relationships, gives feedback, or guides attention; it becomes harmful when it competes with the task or runs constantly. W3C also flags motion-triggered animation as a vestibular accessibility issue if users cannot reduce or disable it. ([Nielsen Norman Group][7])

## What grounds people in the site

The site should repeatedly answer:

**Where am I?**
“Today at Disney World Resorts,” “Tonight at Disney World Resorts,” “Activities at Pop Century,” “Free resort activities near you.”

**Can I trust this?**
“Verified Jun 29, 2026,” “Official source checked,” “Confirm before you go,” “Weather-sensitive,” “Access may be limited.”

**What should I do next?**
“Start with your resort,” “Choose indoor backup,” “Add to My Plan,” “Check tonight,” “Confirm transportation.”

**Is this worth the effort?**
“Good if you are already nearby,” “Worth traveling for,” “Best for arrival night,” “Not worth crossing property for.”

That last one is a huge opportunity. Disney planners do not only need lists. They need judgment.

---

# Top findings across the whole site

## 1. The homepage is now directionally strong

The homepage’s current H1, “Disney resort activities, today and tonight,” is clear. The freshness block is also useful: “Last verified Jun 29, 2026,” “99 verified activity rows,” and “20 official sources” are grounding trust signals. Keep that direction. ([After the Parks][1])

But the homepage still needs tighter card copy. Movie cards and activity cards sometimes include long imported descriptions where a guest mainly needs time, location, cost, weather, and whether it is worth doing.

## 2. Internal/product-development language is still leaking

Examples include “currently tracked,” “source-backed,” “source text says,” “reusable editorial risk log,” “thin one-off pages,” “soft planning only,” and “fixed-time activities should not receive exact timing recommendations.” These are not visitor-facing phrases. They make the site feel generated or unfinished. ([After the Parks][8])

## 3. Data-quality glitches are the biggest credibility risk

Examples I found include “ages I2,” an impossible time range of “10:30 AM – 10:15 AM,” “is a activity activity,” “Other activity activities,” broken OCR text like “WI! LD Ww ILDERNESS BINGO,” incomplete booking text, and a campfire being described as “Mostly indoor.” These need to be treated as launch blockers, not polish. ([After the Parks][9])

## 4. Filters are powerful but too database-first

The Activities page has filters for need, cost, weather, transportation, resort area, and category, but labels like “Plan by need,” “Practical,” “Category 1,” and “Source-backed indoor or covered fit” are not plain enough. ([After the Parks][9])

## 5. My Plan is the biggest untapped product feature

The visible My Plan page currently supports stay details and saved activities, but it does not yet present the more exciting value: multiple day plans, timeline conflicts, transportation edges, “too much walking,” return-route warnings, weather swaps, or “is this plan realistic?” guidance. ([After the Parks][10])

---

# PASS 1 — Language and content audit

## Global language rules

Use this as the sitewide voice rule:

> **Write like a calm Disney-planning friend who checked the schedule, knows the caveats, and wants the guest to avoid wasted travel.**

That means:

Use:

> Start with your own resort.

> Good if you are already nearby.

> Confirm access before crossing property.

> Weather-sensitive.

> Indoor or covered backup.

> Reservation required.

> Worth traveling for.

Avoid:

> Source-backed.

> Currently tracked.

> Planning posture.

> Matching rows.

> Source text says.

> Reusable editorial risk log.

> Soft planning only.

> Thin one-off pages.

> Activity activity.

---

## Global delete-and-replace list

These exact phrases should be removed or rewritten wherever they appear.

| Current phrase                                                          |                            Problem | Replace with                                                          |
| ----------------------------------------------------------------------- | ---------------------------------: | --------------------------------------------------------------------- |
| “Source-backed”                                                         |            Jargon; sounds internal | “Verified from a source” or just “Verified”                           |
| “Currently tracked”                                                     |                  Database language | “Currently listed” or “Current activity”                              |
| “Current matching activities”                                           |           Search/database language | “Current activities”                                                  |
| “Source text says all ages”                                             |   Backend reasoning shown to users | “Listed for all ages”                                                 |
| “Source-backed minimum age is 12”                                       |                  Backend reasoning | “Ages 12 and up”                                                      |
| “Source-backed reservation requirement is present”                      |                  Backend reasoning | “Reservation required. Confirm availability before you go.”           |
| “Plan by need”                                                          |                              Vague | “Popular needs”                                                       |
| “Practical”                                                             |                          Too broad | “Cost and booking”                                                    |
| “Weather backup”                                                        |                 OK but less direct | “Weather fit”                                                         |
| “Category 1”                                                            |                       Broken label | “Category”                                                            |
| “Soft planning only”                                                    |               Internal instruction | Delete                                                                |
| “Fixed-time activities should not receive exact timing recommendations” |               Internal instruction | Delete                                                                |
| “Reusable editorial risk log”                                           |          Internal editorial system | Delete                                                                |
| “Evidence / Severity” on guide pages                                    | Audit language, not guest language | Rewrite as “Why this matters”                                         |
| “Thin one-off pages”                                                    |                       SEO/internal | Delete                                                                |
| “Activity activity”                                                     |                   Grammar/data bug | “Activity” or specific category                                       |
| “Other activity activities”                                             |                   Grammar/data bug | “More activities”                                                     |
| “Outdoor plans OK”                                                      |      Too casual for weather/safety | “Outdoor plans look OK right now”                                     |
| “Clear should be manageable”                                            |                              Vague | “Outdoor activities are reasonable right now. Keep checking weather.” |

---

## Data-quality copy bugs to fix immediately

These should be treated as trust blockers.

### 1. Age typo

Current:

> ages I2

Replace with:

> ages 12 and up

Or, if the source is uncertain:

> Age requirement unclear. Confirm before you go.

This appears in a Yacht Club activity listing and looks like OCR mistaking `12` for `I2`. ([After the Parks][9])

---

### 2. Impossible time range

Current:

> 10:30 AM – 10:15 AM

Replace temporarily with:

> Time unclear. Confirm with the resort before planning around this.

Then only publish the corrected time once verified. This appears on a Storytime Yoga listing. ([After the Parks][9])

---

### 3. Broken OCR activity title

Current:

> WI! LD Ww ILDERNESS BINGO

Replace with:

> Wilderness Bingo

Only if verified from source. If not verified, suppress the listing until cleaned. ([After the Parks][9])

---

### 4. Broken grammar on activity detail pages

Current:

> Tasteful Artistry at Wilderness Lodge Resort is a activity activity…

Replace with:

> Tasteful Artistry is a paid craft activity at Disney’s Wilderness Lodge Resort.

The page also says reservation details are not currently tracked while the description says reservations are available and “To book, please call” without a phone number. That is a direct trust conflict. ([After the Parks][11])

Use this until the booking data is fixed:

> Booking details are incomplete in the current data. Confirm with the official source before planning around this activity.

---

### 5. Wrong weather fit for outdoor activities

Current campfire page text includes:

> Mostly indoor

Replace with:

> Outdoor and weather-sensitive

Campfires should never be labeled mostly indoor. ([After the Parks][12])

---

### 6. Broken punctuation/capitalization

Current:

> Outside of the Artist’S Palette

Replace with:

> Outside The Artist’s Palette

Or better:

> Outside The Artist’s Palette at Saratoga Springs

This appears on a movie listing. ([After the Parks][13])

---

### 7. Missing spacing between resort and area

Current:

> Kidani VillageatDisney's Animal Kingdom Resort Area

Replace with:

> Kidani Village at Disney’s Animal Kingdom Resort Area

This appears in filtered activity results. ([After the Parks][14])

---

# Homepage language audit

The homepage now does several important things right: it states the core value, gives freshness/source counts, and offers clear paths into Today, Tonight, Activities, Resorts, Guides, Weather, Calendar, and My Plan. ([After the Parks][1])

## Keep

Keep:

> Disney resort activities, today and tonight

Keep:

> Find something fun to do outside the parks.

Keep the freshness block, but make sure the source counts are consistent across the site. The homepage says **99 verified activity rows from 20 official sources**, while the Resorts page says **29 verified activity rows from 12 official sources**. That may be because the scopes differ, but visitors will not know that. Label the scope clearly. ([After the Parks][1])

### Replace homepage source block with

> **How current is this?**
> Sitewide activity data was last verified Jun 29, 2026. We currently show 99 verified activity rows from 20 official sources. Schedules can change, so confirm important details before you go.

On the Resorts page, use:

> **Resort calendar coverage**
> Resort activity calendars were last verified Jun 29, 2026. This page shows 29 dated resort-calendar activities from 12 official sources.

That explains why the numbers differ.

## Movie cards are too verbose for the homepage

Current movie cards include movie metadata, resort, location, date, runtime, and repeated confirmation language. That is mostly useful, but the card needs a stronger hierarchy. ([After the Parks][1])

### Replace homepage movie-card format with

> **Tonight: The Lion King**
> Outdoor movie at Disney’s BoardWalk Inn
> **When:** 8:30 PM
> **Where:** Village Green
> **Cost:** Free
> **Before you go:** Confirm showtime and weather.

Do not repeat “Confirm showtime…” in multiple places on the same card.

## Activity cards need “why this matters”

Some current activity descriptions are imported Disney-style descriptions, such as arcade and pool descriptions. These can be charming, but listing cards should answer the planning decision first. ([After the Parks][1])

### Replace long generic activity-card copy with

> **Good indoor backup**
> Paid arcade games inside the resort. Best for rain breaks, arrival day, or kids who need a low-effort activity.

For pool activities:

> **Weather-dependent pool activity**
> Casual poolside games or recreation. Pool access may be limited to resort guests.

For crafts:

> **Hands-on craft activity**
> Confirm cost, age fit, location, and whether a reservation is needed.

---

# Today page language audit

The Today page’s current purpose is clear: “Activities still available today, sorted by start time.” Keep that. ([After the Parks][15])

## Weather language needs to be more precise

Today currently uses:

> Outdoor plans OK
> Clear should be manageable for most resort plans.

This is understandable, but too casual. Also, indexed Today snippets showed very hot temperatures while still using an “Outdoor plans OK” framing, which can feel misleading if the heat index is high. ([After the Parks][15])

### Replace with status-based copy

For clear, comfortable weather:

> **Outdoor plans look OK right now**
> Pools, walks, campfires, and outdoor movies are reasonable options. Keep checking if rain, lightning, heat, or wind changes.

For heat:

> **Heat may affect outdoor plans**
> Choose shade, water, indoor breaks, and shorter walks. Save longer resort hops for cooler windows.

For rain risk:

> **Rain may affect the next hour**
> Choose indoor or covered activities first. Keep pools, campfires, outdoor movies, boats, and long walks as backups.

For storms:

> **Storm risk: avoid outdoor plans**
> Avoid pools, boats, campfires, outdoor movies, and exposed walking routes until conditions improve.

## Add urgency labels to Today cards

Today is not just a list. It is a decision tool. Add:

> Starting soon

> Still available

> Already started

> Good backup now

> Too late today

### Example card rewrite

Current style:

> [Activity]
> Resort / day / time / weather details / Add to My Plan

Use:

> **Starting soon: Campfire on de’ Bayou**
> Port Orleans French Quarter
> **When:** 6:30–7:30 PM
> **Where:** Campfire area
> **Cost:** Free unless supplies are sold separately
> **Weather:** Outdoor and weather-sensitive
> **Before you go:** Confirm location and weather.

---

# Tonight page language audit

Tonight is one of the strongest page concepts on the site. The page title and description are useful: “Low-effort movies, campfires, games, and activities after the parks.” ([After the Parks][13])

## Reduce repeated confirmation language

Movie cards currently repeat similar lines about confirming showtime, posted schedule, weather, and source details. The warning is important, but repeating it on every line makes the cards feel heavier than needed.

### Use one “Before you go” line

> **Before you go:** Confirm showtime, weather, and resort access.

For resort-guest-only activities:

> **Access note:** May be limited to guests staying at this resort.

For movies:

> **Weather:** Outdoor movie; confirm if rain or lightning is nearby.

## “No booking required” filter needs clearer wording

Current:

> No booking required
> Only when source evidence says walk-up/no booking.

This is too backend-ish. ([After the Parks][13])

Replace with:

> **No reservation needed**
> Source suggests this is walk-up or does not require booking.

Or shorter:

> **No reservation needed**
> Walk-up or no booking noted by source.

---

# Calendar / Plan Ahead page audit

I could not inspect the full `/calendar` page because it failed in the crawler. That should be investigated. A calendar/planning page should return a valid HTML shell, metadata, and crawlable page title even if parts hydrate client-side. 

## Calendar should not feel like another Activities page

The Calendar page should answer:

> “What should we do on a specific day of our trip?”

Not:

> “Here is the full database with a date filter.”

## Recommended Calendar hero

> **Plan by date**
> Pick a day of your trip to see resort activities, weather context, and easy backup ideas.

## Calendar controls

Use these visible controls first:

> Today
> Tomorrow
> This weekend
> Trip dates
> Choose a date

Then show:

> Resort
> Time of day
> Free
> Indoor or covered
> Category

## Calendar card copy

For a day:

> **Tuesday, Jun 30**
> 64 activities currently listed
> Best windows: morning indoor activities, evening movies if weather holds
> Watch-outs: heat, rain risk, transportation after dinner

For dates outside weather range:

> **Weather not available yet**
> Activity schedules may be listed, but weather guidance will appear closer to the date.

## Calendar dark weather cards

Use the same dark-card accessibility standard from the previous answer: key text should target AAA contrast, metadata should still meet at least AA, and decorative gradients should sit behind a dark scrim, not behind raw text.

---

# Activities page audit

The Activities page is powerful but filter-heavy. The current intro says users can browse by time, resort, activity type, cost, weather fit, and no-park-day planning intent. That is accurate, but “planning intent” sounds like a product taxonomy, not guest language. ([After the Parks][9])

## Replace page intro

Current:

> Browse current Walt Disney World resort activities by time, resort, activity type, cost, weather fit, and no-park-day planning intent.

Use:

> Browse current Disney resort activities by resort, time, cost, category, and weather fit.

Or even simpler:

> Find current resort activities by time, place, cost, and what your group needs.

## Rename filter groups

Current labels include “Plan by need,” “Practical,” “Weather backup,” “Transportation,” and “Category 1.” ([After the Parks][9])

Use:

| Current            | Replace with                 |
| ------------------ | ---------------------------- |
| Plan by need       | Popular needs                |
| Practical          | Cost and booking             |
| Weather backup     | Weather fit                  |
| Transportation     | Getting there                |
| Category 1         | Category                     |
| Rain backup        | Indoor or covered            |
| Reservation needed | Reservation required         |
| Free today         | Free                         |
| Bus/Rideshare      | Easy by bus or rideshare     |
| Walkable           | Walkable from nearby resorts |

## Hide low-value filters behind “More filters”

Transportation filters like Bus/Rideshare can become low-value if they apply to nearly everything. On the Activities page, some transportation filters have very high counts, which makes them less useful as primary filters. ([After the Parks][9])

Primary filters should be:

> Resort
> Time
> Free
> Indoor or covered
> Category
> Good for kids
> Tonight

Secondary filters:

> Booking required
> Adults
> Resort area
> Transportation
> Source freshness

## Add filter explanation chips

When a user selects filters, show:

> Showing 18 activities: Free + Indoor or covered + Tonight

This helps people trust the result set.

---

# Category pages audit

The category-filter URLs work at least at the URL-state level: `free=true`, `category=poolside`, `category=campfire`, and `category=arcade` return filtered pages with selected filter chips. But the page title often remains generic, and the filter label can show “Category 1,” which feels broken. ([After the Parks][14])

## Problem: filtered pages do not always speak like category pages

For `category=campfire`, the page should not still feel like a generic Activities page.

### Campfire page rewrite

> **Disney Resort Campfires**
> Browse current campfire listings by resort, time, cost, and weather risk.

Add:

> Campfires are outdoor and weather-sensitive. Confirm location, supplies, and resort access before you go.

### Poolside page rewrite

> **Disney Resort Poolside Activities**
> Browse pool games and poolside recreation currently listed at Disney resort hotels.

Add:

> Pool access is usually limited to guests staying at that resort.

### Arcade/Games page rewrite

The URL `category=arcade` appears to map visually to “Games.” Choose one naming convention. Do not make the URL say arcade while the chip says games unless the page title explains it. ([After the Parks][16])

Use:

> **Arcades and Games at Disney Resorts**
> Indoor games, arcade options, and low-effort backups for rain, heat, or arrival day.

## Hide the selected category from the filter wall

If I am already on Campfires, do not make me process every category again at the top. Show:

> Campfire selected
> Change category

Then collapse the full category list.

---

# Resorts index audit

The Resorts index is useful and has a good purpose: choose a resort to see activities, tonight’s options, free activities, weather notes, and source freshness. ([After the Parks][17])

## Fix source-count inconsistency

As noted above, homepage and Resorts page show different verified activity/source totals. That may be valid by scope, but the labels should explain the scope. ([After the Parks][1])

## Resort cards need more unique decision help

Current resort cards use phrases like:

> Best for: quick plans, family activities, and easy evening options.

That is useful, but it becomes repetitive. Instead, each resort card should say why that resort is different.

### Replace generic resort-card copy with

For value resorts:

> **Best for:** simple evening plans, poolside fun, and kid-friendly activities close to your room.

For monorail resorts:

> **Best for:** low-effort dining, Magic Kingdom-area atmosphere, and easy resort hopping.

For Epcot-area resorts:

> **Best for:** evening walks, BoardWalk atmosphere, dining, and low-effort adult plans.

For Fort Wilderness:

> **Best for:** campfires, outdoor activities, quiet resort time, and a full no-park day.

## Add “worth traveling for” language

A guest needs to know whether a resort is worth leaving their current location.

Use labels:

> Best if staying here

> Worth visiting if nearby

> Worth a dedicated trip

> Not worth crossing property for

That is high-value judgment.

---

# Resort detail page audit

Resort detail pages include valuable elements: activity lists, source/caveat sections, FAQs, transportation notes, and links to related pages. But the pages can feel repetitive and sometimes expose the data system instead of helping the guest. ([After the Parks][18])

## Recommended resort-page structure

Use this order:

1. Resort name and today/tonight summary
2. What’s happening today
3. Best options tonight
4. Free or low-cost options
5. Indoor/weather backups
6. Anytime resort options
7. Transportation and access notes
8. Source freshness
9. More nearby resorts/guides

## Replace “Official Disney recreation offerings that are not tied to a dated calendar time”

Current resort pages use language like:

> Official Disney recreation offerings that are not tied to a dated calendar time.

That is accurate but clunky. ([After the Parks][19])

Replace with:

> **Anytime resort options**
> These are resort activities or amenities that may not have a specific calendar time. Confirm hours, access, and availability before you go.

## Move access restrictions higher

If something is “resort guests only,” it should appear in the card summary, not buried later. Some resort pages already include “Resort guests only” for certain amenities, but access rules need to be standardized and more prominent. ([After the Parks][20])

Use:

> **Access:** Resort guests only.

Or:

> **Access:** May be limited to guests staying at this resort.

Or:

> **Access:** Confirm before traveling from another resort.

## Shorten repeated caveats

The Disney Springs transportation caveat is important, but long repeated paragraphs can become noise. Use the short version on cards and resort pages:

> **Transportation note:** Do not use Disney Springs as a free resort-transfer hub. Confirm resort access and return transportation before you go.

Keep the longer version on the Source and Accuracy page. ([After the Parks][21])

---

# Activity detail page audit

Activity detail pages are where trust matters most. Current pages have useful sections, but they also show database phrases like “currently tracked,” “Activity planning snapshot,” “source-backed listings,” and internal instructions like “Soft planning only.” ([After the Parks][8])

## Replace current activity-detail structure

Use this structure:

> **[Activity Name] at [Resort]**
> [One sentence that explains what it is and who it helps.]
>
> **When:** [time/date]
> **Where:** [location]
> **Cost:** [free/paid/unclear]
> **Reservation:** [required / not required / unclear]
> **Access:** [resort guests only / confirm / open access unclear]
> **Weather:** [indoor / covered / outdoor and weather-sensitive]
>
> **Before you go:** Confirm the posted schedule, location, weather, and access rules.

Then:

> What to expect
> Good fit
> What to confirm
> More at this resort
> Source and freshness

## Groovy Campfire rewrite

Current page has useful content but duplicates location and incorrectly labels the activity as mostly indoor. ([After the Parks][12])

Use:

> **Groovy Campfire at Disney’s Pop Century Resort**
> Outdoor evening campfire near Surfer Goofy. Good for a low-key resort night if weather holds.
>
> **When:** Tue, Jun 30, 6:30–7:30 PM
> **Where:** By Surfer Goofy
> **Cost:** Not confirmed
> **Access:** May be limited to guests staying at this resort
> **Weather:** Outdoor and weather-sensitive
>
> **Before you go:** Confirm the posted schedule, weather, and whether supplies are included or sold separately.

Delete:

> Soft planning only

Delete:

> Fixed-time activities should not receive exact timing recommendations.

## Family Wellness Yoga rewrite

The current page includes “currently tracked” language and says the activity is limited to resort guests lower in the page. The resort-guest limitation should move to the top. ([After the Parks][22])

Use:

> **Family Wellness Yoga at Disney’s BoardWalk Inn**
> Morning yoga activity at Shipwreck Beach. Good for guests staying at the resort who want a slower start to the day.
>
> **When:** 8:30–9:00 AM
> **Where:** Shipwreck Beach
> **Cost:** Free
> **Access:** Limited to guests staying at the resort
> **Weather:** Outdoor or weather-sensitive; confirm location before you go.

## Tasteful Artistry rewrite

The current page has grammar bugs and contradictory booking data. ([After the Parks][11])

Use until data is fixed:

> **Tasteful Artistry at Disney’s Wilderness Lodge Resort**
> Paid craft activity at Wilderness Lodge. Booking details are incomplete in the current data, so confirm with the official source before planning around it.
>
> **Cost:** Paid
> **Reservation:** Unclear — confirm before you go
> **Access:** Confirm before traveling from another resort
> **Before you go:** Check the official source for current price, booking instructions, and location.

Delete:

> is a activity activity

Delete:

> Other activity activities

Delete:

> To book, please call

Unless the phone number is actually present.

---

# Weather page audit

The Weather page is one of the site’s strongest differentiators. The current H1, “Is it a good time for resort activities?” is excellent. It is plain, task-based, and specific. ([After the Parks][23])

## What to improve

The page is long and repeats similar weather phrasing across area cards. Phrases like “Clear should be manageable for most resort plans” are serviceable but not as actionable as they could be. ([After the Parks][23])

## Replace repeated weather text with decision labels

Use these statuses:

> **Good for outdoor plans**

> **Use indoor backups first**

> **Heat caution**

> **Storm risk**

> **Rain nearby**

> **Transportation-sensitive weather**

## Replace

> Clear should be manageable for most resort plans.

With:

> Outdoor activities are reasonable right now. Keep checking for rain, lightning, heat, or wind.

## Replace

> Rain possible soon

With:

> Rain may affect the next hour.

## Replace

> Rain looks unlikely in next hour based on forecast guidance, but this is not radar-confirmed.

With:

> Rain looks unlikely in the next hour. This is forecast guidance, not live radar.

## Add action-based weather sections

Instead of only showing weather by area, add:

> **Best outdoor windows today**

> **Best indoor backup areas**

> **Avoid for now**

> **Transportation watch-outs**

Example:

> **Avoid for now:** pools, boats, long walks, campfires, and outdoor movies if lightning is nearby.

---

# My Plan language audit

The visible My Plan page is clear but underpowered. It says “Save activities and build one easy resort-day plan,” includes stay details, and shows an empty state with links. That is a good foundation. ([After the Parks][10])

## Improve emotional motivation

Current empty state:

> No saved activities yet.

Use:

> **Your resort day starts here.**
> Save a few ideas, then we’ll help you spot timing, weather, and transportation conflicts.

## Add clearer CTAs

Use:

> Add activities for today

> Add tonight’s options

> Choose my resort first

> Build a rain backup

## If multiple plans are supported, make that visible

Use:

> **Plans**
> Create one plan for each trip day, resort day, or backup scenario.

Buttons:

> New day plan

> Duplicate this plan

> Make a rainy-day version

---

# Search page audit

Search is clear, but the heading is too generic and “Ask like a concierge” may overpromise if search is not truly natural-language aware. ([After the Parks][24])

## Replace heading

Current:

> Search

Use:

> **Search After the Parks**

## Replace description

Current:

> One search across activities, resorts, movies, guides, and categories — best matches first.

Use:

> Search activities, resorts, movies, guides, and categories.

## Replace “Ask like a concierge”

Use:

> **Search by what you need**

Examples:

> campfire tonight
> rainy day near BoardWalk
> free activity at Polynesian
> movie after dinner
> indoor activity for kids

If search truly supports natural language later, then use:

> Ask for the plan you need.

But only if the engine can handle it.

---

# Guides index audit

The Guides index is much improved from the earlier version. It now groups by situation: rest day, weather, arrival night, exploring, and simple logistics. That is good. ([After the Parks][25])

## Main issue: too many guide cards

There are many guide cards, especially “Best Disney Resorts for…” pages. This can become overwhelming. ([After the Parks][25])

## Recommended structure

At the top:

> **Start with your situation**

Then five big tiles:

> I need a rest day
> The weather looks bad
> We just arrived
> We want to explore resorts
> I need a simple plan

Then secondary sections:

> Popular guides

> Resort rankings

> Transportation-light plans

> Group-specific plans

Move the Disney Springs transportation warning lower or into a collapsible note. It is important, but it should not dominate the top of the Guides index.

---

# Long guide page audit

The Non-Park Day guide has a strong topic, but it still exposes editorial scaffolding: “Editorial review,” “What changed in this update,” “Planning modules,” “thin one-off pages,” and “Planning quality checks.” Some of that is useful internally, but it makes the public page feel like a content system rather than a helpful guide. ([After the Parks][26])

## Replace the top of the Non-Park Day guide

Current opening is close, but the first practical section should be sharper.

Use:

> **How to Plan a Disney World Non-Park Day**
> Build a relaxed Disney day with resort activities, pool time, meals, backups, and evening plans — without entering a theme park.
>
> **Quick answer**
> Start at your own resort. Pick one easy anchor — pool time, a meal, a craft, a movie, or a campfire — then add one nearby backup for rain, heat, or tired kids. Confirm time, cost, access, weather, and transportation before leaving your resort.

## Replace “Start here” bullets

Current bullets are too repetitive and generic. Use:

> **Start here**
>
> 1. Check today and tonight at your resort.
> 2. Choose one easy anchor activity.
> 3. Add one backup that is indoor, covered, or nearby.
> 4. Avoid crossing property unless the activity is worth the travel.
> 5. Confirm access and return transportation before you go.

## Delete

> Use these scenario checks to build a complete non-park plan without creating thin one-off pages.

Replace with:

> **Choose the plan that fits your day**

## Rewrite mistakes section

Instead of:

> Evidence
> Severity

Use:

> **Mistake:** Crossing property for one small activity
> **Why it matters:** Travel can take longer than the activity itself.
> **Better plan:** Start at your own resort, then add one nearby backup.

That keeps the useful thinking but removes internal audit language.

---

# Ranking guide page audit

Ranking pages have promise, but they currently feel too much like data reports. On pages like “Best Disney Resorts for Teens,” the page shows “Editorial review,” “What changed in this update,” live data snapshots, zero ranked resorts, and internal scoring language. ([After the Parks][27])

## For zero-data ranking pages

Current:

> Resorts with enough data: 0
> Ranked resorts 0

This feels broken, even if the honesty is good.

Use:

> **We do not have enough current data to rank this confidently yet.**
> We do not want to guess. Start with current activities below, then confirm schedules, access, and transportation before you go.

For teens:

> We do not have enough current teen-specific data to rank resorts confidently yet. Start with arcades, games, evening activities, food-nearby options, and transportation-simple plans.

For adults:

> We do not have enough current adult-specific data to rank resorts confidently yet. Start with lounges, dining areas, scenic walks, wellness activities, and evening options you can confirm.

For campfires:

> We do not have enough current campfire data to rank resorts confidently yet. Start with tonight’s campfires, then confirm weather, supplies, and access.

## For ranking pages with data

Current cards use “matching activities” and scores. On the “Best Disney Resorts for Activities Today” page, ranked resort cards include counts like “4 current matching activities.” ([After the Parks][28])

Use:

> **Why it ranks well**
> Multiple current activities, useful evening options, and enough variety for a resort day.

Then show data below:

> Current activities: 4
> Free options: 2
> Evening options: 1
> Last verified: Jun 29, 2026

The judgment should come before the database facts.

---

# About page audit

The About page is one of the most human parts of the site. Keep the personal story. It explains why the site exists and why Josh is credible as a parent/planner. ([After the Parks][29])

## What to tighten

The origin story is a little long before the visitor gets the practical “what this does” answer. The “names I wanted were taken” tangent is charming but low-value near the top.

## Replace the top with

> **I built After the Parks because our family needed it.**
>
> I’m Josh — a Florida dad, over-planner, and data person. After booking a Fort Wilderness cabin staycation, I realized the best resort activities were scattered across PDFs, images, calendars, and resort pages.
>
> After the Parks is the planning layer I wish I had: current resort activities, simple filters, source dates, weather notes, and practical caveats before you go.

## Move or delete

Move lower or delete:

> The names I wanted most were already taken…

Keep the emotional idea that you are becoming a Disney person, but tighten it:

> I did not set out to become a Disney person. I set out to make one family trip easier. Somewhere along the way, the planning became part of the magic.

That is strong.

---

# Corrections page audit

The Corrections page is simple and useful. It says users can send outdated, missing, or confusing activity info. ([After the Parks][30])

## Add helper copy

Use:

> Include the resort, activity name, date, time, and what looks wrong. If you have an official source or photo of a posted schedule, include that too.

## Replace button

If the button says “Send note,” that is okay. “Send correction” is slightly clearer.

Use:

> Send correction

## Add expectation setting

> We may not be able to reply to every message, but corrections help keep the site useful.

---

# Source and Accuracy page audit

This page is important and mostly good. It explains independence, sources, what verified means, and corrections. ([After the Parks][21])

## Strengthen “verified” language

Use:

> **What “verified” means**
> Verified means we found and checked a source on the date shown. It does not guarantee the activity will run exactly as listed. Weather, staffing, private events, refurbishments, and resort operations can change.

## Keep the Disney Springs warning, but make the short version reusable

Use this short version on other pages:

> Do not use Disney Springs as a free resort-transfer hub. Confirm resort access and return transportation before you go.

Keep the longer version on the Source page.

---

# Privacy and Terms audit

These pages are fine and lower priority. They are clear enough, but one or two phrases can be plainer. ([After the Parks][31])

## Privacy replacement

Use:

> **Privacy Policy**
> What we collect, why we collect it, and how we use it.

## Terms replacement

Use:

> Activity times, transportation, access rules, prices, weather, and availability can change. After the Parks helps you plan, but you should confirm important details with Disney or the official source before relying on them.

---

# PASS 2 — Visual and animation audit

## Visual direction: “practical magic”

The site should not look like a corporate database, and it also should not mimic Disney’s brand too closely. The sweet spot is:

> **Practical magic: useful planning cards with warmth, atmosphere, and small moments of delight.**

That means:

* clear cards
* strong contrast
* warm gradients
* resort-area identity
* tasteful iconography
* subtle motion
* hidden details for Disney people
* no copyrighted character usage or anything that implies Disney affiliation

## Dark weather cards: fix first

The dark weather cards need to be treated as functional safety/planning surfaces. Use beautiful atmospheric backgrounds, but put the actual text on a controlled dark plane.

### Recommended style

* Deep navy base
* Dark scrim behind text
* White or near-white primary text
* Light blue-gray secondary text
* Readable chips for metadata
* No low-opacity gray for important information

### Use these tokens

```css
:root {
  --weather-bg: #07111F;
  --weather-bg-2: #101D2F;
  --weather-panel: rgba(3, 9, 18, 0.84);
  --weather-panel-strong: rgba(3, 9, 18, 0.92);

  --weather-text-primary: #FFFFFF;
  --weather-text-body: #EAF2FA;
  --weather-text-muted: #D2DEEA;

  --weather-border: rgba(255, 255, 255, 0.18);
  --weather-chip-bg: rgba(255, 255, 255, 0.12);
}
```

Avoid:

```css
color: rgba(255,255,255,.55);
```

for real information.

## Add “day-to-night” storytelling

Your brand idea is already “After the Parks.” Visually, that should feel like a day moving into evening.

Add a subtle page-level gradient story:

* Homepage top: warm afternoon glow
* Tonight page: twilight blue/purple
* Weather page: deep sky with weather-state accents
* My Plan: starlight planning surface
* Calendar: sunrise-to-starlight date cards

This ties the site together emotionally without adding words.

## Hidden Mickeys: yes, but subtle

Hidden Mickeys are a great fit because Disney people love noticing details. But they should be **Easter eggs**, not the main UI.

Use abstract three-circle patterns, not Disney logos or character art.

### Places to add hidden Mickeys

1. **Loading states**
   Three dots form a Mickey silhouette for 300–600ms.

2. **Add to My Plan animation**
   When an item is saved, a tiny three-circle sparkle pops once.

3. **Calendar dates**
   Special date markers use three tiny dots in the corner.

4. **Weather map background**
   Cloud/rain dots occasionally form a hidden Mickey in the texture.

5. **Plan route graph**
   Three nearby saved activities can form a hidden Mickey constellation.

6. **Footer**
   Add one very subtle hidden Mickey in the star field.

7. **Empty state**
   “No saved activities yet” can show a small starlight Mickey constellation.

8. **Achievement layer**
   “You found a hidden Mickey” should be optional, not intrusive.

## What Disney people love visually

Disney planners love:

* resort-specific atmosphere
* transportation routes
* little discovery moments
* maps
* checklists
* countdowns
* “movie under the stars” visuals
* campfire warmth
* Skyliner/monorail/boat route identity
* badges and collectibles
* before/after planning transformations
* family-friendly delight that still feels organized

## Add resort-area identity

Give each resort area a subtle visual language:

| Area                  | Visual treatment                              |
| --------------------- | --------------------------------------------- |
| Magic Kingdom resorts | monorail line motif, warm gold/navy           |
| Epcot/BoardWalk       | string lights, boardwalk planks, evening glow |
| Skyliner resorts      | sky ribbons, gondola-line motif               |
| Animal Kingdom area   | earthy greens, lantern glow, organic shapes   |
| Disney Springs area   | water reflections, evening dining energy      |
| Fort Wilderness       | campfire amber, pine texture, trail markers   |

Do this through background accents and icons, not heavy illustrations.

## Activity icon system

Create a consistent icon set:

* movie projector / stars = outdoor movie
* campfire = campfire
* palette = craft
* pool ripple = poolside
* joystick = arcade/games
* leaf/yoga mat = wellness
* fork/glass = dining nearby
* umbrella = indoor/covered backup
* bus/boat/monorail/Skyliner/walk = transportation

These icons should support scanning. Do not rely on color alone.

## Animation rules

Use motion only when it explains something.

Good animations:

* Filter applied: cards fade/slide into their new order
* Result count changes: number ticks gently
* Add to My Plan: card compresses into plan tray
* Weather status changes: icon morphs once
* Route edge hover: transport path highlights
* Hidden Mickey sparkle: one-time micro-animation
* Calendar date selected: card lifts slightly

Avoid:

* constant sparkles
* parallax while scrolling long lists
* animated backgrounds behind text
* looping weather particles behind readable copy
* hover-only effects that mobile users never see

Respect:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## “Wow factor” visual ideas

### 1. Starlight route line

On My Plan, saved activities connect with a glowing route line. Different route types use different line styles:

* walk = dotted
* bus = solid
* boat = wave
* monorail = double rail
* Skyliner = elevated dashed line
* rideshare = short direct line

### 2. Resort-day “ticket”

When a plan is complete, generate a shareable “resort day ticket” with date, resort, top three activities, weather note, and transportation warning.

### 3. Weather magic meter

A small meter says:

> Outdoor plans: Good
> Rain backup: Recommended
> Travel risk: Low

Use it as a planning summary, not a gimmick.

### 4. Hidden Mickey constellation

On the homepage or My Plan empty state, use three stars as a hidden Mickey. It rewards Disney fans without hurting usability.

### 5. “After dark” mode

After sunset, the site subtly shifts to evening colors and emphasizes Tonight, movies, campfires, lounges, and low-effort return routes.

---

# PASS 3 — Forensic functionality review

I could verify public page content, URL-filter states, and static page structure. I could not fully execute every client-side interaction in a live browser session, so I am not claiming every click, drag, save, or local-storage state was manually executed. This is a forensic UX/product review based on visible behavior, crawlable content, and the states I could inspect.

---

## Filters: do they all work and are they valuable?

The URL-level filters appear to work for several states, including free activities and category filters. The pages show filtered result counts, selected chips, and a clear option. ([After the Parks][14])

The bigger issue is not whether filters exist. It is whether the right filters are surfaced on the right page.

## Filters should not be identical on every page

Different pages have different user intent.

### Today page filters

Primary:

> Resort
> Starts after now
> Starting soon
> Free
> Indoor or covered
> Category
> Good for kids

Secondary:

> Reservation required
> Transportation
> Resort area

Today users are asking:

> “What can I still do today?”

So time and immediacy matter most.

### Tonight page filters

Primary:

> Resort
> After 7 PM
> Movies
> Campfires
> Free
> Indoor or covered
> No reservation needed

Secondary:

> Transportation home
> Resort area
> Adults/kids

Tonight users are asking:

> “What can we do after the parks without making the night harder?”

### Activities page filters

Primary:

> Resort
> Date/time
> Category
> Cost
> Weather fit
> Age/group fit

Secondary:

> Reservation
> Transportation
> Source freshness
> Resort area

Activities users are exploring broadly, so more filters are acceptable.

### Resort detail filters

Primary:

> Today
> Tonight
> Free
> Indoor or covered
> Good for kids
> Category

A resort page should not make the user re-filter the entire Disney World property. It should help them decide what to do at that resort.

### Weather page filters

Primary:

> Indoor or covered
> Outdoor and weather-sensitive
> Affected by lightning
> Affected by heat
> Transportation-sensitive

Weather users are asking:

> “What should we avoid or switch to?”

### Guide pages

Do not use heavy filters. Use decision tiles:

> I have little kids
> I need free
> I need indoor
> I need low walking
> I need after dinner
> I am not staying here

---

## Filter labels need “human purpose”

Bad:

> Bus/Rideshare 530

Better:

> Easy without a car

Bad:

> Walkable 249

Better:

> Walkable from nearby resorts

Bad:

> Rain backup 15

Better:

> Indoor or covered

Bad:

> No booking required

Better:

> No reservation needed

Bad:

> Category 1

Better:

> Category

## Add “why this filter matters”

When a user taps a filter, show one sentence:

> Indoor or covered activities are better when rain, lightning, heat, or tired kids make outdoor plans harder.

For “walkable”:

> Walkable options are best if you are already nearby. Do not cross property just because something is technically walkable from another resort.

---

# My Plan functionality review

My Plan should become the emotional and functional center of the site.

The visible page currently has stay details, a resort selector, check-in/check-out fields, and saved activities. Good foundation. But it does not yet expose the high-value promise: “I will help you build a realistic day.” ([After the Parks][10])

## Add multiple plans

Disney trips are not one plan. They are:

* arrival night
* rest day
* rainy-day backup
* no-park day
* grandparents plan
* couples night
* pool day
* last morning
* “if the kids melt down” plan

Add:

> New plan

> Duplicate plan

> Make rainy-day version

> Make tonight version

Plan names:

> Arrival Night
> Resort Day
> Rain Backup
> After-Park Evening
> Grandparents Day
> Pool + Movie Night

## Add timeline conflict detection

Every saved activity should be checked for:

* overlapping times
* travel time gaps
* activities already started
* activities after bedtime preference
* weather risk
* reservation needed
* access unclear
* cost unclear
* return transportation unclear

### User-facing language

> **This plan may be too tight.**
> You have 15 minutes between activities at different resorts.

> **Return route unclear.**
> Confirm transportation before making this your last stop.

> **Weather risk.**
> This activity is outdoor and rain is possible near the start time.

> **Access unclear.**
> Confirm whether non-resort guests can attend before traveling.

## Add nodes and edges for transportation

Yes, the nodes/edges concept is a high-value idea.

### Node examples

* Your resort
* Activity location
* Dining location
* Transportation hub
* Nearby resort
* Disney Springs
* Park gate, only if relevant

### Edge examples

* Walk
* Bus
* Boat
* Monorail
* Skyliner
* Rideshare
* Drive
* Unknown/confirm

### Edge labels

> Direct

> Transfer required

> Weather-sensitive

> Return route unclear

> Not recommended

> Confirm access first

### Truthfulness rule

Do not imply real-time transportation knowledge unless you actually have it. Use:

> Estimated route for planning only. Confirm transportation, access, and operating conditions before leaving.

## Add a “Magic Check” button

This would be a very high-value feature.

Button:

> Check my plan

Output:

> **Your plan looks easy.**
> 3 activities, one resort area, no major weather conflicts.

Or:

> **This plan may be stressful.**
> It crosses property twice, includes one outdoor activity during rain risk, and has one unclear return route.

Or:

> **Good rainy-day backup.**
> Most activities are indoor or covered.

## Add “swap this” functionality

For any saved activity:

> Swap for indoor backup

> Swap for free option

> Swap for closer option

> Swap for something tonight

That is more valuable than just saving cards.

---

# Calendar functionality review

Because `/calendar` did not fetch successfully, I would specifically QA:

1. Does the route return a valid document to crawlers?
2. Does it work without full client hydration?
3. Does it show useful empty states?
4. Does it handle dates outside available schedule data?
5. Does it avoid showing weather beyond forecast range?
6. Does it sync with My Plan?
7. Does it distinguish “activity schedule known” from “weather forecast known”?
8. Does it avoid dark-card readability issues?

## Calendar should connect directly to My Plan

For each date:

> Add this day to My Plan

> Make this a rainy-day plan

> Show only my resort

> Show tonight only

> Add best three options

## Calendar should show confidence

Use:

> **Schedule confidence:** Current source checked Jun 29
> **Weather confidence:** Forecast available closer to date
> **Access confidence:** Confirm before traveling from another resort

---

# Search functionality review

Search should group results by type:

> Best matches
> Activities
> Resorts
> Guides
> Movies
> Categories

A search for “campfire tonight” should prioritize tonight’s campfires, not generic campfire articles.

A search for “rainy BoardWalk” should prioritize:

1. BoardWalk-area indoor/covered activities
2. Weather page
3. BoardWalk resort page
4. Rainy-day guide

Add no-results copy:

> **No exact matches.**
> Try a resort name, activity type, or need like “free,” “tonight,” “rain,” or “kids.”

---

# Navigation functionality review

The header appears inconsistent across page templates. Some pages show one nav order, while others show “Weather,” “Explore,” “Plan Ahead,” “Resorts,” “My Plan,” and “Search.” ([After the Parks][1])

Use one consistent nav:

> Today
> Tonight
> Calendar
> Activities
> Resorts
> Guides
> Weather
> My Plan
> Search

If space is tight:

> Today
> Tonight
> Calendar
> Resorts
> My Plan

Then put the rest in the menu.

Decide whether the label is **Calendar** or **Plan Ahead**. Do not use both unless they are different features.

Recommended:

> Calendar

because it is plain.

---

# Truthfulness and data validation review

This site lives or dies on trust. Add a data-quality gate before publishing any activity.

## Required validators

### Time validator

Reject or suppress if:

> end time is before start time

Use fallback:

> Time unclear. Confirm before planning around this.

### OCR validator

Flag:

* random capital letters
* punctuation inside words
* `I2` where `12` is likely
* repeated words
* missing phone numbers
* broken spacing
* “activity activity”
* partial phrases like “To book, please call”

### Cost validator

Reject contradictions like:

> Free but paid
> Complimentary available for purchase
> Paid with no price where source implies price

Fallback:

> Cost unclear. Confirm before you go.

### Reservation validator

If one field says “no reservation tracked” and description says “reservations available,” show:

> Reservation status unclear. Confirm before you go.

### Weather-category validator

Campfires, outdoor movies, pool games, marina activities, and long walks should not be labeled “Mostly indoor.”

### Access validator

If source says resort guests only, show it above the fold.

### Duplicate-location validator

If the same activity applies to a resort and its villas, group it:

> Also applies to: BoardWalk Villas

Do not show near-duplicate cards unless there is a real location or access difference.

---

# What would make the site easier and more exciting?

## Easier

* “Start with my resort” onboarding
* Contextual filters per page
* One-click rain backup
* Plan conflict checker
* Source and access badges
* “Worth traveling for” label
* Better empty states
* Cleaner card hierarchy
* Consistent nav
* Stronger search grouping

## More exciting

* Hidden Mickeys
* Starlight route graph
* Shareable resort-day ticket
* Plan badges
* Sunset/after-dark visual shift
* Gentle “saved to plan” magic animation
* Resort-area visual identity
* Calendar countdown
* Weather-aware “magic check”
* Collectible “plan style” labels

## What Disney people love functionally

Disney planners love:

* knowing what is happening tonight
* resort-specific tips
* transportation clarity
* weather backups
* low-stress plans
* hidden details
* badges/checklists
* maps/routes
* countdowns
* ways to compare resorts
* ways to avoid wasting time crossing property
* confidence that a plan will actually work

The best product direction is not “more listings.” It is:

> **Help me choose the right listing for my situation.**

---

# Final pass — 10 high-value enhancements

## 1. Build the “Magic Check” plan auditor

This is the highest-value product idea.

A user saves activities, then clicks:

> Check my plan

The site returns:

> Easy plan
> Too much travel
> Weather risk
> Reservation issue
> Access unclear
> Return route unclear
> Too many activities
> Good rainy-day backup

This turns My Plan from a saved list into a planning assistant.

---

## 2. Add “worth traveling for” scoring

Every activity should have a travel-worth label:

> Best if staying here

> Good if nearby

> Worth a dedicated trip

> Not worth crossing property for

This is exactly the kind of judgment Disney people need.

---

## 3. Create one-click Rain Swap

On any outdoor saved activity:

> Swap for indoor backup

The site suggests indoor/covered options at the same resort first, then same area, then property-wide.

---

## 4. Add transportation nodes and edges

Build a visual graph in My Plan:

> Resort → Activity → Dinner → Movie → Return route

Edges should show mode, rough difficulty, and caveats.

Example:

> Boat · weather-sensitive
> Walk · 12–18 min
> Bus/rideshare · confirm return route
> Skyliner · weather-sensitive

This would be a major “wow” feature if truthful and clear.

---

## 5. Add “Start with my resort”

On first visit or My Plan setup:

> Where are you staying?

Then personalize:

> Today at your resort
> Tonight near your resort
> Free at your resort
> Rain backups near your resort
> Worth leaving your resort for

This grounds the entire site.

---

## 6. Add trust badges to every card

Every activity card should show four compact badges:

> Verified Jun 29
> Cost clear / Cost unclear
> Access clear / Confirm access
> Weather-safe / Weather-sensitive

This is better than long caveat paragraphs.

---

## 7. Add hidden Mickey Easter eggs

Use subtle hidden Mickeys in:

* loading dots
* saved-plan animation
* starlight backgrounds
* calendar markers
* route graph
* footer
* achievement badges

Keep them tiny and optional. Disney people will notice.

---

## 8. Add “After Dark” mode

After local sunset, emphasize:

* Tonight
* Movies
* Campfires
* Lounges/dining
* Low-effort return routes
* Indoor options
* “still open” activities

The site’s whole brand is “After the Parks.” Make the interface feel different after dark.

---

## 9. Add a pre-publish data-quality gate

Before any activity goes live, automatically block:

* impossible times
* OCR junk
* missing booking phone
* contradictory cost
* contradictory reservation status
* wrong weather category
* broken age text
* duplicate activity spam
* source date missing

This is less glamorous than visual polish, but it will protect credibility more than almost anything else.

---

## 10. Add shareable “Resort Day Ticket”

After building a plan, generate a clean share card:

> Josh’s Fort Wilderness Resort Day
> Tue, Jun 30
> 3 activities
> 1 rain backup
> Travel risk: Low
> Weather: Check after 5 PM
> Don’t forget: Confirm campfire supplies

This gives users something delightful and useful to screenshot, text, or save.

---

# Priority order

## Ship blockers

1. Fix OCR/data bugs.
2. Remove internal/backend language.
3. Fix dark weather-card contrast.
4. Fix impossible times and contradictory reservation/cost language.
5. Make `/calendar` return a clean page.

## Next

6. Contextualize filters by page.
7. Rewrite activity detail templates.
8. Improve Today/Tonight card hierarchy.
9. Add trust badges.
10. Unify navigation.

## Biggest product wins

11. My Plan Magic Check.
12. Rain Swap.
13. Transportation graph.
14. Worth-traveling-for labels.
15. Hidden Mickey/starlight storytelling layer.

[1]: https://aftertheparks.com/ "After the Parks"
[2]: https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/?utm_source=chatgpt.com "How Long Do Users Stay on Web Pages?"
[3]: https://www.nngroup.com/articles/how-users-read-on-the-web/?utm_source=chatgpt.com "How Users Read on the Web"
[4]: https://credibility.stanford.edu/guidelines/index.html?utm_source=chatgpt.com "The Web Credibility Project: Guidelines - Stanford University"
[5]: https://baymard.com/blog/current-state-product-list-and-filtering?utm_source=chatgpt.com "Product List UX Best Practices 2025"
[6]: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum?utm_source=chatgpt.com "Understanding Success Criterion 1.4.3: Contrast (Minimum)"
[7]: https://www.nngroup.com/articles/animation-purpose-ux/?utm_source=chatgpt.com "The Role of Animation and Motion in UX"
[8]: https://aftertheparks.com/activities/winter-themed-activities "Winter-Themed Activities at All-Star Sports Resort | After the Parks"
[9]: https://aftertheparks.com/activities "Walt Disney World Resort Activities | After the Parks"
[10]: https://aftertheparks.com/plan "My Plan | After the Parks"
[11]: https://aftertheparks.com/activities/tasteful-artistry-at-disneys-wilderness-lodge "Tasteful Artistry At Disney’s Wilderness Lodge at Wilderness Lodge | After the Parks"
[12]: https://aftertheparks.com/activities/groovy-campfire "Groovy Campfire at Pop Century Resort | After the Parks"
[13]: https://aftertheparks.com/tonight "Disney World Resort Activities Tonight | After the Parks"
[14]: https://aftertheparks.com/activities?free=true "Free Walt Disney World Resort Activities | After the Parks"
[15]: https://aftertheparks.com/today "Disney World Resort Activities Today | After the Parks"
[16]: https://aftertheparks.com/activities?category=arcade "Walt Disney World Resort Activities | After the Parks"
[17]: https://aftertheparks.com/resorts "Disney World Resort Activity Calendars | After the Parks"
[18]: https://aftertheparks.com/resorts/bay-lake-tower-at-contemporary-resort?utm_source=chatgpt.com "Bay Lake Tower at Disney's Contemporary Resort"
[19]: https://aftertheparks.com/resorts/all-star-movies-resort?utm_source=chatgpt.com "All-Star Movies Resort - After the Parks"
[20]: https://aftertheparks.com/resorts/coronado-springs-resort?utm_source=chatgpt.com "After the Parks"
[21]: https://aftertheparks.com/source-and-accuracy-policy "Source and Accuracy Policy | After the Parks"
[22]: https://aftertheparks.com/activities/family-wellness-yoga "Family Wellness Yoga at BoardWalk Inn | After the Parks"
[23]: https://aftertheparks.com/weather "Is it a good time for resort activities? | After the Parks"
[24]: https://aftertheparks.com/search "Search After the Parks | After the Parks"
[25]: https://aftertheparks.com/guides "Disney World Resort Planning Guides | After the Parks | After the Parks"
[26]: https://aftertheparks.com/guides/disney-world-non-park-day "What to Do at Disney World on a Non-Park Day | After the Parks"
[27]: https://aftertheparks.com/guides/best-disney-resorts-for-teens "Best Walt Disney World Resorts for Teens | After the Parks"
[28]: https://aftertheparks.com/guides/best-disney-resorts-for-activities-today "Best Disney Resorts for Activities Today | After the Parks"
[29]: https://aftertheparks.com/about "The Story Behind After the Parks | After the Parks"
[30]: https://aftertheparks.com/corrections "Contact After the Parks | After the Parks"
[31]: https://aftertheparks.com/privacy "Privacy Policy | After the Parks"
