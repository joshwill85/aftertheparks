import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as serverLogsModule from "@/lib/seo/serverLogAudit";

const serverLogs = serverLogsModule as Record<string, unknown>;
const classifySeoCrawler = serverLogs.classifySeoCrawler as undefined | ((userAgent: string) => string | undefined);
const auditSeoServerLogs = serverLogs.auditSeoServerLogs as
  | undefined
  | ((entries: Array<Record<string, unknown>>, options?: { maxLatencyMs?: number }) => {
      issues: string[];
      rows: Array<{
        crawler: string;
        hits: number;
        non200: number;
        slow: number;
        maxLatencyMs: number;
        routes: string[];
      }>;
    });
const parseSeoServerLogLines = serverLogs.parseSeoServerLogLines as
  | undefined
  | ((text: string) => Array<Record<string, unknown>>);
const renderSeoServerLogAuditReport = serverLogs.renderSeoServerLogAuditReport as
  | undefined
  | ((audit: {
      issues: string[];
      rows: Array<{
        crawler: string;
        hits: number;
        non200: number;
        slow: number;
        maxLatencyMs: number;
        routes: string[];
      }>;
    }) => string);

assert.equal(typeof classifySeoCrawler, "function", "classifySeoCrawler helper should exist");
assert.equal(typeof auditSeoServerLogs, "function", "auditSeoServerLogs helper should exist");
assert.equal(typeof parseSeoServerLogLines, "function", "parseSeoServerLogLines helper should exist");
assert.equal(typeof renderSeoServerLogAuditReport, "function", "renderSeoServerLogAuditReport helper should exist");

if (classifySeoCrawler && auditSeoServerLogs && parseSeoServerLogLines && renderSeoServerLogAuditReport) {
  assert.equal(
    classifySeoCrawler("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"),
    "Googlebot"
  );
  assert.equal(classifySeoCrawler("Mozilla/5.0 AppleWebKit compatible; OAI-SearchBot/1.0"), "OAI-SearchBot");
  assert.equal(classifySeoCrawler("Regular guest browser"), undefined);

  const parsed = parseSeoServerLogLines(
    [
      JSON.stringify({
        timestamp: "2026-06-27T15:00:00Z",
        path: "/today",
        status: 200,
        durationMs: 120,
        userAgent: "Googlebot/2.1",
      }),
      "",
      "not-json",
    ].join("\n")
  );
  assert.equal(parsed.length, 1, "parser should ignore blank and malformed JSONL lines");

  const audit = auditSeoServerLogs(
    [
      {
        timestamp: "2026-06-27T15:00:00Z",
        path: "/today",
        status: 200,
        durationMs: 120,
        userAgent: "Googlebot/2.1",
      },
      {
        timestamp: "2026-06-27T15:01:00Z",
        url: "https://aftertheparks.com/tonight",
        statusCode: 200,
        responseTimeMs: 140,
        ua: "Bingbot/2.0",
      },
      {
        timestamp: "2026-06-27T15:02:00Z",
        path: "/llms.txt",
        status: 200,
        durationMs: 90,
        userAgent: "OAI-SearchBot/1.0",
      },
      {
        timestamp: "2026-06-27T15:03:00Z",
        path: "/resorts/polynesian-village-resort",
        status: 503,
        durationMs: 80,
        userAgent: "Claude-SearchBot/1.0",
      },
      {
        timestamp: "2026-06-27T15:04:00Z",
        path: "/activities/movies-under-the-stars",
        status: 200,
        durationMs: 2600,
        userAgent: "PerplexityBot/1.0",
      },
    ],
    { maxLatencyMs: 1500 }
  );

  assert.ok(audit.rows.some((row) => row.crawler === "Googlebot" && row.hits === 1));
  assert.ok(
    audit.issues.some((issue) => /Claude-SearchBot/.test(issue) && /non-200/.test(issue)),
    "audit should flag crawler non-200 responses"
  );
  assert.ok(
    audit.issues.some((issue) => /PerplexityBot/.test(issue) && /slow/.test(issue)),
    "audit should flag slow crawler responses"
  );
  assert.ok(
    audit.issues.some((issue) => /Applebot/.test(issue) && /No log hits/.test(issue)),
    "audit should flag required crawlers missing from exported logs"
  );

  const report = renderSeoServerLogAuditReport(audit);
  assert.match(report, /# SEO Server Log Crawler Audit/);
  assert.match(report, /Googlebot/);
  assert.match(report, /Issues/);
  assert.doesNotMatch(report, /cookie|authorization|secret/i);
}

const scriptSource = readFileSync("scripts/audit-seo-server-logs.ts", "utf8");
assert.match(scriptSource, /auditSeoServerLogs/);
assert.match(scriptSource, /parseSeoServerLogLines/);

console.log("SEO server log audit tests passed.");
