import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync("components/explore/BrowseFilterShell.tsx", "utf8");
const searchBar = readFileSync("components/explore/ExploreSearchBar.tsx", "utf8");
const resultSummary = readFileSync("components/explore/ResultSummary.tsx", "utf8");
const exploreLayout = readFileSync("components/explore/ExploreLayout.tsx", "utf8");
const polish = readFileSync("src/styles/polish.css", "utf8");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = polish.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Missing CSS rule for ${selector}`);
  return match[1];
}

assert.ok(
  !shell.includes("<FilterAlchemyBoard"),
  "Browse filter shell should not render the oversized decorative filter board above results."
);

assert.ok(
  shell.includes('className="browse-controls__utility"'),
  "Browse controls should group the full-search link in a dedicated utility row."
);

assert.ok(
  searchBar.includes('className="explore-search__row"'),
  "Explore search controls should use a named row for symmetrical input/button sizing."
);

assert.ok(
  resultSummary.includes("result-summary__count"),
  "Result summary count should have a stable class for aligned layout."
);

assert.ok(
  resultSummary.includes("result-summary__sort-label"),
  "Result summary should expose a visible sort label for a cleaner control group."
);

assert.match(
  ruleBody(".explore-search__row"),
  /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/,
  "Search row should keep the input and button aligned without uneven wrapping."
);

assert.match(
  ruleBody(".browse-controls__utility"),
  /display:\s*flex[\s\S]*justify-content:\s*space-between/,
  "Utility row should align secondary actions cleanly."
);

assert.match(
  ruleBody(".result-summary__sort"),
  /grid-template-columns:\s*auto\s+minmax\(11rem,\s*14rem\)/,
  "Sort controls should keep the label, select, and help text in a bounded grid."
);

assert.ok(
  exploreLayout.indexOf("<ActivityGrid") <
    exploreLayout.indexOf("<ActivityOfferingGrid"),
  "Timed activity cards should render before untimed official offerings so Happening soon leads with future starts."
);

console.log("Browse controls layout coverage passed.");
