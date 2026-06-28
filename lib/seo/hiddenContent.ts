export interface HiddenSeoSource {
  file: string;
  source: string;
}

export interface HiddenSeoIssue {
  file: string;
  line: number;
  message: string;
  snippet: string;
}

const RISKY_HIDDEN_MARKERS = [
  /\bseo-hidden\b/i,
  /\bhidden-seo\b/i,
  /\bcrawler-only\b/i,
  /\bbot-only\b/i,
  /\bsearch-engine-only\b/i,
  /\bdata-seo-hidden\b/i,
  /\bdata-crawler-only\b/i,
];

const RISKY_COPY_MARKERS = [
  /for\s+(?:search\s+engines|crawlers|bots)\s+only/i,
  /(?:search\s+engine|crawler|bot)-only\s+(?:copy|content|text)/i,
  /hidden\s+(?:seo|keyword|ranking)\s+(?:copy|content|text)/i,
];

const ACCESSIBILITY_EXCEPTIONS = [
  /\bsr-only\b/i,
  /\baria-hidden(?:=|\b)/i,
  /\baria-live(?:=|\b)/i,
  /\bhtmlFor=/i,
  /\brole=["']status["']/i,
];

function hasAccessibilityOnlyContext(line: string): boolean {
  return (
    ACCESSIBILITY_EXCEPTIONS.some((pattern) => pattern.test(line)) &&
    !RISKY_HIDDEN_MARKERS.some((pattern) => pattern.test(line)) &&
    !RISKY_COPY_MARKERS.some((pattern) => pattern.test(line))
  );
}

function issueForLine(file: string, line: string, index: number): HiddenSeoIssue | undefined {
  if (hasAccessibilityOnlyContext(line)) return undefined;

  const hiddenMarker = RISKY_HIDDEN_MARKERS.find((pattern) => pattern.test(line));
  if (hiddenMarker) {
    return {
      file,
      line: index + 1,
      message: `Potential crawler-only hidden SEO marker: ${hiddenMarker}`,
      snippet: line.trim(),
    };
  }

  const copyMarker = RISKY_COPY_MARKERS.find((pattern) => pattern.test(line));
  if (copyMarker) {
    return {
      file,
      line: index + 1,
      message: `Potential crawler-only SEO copy: ${copyMarker}`,
      snippet: line.trim(),
    };
  }

  return undefined;
}

export function auditHiddenSeoContent(sources: HiddenSeoSource[]): HiddenSeoIssue[] {
  const issues: HiddenSeoIssue[] = [];

  for (const source of sources) {
    source.source.split("\n").forEach((line, index) => {
      const issue = issueForLine(source.file, line, index);
      if (issue) issues.push(issue);
    });
  }

  return issues;
}
