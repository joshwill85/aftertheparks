import { readFileSync } from "node:fs";

import {
  auditStructuredDataEvidence,
  parseStructuredDataEvidenceLines,
  renderStructuredDataEvidenceReport,
} from "@/lib/seo/structuredDataEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error("Usage: npm run seo:structured-data -- path/to/structured-data-evidence.jsonl");
  process.exit(1);
}

const records = parseStructuredDataEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditStructuredDataEvidence(records);

console.log(renderStructuredDataEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
