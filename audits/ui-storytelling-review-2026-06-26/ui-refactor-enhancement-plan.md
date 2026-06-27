# UI Refactor And Storytelling Enhancement Plan

Date: 2026-06-26  
App reviewed: `http://localhost:3000`  
Destination: local audit folder  
Primary lens: human-centered Disney-inspired resort planning, advanced web UI, visualizations, filters, itinerary storytelling, motion, and Figma-enabled workflow.

Execution PRD: `docs/visual-experience-prd.md` expands this audit plan into detailed requirements, technical how-to guidance, acceptance criteria, responsive/browser QA, and definitions of done.

## Evidence Captured

Screenshots are saved in `audits/ui-storytelling-review-2026-06-26/screenshots/`.

Runtime note: the populated plan was captured from local browser state. The local dev server rejected durable plan sync with Turnstile/captcha `403` responses during the save flow, so the plan screenshot is valid for UI review but not proof that server-backed plan persistence is healthy.

| Step | Screen / state | Health | Evidence |
| --- | --- | --- | --- |
| 1 | Home hero and finder | Strong emotional first impression | `01-home-desktop-viewport.png`, `01-home-viewport.png` |
| 2 | Explore activities | Solid structure, high density | `02-activities-desktop-viewport.png`, `02-activities-viewport.png` |
| 3 | Filtered empty state | Clear but underwhelming recovery | `03-activities-filtered-desktop-viewport.png`, `03-activities-filtered-viewport.png` |
| 4 | Today | Useful, but card stream lacks a day story | `04-today-desktop.png` |
| 5 | Tonight | Best themed screen; needs more spatial/time magic | `05-tonight-desktop-viewport.png`, `05-tonight-viewport.png` |
| 6 | Calendar | Functional but not yet a visualization | `06-calendar-desktop-viewport.png`, `06-calendar-viewport.png` |
| 7 | Resorts | Clean and scannable, visually generic | `07-resorts-desktop-viewport.png` |
| 8 | Resort detail | Informative, but list-heavy | `08-resort-detail-desktop-viewport.png` |
| 9 | Activity detail | Strong facts, light on immersion | `09-activity-detail-desktop-viewport.png` |
| 10 | Search | Useful, could become concierge-like | `10-search-campfire-desktop-viewport.png` |
| 11 | Empty plan | Warm and clear | `11-plan-empty-desktop-viewport.png` |
| 12 | Populated plan | Promising daybook foundation | `12-plan-populated-desktop-viewport.png` |
| 13 | Mobile Explore | Good controls, some horizontal clipping | `13-activities-mobile-before-filter.png` |
| 14 | Mobile filter sheet | Strong bottom-sheet pattern, can be smarter | `14-activities-mobile-filter-sheet.png` |

## Executive Read

The product is already past generic travel-site territory. The typography, cream palette, lagoon accents, starlight language, passport metaphors, and mobile bottom nav create a warm planning journal. The next leap is not more decoration. It is turning schedules into a story guests can understand at a glance.

North star: **After the Parks should feel like a calm Disney resort concierge that turns today's possibilities into a low-stress story: where to go, when to go, why it fits, and what to do next.**

## Current Strengths

- The home hero has a real sense of place, especially on desktop, with a strong "between park days" premise.
- The app uses URL-backed filters, result counts, sticky mobile controls, and bottom-sheet filtering, which are strong modern UX foundations.
- Tonight already has a distinct mood and a better editorial feel than the generic browse pages.
- Activity detail pages expose the right trust primitives: when, cost, best for, location, good-to-know, source, and save.
- The plan page has the right metaphors: rest day, resort passport, daybook sections, notes, sharing, calendar export.

## Highest-Impact Gaps

1. **The browse experience is still a catalog.** Explore, Today, Calendar, and Resort detail often become long streams of repeated cards. They need stronger summarization, clustering, and visualization.
2. **Filtering is easy to access, but not yet decision-assistive.** Guests can narrow results, but the UI does not preview impact, explain tradeoffs, recommend next filters, or recover elegantly from no results.
3. **The itinerary is grouped, not yet story-driven.** Date and daypart grouping is good, but a Disney-inspired itinerary should feel like acts in a guest's day: arrival, reset, golden hour, starlight, return.
4. **Visualizations are underpowered.** Calendar dots, resort cards, and result counts are functional, but not second-to-none. The app needs time, place, confidence, and energy visualizations.
5. **The "wow" layer is mostly aesthetic, not systemic.** Passport stamps and hero imagery are good starts. The next wave should use motion, spatial transforms, tactile state changes, and generative design systems in ways that support comprehension.

## Screen-Level Recommendations

### Home

Keep the current hero direction. It is the strongest emotional asset.

Improve:
- Add a subtle day-to-night story state: morning, afternoon, evening, starlight. The Quick Finder selection should change the hero atmosphere and suggested chips.
- Convert the three selects into a single "Tell us your resort day" panel with progressive choices: When, where, who is this for, energy level.
- Show an immediate preview after selections: "Tonight near Contemporary: 3 campfires, 2 movies, 4 low-key ideas."
- Keep the next section peeking above the fold on desktop and mobile so the hero feels immersive but not like a dead poster.

