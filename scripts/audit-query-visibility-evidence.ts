import { readFileSync } from "node:fs";

import {
  auditQueryVisibilityEvidence,
  parseQueryVisibilityEvidenceLines,
  renderQueryVisibilityEvidenceReport,
} from "@/lib/seo/queryVisibilityEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error("Usage: npm run seo:query-visibility -- path/to/query-visibility-evidence.jsonl");
  process.exit(1);
}

const records = parseQueryVisibilityEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditQueryVisibilityEvidence(records);

console.log(renderQueryVisibilityEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
