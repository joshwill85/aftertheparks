import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import { CORE_WEB_VITALS_BUDGETS } from "@/lib/seo/measurement";

export type AppBuildManifest = {
  pages: Record<string, string[]>;
};

export type SeoPerformanceBudgetRow = {
  route: string;
  group: string;
  gzipKb: number;
  budgetKb: number;
};

export type SeoPerformanceBudgetAudit = {
  issues: string[];
  rows: SeoPerformanceBudgetRow[];
};

export const SEO_PERFORMANCE_ROUTE_PATTERNS = [
  { route: "/page", group: "homepage_calendar_hub" },
  { route: "/today/page", group: "today_tonight" },
  { route: "/tonight/page", group: "today_tonight" },
  { route: "/activities/page", group: "activity_pages" },
  { route: "/activities/[slug]/page", group: "activity_pages" },
  { route: "/resorts/page", group: "resort_pages" },
  { route: "/resorts/[slug]/page", group: "resort_pages" },
  {
    route: "/disney-world-resort-activity-calendars/page",
    group: "homepage_calendar_hub",
  },
  {
    route: "/disney-world-resort-activity-calendars/[season]/page",
    group: "calendar_pages",
  },
  { route: "/calendar/page", group: "homepage_calendar_hub" },
] as const;

function gzipKbForChunks(chunks: string[], readChunk: (chunkPath: string) => Buffer): number {
  let bytes = 0;
  const seen = new Set<string>();
  for (const chunk of chunks) {
    if (seen.has(chunk) || !chunk.endsWith(".js")) continue;
    seen.add(chunk);
    bytes += gzipSync(readChunk(chunk)).byteLength;
  }
  return Math.round((bytes / 1024) * 10) / 10;
}

export function auditSeoPerformanceBudgets({
  manifest,
  readChunk,
  budgetKb = CORE_WEB_VITALS_BUDGETS.mobileJsKb,
}: {
  manifest: AppBuildManifest;
  readChunk: (chunkPath: string) => Buffer;
  budgetKb?: number;
}): SeoPerformanceBudgetAudit {
  const issues: string[] = [];
  const rows: SeoPerformanceBudgetRow[] = [];

  for (const routePattern of SEO_PERFORMANCE_ROUTE_PATTERNS) {
    const chunks = manifest.pages[routePattern.route];
    if (!chunks) {
      issues.push(`Missing SEO performance route in app build manifest: ${routePattern.route}`);
      continue;
    }

    const gzipKb = gzipKbForChunks(chunks, readChunk);
    rows.push({
      route: routePattern.route,
      group: routePattern.group,
      gzipKb,
      budgetKb,
    });

    if (gzipKb > budgetKb) {
      issues.push(`${routePattern.route} exceeds SEO mobile JS budget: ${gzipKb} KB > ${budgetKb} KB`);
    }
  }

  return { issues, rows };
}

export function renderSeoPerformanceBudgetReport(
  rows: SeoPerformanceBudgetRow[],
  issues: string[]
): string {
  const lines = [
    "# SEO Performance Budget Audit",
    "",
    `Budget: ${CORE_WEB_VITALS_BUDGETS.mobileJsKb} KB gzip JS per SEO-critical route`,
    "",
    "| Route | Group | Gzip JS KB | Budget KB | Status |",
    "| --- | --- | ---: | ---: | --- |",
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.route} | ${row.group} | ${row.gzipKb} | ${row.budgetKb} | ${
        row.gzipKb <= row.budgetKb ? "pass" : "fail"
      } |`
    );
  }

  lines.push("", "## Issues");
  if (issues.length === 0) {
    lines.push("- None");
  } else {
    for (const issue of issues) lines.push(`- ${issue}`);
  }

  return lines.join("\n");
}

export function loadBuiltSeoPerformanceAudit(nextDir = ".next"): SeoPerformanceBudgetAudit {
  const manifestPath = join(nextDir, "app-build-manifest.json");
  if (!existsSync(manifestPath)) {
    return {
      rows: [],
      issues: [`Missing ${manifestPath}. Run npm run build before auditing SEO performance budgets.`],
    };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as AppBuildManifest;
  return auditSeoPerformanceBudgets({
    manifest,
    readChunk: (chunkPath) => readFileSync(join(nextDir, chunkPath)),
    budgetKb: CORE_WEB_VITALS_BUDGETS.mobileJsKb,
  });
}