### Explore / Today

Improve:
- Add active filter chips above results with one-tap removal.
- Add predictive counts on filter options: `Campfires (18)`, `Free (42)`, `Afternoon (61)`.
- Replace static "No activities match" with a recovery panel: remove the most constraining filter, show adjacent times, suggest similar categories, and preserve the user's intent.
- Add a "Best bets" editorial strip before the full list: 3 source-backed, high-confidence activities matching the current context.
- Add sectioning by guest intent, not only time: "Easy wins", "Worth a short ride", "Needs reservation", "Good if weather changes".

### Tonight

Tonight is the most on-brand screen and should become the flagship.

Improve:
- Add a horizontal "Nightfall Timeline" from dinner through late evening, with cards positioned by start time.
- Add starlight-specific states: "happening now", "still worth leaving for", "next showing", "last call".
- Pull the movie/campfire empty state closer to the top when no movie listings exist, then give a clear fallback route.
- Use motion sparingly: lantern breathing only for currently happening events; reduced-motion users get static highlights.

### Calendar

The calendar is currently a utility grid. It should become a planning visualization.

Improve:
- Replace three tiny dots with density bars or daypart bands: morning, afternoon, evening, starlight.
- Add a selected-day summary card: count, best resort, most common category, free/paid mix.
- Add multi-day stay planning: "Your best low-stress resort day appears to be Jun 29."
- Add a compact heatmap view for resort/category density.

### Resorts

The resort index is clear, but the cards rely on gradients and initials. They scan well but do not teach enough about each resort's experience.

Improve:
- Add resort personality signals: "Best for pool breaks", "Most evening options", "Great for little kids", "Worth traveling for".
- Add area-map grouping or a resort area rail.
- Add richer category visualization inside each card: small stacked bars or icon clusters for today / tonight / standing offerings.
- Consider real, source-safe resort-adjacent imagery or generated non-IP atmospheres tailored to resort tier and area.

### Resort Detail

Improve:
- Reframe the page as a resort "arrival board": what is happening now, tonight, and later this week.
- Add a daypart timeline above the card lists.
- Add a source confidence panel that is readable by guests, not just data-minded users.
- Let users pivot by intent: "Plan a resort-only evening", "Find a free activity", "Keep kids busy before dinner".

### Activity Detail

Improve:
- Add a visual "decision card" in the right rail: time, travel effort, reservation effort, cost clarity, confidence.
- Add a mini map or "where this sits at the resort" placeholder, even if the first version is area-based rather than precise.
- Add "why save this?" copy based on category and daypart.
- Make "More like this" smarter: same resort, nearby resort, same time, same energy.

### Search

Improve:
- Make search feel like asking a concierge. Example query handling: "campfire near Grand Floridian tonight" should show a direct answer module before the result list.
- Add result-type filters after search: Activities, Resorts, Guides, Movies, Official offerings.
- Use preview rows with more visual differentiation. Current rows are clean but samey.
- Add typo/synonym handling and intent chips: `marshmallows` -> campfires, `movie outside` -> Movies Under the Stars.

### My Plan

The populated plan proves the foundation is sound. Now make it a story.

Improve:
- Rename daypart sections into story acts: "Reset", "Afternoon Adventure", "Golden Hour", "Starlight", while preserving accessible time labels.
- Add a path visualization: a vertical timeline with time gaps, conflict zones, and travel effort.
- Add "pace" feedback: low-stress, packed, backtracking, long gap, reservation risk.
- Add drag/reorder with visible time-gap recalculation.
- Add an end-of-day story summary: "A craft at Contemporary, then room to breathe before dinner."
- Turn passport stamps into earned category/resort achievements, but keep them secondary to planning clarity.

## Filtering Best-Practice Plan

Filtering should move from "narrow a database" to "guide a guest."

### Required Behaviors

- URL remains the source of truth for shareable filtered states.
- Active filters are visible as removable chips on desktop and mobile.
- Filter options show counts before selection.
- Empty states identify the blocker: "Free + Campfire has no matches today."
- Clear all is always visible once filters are active.
- Apply/Clear sheet controls stay sticky on mobile.
- Resort search supports typeahead, recent resort, and "near this resort" later.
- Sort labels are guest-facing: `Soonest`, `Best fit`, `Recently verified`, `Free first`, `Low effort`.
- Result count changes should announce through `aria-live`.

### Advanced Filter Features

- **Smart defaults:** infer `Tonight` when the user arrives after 4pm.
- **Filter impact preview:** show `+23` or `0` before applying.
- **Progressive disclosure:** hide category and resort long lists behind searchable controls.
- **Undo:** after clearing filters, show "Filters cleared. Undo."
- **Saved context:** remember selected resort locally and prefill it across Home, Explore, Tonight, Calendar, and Plan.

## Visualization Plan

Second-to-none visualization means the UI should show patterns guests cannot easily infer from cards.

### Build These Visualizations

1. **Nightfall Timeline**
   - Horizontal time axis, 5pm-11pm.
   - Group movies, campfires, low-energy activities.
   - Encode confidence with border style and cost with badge.

