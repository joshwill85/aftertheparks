import { PRIORITY_SEARCH_INDEX_PATHS } from "@/lib/seo/searchIndexEvidence";

export type IndexNowStatusEvidenceRecord = Record<string, unknown>;

export type IndexNowStatusEvidenceRow = {
  path: string;
  submitted: boolean;
  accepted: boolean;
  processed: boolean;
  status: string;
  httpStatus: number;
};

export type IndexNowStatusEvidenceAudit = {
  issues: string[];
  rows: IndexNowStatusEvidenceRow[];
};

export const PRIORITY_INDEXNOW_STATUS_PATHS = [...PRIORITY_SEARCH_INDEX_PATHS] as const;

const SITE_ORIGIN = "https://aftertheparks.com";
const MAX_EVIDENCE_AGE_DAYS = 8;
const MAX_SUBMISSION_AGE_DAYS = 14;

const FIELD_ALIASES = {
  checkedAt: ["checkedAt", "datetime", "timestamp", "exportedAt"],
  source: ["source", "engine", "tool", "dashboard"],
  url: ["url", "path", "submittedUrl"],
  submittedAt: ["submittedAt", "submissionTime", "sentAt"],
  submitted: ["submitted", "isSubmitted"],
  accepted: ["accepted", "isAccepted"],
  processed: ["processed", "isProcessed", "discovered"],
  status: ["status", "state", "indexNowStatus"],
  httpStatus: ["httpStatus", "statusCode", "responseStatus"],
  lastCrawled: ["lastCrawled", "lastFetched", "lastSeen"],
  error: ["error", "errorMessage", "reason"],
  retryAfter: ["retryAfter", "retryAt"],
} as const;

function stringField(record: IndexNowStatusEvidenceRecord, fields: readonly string[]): string {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function booleanField(record: IndexNowStatusEvidenceRecord, fields: readonly string[]): boolean {
  for (const field of fields) {
    const value = record[field];
    if (value === true || value === "true" || value === "PASS" || value === "pass") return true;
    if (value === false || value === "false" || value === "FAIL" || value === "fail") return false;
  }
  return false;
}

function numberField(record: IndexNowStatusEvidenceRecord, fields: readonly string[]): number {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return Number.NaN;
}

function evidenceAgeDays(value: string, now: Date): number | null {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return (now.getTime() - timestamp) / 86_400_000;
}

function pathFromUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value, SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN) return "";
    return `${url.pathname || "/"}${url.search}`.replace(/\/$/, "") || "/";
  } catch {
    return value.startsWith("/") ? value.replace(/\/$/, "") || "/" : "";
  }
}

function processedFromStatus(record: IndexNowStatusEvidenceRecord): boolean {
  if (booleanField(record, FIELD_ALIASES.processed)) return true;
  const status = stringField(record, FIELD_ALIASES.status).toLowerCase();
  return /processed|accepted|submitted|discovered|success|ok/.test(status) &&
    !/rejected|failed|error|blocked|rate|429/.test(status);
}

function isGoodHttpStatus(status: number): boolean {
  return Number.isFinite(status) && ((status >= 200 && status < 300) || status === 304);
}

export function parseIndexNowStatusEvidenceLines(
  text: string
): IndexNowStatusEvidenceRecord[] {
  const records: IndexNowStatusEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") {
        records.push(parsed as IndexNowStatusEvidenceRecord);
      }
    } catch {
      // Allow copied Bing Webmaster Tools headings and notes around JSONL records.
    }
  }
  return records;
}

