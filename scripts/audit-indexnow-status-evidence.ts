import { readFileSync } from "node:fs";

import {
  auditIndexNowStatusEvidence,
  parseIndexNowStatusEvidenceLines,
  renderIndexNowStatusEvidenceReport,
} from "@/lib/seo/indexNowStatusEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error("Usage: npm run seo:indexnow-status -- path/to/indexnow-status-evidence.jsonl");
  process.exit(1);
}

const records = parseIndexNowStatusEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditIndexNowStatusEvidence(records);

console.log(renderIndexNowStatusEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
