# After the Parks Brand Asset Usage Strategy

Date: 2026-06-28  
Asset source: `/Users/josh/Downloads/after_the_parks_pocket_map_svg_kit`

## Strategy

Use the new kit as a brand and storytelling layer, not as page decoration everywhere. The site already has a strong travel-journal system: Fraunces/Nunito typography, cream paper surfaces, lagoon/sun/starlight tokens, real hero photography, weather icons, and operational planning UI. The kit should reinforce brand recall at entry points, share surfaces, app/install surfaces, and empty/recovery states.

Default rule:

- Use rich lockups only where the user is entering, sharing, or learning the brand.
- Use the companion/map/motif marks where a page needs warmth or recovery.
- Keep dense planning pages focused on data, filters, schedules, trust, and actions.
- Use outlined SVGs for production placement when text appears in the asset.

## Asset Roles

| Asset | Best Use | Avoid |
| --- | --- | --- |
| `atp-pocket-map-horizontal-lockup-outlined.svg` | Desktop header, footer brand, OG image header, about/source pages | Small mobile header if it crowds navigation |
| `atp-pocket-map-primary-lockup-outlined.svg` | About page, welcome/onboarding, large brand moments, footer brand block | Repeated on every content page hero |
| `atp-pocket-map-dark-lockup-outlined.svg` | Starlight/night surfaces, Tonight page feature block, dark social/OG variant | Light pages, small cards |
| `atp-pocket-map-app-icon.svg` / PNGs | App manifest, Apple touch icon, social/avatar | In-page repeated illustration |
| `atp-pocket-map-favicon.svg` / `favicon.ico` | Browser favicon and tab/bookmark identity | Content illustration |
| `atp-pocket-map-hero-art-outlined.svg` | One controlled illustrated brand panel or marketing/about section | Home hero replacement; it competes with the real resort hero |
| `atp-pocket-map-only-outlined.svg` | Empty states, plan/map metaphor, resort/detail helper panels | Header logo |
| `atp-guide-companion-only.svg` | Friendly empty states, onboarding, save/plan delight, mobile small mascot | Serious trust/policy panels |
| `atp-three-waypoint-motif.svg` | Dividers, footer, section end caps, map/path transitions | Functional icon replacement |
| `atp-pocket-map-one-color-outlined.svg` | Monochrome print/export/share fallback, low-color contexts | Primary web brand where color is available |

## Global Surfaces

### Browser, PWA, Social

Highest priority. Replace the generated `AP` icon in `app/icon.tsx` and `app/manifest.ts` with the kit app/favicon mark. This gives immediate brand recognition in tabs, bookmarks, install prompts, and home-screen icons without adding visual noise to pages.

Recommended:

- Use `atp-pocket-map-favicon.svg` for SVG favicon.
- Use the rebuilt multi-size `favicon.ico` for legacy favicon.
- Use `atp-pocket-map-app-icon-512.png`, `atp-pocket-map-app-icon-1024.png`, and `apple-touch-icon-180.png` for manifest/apple icons.
- Use a brand-kit lockup/motif in `/api/og/route.tsx` only if the generated OG image can still keep dynamic title text readable.

### Header

Current header is text-only. Add a compact brand mark carefully:

- Desktop: use `atp-pocket-map-horizontal-lockup-outlined.svg` only if it fits in a stable width, probably 180-220px, and the nav still has room.
- Mobile: keep text or use only the favicon/companion mark plus `After the Parks`; do not use the full horizontal lockup in the sticky header.
- Preserve the `Independent Guide` badge. It is important for IP clarity and trust.

### Footer

Footer is an excellent place for a fuller brand moment:

- Add the horizontal or primary outlined lockup above the disclaimer.
- Add `atp-three-waypoint-motif.svg` as a small divider near footer links.
- Keep the independent disclaimer prominent.

## Page Strategy

### `/` Home

Use lightly. The current real-image hero is stronger for sense of place and performance. Do not replace it with `atp-pocket-map-hero-art`.

Best placements:

