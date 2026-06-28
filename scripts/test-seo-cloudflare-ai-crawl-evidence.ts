import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as cloudflareEvidenceModule from "@/lib/seo/cloudflareAiCrawlEvidence";

const cloudflareEvidence = cloudflareEvidenceModule as Record<string, unknown>;
const parseCloudflareAiCrawlEvidenceLines = cloudflareEvidence.parseCloudflareAiCrawlEvidenceLines as
  | undefined
  | ((text: string) => Array<Record<string, unknown>>);
const auditCloudflareAiCrawlEvidence = cloudflareEvidence.auditCloudflareAiCrawlEvidence as
  | undefined
  | ((records: Array<Record<string, unknown>>) => {
      issues: string[];
      rows: Array<{
        crawler: string;
        source: string;
        path: string;
        status: number;
        action: string;
        allowed: boolean;
        challenged: boolean;
      }>;
    });
const renderCloudflareAiCrawlEvidenceReport =
  cloudflareEvidence.renderCloudflareAiCrawlEvidenceReport as
    | undefined
    | ((audit: {
        issues: string[];
        rows: Array<{
          crawler: string;
          source: string;
          path: string;
          status: number;
          action: string;
          allowed: boolean;
          challenged: boolean;
        }>;
      }) => string);
const REQUIRED_CLOUDFLARE_AI_CRAWLERS = cloudflareEvidence.REQUIRED_CLOUDFLARE_AI_CRAWLERS as
  | undefined
  | readonly string[];

assert.equal(
  typeof parseCloudflareAiCrawlEvidenceLines,
  "function",
  "parseCloudflareAiCrawlEvidenceLines helper should exist"
);
assert.equal(
  typeof auditCloudflareAiCrawlEvidence,
  "function",
  "auditCloudflareAiCrawlEvidence helper should exist"
);
assert.equal(
  typeof renderCloudflareAiCrawlEvidenceReport,
  "function",
  "renderCloudflareAiCrawlEvidenceReport helper should exist"
);
assert.ok(
  Array.isArray(REQUIRED_CLOUDFLARE_AI_CRAWLERS),
  "required Cloudflare crawler list should exist"
);

if (
  parseCloudflareAiCrawlEvidenceLines &&
  auditCloudflareAiCrawlEvidence &&
  renderCloudflareAiCrawlEvidenceReport &&
  REQUIRED_CLOUDFLARE_AI_CRAWLERS
) {
  for (const crawler of [
    "OAI-SearchBot",
    "ChatGPT-User",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Applebot",
    "Bingbot",
    "Googlebot",
  ]) {
    assert.ok(
      REQUIRED_CLOUDFLARE_AI_CRAWLERS.includes(crawler),
      `Cloudflare evidence should require ${crawler}`
    );
  }

  const completeEvidence = REQUIRED_CLOUDFLARE_AI_CRAWLERS.map((crawler) => ({
    checkedAt: "2026-06-27T18:00:00Z",
    source: "Cloudflare AI Crawl Control",
    crawler,
    userAgent: `${crawler}/1.0`,
    path: "/guides/things-to-do-without-park-ticket",
    status: 200,
    action: "allowed",
    contentType: "text/html; charset=utf-8",
  }));

  const parsed = parseCloudflareAiCrawlEvidenceLines(
    [JSON.stringify(completeEvidence[0]), "dashboard note", ""].join("\n")
  );
  assert.equal(parsed.length, 1, "parser should ignore blank and non-JSON dashboard notes");

  const completeAudit = auditCloudflareAiCrawlEvidence(completeEvidence);
  assert.deepEqual(
    completeAudit.issues,
    [],
    `complete Cloudflare crawler evidence should pass: ${completeAudit.issues.join("; ")}`
  );
  assert.equal(completeAudit.rows.length, REQUIRED_CLOUDFLARE_AI_CRAWLERS.length);
  assert.ok(completeAudit.rows.every((row) => row.allowed && !row.challenged));

  const challengedAudit = auditCloudflareAiCrawlEvidence([
    ...completeEvidence.filter((entry) => entry.crawler !== "OAI-SearchBot"),
    {
      checkedAt: "2026-06-27T18:01:00Z",
      source: "Cloudflare WAF",
      crawler: "OAI-SearchBot",
      userAgent: "OAI-SearchBot/1.0",
      path: "/llms-full.txt",
      status: 403,
      action: "managed_challenge",
      contentType: "text/html",
    },
  ]);
  assert.ok(
    challengedAudit.issues.some(
      (issue) => /OAI-SearchBot/.test(issue) && /challenge|block|non-200/i.test(issue)
    ),
    "audit should flag Cloudflare challenge, block, or non-200 evidence for search/referral crawlers"
  );

  const missingAudit = auditCloudflareAiCrawlEvidence(
    completeEvidence.filter((entry) => entry.crawler !== "PerplexityBot")
  );
  assert.ok(
    missingAudit.issues.some((issue) => /PerplexityBot/.test(issue) && /missing/i.test(issue)),
    "audit should require evidence for every required Cloudflare crawler"
  );

  const report = renderCloudflareAiCrawlEvidenceReport(challengedAudit);
  assert.match(report, /# Cloudflare AI Crawl Control Evidence Audit/);
  assert.match(report, /OAI-SearchBot/);
  assert.match(report, /Issues/);
  assert.doesNotMatch(report, /cfat_|api[_-]?token|authorization/i);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.ok(
  packageJson.scripts["seo:cloudflare-ai-crawl"],
  "package should expose seo:cloudflare-ai-crawl"
);
assert.match(
  packageJson.scripts["test:seo"],
  /test-seo-cloudflare-ai-crawl-evidence/,
  "SEO test suite should include Cloudflare AI Crawl Control evidence tests"
);

const runbook = readFileSync("docs/seo-operations-runbook.md", "utf8");
for (const expected of [
  "npm run seo:cloudflare-ai-crawl",
  "cloudflare-ai-crawl-evidence.jsonl",
  "Cloudflare WAF",
  "Cloudflare Security Events",
]) {
  assert.match(runbook, new RegExp(expected, "i"), `runbook should mention ${expected}`);
}

const launchEvidence = readFileSync("docs/seo-launch-evidence-2026-06-27.md", "utf8");
assert.match(
  launchEvidence,
  /seo:cloudflare-ai-crawl/,
  "launch evidence should name the Cloudflare evidence audit command"
);

console.log("SEO Cloudflare AI Crawl Control evidence tests passed.");
