import { CRAWLER_AUDIT_AGENTS } from "@/lib/seo/crawlerAccess";

export type SeoServerLogEntry = Record<string, unknown>;

export type SeoServerLogAuditRow = {
  crawler: string;
  hits: number;
  non200: number;
  slow: number;
  maxLatencyMs: number;
  routes: string[];
};

export type SeoServerLogAudit = {
  issues: string[];
  rows: SeoServerLogAuditRow[];
};

const REQUIRED_LOG_CRAWLERS = [
  "Googlebot",
  "Bingbot",
  "Applebot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Claude-User",
  "Claude-SearchBot",
] as const;

function tokenForCrawler(name: string): string {
  if (name === "Facebook preview") return "facebookexternalhit";
  if (name === "Twitter preview") return "Twitterbot";
  return name;
}

export function classifySeoCrawler(userAgent: string): string | undefined {
  for (const agent of CRAWLER_AUDIT_AGENTS) {
    const token = tokenForCrawler(agent.name);
    if (userAgent.toLowerCase().includes(token.toLowerCase())) {
      return agent.name;
    }
  }
  return undefined;
}

export function parseSeoServerLogLines(text: string): SeoServerLogEntry[] {
  const entries: SeoServerLogEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") entries.push(parsed as SeoServerLogEntry);
    } catch {
      // Ignore non-JSON lines so mixed CLI output can still be pasted into the audit.
    }
  }
  return entries;
}

function stringField(entry: SeoServerLogEntry, fields: string[]): string {
  for (const field of fields) {
    const value = entry[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function numberField(entry: SeoServerLogEntry, fields: string[]): number {
  for (const field of fields) {
    const value = entry[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

function pathFromEntry(entry: SeoServerLogEntry): string {
  const raw = stringField(entry, ["path", "pathname", "route", "url", "requestPath"]);
  if (!raw) return "/";
  try {
    return new URL(raw).pathname || "/";
  } catch {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
}

export function auditSeoServerLogs(
  entries: SeoServerLogEntry[],
  options: { maxLatencyMs?: number } = {}
): SeoServerLogAudit {
  const maxLatencyMs = options.maxLatencyMs ?? 1500;
  const byCrawler = new Map<string, SeoServerLogAuditRow>();

  for (const entry of entries) {
    const userAgent = stringField(entry, ["userAgent", "user_agent", "ua", "requestUserAgent"]);
    const crawler = classifySeoCrawler(userAgent);
    if (!crawler) continue;

    const status = numberField(entry, ["status", "statusCode", "responseStatus"]);
    const latency = numberField(entry, ["durationMs", "responseTimeMs", "latencyMs", "renderMs"]);
    const path = pathFromEntry(entry);
    const row =
      byCrawler.get(crawler) ??
      ({
        crawler,
        hits: 0,
        non200: 0,
        slow: 0,
        maxLatencyMs: 0,
        routes: [],
      } satisfies SeoServerLogAuditRow);

    row.hits += 1;
    if (status && status !== 200) row.non200 += 1;
    if (latency > maxLatencyMs) row.slow += 1;
    row.maxLatencyMs = Math.max(row.maxLatencyMs, latency);
    if (!row.routes.includes(path)) row.routes.push(path);
    byCrawler.set(crawler, row);
  }

  const rows = [...byCrawler.values()].sort((a, b) => a.crawler.localeCompare(b.crawler));
  const issues: string[] = [];
  for (const crawler of REQUIRED_LOG_CRAWLERS) {
    const row = byCrawler.get(crawler);
    if (!row) {
      issues.push(`No log hits found for required crawler: ${crawler}`);
      continue;
    }
    if (row.non200 > 0) issues.push(`${crawler} had ${row.non200} non-200 log response(s).`);
    if (row.slow > 0) {
      issues.push(`${crawler} had ${row.slow} slow log response(s) above ${maxLatencyMs} ms.`);
    }
  }

  return { issues, rows };
}

export function renderSeoServerLogAuditReport(audit: SeoServerLogAudit): string {
  const lines = [
    "# SEO Server Log Crawler Audit",
    "",
    "| Crawler | Hits | Non-200 | Slow | Max latency ms | Routes |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
  ];
  for (const row of audit.rows) {
    lines.push(
      `| ${row.crawler} | ${row.hits} | ${row.non200} | ${row.slow} | ${row.maxLatencyMs} | ${row.routes
        .sort()
        .join(", ")} |`
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
