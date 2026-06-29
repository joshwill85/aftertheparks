# About Page Origin Story Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `/about` into a warm, scannable founder-origin page that turns Josh's story into the visual arc: budget summer -> Fort Wilderness cabin -> planning chaos -> organized map -> After the Parks.

**Architecture:** Keep the refactor page-local. Replace the current generic `Hero` and short prose in `app/about/page.tsx` with co-located About components, a typed content model, and a scoped CSS module. Reuse existing brand tokens, buttons, header/footer, and brand assets; add only IP-safe illustrated SVG/CSS elements and optional future photo hooks.

**Tech Stack:** Next.js 15 App Router, React 19 server components, TypeScript, CSS Modules, CSS-only motion, existing Tailwind/global button classes, existing `BrandAsset`/`BrandMotif`, Playwright for visual QA.

---

## Context

Current `/about` is implemented in `app/about/page.tsx` with:

- Shared `components/atlas/Hero`, which adds an eyebrow by default.
- One rounded brand card.
- Two short paragraphs.

The requested refactor should incorporate the attached visual direction:

- Hero: soft paper-map/cabin/campfire/folded-map illustration, not founder-headshot-led.
- Headline: "I built After the Parks because I needed it first."
- Subhead: "A family staycation, a little girl's first real summer, a cabin at Fort Wilderness, and one dad who could not stop trying to organize the magic."
- CTAs: "Read the story" and "Explore today's activities".
- Story spine sections: summer, cabin, planning problem, could-not-leave-it-alone, After the Parks born, possible Disney person.
- Signature section: "The problem was not a lack of magic. It was finding it."
- Visual thesis: scattered resort magic becomes a usable family plan.
- Tone: humble, grounded, useful, personal, IP-safe.

## File Structure

- Modify: `app/about/page.tsx`
  - Page composition, metadata, JSON-LD if appropriate, main section order.
- Create: `app/about/content.ts`
  - Exact story copy, section headings, icon keys, messy/input labels, output labels, CTAs.
- Create: `app/about/about.module.css`
  - Scoped page layout, hero illustration, map route spine, messy-to-magic block, founder card, footer CTA, responsive behavior, reduced motion.
- Create: `app/about/_components/AboutHero.tsx`
  - Custom hero with paper-map scene and CTAs.
- Create: `app/about/_components/AboutStorySpine.tsx`
  - Sectioned editorial story with dotted route spine and short pauses.
- Create: `app/about/_components/AboutMessyToMagic.tsx`
  - Signature visual transformation block.
- Create: `app/about/_components/AboutFounderCard.tsx`
  - Humble founder card near page end.
- Create: `app/about/_components/AboutFooterCta.tsx`
  - Product-usefulness close with Today/Tonight/My Plan links.
- Create: `app/about/_components/AboutIllustrations.tsx`
  - Small reusable IP-safe SVG icons and hero scene pieces.
- Create: `scripts/test-about-page-content.ts`
  - Static guardrail test for required copy, section order, CTA targets, and IP-sensitive forbidden terms.
- Create: `scripts/test-about-page-visual-regression.ts`
  - Browser QA for `/about` screenshots, overlap checks, readability checks, and horizontal overflow.
- Modify: `package.json`
  - Add `test:about-page` and `test:about-page:visual` scripts.

## Design System Inventory

- Use existing fonts: `Fraunces` for display, `Nunito Sans` for readable body.
- Use existing color tokens:
  - Background: `--brand-cream`, `--brand-paper`.
  - Text: `--brand-ink`, `--muted`, `--night`.
  - Accents: `--sun-gold`, `--sun-coral`, `--lagoon`, `--palm`, `--lantern`.
- Do not introduce official Disney marks, castle shapes, Mickey silhouettes, character-like shapes, official typography, or attraction likenesses.
- Use a narrow editorial body measure: `max-width: 65-75ch`.
- Keep cards to individual repeated items or tool-like blocks only; avoid nested cards.
- Motion should be subtle and optional:
  - Route line draw.
  - Firefly/path dots.
  - Gentle messy-to-organized transition.
  - Respect `prefers-reduced-motion`.
- Do not add a client-side animation library.
- Keep About components as server components unless a future interaction absolutely requires client state.
- Use CSS-only motion through `about.module.css`.
- Keep SVGs small and avoid large embedded paths; prefer simple geometric primitives and short paths.
- Do not add remote images in this pass.
- If a future real photo is added, use `next/image`, fixed dimensions, and thoughtful alt text.

## Implementation Tasks

### Task 1: Extract Page Content

**Files:**
- Create: `app/about/content.ts`

