# After the Parks Visual Experience PRD

Date: 2026-06-26  
Source plan: `audits/ui-storytelling-review-2026-06-26/ui-refactor-enhancement-plan.md`  
Product: After the Parks  
Scope: front-end, UI, motion, visual systems, filtering, itinerary storytelling, Figma workflow, icons, hidden details, and responsive QA.

## 1. Executive Summary

After the Parks should become the best resort-day planning experience for guests who want current Disney resort activities without digging through PDFs. The product must feel human, magical, intuitive, trustworthy, and visually second to none across mobile, tablet, and desktop.

This PRD expands the existing visual plan into implementation-ready requirements. It does not drop any prior concepts. It turns them into a product and engineering contract with acceptance criteria, responsive rules, technical how-to notes, and QA gates.

North star:

> After the Parks feels like a calm resort concierge that turns today's possibilities into a low-stress story: where to go, when to go, why it fits, and what to do next.

## 2. Research Basis

The PRD is informed by:

- Prior in-app audit screenshots in `audits/ui-storytelling-review-2026-06-26/screenshots/`.
- Existing app components and design tokens in `app/`, `components/`, `lib/`, and `src/styles/`.
- Figma 2026 capabilities: Motion, Code Layers, shaders, generative plugins, variables, components, Dev Mode, and MCP workflows.
- Current accessibility expectations from WCAG 2.2.
- Current performance expectations from Core Web Vitals.
- Current responsive design and browser-support expectations for Chrome, Safari, Edge, and Firefox.
- Disney-inspired storytelling principles, Hidden Mickey traditions, and subtle fan-service patterns, while staying independent and brand-safe.

Reference links:

- Figma Config 2026 recap: https://www.figma.com/blog/config-2026-recap/
- Figma Config 2026 help article: https://help.figma.com/hc/en-us/articles/39582753756695-What-s-new-from-Config-2026
- Figma Motion: https://www.figma.com/blog/introducing-figma-motion/
- Figma release notes: https://www.figma.com/release-notes/
- Figma components: https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma
- Figma generative plugins and shaders: https://help.figma.com/hc/articles/41147702210071/
- Figma-created shaders and plugins: https://help.figma.com/hc/en-us/articles/41409034424215
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Core Web Vitals: https://web.dev/articles/vitals
- CSS scroll-driven animations: https://www.joshwcomeau.com/animation/scroll-driven-animations/
- Chrome / NRK scroll-driven storytelling case study: https://developer.chrome.com/blog/nrk-casestudy
- Codrops scroll-driven 3D storytelling: https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/
- Material iconography: https://m3.material.io/styles/icons/overview
- Apple HIG icons: https://developer.apple.com/design/human-interface-guidelines/icons
- Disney Parks Blog Hidden Mickey coverage: https://disneyparksblog.com/?s=Hidden+Mickey
- D23 Hidden Mickey coverage: https://d23.com/?s=Hidden+Mickey
- Hidden Mickey fan taxonomy: https://www.hiddenmickeyguy.com/

## 3. Product Goals

1. Make every primary screen feel intentional, human, and story-driven.
2. Make filtering feel like guided decision-making, not database narrowing.
3. Make the itinerary feel like a Disney-inspired daybook, not a saved-item list.
4. Make visualizations reveal useful patterns: time, place, pace, confidence, cost, and effort.
5. Replace generic icons and emoji with a fully in-house icon system.
6. Add subtle Hidden Mickey-style details that reward superfans without distracting normal users.
7. Use Figma and Codex as a system: prototype in Figma, implement in code, verify with screenshots and behavior tests.
8. Support mobile, tablet, and desktop with no cramped text, no broken wrapping, no incoherent overlap, and no wasteful empty expanses.

## 4. Non-Goals

- Do not copy Disney characters, official marks, castle silhouettes, Disney type, attraction signage, or protected art.
- Do not use motion as decoration when it hurts clarity or performance.
- Do not hide critical content behind playful interactions.
- Do not introduce a heavy graphics pipeline before static/accessible HTML or SVG proves the UX.
- Do not replace trustworthy source and schedule clarity with visual flourish.

## 5. Users And Use Cases

### Primary Users

