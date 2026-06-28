import {
  PRIORITY_RANK_TRACKING_QUERIES,
  type RankIntent,
  type RankPageType,
} from "@/lib/seo/measurement";

export type QueryVisibilityEngine = "Google Search Console" | "Bing Webmaster Tools";

export type QueryVisibilityEvidenceRecord = Record<string, unknown>;

export type QueryVisibilityEvidenceRow = {
  engine: string;
  query: string;
  canonicalPath: string;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
};

export type QueryVisibilityEvidenceAudit = {
  issues: string[];
  rows: QueryVisibilityEvidenceRow[];
  summary: {
    engines: string[];
    totalQueries: number;
    totalImpressions: number;
    totalClicks: number;
    lowCtrOpportunities: number;
  };
};

export const REQUIRED_QUERY_VISIBILITY_ENGINES: QueryVisibilityEngine[] = [
  "Google Search Console",
  "Bing Webmaster Tools",
];

const MAX_EVIDENCE_AGE_DAYS = 8;
const LOW_CTR_IMPRESSIONS = 100;
const LOW_CTR_MAX_POSITION = 8;
const LOW_CTR_THRESHOLD = 0.01;

const FIELD_ALIASES = {
  checkedAt: ["checkedAt", "datetime", "timestamp", "exportedAt"],
  engine: ["engine", "source", "tool", "dashboard"],
  query: ["query", "keyword", "searchQuery"],
  canonicalPath: ["canonicalPath", "expectedCanonicalPath", "page", "path"],
  pageType: ["pageType", "routeGroup"],
  intent: ["intent", "queryIntent"],
  impressions: ["impressions", "impressionCount"],
  clicks: ["clicks", "clickCount"],
  ctr: ["ctr", "clickThroughRate"],
  averagePosition: ["averagePosition", "avgPosition", "position"],
  topPageUrl: ["topPageUrl", "topPage", "landingPage", "url"],
  country: ["country", "countryCode"],
  device: ["device"],
  searchType: ["searchType", "type"],
  dateRangeDays: ["dateRangeDays", "windowDays"],
} as const;

function stringField(record: QueryVisibilityEvidenceRecord, fields: readonly string[]): string {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function numberField(record: QueryVisibilityEvidenceRecord, fields: readonly string[]): number {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return Number.NaN;
}

function priorityKey(query: string): string {
  return query.trim().toLowerCase();
}

function evidenceKey(engine: string, query: string): string {
  return `${engine}::${priorityKey(query)}`.toLowerCase();
}

function evidenceAgeDays(checkedAt: string, now: Date): number | null {
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp)) return null;
  return (now.getTime() - timestamp) / 86_400_000;
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

function validateMetricShape(
  issues: string[],
  label: string,
  impressions: number,
  clicks: number,
  ctr: number,
  averagePosition: number,
  dateRangeDays: number
) {
  if (!Number.isFinite(impressions) || impressions < 0) {
    issues.push(`${label} impressions must be a non-negative number.`);
  }
  if (!Number.isFinite(clicks) || clicks < 0) {
    issues.push(`${label} clicks must be a non-negative number.`);
  }
  if (Number.isFinite(clicks) && Number.isFinite(impressions) && clicks > impressions) {
    issues.push(`${label} clicks cannot exceed impressions.`);
  }
  if (!Number.isFinite(ctr) || ctr < 0 || ctr > 1) {
    issues.push(`${label} ctr must be between 0 and 1.`);
  }
  if (!Number.isFinite(averagePosition) || averagePosition < 1) {
    issues.push(`${label} averagePosition must be 1 or greater.`);
  }
  if (!Number.isFinite(dateRangeDays) || dateRangeDays < 7 || dateRangeDays > 93) {
    issues.push(`${label} dateRangeDays must be between 7 and 93.`);
  }
}

