import { readFileSync } from "node:fs";

import {
  auditCrawlErrorEvidence,
  parseCrawlErrorEvidenceLines,
  renderCrawlErrorEvidenceReport,
} from "@/lib/seo/crawlErrorEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error("Usage: npm run seo:crawl-errors -- path/to/crawl-error-evidence.jsonl");
  process.exit(1);
}

const records = parseCrawlErrorEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditCrawlErrorEvidence(records);

console.log(renderCrawlErrorEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