2. **Resort Activity Constellation**
   - Resort detail summary that clusters activities by daypart and category.
   - Use accessible SVG or HTML/CSS first; canvas only if density requires it.

3. **Calendar Density Bands**
   - Replace dots with tiny stacked bars by daypart.
   - Selected day expands into a story summary.

4. **Plan Pace Meter**
   - Shows open breathing room, overlapping activities, long gaps, and reservation risk.
   - Avoid gamifying too heavily; this is reassurance, not pressure.

5. **Source Confidence Ledger**
   - Guest-readable trust visualization: recently verified, time clear, cost clear, source linked.
   - Keep details on activity/resort pages; cards show only the most important signal.

## Motion And Wow Factors

Motion should make the app feel alive while clarifying state.

### High-Value Motion

- Save stamp lands on the card, then travels subtly to the Plan count.
- Filter sheet opens with a spring and keeps focus contained.
- Active filter chips animate in/out with stable layout.
- Tonight lantern glow breathes only for happening-now cards.
- Calendar selected day expands into the day story.
- Plan timeline items reorder with preserved spatial continuity.
- Empty state recovery cards slide in after no-results, showing the next best move.

### Research Addendum: 5 More Advanced Wow Visuals

External research signals:
- Figma Config 2026 pushes code layers, Motion, shaders, generative plugins, Weave tools, and agents onto the canvas.
- Figma Motion plus 3D transforms is aimed at spatial interaction prototyping with dev-ready export/MCP handoff.
- Figma generative plugins and shaders can create WebGL-rendered fills/effects, save shader styles to libraries, and export shader instances through MCP workflows.
- Modern web inspiration is trending toward scroll-driven storytelling, 3D worlds with intent, shader-driven graphics, and native CSS scroll animation APIs.

#### 1. Living Resort Diorama Hero

Concept: turn the home hero into a layered "living postcard" that subtly shifts from sunshine to golden hour to starlight as the guest changes Date/Vibe or scrolls. The palm silhouettes, lantern glow, water shimmer, and movie screen light become separate layers with tiny motion, not a looping video.

Figma leverage:
- Use Figma Motion to choreograph the daypart transitions.
- Use variables/modes for `sunshine`, `golden-hour`, and `starlight`.
- Use shaders for lagoon shimmer, paper grain, and lantern bloom.
- Use Code Layers or MCP handoff to compare live CSS/React versions beside static frames.

Codex implementation hook:
- Build with layered `next/image`, CSS custom properties, scroll-driven animation, and reduced-motion fallbacks.
- Keep it transform/opacity first; reserve shader/canvas enhancement for desktop or high-capability devices.

Why it matters:
- The hero stops being a beautiful poster and becomes an interactive story surface that teaches the user the app is time-aware.

#### 2. Starlight Firefly Route Map

Concept: on Tonight and Resort Detail, show a magical-but-useful route map where tiny firefly points trace a guest's possible evening: dinner buffer, campfire, movie, return-to-room. Each point encodes time, confidence, and effort.

Figma leverage:
- Prototype animated paths with Motion.
- Generate glow/path shaders for the firefly trail.
- Use interactive components for `selected`, `hover`, `conflict`, and `low-confidence` states.
- Use the Figma plugin/API to generate route variants from real resort/activity data.

Codex implementation hook:
- First version can be accessible SVG with animated stroke-dashoffset and static text alternatives.
- Later version can use canvas/WebGL for dense paths, but only after SVG proves the UX.

Why it matters:
- It makes "what should we do tonight?" feel like a guided resort story rather than a list of cards.

#### 3. Filter Alchemy Board

Concept: replace flat filtering feedback with an "alchemy board" where selected filters become orbiting tokens around the result count. When a filter produces no matches, the board gently shows which token is blocking the spell and suggests swaps.

Figma leverage:
- Use variables for token states and result-count modes.
- Use Motion to prototype filter tokens snapping, combining, and dissolving.
- Use generative plugins to create reusable token art for categories without hand-making every badge.

Codex implementation hook:
- Build as a lightweight React state visualization above results.
- Use CSS motion and layout animations; no heavy graphics required.
- Tie directly to URL params so it stays shareable.

Why it matters:
- Filtering becomes playful and understandable. Guests can see cause and effect instead of guessing why the list changed.

#### 4. Folded Map To Daybook Transition

Concept: when a guest saves an activity, the card briefly folds like a paper map, stamps itself, and lands inside the Plan daybook. On the Plan page, sections unfold like pages with time gaps and pace warnings.

Figma leverage:
- Use 3D transforms to prototype the fold/tilt.
- Use Motion timelines for save-to-plan and page-unfold interactions.
- Use Code Layers to test real CSS perspective values and export dev-ready motion specs.

Codex implementation hook:
- Use CSS `perspective`, `transform-style: preserve-3d`, View Transitions where supported, and a plain fade/scale fallback.
- Trigger only on direct save actions, not while scrolling dense lists.

Why it matters:
- It connects discovery to planning with a memorable physical metaphor: "I found this, I tucked it into my day."

