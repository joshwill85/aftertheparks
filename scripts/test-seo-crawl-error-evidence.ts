import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as crawlErrorModule from "@/lib/seo/crawlErrorEvidence";

const crawlErrors = crawlErrorModule as Record<string, unknown>;
const parseCrawlErrorEvidenceLines = crawlErrors.parseCrawlErrorEvidenceLines as
  | undefined
  | ((text: string) => Array<Record<string, unknown>>);
const auditCrawlErrorEvidence = crawlErrors.auditCrawlErrorEvidence as
  | undefined
  | ((records: Array<Record<string, unknown>>, options?: { now?: Date }) => {
      issues: string[];
      rows: Array<{
        engine: string;
        reportType: string;
        openErrorCount: number;
        priorityRouteErrorCount: number;
        affectedUrls: number;
        status: string;
      }>;
    });
const renderCrawlErrorEvidenceReport = crawlErrors.renderCrawlErrorEvidenceReport as
  | undefined
  | ((audit: {
      issues: string[];
      rows: Array<{
        engine: string;
        reportType: string;
        openErrorCount: number;
        priorityRouteErrorCount: number;
        affectedUrls: number;
        status: string;
      }>;
    }) => string);
const REQUIRED_CRAWL_ERROR_ENGINES = crawlErrors.REQUIRED_CRAWL_ERROR_ENGINES as
  | undefined
  | readonly string[];

assert.equal(
  typeof parseCrawlErrorEvidenceLines,
  "function",
  "parseCrawlErrorEvidenceLines helper should exist"
);
assert.equal(
  typeof auditCrawlErrorEvidence,
  "function",
  "auditCrawlErrorEvidence helper should exist"
);
assert.equal(
  typeof renderCrawlErrorEvidenceReport,
  "function",
  "renderCrawlErrorEvidenceReport helper should exist"
);
assert.ok(Array.isArray(REQUIRED_CRAWL_ERROR_ENGINES));

if (
  parseCrawlErrorEvidenceLines &&
  auditCrawlErrorEvidence &&
  renderCrawlErrorEvidenceReport &&
  REQUIRED_CRAWL_ERROR_ENGINES
) {
  for (const engine of ["Google Search Console", "Bing Webmaster Tools"]) {
    assert.ok(REQUIRED_CRAWL_ERROR_ENGINES.includes(engine), `crawl error evidence should require ${engine}`);
  }

  const completeEvidence = REQUIRED_CRAWL_ERROR_ENGINES.map((engine) => ({
    checkedAt: "2026-06-27T23:00:00Z",
    engine,
    reportType: "crawl-errors",
    siteUrl: "https://aftertheparks.com",
    openErrorCount: 0,
    priorityRouteErrorCount: 0,
    affectedUrls: 0,
    errorCategory: "none",
    status: "no errors",
    validationState: "passed",
    sampleUrls: [],
    lastDetected: "",
    recommendedAction: "Continue weekly crawl-error monitoring.",
  }));

  const parsed = parseCrawlErrorEvidenceLines(
    [JSON.stringify(completeEvidence[0]), "", "dashboard heading"].join("\n")
  );
  assert.equal(parsed.length, 1, "parser should ignore blank and non-JSON dashboard notes");

  const completeAudit = auditCrawlErrorEvidence(completeEvidence, {
    now: new Date("2026-06-28T12:00:00Z"),
  });
  assert.deepEqual(
    completeAudit.issues,
    [],
    `complete crawl error evidence should pass: ${completeAudit.issues.join("; ")}`
  );

  const missingBingAudit = auditCrawlErrorEvidence(
    completeEvidence.filter((record) => record.engine !== "Bing Webmaster Tools"),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    missingBingAudit.issues.some((issue) => /Bing Webmaster Tools/.test(issue) && /missing/i.test(issue)),
    "audit should require Bing Webmaster Tools crawl-error evidence"
  );

  const serverErrorAudit = auditCrawlErrorEvidence(
    completeEvidence.map((record) =>
      record.engine === "Google Search Console"
        ? {
            ...record,
            openErrorCount: 3,
            affectedUrls: 3,
            errorCategory: "server_error",
            status: "open",
            validationState: "not started",
            sampleUrls: ["https://aftertheparks.com/today", "https://aftertheparks.com/tonight"],
            lastDetected: "2026-06-27T22:00:00Z",
            recommendedAction: "Investigate 5xx responses on current-intent pages.",
          }
        : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    serverErrorAudit.issues.some(
      (issue) => /Google Search Console/.test(issue) && /server_error|open crawl/i.test(issue)
    ),
    "audit should flag open server-side crawl errors"
  );

  const priorityRouteAudit = auditCrawlErrorEvidence(
    completeEvidence.map((record) =>
      record.engine === "Bing Webmaster Tools"
        ? {
            ...record,
            priorityRouteErrorCount: 1,
            affectedUrls: 1,
            errorCategory: "blocked_by_robots",
            status: "open",
            validationState: "failed",
            sampleUrls: ["https://aftertheparks.com/guides/things-to-do-without-park-ticket"],
            lastDetected: "2026-06-27T21:00:00Z",
            recommendedAction: "Confirm robots and noindex policy for no-ticket guide.",
          }
        : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    priorityRouteAudit.issues.some((issue) => /priority-route/i.test(issue) && /Bing Webmaster Tools/.test(issue)),
    "audit should flag crawl errors affecting priority SEO routes"
  );

  const staleAudit = auditCrawlErrorEvidence(
    completeEvidence.map((record) => ({ ...record, checkedAt: "2026-06-01T12:00:00Z" })),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    staleAudit.issues.some((issue) => /older than/i.test(issue)),
    "audit should reject stale crawl-error evidence"
  );

  const report = renderCrawlErrorEvidenceReport(serverErrorAudit);
  assert.match(report, /# Crawl Error Evidence Audit/);
  assert.match(report, /Google Search Console/);
  assert.match(report, /server_error/);
  assert.doesNotMatch(report, /authorization|cookie|secret|token/i);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.ok(packageJson.scripts["seo:crawl-errors"], "package should expose seo:crawl-errors");
assert.match(
  packageJson.scripts["test:seo"],
  /test-seo-crawl-error-evidence/,
  "SEO suite should include crawl-error evidence tests"
);

const runbook = readFileSync("docs/seo-operations-runbook.md", "utf8");
for (const expected of [
  "npm run seo:crawl-errors",
  "crawl-error-evidence.jsonl",
  "openErrorCount",
  "priorityRouteErrorCount",
  "sampleUrls",
]) {
  assert.match(runbook, new RegExp(expected, "i"), `runbook should mention ${expected}`);
}

const launchEvidence = readFileSync("docs/seo-launch-evidence-2026-06-27.md", "utf8");
assert.match(
  launchEvidence,
  /seo:crawl-errors/,
  "launch evidence should name the crawl-error evidence audit command"
);

console.log("SEO crawl-error evidence tests passed.");
