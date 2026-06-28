# High-Priority UX Recommendations

Audit date: 2026-06-28

Evidence captured in `ux-audit/screenshots/`.

## Scope

Representative review of the main data-consumption surfaces:

- Home
- Activities / Explore
- Today
- Tonight navigation state
- Weather
- Mobile activities and today views

## Highest-Priority Recommendations

1. Fix the broken Tonight journey.

   Evidence: `/tonight` returned HTTP 404 during verification, and both desktop and mobile navigation point to `/tonight`. This blocks a primary planning path and also makes related CTAs such as "See tonight", "Covered tonight", and bottom-nav Tonight unreliable.

2. Replace repeated explanatory cards with a decision-first summary layer.

   The app has rich source, schedule, freshness, weather, cost, reservation, and location data, but users currently meet it as repeated "Quick answer" and "Source and freshness" panels before they reach the working list. Add a compact "What should I do now?" row near the top of Today, Tonight, Activities, Resort, and Weather pages.

3. Collapse source/freshness into progressive trust signals.

   Source-backed data is a strength, but the same freshness block currently competes with task controls. Keep one small trust line near the result count or card metadata, and move the full explanation into details/tooltips/source policy.

4. Make filters answer intent, not taxonomy.

   The filter model is capable, but the first impression is a broad control panel: resort, category, daypart, transport, area, weather, free, reservation. Add guided intent presets such as "near my resort", "rain backup", "free now", "little kids", "low walking", "after dinner", and "no reservation".

5. Standardize card information hierarchy around decision fields.

   Cards should consistently lead with: when, where, fit, weather risk, cost/reservation, save. Secondary source/trust notes can be smaller. Today and Activities currently show many cards with similar weight across title, metadata, badges, weather, and save controls, which slows scanning.

6. Improve mobile first-screen efficiency.

   Mobile Activities showed a large hero area before the user reaches results or filters, and the bottom nav covers lower content. The first mobile viewport should expose the page title, one-line answer, search/filter controls, result count, and the first result or empty-state action.

7. Unify weather as planning guidance across the product.

   Weather has strong raw guidance, but users should not have to interpret separate forecast pages and activity cards. Surface "go now / go later / pick covered backup" directly in Today, Tonight, and activity cards.

## Step Health

1. Home: Healthy foundation, but long and section-heavy.
2. Activities / Explore: Powerful, but dense and filter-first.
3. Today: Strong data freshness and schedule depth, but cards are hard to scan at scale.
4. Tonight: Unhealthy in current run because `/tonight` returns 404.
5. Weather: Strong guidance surface, but separate from activity decision-making.
6. Mobile: Needs prioritization; large top panels delay useful controls/results.

## Evidence Limits

This was a screenshot- and code-grounded audit, not a full accessibility or usability study. Keyboard focus order, screen-reader output, live production behavior, and analytics-backed task success were not fully tested.
