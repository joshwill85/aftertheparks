import { inspectGoogleUrl, type GoogleUrlInspectionSummary } from "@/lib/seo/externalReadiness";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://aftertheparks.com";
const defaultPaths = [
  "/",
  "/today",
  "/tonight",
  "/activities",
  "/resorts",
  "/disney-world-resort-activity-calendars",
  "/source-and-accuracy-policy",
  "/activities",
  "/resorts?no_ticket_friendly=true",
  "/activities?area=disney-springs",
  "/activities/movies-under-the-stars",
  "/resorts/polynesian-village-resort",
];

const requestedUrls = process.argv.slice(2);
const inspectionUrls = (requestedUrls.length > 0 ? requestedUrls : defaultPaths).map((value) =>
  value.startsWith("http") ? value : new URL(value, siteUrl).toString()
);

function cell(value: string | undefined): string {
  return value?.trim() || "-";
}

function renderTable(rows: GoogleUrlInspectionSummary[]): string {
  const lines = [
    "| URL | Verdict | Coverage | Robots | Indexing | Fetch | Last crawl |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    lines.push(
      `| ${row.inspectionUrl} | ${cell(row.verdict)} | ${cell(row.coverageState)} | ${cell(
        row.robotsTxtState
      )} | ${cell(row.indexingState)} | ${cell(row.pageFetchState)} | ${cell(row.lastCrawlTime)} |`
    );
  }
  return lines.join("\n");
}

async function main() {
  const results: GoogleUrlInspectionSummary[] = [];
  for (const inspectionUrl of inspectionUrls) {
    results.push(
      await inspectGoogleUrl({
        inspectionUrl,
        siteUrl,
        searchConsoleSiteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL,
        accessToken: process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN,
        credentialsFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        clientEmail: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL,
        privateKey: process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY,
      })
    );
  }

  console.log("# Google Search Console URL Inspection");
  console.log("");
  console.log(renderTable(results));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Google URL inspection failed.");
  process.exit(1);
});
