export type SitemapStatusEngine = "Google Search Console" | "Bing Webmaster Tools";

export type SitemapStatusEvidenceRecord = Record<string, unknown>;

export type SitemapStatusEvidenceRow = {
  engine: string;
  sitemapUrl: string;
  submitted: boolean;
  processed: boolean;
  discoveredUrls: number;
  submittedUrls: number;
  indexedUrls: number;
  errors: number;
  warnings: number;
  lastDownloaded: string;
};

export type SitemapStatusEvidenceAudit = {
  issues: string[];
  rows: SitemapStatusEvidenceRow[];
};

export const REQUIRED_SITEMAP_STATUS_ENGINES: SitemapStatusEngine[] = [
  "Google Search Console",
  "Bing Webmaster Tools",
];

export const CANONICAL_SITEMAP_URL = "https://aftertheparks.com/sitemap.xml";

const MAX_EVIDENCE_AGE_DAYS = 8;
const MIN_SITEMAP_URL_COUNT = 60;

const FIELD_ALIASES = {
  checkedAt: ["checkedAt", "datetime", "timestamp", "exportedAt"],
  engine: ["engine", "source", "tool", "dashboard"],
  sitemapUrl: ["sitemapUrl", "url", "sitemap", "feedUrl"],
  submitted: ["submitted", "isSubmitted", "submittedToEngine"],
  processed: ["processed", "isProcessed", "processedByEngine"],
  status: ["status", "sitemapStatus", "state"],
  discoveredUrls: ["discoveredUrls", "discoveredUrlCount", "urlsDiscovered", "knownUrls"],
  submittedUrls: ["submittedUrls", "submittedUrlCount", "urlsSubmitted"],
  indexedUrls: ["indexedUrls", "indexedUrlCount", "urlsIndexed"],
  errors: ["errors", "errorCount"],
  warnings: ["warnings", "warningCount"],
  lastSubmitted: ["lastSubmitted", "submittedAt", "lastSubmissionTime"],
  lastDownloaded: ["lastDownloaded", "lastFetched", "lastRead", "lastProcessed"],
} as const;

function stringField(record: SitemapStatusEvidenceRecord, fields: readonly string[]): string {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function booleanField(record: SitemapStatusEvidenceRecord, fields: readonly string[]): boolean {
  for (const field of fields) {
    const value = record[field];
    if (value === true || value === "true" || value === "PASS" || value === "pass") return true;
    if (value === false || value === "false" || value === "FAIL" || value === "fail") return false;
  }
  return false;
}

function numberField(record: SitemapStatusEvidenceRecord, fields: readonly string[]): number {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return Number.NaN;
}

function evidenceAgeDays(checkedAt: string, now: Date): number | null {
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp)) return null;
  return (now.getTime() - timestamp) / 86_400_000;
}

function canonicalSitemapUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return value;
  }
}

function processedFromRecord(record: SitemapStatusEvidenceRecord): boolean {
  if (booleanField(record, FIELD_ALIASES.processed)) return true;
  const status = stringField(record, FIELD_ALIASES.status).toLowerCase();
  return /success|processed|valid|ok|complete|read/.test(status) && !/error|failed|invalid/.test(status);
}

function engineKey(engine: string): string {
  return engine.toLowerCase();
}

export function parseSitemapStatusEvidenceLines(
  text: string
): SitemapStatusEvidenceRecord[] {
  const records: SitemapStatusEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") records.push(parsed as SitemapStatusEvidenceRecord);
    } catch {
      // Allow copied dashboard labels and notes around JSONL rows.
    }
  }
  return records;
}

