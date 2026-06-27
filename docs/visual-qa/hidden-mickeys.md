# Hidden Resort Magic QA Inventory

Internal QA register for the Phase 7 hidden-detail layer. These details are decorative, brand-safe, and optional. They must never carry navigation, trust, filter state, or primary instructions.

Reduced motion rule: every animated detail either becomes static or disappears without affecting layout.

| ID | Route | Surface | Trigger | Screenshot expectation | Reduced motion | Brand-safety note |
| --- | --- | --- | --- | --- | --- | --- |
| hero_lantern_alignment | / | Home hero | Starlight atmosphere or hero hover/focus | Three tiny lantern glints sit inside the photo treatment, low contrast and never logo-like. | Static faint light cluster; no drift or shimmer. | Built from lantern bokeh dots inside the existing resort-photo treatment. |
| quick_finder_bubble_trail | / | Quick Finder CTA | Button hover/focus/press | Three lagoon bubbles rise from the button edge without shifting the CTA. | Bubbles remain as a quiet static edge glint. | Uses lagoon bubbles attached to the existing button edge. |
| filter_chip_constellation | /activities | Active filter chips | Exactly three active filters | Active chip area gains a tiny dotted connector between chip accents. | Dotted connector stays static and low contrast. | Uses active filter chip accents as decorative state texture. |
| calendar_triple_dot_upgrade | /calendar | Calendar day cell | Exactly three starlight activities | Density band area adds three micro dots while aria label keeps the real count. | Always static; no animation required. | Reuses calendar density dots as schedule texture. |
| resort_card_tilework | /resorts | Resort card banner | Card hover/focus and high-density cards | Banner tile texture reveals one tiny three-dot arrangement in a corner. | Tilework remains still; hover only changes opacity. | Reads as architecture or textile texture inside the resort card banner. |
| category_stamp_imperfection | /activities/[slug] | Category stamp | Hover/focus around stamp surfaces | Micro ink misregistration dots appear inside the stamp edge. | Ink dots stay in place with no shimmer. | Tiny misregistration dots match the paper passport metaphor. |
| plan_passport_completion_reveal | /plan | Resort passport | Three or more different category stamps | Passport panel shows a soft outline tying earned stamps together. | Soft outline is visible statically without landing animation. | Uses the guest's earned stamps and paper grain. |
| starlight_firefly_pause | /tonight | Nightfall Timeline | Timeline present | Three firefly points pause around the rail without covering event text. | Fireflies render as tiny stationary points on the timeline rail. | Atmospheric fireflies belong to the evening timeline context. |
| search_suggestion_echo | /search | Search effect | Query includes campfire, movie, magic, or starlight | Search surface gets three tiny sparkle dots for one second / while query is active. | Sparkles appear without twinkling. | Uses search underline sparkles connected to the user's own query. |
| footer_paper_grain_secret | global footer | Footer disclaimer | Long-scroll footer/disclaimer area | Paper texture includes one microscopic watermark near the disclaimer. | Always static. | Microscopic paper-grain watermark near the independent-guide disclaimer. |

QA checklist:
- [ ] Decorative nodes are `aria-hidden`.
- [ ] No hidden detail is required to complete a task.
- [ ] No hidden detail appears as an obvious first-viewport logo.
- [ ] Motion respects `prefers-reduced-motion`.
- [ ] Mobile, tablet, and desktop screenshots include at least Home, Explore with three filters, Calendar, Resorts, Tonight, Search with a keyword, Plan with three stamps, and Footer.