- [ ] Create typed content arrays:
  - `heroContent` with headline, subhead, primary CTA `/about#story`, secondary CTA `/today`.
  - `storySections` with six required headings and body paragraphs adapted from the supplied story.
  - `messyInputs` with `PDFs`, `Resort pages`, `Images`, `Activity calendars`, `Times that change`, `Weather questions`, `Transportation confusion`.
  - `organizedOutputs` with `Today`, `Tonight`, `Free activities`, `Movies`, `Campfires`, `Resort filters`, `My Plan`.
  - `founderContent` with "Built by Josh" and "Husband. Dad. Over-planner. Data person. Possible Disney person in progress."
  - `footerCta` with "Planning a resort day? Start with what's happening now." and links to `/today`, `/tonight`, `/plan`.
- [ ] Keep the long story readable by splitting it into short paragraphs under meaningful section headings.
- [ ] Preserve the human voice, especially:
  - "My wife and daughter are Disney people. I am not."
  - "I started planning way too much."
  - "For someone who just wanted to make a little girl's summer feel special, it felt harder than it needed to be."
  - "Maybe this is how I finally become a Disney person."

### Task 2: Add IP-Safe Illustration Primitives

**Files:**
- Create: `app/about/_components/AboutIllustrations.tsx`

- [ ] Add small inline SVG components for: cabin, campfire, folded map, route line, backpack, document stack, pencil/data dots, signpost, lantern/path.
- [ ] Ensure every SVG is generic and IP-safe:
  - Use cabins, trees, paper, pins, stars, fireflies, compass/path motifs.
  - Avoid castles, mouse-ear silhouettes, official resort icons, character silhouettes, official Disney typography.
- [ ] Export an `AboutIcon({ name })` component keyed by the content model.
- [ ] Mark decorative SVGs `aria-hidden`.
- [ ] Keep SVGs small:
  - Prefer simple `line`, `circle`, `rect`, and short `path` elements.
  - Avoid large embedded paths or exported illustration blobs.
  - Do not import an icon or animation package for these illustrations.

### Task 3: Build Custom Hero

**Files:**
- Create: `app/about/_components/AboutHero.tsx`
- Modify: `app/about/about.module.css`

- [ ] Replace the generic shared `Hero` on `/about`; do not use the default "Sunshine to Starlight" eyebrow.
- [ ] Compose a first viewport with:
  - Left: H1, subhead, CTA row.
  - Right: illustrated paper-map scene with cabin, picnic table/map, campfire glow, route lines, activity marks, small backpack/stroller-adjacent object.
- [ ] Background should read as 70% daytime and 30% twilight:
  - Soft cream/gold from left/top.
  - Gentle teal/twilight depth on right/bottom.
- [ ] Use real links:
  - Primary: `href="#story"` with `btn-primary`.
  - Secondary: `href="/today"` with `btn-secondary` and label "Explore today's activities".
- [ ] Ensure a hint of the next section is visible on desktop and mobile, avoiding a full-screen dead stop.
- [ ] Position hero artwork so it cannot overlap text at 390px, 768px, 1024px, or desktop widths:
  - Mobile: stack text before art.
  - Tablet: keep illustration in its own layout track.
  - Desktop: use separate grid columns and stable min/max widths.

### Task 4: Build Story Spine

**Files:**
- Create: `app/about/_components/AboutStorySpine.tsx`
- Modify: `app/about/about.module.css`

- [ ] Render story sections as a map-route spine, not a corporate timeline.
- [ ] Use these exact headings:
  1. The summer we wanted to make count
  2. The cabin that made it possible
  3. The planning problem
  4. The part where I could not leave it alone
  5. After the Parks is born
  6. Maybe I'm becoming a Disney person
- [ ] Each section should have:
  - IP-safe icon.
  - Heading.
  - 2-5 short paragraphs.
  - Optional small map-note label, not overused.
- [ ] Keep the body column comfortable at roughly 65-75 characters per line.
- [ ] Add one small anchored section id: `id="story"`.

### Task 5: Build Messy-to-Magic Signature Block

**Files:**
- Create: `app/about/_components/AboutMessyToMagic.tsx`
- Modify: `app/about/about.module.css`

- [ ] Add section heading: "The problem was not a lack of magic. It was finding it."
- [ ] Left column: messy inputs as small labeled cards.
- [ ] Center: illustrated sorting route/firefly path.
- [ ] Right column: organized outputs as labeled cards.
- [ ] Add one concise explanatory paragraph tying the visual to the product without turning the page into a sales pitch.
- [ ] On mobile, stack as inputs -> route -> outputs while preserving the transformation.

### Task 6: Add Grounded Founder Card

**Files:**
- Create: `app/about/_components/AboutFounderCard.tsx`
- Modify: `app/about/about.module.css`

- [ ] Include "Built by Josh" and the humble descriptor line.
- [ ] Add short note: "I built this because our family needed a better way to find the magic outside the parks. I hope it helps yours too."
- [ ] Use a small personal-photo slot if an approved photo exists later; for this implementation, use a warm object-detail placeholder illustration so no fake stock photo appears.
- [ ] Avoid "Founder & CEO" language.