- Families on a Walt Disney World resort stay who want low-stress activities between park visits.
- Parents trying to fill time before dinner, after check-in, on pool days, or after park close.
- Couples or adults looking for cozy, low-effort, no-ticket resort moments.
- Returning Disney fans who appreciate small, subtle details and hidden references.

### Core Jobs

- "What can we still do today?"
- "What is happening tonight near my resort?"
- "What is free or low-effort?"
- "Can I build a rest-day plan without overpacking the day?"
- "Can I trust this schedule?"
- "Can I quickly find campfires, movies, crafts, poolside fun, or resort activities?"

## 6. Global Experience Principles

### 6.1 Human-Centered Rules

- Every screen must answer: "What can I do next?"
- Every dense list must have summary, grouping, or filtering support.
- Every empty state must offer recovery.
- Every visual effect must either clarify, reassure, orient, or delight after the user has the core answer.
- Copy must sound like a calm resort concierge, not a technical index.

### 6.2 Layout Rules

- No text overlap, clipped labels, or cramped buttons at any supported breakpoint.
- Text inside controls must wrap or shrink only within designed constraints.
- Buttons and chips must use stable dimensions so hover, active, loading, and badges do not shift layout.
- Content should use measured density: avoid both wall-to-wall clutter and large blank bands.
- Primary content should sit above the fold quickly, with a hint of the next section visible where possible.
- Cards cannot be nested inside decorative cards.
- Page sections should not all become floating cards; use bands, rails, grids, and unframed layouts where appropriate.

### 6.3 Trust Rules

- Cards can summarize; detail pages must explain.
- Source confidence should be visible but not noisy.
- Uncertain time/cost/reservation states must not be visually minimized.
- Visualizations must not imply precision the data does not support.

## 7. Responsive And Browser Requirements

### 7.1 Breakpoint Targets

Design and QA must cover:

- Small mobile: `360 x 740`
- Standard mobile: `390 x 844`
- Large mobile: `430 x 932`
- Small tablet portrait: `768 x 1024`
- Tablet landscape: `1024 x 768`
- Small laptop: `1280 x 800`
- Desktop: `1440 x 960`
- Wide desktop: `1728 x 1117`

### 7.2 Browser Targets

Primary:

- Chrome current and previous major version.
- Safari current and previous major version on iOS and macOS.

Secondary:

- Edge current.
- Firefox current.

Fallback:

- If a feature depends on newer APIs such as View Transitions, scroll-driven animations, advanced masking, or WebGL effects, provide a static or simpler transform/opacity fallback.

### 7.3 Input Modes

All experiences must work with:

- Touch.
- Mouse.
- Trackpad.
- Keyboard.
- Screen readers for all semantic content.

### 7.4 Responsive Acceptance Criteria

- No horizontal page scroll at any target viewport except intentional scroll rails.
- No card title, button label, chip, nav item, or filter label clips at target viewports.
- Mobile bottom nav never covers primary action areas without safe-area padding.
- Sticky headers and filter bars do not cover focused inputs or anchor targets.
- Tablet layouts must not look like stretched mobile or sparse desktop.
- Desktop layouts must not leave large unused whitespace when meaningful summary modules can fill it.

## 8. Accessibility Requirements

Target: WCAG 2.2 AA where applicable.

### 8.1 Required Standards

- Minimum 44px target size for primary touch controls where feasible.
- Visible keyboard focus for every interactive element.
- Focus trap and return focus for modals, sheets, and drawers.
- `aria-live` updates for result counts, filter changes, save status, sync status, and no-results recovery.
- Reduced-motion support for all animation.
- Text contrast at least 4.5:1 for normal text and 3:1 for large text and UI indicators.
- Reflow at 320 CSS px without loss of content or functionality.
- Icons must not be the only way to identify an action.

### 8.2 Accessibility Acceptance Criteria

- Keyboard-only user can search, filter, save, open plan, edit notes, and share/export without a mouse.
- Screen-reader user can understand visualization summaries without needing visual perception.
- Animated visuals are decorative unless they communicate state; state changes must also be textual or semantic.
- Hidden Mickey and decorative magic layers are ignored by assistive tech unless a future user-facing "discoveries" feature is explicitly opened.

## 9. Performance Requirements

Target Core Web Vitals:

