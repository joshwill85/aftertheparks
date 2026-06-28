import { readFileSync } from "node:fs";

import {
  auditBingAiPerformanceEvidence,
  parseBingAiPerformanceEvidenceLines,
  renderBingAiPerformanceEvidenceReport,
} from "@/lib/seo/bingAiPerformanceEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error(
    "Usage: npm run seo:bing-ai-performance -- path/to/bing-ai-performance-evidence.jsonl"
  );
  process.exit(1);
}

const records = parseBingAiPerformanceEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditBingAiPerformanceEvidence(records);

console.log(renderBingAiPerformanceEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
