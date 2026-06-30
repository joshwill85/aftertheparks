import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rail = readFileSync("components/explore/FilterRail.tsx", "utf8");
const shell = readFileSync("components/explore/BrowseFilterShell.tsx", "utf8");
const sheet = readFileSync("components/explore/FilterSheet.tsx", "utf8");
const exploreLayout = readFileSync("components/explore/ExploreLayout.tsx", "utf8");
const explorePlanRail = readFileSync("components/explore/ExplorePlanRail.tsx", "utf8");
const resultSummary = readFileSync("components/explore/ResultSummary.tsx", "utf8");
const styles = readFileSync("src/styles/polish.css", "utf8");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Missing CSS rule for ${selector}`);
  return match[1];
}

assert.doesNotMatch(
  rail,
  /MOOD_CHIPS|Quick moods|mergeMoodChipHref/,
  "Quick mood shortcuts should live above results, not inside the tall desktop filter rail"
);

assert.match(
  shell,
  /ResultSummary/,
  "Browse controls should expose a result summary above result cards"
);

assert.match(
  shell,
  /activeChips=\{activeChips\}/,
  "Browse result summary should receive active filter chips from URL state"
);

assert.match(
  rail,
  /Popular needs/,
  "Filter pane should expose intent presets as Popular needs"
);

assert.match(
  rail,
  /More filters/,
  "Filter pane should move secondary controls under More filters"
);

assert.match(
  rail,
  /Reservation required/,
  "Reservation filter copy should be explicit"
);

assert.doesNotMatch(
  rail,
  /label:\s*"Reservations"/,
  "Reservation filter label should not use generic Reservations copy"
);

assert.match(
  resultSummary,
  /Showing \$\{count\} activit/,
  "Result summary should use the active sentence pattern from the PRD"
);

assert.ok(
  resultSummary.includes('activeChips.map((chip) => chip.label).join(" + ")'),
  "Active summary should list selected filter labels joined by plus signs"
);

assert.match(
  rail,
  /function FilterSection/,
  "Filter rail should use a shared compact section component"
);

assert.match(
  rail,
  /defaultOpen=\{resortOptions\.length > 0\}/,
  "The resort section should be the first open desktop filter section"
);

assert.match(
  rail,
  /filter-section__summary/,
  "Filter sections should use summary headers for compact accordion behavior"
);

assert.match(
  sheet,
  /resultCount: number/,
  "Mobile filter sheet should receive the current result count"
);

assert.match(
  sheet,
  /filter-sheet__footer/,
  "Mobile filter sheet should have a sticky footer action area"
);

assert.match(
  sheet,
  /Show \{resultCount\}/,
  "Mobile sheet primary action should preview the result count"
);

assert.match(
  shell,
  /aria-label="Open filters"/,
  "Mobile filter trigger should keep a stable accessible name when active filter counts change"
);

assert.match(
  shell,
  /aria-haspopup="dialog"/,
  "Mobile filter trigger should advertise that it opens a dialog"
);

assert.match(
  exploreLayout,
  /<ExplorePlanRail \/>/,
  "Activities layout should use the dedicated plan rail component for saved-plan state"
);

assert.doesNotMatch(
  exploreLayout,
  /next\/dynamic|ssr:\s*false/,
  "Activities layout should not use next/dynamic for the plan rail because it can bail out server rendering"
);

assert.match(
  explorePlanRail,
  /visibleItems\.slice\(0,\s*5\)/,
  "Desktop plan rail should still summarize saved plan items once client state is available"
);

assert.match(
  explorePlanRail,
  /mounted/,
  "Desktop plan rail should render stable placeholder markup until the client is mounted"
);

assert.match(
  ruleBody(".filter-section"),
  /border-bottom:\s*1px solid/,
  "Filter groups should be visually separated without oversized nested cards"
);

assert.match(
  ruleBody(".filter-section__summary"),
  /min-height:\s*44px/,
  "Filter group headers should keep accessible touch target sizing"
);

assert.match(
  ruleBody(".filter-option-row"),
  /display:\s*grid[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/,
  "Long filter lists should use compact rows with aligned labels and counts"
);

assert.match(
  ruleBody(".filter-sheet__footer"),
  /position:\s*sticky[\s\S]*bottom:\s*-1\.25rem/,
  "Mobile sheet actions should stay visible while the filter list scrolls"
);

console.log("Filter pane UX contract passed.");
