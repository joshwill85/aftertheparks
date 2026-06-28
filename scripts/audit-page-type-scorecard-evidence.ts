import { readFileSync } from "node:fs";

import {
  auditPageTypeScorecardEvidence,
  parsePageTypeScorecardEvidenceLines,
  renderPageTypeScorecardEvidenceReport,
} from "@/lib/seo/pageTypeScorecardEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error("Usage: npm run seo:page-type-scorecard -- path/to/page-type-scorecard.jsonl");
  process.exit(1);
}

const records = parsePageTypeScorecardEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditPageTypeScorecardEvidence(records);

console.log(renderPageTypeScorecardEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
