import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildSeoGuideDossier,
  validateSeoGuideDossiers,
} from "@/lib/seo/guideDossiers";
import { HIGH_VALUE_GUIDES } from "@/lib/seo/routes";

const REQUIRED_BUCKETS = [
  "officialSourceFacts",
  "afterTheParksDataFacts",
  "communitySentimentUse",
  "competitorGapAnalysis",
  "transportationValidation",
  "badFitExclusions",
  "deepLinkPlan",
  "editorialReview",
  "officialSourceLinks",
  "updateNotes",
  "antiThinContentChecks",
] as const;

for (const guide of HIGH_VALUE_GUIDES) {
  const dossier = buildSeoGuideDossier(guide);
  assert.equal(dossier.slug, guide.slug);
  assert.equal(dossier.title, guide.title);

  for (const bucket of REQUIRED_BUCKETS) {
    assert.ok(
      dossier[bucket].length >= 2,
      `${guide.slug} dossier should include at least two ${bucket} entries`
    );
  }

  assert.match(
    dossier.transportationValidation.join(" "),
    /Disney Springs|direct|route|reservation|resort stay|transportation/i,
    `${guide.slug} transportation validation should be route/access aware`
  );
}

const dossierIssues = validateSeoGuideDossiers(HIGH_VALUE_GUIDES);
assert.deepEqual(
  dossierIssues,
  [],
  `all high-value guides should have complete research dossiers: ${dossierIssues.join("; ")}`
);

const guidePage = readFileSync("app/guides/[slug]/page.tsx", "utf8");
for (const expected of [
  "Start here",
  "Important caveats",
  "Live planning paths",
  "Best next clicks",
  "Mistakes to avoid",
  "Sources and update notes",
]) {
  assert.match(
    guidePage,
    new RegExp(expected),
    `guide detail page should render visitor-facing section: ${expected}`
  );
}

for (const removed of [
  "Research dossier",
  "Official-source facts",
  "After the Parks data facts",
  "Community sentiment use",
  "Competitor gap analysis",
  "Bad-fit exclusions",
  "Deep-link plan",
  "Anti-thin-content checks",
  "Would this page still help if search engines sent zero traffic?",
]) {
  assert.doesNotMatch(
    guidePage,
    new RegExp(removed),
    `guide detail page should not publicly render scaffold label: ${removed}`
  );
}

console.log("SEO guide dossier tests passed.");
