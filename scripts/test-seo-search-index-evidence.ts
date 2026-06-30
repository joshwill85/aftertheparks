import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as searchIndexModule from "@/lib/seo/searchIndexEvidence";

const searchIndex = searchIndexModule as Record<string, unknown>;
const parseSearchIndexEvidenceLines = searchIndex.parseSearchIndexEvidenceLines as
  | undefined
  | ((text: string) => Array<Record<string, unknown>>);
const auditSearchIndexEvidence = searchIndex.auditSearchIndexEvidence as
  | undefined
  | ((records: Array<Record<string, unknown>>, options?: { now?: Date }) => {
      issues: string[];
      rows: Array<{
        engine: string;
        path: string;
        indexed: boolean;
        sitemapSubmitted: boolean;
        crawlAllowed: boolean;
        fetchSuccessful: boolean;
      }>;
    });
const renderSearchIndexEvidenceReport = searchIndex.renderSearchIndexEvidenceReport as
  | undefined
  | ((audit: {
      issues: string[];
      rows: Array<{
        engine: string;
        path: string;
        indexed: boolean;
        sitemapSubmitted: boolean;
        crawlAllowed: boolean;
        fetchSuccessful: boolean;
      }>;
    }) => string);
const REQUIRED_SEARCH_INDEX_ENGINES = searchIndex.REQUIRED_SEARCH_INDEX_ENGINES as
  | undefined
  | readonly string[];
const PRIORITY_SEARCH_INDEX_PATHS = searchIndex.PRIORITY_SEARCH_INDEX_PATHS as
  | undefined
  | readonly string[];

assert.equal(
  typeof parseSearchIndexEvidenceLines,
  "function",
  "parseSearchIndexEvidenceLines helper should exist"
);
assert.equal(
  typeof auditSearchIndexEvidence,
  "function",
  "auditSearchIndexEvidence helper should exist"
);
assert.equal(
  typeof renderSearchIndexEvidenceReport,
  "function",
  "renderSearchIndexEvidenceReport helper should exist"
);
assert.ok(Array.isArray(REQUIRED_SEARCH_INDEX_ENGINES));
assert.ok(Array.isArray(PRIORITY_SEARCH_INDEX_PATHS));

if (
  parseSearchIndexEvidenceLines &&
  auditSearchIndexEvidence &&
  renderSearchIndexEvidenceReport &&
  REQUIRED_SEARCH_INDEX_ENGINES &&
  PRIORITY_SEARCH_INDEX_PATHS
) {
  for (const engine of ["Google Search Console", "Bing Webmaster Tools"]) {
    assert.ok(REQUIRED_SEARCH_INDEX_ENGINES.includes(engine), `evidence should require ${engine}`);
  }
  for (const path of [
    "/",
    "/today",
    "/tonight",
    "/disney-world-resort-activity-calendars",
    "/resorts?no_ticket_friendly=true",
    "/activities/movies-under-the-stars",
    "/resorts/polynesian-village-resort",
  ]) {
    assert.ok(PRIORITY_SEARCH_INDEX_PATHS.includes(path), `priority index set should include ${path}`);
  }

  const completeEvidence = REQUIRED_SEARCH_INDEX_ENGINES.flatMap((engine) =>
    PRIORITY_SEARCH_INDEX_PATHS.map((path) => ({
      checkedAt: "2026-06-27T21:00:00Z",
      engine,
      url: `https://aftertheparks.com${path}`,
      path,
      sitemapSubmitted: true,
      indexed: true,
      crawlAllowed: true,
      fetchSuccessful: true,
      coverageState: engine === "Google Search Console" ? "Submitted and indexed" : "Indexed",
      robotsState: "ALLOWED",
      indexingState: "INDEXING_ALLOWED",
      pageFetchState: "SUCCESSFUL",
    }))
  );

  const parsed = parseSearchIndexEvidenceLines(
    [JSON.stringify(completeEvidence[0]), "copied dashboard note", ""].join("\n")
  );
  assert.equal(parsed.length, 1, "parser should ignore blank and non-JSON copied notes");

  const completeAudit = auditSearchIndexEvidence(completeEvidence, {
    now: new Date("2026-06-28T12:00:00Z"),
  });
  assert.deepEqual(
    completeAudit.issues,
    [],
    `complete search index evidence should pass: ${completeAudit.issues.join("; ")}`
  );

  const missingAudit = auditSearchIndexEvidence(
    completeEvidence.filter(
      (record) =>
        !(
          record.engine === "Bing Webmaster Tools" &&
          record.path === "/resorts?no_ticket_friendly=true"
        )
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    missingAudit.issues.some(
      (issue) => /Bing Webmaster Tools/.test(issue) && /\/resorts\?no_ticket_friendly=true/.test(issue)
    ),
    "audit should require every priority path for each search engine"
  );

  const blockedAudit = auditSearchIndexEvidence(
    completeEvidence.map((record) =>
      record.engine === "Google Search Console" && record.path === "/tonight"
        ? {
            ...record,
            indexed: false,
            crawlAllowed: false,
            fetchSuccessful: false,
            coverageState: "Blocked by robots.txt",
            robotsState: "BLOCKED",
            pageFetchState: "FAILED",
          }
        : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    blockedAudit.issues.some(
      (issue) => /Google Search Console/.test(issue) && /\/tonight/.test(issue) && /crawl|fetch|indexed/i.test(issue)
    ),
    "audit should flag blocked, unfetched, or unindexed priority URLs"
  );

  const staleAudit = auditSearchIndexEvidence(
    completeEvidence.map((record) => ({ ...record, checkedAt: "2026-06-01T12:00:00Z" })),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    staleAudit.issues.some((issue) => /older than/i.test(issue)),
    "audit should reject stale index evidence"
  );

  const report = renderSearchIndexEvidenceReport(blockedAudit);
  assert.match(report, /# Search Index Evidence Audit/);
  assert.match(report, /Google Search Console/);
  assert.match(report, /\/tonight/);
  assert.doesNotMatch(report, /authorization|cookie|secret|token/i);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.ok(packageJson.scripts["seo:search-index"], "package should expose seo:search-index");
assert.match(
  packageJson.scripts["test:seo"],
  /test-seo-search-index-evidence/,
  "SEO suite should include search index evidence tests"
);

const runbook = readFileSync("docs/seo-operations-runbook.md", "utf8");
for (const expected of [
  "npm run seo:search-index",
  "search-index-evidence.jsonl",
  "Google Search Console",
  "Bing Webmaster Tools",
  "sitemapSubmitted",
]) {
  assert.match(runbook, new RegExp(expected, "i"), `runbook should mention ${expected}`);
}

const launchEvidence = readFileSync("docs/seo-launch-evidence-2026-06-27.md", "utf8");
assert.match(
  launchEvidence,
  /seo:search-index/,
  "launch evidence should name the search index evidence audit command"
);

console.log("SEO search index evidence tests passed.");
