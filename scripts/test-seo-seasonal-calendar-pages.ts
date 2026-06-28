import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sitemap from "@/app/sitemap";
import {
  getSeasonalCalendarPageBySlug,
  SEASONAL_CALENDAR_PAGES,
  validateSeasonalCalendarPages,
} from "@/lib/seo/seasonalCalendarPages";
import { generateMetadata } from "@/app/disney-world-resort-activity-calendars/[season]/page";

async function main() {
  const requiredSlugs = ["summer-2026", "fall-2026", "holiday-2026"];

  for (const slug of requiredSlugs) {
    const page = getSeasonalCalendarPageBySlug(slug);
    assert.ok(page, `${slug} should be a seasonal calendar page`);
    assert.match(page!.title, /Walt Disney World|Disney World/i);
    assert.ok(page!.primaryAction.href.startsWith("/"), `${slug} should route back into product data`);
    assert.ok(page!.deepLinks.length >= 3, `${slug} should have live-data deep links`);
    assert.ok(page!.sourceCaveats.length >= 2, `${slug} should have source caveats`);
  }

  const issues = validateSeasonalCalendarPages(SEASONAL_CALENDAR_PAGES);
  assert.deepEqual(issues, [], `seasonal calendar pages should pass qualification: ${issues.join("; ")}`);

  const holidayMetadata = await generateMetadata({
    params: Promise.resolve({ season: "holiday-2026" }),
  });
  assert.match(String(holidayMetadata.title), /Holiday 2026/i);
  assert.deepEqual(holidayMetadata.alternates, {
    canonical: "/disney-world-resort-activity-calendars/holiday-2026",
  });

  process.env.NEXT_PUBLIC_SITE_URL = "https://aftertheparks.com";
  const urls = (await sitemap()).map((entry) => entry.url);
  for (const slug of requiredSlugs) {
    assert.ok(
      urls.includes(`https://aftertheparks.com/disney-world-resort-activity-calendars/${slug}`),
      `${slug} should appear in the sitemap`
    );
  }

  const hub = readFileSync("app/disney-world-resort-activity-calendars/page.tsx", "utf8");
  for (const expected of [
    "Seasonal calendar planning",
    "SEASONAL_CALENDAR_PAGES",
    "page.slug",
  ]) {
    assert.match(hub, new RegExp(expected), `calendar hub should link ${expected}`);
  }

  const seasonRoute = readFileSync(
    "app/disney-world-resort-activity-calendars/[season]/page.tsx",
    "utf8"
  );
  for (const expected of [
    "getSeasonalCalendarPageBySlug",
    "Current seasonal snapshot",
    "Source and accuracy notes",
    "buildItemListJsonLd",
    "buildBreadcrumbJsonLd",
    "Breadcrumbs",
    "dateModified",
    "currentScheduleWindow",
    "Next expected refresh",
    "lg:grid-cols-5",
    "flex flex-wrap gap-4",
    "/corrections",
    "notFound",
  ]) {
    assert.match(seasonRoute, new RegExp(expected), `season route should include ${expected}`);
  }

  const routeAudit = readFileSync("scripts/audit-seo-routes.ts", "utf8");
  for (const slug of requiredSlugs) {
    assert.match(
      routeAudit,
      new RegExp(`/disney-world-resort-activity-calendars/${slug}`),
      `${slug} should be part of rendered SEO route QA`
    );
    assert.match(
      routeAudit,
      new RegExp(
        `path:\\s*"/disney-world-resort-activity-calendars/${slug}"[\\s\\S]+type:\\s*"BreadcrumbList"`
      ),
      `${slug} rendered SEO route QA should require BreadcrumbList`
    );
  }

  console.log("SEO seasonal calendar page tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
