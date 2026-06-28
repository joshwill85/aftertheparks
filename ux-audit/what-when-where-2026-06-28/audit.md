# What, When, Where Activity UI Audit

Date: 2026-06-28

## Scope

Reviewed current activity surfaces for whether activity cards and detail pages answer:

- What: activity title and useful expectation/summary.
- When: date/day plus time or honest uncertainty.
- Where: resort and usable venue/location.

Evidence captured from the running local app at `http://localhost:3002`:

- `screenshots/01-activities-directory.png`
- `screenshots/02-today.png`
- `screenshots/03-resort-detail.png`
- `screenshots/04-activity-detail.png`
- `rendered-summary.json`

Also reviewed the shared card/detail code paths and the gold preview data with the same display helpers used by the UI.

## Step Review

1. Activity directory: healthy for common timed activities. Cards show title, resort, location, day, time, badges, and summary. Weakness: broad all-day items can show precise-looking windows like `7:00 AM - 11:00 PM` when the guest may read them as operating certainty.
2. Today page: healthy for dated cards. Same card contract as the activity directory, with strong day/time visibility.
3. Resort detail page: mostly healthy. Because the resort page context supplies the resort, cards intentionally hide the resort line. However, if a sanitized location falls back to `Resort`, card-level where can disappear, as seen with `Groovy Campfire`.
4. Activity detail page: strong. Detail pages explicitly show `When`, `What to expect`, `Where to go`, schedule, source/freshness, optional purchases, and planning caveats.

## Findings

The UI does not answer what, when, and where fully and intuitively for every activity yet, but it is close.

Card-level what is usually strong when a summary exists. In the gold preview representative set, 42 of 331 experiences had weak what coverage by a strict test, mostly because the summary was missing or generic.

Card-level when is the main weak point. In the gold preview representative set, 22 of 331 experiences had no display time, and 9 had a time marked uncertain. `Daily`, `dawn to dusk`, and `open 24 hours` cases need more intuitive public labels.

Card-level where is usually present, but sanitized fallback locations are hidden by `activityToEventCard` when they collapse to `Resort`. This is honest, but the result can feel incomplete on cards. The Pop Century `Groovy Campfire` card demonstrated this: detail says `Located by Surfer Goofy`, while the resort card shows no visible location.

Detail-level coverage is much better than card-level coverage. The detail page answers all three explicitly, and `exactVenue` enrichments improve where coverage. In the preview data, 206 of 331 representative experiences had an exact venue enrichment.

## Accessibility And Comprehension Risks

The basics are visually present on most cards, but card fields are positional rather than labeled. Sighted repeat users can learn the pattern; screen reader and scanning users may benefit from clearer semantic grouping or accessible labels for day, time, and location.

When the card uses a precise range for broad all-day availability, users may over-trust the precision. This is more of a content risk than a component bug.

## Recommended Fixes

1. Add a card-level fallback where line such as `At this resort` or `Confirm exact spot` when sanitized location becomes `Resort`, especially on resort-scoped pages.
2. Improve public timing labels for evergreen patterns: `Daily`, `Dawn to dusk`, `Open 24 hours`, `Hours vary`, and `Anytime today`.
3. Make exact venue enrichment available on cards when it is source-backed, not only on the detail page.
4. Add a lightweight data/UI contract test for card-level `what`, `when`, and `where` completeness across representative activities.
5. Consider accessible hidden labels for card metadata, so screen readers encounter `Where:`, `When:`, and `Resort:` instead of unlabeled lines.

## Limits

This pass used local screenshots, rendered DOM extraction, source review, and gold preview data. It did not test every viewport, every filter state, or every individual production database row.