- LCP: under 2.5s on representative mobile.
- INP: under 200ms.
- CLS: under 0.1.

### 9.1 Performance Rules

- Server-render long activity lists where possible.
- Keep client islands small: filters, save, plan, visualization interactions.
- Avoid loading motion libraries on routes that do not need them.
- Do not use WebGL/canvas for a visualization until SVG/HTML has been proven insufficient.
- Hero imagery must use `next/image`, stable aspect ratio, and appropriate preload.
- Decorative shader, paper, glow, and grain assets must be small, cached, and optional.

### 9.2 Performance Acceptance Criteria

- No feature ships if it introduces visible layout shift.
- Any animation above the fold must be transform/opacity first or proven equivalent.
- Mobile route bundles should not grow materially from decorative features without an explicit performance review.
- Long lists remain responsive while filters update.

## 10. Figma + Codex Operating Model

### 10.1 Figma Deliverables

Create or maintain these Figma files:

1. `ATP Design System 2027`
   - Tokens, spacing, type, surfaces, colors, elevation, focus, motion, reduced-motion variants.

2. `Explore Filtering Lab`
   - Desktop rail, mobile sheet, active chips, predictive counts, no-results recovery, result summaries.

3. `Tonight Story Prototype`
   - Nightfall Timeline, starlight hero, lantern states, route map, reduced-motion variant.

4. `Plan Daybook Prototype`
   - Visual timeline, pace meter, conflict states, passport, save transition.

5. `Visualization Library`
   - Calendar density bands, resort constellation, confidence ledger, category bars.

6. `ATP Resort Glyphs`
   - In-house icon family with static, tone, size, state, and motion variants.

7. `Hidden Mickey QA Board`
   - Internal-only placements, triggers, screenshots, and reduced-motion states.

### 10.2 Figma Requirements

- Use variables and modes for daypart, density, high contrast, and reduced motion.
- Use components and variants for recurring UI.
- Use Figma Motion to prototype interactions before coding complex motion.
- Use Dev Mode/MCP-compatible handoff for specs, sizes, timing, easing, and states.
- Use generative tools and shaders for texture/glow exploration, but final assets must be reviewed, optimized, and source-safe.

### 10.3 Codex Implementation Requirements

- Translate approved Figma components into local React/CSS components following existing app patterns.
- Prefer semantic HTML, CSS, SVG, and lightweight React before canvas/WebGL.
- Keep source-of-truth data in existing `lib/*` modules where possible.
- Use a component registry for icons and visualizations to prevent one-off art from spreading.
- Add screenshot verification for every major visual phase.

## 11. Technical Architecture

### 11.1 New Component Areas

Proposed additions:

- `components/icons/*`
- `components/visualizations/*`
- `components/motion/*`
- `components/filters/*` if filtering grows beyond current `components/explore/*`
- `docs/visual-qa/*` for QA inventories and screenshots

### 11.2 Data And Metadata Changes

Replace visual string fields with semantic keys:

```ts
type IconKey =
  | "poolside"
  | "campfire"
  | "movies_under_stars"
  | "fitness_wellness"
  | "arts_crafts"
  | "signature"
  | "resort_activity"
  | "arcade"
  | "rental"
  | "sports_games"
  | "nighttime_entertainment"
  | "scavenger_hunt"
  | "nature"
  | "music"
  | "other"
  | "today_nav"
  | "tonight_nav"
  | "explore_nav"
  | "plan_nav"
  | "search_activity"
  | "search_resort"
  | "search_guide"
  | "search_category"
  | "search_movie"
  | "search_offering";
```

Example metadata shape:

```ts
interface CategoryMeta {
  label: string;
  iconKey: IconKey;
  stamp: string;
  mood?: string[];
}
```

### 11.3 Motion API Pattern

All motion-capable visual components should accept:

```ts
type MotionLevel = "none" | "state" | "ambient";

interface MotionProps {
  motion?: MotionLevel;
  reducedMotion?: boolean;
}
```

Rules:

- `none`: no animation, static state.
- `state`: one-time transition on user action or state change.
- `ambient`: low-frequency atmospheric motion, route-limited.

### 11.4 Visualization API Pattern

Each visualization should expose:

