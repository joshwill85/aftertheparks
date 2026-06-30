import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as structuredDataModule from "@/lib/seo/structuredDataEvidence";

const structuredData = structuredDataModule as Record<string, unknown>;
const parseStructuredDataEvidenceLines = structuredData.parseStructuredDataEvidenceLines as
  | undefined
  | ((text: string) => Array<Record<string, unknown>>);
const auditStructuredDataEvidence = structuredData.auditStructuredDataEvidence as
  | undefined
  | ((records: Array<Record<string, unknown>>) => {
      issues: string[];
      rows: Array<{
        routeGroup: string;
        representativePath: string;
        schemaType: string;
        valid: boolean;
        errors: number;
        warnings: number;
      }>;
    });
const renderStructuredDataEvidenceReport = structuredData.renderStructuredDataEvidenceReport as
  | undefined
  | ((audit: {
      issues: string[];
      rows: Array<{
        routeGroup: string;
        representativePath: string;
        schemaType: string;
        valid: boolean;
        errors: number;
        warnings: number;
      }>;
    }) => string);
const REQUIRED_STRUCTURED_DATA_EVIDENCE = structuredData.REQUIRED_STRUCTURED_DATA_EVIDENCE as
  | undefined
  | readonly { routeGroup: string; representativePath: string; schemaTypes: readonly string[] }[];

assert.equal(
  typeof parseStructuredDataEvidenceLines,
  "function",
  "parseStructuredDataEvidenceLines helper should exist"
);
assert.equal(
  typeof auditStructuredDataEvidence,
  "function",
  "auditStructuredDataEvidence helper should exist"
);
assert.equal(
  typeof renderStructuredDataEvidenceReport,
  "function",
  "renderStructuredDataEvidenceReport helper should exist"
);
assert.ok(Array.isArray(REQUIRED_STRUCTURED_DATA_EVIDENCE));

if (
  parseStructuredDataEvidenceLines &&
  auditStructuredDataEvidence &&
  renderStructuredDataEvidenceReport &&
  REQUIRED_STRUCTURED_DATA_EVIDENCE
) {
  const requiredTypes = new Set(
    REQUIRED_STRUCTURED_DATA_EVIDENCE.flatMap((item) => item.schemaTypes)
  );
  for (const schemaType of [
    "Organization",
    "WebSite",
    "BreadcrumbList",
    "ItemList",
    "Event",
    "Article",
    "FAQPage",
    "TouristAccommodation",
  ]) {
    assert.ok(requiredTypes.has(schemaType), `structured data evidence should require ${schemaType}`);
  }

  const completeEvidence = REQUIRED_STRUCTURED_DATA_EVIDENCE.flatMap((item) =>
    item.schemaTypes.map((schemaType: string) => ({
      checkedAt: "2026-06-27T20:00:00Z",
      source: "Google Search Console rich results",
      routeGroup: item.routeGroup,
      representativePath: item.representativePath,
      schemaType,
      valid: true,
      errors: 0,
      warnings: schemaType === "Event" ? 1 : 0,
      warningBlocking: false,
      visibleContentMatched: true,
    }))
  );

  const parsed = parseStructuredDataEvidenceLines(
    [JSON.stringify(completeEvidence[0]), "", "copied dashboard note"].join("\n")
  );
  assert.equal(parsed.length, 1, "parser should ignore blank and non-JSON copied notes");

  const completeAudit = auditStructuredDataEvidence(completeEvidence);
  assert.deepEqual(
    completeAudit.issues,
    [],
    `complete structured-data evidence should pass: ${completeAudit.issues.join("; ")}`
  );

  const invalidAudit = auditStructuredDataEvidence([
    ...completeEvidence.filter(
      (record) =>
        !(
          record.representativePath === "/activities/movies-under-the-stars" &&
          record.schemaType === "Event"
        )
    ),
    {
      checkedAt: "2026-06-27T20:01:00Z",
      source: "Rich Results Test",
      routeGroup: "activity_pages",
      representativePath: "/activities/movies-under-the-stars",
      schemaType: "Event",
      valid: false,
      errors: 2,
      warnings: 0,
      warningBlocking: false,
      visibleContentMatched: true,
    },
  ]);
  assert.ok(
    invalidAudit.issues.some(
      (issue) => /Event/.test(issue) && /movies-under-the-stars/.test(issue) && /error|invalid/i.test(issue)
    ),
    "audit should flag invalid Event structured-data evidence"
  );

  const hiddenClaimAudit = auditStructuredDataEvidence([
    ...completeEvidence.filter(
      (record) =>
        !(
          record.representativePath === "/activities" &&
          record.schemaType === "Article"
        )
    ),
    {
      checkedAt: "2026-06-27T20:02:00Z",
      source: "Schema validator",
      routeGroup: "guide_pages",
      representativePath: "/activities",
      schemaType: "Article",
      valid: true,
      errors: 0,
      warnings: 0,
      warningBlocking: false,
      visibleContentMatched: false,
    },
  ]);
  assert.ok(
    hiddenClaimAudit.issues.some((issue) => /visible content/i.test(issue)),
    "audit should flag structured data that cannot be matched to visible page content"
  );

  const missingAudit = auditStructuredDataEvidence(
    completeEvidence.filter((record) => record.schemaType !== "FAQPage")
  );
  assert.ok(
    missingAudit.issues.some((issue) => /FAQPage/.test(issue) && /missing/i.test(issue)),
    "audit should require evidence for every required schema type"
  );

  const report = renderStructuredDataEvidenceReport(invalidAudit);
  assert.match(report, /# Structured Data Evidence Audit/);
  assert.match(report, /Event/);
  assert.match(report, /Issues/);
  assert.doesNotMatch(report, /authorization|cookie|secret|token/i);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.ok(packageJson.scripts["seo:structured-data"], "package should expose seo:structured-data");
assert.match(
  packageJson.scripts["test:seo"],
  /test-seo-structured-data-evidence/,
  "SEO suite should include structured-data evidence tests"
);

const runbook = readFileSync("docs/seo-operations-runbook.md", "utf8");
for (const expected of [
  "npm run seo:structured-data",
  "structured-data-evidence.jsonl",
  "Rich Results",
  "visibleContentMatched",
]) {
  assert.match(runbook, new RegExp(expected, "i"), `runbook should mention ${expected}`);
}

const launchEvidence = readFileSync("docs/seo-launch-evidence-2026-06-27.md", "utf8");
assert.match(
  launchEvidence,
  /seo:structured-data/,
  "launch evidence should name the structured-data evidence audit command"
);

console.log("SEO structured-data evidence tests passed.");
