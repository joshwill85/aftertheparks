# Weather Page Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/weather` into a Dark Sky-inspired weather story with an atmospheric day arc, compact resort-area microclimates, and progressive forecast detail.

**Architecture:** Keep the existing weather data loaders and guidance engine. Refactor the page into focused server-rendered view helpers inside `app/weather/page.tsx`, then replace the page-specific CSS in `src/styles/polish.css` with a dark, chart-led visual system.

**Tech Stack:** Next.js App Router, React server components, existing weather guidance types, plain CSS, existing WeatherIcon/WeatherFreshness/NearTermRain components.

---

### Task 1: Page Contract Test

**Files:**
- Modify: `scripts/test-weather-dedicated-page.ts`

- [ ] Add assertions that `/weather` includes `weather-day-arc`, `weather-microclimate-rail`, and `weather-chapter-card`, and does not render the literal heading `Now, Next, Later`.
- [ ] Run `NODE_OPTIONS='--conditions=react-server' tsx scripts/test-weather-dedicated-page.ts` and verify the new assertions fail before implementation.

### Task 2: Storytelling Page Refactor

**Files:**
- Modify: `app/weather/page.tsx`

- [ ] Keep `loadAreaWeather` and existing data source behavior.
- [ ] Add helpers for chapter labels, time ranges, rain intensity, temp/rain point scaling, and risk tone.
- [ ] Replace the hero with an atmospheric condition panel and `WeatherDayArc`.
- [ ] Replace area overview cards with `MicroclimateRail`.
- [ ] Replace literal `Now`, `Next`, `Later` cards with contextual `WeatherChapterCard` labels.
- [ ] Preserve hourly/daily/weekly detail, but rename visible headings to progressive-detail language.

### Task 3: Visual System CSS

**Files:**
- Modify: `src/styles/polish.css`

- [ ] Replace the current `.weather-page*` block with a dark sky page shell, luminous chart treatment, compact microclimate rail, chapter cards, and responsive mobile layout.
- [ ] Keep existing shared weather classes outside the dedicated page intact.
- [ ] Verify no text overflows on mobile and no section becomes a repeated card wall.

### Task 4: Verification

**Files:**
- Read: generated screenshots under `.reviews/weather-page/`

- [ ] Run `NODE_OPTIONS='--conditions=react-server' tsx scripts/test-weather-dedicated-page.ts`.
- [ ] Run `npm run test:weather:ui`.
- [ ] Run or reuse a local dev server, capture desktop and mobile `/weather` screenshots with Playwright, and inspect them visually.
