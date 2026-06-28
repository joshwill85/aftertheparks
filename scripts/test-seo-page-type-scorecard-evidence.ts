import assert from "node:assert/strict";

import {
  auditPageTypeScorecardEvidence,
  parsePageTypeScorecardEvidenceLines,
  renderPageTypeScorecardEvidenceReport,
} from "@/lib/seo/pageTypeScorecardEvidence";

const checkedAt = new Date().toISOString();
const completeRecords = [
  {
    checkedAt,
    pageType: "resort_pages",
    indexedCount: 24,
    impressions: 1200,
    clicks: 96,
    ctr: 0.08,
    averagePosition: 8.4,
    sourceFreshnessStatus: "current",
    topLinkedGuides: ["/guides/things-to-do-without-park-ticket"],
  },
  {
    checkedAt,
    pageType: "activity_pages",
    indexedCount: 18,
    impressions: 900,
    clicks: 81,
    ctr: 0.09,
    averagePosition: 7.2,
    richResultIssues: 0,
    nextOccurrenceCoverage: 0.82,
  },
  {
    checkedAt,
    pageType: "guides",
    indexedCount: 12,
    impressions: 1500,
    clicks: 105,
    ctr: 0.07,
    averagePosition: 9.5,
    deepLinkPerformance: "healthy",
    buildMergeRejectDecisions: { build: 6, merge: 2, reject: 3 },
  },
  {
    checkedAt,
    pageType: "calendar_hub",
    indexedCount: 4,
    impressions: 700,
    clicks: 70,
    ctr: 0.1,
    averagePosition: 5.1,
    crawlFreshness: "current",
    competitorOverlapTerms: ["Magical Resort Guide resort activities"],
  },
  {
    checkedAt,
    pageType: "today_tonight",
    indexedCount: 2,
    impressions: 640,
    clicks: 64,
    ctr: 0.1,
    averagePosition: 6.3,
    currentDataCoverage: 0.91,
    noindexCanonicalStatus: "clean",
  },
];

const passingAudit = auditPageTypeScorecardEvidence(completeRecords);
assert.deepEqual(
  passingAudit.issues,
  [],
  `complete scorecard should pass: ${passingAudit.issues.join("; ")}`
);
assert.equal(passingAudit.rows.length, 5);
assert.equal(passingAudit.summary.totalImpressions, 4940);
assert.equal(passingAudit.summary.totalClicks, 416);
assert.ok(
  renderPageTypeScorecardEvidenceReport(passingAudit).includes("Page Type Scorecard Evidence Audit"),
  "scorecard report should render a readable heading"
);

const parsed = parsePageTypeScorecardEvidenceLines(
  `notes\n${JSON.stringify(completeRecords[0])}\n`
);
assert.equal(parsed.length, 1, "parser should ignore non-JSON note lines");

const missingPageTypeAudit = auditPageTypeScorecardEvidence(completeRecords.slice(0, 4));
assert.ok(
  missingPageTypeAudit.issues.some((issue) => /missing page type/i.test(issue)),
  "audit should require every page type in the strategy scorecard"
);

const badMetricAudit = auditPageTypeScorecardEvidence([
  {
    ...completeRecords[0],
    ctr: 1.3,
  },
]);
assert.ok(
  badMetricAudit.issues.some((issue) => /ctr/i.test(issue)),
  "audit should reject impossible CTR values"
);

const staleAudit = auditPageTypeScorecardEvidence([
  {
    ...completeRecords[0],
    checkedAt: "2026-01-01T00:00:00.000Z",
  },
]);
assert.ok(
  staleAudit.issues.some((issue) => /older than/i.test(issue)),
  "audit should reject stale scorecard records"
);

const missingSpecificFieldAudit = auditPageTypeScorecardEvidence([
  {
    checkedAt,
    pageType: "calendar_hub",
    indexedCount: 4,
    impressions: 700,
    clicks: 70,
    ctr: 0.1,
    averagePosition: 5.1,
  },
]);
assert.ok(
  missingSpecificFieldAudit.issues.some((issue) => /competitorOverlapTerms/.test(issue)),
  "calendar hub scorecard should preserve competitor-overlap terms"
);

const badDecisionAudit = auditPageTypeScorecardEvidence([
  {
    ...completeRecords[2],
    buildMergeRejectDecisions: { build: 1, merge: -1, reject: 0 },
  },
]);
assert.ok(
  badDecisionAudit.issues.some((issue) => /buildMergeRejectDecisions/.test(issue)),
  "guide scorecard should reject invalid build/merge/reject decision counts"
);

console.log("SEO page type scorecard evidence tests passed.");
