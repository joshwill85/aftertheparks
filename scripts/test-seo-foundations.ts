import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  latestActivitySitemapLastModified,
  latestResortSitemapLastModified,
} from "@/app/sitemap";
import {
  getSeoActivityBySlug,
  PRIORITY_ACTIVITY_SLUGS,
} from "@/lib/seo/routes";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

const removedGuidePath = `/${["guid", "es"].join("")}/`;

const sampleSitemapActivities = [
  {
    activitySlug: "movies-under-the-stars",
    resort: { slug: "polynesian-village-resort" },
    freshness: { lastVerified: "2026-06-20T15:00:00.000Z" },
  },
  {
    activitySlug: "movies-under-the-stars",
    resort: { slug: "polynesian-village-resort" },
    freshness: { lastVerified: "2026-06-27T16:30:00.000Z" },
  },
  {
    activitySlug: "campfire",
    resort: { slug: "polynesian-village-resort" },
    freshness: { lastVerified: "2026-06-25T12:00:00.000Z" },
  },
  {
    activitySlug: "campfire",
    resort: { slug: "contemporary-resort" },
    freshness: { lastVerified: "2026-06-26T10:00:00.000Z" },
  },
] as ActivityOccurrence[];

async function main() {
  process.env.NEXT_PUBLIC_SITE_URL = "https://aftertheparks.com";

  const routes = await sitemap();
  const urls = routes.map((entry) => entry.url);

  assert.ok(
    urls.includes("https://aftertheparks.com"),
    "sitemap should include the canonical homepage"
  );
  assert.ok(
    urls.includes("https://aftertheparks.com/disney-world-resort-activity-calendars"),
    "sitemap should include the current resort activity calendar hub"
  );
  assert.ok(
    urls.includes("https://aftertheparks.com/privacy"),
    "sitemap should include the privacy policy as a public trust page"
  );
  assert.ok(
    urls.includes("https://aftertheparks.com/terms"),
    "sitemap should include the terms/legal page as a public trust page"
  );
  assert.ok(
    urls.some((url) => url.includes("/resorts/")),
    "sitemap should include individual resort pages"
  );
  assert.ok(
    urls.some((url) => url.includes("/activities/")),
    "sitemap should include individual activity pages"
  );
  assert.ok(
    !urls.some((url) => url.includes(removedGuidePath)),
    "sitemap should not include removed guide pages"
  );
  for (const filteredPath of [
    "/activities?free=true",
    "/activities?weather=indoor",
    "/activities?weather=covered",
    "/activities?transport=monorail",
    "/activities?transport=skyliner",
    "/activities?area=disney-springs",
    "/resorts?no_ticket_friendly=true",
    "/today?weather=indoor",
    "/tonight?weather=indoor",
  ]) {
    assert.ok(
      urls.includes(`https://aftertheparks.com${filteredPath}`),
      `sitemap should include high-value filtered landing page ${filteredPath}`
    );
  }
  for (const noisyPath of [
    "/activities?q=pool",
    "/today?resort=poly",
    "/tonight?near=my-resort",
    "/tonight?q=movie&resort=poly",
  ]) {
    assert.ok(
      !urls.includes(`https://aftertheparks.com${noisyPath}`),
      `sitemap should not include noisy filtered URL ${noisyPath}`
    );
  }
  assert.ok(
    routes.every((entry) => entry.lastModified),
    "all sitemap entries should include lastModified for freshness"
  );
  assert.equal(
    latestActivitySitemapLastModified(
      sampleSitemapActivities,
      "movies-under-the-stars",
      new Date("2026-06-01T00:00:00.000Z")
    ).toISOString(),
    "2026-06-27T16:30:00.000Z",
    "activity sitemap lastModified should come from the latest source verification for that activity"
  );
  assert.equal(
    latestResortSitemapLastModified(
      sampleSitemapActivities,
      "polynesian-village-resort",
      new Date("2026-06-01T00:00:00.000Z")
    ).toISOString(),
    "2026-06-27T16:30:00.000Z",
    "resort sitemap lastModified should come from the latest source verification across that resort's activities"
  );
  assert.equal(
    latestActivitySitemapLastModified(
      sampleSitemapActivities,
      "unknown-activity",
      new Date("2026-06-01T00:00:00.000Z")
    ).toISOString(),
    "2026-06-01T00:00:00.000Z",
    "sitemap freshness helpers should fall back when no source-backed rows exist"
  );
  assert.ok(
    routes.every((entry) => Array.isArray(entry.images) && entry.images.length > 0),
    "all public sitemap entries should include an image sitemap hint"
  );
  assert.ok(
    routes.every((entry) =>
      entry.images?.every((image) => !/&(?!amp;)/.test(image))
    ),
    "sitemap image hints should XML-escape query separators before Next serializes image:loc values"
  );
  const calendarHubEntry = routes.find(
    (entry) => entry.url === "https://aftertheparks.com/disney-world-resort-activity-calendars"
  );
  assert.ok(
    calendarHubEntry?.images?.some((image) =>
      image.includes("/api/og?") &&
      image.includes("Walt+Disney+World+Resort+Activity+Calendars") &&
      image.includes("summary=")
    ),
    "calendar hub sitemap entry should expose a title-specific OG image with contextual summary copy"
  );
  for (const disallowed of [
    "/plan",
    "/search",
    "/corrections",
    "/p/",
    "/plan/",
  ]) {
    assert.ok(
      !urls.some((url) => url === `https://aftertheparks.com${disallowed}` || url.includes(`https://aftertheparks.com${disallowed}`)),
      `sitemap should not include noindex, utility, or private/share routes such as ${disallowed}`
    );
  }

  const robotRules = robots().rules;
  const rules = Array.isArray(robotRules) ? robotRules : [robotRules];
  const userAgents = rules.flatMap((rule) => {
    const value = rule.userAgent;
    return Array.isArray(value) ? value : [value];
  });

  for (const expected of [
    "Googlebot",
    "Googlebot-Image",
    "Bingbot",
    "Applebot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "PerplexityBot",
    "Claude-User",
    "Claude-SearchBot",
  ]) {
    assert.ok(
      userAgents.includes(expected),
      `robots should explicitly allow ${expected} for search/referral visibility`
    );
  }
  for (const expected of [
    "GPTBot",
    "ClaudeBot",
    "Google-Extended",
    "Applebot-Extended",
  ]) {
    const rule = rules.find((candidate) => {
      const value = candidate.userAgent;
      const agents = Array.isArray(value) ? value : [value];
      return agents.includes(expected);
    });
    assert.ok(
      rule,
      `robots should explicitly separate ${expected} from search/referral crawlers`
    );
    assert.equal(
      rule.disallow,
      "/",
      `robots should not grant model-training or broader AI model-use crawling to ${expected} by wildcard`
    );
  }

  const seoText = readFileSync("lib/seo/transportation.ts", "utf8");
  assert.match(
    seoText,
    /Disney Springs buses and boats to resort hotels/i,
    "transportation caveats should mention Disney Springs resort-transfer restrictions"
  );
  assert.match(
    seoText,
    /resort stay|dining|reservation/i,
    "transportation caveats should advise a resort stay or dining/experience reservation"
  );
  assert.doesNotMatch(
    seoText,
    /free way to get to resorts/i,
    "transportation guidance must not frame Disney Springs as a free way to get to resorts"
  );
  const sourcePolicyPage = readFileSync("app/source-and-accuracy-policy/page.tsx", "utf8");
  assert.match(
    sourcePolicyPage,
    /effectiveDate/,
    "source policy should expose the Disney Springs caveat effective date"
  );
  assert.doesNotMatch(
    sourcePolicyPage,
    /sourceUrls\.map|Caveat source|fox35orlando\.com|people\.com/,
    "source policy should not expose third-party Disney Springs caveat source links"
  );
  const privacyPage = readFileSync("app/privacy/page.tsx", "utf8");
  assert.match(
    privacyPage,
    /correction|email|message/i,
    "privacy policy should cover data submitted through corrections/contact forms"
  );
  assert.match(
    privacyPage,
    /Supabase|Cloudflare|Google/i,
    "privacy policy should disclose relevant service providers"
  );
  assert.match(
    privacyPage,
    /delete|deletion|remove/i,
    "privacy policy should explain how users can request deletion"
  );
  const termsPage = readFileSync("app/terms/page.tsx", "utf8");
  assert.match(
    termsPage,
    /not affiliated|independent/i,
    "terms should include the independent/no-affiliation disclaimer"
  );
  assert.match(
    termsPage,
    /official source|confirm/i,
    "terms should direct users to official sources before relying on planning details"
  );
  assert.match(
    termsPage,
    /trademark|Walt Disney Company|Disney/i,
    "terms should include a trademark/intellectual-property note"
  );

  for (const slug of PRIORITY_ACTIVITY_SLUGS) {
    const activity = getSeoActivityBySlug(slug);
    assert.ok(activity, `${slug} should have an evergreen activity explainer`);
    assert.ok(activity.title.trim(), `${slug} should have a title`);
    assert.ok(activity.description.trim(), `${slug} should have a description`);
    assert.ok(
      activity.caveats.length > 0,
      `${slug} should have user-visible caveats`
    );
  }

  const activityPage = readFileSync("app/activities/[slug]/page.tsx", "utf8");
  assert.match(
    activityPage,
    /getSeoActivityBySlug\(canonicalSlug\)/,
    "activity detail route should render priority evergreen explainers instead of sitemap 404s"
  );

  for (const file of [
    "app/sitemap.ts",
    "app/robots.ts",
    "app/llms.txt/route.ts",
    "app/llms-full.txt/route.ts",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(
      source,
      /dynamic = "force-dynamic"/,
      `${file} should evaluate site visibility at request time instead of freezing private-mode 404s at build time`
    );
  }

  console.log(`SEO foundation tests passed for ${routes.length} sitemap entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
