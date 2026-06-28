import { readFileSync } from "node:fs";

import {
  auditSitemapStatusEvidence,
  parseSitemapStatusEvidenceLines,
  renderSitemapStatusEvidenceReport,
} from "@/lib/seo/sitemapStatusEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error("Usage: npm run seo:sitemap-status -- path/to/sitemap-status-evidence.jsonl");
  process.exit(1);
}

const records = parseSitemapStatusEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditSitemapStatusEvidence(records);

console.log(renderSitemapStatusEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