- `data`
- `selectedId` or `selectedDate` when relevant
- `onSelect`
- `ariaLabel`
- `summary`
- `density` or `variant`
- `motion`

Every visualization must provide a plain text summary next to or inside it.

## 12. Phase Requirements

## Phase 1: Design System Hardening

### Problem

The app has a warm identity but still uses scattered visual values, mixed icon sources, and repeated card surfaces. This makes it hard to achieve a second-to-none finish consistently.

### Requirements

- Consolidate semantic tokens in `src/styles/tokens.css`.
- Define daypart modes: `sunshine`, `afternoon`, `golden-hour`, `starlight`.
- Define density modes: `compact`, `comfortable`, `editorial`.
- Define motion tokens: duration, easing, reduced-motion behavior.
- Define focus, selected, disabled, loading, and error states.
- Define responsive spacing rules with `clamp()` and container-aware layouts.

### Technical How-To

- Audit hardcoded colors and spacing in `components/*`, `app/globals.css`, and `src/styles/polish.css`.
- Replace route-specific surface values with semantic custom properties.
- Keep cards at 8px radius or less where they behave as operational cards, unless a stamp/journal metaphor explicitly needs a distinct radius.
- Add CSS utilities for stable control dimensions: icon buttons, chips, tabs, calendar cells, timeline stops.
- Use container queries for card grids and visualization panels where parent width matters more than viewport.

### Acceptance Criteria

- All primary routes use shared semantic colors and spacing.
- Every interactive state has a documented token or class.
- No UI text overlaps or clips in target viewport matrix.
- No component changes size unpredictably on hover, save, loading, or active state.
- A screenshot pass confirms Home, Explore, Tonight, Calendar, Resorts, Activity Detail, Search, and Plan feel from the same system.

## Phase 2: Filtering V2

### Problem

Filtering is accessible but not yet decision-assistive. Guests can narrow results but do not get enough feedback, preview, explanation, or recovery.

### Requirements

- URL remains the source of truth.
- Add active filter chips with one-tap removal.
- Add predictive counts for filter options.
- Add no-results diagnosis and recovery.
- Add undo after clearing filters.
- Add saved resort context.
- Add guest-facing sort labels.
- Add `aria-live` result updates.
- Keep mobile sheet one-hand usable.

### Technical How-To

Affected files:

- `components/explore/BrowseFilterShell.tsx`
- `components/explore/FilterRail.tsx`
- `components/explore/FilterSheet.tsx`
- `components/explore/ResultSummary.tsx`
- `components/atlas/FilterBar.tsx`
- `lib/explore/browseParams.ts`
- `app/activities/page.tsx`
- `app/today/page.tsx`
- `app/tonight/page.tsx`

Implementation notes:

- Create a `FilterStateSummary` helper that converts URL params into human-readable chips.
- Create a `FilterImpact` helper server-side or cached to compute option counts.
- Mobile sheet should keep sticky `Apply`, `Clear`, and active-count summary visible.
- Resort picker should use searchable list UI, not an enormous native select as the primary mobile interaction.
- Empty state should know which filters are active and suggest the least destructive recovery first.

### Acceptance Criteria

- A user can see all active filters without opening the sheet.
- A user can remove any filter in one tap/click.
- Empty results show at least three recovery actions.
- Filter changes announce updated result count.
- Filter controls do not clip at 360px width.
- Mobile filter sheet supports keyboard focus order and escape/close.
- Tablet layout avoids both cramped mobile stacking and overly sparse desktop rails.

## Phase 3: Card And Detail Upgrade

### Problem

Cards are readable but repeated card streams flatten the experience. Detail pages are useful but do not yet help guests decide quickly.

### Requirements

- Define card variants: `compact`, `standard`, `rich`, `timeline`, `recommendation`.
- Add decision signals: effort, confidence, time clarity, cost clarity, reservation effort.
- Add "why this fits" text for recommended cards.
- Move detailed provenance to detail pages while preserving key trust flags on cards.
- Add smarter "More like this": same resort, same time, same energy, nearby option.

### Technical How-To

Affected files:

- `components/events/EventCard.tsx`
- `components/events/event-ui.tsx`
- `components/activity/ActivityOfferingCard.tsx`
- `components/atlas/ActivityDetailClient.tsx`
- `components/resort/ResortCard.tsx`
- `lib/displayActivity.ts`
- `lib/events/mapToEventCard.ts`

