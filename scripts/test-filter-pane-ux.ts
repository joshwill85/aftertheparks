import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rail = readFileSync("components/explore/FilterRail.tsx", "utf8");
const shell = readFileSync("components/explore/BrowseFilterShell.tsx", "utf8");
const sheet = readFileSync("components/explore/FilterSheet.tsx", "utf8");
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
  /PresetChips/,
  "Browse controls should expose truthful preset chips above results"
);

assert.match(
  shell,
  /preset-chips-scroll mt-3/,
  "Browse controls should keep preset chips close to search and filters"
);

assert.match(
  rail,
  /Plan by need/,
  "Filter pane should expose presets as plan-by-need controls"
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
