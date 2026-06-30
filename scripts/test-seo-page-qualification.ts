import assert from "node:assert/strict";
import { SEO_COMPARISON_PAGES } from "@/lib/seo/comparisonPages";
import {
  PAGE_QUALIFICATION_GATE,
  SEO_PAGE_MATRIX,
  evaluateSeoPageQualification,
  validateSeoPageMatrix,
} from "@/lib/seo/pageQualification";
import { HIGH_VALUE_GUIDES } from "@/lib/seo/routes";

const requiredGateFields = [
  "userIntent",
  "primaryUserAction",
  "afterTheParksAdvantage",
  "liveDataDependency",
  "researchSources",
  "exclusionRules",
  "deepLinkMap",
  "freshnessRule",
  "killRule",
] as const;

for (const field of requiredGateFields) {
  assert.ok(PAGE_QUALIFICATION_GATE.includes(field), `qualification gate should require ${field}`);
}

for (const slug of [
  "disney-world-non-park-day",
  "rainy-day-disney-resort-activities",
  "things-to-do-without-park-ticket",
  "best-disney-resorts-for-rainy-days",
  "best-monorail-resort-activities",
  "best-fort-wilderness-activities-without-a-park-ticket",
  "disney-springs-area-resort-activities",
]) {
  const page = SEO_PAGE_MATRIX.find((item) => item.slug === slug);
  assert.ok(page, `${slug} should appear in the SEO page matrix`);
  assert.equal(page!.decision, "build", `${slug} should be a build page`);
  assert.ok(page!.primaryProductPath.startsWith("/"), `${slug} should route into the product`);
  assert.ok(page!.minimumStrongRecommendations >= 5, `${slug} should require enough recommendations to avoid thin content`);
}

const disneySpringsGuide = HIGH_VALUE_GUIDES.find(
  (guide) => guide.slug === "disney-springs-area-resort-activities"
);
assert.ok(disneySpringsGuide, "Disney Springs-area guide should be a canonical high-value guide");
assert.equal(disneySpringsGuide!.tier, 3, "Disney Springs-area guide should be a route-validation Tier 3 page");
assert.match(
  [
    disneySpringsGuide!.description,
    disneySpringsGuide!.userPromise,
    disneySpringsGuide!.decisionFilter,
    ...disneySpringsGuide!.caveats,
    ...disneySpringsGuide!.exclusionRules,
  ].join(" "),
  /do not use Disney Springs as a free way|get to Disney resort hotels|resort stay|dining\/experience reservation/i,
  "Disney Springs-area guide should prominently caveat restricted resort transportation"
);

for (const page of [...HIGH_VALUE_GUIDES, ...SEO_COMPARISON_PAGES]) {
  const result = evaluateSeoPageQualification(page);
  assert.equal(result.decision, "build", `${page.slug} should pass as build-ready`);
  assert.deepEqual(result.issues, [], `${page.slug} should not have qualification issues`);
}

const weakResult = evaluateSeoPageQualification({
  slug: "grandparents-at-night-in-rain-by-boat",
  title: "Disney Resorts for Grandparents at Night in the Rain by Boat",
  description: "A narrow keyword variant with no unique value.",
  userPromise: "Maybe check the app.",
  primaryAction: { label: "Read more", href: "/activities" },
  deepLinks: ["/activities"],
  decisionFilter: "Same picks as other pages.",
  exclusionRules: [],
  freshnessRule: "Unknown.",
  keywords: ["grandparents rainy boat"],
});

assert.equal(weakResult.decision, "reject", "thin keyword variants should be rejected");
assert.match(weakResult.issues.join(" "), /deep links|exclusion|freshness|unique/i);

const matrixIssues = validateSeoPageMatrix(SEO_PAGE_MATRIX);
assert.deepEqual(matrixIssues, [], `SEO page matrix should be complete: ${matrixIssues.join("; ")}`);

console.log("SEO page qualification tests passed.");