export function auditIndexNowStatusEvidence(
  records: IndexNowStatusEvidenceRecord[],
  options: { now?: Date } = {}
): IndexNowStatusEvidenceAudit {
  const now = options.now ?? new Date();
  const issues: string[] = [];
  const rows: IndexNowStatusEvidenceRow[] = [];
  const seenPassing = new Set<string>();

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    const checkedAt = stringField(record, FIELD_ALIASES.checkedAt);
    const source = stringField(record, FIELD_ALIASES.source);
    const path = pathFromUrl(stringField(record, FIELD_ALIASES.url));
    const submittedAt = stringField(record, FIELD_ALIASES.submittedAt);
    const submitted = booleanField(record, FIELD_ALIASES.submitted);
    const accepted = booleanField(record, FIELD_ALIASES.accepted);
    const processed = processedFromStatus(record);
    const status = stringField(record, FIELD_ALIASES.status);
    const httpStatus = numberField(record, FIELD_ALIASES.httpStatus);
    const lastCrawled = stringField(record, FIELD_ALIASES.lastCrawled);
    const error = stringField(record, FIELD_ALIASES.error);
    const retryAfter = stringField(record, FIELD_ALIASES.retryAfter);

    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (!aliases.some((alias) => alias in record)) issues.push(`${label} is missing ${field}.`);
    }

    if (!/Bing Webmaster Tools IndexNow/i.test(source)) {
      issues.push(`${label} source should be Bing Webmaster Tools IndexNow.`);
    }

    const checkedAge = evidenceAgeDays(checkedAt, now);
    if (checkedAge == null) {
      issues.push(`${label} has invalid checkedAt timestamp.`);
    } else if (checkedAge > MAX_EVIDENCE_AGE_DAYS) {
      issues.push(`${label} is older than ${MAX_EVIDENCE_AGE_DAYS} days.`);
    }

    const submittedAge = evidenceAgeDays(submittedAt, now);
    if (submittedAge == null) {
      issues.push(`${label} has invalid submittedAt timestamp.`);
    } else if (submittedAge > MAX_SUBMISSION_AGE_DAYS) {
      issues.push(`${label} IndexNow submission is older than ${MAX_SUBMISSION_AGE_DAYS} days.`);
    }

    if (!path) {
      issues.push(`${label} has unsupported URL; expected an ${SITE_ORIGIN} URL.`);
    } else if (!PRIORITY_INDEXNOW_STATUS_PATHS.includes(path as any)) {
      issues.push(`${label} has non-priority IndexNow URL: ${path}.`);
    }

    if (!submitted) issues.push(`${label} ${path || "URL"} is not submitted in IndexNow evidence.`);
    if (!accepted) issues.push(`${label} ${path || "URL"} is not accepted in IndexNow evidence.`);
    if (!processed) issues.push(`${label} ${path || "URL"} is not processed in IndexNow evidence.`);
    if (!isGoodHttpStatus(httpStatus)) {
      issues.push(`${label} ${path || "URL"} has IndexNow HTTP status ${Number.isFinite(httpStatus) ? httpStatus : "invalid"}.`);
    }
    if (/rejected|failed|error|blocked|rate|429/i.test(status)) {
      issues.push(`${label} ${path || "URL"} has failing IndexNow status: ${status}.`);
    }
    if (error) issues.push(`${label} ${path || "URL"} has IndexNow error: ${error}.`);
    for (const [field, value] of [
      ["lastCrawled", lastCrawled],
      ["retryAfter", retryAfter],
    ] as const) {
      if (value && !Number.isFinite(Date.parse(value))) {
        issues.push(`${label} has invalid ${field} timestamp.`);
      }
    }

    const rowPasses =
      /Bing Webmaster Tools IndexNow/i.test(source) &&
      !!path &&
      PRIORITY_INDEXNOW_STATUS_PATHS.includes(path as any) &&
      submitted &&
      accepted &&
      processed &&
      isGoodHttpStatus(httpStatus) &&
      !error &&
      !/rejected|failed|error|blocked|rate|429/i.test(status) &&
      checkedAge != null &&
      checkedAge <= MAX_EVIDENCE_AGE_DAYS &&
      submittedAge != null &&
      submittedAge <= MAX_SUBMISSION_AGE_DAYS;

    if (rowPasses) seenPassing.add(path);

    rows.push({ path, submitted, accepted, processed, status, httpStatus });
  });

  for (const path of PRIORITY_INDEXNOW_STATUS_PATHS) {
    if (!seenPassing.has(path)) {
      issues.push(`Missing passing IndexNow status evidence for ${path}.`);
    }
  }

  return { issues, rows };
}

export function renderIndexNowStatusEvidenceReport(
  audit: IndexNowStatusEvidenceAudit
): string {
  const lines = [
    "# IndexNow Status Evidence Audit",
    "",
    "| Path | Submitted | Accepted | Processed | Status | HTTP status |",
    "| --- | --- | --- | --- | --- | ---: |",
  ];

  for (const row of audit.rows) {
    lines.push(
      `| ${row.path || "-"} | ${row.submitted ? "yes" : "no"} | ${
        row.accepted ? "yes" : "no"
      } | ${row.processed ? "yes" : "no"} | ${row.status || "-"} | ${
        Number.isFinite(row.httpStatus) ? row.httpStatus : "-"
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
