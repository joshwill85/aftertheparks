export type SearchIndexEngine = "Google Search Console" | "Bing Webmaster Tools";

export type SearchIndexEvidenceRecord = Record<string, unknown>;

export type SearchIndexEvidenceRow = {
  engine: string;
  path: string;
  indexed: boolean;
  sitemapSubmitted: boolean;
  crawlAllowed: boolean;
  fetchSuccessful: boolean;
};

export type SearchIndexEvidenceAudit = {
  issues: string[];
  rows: SearchIndexEvidenceRow[];
};

export const REQUIRED_SEARCH_INDEX_ENGINES: SearchIndexEngine[] = [
  "Google Search Console",
  "Bing Webmaster Tools",
];

export const PRIORITY_SEARCH_INDEX_PATHS = [
  "/",
  "/today",
  "/tonight",
  "/activities",
  "/resorts",
  "/disney-world-resort-activity-calendars",
  "/source-and-accuracy-policy",
  "/activities",
  "/resorts?no_ticket_friendly=true",
  "/activities?area=disney-springs",
  "/activities/movies-under-the-stars",
  "/resorts/polynesian-village-resort",
] as const;

const MAX_EVIDENCE_AGE_DAYS = 8;

const FIELD_ALIASES = {
  checkedAt: ["checkedAt", "datetime", "timestamp", "inspectedAt"],
  engine: ["engine", "source", "tool", "dashboard"],
  path: ["path", "url", "inspectionUrl", "page", "route"],
  sitemapSubmitted: ["sitemapSubmitted", "submittedInSitemap", "sitemapStatusOk"],
  indexed: ["indexed", "isIndexed", "indexStatusOk"],
  crawlAllowed: ["crawlAllowed", "robotsAllowed", "robotsTxtAllowed"],
  fetchSuccessful: ["fetchSuccessful", "pageFetchSuccessful", "fetchOk"],
  coverageState: ["coverageState", "indexStatus", "status"],
  robotsState: ["robotsState", "robotsTxtState"],
  indexingState: ["indexingState"],
  pageFetchState: ["pageFetchState", "fetchState"],
} as const;

function stringField(record: SearchIndexEvidenceRecord, fields: readonly string[]): string {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function booleanField(record: SearchIndexEvidenceRecord, fields: readonly string[]): boolean {
  for (const field of fields) {
    const value = record[field];
    if (value === true || value === "true" || value === "PASS" || value === "pass") return true;
    if (value === false || value === "false" || value === "FAIL" || value === "fail") return false;
  }
  return false;
}

function pathFromRecord(record: SearchIndexEvidenceRecord): string {
  const value = stringField(record, FIELD_ALIASES.path);
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return `${parsed.pathname || "/"}${parsed.search}`;
  } catch {
    return value.startsWith("/") ? value : "";
  }
}

function evidenceAgeDays(checkedAt: string, now: Date): number | null {
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp)) return null;
  return (now.getTime() - timestamp) / 86_400_000;
}

function indexedFromStates(record: SearchIndexEvidenceRecord): boolean {
  if (booleanField(record, FIELD_ALIASES.indexed)) return true;
  const coverage = stringField(record, FIELD_ALIASES.coverageState).toLowerCase();
  const indexing = stringField(record, FIELD_ALIASES.indexingState).toLowerCase();
  return (
    /submitted and indexed|indexed|url is on google|success/.test(coverage) &&
    !/not indexed|excluded|blocked|error|failed/.test(coverage) &&
    !/indexing_disallowed|blocked/.test(indexing)
  );
}

function crawlAllowedFromStates(record: SearchIndexEvidenceRecord): boolean {
  if (booleanField(record, FIELD_ALIASES.crawlAllowed)) return true;
  const robots = stringField(record, FIELD_ALIASES.robotsState).toLowerCase();
  const indexing = stringField(record, FIELD_ALIASES.indexingState).toLowerCase();
  return (
    /allowed|indexing_allowed|ok|pass/.test(`${robots} ${indexing}`) &&
    !/blocked|disallowed|noindex/.test(`${robots} ${indexing}`)
  );
}