Implementation notes:

- Expand display-safe objects rather than reading raw ingest data in UI.
- Add `DecisionSignal` DTO derived from activity enrichment and display quality.
- Use `IconGlyph` from Phase 8 for all card icons.
- Use stable media/icon slots to prevent cards jumping when badges wrap.
- Card titles should line-clamp only when a route has a designed expansion affordance or detail link.

### Acceptance Criteria

- Cards are scannable in under 3 seconds during design review.
- Card heights remain stable within each grid row where possible.
- Detail pages answer: what, where, when, cost, effort, confidence, why save.
- No source/trust warning is visually hidden behind playful styling.
- Card text does not overlap or clip at all target viewports.

## Phase 4: Visualization Layer

### Problem

Current views show lists and counts but do not reveal patterns across time, place, effort, or confidence.

### Required Visualizations

1. Nightfall Timeline.
2. Resort Activity Constellation.
3. Calendar Density Bands.
4. Plan Pace Meter.
5. Source Confidence Ledger.

### Technical How-To

New directory:

- `components/visualizations/*`

Implementation sequence:

1. Build static semantic HTML/SVG version.
2. Add keyboard selection and text summary.
3. Add responsive layout variants.
4. Add state motion.
5. Add optional shader/canvas enhancement only if needed.

Visualization-specific notes:

- Nightfall Timeline: x-axis 5pm-11pm, encode event type, confidence, cost, and "still worth leaving for".
- Resort Activity Constellation: cluster by daypart/category, use size or density only when count differences are meaningful.
- Calendar Density Bands: replace dots with daypart bands and selected-day summary.
- Plan Pace Meter: show gaps, overlaps, backtracking, reservation risk, and low-stress score.
- Source Confidence Ledger: guest-readable trust status, not an internal audit table.

### Acceptance Criteria

- Every visualization has a text equivalent.
- Every visualization works on mobile without requiring pinch zoom.
- Keyboard users can move through selectable data points.
- Visualizations do not claim exactness beyond the data.
- Static fallback is meaningful if motion or advanced rendering is unavailable.

## Phase 5: Plan Daybook

### Problem

The plan is promising but reads as saved items grouped by date/daypart. It should feel like a story-driven itinerary.

### Requirements

- Rename sections into story acts while preserving time labels.
- Add vertical timeline with time, gaps, conflict zones, and travel effort.
- Add pace meter: low-stress, packed, long gap, conflict, reservation risk.
- Add day summary and next-best actions.
- Keep notes, share, calendar export, sync status, and plan settings accessible.
- Support drag/reorder only when persistence is durable.

### Technical How-To

Affected files:

- `components/atlas/PlanPageClient.tsx`
- `components/plan/PlanTimeline.tsx`
- `components/plan/PlanItem.tsx`
- `components/plan/ResortPassport.tsx`
- `lib/plan/*`

Implementation notes:

- Add `PlanStorySection` mapping for user-facing labels.
- Add derived `PlanPaceAnalysis` from item times, durations, resort areas, and conflicts.
- Show time gaps visually, but do not require exact travel times unless sourced.
- Move remove/edit controls into predictable locations with stable tap targets.
- Use local-only persistence caveats until server sync issues are resolved.

### Acceptance Criteria

- One-item plan still feels useful.
- Multi-item plan reads as a day story.
- Conflicts and long gaps are visible without reading every card.
- Plan actions remain reachable on mobile.
- Reduced-motion mode preserves timeline clarity.
- Server-sync status is honest.

## Phase 6: Motion, Figma, And Wow QA

### Problem

Wow moments exist as ideas but need motion discipline so they enhance clarity instead of becoming noise.

### Requirements

- Prototype complex motion in Figma Motion first.
- Translate motion into CSS or `motion` library only after approval.
- Provide reduced-motion parity.
- Use View Transitions only when they improve continuity.
- Add screenshot and interaction QA for all motion.

### Required Wow Visuals

1. Living Resort Diorama Hero.
2. Starlight Firefly Route Map.
3. Filter Alchemy Board.
4. Folded Map To Daybook Transition.
5. Calendar Time-Weather Aurora.

