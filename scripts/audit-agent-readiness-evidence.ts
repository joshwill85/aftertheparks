import { readFileSync } from "node:fs";

import {
  auditAgentReadinessEvidence,
  parseAgentReadinessEvidenceLines,
  renderAgentReadinessEvidenceReport,
} from "@/lib/seo/agentReadinessEvidence";

const evidencePath = process.argv[2];

if (!evidencePath) {
  console.error("Usage: npm run seo:agent-readiness -- path/to/agent-readiness-evidence.jsonl");
  process.exit(1);
}

const records = parseAgentReadinessEvidenceLines(readFileSync(evidencePath, "utf8"));
const audit = auditAgentReadinessEvidence(records);

console.log(renderAgentReadinessEvidenceReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