#### 5. Calendar Time-Weather Aurora

Concept: replace calendar dots with animated daypart auroras: each day cell has a tiny vertical band for morning, afternoon, evening, and starlight density. Selecting a day expands the aurora into a readable story panel.

Figma leverage:
- Use shader fills for soft aurora/density bands.
- Use variables for daypart colors, confidence, and density.
- Use Motion to expand a day cell into the story panel.
- Generate plugin helpers that turn activity JSON into calendar mock data layers.

Codex implementation hook:
- First version can be CSS gradients and SVG masks, with `aria-label` summaries per day.
- Add scroll-driven or hover motion only after the static visualization is readable.

Why it matters:
- Guests can understand schedule density at a glance. It turns the calendar from utility into a planning instrument.

### Guardrails

- Respect `prefers-reduced-motion`.
- Avoid decorative motion loops on dense browse pages.
- No motion should delay primary action or hide source/trust information.
- Keep Web Vitals budgets: LCP < 2.5s, INP < 200ms, CLS < 0.1.

## Figma Workflow And Advanced Feature Leverage

Sources reviewed:
- Figma Config 2026 recap: https://www.figma.com/blog/config-2026-recap/
- Figma Config 2026 help article: https://help.figma.com/hc/en-us/articles/39582753756695-What-s-new-from-Config-2026
- Figma Motion announcement: https://www.figma.com/blog/introducing-figma-motion/
- Figma release notes: https://www.figma.com/release-notes/
- Figma generative plugins and shaders quick start: https://help.figma.com/hc/articles/41147702210071/
- Figma-created shaders and plugins: https://help.figma.com/hc/en-us/articles/41409034424215
- CSS scroll-driven animation reference: https://www.joshwcomeau.com/animation/scroll-driven-animations/
- Scroll-driven 3D storytelling case study: https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/
- Chrome / NRK scroll-driven storytelling case study: https://developer.chrome.com/blog/nrk-casestudy

As of June 26, 2026, the relevant Figma capabilities include Motion, shader fills/effects, Weave tools, generative plugins, expanded agent workflows, and Code Layers in closed beta. Some items are beta or coming soon, so implementation should separate "use now" from "prototype/watchlist."

### Use Now

- **Variables and modes:** daypart theme modes, density modes, accessibility contrast modes, reduced-motion specs.
- **Interactive components:** filter sheet states, save stamp states, plan item editing, timeline expand/collapse.
- **Figma Motion:** prototype save stamp, filter sheet, Nightfall Timeline, calendar expansion, plan reorder.
- **Dev Mode / component specs:** document exact tokens, spacing, focus states, responsive behavior.
- **Generative plugins:** create repeatable resort-card variations, stamp assets, empty-state art directions, and token audit helpers.

### Prototype / Beta Watchlist

- **Code Layers:** pull real React components into the canvas for side-by-side filter/timeline variants, then sync proven changes back to code when available.
- **3D transforms:** prototype folded map, passport stamp tilt, and plan daybook depth. Use only where it improves orientation.
- **Shaders:** subtle lagoon shimmer, paper grain, starlight texture, and lantern blur. Ship only with performance checks and static fallbacks.
- **Figma agent skills:** create reusable team skills: "generate no-results recovery state", "audit card density", "create daypart motion spec", "export reduced-motion variant".

### Figma Deliverables To Create

1. `ATP Design System 2027`
   - Tokens, components, daypart modes, accessibility modes.

2. `Explore Filtering Lab`
   - Desktop rail, mobile sheet, predictive counts, empty recovery, result summaries.

3. `Tonight Story Prototype`
   - Nightfall Timeline, starlight hero, lantern states, reduced motion variant.

4. `Plan Daybook Prototype`
   - Vertical story timeline, pace meter, conflict states, passport stamps.

5. `Visualization Library`
   - Calendar density bands, resort constellation, confidence ledger, category bars.

## Advanced Web Implementation Plan

### Phase 1: Design System Hardening

Key files:
- `src/styles/tokens.css`
- `src/styles/polish.css`
- `components/events/event-ui.tsx`
- `components/events/EventCard.tsx`
- `components/atlas/Hero.tsx`

Work:
- Convert remaining one-off visual values into semantic tokens.
- Add daypart theme tokens: sunshine, afternoon, golden hour, starlight.
- Add density tokens for compact, comfortable, and editorial card modes.
- Standardize focus rings, selected states, disabled states, and reduced-motion tokens.

Acceptance:
- All primary screens use shared semantic surfaces.
- No card or filter component depends on unexplained hardcoded color.
- Reduced motion has explicit design specs, not just disabled animation.

### Phase 2: Filtering V2

Key files:
- `components/explore/BrowseFilterShell.tsx`
- `components/explore/FilterRail.tsx`
- `components/explore/FilterSheet.tsx`
- `components/explore/ResultSummary.tsx`
- `lib/explore/browseParams.ts`

Work:
- Add active filter chips.
- Add filter counts and no-results diagnosis.
- Add undo after clear.
- Make mobile sheet Apply/Clear sticky and show selected summary.
- Add guest-facing sort labels and explanations.

