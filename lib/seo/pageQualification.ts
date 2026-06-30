import { SEO_COMPARISON_PAGES } from "@/lib/seo/comparisonPages";
import { HIGH_VALUE_GUIDES } from "@/lib/seo/routes";

export type PageQualificationField =
  | "userIntent"
  | "primaryUserAction"
  | "afterTheParksAdvantage"
  | "liveDataDependency"
  | "researchSources"
  | "exclusionRules"
  | "deepLinkMap"
  | "freshnessRule"
  | "killRule";

export type SeoPageDecision = "build" | "merge" | "defer" | "reject";

export interface SeoPageMatrixEntry {
  slug: string;
  title: string;
  tier: 1 | 2 | 3 | 4;
  decision: SeoPageDecision;
  primaryProductPath: string;
  minimumStrongRecommendations: number;
  rationale: string;
  mergeInto?: string;
  rejectReason?: string;
}

export interface SeoPageQualificationResult {
  slug: string;
  decision: SeoPageDecision;
  issues: string[];
}

interface PageLike {
  slug: string;
  title: string;
  description?: string;
  userPromise?: string;
  userIntent?: string;
  afterTheParksAdvantage?: string;
  liveDataDependencies?: string[];
  researchSources?: string[];
  exclusionRules?: string[];
  deepLinks?: string[];
  decisionFilter?: string;
  freshnessRule?: string;
  killRule?: string;
  primaryAction?: {
    label: string;
    href: string;
  };
  keywords?: string[];
}

export const PAGE_QUALIFICATION_GATE: PageQualificationField[] = [
  "userIntent",
  "primaryUserAction",
  "afterTheParksAdvantage",
  "liveDataDependency",
  "researchSources",
  "exclusionRules",
  "deepLinkMap",
  "freshnessRule",
  "killRule",
];

const DEFAULT_RESEARCH_SOURCES = [
  "Official Disney source pages",
  "After the Parks live activity and resort data",
  "Current calendar freshness checks",
  "Competitor and community gap review",
];

function textLength(value?: string): number {
  return value?.trim().length ?? 0;
}

function asArray(value?: string[]): string[] {
  return value ?? [];
}

function inferredAfterTheParksAdvantage(page: PageLike): string {
  if (page.afterTheParksAdvantage) return page.afterTheParksAdvantage;
  return [
    "Uses current After the Parks resort/activity data",
    page.decisionFilter,
    page.primaryAction?.href ? `and routes users to ${page.primaryAction.href}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function inferredLiveDataDependencies(page: PageLike): string[] {
  if (page.liveDataDependencies?.length) return page.liveDataDependencies;
  return ["current activity rows", "resort relationships", "cost/free state", "today/tonight availability"];
}

function inferredResearchSources(page: PageLike): string[] {
  if (page.researchSources?.length) return page.researchSources;
  return DEFAULT_RESEARCH_SOURCES;
}

function inferredKillRule(page: PageLike): string {
  if (page.killRule) return page.killRule;
  return "Merge, defer, or noindex if live data, source freshness, exclusions, and product links cannot support this page.";
}

export function evaluateSeoPageQualification(
  page: PageLike
): SeoPageQualificationResult {
  const issues: string[] = [];
  const userIntent = page.userIntent ?? page.userPromise ?? page.description;
  const advantage = inferredAfterTheParksAdvantage(page);
  const liveDataDependencies = inferredLiveDataDependencies(page);
  const researchSources = inferredResearchSources(page);
  const exclusionRules = asArray(page.exclusionRules);
  const deepLinks = asArray(page.deepLinks);
  const killRule = inferredKillRule(page);

  if (textLength(userIntent) < 40) issues.push("user intent is not specific enough");
  if (!page.primaryAction?.href?.startsWith("/")) issues.push("primary user action must be an internal product path");
  if (textLength(advantage) < 50) issues.push("unique After the Parks advantage is too thin");
  if (liveDataDependencies.length < 3) issues.push("live data dependency needs at least three fields");
  if (researchSources.length < 3) issues.push("research sources need official, live data, and gap-review coverage");
  if (exclusionRules.length < 2) issues.push("exclusion rules need at least two bad-fit filters");
  if (deepLinks.length < 3) issues.push("deep links need at least three product paths");
  if (textLength(page.decisionFilter) < 40) issues.push("decision filter is not specific enough");
  if (textLength(page.freshnessRule) < 30) issues.push("freshness rule is not operational");
  if (textLength(killRule) < 40) issues.push("kill rule is not operational");

  return {
    slug: page.slug,
    decision: issues.length === 0 ? "build" : "reject",
    issues,
  };
}

export const SEO_PAGE_MATRIX: SeoPageMatrixEntry[] = [
  ...HIGH_VALUE_GUIDES.map((guide) => ({
    slug: guide.slug,
    title: guide.title,
    tier: guide.tier,
    decision: "build" as const,
    primaryProductPath: guide.primaryAction.href,
    minimumStrongRecommendations: guide.tier === 1 ? 7 : 5,
    rationale: guide.decisionFilter,
  })),
  ...SEO_COMPARISON_PAGES.map((page) => ({
    slug: page.slug,
    title: page.title,
    tier: page.slug.includes("monorail") ||
      page.slug.includes("skyliner") ||
      page.slug.includes("boardwalk") ||
      page.slug.includes("fort-wilderness")
      ? 3 as const
      : 2 as const,
    decision: "build" as const,
    primaryProductPath: page.primaryAction.href,
    minimumStrongRecommendations: 5,
    rationale: page.decisionFilter,
  })),
  {
    slug: "grandparents-at-night-in-rain-by-boat",
    title: "Disney resort activities for grandparents at night in rain by boat",
    tier: 4,
    decision: "merge",
    primaryProductPath: "/activities",
    minimumStrongRecommendations: 0,
    rationale:
      "Too narrow for a standalone canonical page; use the grandparents guide plus rainy-day and transportation filters.",
    mergeInto: "/activities",
  },
  {
    slug: "skyliner-rainy-day-resort-hopping",
    title: "Skyliner rainy-day resort hopping",
    tier: 4,
    decision: "reject",
    primaryProductPath: "/activities?weather=indoor",
    minimumStrongRecommendations: 0,
    rationale:
      "The intent conflicts with weather-risk guidance because Skyliner service can pause during lightning and severe weather.",
    rejectReason:
      "Reject as a standalone page unless future route and weather data can support a safe, clearly caveated answer.",
  },
];

export function validateSeoPageMatrix(matrix: SeoPageMatrixEntry[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();

  for (const entry of matrix) {
    if (seen.has(entry.slug)) issues.push(`${entry.slug}: duplicate matrix entry`);
    seen.add(entry.slug);

    if (!entry.title || entry.title.length < 20) {
      issues.push(`${entry.slug}: title is too thin`);
    }
    if (!entry.primaryProductPath.startsWith("/")) {
      issues.push(`${entry.slug}: primary product path must be internal`);
    }
    if (entry.decision === "build") {
      if (entry.minimumStrongRecommendations < 5) {
        issues.push(`${entry.slug}: build pages need at least five strong recommendations`);
      }
      if (entry.rationale.length < 40) {
        issues.push(`${entry.slug}: build rationale is too thin`);
      }
    }
    if (entry.decision === "merge" && !entry.mergeInto?.startsWith("/")) {
      issues.push(`${entry.slug}: merge pages need an internal merge target`);
    }
    if (entry.decision === "reject" && textLength(entry.rejectReason) < 40) {
      issues.push(`${entry.slug}: rejected pages need a clear reject reason`);
    }
  }

  return issues;
}