### Technical How-To

- Living Diorama: layered `next/image`, CSS variables, optional shader overlay, daypart mode.
- Firefly Route Map: SVG path first; canvas/WebGL later only if density requires it.
- Filter Alchemy Board: React state visualization tied to URL params.
- Folded Map Transition: CSS perspective and View Transition fallback.
- Calendar Aurora: CSS gradients/SVG masks first, shader later.

### Acceptance Criteria

- Motion supports orientation, feedback, or delight.
- No animation blocks primary action.
- No animation introduces layout shift.
- Reduced-motion mode is polished and not merely broken/off.
- Visual QA confirms effects look premium, not gimmicky.

## Phase 7: Hidden Mickey Layer

### Problem

Superfans should feel rewarded by subtle details, but normal users should never feel distracted or confused.

### Requirements

- Add exactly 10 documented hidden details from the current plan.
- Keep details naturally integrated.
- Do not use obvious logos or Disney-owned assets.
- Make at least 6 of 10 interaction/time/scroll triggered.
- Document internal QA inventory.

### Required Hidden Details

1. Hero Lantern Alignment.
2. Quick Finder Bubble Trail.
3. Filter Chip Constellation.
4. Calendar Triple-Dot Upgrade.
5. Resort Card Tilework.
6. Activity Category Stamp Imperfection.
7. Plan Passport Completion Reveal.
8. Starlight Firefly Pause.
9. Search Suggestion Easter Echo.
10. Footer Paper Grain Secret.

### Technical How-To

- Create `docs/visual-qa/hidden-mickeys.md`.
- Add route, trigger, screenshot, reduced-motion behavior, and brand-safety note for each.
- Use decorative markup only.
- Prefer CSS radial gradients, texture masks, and SVG overlays.
- Avoid prominent three-circle marks in first viewport.

### Acceptance Criteria

- Hidden details are discoverable but never required.
- Hidden details do not affect layout, accessibility, or task completion.
- QA inventory exists and is complete.
- Reduced-motion behavior is documented.

## Phase 8: In-House Magical Icon System

### Problem

The UI currently mixes emoji, generic SVGs, and text glyphs. This undermines the premium design language.

### Requirements

- Replace all emoji icons and generic inline nav SVGs.
- Create in-house `Resort Glyphs` system.
- Add static and living variants where appropriate.
- Use semantic `iconKey` values in metadata.
- Include app/PWA icon replacement.
- Ensure icons are legible at 16, 24, 32, 64, and 96px.

### Icon Inventory

Replace icons in:

- `lib/categories/meta.ts`
- `components/activity/CategoryIcon.tsx`
- `components/activity/ActivityOfferingCard.tsx`
- `components/events/event-ui.tsx`
- `components/resort/ResortCategorySections.tsx`
- `components/layout/MobileBottomNav.tsx`
- `components/explore/BrowseDayTabs.tsx`
- `lib/plan/sections.ts`
- `components/plan/PlanTimeline.tsx`
- `components/plan/ResortPassport.tsx`
- `lib/magic/collections.ts`
- `components/magic/NoTicketMagic.tsx`
- `lib/magic/nearby.ts`
- `components/magic/MagicNearby.tsx`
- `components/search/SearchHitRow.tsx`
- `lib/search/runSearch.ts`
- `components/atlas/EmptyState.tsx`
- `components/tonight/NightEmptyState.tsx`
- `app/icon.tsx`
- `app/manifest.ts`

### Technical How-To

New files:

- `components/icons/IconGlyph.tsx`
- `components/icons/iconRegistry.ts`
- `components/icons/types.ts`
- `components/icons/*.tsx`

Implementation notes:

- Replace `icon: string` metadata with `iconKey`.
- Keep labels in metadata for accessibility and text UI.
- Decorative SVGs must be `aria-hidden`.
- Use `title` or visible text when an icon alone is interactive.
- Export Figma SVG paths into reviewed local React components.
- Do not inline large SVG blobs repeatedly; centralize in registry.

### Required Icon Concepts

