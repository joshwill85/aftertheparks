import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const componentFiles = [
  "components/seo/AnswerBlock.tsx",
  "components/seo/FreshnessFacts.tsx",
  "components/seo/IntentLinkCluster.tsx",
];

for (const file of componentFiles) {
  assert.ok(existsSync(file), `${file} should exist as a shared SEO component`);
}

const primaryRoutes = [
  "app/page.tsx",
  "app/today/page.tsx",
  "app/tonight/page.tsx",
  "app/activities/page.tsx",
  "app/resorts/page.tsx",
  "app/disney-world-resort-activity-calendars/page.tsx",
];

const usageCounts = {
  AnswerBlock: 0,
  FreshnessFacts: 0,
  IntentLinkCluster: 0,
};

for (const route of primaryRoutes) {
  const source = readFileSync(route, "utf8");
  for (const key of Object.keys(usageCounts) as Array<keyof typeof usageCounts>) {
    if (source.includes(`<${key}`)) usageCounts[key] += 1;
  }
}

assert.ok(usageCounts.AnswerBlock >= 4, "AnswerBlock should be used on at least four primary routes");
assert.ok(usageCounts.FreshnessFacts >= 4, "FreshnessFacts should be used on at least four primary routes");
assert.ok(usageCounts.IntentLinkCluster >= 4, "IntentLinkCluster should be used on at least four primary routes");

const answerSource = readFileSync("components/seo/AnswerBlock.tsx", "utf8");
assert.match(answerSource, /primaryAction/, "AnswerBlock should expose a primary action link");
assert.doesNotMatch(answerSource, /hidden|crawler-only|seo-hidden/i, "AnswerBlock must render visible content");

const freshnessSource = readFileSync("components/seo/FreshnessFacts.tsx", "utf8");
for (const expected of ["lastVerified", "activityCount", "sourceCount", "correctionHref"]) {
  assert.match(freshnessSource, new RegExp(expected), `FreshnessFacts should support ${expected}`);
}

const linkClusterSource = readFileSync("components/seo/IntentLinkCluster.tsx", "utf8");
assert.match(linkClusterSource, /links/, "IntentLinkCluster should render a list of product links");

console.log("SEO shared component tests passed.");
