# Consultant Review — After the Parks (Live Site Audit)

**Date:** June 2026  
**Source:** Independent UX/product consultant review of [aftertheparks.com](https://aftertheparks.com)  
**Verdict:** Working data prototype — needs trust repair before visual polish

---

## Executive Summary

The product concept is strong. Navigation (Today, Tonight, Explore, Resorts, My Plan, Search) and the “Sunshine to Starlight” direction are right. The live experience is overwhelmed by bad source parsing, raw data exposure, and trust-breaking artifacts.

> **After the Parks currently feels like it is showing users parsed resort-calendar data. It needs to feel like it is guiding families to easy, joyful resort moments.**

### What is working

- Broad navigation and information architecture
- Tagline direction (“Sunshine to Starlight”)
- Footer disclaimer and sourcing pages (official calendars + original editorial)
- My Plan empty state direction
- First guide voice (“The parks can wait until tomorrow…”)

### What is not working

- Explore exposes OCR titles (`R E E L F U N A R C A D E`, `M I C K E Y Ti E - Dy E`)
- Tonight shows corrupted movie strings before recognizable titles
- Detail pages repeat suspicious `5:00 AM – 5:00 PM` schedules
- “Verified” appears next to obviously broken data
- Homepage “Happening now” contradicts Today page emptiness
- Explore is overwhelming on mobile (inline resort list, raw admin-filter feel)

---

## Enhanced Vision

### **After the Parks — Find the magic between park days.**

Premium, mobile-first rest-day planner for families visiting Orlando resorts.

Users should immediately understand:

- What can we do **now**?
- What can we do **tonight**?
- What is **free**?
- What is good for **little kids**?
- What is **near our resort**?
- What works **without a park ticket**?
- What can we **save into a plan**?

### Emotional world

Warm Florida sunshine · tropical paths · lanterns · campfires · outdoor movies · resort pools · family downtime · discovery · “hidden gem” energy · calm after park chaos

**Do not look like Disney.** Beautiful independent planning guide for Disney-adjacent travelers.

---

## Problems Ranked

### 1. Public data quality is breaking trust (EMERGENCY)

- Malformed titles and duplicate records on Explore
- Wrong categories (`Fitness Wellness` on arcade/craft items)
- Broken H1s, incomplete locations, suspicious all-day times
- Corrupted movie titles on Tonight

**Fix:** Display-quality gate — hide or fallback with “Confirm details” badge. Never show “Verified” on corrupted records.

### 2. Homepage does not sell the dream

Leads with functional cards, not emotional guidance.

**Fix:** Hero + Quick Finder + mood chips. Headline: **Find the magic between park days.**

### 3. Today and Happening Now contradict each other

**Fix:** Single shared availability engine used by homepage, Today, Tonight, Explore, resort pages.

### 4. Explore is overwhelming on mobile

**Fix:** Sticky search, mood chips, one Filters button, filter bottom sheet. Hide full resort list inline.

### 5. Activity cards are database rows, not resort moments

**Fix:** Standard card anatomy — category icon, cost badge, time badge, title, resort+location, time range, one-sentence summary, Details/Save. No source links on cards.

---

## Page-by-Page Targets

| Page | Current issue | Target |
|------|---------------|--------|
| **Homepage** | Functional, not emotional | Hero, Quick Finder, mood chips, curated sections, resort grid, rest-day builder, guides |
| **Today** | Dead-end when empty | Recovery paths + tomorrow preview |
| **Tonight** | Corrupted movies, contradictory sections | Starlight mode, clean movie titles, magical sections |
| **Explore** | Admin filter, bad data visible | Mobile-first finder, sort options, three-column desktop |
| **Resorts** | Plain directory | Visual resort chooser with badges |
| **Resort detail** | Broken names, zero-activity dead pages | Today/tonight at resort, helpful empty states |
| **Activity detail** | Raw ingest as H1 | Planning-card layout, explicit uncertainty |
| **My Plan** | Good empty state | Magical daybook with daypart timeline |
| **Search** | “Loading…” as crawlable content | SSR suggestions, concierge feel |
| **About** | Concise but cold | Warmer story + editorial standards |
| **Data Sources** | Contradicted by live data | Tighten data gate to match claims |
| **Corrections** | Basic form | Trustworthy report flow + activity detail CTA |
| **Guides** | Thin but good voice | SEO/trust engine with filtered Explore links |

---

## Visual System

### Style: Premium tropical travel journal

Not fantasy · not AI-looking · not Disney-like · not plain database

### Colors

Cream background · ink text · lagoon teal primary · palm green secondary · sunshine gold accents · coral highlights · deep starlight navy for Tonight

### Typography

- Headings: warm editorial serif (Fraunces)
- Body/UI: rounded readable sans (Nunito Sans)
- No script fonts

### Cards

24–28px radius · warm white/cream · soft border · subtle shadow · category icon · badges top · save always visible

### Buttons

Primary (lagoon gradient) · Secondary (cream glass) · Save (sunshine gold)

### Icons

Custom travel-journal stamp family: campfire, movie, pool, craft, lantern, starlight, etc.

---

## Mobile Requirements

- Bottom nav: Today, Tonight, Explore, Plan
- Search/finder near top
- Thumb-friendly chips + filter bottom sheet
- One-column cards
- No giant inline resort list
- No ad in first viewport
- 44px minimum tap targets
- WCAG 2.2 AA

---

## Performance Standards

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |

Optimized AVIF/WebP heroes · lazy below-fold · reserved dimensions · SSR important content · no client-only Search shell

---

## Technical Cleanup (Consultant Phases)

1. Hide bad public data (`displayQualityScore < 0.85`)
2. Create `DisplayActivity` safe objects for UI-only consumption
3. Deduplicate by normalized title + resort + category + time
4. Rebuild card system (shared components)
5. Rebuild Explore (mobile-first)
6. Rebuild homepage (hero + Quick Finder)
7. Rebuild Tonight (Starlight mode)
8. Polish (save animation, passport stamp, lantern glow)
9. Sponsor slots (inactive until UX is healthy)

---

## North-Star Homepage

1. Header — After the Parks · Independent Guide
2. Hero — realistic tropical sunset · **Find the magic between park days.**
3. Quick Finder
4. Mood chips
5. Tonight’s easy wins (3 clean cards)
6. Free today (3–6 clean cards)
7. Good for little travelers
8. Pick your resort (visual cards)
9. Build a rest day
10. Planning guides
11. Footer

---

## Magic Layer (Post-Trust)

- **Rest Day Builder** — where / who / what kind of day
- **Tonight Mode** — dark, lantern glow, after-dinner filters
- **Resort Passport** — stamp collection on save
- **No-Ticket Magic** — curated collections
- **Magic Nearby** — at resort / one ride away / worth traveling for

---

## Strategic Path

1. **Become trustworthy** — hide bad data, fix times, fix categories
2. **Become beautiful** — hero, colors, cards, Tonight mode
3. **Become useful** — Quick Finder, mood chips, rest-day builder
4. **Become magical** — passport stamps, lantern effects, guides
5. **Monetize carefully** — sponsored planning cards only after UX is healthy

---

## Live Page References

- [Homepage](https://aftertheparks.com/)
- [Data Sources](https://aftertheparks.com/data-sources)
- [Explore](https://aftertheparks.com/activities)
- [Tonight](https://aftertheparks.com/tonight)
- [Today](https://aftertheparks.com/today)
- [Resorts](https://aftertheparks.com/resorts)
- [My Plan](https://aftertheparks.com/plan)
- [Search](https://aftertheparks.com/search)
- [About](https://aftertheparks.com/about)
- [Corrections](https://aftertheparks.com/corrections)
- [First Night Guide](https://aftertheparks.com/guides/first-night-at-the-resort)

## External References

- [Better Ads Standards](https://www.betterads.org/standards/)
- [FTC Native Advertising Guide](https://www.ftc.gov/business-guidance/resources/native-advertising-guide-businesses)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Web Vitals](https://web.dev/articles/vitals)
