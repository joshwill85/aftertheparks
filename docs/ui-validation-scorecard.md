# UI Validation Scorecard — June 2026

**Benchmark:** Premium tropical travel journal (Mr & Mrs Smith, Culture Trip, Monocle)  
**Overall score:** 5.8/10 (pre–Phase 0 deployment)

## Scores

| Area | Score | Status after Phase 0 start |
|------|-------|---------------------------|
| Visual hierarchy & typography | 7/10 | Unchanged — Sprint 2 |
| Color system & daypart | 7/10 | Unchanged — Sprint 3 |
| Card design & density | 5/10 | Improved — source links removed |
| Mobile UX | 6/10 | Unchanged — Sprint 3 |
| Tonight starlight | 6.5/10 | Unchanged — Sprint 3 |
| Trust/data presentation | 4/10 | **In progress** — displayQualityScore |
| Emotional resonance | 5.5/10 | Partial — homepage today filter |
| Performance | 6.5/10 | Unchanged — Sprint 4 |
| Accessibility | 6/10 | Unchanged — Sprint 5 |
| “Disney devs jealous” | 5/10 | Target 8.5+ after Sprint 1–4 |

## Post-Implementation Checklist

### Trust (must pass 100%)
- [x] Explore: 0 letter-spaced OCR titles *(local validator)*
- [x] Tonight: 0 duplicate activity IDs *(local validator)*
- [x] Verified badges only on high-tier activities *(local — `ensurePublicActivity`)*
- [x] Movie titles: single clean string *(local validator)*

Run: `npm run dev` → `npm run validate:trust`  
Production (pre-deploy): still failing duplicate IDs + unearned verified.

### Visual / UX (auditor pass — June 2026)
- [x] Unified `.form-control` height (44px) on selects/inputs
- [x] `.btn-primary` / `.btn-secondary` — flex-centered, cursor pointer
- [x] `.card-actions` — aligned button row on activity cards
- [x] Night card media column matches day card symmetry
- [x] Explore result summary stacks on narrow screens
- [x] Filter sheet header actions vertically centered
- [x] Homepage section headers stack cleanly on mobile
- [x] Plan remove control — 44px tap target
- [x] Hero `next/image` + mobile `priority` (91KB WebP LCP asset)
- [x] Tonight: full chrome dark (header + nav via `data-theme="starlight"`)
- [x] Explore mobile: sticky search, active mood chips
- [x] Filter sheet: focus trap + Apply/Clear
- [ ] Homepage LCP < 2.5s mobile (measure in Lighthouse post-deploy)
- [ ] Card scan path < 3 seconds (subjective sign-off)

### Accessibility
- [x] Skip link works (contextual on Today/Tonight/Explore)
- [x] Tap targets ≥ 44px (buttons, nav, form controls)
- [x] Night card contrast ≥ 4.5:1 (`white/78` minimum)
- [x] `prefers-reduced-motion` respected

## Sprint Priority

1. **Trust gate** — displayQuality, categorization, dedupe *(started)*
2. **Card honesty** — badges cap, SVG icons, server components
3. **Mobile Explore + Tonight immersion**
4. **Emotional layer** — QuickFinder redesign, rest-day builder MVP
5. **QA** — tokens, WCAG, CWV

See [phased-redesign-plan.md](./phased-redesign-plan.md) for full roadmap.
