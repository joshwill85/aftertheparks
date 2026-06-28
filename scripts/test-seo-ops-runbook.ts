import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runbook = readFileSync("docs/seo-operations-runbook.md", "utf8");
const strategy = readFileSync("docs/seo-strategy-2026.md", "utf8");
const routeAudit = readFileSync("scripts/audit-seo-routes.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

for (const expected of [
  "# After the Parks SEO Operations Runbook",
  "Cloudflare AI Crawl Control",
  "npm run seo:crawlers",
  "CRAWLER_QA_BASE_URL",
  "npm run seo:qa",
  "npm run seo:indexnow",
  "npm run seo:external-readiness",
  "npm run seo:ai-visibility",
  "npm run seo:rank-tracking",
  "npm run seo:page-type-scorecard",
  "npm run seo:transportation-policy",
  "npm run seo:agent-readiness",
  "npm run seo:capture-agent-readiness",
  "npm run seo:performance-budgets",
  "npm run seo:core-web-vitals",
  "npm run seo:server-logs",
  "npm run seo:google-submit-sitemap",
  "npm run seo:google-inspect-urls",
  "npm run seo:bing-submit-sitemap",
  "IndexNow",
  "Google Search Console",
  "Bing Webmaster Tools",
  "Core Web Vitals",
  "server, Vercel, or Cloudflare request logs",
  "LCP <= 2.5s",
  "INP <= 200ms",
  "CLS <= 0.1",
  "320 KB gzip",
  "core-web-vitals.jsonl",
  "representativePath",
  "sampleSize",
  "collectionWindowDays",
  "Rank Tracking",
  "50 priority queries",
  "rank-tracking-evidence.jsonl",
  "observedPosition",
  "afterTheParksFound",
  "bestCompetitorUrl",
  "AI Visibility Spot Checks",
  "Agent-Friendly SEO Checks",
  "checkedAt",
  "route",
  "tool",
  "passed",
  "evidence",
  "hidden from users",
  "accessibility tree",
  "stable headings",
  "server-rendered",
  "keyboard",
  "ChatGPT Search",
  "Google AI Mode",
  "Perplexity",
  "Bing Copilot",
  "full prompt/tool matrix",
  "resorts-tonight-no-ticket",
  "current-resort-calendars",
  "rainy-day-resort-plan",
  "disney-springs-transfer-caveat",
  "movies-under-stars-tonight",
  "disneySpringsFreeTransferRejected",
  "resortStayOrDiningExperienceReservationMentioned",
  "Intents",
  "Topics",
  "Citation Share",
  "Compare",
  "Page Type Scorecard",
  "page-type-scorecard.jsonl",
  "sourceFreshnessStatus",
  "nextOccurrenceCoverage",
  "buildMergeRejectDecisions",
  "competitorOverlapTerms",
  "currentDataCoverage",
  "resort pages",
  "activity pages",
  "npm run build",
  "OAI-SearchBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Applebot",
  "Disney Springs",
  "resort stay",
  "confirmed dining/experience reservation",
  "free resort-transfer workaround",
  "Do not ping every unchanged URL every day",
]) {
  assert.match(runbook, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}

for (const expected of [
  "June 16, 2026",
  "Intents",
  "Topics",
  "Citation Share",
  "Compare",
]) {
  assert.match(
    strategy,
    new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    `strategy should include current Bing AI visibility guidance for ${expected}`
  );
}

for (const expected of ["Implementation Status", "External launch tasks"]) {
  assert.match(
    strategy,
    new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    `strategy should distinguish implementation status from external launch work for ${expected}`
  );
}

for (const section of [
  "Launch Gate",
  "Weekly Crawl Audit",
  "Freshness And IndexNow",
  "Cloudflare AI Crawl Control",
  "Search Console And Bing",
  "Core Web Vitals",
  "Rank Tracking",
  "AI Visibility Spot Checks",
  "Agent-Friendly SEO Checks",
  "Page Type Scorecard",
  "Transportation Policy Watch",
  "Incident Response",
]) {
  assert.match(
    runbook,
    new RegExp(`## ${section}`, "i"),
    `runbook should include ${section}`
  );
}

assert.ok(packageJson.scripts["seo:crawlers"], "package should expose seo:crawlers");
assert.ok(packageJson.scripts["seo:qa"], "package should expose seo:qa");
assert.ok(packageJson.scripts["seo:indexnow"], "package should expose seo:indexnow");
assert.ok(
  packageJson.scripts["seo:performance-budgets"],
  "package should expose seo:performance-budgets"
);
assert.ok(
  packageJson.scripts["seo:core-web-vitals"],
  "package should expose seo:core-web-vitals"
);
assert.ok(packageJson.scripts["seo:ai-visibility"], "package should expose seo:ai-visibility");
assert.ok(packageJson.scripts["seo:rank-tracking"], "package should expose seo:rank-tracking");
assert.ok(
  packageJson.scripts["seo:page-type-scorecard"],
  "package should expose seo:page-type-scorecard"
);
assert.ok(
  packageJson.scripts["seo:transportation-policy"],
  "package should expose seo:transportation-policy"
);
assert.ok(
  packageJson.scripts["seo:agent-readiness"],
  "package should expose seo:agent-readiness"
);
assert.ok(
  packageJson.scripts["seo:capture-agent-readiness"],
  "package should expose seo:capture-agent-readiness"
);
assert.ok(
  packageJson.scripts["seo:server-logs"],
  "package should expose seo:server-logs"
);
assert.ok(
  packageJson.scripts["seo:google-submit-sitemap"],
  "package should expose seo:google-submit-sitemap"
);
assert.ok(
  packageJson.scripts["seo:google-inspect-urls"],
  "package should expose seo:google-inspect-urls"
);
assert.ok(
  packageJson.scripts["seo:bing-submit-sitemap"],
  "package should expose seo:bing-submit-sitemap"
);

for (const expectedRoute of [
  "/resorts/polynesian-village-resort",
  "/guides/disney-springs-area-resort-activities",
  "/llms.txt",
  "/llms-full.txt",
  "/robots.txt",
  "/sitemap.xml",
]) {
  assert.match(
    routeAudit,
    new RegExp(expectedRoute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `seo:qa route audit should cover ${expectedRoute}`
  );
}

for (const filteredRoute of [
  "/activities?ticket_required=false",
  "/activities?free=true",
  "/activities?weather=indoor",
  "/activities?weather=covered",
  "/activities?transport=monorail",
  "/activities?transport=skyliner",
  "/activities?area=disney-springs",
  "/activities?duration=short&time=evening",
  "/resorts?no_ticket_friendly=true",
  "/today?ticket_required=false",
  "/today?weather=indoor",
  "/tonight?ticket_required=false",
  "/tonight?weather=indoor",
]) {
  assert.match(
    routeAudit,
    new RegExp(filteredRoute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `seo:qa route audit should cover strategic filtered landing page ${filteredRoute}`
  );
}

for (const expected of ["kind", "requiredText", "application/xml"]) {
  assert.match(
    routeAudit,
    new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `seo:qa route audit should validate non-HTML discovery assets with ${expected}`
  );
}

for (const expected of [
  "requiredJsonLd",
  "dateModified",
  "temporalCoverage",
  "TouristAccommodation",
  "/disney-world-resort-activity-calendars",
  "/resorts/polynesian-village-resort",
]) {
  assert.match(
    routeAudit,
    new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `seo:qa route audit should validate current-first JSON-LD field ${expected}`
  );
}

assert.match(
  routeAudit,
  /path:\s*"\/activities\/movies-under-the-stars"[\s\S]*?requiredJsonLd[\s\S]*?dateModified[\s\S]*?temporalCoverage[\s\S]*?description/,
  "seo:qa route audit should validate current-first ItemList JSON-LD on the Movies Under the Stars activity page"
);

console.log("SEO operations runbook tests passed.");
