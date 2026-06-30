import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  auditCoreWebVitalsEvidence,
  parseCoreWebVitalsEvidenceLines,
  renderCoreWebVitalsEvidenceReport,
} from "@/lib/seo/coreWebVitalsEvidence";

const checkedAt = new Date().toISOString();
const goodRecords = [
  {
    checkedAt,
    source: "Search Console Core Web Vitals",
    routeGroup: "homepage_calendar_hub",
    representativePath: "/",
    device: "mobile",
    percentile: 75,
    lcpMs: 2200,
    inpMs: 160,
    cls: 0.05,
    sampleSize: 500,
    collectionWindowDays: 28,
  },
  {
    checkedAt,
    source: "CrUX API",
    routeGroup: "today_tonight",
    representativePath: "/today",
    device: "mobile",
    percentile: 75,
    lcpMs: 2300,
    inpMs: 180,
    cls: 0.07,
    sampleSize: 420,
    collectionWindowDays: 28,
  },
  {
    checkedAt,
    source: "CrUX API",
    routeGroup: "resort_pages",
    representativePath: "/resorts/polynesian-village-resort",
    device: "mobile",
    percentile: 75,
    lcpMs: 2100,
    inpMs: 170,
    cls: 0.04,
    sampleSize: 300,
    collectionWindowDays: 28,
  },
  {
    checkedAt,
    source: "CrUX API",
    routeGroup: "activity_pages",
    representativePath: "/activities/movies-under-the-stars",
    device: "mobile",
    percentile: 75,
    lcpMs: 2000,
    inpMs: 150,
    cls: 0.03,
    sampleSize: 280,
    collectionWindowDays: 28,
  },
  {
    checkedAt,
    source: "CrUX API",
    routeGroup: "calendar_pages",
    representativePath: "/disney-world-resort-activity-calendars/summer-2026",
    device: "mobile",
    percentile: 75,
    lcpMs: 1900,
    inpMs: 140,
    cls: 0.02,
    sampleSize: 260,
    collectionWindowDays: 28,
  },
];

const cleanAudit = auditCoreWebVitalsEvidence(goodRecords);
assert.deepEqual(cleanAudit.issues, [], `good CWV evidence should pass: ${cleanAudit.issues.join("; ")}`);
assert.equal(cleanAudit.rows.length, 5);
assert.ok(
  renderCoreWebVitalsEvidenceReport(cleanAudit).includes("Core Web Vitals Field Evidence Audit"),
  "CWV report should render a readable heading"
);

const parsed = parseCoreWebVitalsEvidenceLines(`notes\n${JSON.stringify(goodRecords[0])}\n`);
assert.equal(parsed.length, 1, "parser should ignore non-JSON note lines");

const missingGroupAudit = auditCoreWebVitalsEvidence(goodRecords.slice(0, 4));
assert.ok(
  missingGroupAudit.issues.some((issue) => /missing route group/i.test(issue)),
  "audit should require all SEO route groups"
);

const failingLcpAudit = auditCoreWebVitalsEvidence([
  {
    ...goodRecords[0],
    lcpMs: 2600,
  },
]);
assert.ok(
  failingLcpAudit.issues.some((issue) => /LCP/i.test(issue) && /2500/i.test(issue)),
  "audit should flag LCP above the good threshold"
);

const failingInpAudit = auditCoreWebVitalsEvidence([
  {
    ...goodRecords[0],
    inpMs: 220,
  },
]);
assert.ok(
  failingInpAudit.issues.some((issue) => /INP/i.test(issue) && /200/i.test(issue)),
  "audit should flag INP above the good threshold"
);

const failingClsAudit = auditCoreWebVitalsEvidence([
  {
    ...goodRecords[0],
    cls: 0.12,
  },
]);
assert.ok(
  failingClsAudit.issues.some((issue) => /CLS/i.test(issue) && /0.1/i.test(issue)),
  "audit should flag CLS above the good threshold"
);

const staleAudit = auditCoreWebVitalsEvidence([
  {
    ...goodRecords[0],
    checkedAt: "2026-01-01T00:00:00.000Z",
  },
]);
assert.ok(
  staleAudit.issues.some((issue) => /older than/i.test(issue)),
  "audit should flag stale CWV evidence"
);

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.ok(packageJson.scripts["seo:core-web-vitals"], "package should expose seo:core-web-vitals");

console.log("SEO Core Web Vitals evidence tests passed.");