- Header/logo/global favicon.
- A small `atp-guide-companion-only.svg` or `atp-pocket-map-only-outlined.svg` inside Rest Day Builder or No-Ticket Magic, where the page shifts from data to guided planning.
- `atp-three-waypoint-motif.svg` as a tiny divider between major sections.

Avoid:

- Putting the primary lockup inside the hero. The H1 already carries the brand promise.
- Using the hero-art SVG above the fold; it competes with the tropical resort image and can weaken the real-world planning feel.

### `/today`

Operational page. Keep the top clean and schedule-first.

Best placements:

- Small motif in the empty/no-results recovery panel.
- Companion mark only if there are no activities or a guided recovery state appears.
- No rich lockup in the Hero.

Avoid:

- Large mascot or full map art near results. Today needs speed, trust, and scanability.

### `/tonight`

This is the best page for the dark kit.

Best placements:

- `atp-pocket-map-dark-lockup-outlined.svg` in a lower feature panel, not necessarily the top hero.
- Guide companion as a small starlight helper in empty states for movies/campfires.
- Motif as a timeline/endcap element in Nightfall Timeline or section dividers.

Avoid:

- Replacing weather/movie/campfire icons with brand marks. The page needs semantic icons.

### `/activities`

Catalog/filtering surface. Brand should be quiet.

Best placements:

- No-results recovery: `atp-pocket-map-only-outlined.svg` or `atp-guide-companion-only.svg`.
- `atp-three-waypoint-motif.svg` as a small decorative separator in a smart “best bets” strip.

Avoid:

- Full logo lockups in filter rail, cards, or activity rows.
- Companion mark in every card.

### `/activities/[slug]`

Detail pages should feel specific to the activity, not generic-brand-first.

Best placements:

- Motif near “More like this” or “Magic nearby.”
- Map-only mark in a “where/plan this” panel if no real location map exists yet.
- One-color mark only in printable/share/export contexts.

Avoid:

- Full primary lockup in each detail hero.

### `/calendar`

Calendar is a planning visualization. The kit can support the pocket-map metaphor.

Best placements:

- `atp-pocket-map-only-outlined.svg` in an intro/helper panel explaining how to scan the calendar.
- Motif as selected-day path/divider detail.

Avoid:

- Rich lockup in the grid itself; it will fight density and date readability.

### `/resorts`

Good candidate for restrained map storytelling.

Best placements:

- Small map-only mark near the directory intro.
- Motif as grouping/divider detail for area rails if those are built later.
- Companion only in empty/error states.

Avoid:

- Using the app icon or companion as resort-card imagery. Resort cards need resort-specific signals, not the same mascot repeated 31 times.

### `/resorts/[slug]`

Use the kit only where it helps orientation.

Best placements:

- Map-only mark in an “arrival board” or “plan from this resort” module.
- Motif in timelines and category transitions.
- Companion in `ResortEmptyState` when a schedule is pending.

Avoid:

- Brand lockup in resort hero; the page subject should be the resort name and source/trust content.

### `/weather`

Do not brand-heavy this page. It has its own weather icon system and must read as utility/trust first.

Best placements:

- Tiny motif in a “backup plan” bridge to indoor activities.
- Maybe companion in an empty/error state if weather data is unavailable.

Avoid:

- Any full logo/hero art inside forecasts, alert panels, or weather cards.

### `/plan`

Strong candidate for the kit, because the product metaphor is pocket map + rest-day companion.

Best placements:

- `atp-pocket-map-only-outlined.svg` or `atp-guide-companion-only.svg` in `PlanEmptyState`.
- `atp-three-waypoint-motif.svg` as a path/timeline endcap.
- Use one-color mark in PDF/print/share export if that arrives.

Avoid:

- Large brand lockup in populated plan; the user’s plan title and itinerary should own the page.

### `/plan/[shareId]` and `/p/[shareToken]`

Shared plan pages are brand handoff moments.

Best placements:

- Horizontal outlined lockup in the page header.
- One small motif near share/export actions.
- App icon/primary lockup in OG image for shared plans.

