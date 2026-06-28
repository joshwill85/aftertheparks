import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { AI_VISIBILITY_PROMPTS } from "@/lib/seo/measurement";
import * as bingAiModule from "@/lib/seo/bingAiPerformanceEvidence";

const bingAi = bingAiModule as Record<string, unknown>;
const parseBingAiPerformanceEvidenceLines = bingAi.parseBingAiPerformanceEvidenceLines as
  | undefined
  | ((text: string) => Array<Record<string, unknown>>);
const auditBingAiPerformanceEvidence = bingAi.auditBingAiPerformanceEvidence as
  | undefined
  | ((records: Array<Record<string, unknown>>, options?: { now?: Date }) => {
      issues: string[];
      rows: Array<{
        promptId: string;
        intent: string;
        topic: string;
        citationShare: number;
        previousCitationShare: number;
        compareDelta: number;
      }>;
    });
const renderBingAiPerformanceEvidenceReport =
  bingAi.renderBingAiPerformanceEvidenceReport as
    | undefined
    | ((audit: {
        issues: string[];
        rows: Array<{
          promptId: string;
          intent: string;
          topic: string;
          citationShare: number;
          previousCitationShare: number;
          compareDelta: number;
        }>;
      }) => string);

assert.equal(
  typeof parseBingAiPerformanceEvidenceLines,
  "function",
  "parseBingAiPerformanceEvidenceLines helper should exist"
);
assert.equal(
  typeof auditBingAiPerformanceEvidence,
  "function",
  "auditBingAiPerformanceEvidence helper should exist"
);
assert.equal(
  typeof renderBingAiPerformanceEvidenceReport,
  "function",
  "renderBingAiPerformanceEvidenceReport helper should exist"
);

if (
  parseBingAiPerformanceEvidenceLines &&
  auditBingAiPerformanceEvidence &&
  renderBingAiPerformanceEvidenceReport
) {
  const completeEvidence = AI_VISIBILITY_PROMPTS.map((prompt, index) => ({
    checkedAt: "2026-06-27T22:00:00Z",
    source: "Bing Webmaster Tools AI Performance",
    promptId: prompt.id,
    query: prompt.prompt,
    expectedCanonicalPath: prompt.expectedCanonicalPath,
    citedAfterTheParks: true,
    citedUrl: `https://aftertheparks.com${prompt.expectedCanonicalPath}`,
    intent: index === 0 ? "current resort activities tonight" : `intent ${index + 1}`,
    topic: index === 0 ? "Walt Disney World resort activities" : `topic ${index + 1}`,
    citationShare: 0.42,
    previousCitationShare: 0.25,
    compareDelta: 0.17,
    compareWindow: "7d-over-7d",
    groundingPhrases: ["current Disney resort activity calendars", "source freshness"],
    topCitedCompetitors: ["https://www.magicalresortguide.com/"],
    recommendedAction: "Improve visible answer blocks and source freshness notes.",
  }));

  const parsed = parseBingAiPerformanceEvidenceLines(
    [JSON.stringify(completeEvidence[0]), "dashboard heading", ""].join("\n")
  );
  assert.equal(parsed.length, 1, "parser should ignore blank and non-JSON dashboard notes");

  const completeAudit = auditBingAiPerformanceEvidence(completeEvidence, {
    now: new Date("2026-06-28T12:00:00Z"),
  });
  assert.deepEqual(
    completeAudit.issues,
    [],
    `complete Bing AI Performance evidence should pass: ${completeAudit.issues.join("; ")}`
  );

  const missingPromptAudit = auditBingAiPerformanceEvidence(
    completeEvidence.filter((record) => record.promptId !== "disney-springs-transfer-caveat"),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    missingPromptAudit.issues.some((issue) => /disney-springs-transfer-caveat/.test(issue)),
    "audit should require every stable AI visibility prompt in Bing AI Performance evidence"
  );

  const invalidShareAudit = auditBingAiPerformanceEvidence(
    completeEvidence.map((record) =>
      record.promptId === "movies-under-stars-tonight"
        ? { ...record, citationShare: 1.4 }
        : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    invalidShareAudit.issues.some((issue) => /citationShare/.test(issue) && /0 to 1/.test(issue)),
    "audit should reject invalid Citation Share values"
  );

  const wrongCanonicalAudit = auditBingAiPerformanceEvidence(
    completeEvidence.map((record) =>
      record.promptId === "resorts-tonight-no-ticket"
        ? { ...record, citedUrl: "https://aftertheparks.com/guides/free-disney-resort-activities" }
        : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    wrongCanonicalAudit.issues.some((issue) => /wrong canonical/i.test(issue)),
    "audit should flag Bing citations to the wrong canonical After the Parks page"
  );

  const missingDiagnosticAudit = auditBingAiPerformanceEvidence(
    completeEvidence.map((record) =>
      record.promptId === "current-resort-calendars"
        ? { ...record, intent: "", topic: "", compareWindow: "", groundingPhrases: [] }
        : record
    ),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    missingDiagnosticAudit.issues.some((issue) => /intent/i.test(issue)) &&
      missingDiagnosticAudit.issues.some((issue) => /topic/i.test(issue)) &&
      missingDiagnosticAudit.issues.some((issue) => /Compare/i.test(issue)),
    "audit should require Bing Intents, Topics, and Compare diagnostics"
  );

  const staleAudit = auditBingAiPerformanceEvidence(
    completeEvidence.map((record) => ({ ...record, checkedAt: "2026-06-01T12:00:00Z" })),
    { now: new Date("2026-06-28T12:00:00Z") }
  );
  assert.ok(
    staleAudit.issues.some((issue) => /older than/i.test(issue)),
    "audit should reject stale Bing AI Performance evidence"
  );

  const report = renderBingAiPerformanceEvidenceReport(wrongCanonicalAudit);
  assert.match(report, /# Bing AI Performance Evidence Audit/);
  assert.match(report, /Citation Share/);
  assert.match(report, /Compare/);
  assert.doesNotMatch(report, /authorization|cookie|secret|token/i);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.ok(
  packageJson.scripts["seo:bing-ai-performance"],
  "package should expose seo:bing-ai-performance"
);
assert.match(
  packageJson.scripts["test:seo"],
  /test-seo-bing-ai-performance-evidence/,
  "SEO suite should include Bing AI Performance evidence tests"
);

const runbook = readFileSync("docs/seo-operations-runbook.md", "utf8");
for (const expected of [
  "npm run seo:bing-ai-performance",
  "bing-ai-performance-evidence.jsonl",
  "Intents",
  "Topics",
  "Citation Share",
  "Compare",
]) {
  assert.match(runbook, new RegExp(expected, "i"), `runbook should mention ${expected}`);
}

const launchEvidence = readFileSync("docs/seo-launch-evidence-2026-06-27.md", "utf8");
assert.match(
  launchEvidence,
  /seo:bing-ai-performance/,
  "launch evidence should name the Bing AI Performance evidence audit command"
);

console.log("SEO Bing AI Performance evidence tests passed.");