### Task 7: Add Footer CTA

**Files:**
- Create: `app/about/_components/AboutFooterCta.tsx`
- Modify: `app/about/about.module.css`

- [ ] End with the emotional product promise:
  - Heading: "Planning a resort day? Start with what's happening now."
  - Buttons: "See today's activities" -> `/today`, "Find tonight's movies and campfires" -> `/tonight`, "Build my plan" -> `/plan`.
- [ ] Include the independent/disclaimer sentence without interrupting the emotional center:
  - "After the Parks is independent and not affiliated with Disney. Always confirm schedules with the official resort source before heading out."

### Task 8: Compose Page and Metadata

**Files:**
- Modify: `app/about/page.tsx`

- [ ] Import and render:
  - `AboutHero`
  - `AboutStorySpine`
  - `AboutMessyToMagic`
  - `AboutFounderCard`
  - `AboutFooterCta`
- [ ] Add page metadata:
  - Title: `The Story Behind After the Parks`
  - Description: concise founder-origin summary focused on resort-day planning outside the parks.
- [ ] Keep the page as a server component unless a specific client-only interaction is added.
- [ ] Do not add `"use client"` to `app/about/page.tsx` or About components unless a future requirement cannot be met by server components and CSS.

### Task 9: Add Guardrail Test

**Files:**
- Create: `scripts/test-about-page-content.ts`
- Modify: `package.json`

- [ ] Add a test that imports `app/about/content.ts`.
- [ ] Assert required story headings are present and ordered.
- [ ] Assert CTA hrefs are `/today`, `/tonight`, `/plan`, and `#story`.
- [ ] Assert forbidden IP-sensitive terms do not appear in illustration/icon keys or decorative labels: `Mickey`, `castle`, `character`, `official Disney typography`.
- [ ] Add `npm run test:about-page`.

### Task 10: Add Visual Regression QA

**Files:**
- Create: `scripts/test-about-page-visual-regression.ts`
- Modify: `package.json`

- [ ] Create a Playwright-based script that starts from `process.env.BASE_URL ?? "http://127.0.0.1:3000"` and opens `/about`.
- [ ] Capture full-page screenshots at:
  - 390px wide, height 1200.
  - 768px wide, height 1200.
  - 1024px wide, height 1200.
  - Desktop: 1440px wide, height 1200.
- [ ] Save screenshots under `test-results/about-page/` with deterministic names:
  - `about-390.png`
  - `about-768.png`
  - `about-1024.png`
  - `about-1440.png`
- [ ] Add DOM bounding-box assertions:
  - Hero art does not overlap hero text.
  - Story spine route does not intersect body copy boxes.
  - Messy-to-magic cards have nonzero width, visible text, and no clipped labels on mobile.
  - `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`, confirming no horizontal overflow.
- [ ] Add `npm run test:about-page:visual`.

### Task 11: Functional, Performance, and Accessibility Verification

**Files:**
- No source changes unless verification finds defects.

- [ ] Run `npm run test:about-page`.
- [ ] Run `npm run test:about-page:visual` after starting the dev server.
- [ ] Run `npm run build` or the narrower project-standard checks available at implementation time.
- [ ] Start `npm run dev`.
- [ ] Verify `/about` at 390px, 768px, 1024px, and desktop width.
- [ ] Check:
  - Hero CTA links work.
  - `Read the story` scrolls to the story spine.
  - Text does not overflow buttons/cards.
  - Story paragraphs stay readable.
  - Hero art never overlaps text.
  - Story spine does not cut through body copy.
  - Messy-to-magic cards remain readable on mobile.
  - No horizontal overflow appears at any captured viewport.
  - Motion stops under `prefers-reduced-motion`.
  - No forbidden IP-adjacent shapes are present.
  - Existing header/footer still behave normally.
- [ ] Performance QA:
  - Confirm no new client-side animation library appears in `package.json`.
  - Confirm About components remain server components unless a documented blocker requires otherwise.
  - Confirm motion is CSS-only.
  - Confirm no remote images were added.
  - Confirm SVG primitives remain small and are not large exported path blobs.
  - If a real photo is added in a later pass, confirm it uses `next/image`, fixed dimensions, and descriptive alt text.

## Acceptance Criteria

- `/about` feels like a real founder-origin story, not a generic brand page.
- The visual arc from scattered planning to usable family plan is obvious without reading every paragraph.
- The page remains useful: readers can jump to today, tonight, and My Plan.
- The design is warm, light, readable, IP-safe, and aligned with the existing After the Parks brand tokens.
- Visual QA screenshots pass at 390px, 768px, 1024px, and 1440px.
- Hero art, story spine, and messy-to-magic cards remain readable without overlap or horizontal overflow.
- The implementation stays server-rendered and CSS-motion-only, with no new remote images or client-side animation library.
- No unrelated files or current dirty-worktree changes are reverted or touched.