- `poolside`: lagoon ripple with beach ball glint.
- `campfire`: ember fire with marshmallow stick.
- `movies_under_stars`: starlit screen with palm shadows.
- `fitness_wellness`: sunrise stretch ribbon / leaf path.
- `arts_crafts`: paint daub + bead string.
- `signature`: compass sparkle seal.
- `resort_activity`: resort key tag with palm notch.
- `arcade`: joystick star button.
- `rental`: surrey wheel + ribbon.
- `sports_games`: ball arc over court line.
- `nighttime_entertainment`: lantern moon.
- `scavenger_hunt`: folded map with trail.
- `nature`: leaf + firefly dot.
- `music`: musical note as resort pennant.
- `other`: journal ticket stub.
- Nav: sunbeam badge, moon over lagoon, search compass, daybook.
- Search: spark, resort keyhole, guide page, luggage tag, starlight screen, source seal check.

### Acceptance Criteria

- No emoji remains in production UI metadata/components.
- In-house icons appear on all primary routes.
- Icons are cohesive and relevant.
- Campfire/s'mores icon feels alive through ember glow/marshmallow warmth.
- Motion variants respect reduced motion.
- App/PWA icon no longer uses plain `AP` initials.

## 13. Screen Requirements

### Home

Requirements:

- Hero remains first-viewport signal.
- Finder becomes story-driven and previews results.
- Daypart mode can change atmosphere.
- Quick chips remain accessible and non-cramped.
- Next section peeks on mobile and desktop when feasible.

Acceptance:

- At 390px wide, hero text, selects/controls, and chips do not clip.
- At 1440px wide, hero does not feel empty or washed out.
- Finder gives clear next action and route.

### Explore / Today

Requirements:

- Filtering V2.
- Active chips.
- Best Bets strip.
- Recovery-rich empty states.
- Better grouping by intent.

Acceptance:

- A filtered no-result state names the blockers.
- Results remain scannable on mobile.
- Desktop uses left filters, central results, and optional right plan/preview rail without cramped columns.

### Tonight

Requirements:

- Keep distinct starlight mode.
- Add Nightfall Timeline.
- Add low-key/campfire/movie sections with useful empty states.
- Add lantern/firefly motion only where meaningful.

Acceptance:

- Tonight feels meaningfully different from Explore.
- First viewport tells the guest what is still possible.
- Motion is atmospheric and restrained.

### Calendar

Requirements:

- Replace dots with density bands/aurora.
- Add selected-day story panel.
- Add filters without clutter.
- Support mobile month navigation.

Acceptance:

- User can compare day density at a glance.
- Day cell data remains screen-reader accessible.
- Calendar does not become cramped on mobile.

### Resorts

Requirements:

- Resort cards gain personality and category visualization.
- Add area grouping or area rail.
- Add richer source/trust/freshness on detail pages.

Acceptance:

- Cards explain what each resort is good for.
- Detail page quickly answers what is happening today/tonight.
- Resort list is not visually repetitive.

### Activity Detail

Requirements:

- Add decision card.
- Add location/effort context.
- Add smarter related items.
- Keep save/source actions clear.

Acceptance:

- User can decide whether to go without scanning the whole page.
- Save action is clear and does not obscure source confidence.

### Search

Requirements:

- Concierge-style answer module for intent-rich queries.
- Result-type filters.
- Better visual differentiation.
- Synonym/intent mapping.

Acceptance:

- Query `campfire near Grand Floridian tonight` shows a direct answer if data supports it.
- Search preview remains keyboard accessible.

### My Plan

Requirements:

- Plan Daybook.
- Pace meter.
- Passport.
- Share/export/sync clarity.
- Save-to-plan transition.

Acceptance:

- Plan reads as an itinerary story.
- User can see risks and next actions.
- Mobile plan controls remain reachable.

## 14. White Space, Density, And Text-Fit Rules

### 14.1 No Cramped UI

- Minimum chip/control height: 44px for touch areas.
- Compact text must still meet readability requirements.
- Long resort names must wrap intentionally.
- Buttons must not rely on single-line text if label length can vary.
- Calendar cells and cards must have stable dimensions.

### 14.2 No Wasteful White Space

- Large desktop blank areas should be filled with summary, preview, timeline, or decision-support modules.
- Empty states should use meaningful recovery content, not only centered text.
- Full-width hero/section bands should reveal next content where feasible.
- Tablet layouts should often use two columns or side panels rather than oversized single-column mobile layouts.

