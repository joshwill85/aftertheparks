export type StructuredDataEvidenceRecord = Record<string, unknown>;

export type StructuredDataEvidenceRow = {
  routeGroup: string;
  representativePath: string;
  schemaType: string;
  valid: boolean;
  errors: number;
  warnings: number;
};

export type StructuredDataEvidenceAudit = {
  issues: string[];
  rows: StructuredDataEvidenceRow[];
};

export const REQUIRED_STRUCTURED_DATA_EVIDENCE = [
  {
    routeGroup: "homepage_calendar_hub",
    representativePath: "/",
    schemaTypes: ["Organization", "WebSite", "ItemList"],
  },
  {
    routeGroup: "calendar_hub",
    representativePath: "/disney-world-resort-activity-calendars",
    schemaTypes: ["BreadcrumbList", "ItemList"],
  },
  {
    routeGroup: "resort_pages",
    representativePath: "/resorts/polynesian-village-resort",
    schemaTypes: ["BreadcrumbList", "TouristAccommodation", "ItemList"],
  },
  {
    routeGroup: "activity_pages",
    representativePath: "/activities/movies-under-the-stars",
    schemaTypes: ["BreadcrumbList", "ItemList", "Event", "FAQPage"],
  },
  {
    routeGroup: "guide_pages",
    representativePath: "/guides/disney-world-non-park-day",
    schemaTypes: ["BreadcrumbList", "Article", "FAQPage", "ItemList"],
  },
] as const;

const FIELD_ALIASES = {
  checkedAt: ["checkedAt", "datetime", "timestamp", "testedAt"],
  source: ["source", "tool", "validator", "reportSource"],
  routeGroup: ["routeGroup", "pageType", "group"],
  representativePath: ["representativePath", "path", "url", "page", "route"],
  schemaType: ["schemaType", "type", "itemType", "richResultType", "enhancement"],
  valid: ["valid", "passed", "isValid"],
  errors: ["errors", "errorCount", "invalidItems", "criticalIssues"],
  warnings: ["warnings", "warningCount", "nonCriticalIssues"],
  warningBlocking: ["warningBlocking", "blockingWarnings", "warningsBlockLaunch"],
  visibleContentMatched: ["visibleContentMatched", "visibleContentMatch", "visibleOnPage"],
} as const;

function stringField(record: StructuredDataEvidenceRecord, fields: readonly string[]): string {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function booleanField(record: StructuredDataEvidenceRecord, fields: readonly string[]): boolean {
  for (const field of fields) {
    const value = record[field];
    if (value === true || value === "true" || value === "pass" || value === "PASS") return true;
    if (value === false || value === "false" || value === "fail" || value === "FAIL") return false;
  }
  return false;
}

function numberField(record: StructuredDataEvidenceRecord, fields: readonly string[]): number {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
    if (Array.isArray(value)) return value.length;
  }
  return 0;
}

function pathFromValue(value: string): string {
  if (!value) return "";
  try {
    return new URL(value).pathname || "/";
  } catch {
    return value.startsWith("/") ? value : "";
  }
}

function evidenceKey(path: string, schemaType: string): string {
  return `${path}::${schemaType}`.toLowerCase();
}

export function parseStructuredDataEvidenceLines(text: string): StructuredDataEvidenceRecord[] {
  const records: StructuredDataEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") {
        records.push(parsed as StructuredDataEvidenceRecord);
      }
    } catch {
      // Allow copied dashboard notes and headings around JSONL records.
    }
  }
  return records;
}

export function auditStructuredDataEvidence(
  records: StructuredDataEvidenceRecord[]
): StructuredDataEvidenceAudit {
  const issues: string[] = [];
  const rows: StructuredDataEvidenceRow[] = [];
  const seenValid = new Set<string>();

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    const checkedAt = stringField(record, FIELD_ALIASES.checkedAt);
    const source = stringField(record, FIELD_ALIASES.source);
    const routeGroup = stringField(record, FIELD_ALIASES.routeGroup);
    const representativePath = pathFromValue(
      stringField(record, FIELD_ALIASES.representativePath)
    );
    const schemaType = stringField(record, FIELD_ALIASES.schemaType);
    const valid = booleanField(record, FIELD_ALIASES.valid);
    const errors = numberField(record, FIELD_ALIASES.errors);
    const warnings = numberField(record, FIELD_ALIASES.warnings);
    const warningBlocking = booleanField(record, FIELD_ALIASES.warningBlocking);
    const visibleContentMatched = booleanField(record, FIELD_ALIASES.visibleContentMatched);

    if (!checkedAt) issues.push(`${label} is missing checkedAt.`);
    if (!source) issues.push(`${label} is missing source.`);
    if (!routeGroup) issues.push(`${label} is missing routeGroup.`);
    if (!representativePath) issues.push(`${label} is missing representativePath.`);
    if (!schemaType) issues.push(`${label} is missing schemaType.`);

    if (!valid || errors > 0) {
      issues.push(
        `${label} ${schemaType || "schema"} on ${
          representativePath || "unknown path"
        } is invalid or has ${errors} error(s).`
      );
    }

    if (warnings > 0 && warningBlocking) {
      issues.push(
        `${label} ${schemaType || "schema"} on ${
          representativePath || "unknown path"
        } has blocking structured-data warning(s).`
      );
    }

    if (!visibleContentMatched) {
      issues.push(
        `${label} ${schemaType || "schema"} on ${
          representativePath || "unknown path"
        } does not match visible content.`
      );
    }

    if (valid && errors === 0 && !warningBlocking && visibleContentMatched) {
      seenValid.add(evidenceKey(representativePath, schemaType));
    }

    rows.push({
      routeGroup,
      representativePath,
      schemaType,
      valid,
      errors,
      warnings,
    });
  });

  for (const required of REQUIRED_STRUCTURED_DATA_EVIDENCE) {
    for (const schemaType of required.schemaTypes) {
      if (!seenValid.has(evidenceKey(required.representativePath, schemaType))) {
        issues.push(
          `Missing valid structured-data evidence for ${schemaType} on ${required.representativePath}.`
        );
      }
    }
  }

  return { issues, rows };
}

export function renderStructuredDataEvidenceReport(
  audit: StructuredDataEvidenceAudit
): string {
  const lines = [
    "# Structured Data Evidence Audit",
    "",
    "| Route group | Path | Schema type | Valid | Errors | Warnings |",
    "| --- | --- | --- | --- | ---: | ---: |",
  ];

  for (const row of audit.rows) {
    lines.push(
      `| ${row.routeGroup || "-"} | ${row.representativePath || "-"} | ${
        row.schemaType || "-"
      } | ${row.valid ? "yes" : "no"} | ${row.errors} | ${row.warnings} |`
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
