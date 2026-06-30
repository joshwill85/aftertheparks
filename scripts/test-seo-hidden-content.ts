import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { auditHiddenSeoContent } from "@/lib/seo/hiddenContent";

const safeIssues = auditHiddenSeoContent([
  {
    file: "safe.tsx",
    source:
      '<label className="sr-only" htmlFor="search">Search resorts</label><span aria-hidden>Decorative spark</span>',
  },
]);
assert.deepEqual(
  safeIssues,
  [],
  "accessibility labels and decorative aria-hidden elements should remain allowed"
);

const riskyIssues = auditHiddenSeoContent([
  {
    file: "risky.tsx",
    source:
      '<section className="seo-hidden crawler-only">Disney resort activities keyword text for search engines only.</section>',
  },
]);
assert.ok(
  riskyIssues.some((issue) => issue.file === "risky.tsx" && /crawler-only/i.test(issue.message)),
  "crawler-only hidden SEO copy should be flagged"
);
assert.ok(
  riskyIssues.some((issue) => /search engines only/i.test(issue.snippet)),
  "hidden search-engine-only copy should include the offending snippet"
);

const filesToAudit = [
  "app/activities/page.tsx",
  "app/activities/[slug]/page.tsx",
  "app/disney-world-resort-activity-calendars/page.tsx",
  "app/disney-world-resort-activity-calendars/[season]/page.tsx",
  "app/resorts/[slug]/page.tsx",
  "app/resorts/page.tsx",
  "app/search/page.tsx",
  "app/source-and-accuracy-policy/page.tsx",
  "app/today/page.tsx",
  "app/tonight/page.tsx",
  "components/seo/SeoFaq.tsx",
  "lib/seo/transportation.ts",
];

const sourceIssues = auditHiddenSeoContent(
  filesToAudit.map((file) => ({
    file,
    source: readFileSync(file, "utf8"),
  }))
);

assert.deepEqual(
  sourceIssues,
  [],
  `SEO content must be visible to users, not hidden for crawlers:\n${sourceIssues
    .map((issue) => `${issue.file}:${issue.line}: ${issue.message} -> ${issue.snippet}`)
    .join("\n")}`
);

console.log("SEO hidden-content tests passed.");
