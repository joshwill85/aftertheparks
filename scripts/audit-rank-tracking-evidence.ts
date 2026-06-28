import { readFileSync } from "node:fs";

import {
  auditRankTrackingEvidence,
  parseRankTrackingEvidenceLines,
  renderRankTrackingEvidenceReport,
} from "@/lib/seo/rankTrackingEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error("Usage: npm run seo:rank-tracking -- path/to/rank-tracking-evidence.jsonl");
  process.exit(1);
}

const records = parseRankTrackingEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditRankTrackingEvidence(records);

console.log(renderRankTrackingEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