Acceptance:
- A guest can see exactly why results changed.
- Empty states offer at least three relevant recovery paths.
- Mobile filter sheet is usable with one hand and does not require scanning long select lists first.

### Phase 3: Card And Detail Upgrade

Key files:
- `components/events/EventCard.tsx`
- `components/activity/ActivityOfferingCard.tsx`
- `components/atlas/ActivityDetailClient.tsx`
- `components/resort/ResortCard.tsx`

Work:
- Add card density variants: compact list, rich recommendation, timeline item.
- Add visual confidence and effort signals.
- Add "why this fits" text for recommended cards.
- Add media/icon system that is category-specific and source-safe.

Acceptance:
- Cards are scannable in under 3 seconds.
- Cards show enough to decide but leave detailed provenance to detail pages.
- Detail pages answer: Is it worth going? Can I make it? What should I confirm?

### Phase 4: Visualization Layer

Key files:
- `components/atlas/CalendarClient.tsx`
- `components/tonight/*`
- `components/resort/ResortTimeline.tsx`
- New `components/visualizations/*`

Work:
- Build Calendar Density Bands.
- Build Nightfall Timeline.
- Build Resort Activity Constellation.
- Build Source Confidence Ledger.
- Add accessible text alternatives for each visualization.

Acceptance:
- Every visualization has keyboard-readable data and screen-reader text.
- Visualizations summarize patterns, not just decorate counts.
- Performance remains within Web Vitals budget.

### Phase 5: Plan Daybook

Key files:
- `components/atlas/PlanPageClient.tsx`
- `components/plan/PlanTimeline.tsx`
- `components/plan/PlanItem.tsx`
- `components/plan/ResortPassport.tsx`
- `lib/plan/*`

Work:
- Upgrade timeline to a visual daybook.
- Add pace meter and conflict visualization.
- Add story-act section labels.
- Add drag/reorder visual affordances if durable persistence supports it.
- Add plan summary and next-best-action modules.

Acceptance:
- A one-item plan feels meaningful.
- A multi-item plan tells a coherent day story.
- Conflicts and gaps are visible without reading every card.

### Phase 6: Motion, Figma, And Wow QA

Work:
- Prototype motion in Figma Motion first.
- Translate approved motion to `motion` / CSS with reduced-motion variants.
- Use view-transition patterns only where navigation continuity helps.
- Test mobile/desktop screenshots before shipping.

Acceptance:
- Motion supports state, orientation, or delight.
- No motion causes layout shift.
- Reduced-motion mode is equally polished.

### Phase 7: Hidden Mickey Layer

Research basis:
- Disney's best Hidden Mickeys are usually environmental: stones, bubbles, plates, light patterns, wallpaper, ride props, tilework, foliage, shadows, and framing details.
- The strongest examples are not required for the main experience. They reward attention without blocking anyone who misses them.
- Fan discovery matters: a tiny reveal, a repeatable pattern, or a "wait, was that intentional?" moment creates more delight than a loud badge.
- Time, motion, and viewing angle are powerful. Some great hidden details only become visible from a specific angle, during a short animation, or when multiple objects align.
- For this independent guide, avoid prominent Disney marks, characters, or claims of affiliation. Treat the phase as subtle three-circle "hidden resort magic" inspired by the Hidden Mickey tradition.

Research sources:
- Disney Parks Blog Hidden Mickey coverage: https://disneyparksblog.com/?s=Hidden+Mickey
- D23 Hidden Mickey and Disney detail coverage: https://d23.com/?s=Hidden+Mickey
- Hidden Mickeys fan documentation and taxonomy: https://www.hiddenmickeyguy.com/
- Disney Parks Blog Easter egg examples: https://disneyparksblog.com/?s=Easter+eggs
- Figma Motion: https://www.figma.com/blog/introducing-figma-motion/
- Figma generative plugins and shaders: https://help.figma.com/hc/articles/41147702210071/

Design guardrails:
- Subtle first. A guest should never feel the UI is shouting "look at the Mickey."
- Naturally integrated. Each mark must be made from objects already present in the UI: lanterns, bubbles, stamps, dots, chips, stars, map pins, shells, beads, or paper texture.
- Optional and non-critical. Hidden details cannot carry navigation, trust, filters, or primary instructions.
- Source-safe and brand-safe. Do not use character art, castle silhouettes, Disney type, or large obvious Mickey logos.
- Respect reduced motion. Animated reveals need static alternatives or can simply be absent in reduced-motion mode.
- Document placements internally so QA can verify them, but do not advertise all of them publicly.

#### 10 Implementable Hidden Mickey Ideas

1. **Hero Lantern Alignment**
   - Surface: Home hero.
   - Idea: three lantern bokeh points in the resort-night image layer briefly align into a tiny three-circle silhouette when the hero transitions to `starlight`.
   - Figma/Codex: prototype in Figma Motion; implement as three absolutely positioned light layers with opacity/transform variables.
   - Why it works: it feels like photography/light, not a pasted icon.

