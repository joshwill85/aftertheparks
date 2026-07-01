import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const homePage = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");

assert.match(
  homePage,
  /getTomorrowPreview\(\{\}, 200\)/,
  "Home activity day filters must use the full tomorrow activity pool, not getTomorrowPreview's default four-item preview."
);

assert.match(
  homePage,
  /const currentActivities = \[\.\.\.todayActivities, \.\.\.tomorrowActivities\]/,
  "Home activity collection should be built from today's and tomorrow's activity records."
);

assert.match(
  homePage,
  /<ActivityCollectionView activities=\{currentActivities\} showResort \/>/,
  "The home page should pass the full current activity collection into the filterable activity view."
);

assert.doesNotMatch(
  homePage,
  /popularActivities\s*=\s*\[\.\.\.freeActivities,\s*\.\.\.littleKidActivities\]|getCuratedHomeActivities/,
  "Home day/category filters should not be backed by curated teaser slices."
);

console.log("Home activity collection contract passed.");
