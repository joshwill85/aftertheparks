# Agent Team — Phases 0–10 Execution

**Skip:** Phase 11 (monetization) until post-launch.

## Roles

| Agent | Role | Responsibility |
|-------|------|----------------|
| **Orchestrator** | Program manager | Phase sequencing, dependencies, sprint checkpoints |
| **Principal UI Designer** | Wow factor | Lantern glow, starlight chrome, stamp animations, mood chips, hero polish |
| **Visual Auditor** | Pixel perfection | Button centering, symmetry, filter affordances, spacing, contrast |
| **Iteration Director** | Quality gate | BUILD → AUDIT → FIX → RE-AUDIT loop; phase definition of done |
| **Builders** (main agent) | Implementation | Trust engine, availability, pages, data pipeline |

## Iteration Loop

```
BUILD → AUDIT → FIX → RE-AUDIT (max 3 cycles per phase)
```

**Conflict priority:** Trust/A11y/performance → Visual Auditor wins. Emotion/microinteractions → UI Designer wins (after Phase 0 gate).

## Phase Status (live)

| Phase | Status |
|-------|--------|
| 0 Trust Emergency | **~90%** — re-publish done (262 activities); deploy + validation pending |
| 1 Availability Engine | **~85%** — unified engine, resort filter, tomorrow preview |
| 2 Display-Safe Model | **~75%** — cards migrated to `toDisplayActivity` |
| 3 Card System | **~70%** — mapper + stamp/lantern wired |
| 4 Explore | **~80%** — sort, sticky search, searchable resort sheet, focus trap |
| 5 Homepage | **~85%** — `next/image` hero, quick finder, collections |
| 6 Tonight Starlight | **~85%** — sections + dedupe + trust note |
| 7 Resorts & Detail | **~80%** — free/categories/source/empty states + badges |
| 8 Plan, Search, Guides | **~80%** — guides index page |
| 9 Magic Layer | **~60%** — rest day, passport, no-ticket, magic nearby |
| 10 Visual Polish & QA | **~65%** — polish pass, local validator green |

## Next orchestrator priorities

1. Deploy when ready — production trust gate
2. Lighthouse LCP measurement on mobile
3. Card scan path subjective sign-off
4. WCAG starlight contrast spot-check in browser

See [phased-redesign-plan.md](./phased-redesign-plan.md) and [ui-validation-scorecard.md](./ui-validation-scorecard.md).
