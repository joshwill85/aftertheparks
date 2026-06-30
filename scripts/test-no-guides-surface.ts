import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const removedSection = ["guid", "es"].join("");
const removedRoot = `app/${removedSection}`;
const removedRoutePath = `/${removedSection}`;
const removedDiscoveryImport = `@/lib/${removedSection}`;
const removedGuideRoutePattern = new RegExp(
  `["'\`]${removedRoutePath}(?:/|\\?|#|["'\`])`
);

const guideRouteFiles = [
  `${removedRoot}/page.tsx`,
  `${removedRoot}/[slug]/page.tsx`,
  `${removedRoot}/first-night-at-the-resort/page.tsx`,
];

for (const routeFile of guideRouteFiles) {
  assert.equal(
    existsSync(routeFile),
    false,
    `${routeFile} should not exist because the public Guides section has been removed`
  );
}

const publicSurfaceFiles = [
  "components/layout/SiteHeader.tsx",
  "components/layout/SiteFooter.tsx",
  "app/page.tsx",
  "app/search/page.tsx",
  "components/atlas/SearchClient.tsx",
  "app/sitemap.ts",
  "lib/seo/llms.ts",
  "lib/seo/measurement.ts",
  "lib/seo/searchIndexEvidence.ts",
  "lib/seo/crawlerAccess.ts",
  "lib/seo/agentReadinessCapture.ts",
  "lib/seo/agentReadinessEvidence.ts",
  "lib/seo/structuredDataEvidence.ts",
  "lib/seo/comparisonPages.ts",
  "lib/seo/pageQualification.ts",
  "lib/seo/performanceBudgets.ts",
  "lib/seo/seasonalCalendarPages.ts",
  "lib/search/documents.ts",
  "lib/search/runSearch.ts",
  "lib/search/synonyms.ts",
  "lib/search/types.ts",
  "lib/search/schema.ts",
];

for (const file of publicSurfaceFiles) {
  const source = readFileSync(file, "utf8");
  assert.equal(
    removedGuideRoutePattern.test(source),
    false,
    `${file} should not link to the removed Guides section`
  );
  assert.equal(
    source.includes(removedDiscoveryImport),
    false,
    `${file} should not import removed guide discovery data`
  );
}

for (const file of publicSurfaceFiles) {
  const source = readFileSync(file, "utf8");
  assert.equal(
    removedGuideRoutePattern.test(source),
    false,
    `${file} should not reference removed guide routes`
  );
  assert.equal(
    source.includes(removedDiscoveryImport),
    false,
    `${file} should not import removed guide discovery data`
  );
}

console.log("No public Guides surface remains.");
