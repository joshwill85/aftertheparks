interface RouteAuditTarget {
  path: string;
  kind: "html" | "text" | "xml";
  requiredText?: string[];
  requiredJsonLd?: Array<{
    type: string;
    fields: string[];
  }>;
}

const DEFAULT_ROUTES: RouteAuditTarget[] = [
  { path: "/", kind: "html" },
  {
    path: "/today",
    kind: "html",
    requiredText: [
      "Source and freshness",
      "Last verified",
      "Source and accuracy policy",
    ],
  },
  { path: "/today?weather=indoor", kind: "html" },
  {
    path: "/tonight",
    kind: "html",
    requiredText: [
      "Source and freshness",
      "Last verified",
      "Source and accuracy policy",
    ],
  },
  { path: "/tonight?weather=indoor", kind: "html" },
  { path: "/activities", kind: "html" },
  { path: "/activities?free=true", kind: "html" },
  { path: "/activities?weather=indoor", kind: "html" },
  { path: "/activities?weather=covered", kind: "html" },
  { path: "/activities?transport=monorail", kind: "html" },
  { path: "/activities?transport=skyliner", kind: "html" },
  {
    path: "/activities?area=disney-springs",
    kind: "html",
    requiredText: [
      "Do not use Disney Springs as a free way",
      "resort stay",
      "dining/experience reservation",
    ],
  },
  { path: "/resorts", kind: "html" },
  {
    path: "/resorts?no_ticket_friendly=true",
    kind: "html",
    requiredText: [
      "Do not use Disney Springs as a free way",
      "resort stay",
      "dining/experience reservation",
    ],
  },
  {
    path: "/resorts/polynesian-village-resort",
    kind: "html",
    requiredText: [
      'aria-label="Breadcrumb"',
      "Source and freshness",
      "Last verified",
      "Source and accuracy policy",
    ],
    requiredJsonLd: [
      {
        type: "BreadcrumbList",
        fields: ["itemListElement"],
      },
      {
        type: "TouristAccommodation",
        fields: ["name", "url", "mainEntityOfPage", "subjectOf"],
      },
      {
        type: "ItemList",
        fields: ["dateModified", "temporalCoverage", "description"],
      },
    ],
  },
  {
    path: "/disney-world-resort-activity-calendars",
    kind: "html",
    requiredText: [
      "Current status",
      "Official sources checked",
      "Next expected refresh",
      "Send a correction",
    ],
    requiredJsonLd: [
      {
        type: "ItemList",
        fields: ["dateModified", "temporalCoverage", "description"],
      },
    ],
  },
  {
    path: "/disney-world-resort-activity-calendars/summer-2026",
    kind: "html",
    requiredText: ['aria-label="Breadcrumb"'],
    requiredJsonLd: [
      {
        type: "BreadcrumbList",
        fields: ["itemListElement"],
      },
      {
        type: "ItemList",
        fields: ["dateModified", "temporalCoverage", "description"],
      },
    ],
  },
  {
    path: "/disney-world-resort-activity-calendars/fall-2026",
    kind: "html",
    requiredText: ['aria-label="Breadcrumb"'],
    requiredJsonLd: [
      {
        type: "BreadcrumbList",
        fields: ["itemListElement"],
      },
      {
        type: "ItemList",
        fields: ["dateModified", "temporalCoverage", "description"],
      },
    ],
  },
  {
    path: "/disney-world-resort-activity-calendars/holiday-2026",
    kind: "html",
    requiredText: ['aria-label="Breadcrumb"'],
    requiredJsonLd: [
      {
        type: "BreadcrumbList",
        fields: ["itemListElement"],
      },
      {
        type: "ItemList",
        fields: ["dateModified", "temporalCoverage", "description"],
      },
    ],
  },
  {
    path: "/source-and-accuracy-policy",
    kind: "html",
    requiredText: [
      "Do not use Disney Springs as a free way",
      "resort stay",
      "dining/experience reservation",
    ],
  },
  {
    path: "/guides/disney-world-non-park-day",
    kind: "html",
    requiredText: [
      'aria-label="Breadcrumb"',
      "Do not use Disney Springs as a free way",
      "resort stay",
      "dining/experience reservation",
      "Editorial review",
      "Last updated",
      "Mistakes to avoid",
      "Planning quality checks",
      "Research dossier",
    ],
    requiredJsonLd: [
      {
        type: "BreadcrumbList",
        fields: ["itemListElement"],
      },
      {
        type: "Article",
        fields: ["headline", "dateModified", "author", "reviewedBy"],
      },
      {
        type: "FAQPage",
        fields: ["mainEntity"],
      },
      {
        type: "ItemList",
        fields: ["itemListElement"],
      },
    ],
  },
  {
    path: "/guides/things-to-do-without-park-ticket",
    kind: "html",
    requiredText: [
      'aria-label="Breadcrumb"',
      "Do not use Disney Springs as a free way",
      "resort stay",
      "dining/experience reservation",
      "Editorial review",
      "Last updated",
      "Mistakes to avoid",
      "Planning quality checks",
      "Research dossier",
    ],
    requiredJsonLd: [
      {
        type: "BreadcrumbList",
        fields: ["itemListElement"],
      },
      {
        type: "Article",
        fields: ["headline", "dateModified", "author", "reviewedBy"],
      },
      {
        type: "FAQPage",
        fields: ["mainEntity"],
      },
      {
        type: "ItemList",
        fields: ["itemListElement"],
      },
    ],
  },
  {
    path: "/guides/disney-springs-area-resort-activities",
    kind: "html",
    requiredText: [
      'aria-label="Breadcrumb"',
      "Do not use Disney Springs as a free way",
      "resort stay",
      "dining/experience reservation",
      "Editorial review",
      "Last updated",
      "Mistakes to avoid",
      "Planning quality checks",
      "Research dossier",
    ],
    requiredJsonLd: [
      {
        type: "BreadcrumbList",
        fields: ["itemListElement"],
      },
      {
        type: "Article",
        fields: ["headline", "dateModified", "author", "reviewedBy"],
      },
      {
        type: "FAQPage",
        fields: ["mainEntity"],
      },
      {
        type: "ItemList",
        fields: ["itemListElement"],
      },
    ],
  },
  {
    path: "/activities/movies-under-the-stars",
    kind: "html",
    requiredText: [
      'aria-label="Breadcrumb"',
      "Source and freshness",
      "Last verified",
      "Source and accuracy policy",
    ],
    requiredJsonLd: [
      {
        type: "BreadcrumbList",
        fields: ["itemListElement"],
      },
      {
        type: "ItemList",
        fields: ["dateModified", "temporalCoverage", "description"],
      },
    ],
  },
  { path: "/llms.txt", kind: "text", requiredText: ["After the Parks", "Disney Springs"] },
  {
    path: "/llms-full.txt",
    kind: "text",
    requiredText: ["Research dossier", "Competitor gap analysis"],
  },
  {
    path: "/robots.txt",
    kind: "text",
    requiredText: ["OAI-SearchBot", "Claude-SearchBot", "Sitemap:"],
  },
  {
    path: "/sitemap.xml",
    kind: "xml",
    requiredText: [
      "<urlset",
      "/disney-world-resort-activity-calendars",
      "/guides/disney-springs-area-resort-activities",
    ],
  },
];