Avoid:

- Mascot taking space from itinerary details.

### `/search`

Search already has `StarlightSearchEffect`; keep it light.

Best placements:

- Tiny companion in the empty state before search or no-results recovery.
- Motif near suggested query chips.

Avoid:

- Full lockup inside results; search should feel responsive and clean.

### `/guides` and `/guides/[slug]`

Guides are editorial and can handle more brand.

Best placements:

- Horizontal lockup or motif in guide index intro.
- Map-only mark in guide cards or guide CTA blocks.
- Hero-art SVG only in a controlled “Pocket Map Companion” explainer panel, not every guide.

Avoid:

- Repeating primary lockup on every guide detail page.

### `/about`

Use the primary lockup here. This is the best page to explain the brand system and independent stance.

Best placements:

- `atp-pocket-map-primary-lockup-outlined.svg` near the top.
- Asset-kit narrative: pocket map, guide companion, sunshine-to-starlight route.
- Keep independent disclaimer close by.

### `/source-and-accuracy-policy`

Trust page. Brand should be quiet and official-feeling.

Best placements:

- Small horizontal lockup at top or footer only.
- One-color mark as a restrained seal if desired.

Avoid:

- Companion/mascot in source policy body. It can make caveats feel less serious.

### `/corrections`

This is a help/contact flow. A friendly companion can work.

Best placements:

- Small companion mark in the intro or success/thank-you state.
- Motif divider between form and policy notes.

Avoid:

- Big brand art above the form.

### `/privacy` and `/terms`

Use minimal brand only.

Best placements:

- Global header/footer only.
- No in-body kit art unless a tiny one-color seal is used consistently with policy pages.

### `/disney-world-resort-activity-calendars` and seasonal calendar pages

These are SEO/content hybrids and can use the map metaphor.

Best placements:

- Map-only mark in the intro.
- Motif dividers around resort calendar lists.
- Horizontal lockup in OG images.

Avoid:

- Replacing page-specific headings with brand lockups.

### `not-found`

Good place for playful brand recovery.

Best placements:

- `atp-pocket-map-only-outlined.svg` or existing `FoldedMap404` if that component is already stronger.
- Companion mark as small helper.

## Implementation Order

1. Global favicon/PWA icons and manifest.
2. Header/footer brand treatment.
3. OG image template with brand motif or lockup.
4. Empty-state component upgrade using companion/map marks.
5. Plan page and shared plan branding.
6. Tonight dark-mode feature use.
7. About/source pages as brand/trust anchors.
8. Optional guide/calendar editorial panels.

## Asset Placement Rules

- Put production SVGs under `public/brand/`.
- Use outlined SVGs for any asset with lettering.
- Use `next/image` for PNG/WebP/raster placements and normal `<img>` or CSS background only when simpler and stable.
- Decorative art gets `alt=""` and `aria-hidden` when appropriate.
- Meaningful brand lockups get clear alt text, for example `After the Parks`.
- Keep every inserted asset at a stable width/height to avoid CLS.
- Do not inline large SVGs into repeated cards or rows.
- Do not replace existing semantic weather/category icons with the brand kit.

## Recommended Public Asset Set

Copy only the useful production subset into the app, not the whole kit:

- `public/brand/atp-pocket-map-horizontal-lockup-outlined.svg`
- `public/brand/atp-pocket-map-primary-lockup-outlined.svg`
- `public/brand/atp-pocket-map-dark-lockup-outlined.svg`
- `public/brand/atp-pocket-map-only-outlined.svg`
- `public/brand/atp-guide-companion-only.svg`
- `public/brand/atp-three-waypoint-motif.svg`
- `public/brand/atp-pocket-map-app-icon-512.png`
- `public/brand/atp-pocket-map-app-icon-1024.png`
- `public/brand/apple-touch-icon-180.png`
- `public/favicon.ico`
- `public/favicon.svg`

Leave the editable source kit in Downloads or a design-assets folder, but keep the site payload lean.
