import { readFileSync } from "node:fs";

import {
  auditAiVisibilityEvidence,
  parseAiVisibilityEvidenceLines,
  renderAiVisibilityEvidenceReport,
} from "@/lib/seo/aiVisibilityEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error("Usage: npm run seo:ai-visibility -- path/to/ai-visibility-evidence.jsonl");
  process.exit(1);
}

const records = parseAiVisibilityEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditAiVisibilityEvidence(records);

console.log(renderAiVisibilityEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
