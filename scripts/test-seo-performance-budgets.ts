import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

import { CORE_WEB_VITALS_BUDGETS } from "@/lib/seo/measurement";
import * as performanceBudgetsModule from "@/lib/seo/performanceBudgets";

const performanceBudgets = performanceBudgetsModule as Record<string, unknown>;
const auditSeoPerformanceBudgets = performanceBudgets.auditSeoPerformanceBudgets as
  | undefined
  | ((input: {
      manifest: { pages: Record<string, string[]> };
      readChunk: (chunkPath: string) => Buffer;
      budgetKb: number;
    }) => { issues: string[]; rows: Array<{ route: string; group: string; gzipKb: number; budgetKb: number }> });
const renderSeoPerformanceBudgetReport = performanceBudgets.renderSeoPerformanceBudgetReport as
  | undefined
  | ((rows: Array<{ route: string; group: string; gzipKb: number; budgetKb: number }>, issues: string[]) => string);

assert.equal(typeof auditSeoPerformanceBudgets, "function", "auditSeoPerformanceBudgets helper should exist");
assert.equal(typeof renderSeoPerformanceBudgetReport, "function", "renderSeoPerformanceBudgetReport helper should exist");

if (auditSeoPerformanceBudgets && renderSeoPerformanceBudgetReport) {
  const smallChunk = Buffer.from("console.log('small');");
  const sharedChunk = Buffer.from("const shared = true;");
  const bigChunk = randomBytes(4096);
  const manifest = {
    pages: {
      "/page": ["static/chunks/shared.js", "static/chunks/home.js"],
      "/today/page": ["static/chunks/shared.js", "static/chunks/today.js"],
      "/tonight/page": ["static/chunks/shared.js", "static/chunks/tonight.js"],
      "/activities/page": ["static/chunks/shared.js", "static/chunks/activities.js"],
      "/activities/[slug]/page": ["static/chunks/shared.js", "static/chunks/activity-detail.js"],
      "/resorts/page": ["static/chunks/shared.js", "static/chunks/resorts.js"],
      "/resorts/[slug]/page": ["static/chunks/shared.js", "static/chunks/resort-detail.js"],
      "/guides/page": ["static/chunks/shared.js", "static/chunks/guides.js"],
      "/guides/[slug]/page": ["static/chunks/shared.js", "static/chunks/guide-detail.js"],
      "/disney-world-resort-activity-calendars/page": ["static/chunks/shared.js", "static/chunks/calendar-hub.js"],
      "/calendar/page": ["static/chunks/shared.js", "static/chunks/calendar.js"],
    },
  };
  const chunks: Record<string, Buffer> = {
    "static/chunks/shared.js": sharedChunk,
    "static/chunks/home.js": smallChunk,
    "static/chunks/today.js": smallChunk,
    "static/chunks/tonight.js": smallChunk,
    "static/chunks/activities.js": smallChunk,
    "static/chunks/activity-detail.js": smallChunk,
    "static/chunks/resorts.js": smallChunk,
    "static/chunks/resort-detail.js": smallChunk,
    "static/chunks/guides.js": smallChunk,
    "static/chunks/guide-detail.js": smallChunk,
    "static/chunks/calendar-hub.js": smallChunk,
    "static/chunks/calendar.js": smallChunk,
  };

  const passing = auditSeoPerformanceBudgets({
    manifest,
    readChunk: (chunkPath) => chunks[chunkPath] ?? Buffer.alloc(0),
    budgetKb: CORE_WEB_VITALS_BUDGETS.mobileJsKb,
  });
  assert.deepEqual(passing.issues, []);
  assert.ok(passing.rows.length >= 10, "budget audit should cover all SEO-critical route patterns");
  assert.ok(
    passing.rows.some((row) => row.route === "/today/page" && row.group === "today_tonight"),
    "budget audit should group today/tonight routes"
  );
  assert.ok(
    passing.rows.every((row) => row.gzipKb > 0 && row.budgetKb === CORE_WEB_VITALS_BUDGETS.mobileJsKb),
    "budget rows should include measured gzip KB and configured budget"
  );

  const report = renderSeoPerformanceBudgetReport(passing.rows, passing.issues);
  assert.match(report, /# SEO Performance Budget Audit/);
  assert.match(report, /Route/);
  assert.match(report, /Gzip JS KB/);

  const failing = auditSeoPerformanceBudgets({
    manifest: {
      pages: {
        ...manifest.pages,
        "/today/page": ["static/chunks/shared.js", "static/chunks/big.js"],
      },
    },
    readChunk: (chunkPath) => (chunkPath === "static/chunks/big.js" ? bigChunk : chunks[chunkPath] ?? Buffer.alloc(0)),
    budgetKb: 1,
  });
  assert.ok(
    failing.issues.some((issue) => /\/today\/page/.test(issue) && /exceeds/.test(issue)),
    "budget audit should flag SEO-critical routes over budget"
  );

  const missing = auditSeoPerformanceBudgets({
    manifest: { pages: { "/page": manifest.pages["/page"] } },
    readChunk: (chunkPath) => chunks[chunkPath] ?? Buffer.alloc(0),
    budgetKb: CORE_WEB_VITALS_BUDGETS.mobileJsKb,
  });
  assert.ok(
    missing.issues.some((issue) => /Missing SEO performance route/.test(issue)),
    "budget audit should flag missing SEO-critical route patterns"
  );
}

const scriptSource = readFileSync("scripts/audit-seo-performance-budgets.ts", "utf8");
assert.match(scriptSource, /loadBuiltSeoPerformanceAudit/);
assert.match(scriptSource, /renderSeoPerformanceBudgetReport/);

console.log("SEO performance budget tests passed.");
