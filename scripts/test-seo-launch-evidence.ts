import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const evidence = readFileSync("docs/seo-launch-evidence-2026-06-27.md", "utf8");

for (const expected of [
  "# SEO Launch Evidence - June 27, 2026",
  "https://aftertheparks.com",
  "password gate was removed from runtime code",
  "dpl_fyXjPYS6TrorgQK83qx3HvLeG7AR",
  "dpl_Hbm8h5J3XwDxJ9cfyHBDhk4TKsnw",
  "dpl_GLSwUniunZxQLvxzMapK42PJZ6jc",
  "dpl_GCYSqnAkg3nMNLFxfrHyrz6M13fW",
  "dpl_7oCU4jtLjcwWhPsZrULU6MANJ54w",
  "SEO_QA_BASE_URL=https://aftertheparks.com npm run seo:qa",
  "CRAWLER_QA_BASE_URL=https://aftertheparks.com npm run seo:crawlers",
  "npm run seo:server-logs",
  "npm run seo:ai-visibility",
  "npm run seo:rank-tracking",
  "npm run seo:page-type-scorecard",
  "npm run seo:transportation-policy",
  "npm run seo:agent-readiness",
  "npm run seo:capture-agent-readiness",
  "npm run seo:performance-budgets",
  "npm run seo:core-web-vitals",
  "320 KB SEO route budget",
  "core-web-vitals.jsonl",
  "npm run seo:external-readiness",
  "npm run seo:google-submit-sitemap",
  "npm run seo:google-inspect-urls",
  "npm run seo:bing-submit-sitemap",
  "GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN",
  "BING_WEBMASTER_API_KEY",
  "Submitted 12 changed URL(s) to IndexNow",
  "Agent Readiness Evidence Audit",
  "Issues: None",
  "rank-tracking-evidence.jsonl",
  "page-type-scorecard.jsonl",
  "Transportation Policy Audit",
  "Use a resort stay, restaurant reservation, dining reservation, confirmed dining/experience reservation",
  "8ff5c8f7321bc8fd1afbecbd5ebd9646",
  "Do not use Disney Springs as a free way",
  "resort stay",
  "dining/experience reservation",
  "hidden crawler-only text",
  "Google Search Console",
  "Bing Webmaster Tools",
  "GOOGLE_SITE_VERIFICATION",
  "BING_SITE_VERIFICATION",
  "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
  "NEXT_PUBLIC_BING_SITE_VERIFICATION",
  "Cloudflare AI Crawl Control",
  "GOOGLE_APPLICATION_CREDENTIALS missing",
  "BING_WEBMASTER_API_KEY missing",
  "Cloudflare token returned zero visible zones",
]) {
  assert.match(
    evidence,
    new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    `launch evidence should include ${expected}`
  );
}

for (const section of [
  "Completed Live Proof",
  "IndexNow Submission",
  "Search Console And Bing Status",
  "Cloudflare AI Crawl Control Status",
  "Remaining Completion Gates",
]) {
  assert.match(
    evidence,
    new RegExp(`## ${section}`, "i"),
    `launch evidence should include ${section}`
  );
}

assert.doesNotMatch(
  evidence,
  /cfat_[A-Za-z0-9_-]+|BEGIN PRIVATE KEY|AIza[0-9A-Za-z_-]+/,
  "launch evidence must not contain API tokens or private keys"
);

console.log("SEO launch evidence tests passed.");
