import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildPlanAheadHref,
  parsePlanAheadParams,
} from "@/lib/calendar/params";
import { buildFutureActivityInsights } from "@/lib/calendar/insights";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

function occurrence(input: {
  id: string;
  resortSlug: string;
  resortName: string;
  area?: string;
  category?: string;
  startDateTime: string;
  daypart: ActivityOccurrence["daypart"];
  priceState?: ActivityOccurrence["price"]["state"];
}): ActivityOccurrence {
  return {
    id: input.id,
    activitySlug: input.id,
    activityCatalogId: input.id,
    resort: {
      slug: input.resortSlug,
      name: input.resortName,
      tier: "deluxe",
      area: input.area ?? "magic-kingdom",
    },
    title: input.id,
    summary: "Test activity",
    category: input.category ?? "campfire",
    section: "resort_activity",
    startDateTime: input.startDateTime,
    daypart: input.daypart,
    price: { state: input.priceState ?? "unknown" },
    location: { label: "Test location" },
    eligibility: { ages: [] },
    freshness: {
      lastVerified: "2026-06-28",
      sourceUrl: "https://example.com",
      badge: "verified",
    },
    status: "active",
  };
}

const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
  } catch (error) {
    failures.push(
      `${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

check("calendar params preserve valid future planning filters", () => {
  const params = parsePlanAheadParams(
    {
      start: "2026-07-04",
      end: "2026-07-06",
      selected: "2026-07-05",
      resort: "grand-floridian-resort-and-spa",
      category: "movies_under_stars",
      area: "magic-kingdom",
      daypart: "evening",
    },
    { today: "2026-06-28" }
  );

  assert.equal(params.start, "2026-07-04");
  assert.equal(params.end, "2026-07-06");
  assert.equal(params.selected, "2026-07-05");
  assert.equal(params.resort, "grand-floridian-resort-and-spa");
  assert.equal(params.category, "movies_under_stars");
  assert.equal(params.area, "magic-kingdom");
  assert.equal(params.daypart, "evening");
});

check("calendar params fall back and clamp invalid date input", () => {
  const params = parsePlanAheadParams(
    {
      start: "not-a-date",
      end: "2026-06-01",
      selected: "2026-12-25",
      daypart: "breakfast",
    },
    { today: "2026-06-28" }
  );

  assert.equal(params.start, "2026-06-28");
  assert.equal(params.end, "2026-07-28");
  assert.equal(params.selected, "2026-06-28");
  assert.equal(params.daypart, undefined);
});

check("calendar href builder serializes supported filters", () => {
  assert.equal(
    buildPlanAheadHref({
      start: "2026-07-04",
      end: "2026-07-06",
      selected: "2026-07-05",
      resort: "grand-floridian-resort-and-spa",
      category: "campfire",
      area: "magic-kingdom",
      daypart: "late",
    }),
    "/calendar?start=2026-07-04&end=2026-07-06&selected=2026-07-05&resort=grand-floridian-resort-and-spa&category=campfire&area=magic-kingdom&daypart=late"
  );
});

check("future insights rank dates and resorts inside the selected range", () => {
  const insights = buildFutureActivityInsights([
    occurrence({
      id: "grand-evening",
      resortSlug: "grand-floridian-resort-and-spa",
      resortName: "Disney's Grand Floridian Resort & Spa",
      startDateTime: "2026-07-04T22:00:00-04:00",
      daypart: "late",
      priceState: "free",
    }),
    occurrence({
      id: "grand-movie",
      resortSlug: "grand-floridian-resort-and-spa",
      resortName: "Disney's Grand Floridian Resort & Spa",
      startDateTime: "2026-07-04T20:00:00-04:00",
      daypart: "evening",
      priceState: "free",
    }),
    occurrence({
      id: "poly-craft",
      resortSlug: "polynesian-village-resort",
      resortName: "Disney's Polynesian Village Resort",
      startDateTime: "2026-07-05T10:00:00-04:00",
      daypart: "morning",
      priceState: "fee",
    }),
  ], { start: "2026-07-04", end: "2026-07-06" });

  assert.equal(insights.topDates[0]?.date, "2026-07-04");
  assert.equal(insights.topDates[0]?.count, 2);
  assert.equal(insights.topResorts[0]?.slug, "grand-floridian-resort-and-spa");
  assert.equal(insights.eveningDates[0]?.date, "2026-07-04");
  assert.equal(insights.freeHeavyDates[0]?.freeCount, 2);
});

check("primary UI surfaces expose Now and Plan Ahead", () => {
  const header = readFileSync("components/layout/SiteHeader.tsx", "utf8");
  const mobile = readFileSync("components/layout/MobileBottomNav.tsx", "utf8");
  const quickFinder = readFileSync("components/home/QuickFinder.tsx", "utf8");
  const footer = readFileSync("components/layout/SiteFooter.tsx", "utf8");

  assert.match(header, /aria-label="Now"/);
  assert.match(header, /Plan Ahead/);
  assert.doesNotMatch(header, /const NAV = \[\s*\{\s*href: "\/today", label: "Today" \},\s*\{\s*href: "\/tonight", label: "Tonight" \}/);
  assert.match(mobile, /mobile-now-split/);
  assert.match(mobile, /Plan Ahead/);
  assert.match(quickFinder, /Plan ahead/);
  assert.match(quickFinder, /\/calendar/);
  assert.match(footer, /Plan Ahead/);
});

check("known stay surfaces link to date-filtered Plan Ahead", () => {
  const stayDetails = readFileSync("components/plan/PlanStayDetails.tsx", "utf8");
  const sections = readFileSync("lib/plan/sections.ts", "utf8");
  const resortPage = readFileSync("app/resorts/[slug]/page.tsx", "utf8");

  assert.match(stayDetails, /Find activities for these dates/);
  assert.match(sections, /buildPlanAheadHref/);
  assert.match(sections, /start: dateKey/);
  assert.match(sections, /end: dateKey/);
  assert.match(sections, /selected: dateKey/);
  assert.match(resortPage, /Plan ahead at this resort/);
});

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Plan Ahead UX contract passed.");
