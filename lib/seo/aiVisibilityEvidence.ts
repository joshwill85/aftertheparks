import {
  AI_VISIBILITY_EVIDENCE_FIELDS,
  AI_VISIBILITY_PROMPTS,
  type AiVisibilityTool,
} from "@/lib/seo/measurement";

export type AiVisibilityEvidenceRecord = Record<string, unknown>;

export type AiVisibilityEvidenceRow = {
  promptId: string;
  tool: string;
  citedAfterTheParks: boolean;
  citationCurrent: boolean;
  transportationCaveatRespected: boolean;
  observedCitationUrl: string;
};

export type AiVisibilityEvidenceAudit = {
  issues: string[];
  rows: AiVisibilityEvidenceRow[];
};

const VALID_TOOLS: AiVisibilityTool[] = [
  "ChatGPT Search",
  "Google AI Mode",
  "Perplexity",
  "Bing Copilot",
];

function stringField(record: AiVisibilityEvidenceRecord, field: string): string {
  const value = record[field];
  return typeof value === "string" ? value.trim() : "";
}

function booleanField(record: AiVisibilityEvidenceRecord, field: string): boolean {
  return record[field] === true;
}

function canonicalFromObservedUrl(url: string): string {
  if (!url) return "";
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url.startsWith("/") ? url : "";
  }
}

export function parseAiVisibilityEvidenceLines(text: string): AiVisibilityEvidenceRecord[] {
  const records: AiVisibilityEvidenceRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") {
        records.push(parsed as AiVisibilityEvidenceRecord);
      }
    } catch {
      // Ignore malformed lines so notes pasted around JSONL do not break the audit.
    }
  }
  return records;
}

export function auditAiVisibilityEvidence(
  records: AiVisibilityEvidenceRecord[],
  _options: { now?: Date } = {}
): AiVisibilityEvidenceAudit {
  const promptById = new Map(AI_VISIBILITY_PROMPTS.map((prompt) => [prompt.id, prompt]));
  const requiredFields = AI_VISIBILITY_EVIDENCE_FIELDS.map((field) => field.field);
  const issues: string[] = [];
  const rows: AiVisibilityEvidenceRow[] = [];
  const seenByPrompt = new Map<string, Set<string>>();

  records.forEach((record, index) => {
    const label = `record ${index + 1}`;
    for (const field of requiredFields) {
      if (!(field in record)) issues.push(`${label} is missing ${field}.`);
    }

    const promptId = stringField(record, "promptId");
    const tool = stringField(record, "tool");
    const expectedCanonicalPath = stringField(record, "expectedCanonicalPath");
    const observedCitationUrl = stringField(record, "observedCitationUrl");
    const citedAfterTheParks = booleanField(record, "citedAfterTheParks");
    const citationCurrent = booleanField(record, "citationCurrent");
    const sourceFreshnessMentioned = booleanField(record, "sourceFreshnessMentioned");
    const transportationCaveatRespected = booleanField(record, "transportationCaveatRespected");
    const disneySpringsFreeTransferRejected = booleanField(record, "disneySpringsFreeTransferRejected");
    const reservationMentioned = booleanField(
      record,
      "resortStayOrDiningExperienceReservationMentioned"
    );

    const prompt = promptById.get(promptId);
    if (!prompt) {
      issues.push(`${label} has unknown promptId: ${promptId || "missing"}.`);
    } else if (expectedCanonicalPath !== prompt.expectedCanonicalPath) {
      issues.push(
        `${label} expectedCanonicalPath must match prompt ${promptId}: ${prompt.expectedCanonicalPath}.`
      );
    }

    if (!VALID_TOOLS.includes(tool as AiVisibilityTool)) {
      issues.push(`${label} has unsupported AI visibility tool: ${tool || "missing"}.`);
    } else if (prompt) {
      const seenTools = seenByPrompt.get(promptId) ?? new Set<string>();
      seenTools.add(tool);
      seenByPrompt.set(promptId, seenTools);
    }

    if (citedAfterTheParks) {
      const observedPath = canonicalFromObservedUrl(observedCitationUrl);
      if (!observedPath) {
        issues.push(`${label} cites After the Parks but has no observedCitationUrl.`);
      } else if (expectedCanonicalPath && observedPath !== expectedCanonicalPath) {
        issues.push(
          `${label} has wrong canonical citation: observed ${observedPath}, expected ${expectedCanonicalPath}.`
        );
      }
      if (!citationCurrent) {
        issues.push(`${label} cites After the Parks but citationCurrent is false.`);
      }
      if (!sourceFreshnessMentioned) {
        issues.push(`${label} cites After the Parks but source freshness is not mentioned.`);
      }
    }

    if (promptId === "disney-springs-transfer-caveat") {
      if (!transportationCaveatRespected) {
        issues.push(`${label} failed the Disney Springs transportation caveat check.`);
      }
      if (!disneySpringsFreeTransferRejected) {
        issues.push(`${label} failed to reject Disney Springs as a free transfer workaround.`);
      }
      if (!reservationMentioned) {
        issues.push(
          `${label} did not mention resort stay or confirmed dining/experience reservation for Disney Springs resort transportation.`
        );
      }
    }

    rows.push({
      promptId,
      tool,
      citedAfterTheParks,
      citationCurrent,
      transportationCaveatRespected,
      observedCitationUrl,
    });
  });

  for (const prompt of AI_VISIBILITY_PROMPTS) {
    const seenTools = seenByPrompt.get(prompt.id) ?? new Set<string>();
    for (const tool of prompt.tools) {
      if (!seenTools.has(tool)) {
        issues.push(`Missing AI visibility evidence for ${prompt.id} in ${tool}.`);
      }
    }
  }

  return { issues, rows };
}

export function renderAiVisibilityEvidenceReport(audit: AiVisibilityEvidenceAudit): string {
  const lines = [
    "# AI Visibility Evidence Audit",
    "",
    "| Prompt | Tool | Cited ATP | Current | Caveat respected | Citation |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of audit.rows) {
    lines.push(
      `| ${row.promptId} | ${row.tool} | ${row.citedAfterTheParks ? "yes" : "no"} | ${
        row.citationCurrent ? "yes" : "no"
      } | ${row.transportationCaveatRespected ? "yes" : "no"} | ${
        row.observedCitationUrl || "-"
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
