# Phased Redesign Plan — After the Parks

**Goal:** Second-to-none premium resort planning experience — trustworthy first, then beautiful, then magical.

**North star:** *Here are the best resort moments for your family, today and tonight, without digging through PDFs.*

This plan synthesizes [consultant-review.md](./consultant-review.md) with codebase audits and UI/UX research from June 2026.

---

## Principles (Non-Negotiable)

1. **Trust before decoration** — no corrupted title, time, or category reaches public UI
2. **One availability engine** — homepage, Today, Tonight, Explore, resorts share the same logic
3. **Display-safe objects only** — UI never renders raw ingest fields
4. **Mobile-first** — bottom nav, chips, bottom sheets, 44px targets
5. **Premium tropical travel journal** — warm, editorial, not Disney-like, not SaaS-gray
6. **Performance budget** — LCP < 2.5s, INP < 200ms, CLS < 0.1
7. **WCAG 2.2 AA** — contrast, focus, reduced motion, predictable behavior

---

## Phase 0 — Trust Emergency (P0)

**Outcome:** Public pages show only clean, honest data. No “Verified” on garbage.

| # | Work item | Key files | Acceptance criteria |
|---|-----------|-----------|---------------------|
| 0.1 | **`displayQualityScore`** composite (title, time, location, category, schedule, confidence) | `lib/displayQuality.ts` (new), `lib/activityDisplay.ts` | Score 0–100; tier `hide` / `low` / `medium` / `high`; wired to hide + trust |
| 0.2 | **Tighten `shouldHideActivity`** — generic fallbacks, bad locations, camelCase slugs, schedule fragments | `lib/activityDisplay.ts`, `lib/text/normalize.ts` | Live API: 0 letter-spaced titles; 0 `Wellness Activity` spam |
| 0.3 | **Stop faking verified** in `ensurePublicActivity` | `lib/api/publicActivities.ts` | Missing freshness ≠ `verified`; stale stays stale |
| 0.4 | **Sanitize location + schedule** at expand/API boundary | `lib/occurrences/expand.ts`, `lib/api/publicActivities.ts` | No sentence fragments in `location.label` |
| 0.5 | **Fix ingest categorization** — name before section; stop `FAMILY WELLNESS` poisoning | `scripts/ingest/pdf_parser.py`, re-publish | `fitness_wellness` < 15% of public catalog |
| 0.6 | **Broaden suspicious time detection** — 7AM–11PM, 9AM–9PM, schedule/ISO mismatch | `lib/activityDisplay.ts`, `lib/occurrences/expand.ts` | No `5:00 AM – 5:00 PM` on public cards without uncertainty badge |
| 0.7 | **Dedupe tonight + explore** — normalize schedule notes; dedupe by occurrence `id` | `lib/data/activities.ts` | `/api/tonight` zero duplicate IDs |
| 0.8 | **Movie title dedupe** — `Tangled Tangled` → `Tangled` | `lib/movies/sanitize.ts` | All movie cards show clean single titles |

**Gate to Phase 1:** Consultant spot-check passes on Explore, Tonight, All-Star Movies resort page — no OCR artifacts visible.

---

## Phase 1 — Unified Availability Engine (P0)

**Outcome:** Homepage, Today, Tonight never contradict.

| # | Work item | Key files | Acceptance criteria |
|---|-----------|-----------|---------------------|
| 1.1 | **`getActivityAvailability(activity, now, date)`** | `lib/availability/index.ts` (new) | Returns: `happening_now`, `later_today`, `tonight`, `upcoming_week`, `expired`, `uncertain_time` |
| 1.2 | **Wire all pages** to shared engine | `app/page.tsx`, `lib/data/activities.ts`, `lib/occurrences/expand.ts` | “Free today” uses `filterToday`; happening-now uses same rules as `/today` |
| 1.3 | **Honor `?resort=`** on Today/Tonight | `app/today/page.tsx`, `app/tonight/page.tsx`, clients | QuickFinder resort selection filters results |
| 1.4 | **Suspicious times never `happening_now`** | `lib/availability/index.ts` | 9AM–9PM blocks excluded from “Now” |
| 1.5 | **Today empty state v2** — tomorrow preview + recovery | `components/atlas/TodayClient.tsx` | Never a dead end |

