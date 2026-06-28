import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { AI_VISIBILITY_PROMPTS } from "@/lib/seo/measurement";
import * as aiVisibilityModule from "@/lib/seo/aiVisibilityEvidence";

const aiVisibility = aiVisibilityModule as Record<string, unknown>;
const parseAiVisibilityEvidenceLines = aiVisibility.parseAiVisibilityEvidenceLines as
  | undefined
  | ((text: string) => Array<Record<string, unknown>>);
const auditAiVisibilityEvidence = aiVisibility.auditAiVisibilityEvidence as
  | undefined
  | ((records: Array<Record<string, unknown>>, options?: { now?: Date }) => {
      issues: string[];
      rows: Array<{
        promptId: string;
        tool: string;
        citedAfterTheParks: boolean;
        citationCurrent: boolean;
        transportationCaveatRespected: boolean;
        observedCitationUrl: string;
      }>;
    });
const renderAiVisibilityEvidenceReport = aiVisibility.renderAiVisibilityEvidenceReport as
  | undefined
  | ((audit: {
      issues: string[];
      rows: Array<{
        promptId: string;
        tool: string;
        citedAfterTheParks: boolean;
        citationCurrent: boolean;
        transportationCaveatRespected: boolean;
        observedCitationUrl: string;
      }>;
    }) => string);

assert.equal(typeof parseAiVisibilityEvidenceLines, "function", "parseAiVisibilityEvidenceLines helper should exist");
assert.equal(typeof auditAiVisibilityEvidence, "function", "auditAiVisibilityEvidence helper should exist");
assert.equal(typeof renderAiVisibilityEvidenceReport, "function", "renderAiVisibilityEvidenceReport helper should exist");

if (parseAiVisibilityEvidenceLines && auditAiVisibilityEvidence && renderAiVisibilityEvidenceReport) {
  const promptIds = AI_VISIBILITY_PROMPTS.map((prompt) => prompt.id);
  const completeEvidence = AI_VISIBILITY_PROMPTS.flatMap((prompt) =>
    prompt.tools.map((tool) => ({
      checkedAt: "2026-06-27T16:00:00Z",
      tool,
      promptId: prompt.id,
      expectedCanonicalPath: prompt.expectedCanonicalPath,
      observedCitationUrl: `https://aftertheparks.com${prompt.expectedCanonicalPath}`,
      citedAfterTheParks: true,
      citationCurrent: true,
      sourceFreshnessMentioned: true,
      transportationCaveatRespected: true,
      disneySpringsFreeTransferRejected: true,
      resortStayOrDiningExperienceReservationMentioned: true,
    }))
  );
  const validRecord = {
    checkedAt: "2026-06-27T16:00:00Z",
    tool: "ChatGPT Search",
    promptId: "disney-springs-transfer-caveat",
    expectedCanonicalPath: "/guides/things-to-do-without-park-ticket",
    observedCitationUrl: "https://aftertheparks.com/guides/things-to-do-without-park-ticket",
    citedAfterTheParks: true,
    citationCurrent: true,
    sourceFreshnessMentioned: true,
    transportationCaveatRespected: true,
    disneySpringsFreeTransferRejected: true,
    resortStayOrDiningExperienceReservationMentioned: true,
  };

  const parsed = parseAiVisibilityEvidenceLines(
    [JSON.stringify(validRecord), "", "not-json"].join("\n")
  );
  assert.equal(parsed.length, 1, "parser should ignore blank and malformed JSONL lines");

  const completeAudit = auditAiVisibilityEvidence(completeEvidence, {
    now: new Date("2026-06-28T12:00:00Z"),
  });
  assert.deepEqual(
    completeAudit.issues,
    [],
    `complete AI visibility evidence should pass: ${completeAudit.issues.join("; ")}`
  );

  const partialAudit = auditAiVisibilityEvidence([validRecord], {
    now: new Date("2026-06-28T12:00:00Z"),
  });
  assert.ok(
    partialAudit.issues.some(
      (issue) =>
        /missing AI visibility evidence/i.test(issue) &&
        /movies-under-stars-tonight/.test(issue) &&
        /Perplexity/.test(issue)
    ),
    "audit should flag missing prompt/tool pairs from the stable weekly AI visibility set"
  );

  const audit = auditAiVisibilityEvidence([
    validRecord,
    {
      ...validRecord,
      tool: "Perplexity",
      promptId: "movies-under-stars-tonight",
      expectedCanonicalPath: "/activities/movies-under-the-stars",
      observedCitationUrl: "https://aftertheparks.com/activities/movies-under-the-stars",
    },
    {
      ...validRecord,
      tool: "Bing Copilot",
      promptId: "disney-springs-transfer-caveat",
      observedCitationUrl: "https://aftertheparks.com/guides/free-disney-resort-activities",
      transportationCaveatRespected: false,
      disneySpringsFreeTransferRejected: false,
      resortStayOrDiningExperienceReservationMentioned: false,
    },
    {
      checkedAt: "2026-06-27T16:05:00Z",
      tool: "Google AI Mode",
      promptId: "unknown-prompt",
      expectedCanonicalPath: "/today",
      observedCitationUrl: "",
      citedAfterTheParks: false,
      citationCurrent: false,
      sourceFreshnessMentioned: false,
      transportationCaveatRespected: true,
      disneySpringsFreeTransferRejected: true,
      resortStayOrDiningExperienceReservationMentioned: true,
    },
    {
      ...validRecord,
      tool: "Google AI Mode",
      sourceFreshnessMentioned: false,
    },
  ], {
    now: new Date("2026-06-28T12:00:00Z"),
  });

  assert.ok(audit.rows.length >= 3);
  assert.ok(
    audit.issues.some((issue) => /unknown-prompt/.test(issue)),
    "audit should flag records that do not map to the stable prompt set"
  );
  assert.ok(
    audit.issues.some((issue) => /wrong canonical/i.test(issue)),
    "audit should flag After the Parks citations to the wrong canonical page"
  );
  assert.ok(
    audit.issues.some((issue) => /Disney Springs/i.test(issue) && /free transfer/i.test(issue)),
    "audit should flag AI answers that treat Disney Springs as a free transfer workaround"
  );
  assert.ok(
    audit.issues.some((issue) => /source freshness/i.test(issue)),
    "audit should flag cited AI answers that drop the site's freshness signal"
  );
  assert.ok(
    promptIds.includes("disney-springs-transfer-caveat"),
    "stable prompts should include the Disney Springs transportation caveat"
  );

  const report = renderAiVisibilityEvidenceReport(audit);
  assert.match(report, /# AI Visibility Evidence Audit/);
  assert.match(report, /disney-springs-transfer-caveat/);
  assert.match(report, /Issues/);
  assert.doesNotMatch(report, /authorization|cookie|secret/i);
}

const scriptSource = readFileSync("scripts/audit-ai-visibility-evidence.ts", "utf8");
assert.match(scriptSource, /auditAiVisibilityEvidence/);
assert.match(scriptSource, /parseAiVisibilityEvidenceLines/);

console.log("SEO AI visibility evidence tests passed.");
