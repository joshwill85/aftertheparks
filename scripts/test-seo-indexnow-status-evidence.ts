import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as indexNowStatusModule from "@/lib/seo/indexNowStatusEvidence";

const indexNowStatus = indexNowStatusModule as Record<string, unknown>;
const parseIndexNowStatusEvidenceLines = indexNowStatus.parseIndexNowStatusEvidenceLines as
  | undefined
  | ((text: string) => Array<Record<string, unknown>>);
const auditIndexNowStatusEvidence = indexNowStatus.auditIndexNowStatusEvidence as
  | undefined
  | ((records: Array<Record<string, unknown>>, options?: { now?: Date }) => {
      issues: string[];
      rows: Array<{
        path: string;
        submitted: boolean;
        accepted: boolean;
        processed: boolean;
        status: string;
        httpStatus: number;
      }>;
    });
const renderIndexNowStatusEvidenceReport = indexNowStatus.renderIndexNowStatusEvidenceReport as
  | undefined
  | ((audit: {
      issues: string[];
      rows: Array<{
        path: string;
        submitted: boolean;
        accepted: boolean;
        processed: boolean;
        status: string;
        httpStatus: number;
      }>;
    }) => string);
const PRIORITY_INDEXNOW_STATUS_PATHS = indexNowStatus.PRIORITY_INDEXNOW_STATUS_PATHS as
  | undefined
  | readonly string[];

assert.equal(
  typeof parseIndexNowStatusEvidenceLines,
  "function",
  "parseIndexNowStatusEvidenceLines helper should exist"
);
assert.equal(
  typeof auditIndexNowStatusEvidence,
  "function",
  "auditIndexNowStatusEvidence helper should exist"
);
assert.equal(
  typeof renderIndexNowStatusEvidenceReport,
  "function",
  "renderIndexNowStatusEvidenceReport helper should exist"
);
assert.ok(Array.isArray(PRIORITY_INDEXNOW_STATUS_PATHS));

if (
  parseIndexNowStatusEvidenceLines &&
  auditIndexNowStatusEvidence &&
  renderIndexNowStatusEvidenceReport &&
  PRIORITY_INDEXNOW_STATUS_PATHS
) {
  assert.equal(PRIORITY_INDEXNOW_STATUS_PATHS.length, 12, "IndexNow status audit should cover the launch priority URL set");
  for (const path of ["/", "/today", "/tonight", "/activities/movies-under-the-stars"]) {
    assert.ok(PRIORITY_INDEXNOW_STATUS_PATHS.includes(path), `IndexNow status audit should include ${path}`);
  }

  const completeEvidence = PRIORITY_INDEXNOW_STATUS_PATHS.map((path) => ({
    checkedAt: "2026-06-27T23:00:00Z",
    source: "Bing Webmaster Tools IndexNow",
    url: `https://aftertheparks.com${path === "/" ? "" : path}`,
    submittedAt: "2026-06-27T20:00:00Z",
    submitted: true,
    accepted: true,
    processed: true,
    status: "processed",
    httpStatus: 200,
    lastCrawled: "2026-06-27T22:00:00Z",
    error: "",
    retryAfter: "",
  }));

  const parsed = parseIndexNowStatusEvidenceLines(
    [JSON.stringify(completeEvidence[0]), "", "Bing dashboard note"].join("\n")
  );
  assert.equal(parsed.length, 1, "parser should ignore blank and non-JSON dashboard notes");

  const completeAudit = auditIndexNowStatusEvidence(completeEvidence, {
    now: new Date("2026-06-28T12:00:00Z"),
  });
  assert.deepEqual(
    completeAudit.issues,
    [],
    `complete IndexNow status evidence should pass: ${completeAudit.issues.join("; ")}`
  );

  const missingPathAudit = auditIndexNowStatusEvidence(completeEvidence.slice(0, -1), {
    now: new Date("2026-06-28T12:00:00Z"),
  });
  assert.ok(
    missingPathAudit.issues.some((issue) => /missing/i.test(issue) && /IndexNow/.test(issue)),
    "audit should require every priority IndexNow URL"
  );

  const rejectedAudit = auditIndexNowStatusEvidence(
    completeEvidence.map((record) =>
      record.url.endsWith("/today")
        ? {
            ...record,
            accepted: false,
            processed: false,
            status: "rejected",
            httpStatus: 429,
            error: "rate limited",
            retryAfter: "2026-06-28T01:00:00Z",
          }
        : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    rejectedAudit.issues.some((issue) => /today/.test(issue) && /accepted|processed|429/i.test(issue)),
    "audit should flag rejected or unprocessed IndexNow status rows"
  );

  const wrongHostAudit = auditIndexNowStatusEvidence(
    completeEvidence.map((record) =>
      record.url.endsWith("/tonight") ? { ...record, url: "https://example.com/tonight" } : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    wrongHostAudit.issues.some((issue) => /aftertheparks\.com|unsupported/i.test(issue)),
    "audit should reject IndexNow status rows for another host"
  );

  const staleAudit = auditIndexNowStatusEvidence(
    completeEvidence.map((record) => ({ ...record, checkedAt: "2026-06-01T12:00:00Z" })),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    staleAudit.issues.some((issue) => /older than/i.test(issue)),
    "audit should reject stale IndexNow status evidence"
  );

  const report = renderIndexNowStatusEvidenceReport(rejectedAudit);
  assert.match(report, /# IndexNow Status Evidence Audit/);
  assert.match(report, /\/today/);
  assert.match(report, /429/);
  assert.doesNotMatch(report, /authorization|cookie|secret|token/i);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.ok(packageJson.scripts["seo:indexnow-status"], "package should expose seo:indexnow-status");
assert.match(
  packageJson.scripts["test:seo"],
  /test-seo-indexnow-status-evidence/,
  "SEO suite should include IndexNow status evidence tests"
);

const runbook = readFileSync("docs/seo-operations-runbook.md", "utf8");
for (const expected of [
  "npm run seo:indexnow-status",
  "indexnow-status-evidence.jsonl",
  "Bing Webmaster Tools IndexNow",
  "accepted",
  "processed",
]) {
  assert.match(runbook, new RegExp(expected, "i"), `runbook should mention ${expected}`);
}

const launchEvidence = readFileSync("docs/seo-launch-evidence-2026-06-27.md", "utf8");
assert.match(
  launchEvidence,
  /seo:indexnow-status/,
  "launch evidence should name the IndexNow status evidence audit command"
);

console.log("SEO IndexNow status evidence tests passed.");
