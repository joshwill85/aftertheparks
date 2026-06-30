import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  buildSeoGuideDossier,
  validateSeoGuideDossiers,
} from "@/lib/seo/guideDossiers";
import { HIGH_VALUE_GUIDES } from "@/lib/seo/routes";

const removedGuideDetailRoute = `app/${["guid", "es"].join("")}/[slug]/page.tsx`;

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

assert.equal(
  existsSync(removedGuideDetailRoute),
  false,
  "removed guide detail route should not be required for SEO dossier validation"
);

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
  for (const file of [
    "app/activities/page.tsx",
    "app/resorts/page.tsx",
    "app/today/page.tsx",
    "app/tonight/page.tsx",
    "app/disney-world-resort-activity-calendars/page.tsx",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      new RegExp(removed),
      `${file} should not publicly render scaffold label: ${removed}`
    );
  }
}

console.log("SEO internal planning dossier tests passed.");