2. **Quick Finder Bubble Trail**
   - Surface: Home Quick Finder after submit.
   - Idea: when the guest taps "Find activities", three tiny lagoon bubbles rise from the button edge; one frame forms the hidden shape before dispersing.
   - Figma/Codex: Motion timing spec in Figma; CSS keyframes with `prefers-reduced-motion` disabled state.
   - Why it works: it rewards the first successful interaction without distracting from navigation.

3. **Filter Chip Constellation**
   - Surface: Explore active filter chips.
   - Idea: when exactly three filters are active, the chip accent dots connect with a barely visible dotted line that forms a small three-circle constellation.
   - Figma/Codex: interactive component states for 1/2/3+ filters; implement with pseudo-elements or SVG overlay tied to URL params.
   - Why it works: filter state itself becomes the discovery, and it only appears for engaged users.

4. **Calendar Triple-Dot Upgrade**
   - Surface: Calendar day cells.
   - Idea: days with exactly three starlight activities show density dots arranged as a tiny hidden shape instead of a straight row.
   - Figma/Codex: add a `hiddenMickeyDensity` variant to Calendar Density Bands; implement as accessible decorative markup with the same text count.
   - Why it works: it reuses existing calendar dots and gives schedule data a fan layer.

5. **Resort Card Tilework**
   - Surface: Resort cards.
   - Idea: each resort tier gradient gets a nearly invisible tile/noise pattern; one card per tier has a three-circle motif embedded in the tilework at a different corner.
   - Figma/Codex: generate tile patterns in Figma/shader plugin; export as tiny CSS mask or compressed image.
   - Why it works: it feels like resort architecture and textile detail.

6. **Activity Category Stamp Imperfection**
   - Surface: Activity cards and detail hero category badges.
   - Idea: a few category stamps have ink "misregistration" dots that form a micro hidden shape only at 2x zoom or on hover/focus.
   - Figma/Codex: define stamp variants in the design system; implement with CSS radial gradients on pseudo-elements.
   - Why it works: it matches the passport/journal metaphor already in the app.

7. **Plan Passport Completion Reveal**
   - Surface: Resort Passport in My Plan.
   - Idea: when the guest saves three different categories, the stamps land in a triangular cluster. A soft outline appears for 900ms, then fades back into the paper grain.
   - Figma/Codex: prototype stamp choreography in Figma Motion; implement with layout animation and a static fallback.
   - Why it works: fans discover it through planning behavior, not random clicking.

8. **Starlight Firefly Pause**
   - Surface: Tonight Nightfall Timeline or Firefly Route Map.
   - Idea: once per page load, three fireflies pause around a timeline stop before continuing along their path.
   - Figma/Codex: path animation in Figma Motion; implement as SVG circles following offset paths or CSS motion path where supported.
   - Why it works: the motion is atmospheric and contextual to evening.

9. **Search Suggestion Easter Echo**
   - Surface: Search suggestions/results.
   - Idea: searching terms like `campfire`, `movie`, or `magic` causes three tiny sparkle dots to appear in the search underline for one second.
   - Figma/Codex: interactive component for search states; implement with CSS custom property triggered by recognized safe keywords.
   - Why it works: it is discoverable by intent, not a gimmick on every query.

10. **Footer Paper Grain Secret**
   - Surface: Global footer / journal paper texture.
   - Idea: the paper grain includes one microscopic three-circle watermark that appears only on long-scroll pages near the disclaimer area.
   - Figma/Codex: generate a subtle grain texture in Figma; export as optimized WebP/AVIF or CSS mask; document exact placement for QA.
   - Why it works: it is the most classic hidden-detail style: quiet, permanent, and non-interactive.

Implementation acceptance:
- At least 6 of 10 marks are visible only after interaction, scroll, hover/focus, time/daypart change, or plan progress.
- No mark appears in the first viewport as an obvious logo.
- Every animated mark has a reduced-motion behavior.
- Hidden details are decorative and ignored by assistive technology unless the user has explicitly opened a future "discoveries" feature.
- The project has an internal `hidden-mickeys.md` QA inventory with route, trigger, screenshot, and reduced-motion expectation for each mark.

### Phase 8: In-House Magical Icon System

Goal: replace every emoji, generic inline SVG, and utilitarian glyph with a coherent in-house icon family that feels playful, magical, tactile, and specific to After the Parks.

Research basis:
- Strong icon systems optimize for clarity first, then personality. Material Design and Apple both emphasize recognizable shapes, consistent construction, and legibility at small sizes.
- Figma components are intended for reusable system elements like icons; variants, properties, libraries, and Dev Mode are the right workflow for maintaining a large icon set.
- Figma Motion now supports animated components, motion variables, keyframes, shader effects, Dev Mode handoff, and MCP-compatible animated frame context. This makes "living icons" realistic instead of a separate animation pipeline.
- The Disney-inspired direction should borrow from animation principles: appeal, squash/stretch, anticipation, follow-through, staging, and texture. It should not borrow Disney-owned characters, type, castle silhouettes, or trademarked marks.

