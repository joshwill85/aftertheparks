import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { AGENT_READINESS_CHECKS } from "@/lib/seo/measurement";
import * as agentReadinessModule from "@/lib/seo/agentReadinessEvidence";

const agentReadiness = agentReadinessModule as Record<string, unknown>;
const parseAgentReadinessEvidenceLines = agentReadiness.parseAgentReadinessEvidenceLines as
  | undefined
  | ((text: string) => Array<Record<string, unknown>>);
const auditAgentReadinessEvidence = agentReadiness.auditAgentReadinessEvidence as
  | undefined
  | ((records: Array<Record<string, unknown>>) => {
      issues: string[];
      rows: Array<{
        route: string;
        check: string;
        passed: boolean;
        evidence: string;
      }>;
    });
const renderAgentReadinessEvidenceReport = agentReadiness.renderAgentReadinessEvidenceReport as
  | undefined
  | ((audit: {
      issues: string[];
      rows: Array<{
        route: string;
        check: string;
        passed: boolean;
        evidence: string;
      }>;
    }) => string);

assert.equal(
  typeof parseAgentReadinessEvidenceLines,
  "function",
  "parseAgentReadinessEvidenceLines helper should exist"
);
assert.equal(
  typeof auditAgentReadinessEvidence,
  "function",
  "auditAgentReadinessEvidence helper should exist"
);
assert.equal(
  typeof renderAgentReadinessEvidenceReport,
  "function",
  "renderAgentReadinessEvidenceReport helper should exist"
);

if (
  parseAgentReadinessEvidenceLines &&
  auditAgentReadinessEvidence &&
  renderAgentReadinessEvidenceReport
) {
  const disneySpringsRoute = "/guides/things-to-do-without-park-ticket";
  const validRecords = AGENT_READINESS_CHECKS.map(({ check }) => ({
    checkedAt: "2026-06-27T17:00:00Z",
    route: disneySpringsRoute,
    check,
    tool: "Playwright accessibility snapshot",
    passed: true,
    evidence:
      check === "accessibilityTree" ||
      check === "noHoverOnlyCriticalContent" ||
      check === "serverRenderedPrimaryAnswer"
        ? "Evidence confirms Disney Springs caveat is visible/server-rendered and mentions resort stay plus dining/experience reservation access."
        : "Evidence is detailed enough for this check and names the observed route behavior.",
  }));

  const parsed = parseAgentReadinessEvidenceLines(
    [JSON.stringify(validRecords[0]), "", "not-json"].join("\n")
  );
  assert.equal(parsed.length, 1, "parser should ignore blank and malformed JSONL lines");

  const cleanAudit = auditAgentReadinessEvidence(validRecords);
  assert.deepEqual(cleanAudit.issues, [], "complete valid evidence should not raise issues");

  const incompleteRoute = "/today";
  const badAudit = auditAgentReadinessEvidence([
    ...validRecords,
    {
      checkedAt: "2026-06-27T17:05:00Z",
      route: "today",
      check: "accessibilityTree",
      tool: "Playwright accessibility snapshot",
      passed: true,
      evidence: "Route lacks a leading slash even though the evidence text is otherwise long.",
    },
    {
      checkedAt: "2026-06-27T17:06:00Z",
      route: incompleteRoute,
      check: "unknownCheck",
      tool: "manual",
      passed: true,
      evidence: "Unknown checks should be rejected even when the rest of the record is detailed.",
    },
    {
      checkedAt: "2026-06-27T17:07:00Z",
      route: incompleteRoute,
      check: "stableHeadings",
      tool: "manual",
      passed: false,
      evidence: "The heading outline skipped the current-answer block during review.",
    },
    {
      checkedAt: "2026-06-27T17:08:00Z",
      route: incompleteRoute,
      check: "serverRenderedPrimaryAnswer",
      tool: "curl",
      passed: true,
      evidence: "ok",
    },
    {
      checkedAt: "2026-06-27T17:09:00Z",
      route: "/guides/disney-springs-area-resort-activities",
      check: "accessibilityTree",
      tool: "Playwright accessibility snapshot",
      passed: true,
      evidence: "Evidence mentions Disney Springs but omits the access rule.",
    },
  ]);

  assert.ok(
    badAudit.issues.some((issue) => /leading slash/i.test(issue)),
    "audit should flag routes that are not canonical paths"
  );
  assert.ok(
    badAudit.issues.some((issue) => /unknownCheck/i.test(issue)),
    "audit should flag records with unknown checks"
  );
  assert.ok(
    badAudit.issues.some((issue) => /failed/i.test(issue)),
    "audit should flag failed agent readiness checks"
  );
  assert.ok(
    badAudit.issues.some((issue) => /evidence/i.test(issue) && /too short/i.test(issue)),
    "audit should flag evidence that is too short to be useful"
  );
  assert.ok(
    badAudit.issues.some((issue) => /missing/i.test(issue) && /keyboardReachablePrimaryFlows/i.test(issue)),
    "audit should flag routes missing required checks"
  );
  assert.ok(
    badAudit.issues.some((issue) => /Disney Springs/i.test(issue) && /dining\/experience reservation/i.test(issue)),
    "audit should require Disney Springs route evidence to preserve resort-stay or dining/experience reservation caveats"
  );

  const report = renderAgentReadinessEvidenceReport(badAudit);
  assert.match(report, /# Agent Readiness Evidence Audit/);
  assert.match(report, /accessibilityTree/);
  assert.match(report, /Issues/);
  assert.doesNotMatch(report, /authorization|cookie|secret/i);
}

const scriptSource = readFileSync("scripts/audit-agent-readiness-evidence.ts", "utf8");
assert.match(scriptSource, /auditAgentReadinessEvidence/);
assert.match(scriptSource, /parseAgentReadinessEvidenceLines/);

console.log("SEO agent readiness evidence tests passed.");
