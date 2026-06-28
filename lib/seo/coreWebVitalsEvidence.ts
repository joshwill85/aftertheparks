import { CORE_WEB_VITALS_BUDGETS } from "@/lib/seo/measurement";

export type CoreWebVitalsDevice = "mobile" | "desktop";

export type CoreWebVitalsEvidenceRecord = Record<string, unknown>;

export type CoreWebVitalsEvidenceRow = {
  routeGroup: string;
  representativePath: string;
  device: string;
  lcpMs: number;
  inpMs: number;
  cls: number;
  sampleSize: number;
};

export type CoreWebVitalsEvidenceAudit = {
  issues: string[];
  rows: CoreWebVitalsEvidenceRow[];
};

const MAX_EVIDENCE_AGE_DAYS = 35;
const REQUIRED_ROUTE_GROUPS = [...CORE_WEB_VITALS_BUDGETS.routeGroups];
const VALID_DEVICES: CoreWebVitalsDevice[] = ["mobile", "desktop"];

function stringField(record: CoreWebVitalsEvidenceRecord, field: string): string {
  const value = record[field];
  return typeof value === "string" ? value.trim() : "";
}

function numberField(record: CoreWebVitalsEvidenceRecord, field: string): number {
  const value = record[field];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return Number.NaN;
}

function evidenceAgeDays(checkedAt: string, now: Date): number | null {
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp)) return null;
  return (now.getTime() - timestamp) / 86_400_000;
}

function validateNonNegative(
  issues: string[],
  label: string,
  field: string,
  value: number
) {
  if (!Number.isFinite(value) || value < 0) {
    issues.push(`${label} has invalid ${field}; expected a non-negative number.`);
  }
}

export function parseCoreWebVitalsEvidenceLines(
  text: string
): CoreWebVitalsEvidenceRecord[] {
  const records: CoreWebVitalsEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") {
        records.push(parsed as CoreWebVitalsEvidenceRecord);
      }
    } catch {
      // Ignore notes or exported headings around JSONL evidence.
    }
  }
  return records;
}

export function auditCoreWebVitalsEvidence(
  records: readonly CoreWebVitalsEvidenceRecord[],
  options: { now?: Date } = {}
): CoreWebVitalsEvidenceAudit {
  const now = options.now ?? new Date();
  const issues: string[] = [];
  const rows: CoreWebVitalsEvidenceRow[] = [];
  const seenRouteGroups = new Set<string>();

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    const checkedAt = stringField(record, "checkedAt");
    const source = stringField(record, "source");
    const routeGroup = stringField(record, "routeGroup");
    const representativePath = stringField(record, "representativePath");
    const device = stringField(record, "device");
    const percentile = numberField(record, "percentile");
    const lcpMs = numberField(record, "lcpMs");
    const inpMs = numberField(record, "inpMs");
    const cls = numberField(record, "cls");
    const sampleSize = numberField(record, "sampleSize");
    const collectionWindowDays = numberField(record, "collectionWindowDays");

    for (const field of [
      "checkedAt",
      "source",
      "routeGroup",
      "representativePath",
      "device",
      "percentile",
      "lcpMs",
      "inpMs",
      "cls",
      "sampleSize",
      "collectionWindowDays",
    ]) {
      if (!(field in record)) issues.push(`${label} is missing ${field}.`);
    }

    if (!source) issues.push(`${label} is missing source.`);
    if (!representativePath.startsWith("/")) {
      issues.push(`${label} representativePath must be a canonical path.`);
    }
    if (!VALID_DEVICES.includes(device as CoreWebVitalsDevice)) {
      issues.push(`${label} has unsupported device: ${device || "missing"}.`);
    }
    if (!REQUIRED_ROUTE_GROUPS.includes(routeGroup as (typeof REQUIRED_ROUTE_GROUPS)[number])) {
      issues.push(`${label} has unsupported routeGroup: ${routeGroup || "missing"}.`);
    } else {
      seenRouteGroups.add(routeGroup);
    }

    const ageDays = evidenceAgeDays(checkedAt, now);
    if (ageDays == null) {
      issues.push(`${label} has invalid checkedAt timestamp.`);
    } else if (ageDays > MAX_EVIDENCE_AGE_DAYS) {
      issues.push(`${label} is older than ${MAX_EVIDENCE_AGE_DAYS} days.`);
    }

    if (percentile !== 75) {
      issues.push(`${label} must use the 75th percentile Core Web Vitals threshold.`);
    }
    validateNonNegative(issues, label, "lcpMs", lcpMs);
    validateNonNegative(issues, label, "inpMs", inpMs);
    validateNonNegative(issues, label, "cls", cls);
    validateNonNegative(issues, label, "sampleSize", sampleSize);
    validateNonNegative(issues, label, "collectionWindowDays", collectionWindowDays);
    if (sampleSize < 75) {
      issues.push(`${label} sampleSize should be at least 75 for field evidence.`);
    }

    if (lcpMs > CORE_WEB_VITALS_BUDGETS.lcpMs) {
      issues.push(`${label} LCP exceeds ${CORE_WEB_VITALS_BUDGETS.lcpMs} ms: ${lcpMs}.`);
    }
    if (inpMs > CORE_WEB_VITALS_BUDGETS.inpMs) {
      issues.push(`${label} INP exceeds ${CORE_WEB_VITALS_BUDGETS.inpMs} ms: ${inpMs}.`);
    }
    if (cls > CORE_WEB_VITALS_BUDGETS.cls) {
      issues.push(`${label} CLS exceeds ${CORE_WEB_VITALS_BUDGETS.cls}: ${cls}.`);
    }

    rows.push({
      routeGroup,
      representativePath,
      device,
      lcpMs,
      inpMs,
      cls,
      sampleSize,
    });
  });

  for (const routeGroup of REQUIRED_ROUTE_GROUPS) {
    if (!seenRouteGroups.has(routeGroup)) {
      issues.push(`Core Web Vitals evidence is missing route group: ${routeGroup}.`);
    }
  }

  return { issues, rows };
}

export function renderCoreWebVitalsEvidenceReport(
  audit: CoreWebVitalsEvidenceAudit
): string {
  const lines = [
    "# Core Web Vitals Field Evidence Audit",
    "",
    `Thresholds: LCP <= ${CORE_WEB_VITALS_BUDGETS.lcpMs}ms, INP <= ${CORE_WEB_VITALS_BUDGETS.inpMs}ms, CLS <= ${CORE_WEB_VITALS_BUDGETS.cls} at p75`,
    "",
    "| Route group | Path | Device | LCP ms | INP ms | CLS | Sample size | Status |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const row of audit.rows) {
    const passing =
      row.lcpMs <= CORE_WEB_VITALS_BUDGETS.lcpMs &&
      row.inpMs <= CORE_WEB_VITALS_BUDGETS.inpMs &&
      row.cls <= CORE_WEB_VITALS_BUDGETS.cls;
    lines.push(
      `| ${row.routeGroup || "-"} | ${row.representativePath || "-"} | ${
        row.device || "-"
      } | ${Number.isFinite(row.lcpMs) ? row.lcpMs : "-"} | ${
        Number.isFinite(row.inpMs) ? row.inpMs : "-"
      } | ${Number.isFinite(row.cls) ? row.cls : "-"} | ${
        Number.isFinite(row.sampleSize) ? row.sampleSize : "-"
      } | ${passing ? "pass" : "fail"} |`
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
