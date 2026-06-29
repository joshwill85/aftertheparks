export interface CrawlerAuditAgent {
  name: string;
  userAgent: string;
}

export interface CrawlerAuditRoute {
  path: string;
  kind: "html" | "text";
  requiredText?: string[];
}

export interface CrawlerResponseInput {
  route: CrawlerAuditRoute;
  status: number;
  headers: Headers;
  body: string;
}

export const CRAWLER_AUDIT_AGENTS: CrawlerAuditAgent[] = [
  {
    name: "Googlebot",
    userAgent:
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  },
  {
    name: "Googlebot-Image",
    userAgent:
      "Googlebot-Image/1.0 (+http://www.google.com/bot.html)",
  },
  {
    name: "Bingbot",
    userAgent:
      "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  },
  {
    name: "Applebot",
    userAgent:
      "Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)",
  },
  {
    name: "OAI-SearchBot",
    userAgent:
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
  },
  {
    name: "ChatGPT-User",
    userAgent:
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
  },
  {
    name: "PerplexityBot",
    userAgent:
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot",
  },
  {
    name: "Claude-User",
    userAgent:
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-User/1.0; +https://www.anthropic.com",
  },
  {
    name: "Claude-SearchBot",
    userAgent:
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-SearchBot/1.0; +https://www.anthropic.com",
  },
  {
    name: "Facebook preview",
    userAgent:
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  },
  {
    name: "Twitter preview",
    userAgent: "Twitterbot/1.0",
  },
];

export const DEFAULT_CRAWLER_AUDIT_ROUTES: CrawlerAuditRoute[] = [
  { path: "/", kind: "html" },
  { path: "/today", kind: "html" },
  { path: "/tonight", kind: "html" },
  { path: "/activities", kind: "html" },
  { path: "/resorts", kind: "html" },
  { path: "/disney-world-resort-activity-calendars", kind: "html" },
  { path: "/guides/things-to-do-without-park-ticket", kind: "html" },
  { path: "/activities/movies-under-the-stars", kind: "html" },
  { path: "/resorts/polynesian-village-resort", kind: "html" },
  {
    path: "/llms.txt",
    kind: "text",
    requiredText: ["After the Parks", "Disney Springs"],
  },
  {
    path: "/llms-full.txt",
    kind: "text",
    requiredText: ["Planning guide creation", "Best next pages"],
  },
  {
    path: "/robots.txt",
    kind: "text",
    requiredText: [
      "OAI-SearchBot",
      "Claude-SearchBot",
      "GPTBot",
      "ClaudeBot",
      "Google-Extended",
      "Applebot-Extended",
      "Disallow: /",
      "Sitemap:",
    ],
  },
];

export function buildCrawlerFetchHeaders(
  agent: CrawlerAuditAgent,
  kind: CrawlerAuditRoute["kind"]
): Record<string, string> {
  return {
    "User-Agent": agent.userAgent,
    Accept:
      kind === "html"
        ? "text/html,application/xhtml+xml"
        : "text/plain,*/*;q=0.8",
  };
}

function textBetween(html: string, pattern: RegExp): string | undefined {
  return html.match(pattern)?.[1]?.trim();
}

export function auditCrawlerResponse({
  route,
  status,
  headers,
  body,
}: CrawlerResponseInput): string[] {
  const issues: string[] = [];
  const xRobots = headers.get("x-robots-tag") ?? "";
  const contentType = headers.get("content-type") ?? "";

  if (status !== 200) issues.push(`expected 200, got ${status}`);
  if (/noindex/i.test(xRobots)) issues.push("contains noindex x-robots-tag");
  if (/password required|deployment protection|private preview|access gate/i.test(body)) {
    issues.push("appears gated");
  }

  if (route.kind === "html") {
    const title = textBetween(body, /<title[^>]*>([^<]+)<\/title>/i);
    const h1 = textBetween(body, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const canonical = textBetween(
      body,
      /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i
    );

    if (!/text\/html/i.test(contentType)) {
      issues.push(`expected text/html content-type, got ${contentType || "missing"}`);
    }
    if (!title || title.length < 8) issues.push("missing useful title");
    if (!h1) issues.push("missing H1");
    if (!canonical) issues.push("missing canonical link");
    if (!body.includes('type="application/ld+json"')) {
      issues.push("missing JSON-LD");
    }
    if (/<meta\s+name=["']robots["'][^>]+noindex/i.test(body)) {
      issues.push("contains noindex meta tag");
    }
  } else {
    if (!/text\/plain/i.test(contentType)) {
      issues.push(`expected text/plain content-type, got ${contentType || "missing"}`);
    }
    for (const expected of route.requiredText ?? []) {
      if (!body.includes(expected)) {
        issues.push(`missing required text: ${expected}`);
      }
    }
  }

  return issues;
}
