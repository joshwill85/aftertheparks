import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { PRIORITY_RANK_TRACKING_QUERIES } from "@/lib/seo/measurement";

import * as queryVisibilityModule from "@/lib/seo/queryVisibilityEvidence";

const queryVisibility = queryVisibilityModule as Record<string, unknown>;
const parseQueryVisibilityEvidenceLines = queryVisibility.parseQueryVisibilityEvidenceLines as
  | undefined
  | ((text: string) => Array<Record<string, unknown>>);
const auditQueryVisibilityEvidence = queryVisibility.auditQueryVisibilityEvidence as
  | undefined
  | ((records: Array<Record<string, unknown>>, options?: { now?: Date }) => {
      issues: string[];
      rows: Array<{
        engine: string;
        query: string;
        canonicalPath: string;
        impressions: number;
        clicks: number;
        ctr: number;
        averagePosition: number;
      }>;
      summary: {
        engines: string[];
        totalQueries: number;
        totalImpressions: number;
        totalClicks: number;
        lowCtrOpportunities: number;
      };
    });
const renderQueryVisibilityEvidenceReport = queryVisibility.renderQueryVisibilityEvidenceReport as
  | undefined
  | ((audit: {
      issues: string[];
      rows: Array<{
        engine: string;
        query: string;
        canonicalPath: string;
        impressions: number;
        clicks: number;
        ctr: number;
        averagePosition: number;
      }>;
      summary: {
        engines: string[];
        totalQueries: number;
        totalImpressions: number;
        totalClicks: number;
        lowCtrOpportunities: number;
      };
    }) => string);
const REQUIRED_QUERY_VISIBILITY_ENGINES = queryVisibility.REQUIRED_QUERY_VISIBILITY_ENGINES as
  | undefined
  | readonly string[];

assert.equal(
  typeof parseQueryVisibilityEvidenceLines,
  "function",
  "parseQueryVisibilityEvidenceLines helper should exist"
);
assert.equal(
  typeof auditQueryVisibilityEvidence,
  "function",
  "auditQueryVisibilityEvidence helper should exist"
);
assert.equal(
  typeof renderQueryVisibilityEvidenceReport,
  "function",
  "renderQueryVisibilityEvidenceReport helper should exist"
);
assert.ok(Array.isArray(REQUIRED_QUERY_VISIBILITY_ENGINES));

