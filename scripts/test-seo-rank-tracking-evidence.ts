import assert from "node:assert/strict";

import { PRIORITY_RANK_TRACKING_QUERIES } from "@/lib/seo/measurement";
import {
  auditRankTrackingEvidence,
  parseRankTrackingEvidenceLines,
  renderRankTrackingEvidenceReport,
} from "@/lib/seo/rankTrackingEvidence";

const checkedAt = new Date().toISOString();
const fullGoogleEvidence = PRIORITY_RANK_TRACKING_QUERIES.map((query, index) => ({
  checkedAt,
  engine: "Google",
  query: query.query,
  expectedCanonicalPath: query.canonicalPath,
  pageType: query.pageType,
  intent: query.intent,
  afterTheParksFound: index % 7 !== 0,
  observedAfterTheParksUrl:
    index % 7 !== 0 ? `https://aftertheparks.com${query.canonicalPath}` : "",
  observedPosition: index % 7 !== 0 ? index + 1 : null,
  bestCompetitorUrl:
    query.intent === "competitor_overlap"
      ? "https://www.magicalresortguide.com/resort-activities-main"
      : "",
}));

const passingAudit = auditRankTrackingEvidence(fullGoogleEvidence);
assert.deepEqual(
  passingAudit.issues,
  [],
  `complete rank evidence should pass: ${passingAudit.issues.join("; ")}`
);
assert.equal(passingAudit.rows.length, 50);
assert.equal(passingAudit.summary.engines.join(","), "Google");
assert.equal(passingAudit.summary.totalQueries, 50);
assert.ok(
  renderRankTrackingEvidenceReport(passingAudit).includes("Rank Tracking Evidence Audit"),
  "rank report should render a readable heading"
);

const parsed = parseRankTrackingEvidenceLines(
  `not json\n${JSON.stringify(fullGoogleEvidence[0])}\n`
);
assert.equal(parsed.length, 1, "parser should ignore non-JSON note lines around JSONL");

const incompleteAudit = auditRankTrackingEvidence(fullGoogleEvidence.slice(0, 49));
assert.ok(
  incompleteAudit.issues.some((issue) => /missing/i.test(issue) && /Google/i.test(issue)),
  "audit should flag missing priority queries for an observed engine"
);

const badCanonicalAudit = auditRankTrackingEvidence([
  {
    ...fullGoogleEvidence[1],
    observedAfterTheParksUrl: "https://aftertheparks.com/wrong-page",
  },
]);
assert.ok(
  badCanonicalAudit.issues.some((issue) => /wrong canonical/i.test(issue)),
  "audit should flag After the Parks rankings that point at the wrong canonical page"
);

const staleAudit = auditRankTrackingEvidence([
  {
    ...fullGoogleEvidence[1],
    checkedAt: "2026-01-01T00:00:00.000Z",
  },
]);
assert.ok(
  staleAudit.issues.some((issue) => /older than/i.test(issue)),
  "audit should flag stale rank evidence"
);

const unknownQueryAudit = auditRankTrackingEvidence([
  {
    ...fullGoogleEvidence[1],
    query: "random disney query",
  },
]);
assert.ok(
  unknownQueryAudit.issues.some((issue) => /unknown priority query/i.test(issue)),
  "audit should reject queries outside the stable 50-query set"
);

const competitorRows = fullGoogleEvidence.filter((row) =>
  row.query.toLowerCase().includes("magical resort guide") ||
  row.query.toLowerCase().includes("mama")
);
assert.ok(
  competitorRows.length >= 2,
  "rank evidence fixtures should preserve competitor-overlap coverage"
);

console.log("SEO rank tracking evidence tests passed.");