---

## Phase 2 — Display-Safe Activity Model (P1)

**Outcome:** UI consumes `DisplayActivity`, not raw rows.

```typescript
type DisplayActivity = {
  id: string
  title: string
  category: ActivityCategory
  resortName: string
  locationLabel: string
  timeLabel: string
  daypart: "morning" | "afternoon" | "evening" | "late" | "unclear"
  costLabel: "Free" | "Paid" | "Price unclear"
  summary: string
  trustState: TrustState
  displayQuality: { score: number; tier: string; flags: string[] }
  sourceUrl?: string  // detail pages only
}
```

| # | Work item | Acceptance |
|---|-----------|------------|
| 2.1 | `toDisplayActivity(occurrence)` mapper | All cards use mapper |
| 2.2 | Consistent trust copy | “Confirm before going” / “Time needs confirmation” / “Price unclear” |
| 2.3 | Remove **source links from cards** | `FreshnessMeta` detail-only |
| 2.4 | Category label cleanup | User-facing: Poolside, Campfire, Movie, Craft, Game, etc. |

---

## Phase 3 — Card System Rebuild (P1)

**Outcome:** Every card feels like a curated resort moment.

### Card anatomy (mandatory order)

1. Category icon / media badge
2. Cost badge (Free / Paid / Price unclear)
3. Time badge (Morning / Afternoon / Tonight / Time unclear)
4. Activity name
5. Resort + exact location
6. Time range
7. One-sentence human summary
8. Details / Save

| Component | Status | Work |
|-----------|--------|------|
| `ActivityCard` | Exists | Remove source link; enforce anatomy; server/client split for INP |
| `NightActivityCard` | Exists | Lantern glow on happening-now only |
| `TrustBadge` | Exists | Max 2 warnings per card |
| `ActivityBadge` | Exists | Unified variants |
| `SaveButton` | Exists | CSS stamp animation + reduced motion |
| `EmptyState` | Exists | Per-route contextual copy |
| `SponsoredPlanningCard` | Stub | Inactive until Phase 9 |

---

## Phase 4 — Explore Rebuild (P1–P2)

### Mobile

- Sticky search bar
- Horizontal mood chips (active state reflects filters)
- Filters button → bottom sheet (drag handle, focus trap, Apply/Clear)
- Result count + sort
- One-column cards
- Resort picker inside sheet (searchable, not inline list)

### Desktop

| Left | Center | Right |
|------|--------|-------|
| Filter rail | Activity grid | My Plan / Tonight preview |

### Sort options

Happening soon · Tonight · Free first · Best for little kids · Nearest to my resort · Recently verified · Quality score

---

## Phase 5 — Homepage & Hero (P1–P2)

| Section | Content |
|---------|---------|
| Hero | Realistic tropical sunset (existing asset), cream overlay, **Find the magic between park days.** |
| Quick Finder | Date / resort / vibe → routes |
| Mood chips | Tonight, Free, Little kids, Rain-friendly, Pool break, Movies, Campfires, Before check-in |
| Tonight’s easy wins | Max 3 **high-quality** cards |
| Free today | Max 6 **today-filtered** clean cards |
| Little travelers | Curated high-quality |
| Pick your resort | Visual `ResortCard` grid |
| Rest day builder | Phase 7 |
| Planning guides | Editorial cards |

### Hero performance

- `next/image` + preload + `aspect-ratio`
- Mobile ≤ 120KB WebP, desktop ≤ 200KB
- `priority` on LCP image

---

## Phase 6 — Tonight Starlight Mode (P2)

| Element | Spec |
|---------|------|
| Background | Deep navy/teal (`--night`, `--night-soft`) |
| Cards | Glass `.night-card`, lantern glow on “Now” |
| Sections | Movies · Campfires · After dinner · Low-energy · Rain-friendly · Tomorrow preview |
| Movies | Fallback title “Movie Under the Stars” if corrupt |
| Trust note | “Confirm before heading out” |

