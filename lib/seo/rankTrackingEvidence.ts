import {
  PRIORITY_RANK_TRACKING_QUERIES,
  type RankIntent,
  type RankPageType,
} from "@/lib/seo/measurement";

export type RankTrackingEngine = "Google" | "Bing";

export type RankTrackingEvidenceRecord = Record<string, unknown>;

export type RankTrackingEvidenceRow = {
  engine: string;
  query: string;
  expectedCanonicalPath: string;
  afterTheParksFound: boolean;
  observedPosition: number | null;
  observedAfterTheParksUrl: string;
};

export type RankTrackingEvidenceAudit = {
  issues: string[];
  rows: RankTrackingEvidenceRow[];
  summary: {
    engines: string[];
    totalQueries: number;
    foundCount: number;
    topTenCount: number;
  };
};

const VALID_ENGINES: RankTrackingEngine[] = ["Google", "Bing"];
const MAX_EVIDENCE_AGE_DAYS = 8;

function stringField(record: RankTrackingEvidenceRecord, field: string): string {
  const value = record[field];
  return typeof value === "string" ? value.trim() : "";
}

function booleanField(record: RankTrackingEvidenceRecord, field: string): boolean {
  return record[field] === true;
}

function numberOrNullField(record: RankTrackingEvidenceRecord, field: string): number | null {
  const value = record[field];
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function canonicalFromObservedUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.pathname || "/"}${parsed.search}`;
  } catch {
    return url.startsWith("/") ? url : "";
  }
}

function evidenceAgeDays(checkedAt: string, now: Date): number | null {
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp)) return null;
  return (now.getTime() - timestamp) / 86_400_000;
}

function priorityKey(query: string): string {
  return query.trim().toLowerCase();
}

const PRIORITY_BY_QUERY = new Map(
  PRIORITY_RANK_TRACKING_QUERIES.map((query) => [priorityKey(query.query), query])
);

export function parseRankTrackingEvidenceLines(text: string): RankTrackingEvidenceRecord[] {
  const records: RankTrackingEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") {
        records.push(parsed as RankTrackingEvidenceRecord);
      }
    } catch {
      // Allow notes, pasted tracker headers, or Markdown around the JSONL.
    }
  }
  return records;
}

export function auditRankTrackingEvidence(
  records: RankTrackingEvidenceRecord[],
  options: { now?: Date } = {}
): RankTrackingEvidenceAudit {
  const now = options.now ?? new Date();
  const issues: string[] = [];
  const rows: RankTrackingEvidenceRow[] = [];
  const observedEngines = new Set<string>();
  const seenByEngine = new Map<string, Set<string>>();

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    const checkedAt = stringField(record, "checkedAt");
    const engine = stringField(record, "engine");
    const query = stringField(record, "query");
    const expectedCanonicalPath = stringField(record, "expectedCanonicalPath");
    const pageType = stringField(record, "pageType") as RankPageType | "";
    const intent = stringField(record, "intent") as RankIntent | "";
    const afterTheParksFound = booleanField(record, "afterTheParksFound");
    const observedAfterTheParksUrl = stringField(record, "observedAfterTheParksUrl");
    const observedPosition = numberOrNullField(record, "observedPosition");
    const bestCompetitorUrl = stringField(record, "bestCompetitorUrl");

    for (const field of [
      "checkedAt",
      "engine",
      "query",
      "expectedCanonicalPath",
      "pageType",
      "intent",
      "afterTheParksFound",
      "observedAfterTheParksUrl",
      "observedPosition",
      "bestCompetitorUrl",
    ]) {
      if (!(field in record)) issues.push(`${label} is missing ${field}.`);
    }

    if (!VALID_ENGINES.includes(engine as RankTrackingEngine)) {
      issues.push(`${label} has unsupported rank engine: ${engine || "missing"}.`);
    } else {
      observedEngines.add(engine);
      const seen = seenByEngine.get(engine) ?? new Set<string>();
      if (query) seen.add(priorityKey(query));
      seenByEngine.set(engine, seen);
    }

    const ageDays = evidenceAgeDays(checkedAt, now);
    if (ageDays == null) {
      issues.push(`${label} has invalid checkedAt timestamp.`);
    } else if (ageDays > MAX_EVIDENCE_AGE_DAYS) {
      issues.push(`${label} is older than ${MAX_EVIDENCE_AGE_DAYS} days.`);
    }

    const priority = PRIORITY_BY_QUERY.get(priorityKey(query));
    if (!priority) {
      issues.push(`${label} has unknown priority query: ${query || "missing"}.`);
    } else {
      if (expectedCanonicalPath !== priority.canonicalPath) {
        issues.push(
          `${label} expectedCanonicalPath must be ${priority.canonicalPath} for ${priority.query}.`
        );
      }
      if (pageType !== priority.pageType) {
        issues.push(`${label} pageType must be ${priority.pageType} for ${priority.query}.`);
      }
      if (intent !== priority.intent) {
        issues.push(`${label} intent must be ${priority.intent} for ${priority.query}.`);
      }
      if (
        priority.intent === "competitor_overlap" &&
        !/magicalresortguide\.com|mamasonvacation\.com/i.test(bestCompetitorUrl)
      ) {
        issues.push(`${label} competitor-overlap query must record a competitor URL.`);
      }
    }

    if (afterTheParksFound) {
      if (!observedAfterTheParksUrl) {
        issues.push(`${label} found After the Parks but has no observedAfterTheParksUrl.`);
      }
      const observedPath = canonicalFromObservedUrl(observedAfterTheParksUrl);
      if (expectedCanonicalPath && observedPath && observedPath !== expectedCanonicalPath) {
        issues.push(
          `${label} has wrong canonical rank URL: observed ${observedPath}, expected ${expectedCanonicalPath}.`
        );
      }
      if (observedPosition == null || observedPosition < 1 || observedPosition > 100) {
        issues.push(`${label} found After the Parks but observedPosition is not 1-100.`);
      }
    }

    rows.push({
      engine,
      query,
      expectedCanonicalPath,
      afterTheParksFound,
      observedPosition,
      observedAfterTheParksUrl,
    });
  });

  for (const engine of observedEngines) {
    const seen = seenByEngine.get(engine) ?? new Set<string>();
    for (const priority of PRIORITY_RANK_TRACKING_QUERIES) {
      if (!seen.has(priorityKey(priority.query))) {
        issues.push(`${engine} evidence is missing priority query: ${priority.query}.`);
      }
    }
  }

  const foundRows = rows.filter((row) => row.afterTheParksFound);
  return {
    issues,
    rows,
    summary: {
      engines: [...observedEngines].sort(),
      totalQueries: PRIORITY_RANK_TRACKING_QUERIES.length,
      foundCount: foundRows.length,
      topTenCount: foundRows.filter(
        (row) => row.observedPosition != null && row.observedPosition <= 10
      ).length,
    },
  };
}

export function renderRankTrackingEvidenceReport(audit: RankTrackingEvidenceAudit): string {
  const lines = [
    "# Rank Tracking Evidence Audit",
    "",
    `Engines: ${audit.summary.engines.join(", ") || "none"}`,
    `Priority queries: ${audit.summary.totalQueries}`,
    `After the Parks found: ${audit.summary.foundCount}`,
    `Top 10 appearances: ${audit.summary.topTenCount}`,
    "",
    "| Engine | Query | Expected page | Found | Position | Observed URL |",
    "| --- | --- | --- | --- | ---: | --- |",
  ];

  for (const row of audit.rows) {
    lines.push(
      `| ${row.engine || "-"} | ${row.query || "-"} | ${
        row.expectedCanonicalPath || "-"
      } | ${row.afterTheParksFound ? "yes" : "no"} | ${
        row.observedPosition ?? "-"
      } | ${row.observedAfterTheParksUrl || "-"} |`
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
