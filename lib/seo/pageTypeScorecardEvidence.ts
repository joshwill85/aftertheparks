export type SeoPageType =
  | "resort_pages"
  | "activity_pages"
  | "guides"
  | "calendar_hub"
  | "today_tonight";

export type PageTypeScorecardEvidenceRecord = Record<string, unknown>;

export type PageTypeScorecardEvidenceRow = {
  pageType: string;
  indexedCount: number;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
};

export type PageTypeScorecardEvidenceAudit = {
  issues: string[];
  rows: PageTypeScorecardEvidenceRow[];
  summary: {
    pageTypes: string[];
    totalImpressions: number;
    totalClicks: number;
    weightedCtr: number;
  };
};

const REQUIRED_PAGE_TYPES: SeoPageType[] = [
  "resort_pages",
  "activity_pages",
  "guides",
  "calendar_hub",
  "today_tonight",
];
const MAX_EVIDENCE_AGE_DAYS = 8;

function stringField(record: PageTypeScorecardEvidenceRecord, field: string): string {
  const value = record[field];
  return typeof value === "string" ? value.trim() : "";
}

function numberField(record: PageTypeScorecardEvidenceRecord, field: string): number {
  const value = record[field];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return Number.NaN;
}

function arrayField(record: PageTypeScorecardEvidenceRecord, field: string): unknown[] {
  const value = record[field];
  return Array.isArray(value) ? value : [];
}

function objectField(
  record: PageTypeScorecardEvidenceRecord,
  field: string
): Record<string, unknown> {
  const value = record[field];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function evidenceAgeDays(checkedAt: string, now: Date): number | null {
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp)) return null;
  return (now.getTime() - timestamp) / 86_400_000;
}

function validateNonNegativeNumber(
  issues: string[],
  label: string,
  field: string,
  value: number
) {
  if (!Number.isFinite(value) || value < 0) {
    issues.push(`${label} has invalid ${field}; expected a non-negative number.`);
  }
}

function validateRatio(issues: string[], label: string, field: string, value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    issues.push(`${label} has invalid ${field}; expected a value from 0 to 1.`);
  }
}

function validateDecisionCounts(
  issues: string[],
  label: string,
  decisions: Record<string, unknown>
) {
  for (const field of ["build", "merge", "reject"]) {
    const value = decisions[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      issues.push(`${label} has invalid buildMergeRejectDecisions.${field}.`);
    }
  }
}

export function parsePageTypeScorecardEvidenceLines(
  text: string
): PageTypeScorecardEvidenceRecord[] {
  const records: PageTypeScorecardEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") {
        records.push(parsed as PageTypeScorecardEvidenceRecord);
      }
    } catch {
      // Allow pasted notes, exported headings, or Markdown around JSONL records.
    }
  }
  return records;
}

