import assert from "node:assert/strict";
import {
  CRAWLER_AUDIT_AGENTS,
  DEFAULT_CRAWLER_AUDIT_ROUTES,
  auditCrawlerResponse,
  buildCrawlerFetchHeaders,
} from "@/lib/seo/crawlerAccess";

for (const expected of [
  "Googlebot",
  "Googlebot-Image",
  "Bingbot",
  "Applebot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Claude-User",
  "Claude-SearchBot",
  "facebookexternalhit",
  "Twitterbot",
]) {
  assert.ok(
    CRAWLER_AUDIT_AGENTS.some((agent) => agent.userAgent.includes(expected)),
    `crawler audit should include ${expected}`
  );
}

for (const expectedRoute of [
  "/",
  "/today",
  "/tonight",
  "/disney-world-resort-activity-calendars",
  "/guides/things-to-do-without-park-ticket",
  "/llms.txt",
  "/llms-full.txt",
  "/robots.txt",
]) {
  assert.ok(
    DEFAULT_CRAWLER_AUDIT_ROUTES.some((route) => route.path === expectedRoute),
    `crawler audit should cover ${expectedRoute}`
  );
}

const robotsRoute = DEFAULT_CRAWLER_AUDIT_ROUTES.find(
  (route) => route.path === "/robots.txt"
);
assert.ok(robotsRoute, "crawler audit should fetch robots.txt");
for (const expected of ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended"]) {
  assert.ok(
    robotsRoute.requiredText?.includes(expected),
    `crawler audit should verify robots.txt includes ${expected} training/model-use controls`
  );
}

const htmlIssues = auditCrawlerResponse({
  route: { path: "/today", kind: "html" },
  status: 200,
  headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
  body:
    '<html><head><title>Disney World Resort Activities Today</title><link rel="canonical" href="https://aftertheparks.com/today"><script type="application/ld+json">{}</script></head><body><h1>Today</h1></body></html>',
});
assert.deepEqual(htmlIssues, [], "valid public HTML should pass crawler audit");

const gatedIssues = auditCrawlerResponse({
  route: { path: "/today", kind: "html" },
  status: 200,
  headers: new Headers({ "x-robots-tag": "noindex, nofollow" }),
  body: "<html><body><h1>Password required</h1><p>Private preview</p></body></html>",
});
assert.ok(
  gatedIssues.some((issue) => issue.includes("noindex")),
  "crawler audit should flag noindex"
);
assert.ok(
  gatedIssues.some((issue) => issue.includes("gated")),
  "crawler audit should flag gate markup"
);

const textIssues = auditCrawlerResponse({
  route: { path: "/llms-full.txt", kind: "text", requiredText: ["Research dossier"] },
  status: 200,
  headers: new Headers({ "content-type": "text/plain; charset=utf-8" }),
  body: "# After the Parks\nResearch dossier\n",
});
assert.deepEqual(textIssues, [], "valid AI discovery text should pass crawler audit");

const headers = buildCrawlerFetchHeaders(CRAWLER_AUDIT_AGENTS[0], "html");
assert.equal(headers["User-Agent"], CRAWLER_AUDIT_AGENTS[0].userAgent);
assert.match(headers.Accept, /text\/html/);

console.log("SEO crawler access tests passed.");
