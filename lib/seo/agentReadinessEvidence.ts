import {
  AGENT_READINESS_CHECKS,
  type AgentReadinessCheckName,
} from "@/lib/seo/measurement";

export type AgentReadinessEvidenceRecord = Record<string, unknown>;

export type AgentReadinessEvidenceRow = {
  route: string;
  check: string;
  passed: boolean;
  evidence: string;
};

export type AgentReadinessEvidenceAudit = {
  issues: string[];
  rows: AgentReadinessEvidenceRow[];
};

const REQUIRED_FIELDS = ["checkedAt", "route", "check", "tool", "passed", "evidence"] as const;
const REQUIRED_CHECKS = AGENT_READINESS_CHECKS.map((check) => check.check);
const REQUIRED_CHECK_SET = new Set<AgentReadinessCheckName>(REQUIRED_CHECKS);
const MIN_EVIDENCE_LENGTH = 48;
const DISNEY_SPRINGS_ACCESS_ROUTES = new Set([
  "/guides/things-to-do-without-park-ticket",
  "/guides/disney-springs-area-resort-activities",
  "/guides/best-resorts-if-you-do-not-have-a-park-ticket",
]);
const DISNEY_SPRINGS_CAVEAT_CHECKS = new Set<AgentReadinessCheckName>([
  "accessibilityTree",
  "noHoverOnlyCriticalContent",
  "serverRenderedPrimaryAnswer",
]);

function stringField(record: AgentReadinessEvidenceRecord, field: string): string {
  const value = record[field];
  return typeof value === "string" ? value.trim() : "";
}

function booleanField(record: AgentReadinessEvidenceRecord, field: string): boolean {
  return record[field] === true;
}

function sanitizeReportValue(value: string): string {
  return value
    .replace(/authorization[:=]\s*\S+/gi, "authorization=[redacted]")
    .replace(/cookie[:=]\s*\S+/gi, "cookie=[redacted]")
    .replace(/secret[:=]\s*\S+/gi, "secret=[redacted]")
    .replace(/cfat_[A-Za-z0-9_-]+/g, "[redacted-token]")
    .replace(/AIza[0-9A-Za-z_-]+/g, "[redacted-token]");
}

function hasDisneySpringsAccessCaveat(evidence: string): boolean {
  const normalized = evidence.toLowerCase();
  const hasDisneySprings = normalized.includes("disney springs");
  const hasResortStay = /\bresort stay\b|\bstaying\b/.test(normalized);
  const hasReservation =
    normalized.includes("dining/experience reservation") ||
    normalized.includes("dining reservation") ||
    normalized.includes("restaurant reservation") ||
    normalized.includes("experience reservation") ||
    normalized.includes("confirmed dining");

  return hasDisneySprings && hasResortStay && hasReservation;
}

export function parseAgentReadinessEvidenceLines(
  text: string
): AgentReadinessEvidenceRecord[] {
  const records: AgentReadinessEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") {
        records.push(parsed as AgentReadinessEvidenceRecord);
      }
    } catch {
      // Allow pasted notes around JSONL exports without breaking the audit.
    }
  }
  return records;
}

export function auditAgentReadinessEvidence(
  records: AgentReadinessEvidenceRecord[]
): AgentReadinessEvidenceAudit {
  const issues: string[] = [];
  const rows: AgentReadinessEvidenceRow[] = [];
  const checksByRoute = new Map<string, Set<AgentReadinessCheckName>>();

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    for (const field of REQUIRED_FIELDS) {
      if (!(field in record)) issues.push(`${label} is missing ${field}.`);
    }

    const route = stringField(record, "route");
    const check = stringField(record, "check");
    const evidence = stringField(record, "evidence");
    const checkedAt = stringField(record, "checkedAt");
    const tool = stringField(record, "tool");
    const passed = booleanField(record, "passed");

    if (!checkedAt) issues.push(`${label} is missing checkedAt.`);
    if (!tool) issues.push(`${label} is missing tool.`);
    if (!route.startsWith("/")) {
      issues.push(`${label} route must be a canonical path with a leading slash.`);
    }
    if (!REQUIRED_CHECK_SET.has(check as AgentReadinessCheckName)) {
      issues.push(`${label} has unknown agent readiness check: ${check || "missing"}.`);
    }
    if (!passed) {
      issues.push(`${label} failed ${check || "agent readiness check"}.`);
    }
    if (evidence.length < MIN_EVIDENCE_LENGTH) {
      issues.push(`${label} evidence is too short for ${check || "agent readiness check"}.`);
    }

    if (
      DISNEY_SPRINGS_ACCESS_ROUTES.has(route) &&
      DISNEY_SPRINGS_CAVEAT_CHECKS.has(check as AgentReadinessCheckName) &&
      !hasDisneySpringsAccessCaveat(evidence)
    ) {
      issues.push(
        `${label} Disney Springs evidence must mention Disney Springs, resort stay, and dining/experience reservation caveats.`
      );
    }

    if (route.startsWith("/") && REQUIRED_CHECK_SET.has(check as AgentReadinessCheckName)) {
      const routeChecks = checksByRoute.get(route) ?? new Set<AgentReadinessCheckName>();
      routeChecks.add(check as AgentReadinessCheckName);
      checksByRoute.set(route, routeChecks);
    }

    rows.push({ route, check, passed, evidence });
  });

  for (const [route, checks] of checksByRoute) {
    for (const required of REQUIRED_CHECKS) {
      if (!checks.has(required)) {
        issues.push(`${route} is missing required agent readiness check ${required}.`);
      }
    }
  }

  return { issues, rows };
}

export function renderAgentReadinessEvidenceReport(
  audit: AgentReadinessEvidenceAudit
): string {
  const lines = [
    "# Agent Readiness Evidence Audit",
    "",
    "| Route | Check | Passed | Evidence |",
    "| --- | --- | --- | --- |",
  ];

  for (const row of audit.rows) {
    lines.push(
      `| ${sanitizeReportValue(row.route)} | ${sanitizeReportValue(row.check)} | ${
        row.passed ? "yes" : "no"
      } | ${sanitizeReportValue(row.evidence) || "-"} |`
    );
  }

  lines.push("", "## Issues");
  if (audit.issues.length === 0) {
    lines.push("- None");
  } else {
    for (const issue of audit.issues) lines.push(`- ${sanitizeReportValue(issue)}`);
  }

  return lines.join("\n");
}
