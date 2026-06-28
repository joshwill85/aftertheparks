import { readFileSync } from "node:fs";

import {
  auditSeoServerLogs,
  parseSeoServerLogLines,
  renderSeoServerLogAuditReport,
} from "@/lib/seo/serverLogAudit";

const logPath = process.argv[2];

if (!logPath) {
  console.error("Usage: npm run seo:server-logs -- path/to/exported-logs.jsonl");
  process.exit(1);
}

const entries = parseSeoServerLogLines(readFileSync(logPath, "utf8"));
const audit = auditSeoServerLogs(entries, {
  maxLatencyMs: Number(process.env.SEO_LOG_MAX_LATENCY_MS || 1500),
});

console.log(renderSeoServerLogAuditReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
