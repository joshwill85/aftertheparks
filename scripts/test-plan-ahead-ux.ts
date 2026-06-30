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
      id: "today-overload",
      resortSlug: "today-resort",
      resortName: "Today Resort",
      startDateTime: "2026-07-04T09:00:00-04:00",
      daypart: "morning",
      priceState: "free",
    }),
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
    occurrence({
      id: "poly-evening",
      resortSlug: "polynesian-village-resort",
      resortName: "Disney's Polynesian Village Resort",
      startDateTime: "2026-07-05T19:00:00-04:00",
      daypart: "evening",
      priceState: "free",
    }),
  ], { start: "2026-07-04", end: "2026-07-06", today: "2026-07-04" });

  assert.equal(insights.topDates[0]?.date, "2026-07-05");
  assert.equal(insights.topDates[0]?.count, 2);
  assert.equal(insights.topResorts[0]?.slug, "polynesian-village-resort");
  assert.equal(insights.eveningDates[0]?.date, "2026-07-05");
  assert.equal(insights.freeHeavyDates[0]?.date, "2026-07-05");
  assert.equal(insights.freeHeavyDates[0]?.freeCount, 1);
});

check("primary UI surfaces expose explicit Today Tonight and Plan Ahead nav", () => {
  const header = readFileSync("components/layout/SiteHeader.tsx", "utf8");
  const mobile = readFileSync("components/layout/MobileBottomNav.tsx", "utf8");
  const quickFinder = readFileSync("components/home/QuickFinder.tsx", "utf8");
  const footer = readFileSync("components/layout/SiteFooter.tsx", "utf8");

  const desktopOrder = [
    'href: "/today", label: "Today"',
    'href: "/tonight", label: "Tonight"',
    'href: "/calendar", label: "Plan Ahead"',
    'href: "/activities", label: "Activities"',
    'href: "/resorts", label: "Resorts"',
    'href: "/weather", label: "Weather"',
    'href: "/plan", label: "My Plan"',
    'href: "/search", label: "Search"',
  ];
  let previous = -1;
  for (const marker of desktopOrder) {
    const index = header.indexOf(marker);
    assert.ok(index > previous, `Desktop nav should order ${marker}`);
    previous = index;
  }

  const mobileOrder = [
    'href: "/today"',
    'href: "/tonight"',
    'href: "/calendar"',
    'href: "/resorts"',
    'href: "/plan"',
  ];
  previous = -1;
  for (const marker of mobileOrder) {
    const index = mobile.indexOf(marker);
    assert.ok(index > previous, `Mobile nav should order ${marker}`);
    previous = index;
  }

  assert.doesNotMatch(header, /now-split-nav|aria-label="Now"/);
  assert.doesNotMatch(mobile, /mobile-now-split|aria-label="Now"|<span>Night<\/span>/);
  assert.match(mobile, /Tonight/);
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

check("Plan Ahead mounts weather-aware activity cards", () => {
  const calendarPage = readFileSync("app/calendar/page.tsx", "utf8");
  const calendarClient = readFileSync("components/atlas/CalendarClient.tsx", "utf8");

  assert.doesNotMatch(
    calendarPage,
    /loadWeatherByOccurrence/,
    "Plan Ahead should not block the calendar page on server-side weather fan-out."
  );
  assert.doesNotMatch(
    calendarPage,
    /initialWeatherById=\{initialWeatherById\}/,
    "Plan Ahead should let CalendarClient batch-fetch weather after the page mounts."
  );
  assert.match(
    calendarClient,
    /initialWeatherById\?: Record<string, WeatherForTimeSpan>/,
    "CalendarClient should accept the same weather map contract as Today and Tonight."
  );
  assert.match(
    calendarClient,
    /useState<Record<string, WeatherForTimeSpan>>\(initialWeatherById\)/,
    "CalendarClient should keep card weather in state."
  );
  assert.match(
    calendarClient,
    /\/api\/weather\/guidance\/batch/,
    "CalendarClient should batch-fetch weather for newly selected dates."
  );
  assert.match(
    calendarClient,
    /weatherSummary=\{weatherById\[activity\.id\]\}/,
    "Plan Ahead EventCards should receive mounted weather summaries."
  );
});

check("Plan Ahead speaks as a date planning tool", () => {
  const calendarPage = readFileSync("app/calendar/page.tsx", "utf8");
  const calendarClient = readFileSync("components/atlas/CalendarClient.tsx", "utf8");

  assert.match(
    calendarPage,
    /Pick a day of your trip to see resort activities, weather context, and easy backup ideas\./,
    "Calendar hero should use the trip-day planning subtitle"
  );

  for (const label of ["Today", "Tomorrow", "This weekend", "Trip dates", "Choose a date"]) {
    assert.match(calendarClient, new RegExp(label), `Plan Ahead should expose ${label}`);
  }

  for (const label of ["Resort", "Time of day", "Free", "Indoor or covered", "Category"]) {
    assert.match(
      calendarClient,
      new RegExp(`<span>${label}</span>`),
      `Secondary filters should include ${label}`
    );
  }

  for (const confidence of [
    "Strong schedule coverage",
    "Some current listings",
    "Limited current listings",
    "Weather not available yet",
    "Schedule details may change",
  ]) {
    assert.match(calendarClient, new RegExp(confidence), `Date summary should include ${confidence}`);
  }

  for (const action of ["Add to My Plan", "View details", "Find indoor backup"]) {
    assert.match(calendarClient, new RegExp(action), `Calendar cards should expose ${action}`);
  }
});

check("Plan Ahead insight cards explain recommendations in human terms", () => {
  const calendarClient = readFileSync("components/atlas/CalendarClient.tsx", "utf8");

  assert.match(calendarClient, /Best day to browse/);
  assert.match(calendarClient, /Most activities in your future window/);
  assert.match(calendarClient, /Most options at one resort/);
  assert.match(calendarClient, /Best after-dark day/);
  assert.match(calendarClient, /Best free day/);
  assert.match(calendarClient, /Try widening the day range or clearing a filter/);
  assert.match(calendarClient, /No future evening-heavy day matches yet/);
  assert.match(calendarClient, /No future free-heavy day matches yet/);
  assert.match(calendarClient, /statLabel/);
  assert.match(calendarClient, /countLabel\(bestDate\.count, "activity", "activities"\)/);
  assert.doesNotMatch(calendarClient, /activitys/);
  assert.doesNotMatch(calendarClient, /label="Best date"/);
  assert.doesNotMatch(calendarClient, /label="Evening strongest"/);
  assert.doesNotMatch(calendarClient, /label="Free-heavy date"/);
  assert.doesNotMatch(calendarClient, /Try widening the date range or clearing a filter/);
  assert.doesNotMatch(calendarClient, /No future evening-heavy date matches yet/);
  assert.doesNotMatch(calendarClient, /No future free-heavy date matches yet/);
  assert.doesNotMatch(calendarClient, /`\$\{format\(dateForMonth\(insights\.topDates\[0\]\.date\), "MMM d"\)\} · \$\{insights\.topDates\[0\]\.count\}`/);
});

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Plan Ahead UX contract passed.");
