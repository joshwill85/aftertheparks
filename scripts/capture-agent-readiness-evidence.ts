import {
  captureAgentReadinessEvidenceForHtml,
  renderAgentReadinessEvidenceJsonl,
} from "@/lib/seo/agentReadinessCapture";

const DEFAULT_AGENT_READINESS_ROUTES = [
  "/",
  "/today",
  "/tonight",
  "/activities",
  "/resorts",
  "/disney-world-resort-activity-calendars",
  "/guides/disney-world-non-park-day",
  "/guides/things-to-do-without-park-ticket",
  "/guides/disney-springs-area-resort-activities",
  "/activities/movies-under-the-stars",
  "/resorts/polynesian-village-resort",
];

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function routeUrl(baseUrl: string, route: string): string {
  return `${normalizeBaseUrl(baseUrl)}${route.startsWith("/") ? route : `/${route}`}`;
}

async function captureRoute(baseUrl: string, route: string) {
  const response = await fetch(routeUrl(baseUrl, route), {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "AfterTheParksSEOAgentReadinessCapture/1.0",
    },
  });
  const html = await response.text();
  return captureAgentReadinessEvidenceForHtml({
    route,
    html,
    status: response.status,
    tool: "HTML agent-readiness capture",
  });
}

async function main() {
  const baseUrl = process.env.AGENT_READINESS_BASE_URL || process.env.SEO_QA_BASE_URL;
  if (!baseUrl) {
    console.error(
      "Usage: AGENT_READINESS_BASE_URL=https://aftertheparks.com npm run seo:capture-agent-readiness -- [/route ...]"
    );
    process.exit(1);
  }

  const routes = process.argv.slice(2);
  const routesToCapture = routes.length > 0 ? routes : DEFAULT_AGENT_READINESS_ROUTES;
  const allRecords = (
    await Promise.all(routesToCapture.map((route) => captureRoute(baseUrl, route)))
  ).flat();

  console.log(renderAgentReadinessEvidenceJsonl(allRecords));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
