export type CloudflareAiCrawlEvidenceRecord = Record<string, unknown>;

export type CloudflareAiCrawlEvidenceRow = {
  crawler: string;
  source: string;
  path: string;
  status: number;
  action: string;
  allowed: boolean;
  challenged: boolean;
};

export type CloudflareAiCrawlEvidenceAudit = {
  issues: string[];
  rows: CloudflareAiCrawlEvidenceRow[];
};

export const REQUIRED_CLOUDFLARE_AI_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Applebot",
  "Bingbot",
  "Googlebot",
] as const;

const FIELD_ALIASES = {
  checkedAt: ["checkedAt", "datetime", "timestamp", "eventTime"],
  source: ["source", "product", "dashboard", "eventSource"],
  crawler: ["crawler", "bot", "service", "aiService", "clientBot", "botName"],
  userAgent: ["userAgent", "user_agent", "ua", "requestUserAgent"],
  path: ["path", "pathname", "route", "url", "requestPath"],
  status: ["status", "statusCode", "edgeStatus", "edgeResponseStatus", "originStatus"],
  action: ["action", "outcome", "decision", "securityAction", "wafAction", "edgeAction"],
  contentType: ["contentType", "content_type", "responseContentType"],
} as const;

function stringField(record: CloudflareAiCrawlEvidenceRecord, fields: readonly string[]): string {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function numberField(record: CloudflareAiCrawlEvidenceRecord, fields: readonly string[]): number {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

function pathFromValue(value: string): string {
  if (!value) return "/";
  try {
    return new URL(value).pathname || "/";
  } catch {
    return value.startsWith("/") ? value : `/${value}`;
  }
}

function crawlerFromRecord(record: CloudflareAiCrawlEvidenceRecord): string {
  const explicit = stringField(record, FIELD_ALIASES.crawler);
  if (explicit) return explicit;

  const userAgent = stringField(record, FIELD_ALIASES.userAgent).toLowerCase();
  return (
    REQUIRED_CLOUDFLARE_AI_CRAWLERS.find((crawler) =>
      userAgent.includes(crawler.toLowerCase())
    ) ?? ""
  );
}

function isChallengeOrBlock(action: string, status: number): boolean {
  const normalized = action.toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    status === 429 ||
    /block|blocked|challenge|managed_challenge|js_challenge|captcha|deny|denied/.test(
      normalized
    )
  );
}

function isAllowed(action: string, status: number): boolean {
  const normalized = action.toLowerCase();
  return status >= 200 && status < 300 && !isChallengeOrBlock(action, status) && !/bypass/.test(normalized);
}

export function parseCloudflareAiCrawlEvidenceLines(
  text: string
): CloudflareAiCrawlEvidenceRecord[] {
  const records: CloudflareAiCrawlEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") {
        records.push(parsed as CloudflareAiCrawlEvidenceRecord);
      }
    } catch {
      // Allow dashboard notes and copied table headings around JSONL evidence.
    }
  }
  return records;
}

export function auditCloudflareAiCrawlEvidence(
  records: CloudflareAiCrawlEvidenceRecord[]
): CloudflareAiCrawlEvidenceAudit {
  const issues: string[] = [];
  const rows: CloudflareAiCrawlEvidenceRow[] = [];
  const allowedByCrawler = new Map<string, boolean>();

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    const checkedAt = stringField(record, FIELD_ALIASES.checkedAt);
    const source = stringField(record, FIELD_ALIASES.source);
    const crawler = crawlerFromRecord(record);
    const path = pathFromValue(stringField(record, FIELD_ALIASES.path));
    const status = numberField(record, FIELD_ALIASES.status);
    const action = stringField(record, FIELD_ALIASES.action);
    const contentType = stringField(record, FIELD_ALIASES.contentType);
    const challenged = isChallengeOrBlock(action, status);
    const allowed = isAllowed(action, status);

    for (const field of ["checkedAt", "source", "path", "status", "action"] as const) {
      if (!stringField(record, FIELD_ALIASES[field]) && field !== "status") {
        issues.push(`${label} is missing ${field}.`);
      }
      if (field === "status" && !status) issues.push(`${label} is missing status.`);
    }

    if (!crawler) {
      issues.push(`${label} is missing crawler or recognizable userAgent.`);
    } else if (!REQUIRED_CLOUDFLARE_AI_CRAWLERS.includes(crawler as any)) {
      issues.push(`${label} has unsupported Cloudflare crawler: ${crawler}.`);
    } else if (allowed) {
      allowedByCrawler.set(crawler, true);
    }

    if (status && (status < 200 || status >= 300)) {
      issues.push(`${label} ${crawler || "crawler"} received non-200 Cloudflare status ${status}.`);
    }
    if (challenged) {
      issues.push(`${label} ${crawler || "crawler"} was challenged or blocked by Cloudflare.`);
    }
    if (allowed && contentType && !/html|text|xml|json/i.test(contentType)) {
      issues.push(`${label} ${crawler} received unexpected content type: ${contentType}.`);
    }

    rows.push({
      crawler,
      source,
      path,
      status,
      action,
      allowed,
      challenged,
    });
  });

  for (const crawler of REQUIRED_CLOUDFLARE_AI_CRAWLERS) {
    if (!allowedByCrawler.get(crawler)) {
      issues.push(`Missing allowed Cloudflare evidence for required crawler: ${crawler}.`);
    }
  }

  return { issues, rows };
}

export function renderCloudflareAiCrawlEvidenceReport(
  audit: CloudflareAiCrawlEvidenceAudit
): string {
  const lines = [
    "# Cloudflare AI Crawl Control Evidence Audit",
    "",
    "| Crawler | Source | Path | Status | Action | Allowed | Challenged |",
    "| --- | --- | --- | ---: | --- | --- | --- |",
  ];

  for (const row of audit.rows) {
    lines.push(
      `| ${row.crawler || "-"} | ${row.source || "-"} | ${row.path || "-"} | ${
        row.status || "-"
      } | ${row.action || "-"} | ${row.allowed ? "yes" : "no"} | ${
        row.challenged ? "yes" : "no"
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
