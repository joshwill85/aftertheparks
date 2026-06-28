import { readFileSync } from "node:fs";

import {
  auditCloudflareAiCrawlEvidence,
  parseCloudflareAiCrawlEvidenceLines,
  renderCloudflareAiCrawlEvidenceReport,
} from "@/lib/seo/cloudflareAiCrawlEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error(
    "Usage: npm run seo:cloudflare-ai-crawl -- path/to/cloudflare-ai-crawl-evidence.jsonl"
  );
  process.exit(1);
}

const records = parseCloudflareAiCrawlEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditCloudflareAiCrawlEvidence(records);

console.log(renderCloudflareAiCrawlEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