function fetchSuccessfulFromStates(record: SearchIndexEvidenceRecord): boolean {
  if (booleanField(record, FIELD_ALIASES.fetchSuccessful)) return true;
  const fetchState = stringField(record, FIELD_ALIASES.pageFetchState).toLowerCase();
  return /successful|success|ok|pass|fetched/.test(fetchState) && !/failed|blocked/.test(fetchState);
}

function evidenceKey(engine: string, path: string): string {
  return `${engine}::${path}`.toLowerCase();
}

export function parseSearchIndexEvidenceLines(text: string): SearchIndexEvidenceRecord[] {
  const records: SearchIndexEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") records.push(parsed as SearchIndexEvidenceRecord);
    } catch {
      // Allow copied dashboard headings and notes around JSONL records.
    }
  }
  return records;
}

export function auditSearchIndexEvidence(
  records: SearchIndexEvidenceRecord[],
  options: { now?: Date } = {}
): SearchIndexEvidenceAudit {
  const now = options.now ?? new Date();
  const issues: string[] = [];
  const rows: SearchIndexEvidenceRow[] = [];
  const seenPassing = new Set<string>();

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    const checkedAt = stringField(record, FIELD_ALIASES.checkedAt);
    const engine = stringField(record, FIELD_ALIASES.engine);
    const path = pathFromRecord(record);
    const sitemapSubmitted = booleanField(record, FIELD_ALIASES.sitemapSubmitted);
    const indexed = indexedFromStates(record);
    const crawlAllowed = crawlAllowedFromStates(record);
    const fetchSuccessful = fetchSuccessfulFromStates(record);

    if (!checkedAt) issues.push(`${label} is missing checkedAt.`);
    if (!engine) issues.push(`${label} is missing engine.`);
    if (!path) issues.push(`${label} is missing path or URL.`);

    const ageDays = evidenceAgeDays(checkedAt, now);
    if (ageDays == null) {
      issues.push(`${label} has invalid checkedAt timestamp.`);
    } else if (ageDays > MAX_EVIDENCE_AGE_DAYS) {
      issues.push(`${label} is older than ${MAX_EVIDENCE_AGE_DAYS} days.`);
    }

    if (!REQUIRED_SEARCH_INDEX_ENGINES.includes(engine as SearchIndexEngine)) {
      issues.push(`${label} has unsupported search index engine: ${engine || "missing"}.`);
    }

    if (!PRIORITY_SEARCH_INDEX_PATHS.includes(path as any)) {
      issues.push(`${label} has non-priority search index path: ${path || "missing"}.`);
    }

    if (!sitemapSubmitted) {
      issues.push(`${label} ${engine || "engine"} ${path || "path"} is not sitemap-submitted.`);
    }
    if (!indexed) {
      issues.push(`${label} ${engine || "engine"} ${path || "path"} is not indexed.`);
    }
    if (!crawlAllowed) {
      issues.push(`${label} ${engine || "engine"} ${path || "path"} is not crawl-allowed.`);
    }
    if (!fetchSuccessful) {
      issues.push(`${label} ${engine || "engine"} ${path || "path"} fetch was not successful.`);
    }

    if (sitemapSubmitted && indexed && crawlAllowed && fetchSuccessful) {
      seenPassing.add(evidenceKey(engine, path));
    }

    rows.push({
      engine,
      path,
      indexed,
      sitemapSubmitted,
      crawlAllowed,
      fetchSuccessful,
    });
  });

  for (const engine of REQUIRED_SEARCH_INDEX_ENGINES) {
    for (const path of PRIORITY_SEARCH_INDEX_PATHS) {
      if (!seenPassing.has(evidenceKey(engine, path))) {
        issues.push(`Missing passing search index evidence for ${engine} ${path}.`);
      }
    }
  }

  return { issues, rows };
}

export function renderSearchIndexEvidenceReport(audit: SearchIndexEvidenceAudit): string {
  const lines = [
    "# Search Index Evidence Audit",
    "",
    "| Engine | Path | Sitemap submitted | Indexed | Crawl allowed | Fetch successful |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of audit.rows) {
    lines.push(
      `| ${row.engine || "-"} | ${row.path || "-"} | ${
        row.sitemapSubmitted ? "yes" : "no"
      } | ${row.indexed ? "yes" : "no"} | ${row.crawlAllowed ? "yes" : "no"} | ${
        row.fetchSuccessful ? "yes" : "no"
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