---

## Phase 7 — Resorts & Detail Pages (P2)

### Resort index

Visual cards: name, tier, activity count, today count, tonight count, best-for badges, generic category illustration (no Disney IP).

### Resort detail

Hero → quick facts → today → tonight → free → categories → full schedule → source/freshness block.

### Activity detail

Name → resort + location → when/cost/best-for → what to expect → where → schedule → good to know → save → source → more like this.

### Empty states

Fort Wilderness-style: recovery links, official source, report missing schedule.

---

## Phase 8 — Plan, Search, Guides (P2)

### My Plan daybook

- Group by **date** then daypart (Morning / Afternoon / Dinner / Evening / Starlight)
- Notes UI on `PlanItem`
- Conflict warnings, ICS export, share
- “Low-stress rest day” suggestion

### Search

- SSR initial state with suggestion chips (no “Loading…” shell)
- Group results: Activities · Resorts · Guides
- Debounced client enhancement for live typing

### Guides (SEO engine)

Priority list from consultant — each links to filtered Explore.

---

## Phase 9 — Magic Layer (P3)

| Feature | Description |
|---------|-------------|
| Rest Day Builder | Where / who / vibe → generated plan |
| Resort Passport | Stamp collection on save (campfire, movie, pool, lagoon…) |
| No-Ticket Magic | Curated entry collections |
| Magic Nearby | At resort / one ride / worth traveling / skip |
| Microinteractions | Lantern breathe, passport stamp, filter sheet spring |

---

## Phase 10 — Visual Polish & QA (P3)

### Design token consolidation

- Semantic surfaces in `tokens.css` (`--surface-0/1/2`, `--text-primary/secondary`)
- Remove hardcoded hex from components
- Category gradient tints

### Accessibility pass

- Focus ring + `scroll-padding` for bottom nav
- Night card contrast ≥ 4.5:1 (`white/75` minimum)
- Skip link “Skip to activities”
- `aria-live` on filter result counts
- `<time datetime>` on schedules

### Performance pass

- RSC for activity lists; client islands for Save/filters only
- `startTransition` on filter URL updates
- Core Web Vitals monitoring

### UI validation loop

Expert design review sub-agent checks each page against this plan → iterate until sign-off.

---

## Phase 11 — Monetization (Post-Launch)

- `SponsoredPlanningCard` component (built inactive in Phase 3)
- FTC-compliant disclosure
- No ads in first viewport; no pop-ups, sticky giants, or autoplay
- Placement: arrival guides, little-kid filters, packing content only

---

## Implementation Sequence (Sprints)

```
Sprint 1 (Trust):     Phase 0 + Phase 1
Sprint 2 (Display):   Phase 2 + Phase 3
Sprint 3 (Pages):     Phase 4 + Phase 5 + Phase 6
Sprint 4 (Depth):     Phase 7 + Phase 8
Sprint 5 (Magic):     Phase 9 + Phase 10
Sprint 6 (Revenue):   Phase 11 (when traffic warrants)
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Public activities with quality tier `hide` | 100% hidden |
| Average `displayQualityScore` on Explore | ≥ 75 |
| Homepage / Today contradiction | 0 |
| Core Web Vitals (mobile) | All “good” |
| WCAG 2.2 AA | Automated + manual pass |
| Consultant re-review | “Trustworthy + delightful” |

---

## Research Inputs

- [consultant-review.md](./consultant-review.md) — original feedback
- UI/UX research brief — premium tropical journal, mobile patterns, CWV, WCAG (agent `97a13c77`)
- Codebase gap matrix — current vs target (agent `8f53a0b9`)
- Data trust audit — ingest, API, dedupe, categorization (agent `8a099eb6`)

---

## Immediate Next Build (This Sprint)

1. Implement `lib/displayQuality.ts`
2. Wire hide gate + stop fake verified
3. Build `getActivityAvailability`
4. Fix homepage “free today” + remove card source links
5. Fix ingest `categorize()` + re-publish
6. Dedupe tonight API
7. Deploy + validate on production
