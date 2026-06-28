import {
  CRAWLER_AUDIT_AGENTS,
  DEFAULT_CRAWLER_AUDIT_ROUTES,
  auditCrawlerResponse,
  buildCrawlerFetchHeaders,
  type CrawlerAuditAgent,
  type CrawlerAuditRoute,
} from "@/lib/seo/crawlerAccess";

interface CrawlerAuditResult {
  agent: string;
  route: string;
  status: number;
  issues: string[];
}

function routeFromArg(arg: string): CrawlerAuditRoute {
  if (arg.endsWith(".txt")) {
    return { path: arg, kind: "text" };
  }
  return { path: arg, kind: "html" };
}

async function auditRouteForAgent(
  baseUrl: string,
  agent: CrawlerAuditAgent,
  route: CrawlerAuditRoute
): Promise<CrawlerAuditResult> {
  const response = await fetch(new URL(route.path, baseUrl), {
    headers: buildCrawlerFetchHeaders(agent, route.kind),
  });
  const body = await response.text();

  return {
    agent: agent.name,
    route: route.path,
    status: response.status,
    issues: auditCrawlerResponse({
      route,
      status: response.status,
      headers: response.headers,
      body,
    }),
  };
}

async function main() {
  const baseUrl =
    process.env.CRAWLER_QA_BASE_URL ??
    process.env.SEO_QA_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const routeArgs = process.argv.slice(2);
  const routes = routeArgs.length
    ? routeArgs.map(routeFromArg)
    : DEFAULT_CRAWLER_AUDIT_ROUTES;

  const results = await Promise.all(
    CRAWLER_AUDIT_AGENTS.flatMap((agent) =>
      routes.map((route) => auditRouteForAgent(baseUrl, agent, route))
    )
  );
  const failures = results.filter((result) => result.issues.length > 0);

  for (const result of results) {
    if (result.issues.length === 0) {
      console.log(`OK ${result.agent} ${result.route}`);
    } else {
      console.log(
        `FAIL ${result.agent} ${result.route}: ${result.issues.join("; ")}`
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(`${failures.length} crawler access audit(s) failed.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
