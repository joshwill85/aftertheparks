import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Metadata } from "next";
import "@/scripts/test-helpers/server-only-stub";

function assertSocialMetadata(metadata: Metadata, label: string) {
  assert.ok(metadata.openGraph, `${label} should define Open Graph metadata`);
  assert.ok(metadata.twitter, `${label} should define Twitter/X metadata`);

  const openGraph = metadata.openGraph as Record<string, any>;
  assert.equal(openGraph.siteName, "After the Parks", `${label} should set OG siteName`);
  assert.ok(openGraph.title, `${label} should set OG title`);
  assert.ok(openGraph.description, `${label} should set OG description`);
  assert.ok(openGraph.url, `${label} should set OG URL`);
  assert.equal(openGraph.locale, "en_US", `${label} should set OG locale`);

  const images = Array.isArray(openGraph.images)
    ? openGraph.images
    : openGraph.images
      ? [openGraph.images]
      : [];
  assert.ok(images.length > 0, `${label} should set at least one OG image`);
  const image = images[0] as Record<string, any>;
  assert.ok(image.url, `${label} should set OG image URL`);
  assert.match(
    String(image.url),
    /summary=/,
    `${label} OG image URL should include page-specific supporting copy`
  );
  assert.equal(image.width, 1200, `${label} should set OG image width`);
  assert.equal(image.height, 630, `${label} should set OG image height`);
  assert.ok(image.alt, `${label} should set OG image alt text`);

  const twitter = metadata.twitter as Record<string, any>;
  assert.equal(twitter.card, "summary_large_image", `${label} should use a large Twitter card`);
  assert.ok(twitter.title, `${label} should set Twitter title`);
  assert.ok(twitter.description, `${label} should set Twitter description`);
  assert.ok(twitter.images, `${label} should set Twitter image`);
}

async function main() {
  process.env.NEXT_PUBLIC_SITE_URL = "https://aftertheparks.com";

  const { metadata: homeMetadata } = await import("@/app/page");
  const { generateMetadata: activitiesMetadata } = await import("@/app/activities/page");
  const { generateMetadata: resortsMetadata } = await import("@/app/resorts/page");
  const { metadata: calendarMetadata } = await import("@/app/calendar/page");
  const { metadata: guidesMetadata } = await import("@/app/guides/page");
  const { metadata: calendarHubMetadata } = await import("@/app/disney-world-resort-activity-calendars/page");
  const { generateMetadata: todayMetadata } = await import("@/app/today/page");
  const { generateMetadata: tonightMetadata } = await import("@/app/tonight/page");
  const { generateMetadata: activityMetadata } = await import("@/app/activities/[slug]/page");
  const { generateMetadata: resortMetadata } = await import("@/app/resorts/[slug]/page");
  const { generateMetadata: guideMetadata } = await import("@/app/guides/[slug]/page");
  const { metadata: planMetadata } = await import("@/app/plan/page");
  const { generateMetadata: publicPlanMetadata } = await import("@/app/p/[shareToken]/page");
  const { generateMetadata: legacyPlanMetadata } = await import("@/app/plan/[shareId]/page");

  const layoutSource = readFileSync("app/layout.tsx", "utf8");
  assert.match(layoutSource, /metadataBase/, "root layout should define metadataBase");
  assert.match(
    layoutSource,
    /buildSocialMetadata/,
    "root layout should define default Open Graph and Twitter/X metadata through the shared helper"
  );
  const socialHelperSource = readFileSync("lib/seo/metadata.ts", "utf8");
  assert.match(
    socialHelperSource,
    /imageSummary/,
    "social metadata helper should accept page-specific OG image summary text"
  );
  const ogRouteSource = readFileSync("app/api/og/route.tsx", "utf8");
  assert.match(
    ogRouteSource,
    /searchParams\.get\("summary"\)/,
    "OG image route should render page-specific summary text"
  );

  for (const [metadata, label] of [
    [homeMetadata, "home page"],
    [
      await activitiesMetadata({
        searchParams: Promise.resolve({}),
      }),
      "activities page",
    ],
    [
      await resortsMetadata({
        searchParams: Promise.resolve({}),
      }),
      "resorts page",
    ],
    [
      await resortsMetadata({
        searchParams: Promise.resolve({ no_ticket_friendly: "true" }),
      }),
      "no-ticket-friendly resorts page",
    ],
    [calendarMetadata, "calendar page"],
    [guidesMetadata, "guides page"],
    [calendarHubMetadata, "calendar hub page"],
    [
      await todayMetadata({
        searchParams: Promise.resolve({}),
      }),
      "today page",
    ],
    [
      await tonightMetadata({
        searchParams: Promise.resolve({}),
      }),
      "tonight page",
    ],
    [planMetadata, "my plan page"],
    [
      await publicPlanMetadata({
        params: Promise.resolve({ shareToken: "share-token" }),
      }),
      "public shared plan page",
    ],
    [
      await legacyPlanMetadata({
        params: Promise.resolve({ shareId: "share-id" }),
      }),
      "legacy shared plan page",
    ],
  ] as const) {
    assertSocialMetadata(metadata, label);
  }

  assertSocialMetadata(
    await activityMetadata({
      params: Promise.resolve({ slug: "movies-under-the-stars" }),
      searchParams: Promise.resolve({}),
    }),
    "activity detail page"
  );
  assertSocialMetadata(
    await resortMetadata({
      params: Promise.resolve({ slug: "polynesian-village-resort" }),
    }),
    "resort detail page"
  );
  assertSocialMetadata(
    await guideMetadata({
      params: Promise.resolve({ slug: "things-to-do-without-park-ticket" }),
    }),
    "guide detail page"
  );

  console.log("SEO social metadata tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
