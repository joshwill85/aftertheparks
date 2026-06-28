import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync("components/explore/BrowseFilterShell.tsx", "utf8");
const styles = readFileSync("src/styles/polish.css", "utf8");
const rail = readFileSync("components/explore/FilterRail.tsx", "utf8");

assert.match(
  shell,
  /filter-rail-scroll-frame/,
  "BrowseFilterShell should wrap the desktop filter rail in a dedicated scroll frame"
);
assert.doesNotMatch(
  shell,
  /className="filter-rail sticky top-24"/,
  "The sticky wrapper should not share the styled filter-rail class"
);
assert.match(
  styles,
  /\.filter-rail-scroll-frame\s*>\s*\.filter-rail\s*\{[\s\S]*max-height:\s*calc\(100dvh - 7rem\);[\s\S]*overflow-y:\s*auto;[\s\S]*overscroll-behavior:\s*contain;/,
  "The visible desktop filter rail should scroll inside the viewport when filters exceed available height"
);
assert.match(
  rail,
  /aria-label="Activity filters"[\s\S]*tabIndex=\{0\}/,
  "The scrollable filter rail should be keyboard focusable and labelled"
);
assert.match(
  rail,
  /onWheel=\{handleRailWheel\}/,
  "The filter rail should handle wheel scrolling itself instead of leaking scroll to the page"
);
assert.match(
  rail,
  /onKeyDown=\{handleRailKeyDown\}/,
  "The filter rail should handle keyboard scrolling itself"
);

console.log("Filter rail scroll contract passed.");