### 14.3 Acceptance Criteria

- Visual QA flags any region larger than 25% of viewport height that is empty without intentional purpose.
- Text-fit QA checks longest known resort names and activity names.
- Screenshots at all target viewports show no incoherent overlap.

## 15. Testing And QA Plan

### 15.1 Automated Checks

Run relevant existing checks:

```bash
npx tsc --noEmit --pretty false
npm run validate:trust -- http://localhost:3000
npm run validate:contracts
```

Add when implementation begins:

- Visual smoke screenshots for target viewports.
- Accessibility checks for keyboard and focus.
- Bundle/performance budget checks.
- Icon registry tests to prevent emoji regression.
- Reduced-motion snapshot checks for motion-heavy routes.

### 15.2 Manual QA Matrix

For each major phase, test:

- Mobile small.
- Mobile large.
- Tablet portrait.
- Tablet landscape.
- Desktop.
- Wide desktop.
- Chrome.
- Safari.
- Edge.
- Firefox.
- Keyboard-only.
- Reduced motion.
- High contrast or increased contrast where supported.

### 15.3 Screenshot QA

Required screenshots:

- Home first viewport and below fold.
- Explore default, filtered, no-results, mobile sheet.
- Today default and filtered.
- Tonight default, timeline, empty movie/campfire state.
- Calendar month and selected day.
- Resorts index and resort detail.
- Activity detail.
- Search empty, preview, and results.
- Plan empty, one item, multi-item, conflict.
- Icon system sheet.
- Hidden Mickey QA board.

## 16. Global Definition Of Done

A phase is done only when:

- Requirements are implemented.
- Acceptance criteria are met.
- Mobile, tablet, and desktop screenshots are captured.
- Keyboard and reduced-motion checks pass.
- Visual QA confirms no cramped text, no incoherent overlap, and no wasteful blank space.
- Performance remains within Web Vitals targets or has a documented exception.
- Accessibility risks are documented and resolved or explicitly deferred.
- Figma source and code implementation match within documented tolerances.
- The change preserves source trust and does not introduce unsupported claims.

## 17. Release Sequencing

Recommended implementation order:

1. Design System Hardening.
2. Filtering V2 and empty-state recovery.
3. Card/detail decision signals.
4. In-house Resort Glyphs icon system.
5. Plan Daybook story timeline.
6. Nightfall Timeline.
7. Calendar Density Bands.
8. Resort constellation and richer resort cards.
9. Motion/Figma wow layer.
10. Hidden Mickey Layer.

Reasoning:

- System and filters create the foundation.
- Cards and icons affect every route and should happen before advanced visuals.
- Plan, timeline, and calendar then add deeper storytelling.
- Hidden details come last so they do not distract from core UX quality.

## 18. Open Implementation Risks

- Durable plan sync had local Turnstile/captcha `403` failures during the audit. Plan Daybook implementation should not imply durable cross-device persistence until sync is verified.
- Figma Code Layers and some advanced features may be beta/closed beta. Treat them as workflow accelerators, not hard dependencies.
- Shader/canvas effects may create performance or browser compatibility risk. Ship static/SVG versions first.
- Hidden Mickey-style details require brand-safety review.
- Icon replacement is broad and can create regressions if not registry-driven.

## 19. Appendix: Original Plan Coverage Checklist

This PRD preserves and expands:

- Home hero and finder.
- Explore/Today filtering.
- Tonight starlight mode.
- Calendar visualization.
- Resort index and detail upgrades.
- Activity detail decision support.
- Concierge search.
- Plan Daybook.
- Filtering best-practice plan.
- Nightfall Timeline.
- Resort Activity Constellation.
- Calendar Density Bands.
- Plan Pace Meter.
- Source Confidence Ledger.
- Motion and wow factors.
- Living Resort Diorama Hero.
- Starlight Firefly Route Map.
- Filter Alchemy Board.
- Folded Map To Daybook Transition.
- Calendar Time-Weather Aurora.
- Figma workflow and deliverables.
- Hidden Mickey Layer and all 10 ideas.
- In-house Resort Glyphs icon system and full replacement map.
- Accessibility, performance, browser, responsive, and QA requirements.
