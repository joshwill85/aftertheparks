import { readFileSync } from "node:fs";

import {
  auditSearchIndexEvidence,
  parseSearchIndexEvidenceLines,
  renderSearchIndexEvidenceReport,
} from "@/lib/seo/searchIndexEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error("Usage: npm run seo:search-index -- path/to/search-index-evidence.jsonl");
  process.exit(1);
}

const records = parseSearchIndexEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditSearchIndexEvidence(records);

console.log(renderSearchIndexEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
