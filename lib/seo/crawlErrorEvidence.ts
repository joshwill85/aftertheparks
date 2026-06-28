export type CrawlErrorEngine = "Google Search Console" | "Bing Webmaster Tools";

export type CrawlErrorEvidenceRecord = Record<string, unknown>;

export type CrawlErrorEvidenceRow = {
  engine: string;
  reportType: string;
  openErrorCount: number;
  priorityRouteErrorCount: number;
  affectedUrls: number;
  status: string;
  errorCategory: string;
};

export type CrawlErrorEvidenceAudit = {
  issues: string[];
  rows: CrawlErrorEvidenceRow[];
};

export const REQUIRED_CRAWL_ERROR_ENGINES: CrawlErrorEngine[] = [
  "Google Search Console",
  "Bing Webmaster Tools",
];

const MAX_EVIDENCE_AGE_DAYS = 8;
const SITE_URL = "https://aftertheparks.com";
const BLOCKING_ERROR_CATEGORIES = [
  "server_error",
  "soft_404",
  "not_found",
  "blocked_by_robots",
  "robots",
  "noindex",
  "redirect_error",
  "access_denied",
  "dns_error",
  "timeout",
  "fetch_error",
  "crawl_anomaly",
] as const;

const FIELD_ALIASES = {
  checkedAt: ["checkedAt", "datetime", "timestamp", "exportedAt"],
  engine: ["engine", "source", "tool", "dashboard"],
  reportType: ["reportType", "report", "type"],
  siteUrl: ["siteUrl", "property", "host"],
  openErrorCount: ["openErrorCount", "openErrors", "errorCount"],
  priorityRouteErrorCount: ["priorityRouteErrorCount", "priorityErrors"],
  affectedUrls: ["affectedUrls", "affectedUrlCount", "urlCount"],
  errorCategory: ["errorCategory", "issueType", "category", "reason"],
  status: ["status", "state"],
  validationState: ["validationState", "validation", "validationStatus"],
  sampleUrls: ["sampleUrls", "examples", "urls"],
  lastDetected: ["lastDetected", "lastSeen", "lastCrawled"],
  recommendedAction: ["recommendedAction", "action", "nextAction"],
} as const;

function stringField(record: CrawlErrorEvidenceRecord, fields: readonly string[]): string {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function numberField(record: CrawlErrorEvidenceRecord, fields: readonly string[]): number {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return Number.NaN;
}

function arrayField(record: CrawlErrorEvidenceRecord, fields: readonly string[]): unknown[] {
  for (const field of fields) {
    const value = record[field];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function evidenceAgeDays(checkedAt: string, now: Date): number | null {
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp)) return null;
  return (now.getTime() - timestamp) / 86_400_000;
}

function normalizeSiteUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.replace(/\/$/, "");
  }
}

function normalizedCategory(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function isOpenStatus(status: string): boolean {
  return /open|error|failed|not started|detected|active|new/i.test(status);
}

function isPassingStatus(status: string, validationState: string): boolean {
  const combined = `${status} ${validationState}`.toLowerCase();
  const normalized = combined.replace(/no errors?/g, "").replace(/no issues?/g, "");
  return /no errors|no issues|passed|valid|resolved|fixed|complete/.test(combined) &&
    !/open|failed|error|not started|detected|active/.test(normalized);
}

function hasValidOptionalTimestamp(value: string): boolean {
  return !value || Number.isFinite(Date.parse(value));
}

function sanitizeSampleUrl(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseCrawlErrorEvidenceLines(text: string): CrawlErrorEvidenceRecord[] {
  const records: CrawlErrorEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") {
        records.push(parsed as CrawlErrorEvidenceRecord);
      }
    } catch {
      // Allow copied dashboard headings and notes around JSONL records.
    }
  }
  return records;
}

