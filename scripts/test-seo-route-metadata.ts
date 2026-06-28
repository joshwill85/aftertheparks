import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "@/scripts/test-helpers/server-only-stub";

async function main() {
  process.env.NEXT_PUBLIC_SITE_URL = "https://aftertheparks.com";

  const { generateMetadata: activityMetadata } = await import("@/app/activities/[slug]/page");
  const { generateMetadata: resortMetadata } = await import("@/app/resorts/[slug]/page");
  const { generateMetadata: resortsMetadata } = await import("@/app/resorts/page");
  const { metadata: calendarMetadata } = await import("@/app/calendar/page");
  const { metadata: guidesMetadata } = await import("@/app/guides/page");
  const { metadata: searchMetadata } = await import("@/app/search/page");
  const { metadata: planMetadata } = await import("@/app/plan/page");
  const { metadata: publicPlanMetadata } = await import("@/app/p/[shareToken]/page");
  const { metadata: legacyPlanMetadata } = await import("@/app/plan/[shareId]/page");
  const { metadata: correctionsMetadata } = await import("@/app/corrections/page");
  const { generateMetadata: activitiesMetadata } = await import("@/app/activities/page");
  const { generateMetadata: todayMetadata } = await import("@/app/today/page");
  const { generateMetadata: tonightMetadata } = await import("@/app/tonight/page");

  const movies = await activityMetadata({
    params: Promise.resolve({ slug: "movies-under-the-stars" }),
    searchParams: Promise.resolve({}),
  });
  assert.equal(movies.title, "Movies Under the Stars at Walt Disney World Resorts");
  assert.match(
    String(movies.description),
    /outdoor movie nights/i,
    "fallback activity metadata should describe the activity guide"
  );
  assert.deepEqual(movies.alternates, {
    canonical: "/activities/movies-under-the-stars",
  });

  const resort = await resortMetadata({
    params: Promise.resolve({ slug: "polynesian-village-resort" }),
  });
  assert.match(
    String(resort.title),
    /Polynesian Village Resort Activities/i,
    "resort metadata should use the resort name and activity intent"
  );
  assert.match(
    String(resort.description),
    /current/i,
    "resort metadata should communicate freshness/current activity planning"
  );
  assert.deepEqual(resort.alternates, {
    canonical: "/resorts/polynesian-village-resort",
  });

  const resortsIndex = await resortsMetadata({
    searchParams: Promise.resolve({}),
  });
  assert.deepEqual(resortsIndex.alternates, {
    canonical: "/resorts",
  });

  const noTicketResorts = await resortsMetadata({
    searchParams: Promise.resolve({ no_ticket_friendly: "true" }),
  });
  assert.match(
    String(noTicketResorts.title),
    /without a park ticket|no-ticket/i,
    "strategic no-ticket-friendly resort filter should have intent-specific metadata"
  );
  assert.match(
    String(noTicketResorts.description),
    /resort stay|dining\/experience reservation|reservation|access/i,
    "no-ticket-friendly resort metadata should preserve resort access caveats"
  );
  assert.doesNotMatch(
    String(noTicketResorts.description),
    /free way/i,
    "no-ticket-friendly resort metadata must not frame Disney Springs as a free resort-transfer route"
  );
  assert.deepEqual(noTicketResorts.alternates, {
    canonical: "/resorts?no_ticket_friendly=true",
  });

  const noTicketActivities = await activitiesMetadata({
    searchParams: Promise.resolve({ ticket_required: "false" }),
  });
  assert.match(
    String(noTicketActivities.title),
    /without a park ticket|no-ticket/i,
    "strategic no-ticket activity filter should have intent-specific metadata"
  );
  assert.deepEqual(noTicketActivities.alternates, {
    canonical: "/activities?ticket_required=false",
  });

  const indoorActivities = await activitiesMetadata({
    searchParams: Promise.resolve({ weather: "indoor" }),
  });
  assert.match(
    String(indoorActivities.title),
    /indoor/i,
    "strategic indoor activity filter should have intent-specific metadata"
  );
  assert.deepEqual(indoorActivities.alternates, {
    canonical: "/activities?weather=indoor",
  });

  const coveredActivities = await activitiesMetadata({
    searchParams: Promise.resolve({ weather: "covered" }),
  });
  assert.match(
    String(coveredActivities.title),
    /covered/i,
    "strategic covered activity filter should have intent-specific metadata"
  );
  assert.deepEqual(coveredActivities.alternates, {
    canonical: "/activities?weather=covered",
  });

  const monorailActivities = await activitiesMetadata({
    searchParams: Promise.resolve({ transport: "monorail" }),
  });
  assert.match(
    String(monorailActivities.title),
    /monorail/i,
    "strategic monorail activity filter should have intent-specific metadata"
  );
  assert.deepEqual(monorailActivities.alternates, {
    canonical: "/activities?transport=monorail",
  });

  const skylinerActivities = await activitiesMetadata({
    searchParams: Promise.resolve({ transport: "skyliner" }),
  });
  assert.match(
    String(skylinerActivities.title),
    /skyliner/i,
    "strategic Skyliner activity filter should have intent-specific metadata"
  );
  assert.deepEqual(skylinerActivities.alternates, {
    canonical: "/activities?transport=skyliner",
  });

  const disneySpringsActivities = await activitiesMetadata({
    searchParams: Promise.resolve({ area: "disney-springs" }),
  });
  assert.match(
    String(disneySpringsActivities.title),
    /Disney Springs/i,
    "strategic Disney Springs-area activity filter should have intent-specific metadata"
  );
  assert.match(
    String(disneySpringsActivities.description),
    /resort stay|dining\/experience reservation|reservation/i,
    "Disney Springs-area activity metadata should preserve current access caveats"
  );
  assert.doesNotMatch(
    String(disneySpringsActivities.description),
    /free way/i,
    "Disney Springs-area activity metadata must not frame the area as a free resort-transfer route"
  );
  assert.deepEqual(disneySpringsActivities.alternates, {
    canonical: "/activities?area=disney-springs",
  });

  const firstNightShortActivities = await activitiesMetadata({
    searchParams: Promise.resolve({ duration: "short", time: "evening" }),
  });
  assert.match(
    String(firstNightShortActivities.title),
    /first night|short evening/i,
    "strategic first-night short evening filter should have intent-specific metadata"
  );
  assert.deepEqual(firstNightShortActivities.alternates, {
    canonical: "/activities?duration=short&time=evening",
  });

  const freeActivities = await activitiesMetadata({
    searchParams: Promise.resolve({ free: "true" }),
  });
  assert.match(
    String(freeActivities.title),
    /free/i,
    "strategic free activity filter should have intent-specific metadata"
  );
  assert.deepEqual(freeActivities.alternates, {
    canonical: "/activities?free=true",
  });

  const arbitraryFilteredActivities = await activitiesMetadata({
    searchParams: Promise.resolve({ q: "pool", resort: "poly" }),
  });
  assert.deepEqual(
    arbitraryFilteredActivities.alternates,
    { canonical: "/activities" },
    "non-strategic query-heavy activity views should canonicalize to the activity directory"
  );

  const todayNoTicket = await todayMetadata({
    searchParams: Promise.resolve({ ticket_required: "false" }),
  });
  assert.match(
    String(todayNoTicket.title),
    /without a park ticket|no-ticket/i,
    "strategic today no-ticket filter should have intent-specific metadata"
  );
  assert.deepEqual(todayNoTicket.alternates, {
    canonical: "/today?ticket_required=false",
  });

  const todayIndoor = await todayMetadata({
    searchParams: Promise.resolve({ weather: "indoor" }),
  });
  assert.match(
    String(todayIndoor.title),
    /indoor/i,
    "strategic today indoor filter should have intent-specific metadata"
  );
  assert.deepEqual(todayIndoor.alternates, {
    canonical: "/today?weather=indoor",
  });

  const tonightNoTicket = await tonightMetadata({
    searchParams: Promise.resolve({ ticket_required: "false" }),
  });
  assert.match(
    String(tonightNoTicket.title),
    /without a park ticket|no-ticket/i,
    "strategic tonight no-ticket filter should have intent-specific metadata"
  );
  assert.deepEqual(tonightNoTicket.alternates, {
    canonical: "/tonight?ticket_required=false",
  });

  const tonightIndoor = await tonightMetadata({
    searchParams: Promise.resolve({ weather: "indoor" }),
  });
  assert.match(
    String(tonightIndoor.title),
    /indoor/i,
    "strategic tonight indoor filter should have intent-specific metadata"
  );
  assert.deepEqual(tonightIndoor.alternates, {
    canonical: "/tonight?weather=indoor",
  });

  const tonightBareNearMyResort = await tonightMetadata({
    searchParams: Promise.resolve({ near: "my-resort" }),
  });
  assert.deepEqual(
    tonightBareNearMyResort.alternates,
    { canonical: "/tonight" },
    "bare near-my-resort query should canonicalize to /tonight until a resort anchor exists"
  );

  const arbitraryTonight = await tonightMetadata({
    searchParams: Promise.resolve({ resort: "poly", q: "movie" }),
  });
  assert.deepEqual(
    arbitraryTonight.alternates,
    { canonical: "/tonight" },
    "non-strategic query-heavy tonight views should canonicalize to /tonight"
  );

  assert.match(
    String(calendarMetadata.title),
    /Disney World Resort Activity Calendar/i,
    "calendar metadata should target current resort activity calendar intent"
  );
  assert.deepEqual(calendarMetadata.alternates, { canonical: "/calendar" });

  assert.match(
    String(guidesMetadata.title),
    /Disney World Resort Planning Guides/i,
    "guide index metadata should target the planning guide cluster"
  );
  assert.deepEqual(guidesMetadata.alternates, { canonical: "/guides" });

  for (const [metadata, label] of [
    [searchMetadata, "search page"],
    [planMetadata, "private plan page"],
    [publicPlanMetadata, "public shared plan page"],
    [legacyPlanMetadata, "legacy shared plan page"],
    [correctionsMetadata, "corrections/contact page"],
  ] as const) {
    assert.deepEqual(
      metadata.robots,
      { index: false, follow: true },
      `${label} should be noindex,follow so utility or share URLs do not compete with canonical SEO pages`
    );
  }

  const activityPage = readFileSync("app/activities/[slug]/page.tsx", "utf8");
  const breadcrumbComponent = readFileSync("components/seo/Breadcrumbs.tsx", "utf8");
  assert.match(
    breadcrumbComponent,
    /aria-label="Breadcrumb"/,
    "visible breadcrumb component should expose a semantic breadcrumb nav"
  );
  assert.match(
    breadcrumbComponent,
    /aria-current="page"/,
    "visible breadcrumb component should mark the current page"
  );
  assert.match(
    activityPage,
    /buildActivityEventJsonLd/,
    "activity detail pages should emit Event JSON-LD for dated occurrences"
  );
  assert.match(
    activityPage,
    /buildBreadcrumbJsonLd/,
    "activity detail pages should emit BreadcrumbList JSON-LD"
  );
  assert.match(
    activityPage,
    /Breadcrumbs/,
    "activity detail pages should render visible breadcrumbs matching BreadcrumbList JSON-LD"
  );
  const routeAudit = readFileSync("scripts/audit-seo-routes.ts", "utf8");
  const auditHtmlSource = routeAudit.slice(
    routeAudit.indexOf("function auditHtml"),
    routeAudit.indexOf("function auditAsset")
  );
  assert.match(
    auditHtmlSource,
    /route\.requiredText[\s\S]+missing required text/,
    "HTML route QA should enforce requiredText so visible content requirements are real"
  );
  for (const [path, type, label] of [
    ["/activities/movies-under-the-stars", "BreadcrumbList", "activity detail"],
    ["/resorts/polynesian-village-resort", "BreadcrumbList", "resort detail"],
    ["/guides/disney-world-non-park-day", "BreadcrumbList", "guide detail"],
    ["/guides/disney-world-non-park-day", "Article", "guide detail"],
  ] as const) {
    assert.match(
      routeAudit,
      new RegExp(`path:\\s*"${path}"[\\s\\S]+type:\\s*"${type}"`),
      `rendered SEO route QA should require ${type} JSON-LD on ${label} pages`
    );
  }
  for (const path of [
    "/activities/movies-under-the-stars",
    "/resorts/polynesian-village-resort",
    "/guides/disney-world-non-park-day",
    "/guides/things-to-do-without-park-ticket",
    "/guides/disney-springs-area-resort-activities",
    "/disney-world-resort-activity-calendars/summer-2026",
    "/disney-world-resort-activity-calendars/fall-2026",
    "/disney-world-resort-activity-calendars/holiday-2026",
  ] as const) {
    assert.match(
      routeAudit,
      new RegExp(`path:\\s*"${path}"[\\s\\S]+requiredText:\\s*\\[[\\s\\S]+aria-label="Breadcrumb"`),
      `rendered SEO route QA should require visible breadcrumb markup on ${path}`
    );
  }
  for (const [path, expectedTexts] of [
    ["/today", ["Source and freshness", "Last verified", "Source and accuracy policy"]],
    ["/tonight", ["Source and freshness", "Last verified", "Source and accuracy policy"]],
    [
      "/disney-world-resort-activity-calendars",
      ["Current status", "Official sources checked", "Next expected refresh", "Send a correction"],
    ],
    [
      "/resorts/polynesian-village-resort",
      ["Source and freshness", "Last verified", "Source and accuracy policy"],
    ],
    [
      "/activities/movies-under-the-stars",
      ["Source and freshness", "Last verified", "Source and accuracy policy"],
    ],
  ] as const) {
    const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const expected of expectedTexts) {
      assert.match(
        routeAudit,
        new RegExp(`path:\\s*"${escapedPath}"[\\s\\S]+requiredText:\\s*\\[[\\s\\S]+${expected}`),
        `rendered SEO route QA should require ${expected} on ${path}`
      );
    }
  }
  for (const path of [
    "/activities?area=disney-springs",
    "/resorts?no_ticket_friendly=true",
    "/guides/things-to-do-without-park-ticket",
    "/guides/disney-springs-area-resort-activities",
    "/source-and-accuracy-policy",
  ] as const) {
    for (const expected of [
      "Do not use Disney Springs as a free way",
      "resort stay",
      "dining/experience reservation",
    ] as const) {
      const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.match(
        routeAudit,
        new RegExp(`path:\\s*"${escapedPath}"[\\s\\S]+requiredText:\\s*\\[[\\s\\S]+${expected}`),
        `rendered SEO route QA should require ${expected} on ${path}`
      );
    }
  }
  for (const guidePath of [
    "/guides/disney-world-non-park-day",
    "/guides/things-to-do-without-park-ticket",
    "/guides/disney-springs-area-resort-activities",
  ] as const) {
    for (const expected of [
      "Editorial review",
      "Last updated",
      "Mistakes to avoid",
      "Planning quality checks",
      "Research dossier",
    ] as const) {
      const escapedGuidePath = guidePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.match(
        routeAudit,
        new RegExp(`path:\\s*"${escapedGuidePath}"[\\s\\S]+requiredText:\\s*\\[[\\s\\S]+${expected}`),
        `rendered SEO route QA should require ${expected} on ${guidePath}`
      );
    }
    for (const type of ["BreadcrumbList", "Article", "FAQPage", "ItemList"] as const) {
      assert.match(
        routeAudit,
        new RegExp(`path:\\s*"${guidePath}"[\\s\\S]+type:\\s*"${type}"`),
        `rendered SEO route QA should require ${type} JSON-LD on ${guidePath}`
      );
    }
  }
  assert.match(
    activityPage,
    /buildItemListJsonLd/,
    "activity detail pages should emit ItemList JSON-LD for upcoming occurrences"
  );
  for (const [pattern, label] of [
    [/<h2[^>]*>\s*Activity planning snapshot\s*<\/h2>/, "fallback activity planning snapshot"],
    [/<h3[^>]*>\s*Overview\s*<\/h3>/, "fallback overview answer"],
    [/<h3[^>]*>\s*Participating resorts\s*<\/h3>/, "fallback participating resorts answer"],
    [/<h3[^>]*>\s*Today and tonight\s*<\/h3>/, "fallback today and tonight answer"],
    [/<h3[^>]*>\s*Cost and reservations\s*<\/h3>/, "fallback cost and reservations answer"],
    [/<h3[^>]*>\s*Best resorts for this activity\s*<\/h3>/, "fallback best resorts answer"],
    [/<h3[^>]*>\s*Tips\s*<\/h3>/, "fallback tips answer"],
    [/<h3[^>]*>\s*Weather\/cancellation caveats\s*<\/h3>/, "fallback weather and cancellation answer"],
    [/<h3[^>]*>\s*Similar activities\s*<\/h3>/, "fallback similar activities answer"],
    [/<h3[^>]*>\s*Official-source notes\s*<\/h3>/, "fallback official-source notes answer"],
    [/<h3[^>]*>\s*Confirm before going\s*<\/h3>/, "fallback confirm before going answer"],
  ] as const) {
    assert.match(
      activityPage,
      pattern,
      `fallback activity guide should render a ${label}`
    );
  }

  const activityClient = readFileSync("components/atlas/ActivityDetailClient.tsx", "utf8");
  assert.match(
    activityClient,
    /Source and freshness/,
    "activity detail pages should visibly expose source and freshness notes"
  );
  assert.match(
    activityClient,
    /activity\.freshness\.lastVerified/,
    "activity detail pages should show the last verified date"
  );
  assert.match(
    activityClient,
    /activity\.freshness\.sourceUrl/,
    "activity detail pages should link to the official source when available"
  );
  for (const [pattern, label] of [
    [/<h2[^>]*>\s*Activity planning snapshot\s*<\/h2>/, "activity planning snapshot"],
    [/<h3[^>]*>\s*Overview\s*<\/h3>/, "overview answer"],
    [/<h3[^>]*>\s*Participating resorts\s*<\/h3>/, "participating resorts answer"],
    [/<h3[^>]*>\s*Today and tonight\s*<\/h3>/, "today and tonight answer"],
    [/<h3[^>]*>\s*Cost and reservations\s*<\/h3>/, "cost and reservations answer"],
    [/<h3[^>]*>\s*Best resorts for this activity\s*<\/h3>/, "best resorts answer"],
    [/<h3[^>]*>\s*Tips\s*<\/h3>/, "tips answer"],
    [/<h3[^>]*>\s*Weather\/cancellation caveats\s*<\/h3>/, "weather and cancellation answer"],
    [/<h3[^>]*>\s*Similar activities\s*<\/h3>/, "similar activities answer"],
    [/<h3[^>]*>\s*Official-source notes\s*<\/h3>/, "official-source notes answer"],
    [/<h3[^>]*>\s*Confirm before going\s*<\/h3>/, "confirm before going answer"],
  ] as const) {
    assert.match(
      activityClient,
      pattern,
      `activity detail pages should render a ${label}`
    );
  }

  const activitiesPage = readFileSync("app/activities/page.tsx", "utf8");
  assert.match(
    activitiesPage,
    /buildItemListJsonLd/,
    "activity directory should emit ItemList JSON-LD"
  );

  const resortsPage = readFileSync("app/resorts/page.tsx", "utf8");
  assert.match(
    resortsPage,
    /buildItemListJsonLd/,
    "resort directory should emit ItemList JSON-LD"
  );

  const calendarHub = readFileSync("app/disney-world-resort-activity-calendars/page.tsx", "utf8");
  assert.match(
    calendarHub,
    /buildItemListJsonLd/,
    "calendar hub should emit ItemList JSON-LD"
  );

  const resortDetailPage = readFileSync("app/resorts/[slug]/page.tsx", "utf8");
  assert.match(
    resortDetailPage,
    /buildBreadcrumbJsonLd/,
    "resort detail pages should emit BreadcrumbList JSON-LD"
  );
  assert.match(
    resortDetailPage,
    /Breadcrumbs/,
    "resort detail pages should render visible breadcrumbs from the shared component"
  );
  assert.match(
    resortDetailPage,
    /buildItemListJsonLd/,
    "resort detail pages should emit ItemList JSON-LD for current activities"
  );
  assert.match(
    resortDetailPage,
    /buildActivityEventJsonLd/,
    "resort detail pages should emit Event JSON-LD for dated occurrences"
  );
  assert.match(
    resortDetailPage,
    /Source and freshness/,
    "resort detail pages should visibly expose source and freshness context"
  );
  assert.match(
    resortDetailPage,
    /No-park-day plan/,
    "resort detail pages should include a no-park-day mini itinerary"
  );
  for (const [pattern, label] of [
    [/<h2[^>]*>\s*Today at this resort\s*<\/h2>/, "today at this resort crawlable summary"],
    [/<h2[^>]*>\s*Tonight at this resort\s*<\/h2>/, "tonight at this resort crawlable summary"],
    [/<h2[^>]*>\s*Free activities\s*<\/h2>/, "free activities intent section"],
    [/<h2[^>]*>\s*Paid activities\s*<\/h2>/, "paid activities intent section"],
    [/<h2[^>]*>\s*Best for kids\s*<\/h2>/, "best for kids intent section"],
    [/<h2[^>]*>\s*Best for adults\s*<\/h2>/, "best for adults intent section"],
    [/<h2[^>]*>\s*Rainy-day options\s*<\/h2>/, "rainy-day intent section"],
    [/<h2[^>]*>\s*Evening options\s*<\/h2>/, "evening options intent section"],
    [/<h2[^>]*>\s*Transportation notes\s*<\/h2>/, "transportation notes section"],
    [/<h2[^>]*>\s*Full activity calendar\s*<\/h2>/, "full activity calendar section"],
    [/<h2[^>]*>\s*Nearby resorts with activities tonight\s*<\/h2>/, "nearby resorts tonight section"],
    [/<h2[^>]*>\s*Related activities\s*<\/h2>/, "related activities section"],
    [/<SeoFaq\s+title="FAQ"/, "FAQ section"],
    [/<h2[^>]*>\s*Source and caveat block\s*<\/h2>/, "source and caveat block"],
  ] as const) {
    assert.match(
      resortDetailPage,
      pattern,
      `resort detail pages should render a ${label}`
    );
  }
  assert.match(
    resortDetailPage,
    /Related planning guides/,
    "resort detail pages should link into the guide cluster"
  );
  assert.match(
    resortDetailPage,
    /Tonight at nearby resorts/,
    "resort detail pages should include nearby-resort tonight internal links"
  );
  assert.match(
    resortDetailPage,
    /People also plan/,
    "resort detail pages should include people-also-plan internal links"
  );

  for (const [file, label] of [
    ["app/today/page.tsx", "today page"],
    ["app/tonight/page.tsx", "tonight page"],
  ] as const) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /Quick answer/, `${label} should include a first-screen answer block`);
    assert.match(source, /Source and freshness/, `${label} should visibly expose source and freshness context`);
    assert.match(source, /activityListJsonLd/, `${label} should emit ItemList JSON-LD`);
    assert.match(source, /activityEventJsonLd/, `${label} should emit Event JSON-LD for dated occurrences`);
    assert.match(source, /source-and-accuracy-policy/, `${label} should link to the source policy`);
  }

  for (const [file, canonicalPath] of [
    ["app/activities/today/page.tsx", "/today"],
    ["app/activities/tonight/page.tsx", "/tonight"],
  ] as const) {
    const source = readFileSync(file, "utf8");
    assert.match(
      source,
      /permanentRedirect/,
      `${file} should permanently redirect to the canonical ${canonicalPath} route`
    );
    assert.match(
      source,
      new RegExp(`buildBrowseHref\\("${canonicalPath}"`),
      `${file} should preserve supported filters when redirecting to ${canonicalPath}`
    );
  }

  const calendarPage = readFileSync("app/calendar/page.tsx", "utf8");
  assert.match(
    calendarPage,
    /Quick answer/,
    "calendar page should include a first-screen answer block"
  );
  assert.match(
    calendarPage,
    /Source and freshness/,
    "calendar page should visibly expose source and freshness context"
  );
  assert.match(
    calendarPage,
    /activityListJsonLd/,
    "calendar page should emit ItemList JSON-LD"
  );
  assert.match(
    calendarPage,
    /activityEventJsonLd/,
    "calendar page should emit Event JSON-LD for dated occurrences"
  );

  const calendarHubPage = readFileSync("app/disney-world-resort-activity-calendars/page.tsx", "utf8");
  assert.match(
    calendarHubPage,
    /Official sources checked/,
    "calendar hub should expose official source coverage in its freshness block"
  );
  assert.match(
    calendarHubPage,
    /Next expected refresh/,
    "calendar hub should expose the next expected refresh in its freshness block"
  );
  assert.match(
    calendarHubPage,
    /\/corrections/,
    "calendar hub should link to the correction workflow from its source/freshness area"
  );

  const guidesPage = readFileSync("app/guides/page.tsx", "utf8");
  assert.match(
    guidesPage,
    /buildItemListJsonLd/,
    "guide index should emit ItemList JSON-LD for the guide cluster"
  );
  assert.match(
    guidesPage,
    /Research-gated guide cluster/,
    "guide index should visibly explain the research-gated guide cluster"
  );
  assert.match(
    guidesPage,
    /Disney Springs/,
    "guide index should surface transportation accuracy caveats where relevant"
  );

  const guideDetailPage = readFileSync("app/guides/[slug]/page.tsx", "utf8");
  assert.match(
    guideDetailPage,
    /buildBreadcrumbJsonLd/,
    "guide detail pages should emit BreadcrumbList JSON-LD"
  );
  assert.match(
    guideDetailPage,
    /Breadcrumbs/,
    "guide detail pages should render visible breadcrumbs matching BreadcrumbList JSON-LD"
  );
  assert.match(
    guideDetailPage,
    /SEO_MISTAKE_LOG/,
    "guide detail pages should source mistakes-to-avoid from the reusable SEO mistake log"
  );
  assert.match(
    guideDetailPage,
    /Mistakes to avoid/,
    "guide detail pages should visibly render a mistakes-to-avoid editorial module"
  );
  assert.match(
    guideDetailPage,
    /evidenceType/,
    "guide mistake modules should expose evidence type so caveats are not generic"
  );
  assert.match(
    guideDetailPage,
    /severity/,
    "guide mistake modules should expose severity so planning risks are scannable"
  );
  for (const [pattern, label] of [
    [/<h3[^>]*>\s*Best overall plan\s*<\/h3>/, "best overall guide plan"],
    [/<h3[^>]*>\s*Free plan\s*<\/h3>/, "free guide plan"],
    [/<h3[^>]*>\s*Toddler plan\s*<\/h3>/, "toddler guide plan"],
    [/<h3[^>]*>\s*Teen plan\s*<\/h3>/, "teen guide plan"],
    [/<h3[^>]*>\s*Adult\/couple plan\s*<\/h3>/, "adult/couple guide plan"],
    [/<h3[^>]*>\s*Rainy-day plan\s*<\/h3>/, "rainy-day guide plan"],
    [/<h3[^>]*>\s*First-night plan\s*<\/h3>/, "first-night guide plan"],
    [/<h3[^>]*>\s*Resort-hopping plan\s*<\/h3>/, "resort-hopping guide plan"],
    [/<h3[^>]*>\s*Live activities today\s*<\/h3>/, "live activities guide module"],
    [/<h3[^>]*>\s*Best resorts for this plan\s*<\/h3>/, "best resorts guide module"],
    [/<h3[^>]*>\s*Transportation notes\s*<\/h3>/, "transportation guide module"],
    [/<h3[^>]*>\s*Sources and update notes\s*<\/h3>/, "sources guide module"],
  ] as const) {
    assert.match(
      guideDetailPage,
      pattern,
      `guide detail pages should render a ${label}`
    );
  }
  assert.match(
    guideDetailPage,
    /<SeoFaq\s+title="FAQ"/,
    "guide detail pages should render a visible FAQ module"
  );
  assert.match(
    guideDetailPage,
    /buildFaqPageJsonLd/,
    "guide detail pages should emit FAQ schema from visible FAQ items"
  );
  for (const [pattern, label] of [
    [/Editorial review/, "editorial review line"],
    [/Last updated/, "last updated date"],
    [/What changed in this update/, "update-change summary"],
    [/Reviewed by After the Parks/, "reviewer attribution"],
    [/independent and not affiliated with Disney/, "independent-site disclaimer"],
  ] as const) {
    assert.match(
      guideDetailPage,
      pattern,
      `guide detail pages should visibly render ${label}`
    );
  }
  for (const [pattern, label] of [
    [/<h2[^>]*>\s*Who this is best for\s*<\/h2>/, "comparison best-fit section"],
    [/<h2[^>]*>\s*Free vs paid notes\s*<\/h2>/, "comparison free-vs-paid section"],
    [/<h2[^>]*>\s*Last verified data\s*<\/h2>/, "comparison last-verified data section"],
    [/latestVerifiedForComparison/, "comparison last-verified helper"],
  ] as const) {
    assert.match(
      guideDetailPage,
      pattern,
      `comparison guide pages should render a ${label}`
    );
  }

  console.log("SEO route metadata tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