export function auditPageTypeScorecardEvidence(
  records: PageTypeScorecardEvidenceRecord[],
  options: { now?: Date } = {}
): PageTypeScorecardEvidenceAudit {
  const now = options.now ?? new Date();
  const issues: string[] = [];
  const rows: PageTypeScorecardEvidenceRow[] = [];
  const seenPageTypes = new Set<string>();

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    const checkedAt = stringField(record, "checkedAt");
    const pageType = stringField(record, "pageType");
    const indexedCount = numberField(record, "indexedCount");
    const impressions = numberField(record, "impressions");
    const clicks = numberField(record, "clicks");
    const ctr = numberField(record, "ctr");
    const averagePosition = numberField(record, "averagePosition");

    for (const field of [
      "checkedAt",
      "pageType",
      "indexedCount",
      "impressions",
      "clicks",
      "ctr",
      "averagePosition",
    ]) {
      if (!(field in record)) issues.push(`${label} is missing ${field}.`);
    }

    const ageDays = evidenceAgeDays(checkedAt, now);
    if (ageDays == null) {
      issues.push(`${label} has invalid checkedAt timestamp.`);
    } else if (ageDays > MAX_EVIDENCE_AGE_DAYS) {
      issues.push(`${label} is older than ${MAX_EVIDENCE_AGE_DAYS} days.`);
    }

    if (!REQUIRED_PAGE_TYPES.includes(pageType as SeoPageType)) {
      issues.push(`${label} has unsupported pageType: ${pageType || "missing"}.`);
    } else {
      seenPageTypes.add(pageType);
    }

    validateNonNegativeNumber(issues, label, "indexedCount", indexedCount);
    validateNonNegativeNumber(issues, label, "impressions", impressions);
    validateNonNegativeNumber(issues, label, "clicks", clicks);
    validateRatio(issues, label, "ctr", ctr);
    validateNonNegativeNumber(issues, label, "averagePosition", averagePosition);
    if (Number.isFinite(clicks) && Number.isFinite(impressions) && clicks > impressions) {
      issues.push(`${label} has clicks greater than impressions.`);
    }

    if (pageType === "resort_pages") {
      if (!stringField(record, "sourceFreshnessStatus")) {
        issues.push(`${label} is missing sourceFreshnessStatus.`);
      }
      if (arrayField(record, "topLinkedGuides").length === 0) {
        issues.push(`${label} is missing topLinkedGuides.`);
      }
    }

    if (pageType === "activity_pages") {
      validateNonNegativeNumber(
        issues,
        label,
        "richResultIssues",
        numberField(record, "richResultIssues")
      );
      validateRatio(
        issues,
        label,
        "nextOccurrenceCoverage",
        numberField(record, "nextOccurrenceCoverage")
      );
    }

    if (pageType === "guides") {
      if (!stringField(record, "deepLinkPerformance")) {
        issues.push(`${label} is missing deepLinkPerformance.`);
      }
      validateDecisionCounts(
        issues,
        label,
        objectField(record, "buildMergeRejectDecisions")
      );
    }

    if (pageType === "calendar_hub") {
      if (!stringField(record, "crawlFreshness")) {
        issues.push(`${label} is missing crawlFreshness.`);
      }
      if (arrayField(record, "competitorOverlapTerms").length === 0) {
        issues.push(`${label} is missing competitorOverlapTerms.`);
      }
    }

    if (pageType === "today_tonight") {
      validateRatio(
        issues,
        label,
        "currentDataCoverage",
        numberField(record, "currentDataCoverage")
      );
      if (!stringField(record, "noindexCanonicalStatus")) {
        issues.push(`${label} is missing noindexCanonicalStatus.`);
      }
    }

    rows.push({
      pageType,
      indexedCount,
      impressions,
      clicks,
      ctr,
      averagePosition,
    });
  });

  for (const pageType of REQUIRED_PAGE_TYPES) {
    if (!seenPageTypes.has(pageType)) {
      issues.push(`Scorecard is missing page type: ${pageType}.`);
    }
  }

  const totalImpressions = rows.reduce(
    (sum, row) => sum + (Number.isFinite(row.impressions) ? row.impressions : 0),
    0
  );
  const totalClicks = rows.reduce(
    (sum, row) => sum + (Number.isFinite(row.clicks) ? row.clicks : 0),
    0
  );

  return {
    issues,
    rows,
    summary: {
      pageTypes: [...seenPageTypes].sort(),
      totalImpressions,
      totalClicks,
      weightedCtr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    },
  };
}

export function renderPageTypeScorecardEvidenceReport(
  audit: PageTypeScorecardEvidenceAudit
): string {
  const lines = [
    "# Page Type Scorecard Evidence Audit",
    "",
    `Page types: ${audit.summary.pageTypes.join(", ") || "none"}`,
    `Total impressions: ${audit.summary.totalImpressions}`,
    `Total clicks: ${audit.summary.totalClicks}`,
    `Weighted CTR: ${audit.summary.weightedCtr.toFixed(4)}`,
    "",
    "| Page type | Indexed | Impressions | Clicks | CTR | Avg position |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const row of audit.rows) {
    lines.push(
      `| ${row.pageType || "-"} | ${Number.isFinite(row.indexedCount) ? row.indexedCount : "-"} | ${
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