export function auditSitemapStatusEvidence(
  records: SitemapStatusEvidenceRecord[],
  options: { now?: Date } = {}
): SitemapStatusEvidenceAudit {
  const now = options.now ?? new Date();
  const issues: string[] = [];
  const rows: SitemapStatusEvidenceRow[] = [];
  const seenPassing = new Set<string>();

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    const checkedAt = stringField(record, FIELD_ALIASES.checkedAt);
    const engine = stringField(record, FIELD_ALIASES.engine);
    const sitemapUrl = canonicalSitemapUrl(stringField(record, FIELD_ALIASES.sitemapUrl));
    const submitted = booleanField(record, FIELD_ALIASES.submitted);
    const processed = processedFromRecord(record);
    const discoveredUrls = numberField(record, FIELD_ALIASES.discoveredUrls);
    const submittedUrls = numberField(record, FIELD_ALIASES.submittedUrls);
    const indexedUrls = numberField(record, FIELD_ALIASES.indexedUrls);
    const errors = numberField(record, FIELD_ALIASES.errors);
    const warnings = numberField(record, FIELD_ALIASES.warnings);
    const lastSubmitted = stringField(record, FIELD_ALIASES.lastSubmitted);
    const lastDownloaded = stringField(record, FIELD_ALIASES.lastDownloaded);

    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (field === "status") continue;
      if (!aliases.some((alias) => alias in record)) issues.push(`${label} is missing ${field}.`);
    }

    const ageDays = evidenceAgeDays(checkedAt, now);
    if (ageDays == null) {
      issues.push(`${label} has invalid checkedAt timestamp.`);
    } else if (ageDays > MAX_EVIDENCE_AGE_DAYS) {
      issues.push(`${label} is older than ${MAX_EVIDENCE_AGE_DAYS} days.`);
    }

    if (!REQUIRED_SITEMAP_STATUS_ENGINES.includes(engine as SitemapStatusEngine)) {
      issues.push(`${label} has unsupported sitemap status engine: ${engine || "missing"}.`);
    }

    if (sitemapUrl !== CANONICAL_SITEMAP_URL) {
      issues.push(`${label} must report the canonical sitemap URL ${CANONICAL_SITEMAP_URL}.`);
    }

    if (!submitted) issues.push(`${label} ${engine || "engine"} sitemap is not submitted.`);
    if (!processed) issues.push(`${label} ${engine || "engine"} sitemap is not processed successfully.`);

    if (!Number.isFinite(discoveredUrls) || discoveredUrls < MIN_SITEMAP_URL_COUNT) {
      issues.push(`${label} discoveredUrls must be at least ${MIN_SITEMAP_URL_COUNT}.`);
    }
    if (!Number.isFinite(submittedUrls) || submittedUrls < MIN_SITEMAP_URL_COUNT) {
      issues.push(`${label} submittedUrls must be at least ${MIN_SITEMAP_URL_COUNT}.`);
    }
    if (!Number.isFinite(indexedUrls) || indexedUrls < 0) {
      issues.push(`${label} indexedUrls must be a non-negative number.`);
    }
    if (Number.isFinite(indexedUrls) && Number.isFinite(discoveredUrls) && indexedUrls > discoveredUrls) {
      issues.push(`${label} indexedUrls cannot exceed discoveredUrls.`);
    }
    if (!Number.isFinite(errors) || errors !== 0) {
      issues.push(`${label} ${engine || "engine"} sitemap has ${Number.isFinite(errors) ? errors : "invalid"} errors.`);
    }
    if (!Number.isFinite(warnings) || warnings < 0) {
      issues.push(`${label} warnings must be a non-negative number.`);
    }

    for (const [field, value] of [
      ["lastSubmitted", lastSubmitted],
      ["lastDownloaded", lastDownloaded],
    ] as const) {
      if (!value) {
        issues.push(`${label} is missing ${field}.`);
      } else if (!Number.isFinite(Date.parse(value))) {
        issues.push(`${label} has invalid ${field} timestamp.`);
      }
    }

    const rowPasses =
      REQUIRED_SITEMAP_STATUS_ENGINES.includes(engine as SitemapStatusEngine) &&
      sitemapUrl === CANONICAL_SITEMAP_URL &&
      submitted &&
      processed &&
      Number.isFinite(discoveredUrls) &&
      discoveredUrls >= MIN_SITEMAP_URL_COUNT &&
      Number.isFinite(submittedUrls) &&
      submittedUrls >= MIN_SITEMAP_URL_COUNT &&
      Number.isFinite(indexedUrls) &&
      indexedUrls >= 0 &&
      Number.isFinite(errors) &&
      errors === 0 &&
      Number.isFinite(warnings) &&
      warnings >= 0 &&
      !!lastSubmitted &&
      Number.isFinite(Date.parse(lastSubmitted)) &&
      !!lastDownloaded &&
      Number.isFinite(Date.parse(lastDownloaded)) &&
      ageDays != null &&
      ageDays <= MAX_EVIDENCE_AGE_DAYS;

    if (rowPasses) seenPassing.add(engineKey(engine));

    rows.push({
      engine,
      sitemapUrl,
      submitted,
      processed,
      discoveredUrls,
      submittedUrls,
      indexedUrls,
      errors,
      warnings,
      lastDownloaded,
    });
  });

  for (const engine of REQUIRED_SITEMAP_STATUS_ENGINES) {
    if (!seenPassing.has(engineKey(engine))) {
      issues.push(`Missing passing sitemap status evidence for ${engine}.`);
    }
  }

  return { issues, rows };
}

export function renderSitemapStatusEvidenceReport(audit: SitemapStatusEvidenceAudit): string {
  const lines = [
    "# Sitemap Status Evidence Audit",
    "",
    "| Engine | Sitemap | Submitted | Processed | Discovered URLs | Submitted URLs | Indexed URLs | Errors | Warnings | Last downloaded |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const row of audit.rows) {
    lines.push(
      `| ${row.engine || "-"} | ${row.sitemapUrl || "-"} | ${row.submitted ? "yes" : "no"} | ${
        row.processed ? "yes" : "no"
      } | ${Number.isFinite(row.discoveredUrls) ? row.discoveredUrls : "-"} | ${
        Number.isFinite(row.submittedUrls) ? row.submittedUrls : "-"
      } | ${Number.isFinite(row.indexedUrls) ? row.indexedUrls : "-"} | ${
        Number.isFinite(row.errors) ? row.errors : "-"
      } | ${Number.isFinite(row.warnings) ? row.warnings : "-"} | ${row.lastDownloaded || "-"} |`
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