const PRIORITY_BY_QUERY = new Map(
  PRIORITY_RANK_TRACKING_QUERIES.map((query) => [priorityKey(query.query), query])
);

export function parseQueryVisibilityEvidenceLines(
  text: string
): QueryVisibilityEvidenceRecord[] {
  const records: QueryVisibilityEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") {
        records.push(parsed as QueryVisibilityEvidenceRecord);
      }
    } catch {
      // Allow copied Search Console/Bing table headings and notes around JSONL records.
    }
  }
  return records;
}

export function auditQueryVisibilityEvidence(
  records: QueryVisibilityEvidenceRecord[],
  options: { now?: Date } = {}
): QueryVisibilityEvidenceAudit {
  const now = options.now ?? new Date();
  const issues: string[] = [];
  const rows: QueryVisibilityEvidenceRow[] = [];
  const seenPassing = new Set<string>();
  const observedEngines = new Set<string>();
  let totalImpressions = 0;
  let totalClicks = 0;
  let lowCtrOpportunities = 0;

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    const checkedAt = stringField(record, FIELD_ALIASES.checkedAt);
    const engine = stringField(record, FIELD_ALIASES.engine);
    const query = stringField(record, FIELD_ALIASES.query);
    const canonicalPath = stringField(record, FIELD_ALIASES.canonicalPath);
    const pageType = stringField(record, FIELD_ALIASES.pageType) as RankPageType | "";
    const intent = stringField(record, FIELD_ALIASES.intent) as RankIntent | "";
    const impressions = numberField(record, FIELD_ALIASES.impressions);
    const clicks = numberField(record, FIELD_ALIASES.clicks);
    const ctr = numberField(record, FIELD_ALIASES.ctr);
    const averagePosition = numberField(record, FIELD_ALIASES.averagePosition);
    const topPageUrl = stringField(record, FIELD_ALIASES.topPageUrl);
    const country = stringField(record, FIELD_ALIASES.country);
    const device = stringField(record, FIELD_ALIASES.device);
    const searchType = stringField(record, FIELD_ALIASES.searchType);
    const dateRangeDays = numberField(record, FIELD_ALIASES.dateRangeDays);

    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (!aliases.some((alias) => alias in record)) issues.push(`${label} is missing ${field}.`);
    }

    if (!REQUIRED_QUERY_VISIBILITY_ENGINES.includes(engine as QueryVisibilityEngine)) {
      issues.push(`${label} has unsupported query visibility engine: ${engine || "missing"}.`);
    } else {
      observedEngines.add(engine);
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
      if (canonicalPath !== priority.canonicalPath) {
        issues.push(`${label} canonicalPath must be ${priority.canonicalPath} for ${priority.query}.`);
      }
      if (pageType !== priority.pageType) {
        issues.push(`${label} pageType must be ${priority.pageType} for ${priority.query}.`);
      }
      if (intent !== priority.intent) {
        issues.push(`${label} intent must be ${priority.intent} for ${priority.query}.`);
      }
    }

    const observedPath = canonicalFromObservedUrl(topPageUrl);
    if (topPageUrl && canonicalPath && observedPath && observedPath !== canonicalPath) {
      issues.push(`${label} has wrong canonical query visibility URL: observed ${observedPath}, expected ${canonicalPath}.`);
    }

    if (country && !/^(US|United States|all)$/i.test(country)) {
      issues.push(`${label} country should be US or all for the launch query visibility scorecard.`);
    }
    if (device && !/^(all|desktop|mobile|tablet)$/i.test(device)) {
      issues.push(`${label} has unsupported device segment: ${device}.`);
    }
    if (searchType && !/^(web|all)$/i.test(searchType)) {
      issues.push(`${label} searchType should be web or all.`);
    }

    validateMetricShape(issues, label, impressions, clicks, ctr, averagePosition, dateRangeDays);

    if (Number.isFinite(impressions)) totalImpressions += impressions;
    if (Number.isFinite(clicks)) totalClicks += clicks;

    const hasLowCtrOpportunity =
      Number.isFinite(impressions) &&
      impressions >= LOW_CTR_IMPRESSIONS &&
      Number.isFinite(averagePosition) &&
      averagePosition <= LOW_CTR_MAX_POSITION &&
      Number.isFinite(ctr) &&
      ctr < LOW_CTR_THRESHOLD;

    if (hasLowCtrOpportunity) {
      lowCtrOpportunities += 1;
      issues.push(
        `${label} low CTR opportunity for ${engine || "engine"} "${query || "query"}": ${impressions} impressions, ${clicks} clicks, CTR ${ctr}, averagePosition ${averagePosition}.`
      );
    }

    const rowPasses =
      REQUIRED_QUERY_VISIBILITY_ENGINES.includes(engine as QueryVisibilityEngine) &&
      !!PRIORITY_BY_QUERY.get(priorityKey(query)) &&
      canonicalPath === PRIORITY_BY_QUERY.get(priorityKey(query))?.canonicalPath &&
      pageType === PRIORITY_BY_QUERY.get(priorityKey(query))?.pageType &&
      intent === PRIORITY_BY_QUERY.get(priorityKey(query))?.intent &&
      (!topPageUrl || !observedPath || observedPath === canonicalPath) &&
      Number.isFinite(impressions) &&
      impressions >= 0 &&
      Number.isFinite(clicks) &&
      clicks >= 0 &&
      clicks <= impressions &&
      Number.isFinite(ctr) &&
      ctr >= 0 &&
      ctr <= 1 &&
      Number.isFinite(averagePosition) &&
      averagePosition >= 1 &&
      Number.isFinite(dateRangeDays) &&
      dateRangeDays >= 7 &&
      dateRangeDays <= 93 &&
      ageDays != null &&
      ageDays <= MAX_EVIDENCE_AGE_DAYS;

    if (rowPasses) seenPassing.add(evidenceKey(engine, query));

    rows.push({
      engine,
      query,
      canonicalPath,
      impressions,
      clicks,
      ctr,
      averagePosition,
    });
  });

  for (const engine of REQUIRED_QUERY_VISIBILITY_ENGINES) {
    for (const priority of PRIORITY_RANK_TRACKING_QUERIES) {
      if (!seenPassing.has(evidenceKey(engine, priority.query))) {
        issues.push(`Missing priority query visibility evidence for ${engine}: ${priority.query}.`);
      }
    }
  }

  return {
    issues,
    rows,
    summary: {
      engines: [...observedEngines].sort(),
      totalQueries: PRIORITY_RANK_TRACKING_QUERIES.length,
      totalImpressions,
      totalClicks,
      lowCtrOpportunities,
    },
  };
}

export function renderQueryVisibilityEvidenceReport(
  audit: QueryVisibilityEvidenceAudit
): string {
  const lines = [
    "# Query Visibility Evidence Audit",
    "",
    `Engines: ${audit.summary.engines.join(", ") || "none"}`,
    `Priority queries: ${audit.summary.totalQueries}`,
    `Total impressions: ${audit.summary.totalImpressions}`,
    `Total clicks: ${audit.summary.totalClicks}`,
    `Low CTR opportunities: ${audit.summary.lowCtrOpportunities}`,
    "",
    "| Engine | Query | Canonical page | Impressions | Clicks | CTR | Avg. position |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: |",
  ];

  for (const row of audit.rows) {
    lines.push(
      `| ${row.engine || "-"} | ${row.query || "-"} | ${row.canonicalPath || "-"} | ${
        Number.isFinite(row.impressions) ? row.impressions : "-"
      } | ${Number.isFinite(row.clicks) ? row.clicks : "-"} | ${
        Number.isFinite(row.ctr) ? row.ctr : "-"
      } | ${Number.isFinite(row.averagePosition) ? row.averagePosition : "-"} |`
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
