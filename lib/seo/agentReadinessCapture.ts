import {
  AGENT_READINESS_CHECKS,
  type AgentReadinessCheckName,
} from "@/lib/seo/measurement";

export type AgentReadinessCaptureInput = {
  route: string;
  html: string;
  status?: number;
  checkedAt?: string;
  tool?: string;
};

export type CapturedAgentReadinessRecord = {
  checkedAt: string;
  route: string;
  check: AgentReadinessCheckName;
  tool: string;
  passed: boolean;
  evidence: string;
};

const DEFAULT_TOOL = "HTML agent-readiness capture";
const DISNEY_SPRINGS_ACCESS_ROUTES = new Set([
  "/guides/things-to-do-without-park-ticket",
  "/guides/disney-springs-area-resort-activities",
  "/guides/best-resorts-if-you-do-not-have-a-park-ticket",
]);

function stripTags(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function visibleText(html: string): string {
  return decodeHtml(stripTags(html));
}

function matches(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(pattern)].map((match) => stripTags(match[1] ?? match[0]));
}

function hasCanonical(html: string): boolean {
  return /<link\s+[^>]*rel=["']canonical["'][^>]*href=["'][^"']+["'][^>]*>/i.test(html);
}

function hasJsonLd(html: string): boolean {
  return /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html);
}

function hasNamedInteractive(html: string): boolean {
  const anchors = matches(html, /<a\b[^>]*>([\s\S]*?)<\/a>/gi).filter(Boolean);
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)].map((match) => {
    const attrs = match[1] ?? "";
    const text = stripTags(match[2] ?? "");
    const aria = attrs.match(/\baria-label=["']([^"']+)["']/i)?.[1] ?? "";
    return stripTags(`${aria} ${text}`);
  });
  const details = matches(html, /<summary\b[^>]*>([\s\S]*?)<\/summary>/gi).filter(Boolean);
  const namedControls = [...anchors, ...buttons, ...details].filter((name) => name.length >= 3);
  const unnamedButton = /<button\b(?![^>]*aria-label=)[^>]*>\s*(?:<[^>]+>\s*)*<\/button>/i.test(html);

  return namedControls.length >= 2 && !unnamedButton;
}

function headingTexts(html: string): string[] {
  return matches(html, /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi).filter(Boolean);
}

function hasDisneySpringsCaveat(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("disney springs") &&
    /\bresort stay\b|\bstaying\b/.test(normalized) &&
    (normalized.includes("dining/experience reservation") ||
      normalized.includes("dining reservation") ||
      normalized.includes("restaurant reservation") ||
      normalized.includes("experience reservation") ||
      normalized.includes("confirmed dining"))
  );
}

function routeNeedsDisneySpringsCaveat(route: string): boolean {
  return DISNEY_SPRINGS_ACCESS_ROUTES.has(route);
}

function routeNeedsBreadcrumb(route: string): boolean {
  return route.split("?")[0].split("/").filter(Boolean).length > 1;
}

function disneySpringsEvidenceSnippet(route: string, text: string): string {
  if (!routeNeedsDisneySpringsCaveat(route) || !hasDisneySpringsCaveat(text)) return "";
  return "Disney Springs caveat verified: do not use Disney Springs as a free resort-transfer path; use a resort stay or dining/experience reservation.";
}

function evidenceRecord(
  input: AgentReadinessCaptureInput,
  check: AgentReadinessCheckName,
  passed: boolean,
  evidence: string
): CapturedAgentReadinessRecord {
  return {
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    route: input.route,
    check,
    tool: input.tool ?? DEFAULT_TOOL,
    passed,
    evidence,
  };
}

