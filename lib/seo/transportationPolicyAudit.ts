import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type TransportationPolicyRecord = {
  path: string;
  text: string;
};

export type TransportationPolicyAuditRow = {
  path: string;
  mentionsDisneySprings: boolean;
  affectedSurface: boolean;
  hasRequiredCaveat: boolean;
  riskyFreeTransferLanguage: boolean;
};

export type TransportationPolicyAudit = {
  issues: string[];
  rows: TransportationPolicyAuditRow[];
};

const DEFAULT_SCAN_ROOTS = ["app", "components", "lib/seo", "docs/seo-strategy-2026.md", "docs/seo-operations-runbook.md", "docs/seo-launch-evidence-2026-06-27.md"];
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".md", ".txt"]);

function normalized(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

function hasRequiredCaveat(text: string): boolean {
  if (
    text.includes("DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT") ||
    text.includes("disneySpringsTransportationCaveat")
  ) {
    return true;
  }
  const lower = normalized(text);
  const hasStay = /\bresort stay\b|\bstaying\b|disney resort hotel stay/.test(lower);
  const hasReservation =
    lower.includes("dining/experience reservation") ||
    lower.includes("dining reservation") ||
    lower.includes("restaurant reservation") ||
    lower.includes("experience reservation") ||
    lower.includes("confirmed reservation");
  return hasStay && hasReservation;
}

function hasDisneySprings(text: string): boolean {
  return /disney springs/i.test(text);
}

function isAffectedSurface(path: string, text: string): boolean {
  const lowerPath = path.toLowerCase();
  const lowerText = normalized(text);
  const pathIsAffected =
    lowerPath.includes("disney-springs") ||
    lowerPath.includes("without-park-ticket") ||
    lowerPath.includes("no-ticket") ||
    lowerPath.includes("resort-hopping");
  const textIsAffected =
    lowerText.includes("disney springs") &&
    /(resort[- ]transfer|free way|free transfer|transfer hub|resort hotels?|buses?|boats?|without park ticket|no ticket|resort hopping)/.test(
      lowerText
    );
  return pathIsAffected || textIsAffected;
}

function hasRiskyFreeTransferLanguage(text: string): boolean {
  const lower = normalized(text);
  if (!lower.includes("disney springs")) return false;
  const risky =
    /free (?:way|route|transfer|transportation|workaround)/.test(lower) ||
    /free resort[- ]transfer/.test(lower) ||
    /transfer hub/.test(lower) ||
    /buses? (?:or boats? )?(?:as|are|can be|to reach|get to)/.test(lower) ||
    /boats? (?:as|are|can be|to reach|get to)/.test(lower);
  if (!risky) return false;

  const rejecting =
    /do not|don't|not use|not treat|not publish|restricted|restriction|without relying|instead of treating|rather than treating|avoid/.test(
      lower
    );
  return !rejecting;
}

function shouldScanFile(path: string): boolean {
  if (path.includes("node_modules") || path.includes(".next") || path.includes(".git")) {
    return false;
  }
  return [...SCANNED_EXTENSIONS].some((extension) => path.endsWith(extension));
}

function collectFiles(path: string): string[] {
  const stats = statSync(path);
  if (stats.isFile()) return shouldScanFile(path) ? [path] : [];
  if (!stats.isDirectory()) return [];

  const files: string[] = [];
  for (const entry of readdirSync(path)) {
    files.push(...collectFiles(join(path, entry)));
  }
  return files;
}

export function collectTransportationPolicyRecords(
  paths: readonly string[] = DEFAULT_SCAN_ROOTS
): TransportationPolicyRecord[] {
  const files = paths.flatMap((path) => collectFiles(path));
  return files.map((path) => ({ path, text: readFileSync(path, "utf8") }));
}

export function auditTransportationPolicyRecords(
  records: readonly TransportationPolicyRecord[]
): TransportationPolicyAudit {
  const issues: string[] = [];
  const rows = records.map((record) => {
    const mentionsDisneySprings = hasDisneySprings(record.text);
    const affectedSurface = isAffectedSurface(record.path, record.text);
    const caveat = hasRequiredCaveat(record.text);
    const riskyFreeTransferLanguage = hasRiskyFreeTransferLanguage(record.text);

    if (riskyFreeTransferLanguage && !caveat) {
      issues.push(
        `${record.path} appears to promote Disney Springs as a free resort-transfer route.`
      );
    }

    if (mentionsDisneySprings && affectedSurface && !caveat) {
      issues.push(
        `${record.path} mentions Disney Springs in an affected surface but does not mention a resort stay or dining/experience reservation caveat.`
      );
    }

    return {
      path: record.path,
      mentionsDisneySprings,
      affectedSurface,
      hasRequiredCaveat: caveat,
      riskyFreeTransferLanguage,
    };
  });

  return { issues, rows };
}

export function renderTransportationPolicyAuditReport(
  audit: TransportationPolicyAudit
): string {
  const relevantRows = audit.rows.filter(
    (row) => row.mentionsDisneySprings || row.affectedSurface || row.riskyFreeTransferLanguage
  );
  const lines = [
    "# Transportation Policy Audit",
    "",
    "| Path | Disney Springs | Affected surface | Required caveat | Risky free-transfer language |",
    "| --- | --- | --- | --- | --- |",
  ];

  for (const row of relevantRows) {
    lines.push(
      `| ${row.path} | ${row.mentionsDisneySprings ? "yes" : "no"} | ${
        row.affectedSurface ? "yes" : "no"
      } | ${row.hasRequiredCaveat ? "yes" : "no"} | ${
        row.riskyFreeTransferLanguage ? "yes" : "no"
      } |`
    );
  }

  lines.push("", "## Issues");
  if (audit.issues.length === 0) {
    lines.push("- None");
  } else {
    for (const issue of audit.issues) lines.push(`- ${issue}`);
  }

  return lines.join("\n");
}