interface RouteAuditResult {
  route: string;
  status: number;
  issues: string[];
}

function textBetween(html: string, pattern: RegExp): string | undefined {
  return html.match(pattern)?.[1]?.trim();
}

function jsonLdTypeMatches(value: unknown, expectedType: string): boolean {
  if (Array.isArray(value)) return value.includes(expectedType);
  return value === expectedType;
}

function flattenJsonLd(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenJsonLd(item));
  }
  if (!value || typeof value !== "object") return [];

  const node = value as Record<string, unknown>;
  const graph = node["@graph"];
  if (Array.isArray(graph)) {
    return [node, ...graph.flatMap((item) => flattenJsonLd(item))];
  }

  return [node];
}

function parseJsonLdNodes(html: string): {
  nodes: Array<Record<string, unknown>>;
  parseFailures: number;
} {
  const nodes: Array<Record<string, unknown>> = [];
  let parseFailures = 0;
  const pattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    try {
      nodes.push(...flattenJsonLd(JSON.parse(match[1].trim())));
    } catch {
      parseFailures += 1;
    }
  }

  return { nodes, parseFailures };
}

function routeFromArg(arg: string): RouteAuditTarget {
  if (arg.endsWith(".xml")) return { path: arg, kind: "xml" };
  if (arg.endsWith(".txt")) return { path: arg, kind: "text" };
  return { path: arg, kind: "html" };
}

