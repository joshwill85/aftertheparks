import { readFileSync } from "node:fs";

import {
  auditCoreWebVitalsEvidence,
  parseCoreWebVitalsEvidenceLines,
  renderCoreWebVitalsEvidenceReport,
} from "@/lib/seo/coreWebVitalsEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error("Usage: npm run seo:core-web-vitals -- path/to/core-web-vitals.jsonl");
  process.exit(1);
}

const records = parseCoreWebVitalsEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditCoreWebVitalsEvidence(records);

console.log(renderCoreWebVitalsEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