function evaluateCheck(input: AgentReadinessCaptureInput, check: AgentReadinessCheckName) {
  const html = input.html;
  const text = visibleText(html);
  const headings = headingTexts(html);
  const h1Count = matches(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi).length;
  const hasFreshness = /source and freshness|last verified|source and accuracy/i.test(text);
  const hasAnswer = /current answer|today|tonight|activities|calendar|resort/i.test(text);
  const hasCaveat = !routeNeedsDisneySpringsCaveat(input.route) || hasDisneySpringsCaveat(text);
  const caveatEvidence = disneySpringsEvidenceSnippet(input.route, text);
  const statusOk = !input.status || (input.status >= 200 && input.status < 300);

  if (check === "accessibilityTree") {
    const breadcrumbOk =
      !routeNeedsBreadcrumb(input.route) ||
      /<nav\b[^>]*aria-label=["']Breadcrumb["']/i.test(html) ||
      /breadcrumb/i.test(text);
    const passed =
      statusOk &&
      h1Count === 1 &&
      /<main\b|role=["']main["']/i.test(html) &&
      breadcrumbOk &&
      hasAnswer &&
      hasCaveat;
    return {
      passed,
      evidence: passed
        ? `HTML accessibility proxy found one H1, main content, ${routeNeedsBreadcrumb(input.route) ? "breadcrumb labeling, " : ""}first-answer text, and required caveats for ${input.route}. ${caveatEvidence}`.trim()
        : `HTML accessibility proxy could not prove one H1, main content, ${routeNeedsBreadcrumb(input.route) ? "breadcrumb labeling, " : ""}first-answer text, and required caveats for ${input.route}.`,
    };
  }

  if (check === "stableHeadings") {
    const passed = h1Count === 1 && headings.length >= 3 && headings.some((heading) => /source|freshness|current|answer/i.test(heading));
    return {
      passed,
      evidence: passed
        ? `Heading outline has ${headings.length} headings including "${headings.slice(0, 4).join(" / ")}", with one H1 and a current/source section.`
        : `Heading outline is too weak: ${headings.length} headings and ${h1Count} H1 elements were found.`,
    };
  }

  if (check === "descriptiveInteractiveNames") {
    const passed = hasNamedInteractive(html);
    return {
      passed,
      evidence: passed
        ? "Links, buttons, details summaries, or breadcrumb controls have visible text or aria-label names for agent operation."
        : "Could not prove enough links, buttons, details summaries, or breadcrumb controls have descriptive names.",
    };
  }

  if (check === "keyboardReachablePrimaryFlows") {
    const hasControls = /<a\b|<button\b|<summary\b|<input\b|<select\b/i.test(html);
    const hasHostileTabIndex = /\btabindex=["']-[12-9]["']/i.test(html);
    const passed = hasControls;
    return {
      passed,
      evidence: passed
        ? `Primary links and controls are present in HTML for keyboard traversal. ${hasHostileTabIndex ? "Negative tabindex appears in the document, so manual review should confirm it is limited to non-primary UI plumbing." : "No negative tabindex was detected."}`
        : "Could not prove keyboard-reachable primary flows from server-rendered links and controls.",
    };
  }

  if (check === "noHoverOnlyCriticalContent") {
    const hasHoverOnlyClue = /group-hover|hover:|onMouseEnter|mouseenter/i.test(html);
    const passed = hasFreshness && hasAnswer && hasCaveat;
    return {
      passed,
      evidence: passed
        ? `Critical answer, freshness, and caveat text is present in HTML without depending on hover-only evidence. ${hasHoverOnlyClue ? "Hover styling exists elsewhere, so manual review should confirm it is decorative." : "No hover-only markers were detected."} ${caveatEvidence}`.trim()
        : "Critical answer, freshness, or transportation caveat text was not visible in the server HTML.",
    };
  }

  if (check === "serverRenderedPrimaryAnswer") {
    const passed = statusOk && text.length > 500 && hasAnswer && hasCaveat;
    return {
      passed,
      evidence: passed
        ? `Server HTML returned ${input.status ?? "unknown"} with ${text.length} visible-text characters, first-answer language, and required caveats for ${input.route}. ${caveatEvidence}`.trim()
        : `Server HTML did not prove a substantial primary answer for ${input.route}; status ${input.status ?? "unknown"}, visible text length ${text.length}.`,
    };
  }

  const passed = hasCanonical(html) && hasJsonLd(html);
  return {
    passed,
    evidence: passed
      ? "Canonical link and application/ld+json structured data are present in server-rendered HTML."
      : "Canonical link or application/ld+json structured data is missing from server-rendered HTML.",
  };
}

export function captureAgentReadinessEvidenceForHtml(
  input: AgentReadinessCaptureInput
): CapturedAgentReadinessRecord[] {
  return AGENT_READINESS_CHECKS.map(({ check }) => {
    const result = evaluateCheck(input, check);
    return evidenceRecord(input, check, result.passed, result.evidence);
  });
}

export function renderAgentReadinessEvidenceJsonl(
  records: Array<Record<string, unknown>>
): string {
  return records
    .map((record) => JSON.stringify(record).replace(/authorization|cookie|secret/gi, "[redacted]"))
    .join("\n");
}