function auditHtml(route: RouteAuditTarget, status: number, html: string, headers: Headers) {
  const issues: string[] = [];
  const contentType = headers.get("content-type") ?? "";
  const title = textBetween(html, /<title[^>]*>([^<]+)<\/title>/i);
  const description = textBetween(
    html,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["'][^>]*>/i
  );
  const canonical = textBetween(
    html,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i
  );
  const h1 = textBetween(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const xRobots = headers.get("x-robots-tag") ?? "";

  if (status !== 200) issues.push(`expected 200, got ${status}`);
  if (!/text\/html/i.test(contentType)) {
    issues.push(`expected text/html content-type, got ${contentType || "missing"}`);
  }
  if (!title || title.length < 8) issues.push("missing useful title");
  if (!description || description.length < 40) {
    issues.push("missing useful meta description");
  }
  if (!canonical) issues.push("missing canonical link");
  if (!h1) issues.push("missing H1");
  if (!html.includes('type="application/ld+json"')) {
    issues.push("missing JSON-LD");
  }
  if (/noindex/i.test(xRobots) || /<meta\s+name=["']robots["'][^>]+noindex/i.test(html)) {
    issues.push("contains noindex");
  }
  if (/password required|deployment protection|private preview|access gate/i.test(html)) {
    issues.push("appears to be gated");
  }
  for (const expected of route.requiredText ?? []) {
    if (!html.includes(expected)) {
      issues.push(`missing required text: ${expected}`);
    }
  }
  if (route.requiredJsonLd?.length) {
    const { nodes, parseFailures } = parseJsonLdNodes(html);
    if (parseFailures > 0) issues.push(`invalid JSON-LD script count: ${parseFailures}`);

    for (const required of route.requiredJsonLd) {
      const node = nodes.find((candidate) =>
        jsonLdTypeMatches(candidate["@type"], required.type)
      );
      if (!node) {
        issues.push(`missing JSON-LD type: ${required.type}`);
        continue;
      }

      for (const field of required.fields) {
        const value = node[field];
        if (value == null || value === "") {
          issues.push(`missing JSON-LD ${required.type}.${field}`);
        }
      }
    }
  }

  return issues;
}

function auditAsset(route: RouteAuditTarget, status: number, body: string, headers: Headers) {
  const issues: string[] = [];
  const contentType = headers.get("content-type") ?? "";

  if (status !== 200) issues.push(`expected 200, got ${status}`);
  if (route.kind === "text" && !/text\/plain/i.test(contentType)) {
    issues.push(`expected text/plain content-type, got ${contentType || "missing"}`);
  }
  if (route.kind === "xml" && !/(application|text)\/xml/i.test(contentType)) {
    issues.push(`expected application/xml content-type, got ${contentType || "missing"}`);
  }
  if (/password required|deployment protection|private preview|access gate/i.test(body)) {
    issues.push("appears to be gated");
  }

  for (const expected of route.requiredText ?? []) {
    if (!body.includes(expected)) {
      issues.push(`missing required text: ${expected}`);
    }
  }

  return issues;
}

async function auditRoute(baseUrl: string, route: RouteAuditTarget): Promise<RouteAuditResult> {
  const url = new URL(route.path, baseUrl);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AfterTheParksSeoAudit/1.0",
      Accept:
        route.kind === "html"
          ? "text/html,application/xhtml+xml"
          : route.kind === "xml"
            ? "application/xml,text/xml,*/*;q=0.8"
            : "text/plain,*/*;q=0.8",
    },
  });
  const body = await response.text();

  return {
    route: route.path,
    status: response.status,
    issues:
      route.kind === "html"
        ? auditHtml(route, response.status, body, response.headers)
        : auditAsset(route, response.status, body, response.headers),
  };
}

async function main() {
  const baseUrl =
    process.env.SEO_QA_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const routes = process.argv.slice(2);
  const routesToAudit = routes.length > 0 ? routes.map(routeFromArg) : DEFAULT_ROUTES;
  const results = await Promise.all(
    routesToAudit.map((route) => auditRoute(baseUrl, route))
  );
  const failures = results.filter((result) => result.issues.length > 0);

  for (const result of results) {
    if (result.issues.length === 0) {
      console.log(`OK ${result.route}`);
    } else {
      console.log(`FAIL ${result.route}: ${result.issues.join("; ")}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`${failures.length} SEO route audit(s) failed.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
