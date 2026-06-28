import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as sitemapModule from "@/lib/seo/sitemapStatusEvidence";

const sitemapEvidence = sitemapModule as Record<string, unknown>;
const parseSitemapStatusEvidenceLines = sitemapEvidence.parseSitemapStatusEvidenceLines as
  | undefined
  | ((text: string) => Array<Record<string, unknown>>);
const auditSitemapStatusEvidence = sitemapEvidence.auditSitemapStatusEvidence as
  | undefined
  | ((records: Array<Record<string, unknown>>, options?: { now?: Date }) => {
      issues: string[];
      rows: Array<{
        engine: string;
        sitemapUrl: string;
        submitted: boolean;
        processed: boolean;
        discoveredUrls: number;
        errors: number;
        warnings: number;
      }>;
    });
const renderSitemapStatusEvidenceReport = sitemapEvidence.renderSitemapStatusEvidenceReport as
  | undefined
  | ((audit: {
      issues: string[];
      rows: Array<{
        engine: string;
        sitemapUrl: string;
        submitted: boolean;
        processed: boolean;
        discoveredUrls: number;
        errors: number;
        warnings: number;
      }>;
    }) => string);
const REQUIRED_SITEMAP_STATUS_ENGINES = sitemapEvidence.REQUIRED_SITEMAP_STATUS_ENGINES as
  | undefined
  | readonly string[];

assert.equal(
  typeof parseSitemapStatusEvidenceLines,
  "function",
  "parseSitemapStatusEvidenceLines helper should exist"
);
assert.equal(
  typeof auditSitemapStatusEvidence,
  "function",
  "auditSitemapStatusEvidence helper should exist"
);
assert.equal(
  typeof renderSitemapStatusEvidenceReport,
  "function",
  "renderSitemapStatusEvidenceReport helper should exist"
);
assert.ok(Array.isArray(REQUIRED_SITEMAP_STATUS_ENGINES));

if (
  parseSitemapStatusEvidenceLines &&
  auditSitemapStatusEvidence &&
  renderSitemapStatusEvidenceReport &&
  REQUIRED_SITEMAP_STATUS_ENGINES
) {
  for (const engine of ["Google Search Console", "Bing Webmaster Tools"]) {
    assert.ok(REQUIRED_SITEMAP_STATUS_ENGINES.includes(engine), `sitemap evidence should require ${engine}`);
  }

  const completeEvidence = REQUIRED_SITEMAP_STATUS_ENGINES.map((engine) => ({
    checkedAt: "2026-06-27T23:00:00Z",
    engine,
    sitemapUrl: "https://aftertheparks.com/sitemap.xml",
    submitted: true,
    processed: true,
    status: "success",
    discoveredUrls: 66,
    submittedUrls: 66,
    indexedUrls: 60,
    errors: 0,
    warnings: 0,
    lastSubmitted: "2026-06-27T19:00:00Z",
    lastDownloaded: "2026-06-27T22:00:00Z",
  }));

  const parsed = parseSitemapStatusEvidenceLines(
    [JSON.stringify(completeEvidence[0]), "", "dashboard note"].join("\n")
  );
  assert.equal(parsed.length, 1, "parser should ignore blank and non-JSON dashboard notes");

  const completeAudit = auditSitemapStatusEvidence(completeEvidence, {
    now: new Date("2026-06-28T12:00:00Z"),
  });
  assert.deepEqual(
    completeAudit.issues,
    [],
    `complete sitemap status evidence should pass: ${completeAudit.issues.join("; ")}`
  );

  const missingBingAudit = auditSitemapStatusEvidence(
    completeEvidence.filter((record) => record.engine !== "Bing Webmaster Tools"),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    missingBingAudit.issues.some((issue) => /Bing Webmaster Tools/.test(issue) && /missing/i.test(issue)),
    "audit should require Bing Webmaster Tools sitemap status evidence"
  );

  const errorAudit = auditSitemapStatusEvidence(
    completeEvidence.map((record) =>
      record.engine === "Google Search Console"
        ? { ...record, status: "has errors", errors: 2, processed: false }
        : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    errorAudit.issues.some(
      (issue) => /Google Search Console/.test(issue) && /error|processed/i.test(issue)
    ),
    "audit should flag sitemap processing errors"
  );

  const undercountAudit = auditSitemapStatusEvidence(
    completeEvidence.map((record) =>
      record.engine === "Bing Webmaster Tools" ? { ...record, discoveredUrls: 12 } : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    undercountAudit.issues.some((issue) => /discoveredUrls/.test(issue) && /60/.test(issue)),
    "audit should flag sitemap evidence with too few discovered URLs"
  );

  const staleAudit = auditSitemapStatusEvidence(
    completeEvidence.map((record) => ({ ...record, checkedAt: "2026-06-01T12:00:00Z" })),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    staleAudit.issues.some((issue) => /older than/i.test(issue)),
    "audit should reject stale sitemap status evidence"
  );

  const report = renderSitemapStatusEvidenceReport(errorAudit);
  assert.match(report, /# Sitemap Status Evidence Audit/);
  assert.match(report, /Google Search Console/);
  assert.match(report, /sitemap\.xml/);
  assert.doesNotMatch(report, /authorization|cookie|secret|token/i);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.ok(packageJson.scripts["seo:sitemap-status"], "package should expose seo:sitemap-status");
assert.match(
  packageJson.scripts["test:seo"],
  /test-seo-sitemap-status-evidence/,
  "SEO suite should include sitemap status evidence tests"
);

const runbook = readFileSync("docs/seo-operations-runbook.md", "utf8");
for (const expected of [
  "npm run seo:sitemap-status",
  "sitemap-status-evidence.jsonl",
  "discoveredUrls",
  "lastDownloaded",
]) {
  assert.match(runbook, new RegExp(expected, "i"), `runbook should mention ${expected}`);
}

const launchEvidence = readFileSync("docs/seo-launch-evidence-2026-06-27.md", "utf8");
assert.match(
  launchEvidence,
  /seo:sitemap-status/,
  "launch evidence should name the sitemap status evidence audit command"
);

console.log("SEO sitemap status evidence tests passed.");