if (
  parseQueryVisibilityEvidenceLines &&
  auditQueryVisibilityEvidence &&
  renderQueryVisibilityEvidenceReport &&
  REQUIRED_QUERY_VISIBILITY_ENGINES
) {
  for (const engine of ["Google Search Console", "Bing Webmaster Tools"]) {
    assert.ok(REQUIRED_QUERY_VISIBILITY_ENGINES.includes(engine), `query visibility should require ${engine}`);
  }

  const checkedAt = "2026-06-27T23:00:00Z";
  const fullEvidence = REQUIRED_QUERY_VISIBILITY_ENGINES.flatMap((engine) =>
    PRIORITY_RANK_TRACKING_QUERIES.map((priority, index) => ({
      checkedAt,
      engine,
      query: priority.query,
      canonicalPath: priority.canonicalPath,
      pageType: priority.pageType,
      intent: priority.intent,
      impressions: 40 + index,
      clicks: 4,
      ctr: 4 / (40 + index),
      averagePosition: 6 + (index % 8),
      topPageUrl: `https://aftertheparks.com${priority.canonicalPath}`,
      country: "US",
      device: "all",
      searchType: "web",
      dateRangeDays: 28,
    }))
  );

  const parsed = parseQueryVisibilityEvidenceLines(
    [JSON.stringify(fullEvidence[0]), "", "export pasted from dashboard"].join("\n")
  );
  assert.equal(parsed.length, 1, "parser should ignore blank and non-JSON dashboard notes");

  const completeAudit = auditQueryVisibilityEvidence(fullEvidence, {
    now: new Date("2026-06-28T12:00:00Z"),
  });
  assert.deepEqual(
    completeAudit.issues,
    [],
    `complete query visibility evidence should pass: ${completeAudit.issues.join("; ")}`
  );
  assert.equal(completeAudit.summary.engines.join(","), "Bing Webmaster Tools,Google Search Console");
  assert.equal(completeAudit.summary.totalQueries, 50);
  assert.ok(completeAudit.summary.totalImpressions > 0);
  assert.ok(completeAudit.summary.totalClicks > 0);

  const missingBingAudit = auditQueryVisibilityEvidence(
    fullEvidence.filter((record) => record.engine !== "Bing Webmaster Tools"),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    missingBingAudit.issues.some((issue) => /Bing Webmaster Tools/.test(issue) && /missing/i.test(issue)),
    "audit should require Bing Webmaster Tools query visibility evidence"
  );

  const missingQueryAudit = auditQueryVisibilityEvidence(fullEvidence.slice(0, -1), {
    now: new Date("2026-06-28T12:00:00Z"),
  });
  assert.ok(
    missingQueryAudit.issues.some((issue) => /missing priority query/i.test(issue)),
    "audit should require every priority query per observed engine"
  );

  const lowCtrAudit = auditQueryVisibilityEvidence(
    fullEvidence.map((record) =>
      record.engine === "Google Search Console" &&
      record.query === "Disney World resort activity calendars"
        ? { ...record, impressions: 500, clicks: 1, ctr: 0.002, averagePosition: 4.2 }
        : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    lowCtrAudit.issues.some((issue) => /low CTR opportunity/i.test(issue)),
    "audit should flag visible priority queries with low CTR and strong average position"
  );
  assert.equal(lowCtrAudit.summary.lowCtrOpportunities, 1);

  const wrongCanonicalAudit = auditQueryVisibilityEvidence(
    fullEvidence.map((record) =>
      record.engine === "Bing Webmaster Tools" &&
      record.query === "Disney World resort activity calendars"
        ? { ...record, topPageUrl: "https://aftertheparks.com/wrong-page" }
        : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    wrongCanonicalAudit.issues.some((issue) => /wrong canonical/i.test(issue)),
    "audit should flag query visibility rows whose top page is not the intended canonical page"
  );

  const metricAudit = auditQueryVisibilityEvidence(
    fullEvidence.map((record) =>
      record.engine === "Google Search Console" &&
      record.query === "Disney resort activities today"
        ? { ...record, impressions: 12, clicks: 30, ctr: 1.5, averagePosition: 0 }
        : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    metricAudit.issues.some((issue) => /clicks cannot exceed impressions|ctr must be between 0 and 1|averagePosition/i.test(issue)),
    "audit should reject impossible query visibility metrics"
  );

  const staleAudit = auditQueryVisibilityEvidence(
    fullEvidence.map((record) => ({ ...record, checkedAt: "2026-06-01T12:00:00Z" })),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    staleAudit.issues.some((issue) => /older than/i.test(issue)),
    "audit should reject stale query visibility evidence"
  );

  const report = renderQueryVisibilityEvidenceReport(lowCtrAudit);
  assert.match(report, /# Query Visibility Evidence Audit/);
  assert.match(report, /Google Search Console/);
  assert.match(report, /Low CTR opportunities: 1/);
  assert.doesNotMatch(report, /authorization|cookie|secret|token/i);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.ok(packageJson.scripts["seo:query-visibility"], "package should expose seo:query-visibility");
assert.match(
  packageJson.scripts["test:seo"],
  /test-seo-query-visibility-evidence/,
  "SEO suite should include query visibility evidence tests"
);

const runbook = readFileSync("docs/seo-operations-runbook.md", "utf8");
for (const expected of [
  "npm run seo:query-visibility",
  "query-visibility-evidence.jsonl",
  "impressions",
  "averagePosition",
  "low CTR",
]) {
  assert.match(runbook, new RegExp(expected, "i"), `runbook should mention ${expected}`);
}

const launchEvidence = readFileSync("docs/seo-launch-evidence-2026-06-27.md", "utf8");
assert.match(
  launchEvidence,
  /seo:query-visibility/,
  "launch evidence should name the query visibility evidence audit command"
);

console.log("SEO query visibility evidence tests passed.");