Research sources:
- Figma component systems: https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma
- Figma Motion and MCP handoff: https://www.figma.com/blog/introducing-figma-motion/
- Material Design iconography: https://m3.material.io/styles/icons/overview
- Apple HIG icons: https://developer.apple.com/design/human-interface-guidelines/icons
- Figma generative plugins and shaders: https://help.figma.com/hc/articles/41147702210071/

#### Current Icon Inventory To Replace

| Surface | Current source | Files | Replacement approach |
| --- | --- | --- | --- |
| Activity categories | Emoji in `CATEGORY_META` | `lib/categories/meta.ts`, `components/activity/CategoryIcon.tsx`, `components/events/event-ui.tsx`, `components/activity/ActivityOfferingCard.tsx`, `components/resort/ResortCategorySections.tsx`, `lib/plan/passport.ts` | In-house category glyphs with static and animated variants |
| Mood / day tabs | Emoji labels | `components/explore/BrowseDayTabs.tsx` | Daypart glyphs: sunburst, crescent lantern, sparkle compass |
| Mobile bottom nav | Inline generic SVG | `components/layout/MobileBottomNav.tsx` | Custom nav icons: sunrise badge, moon-lagoon, search compass, daybook |
| Plan sections | Emoji in plan metadata | `lib/plan/sections.ts`, `components/plan/PlanTimeline.tsx` | Story-act icons: morning beam, palm shade, dinner lantern, starlight trail, unscheduled folded note |
| No-ticket collections | Emoji in collection data | `lib/magic/collections.ts`, `components/magic/NoTicketMagic.tsx` | Collection icons aligned to category glyph family |
| Magic nearby tiers | Emoji in tier metadata | `lib/magic/nearby.ts`, `components/magic/MagicNearby.tsx` | Location/effort icons: resort door, boat/monorail path, worth-travel sparkle |
| Search result kinds | Emoji / text glyphs | `components/search/SearchHitRow.tsx`, `lib/search/runSearch.ts` | Result-kind icons: activity spark, resort key, guide page, category tag, movie screen, offering seal |
| Empty states | Emoji | `components/atlas/EmptyState.tsx`, `components/tonight/NightEmptyState.tsx` | Larger illustrated mini-icons matching the system |
| App/PWA icon | Text initials | `app/icon.tsx`, `app/manifest.ts` | Custom After the Parks mark: travel-journal sun + starlight path |
| Future hidden details | Decorative marks | `components/magic/*`, `src/styles/*` | Hidden motif variants using the same icon geometry |

#### Icon Art Direction

System name: **Resort Glyphs**.

Shape language:
- Rounded, hand-drawn vector silhouettes with a subtle stamp/ink edge.
- 24px functional icons, 32px card icons, 64px category stamps, and 96px hero/empty-state illustrations.
- Consistent 2.25px optical stroke for line icons; filled accents only where meaning needs it.
- Magic accents use the existing palette: lagoon, sun-gold, lantern, palm, coral, night.
- Every icon must work as a one-color silhouette and as a full-color magical stamp.

Motion language:
- Most icons are static by default.
- Interactive icons get a single 300-700ms delight motion: ember flicker, water bob, sparkle twinkle, stamp bounce, lantern sway.
- Ambient looping is reserved for Tonight hero/timeline only and must respect reduced motion.
- Motion should make the object feel alive, not turn into a mini-cartoon.

Brand safety:
- No Mickey-head silhouette as a primary icon.
- No character faces, castle shapes, Disney transport silhouettes, branded fonts, official attraction icons, or copied park signage.
- Icons should feel like resort vacation objects: lanterns, map folds, shells, paper, pool ripples, campfire embers, popcorn, craft beads, compass points, stars, palms.

#### Replacement Map

| Semantic key | Current meaning | In-house icon concept | Animated behavior |
| --- | --- | --- | --- |
| `poolside` | Pool activities | Lagoon ripple with beach ball glint | Ripple expands once on hover/save |
| `campfire` | Campfires / s'mores | Tiny ember fire with marshmallow stick | Ember breathes and marshmallow glows |
| `movies_under_stars` | Outdoor movies | Starlit screen with two palm shadows | Screen glow fades in |
| `fitness_wellness` | Wellness | Sunrise stretch ribbon / leaf path | Ribbon inhales/exhales subtly |
| `arts_crafts` | Crafts | Paint daub + bead string | Beads settle with soft bounce |
| `signature` | Worth-travel / special | Compass sparkle seal | Sparkle rotates 12 degrees, then rests |
| `resort_activity` | General resort fun | Resort key tag with palm notch | Key tag swings once |
| `arcade` | Games | Joystick star button | Button blips once |
| `rental` | Bikes / rentals | Surrey wheel + ribbon | Wheel quarter-turn on hover |
| `sports_games` | Sports & games | Ball arc over court line | Arc draws in |
| `nighttime_entertainment` | Evening entertainment | Lantern moon | Lantern sways once |
| `scavenger_hunt` | Hunts | Folded map with tiny trail | Trail draws to X |
| `nature` | Nature | Leaf + firefly dot | Firefly twinkles once |
| `music` | Music | Musical note as resort pennant | Note lifts gently |
| `other` | Fallback activity | Journal ticket stub | Corner flips slightly |
| `today_nav` | Today tab | Sunbeam badge | Beam rays pop on active |
| `tonight_nav` | Tonight tab | Moon over lagoon | Reflection appears on active |
| `explore_nav` | Explore tab | Search compass | Needle settles on active |
| `plan_nav` | Plan tab | Daybook clipboard | Stamp mark appears when item count increases |
| `search_activity` | Search hit activity | Spark on card corner | Static |
| `search_resort` | Search hit resort | Resort keyhole | Static |
| `search_guide` | Search hit guide | Folded guide page | Static |
| `search_category` | Search hit category | Luggage tag | Static |
| `search_movie` | Search hit movie | Starlight screen | Static |
| `search_offering` | Official offering | Source seal check | Static |