export function auditCrawlErrorEvidence(
  records: CrawlErrorEvidenceRecord[],
  options: { now?: Date } = {}
): CrawlErrorEvidenceAudit {
  const now = options.now ?? new Date();
  const issues: string[] = [];
  const rows: CrawlErrorEvidenceRow[] = [];
  const seenPassing = new Set<string>();

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    const checkedAt = stringField(record, FIELD_ALIASES.checkedAt);
    const engine = stringField(record, FIELD_ALIASES.engine);
    const reportType = stringField(record, FIELD_ALIASES.reportType);
    const siteUrl = normalizeSiteUrl(stringField(record, FIELD_ALIASES.siteUrl));
    const openErrorCount = numberField(record, FIELD_ALIASES.openErrorCount);
    const priorityRouteErrorCount = numberField(record, FIELD_ALIASES.priorityRouteErrorCount);
    const affectedUrls = numberField(record, FIELD_ALIASES.affectedUrls);
    const errorCategory = normalizedCategory(stringField(record, FIELD_ALIASES.errorCategory));
    const status = stringField(record, FIELD_ALIASES.status);
    const validationState = stringField(record, FIELD_ALIASES.validationState);
    const sampleUrls = arrayField(record, FIELD_ALIASES.sampleUrls);
    const lastDetected = stringField(record, FIELD_ALIASES.lastDetected);
    const recommendedAction = stringField(record, FIELD_ALIASES.recommendedAction);

    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (!aliases.some((alias) => alias in record)) issues.push(`${label} is missing ${field}.`);
    }

    if (!REQUIRED_CRAWL_ERROR_ENGINES.includes(engine as CrawlErrorEngine)) {
      issues.push(`${label} has unsupported crawl-error engine: ${engine || "missing"}.`);
    }

    const ageDays = evidenceAgeDays(checkedAt, now);
    if (ageDays == null) {
      issues.push(`${label} has invalid checkedAt timestamp.`);
    } else if (ageDays > MAX_EVIDENCE_AGE_DAYS) {
      issues.push(`${label} is older than ${MAX_EVIDENCE_AGE_DAYS} days.`);
    }

    if (!/crawl/i.test(reportType)) {
      issues.push(`${label} reportType should identify crawl errors.`);
    }
    if (siteUrl !== SITE_URL) {
      issues.push(`${label} should report the production property ${SITE_URL}.`);
    }
    if (!Number.isFinite(openErrorCount) || openErrorCount < 0) {
      issues.push(`${label} openErrorCount must be a non-negative number.`);
    }
    if (!Number.isFinite(priorityRouteErrorCount) || priorityRouteErrorCount < 0) {
      issues.push(`${label} priorityRouteErrorCount must be a non-negative number.`);
    }
    if (!Number.isFinite(affectedUrls) || affectedUrls < 0) {
      issues.push(`${label} affectedUrls must be a non-negative number.`);
    }
    if (Number.isFinite(priorityRouteErrorCount) && Number.isFinite(affectedUrls) && priorityRouteErrorCount > affectedUrls) {
      issues.push(`${label} priorityRouteErrorCount cannot exceed affectedUrls.`);
    }
    if (!status) issues.push(`${label} is missing crawl-error status.`);
    if (!validationState) issues.push(`${label} is missing validationState.`);
    if (!recommendedAction) issues.push(`${label} is missing recommendedAction.`);
    if (!Array.isArray(sampleUrls)) issues.push(`${label} sampleUrls must be an array.`);
    if (!hasValidOptionalTimestamp(lastDetected)) {
      issues.push(`${label} has invalid lastDetected timestamp.`);
    }

    for (const sample of sampleUrls) {
      const sampleUrl = sanitizeSampleUrl(sample);
      if (!sampleUrl) {
        issues.push(`${label} sampleUrls must contain URL strings.`);
        continue;
      }
      if (!sampleUrl.startsWith(SITE_URL)) {
        issues.push(`${label} sample URL is outside ${SITE_URL}: ${sampleUrl}.`);
      }
    }

    const blockingCategory = BLOCKING_ERROR_CATEGORIES.includes(errorCategory as any);
    if (Number.isFinite(openErrorCount) && openErrorCount > 0) {
      issues.push(`${label} ${engine || "engine"} has ${openErrorCount} open crawl error(s).`);
    }
    if (Number.isFinite(priorityRouteErrorCount) && priorityRouteErrorCount > 0) {
      issues.push(`${label} ${engine || "engine"} has ${priorityRouteErrorCount} priority-route crawl error(s).`);
    }
    if (blockingCategory && (isOpenStatus(status) || affectedUrls > 0)) {
      issues.push(`${label} ${engine || "engine"} has blocking crawl category ${errorCategory}.`);
    }

    const rowPasses =
      REQUIRED_CRAWL_ERROR_ENGINES.includes(engine as CrawlErrorEngine) &&
      /crawl/i.test(reportType) &&
      siteUrl === SITE_URL &&
      Number.isFinite(openErrorCount) &&
      openErrorCount === 0 &&
      Number.isFinite(priorityRouteErrorCount) &&
      priorityRouteErrorCount === 0 &&
      Number.isFinite(affectedUrls) &&
      affectedUrls === 0 &&
      (errorCategory === "none" || !blockingCategory) &&
      isPassingStatus(status, validationState) &&
      !!recommendedAction &&
      hasValidOptionalTimestamp(lastDetected) &&
      ageDays != null &&
      ageDays <= MAX_EVIDENCE_AGE_DAYS;

    if (rowPasses) seenPassing.add(engine.toLowerCase());

    rows.push({
      engine,
      reportType,
      openErrorCount,
      priorityRouteErrorCount,
      affectedUrls,
      status,
      errorCategory,
    });
  });

  for (const engine of REQUIRED_CRAWL_ERROR_ENGINES) {
    if (!seenPassing.has(engine.toLowerCase())) {
      issues.push(`Missing passing crawl-error evidence for ${engine}.`);
    }
  }

  return { issues, rows };
}

export function renderCrawlErrorEvidenceReport(audit: CrawlErrorEvidenceAudit): string {
  const lines = [
    "# Crawl Error Evidence Audit",
    "",
    "| Engine | Report | Open errors | Priority-route errors | Affected URLs | Category | Status |",
    "| --- | --- | ---: | ---: | ---: | --- | --- |",
  ];

  for (const row of audit.rows) {
    lines.push(
      `| ${row.engine || "-"} | ${row.reportType || "-"} | ${
        Number.isFinite(row.openErrorCount) ? row.openErrorCount : "-"
      } | ${Number.isFinite(row.priorityRouteErrorCount) ? row.priorityRouteErrorCount : "-"} | ${
        Number.isFinite(row.affectedUrls) ? row.affectedUrls : "-"
      } | ${row.errorCategory || "-"} | ${row.status || "-"} |`
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
