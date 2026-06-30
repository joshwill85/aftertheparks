import { AI_VISIBILITY_PROMPTS } from "@/lib/seo/measurement";

export type BingAiPerformanceEvidenceRecord = Record<string, unknown>;

export type BingAiPerformanceEvidenceRow = {
  promptId: string;
  intent: string;
  topic: string;
  citationShare: number;
  previousCitationShare: number;
  compareDelta: number;
};

export type BingAiPerformanceEvidenceAudit = {
  issues: string[];
  rows: BingAiPerformanceEvidenceRow[];
};

const MAX_EVIDENCE_AGE_DAYS = 8;

function stringField(record: BingAiPerformanceEvidenceRecord, field: string): string {
  const value = record[field];
  return typeof value === "string" ? value.trim() : "";
}

function booleanField(record: BingAiPerformanceEvidenceRecord, field: string): boolean {
  return record[field] === true || record[field] === "true";
}

function numberField(record: BingAiPerformanceEvidenceRecord, field: string): number {
  const value = record[field];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return Number.NaN;
}

function arrayField(record: BingAiPerformanceEvidenceRecord, field: string): unknown[] {
  const value = record[field];
  return Array.isArray(value) ? value : [];
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

function validateRatio(issues: string[], label: string, field: string, value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    issues.push(`${label} has invalid ${field}; expected a value from 0 to 1.`);
  }
}

const PROMPT_BY_ID = new Map(AI_VISIBILITY_PROMPTS.map((prompt) => [prompt.id, prompt]));

export function parseBingAiPerformanceEvidenceLines(
  text: string
): BingAiPerformanceEvidenceRecord[] {
  const records: BingAiPerformanceEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") {
        records.push(parsed as BingAiPerformanceEvidenceRecord);
      }
    } catch {
      // Allow copied Bing dashboard headings and notes around JSONL records.
    }
  }
  return records;
}

export function auditBingAiPerformanceEvidence(
  records: BingAiPerformanceEvidenceRecord[],
  options: { now?: Date } = {}
): BingAiPerformanceEvidenceAudit {
  const now = options.now ?? new Date();
  const issues: string[] = [];
  const rows: BingAiPerformanceEvidenceRow[] = [];
  const seenPromptIds = new Set<string>();

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    const checkedAt = stringField(record, "checkedAt");
    const source = stringField(record, "source");
    const promptId = stringField(record, "promptId");
    const expectedCanonicalPath = stringField(record, "expectedCanonicalPath");
    const citedAfterTheParks = booleanField(record, "citedAfterTheParks");
    const citedUrl = stringField(record, "citedUrl");
    const intent = stringField(record, "intent");
    const topic = stringField(record, "topic");
    const citationShare = numberField(record, "citationShare");
    const previousCitationShare = numberField(record, "previousCitationShare");
    const compareDelta = numberField(record, "compareDelta");
    const compareWindow = stringField(record, "compareWindow");
    const groundingPhrases = arrayField(record, "groundingPhrases");
    const recommendedAction = stringField(record, "recommendedAction");

    for (const field of [
      "checkedAt",
      "source",
      "promptId",
      "query",
      "expectedCanonicalPath",
      "intent",
      "topic",
      "citationShare",
      "previousCitationShare",
      "compareDelta",
      "compareWindow",
      "recommendedAction",
    ]) {
      if (!(field in record)) issues.push(`${label} is missing ${field}.`);
    }

    if (!/Bing Webmaster Tools AI Performance/i.test(source)) {
      issues.push(`${label} source should be Bing Webmaster Tools AI Performance.`);
    }

    const ageDays = evidenceAgeDays(checkedAt, now);
    if (ageDays == null) {
      issues.push(`${label} has invalid checkedAt timestamp.`);
    } else if (ageDays > MAX_EVIDENCE_AGE_DAYS) {
      issues.push(`${label} is older than ${MAX_EVIDENCE_AGE_DAYS} days.`);
    }

    const prompt = PROMPT_BY_ID.get(promptId);
    if (!prompt) {
      issues.push(`${label} has unknown Bing AI Performance promptId: ${promptId || "missing"}.`);
    } else {
      seenPromptIds.add(promptId);
      if (expectedCanonicalPath !== prompt.expectedCanonicalPath) {
        issues.push(
          `${label} expectedCanonicalPath must match prompt ${promptId}: ${prompt.expectedCanonicalPath}.`
        );
      }
    }

    if (!intent) issues.push(`${label} is missing Bing Intents diagnostic.`);
    if (!topic) issues.push(`${label} is missing Bing Topics diagnostic.`);
    if (!compareWindow) issues.push(`${label} is missing Bing Compare window.`);
    if (groundingPhrases.length === 0) {
      issues.push(`${label} is missing Bing groundingPhrases.`);
    }
    if (!recommendedAction) {
      issues.push(`${label} is missing recommendedAction tied to Bing diagnostics.`);
    }

    validateRatio(issues, label, "citationShare", citationShare);
    validateRatio(issues, label, "previousCitationShare", previousCitationShare);
    if (!Number.isFinite(compareDelta)) {
      issues.push(`${label} has invalid compareDelta; expected a numeric Compare delta.`);
    }

    if (citedAfterTheParks) {
      const observedPath = canonicalFromObservedUrl(citedUrl);
      if (!observedPath) {
        issues.push(`${label} cites After the Parks but has no citedUrl.`);
      } else if (expectedCanonicalPath && observedPath !== expectedCanonicalPath) {
        issues.push(
          `${label} has wrong canonical Bing citation: observed ${observedPath}, expected ${expectedCanonicalPath}.`
        );
      }
    }

    rows.push({
      promptId,
      intent,
      topic,
      citationShare,
      previousCitationShare,
      compareDelta,
    });
  });

  for (const prompt of AI_VISIBILITY_PROMPTS) {
    if (!seenPromptIds.has(prompt.id)) {
      issues.push(`Missing Bing AI Performance evidence for prompt: ${prompt.id}.`);
    }
  }

  return { issues, rows };
}

export function renderBingAiPerformanceEvidenceReport(
  audit: BingAiPerformanceEvidenceAudit
): string {
  const lines = [
    "# Bing AI Performance Evidence Audit",
    "",
    "| Prompt | Intents | Topics | Citation Share | Previous Share | Compare |",
    "| --- | --- | --- | ---: | ---: | ---: |",
  ];

  for (const row of audit.rows) {
    lines.push(
      `| ${row.promptId || "-"} | ${row.intent || "-"} | ${row.topic || "-"} | ${
        Number.isFinite(row.citationShare) ? row.citationShare : "-"
      } | ${Number.isFinite(row.previousCitationShare) ? row.previousCitationShare : "-"} | ${
        Number.isFinite(row.compareDelta) ? row.compareDelta : "-"
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