#### Figma + Codex Workflow

1. **Create the Figma icon library**
   - File: `ATP Resort Glyphs`.
   - Pages: `Grid`, `Category`, `Navigation`, `Plan`, `Search`, `Collections`, `App Icon`, `Motion Specs`.
   - Components: each icon has `size`, `tone`, `state`, and `motion` variants.
   - Modes: `sunshine`, `starlight`, `high-contrast`, `reduced-motion`.

2. **Generate and refine with Figma tools**
   - Use Figma Draw for editable vector geometry.
   - Use Figma generative/shader tooling only for texture, glow, and paper/stamp effects, not for final semantic shape.
   - Use Figma Motion for the living variants.
   - Use Dev Mode/MCP links so Codex can read motion timing and translate it into React/CSS.

3. **Add a code icon registry**
   - New files: `components/icons/IconGlyph.tsx`, `components/icons/iconRegistry.ts`, `components/icons/types.ts`.
   - Replace `icon: string` in metadata with `iconKey`.
   - Keep `label` as accessible text; decorative icons should remain `aria-hidden`.
   - Export SVG React components from Figma or convert Figma SVG paths into reviewed local components.

4. **Replace usage in slices**
   - Slice 1: category stamps and activity/offering cards.
   - Slice 2: mobile nav and browse day tabs.
   - Slice 3: plan timeline, passport, no-ticket collections, nearby badges.
   - Slice 4: search result kinds and empty states.
   - Slice 5: app/PWA icon and social/OG marks.

5. **Motion implementation**
   - Static SVG first.
   - CSS transitions for simple hover/focus/active.
   - `motion` only for stateful save/plan/timeline moments.
   - Use `prefers-reduced-motion` and a `motion="none"` prop everywhere.

Acceptance:
- No emoji icons remain in production UI metadata or components.
- Generic inline nav SVGs are replaced by in-house glyphs.
- Every icon has a semantic `iconKey`, accessible label source, Figma component name, and code component.
- Icons are legible at 16px, 24px, 32px, and 64px.
- All animated icons have reduced-motion behavior.
- The campfire/s'mores icon feels alive through ember glow/marshmallow warmth without requiring a full animation.
- A screenshot pass confirms icons feel cohesive across Home, Explore, Tonight, Activity Detail, Resorts, Search, and My Plan.

## Accessibility Risks And Verification Gaps

Screenshot review cannot prove full WCAG compliance. Verify:
- Keyboard traversal through filter sheet, mobile nav, card save buttons, search preview, and plan note editing.
- Focus trapping and return focus after closing filter sheet.
- `aria-live` result count updates after filter changes.
- Contrast for pale yellow labels and low-opacity text.
- Native select labels and duplicate controls in mobile/desktop responsive states.
- Touch target stability when text wraps or chips scroll horizontally.

## Performance Risks

- Full activity lists are long. Keep server-rendered lists and client islands small.
- Motion and shaders need static fallbacks and strict budgets.
- Hero imagery should stay optimized and not block interaction.
- Predictive filter counts should be computed server-side or cached, not recalculated expensively on every keystroke.

## Suggested Sprint Order

1. **Filtering V2 and empty-state recovery**
2. **Plan Daybook story timeline**
3. **Nightfall Timeline**
4. **Calendar Density Bands**
5. **Card/detail decision signals**
6. **Figma Motion prototypes and design-system file**
7. **In-house Resort Glyphs icon system**
8. **Resort constellation and richer resort cards**
9. **Advanced wow layer: shaders, 3D transforms, Code Layers beta workflow**
10. **Hidden Mickey Layer after core UX polish**

## Definition Of Done

- Each primary screen has a documented guest intent and first action.
- Filters explain state, impact, and recovery.
- Timeline reads as a story, not a saved-item list.
- Visualizations reveal time, place, confidence, or energy patterns.
- Motion has reduced-motion parity.
- Figma prototypes exist for filter sheet, Nightfall Timeline, Plan Daybook, and Calendar Density Bands.
- Production UI uses the in-house Resort Glyphs icon system instead of emoji/generic SVG icons.
- Hidden Mickeys are subtle, documented internally, non-blocking, brand-safe, and reduced-motion safe.
- Local screenshot review passes desktop and mobile.
- Accessibility and Web Vitals checks are run before release.
