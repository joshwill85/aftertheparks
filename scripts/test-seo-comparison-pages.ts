import assert from "node:assert/strict";
import sitemap from "@/app/sitemap";
import {
  SEO_COMPARISON_PAGES,
  getSeoComparisonPageBySlug,
  rankResortsForComparisonPage,
  validateSeoComparisonPages,
} from "@/lib/seo/comparisonPages";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

const removedGuidePath = `/${["guid", "es"].join("")}`;

async function main() {
  const requiredSlugs = [
    "best-disney-resorts-for-activities-today",
    "best-disney-resorts-for-a-no-park-day",
    "best-disney-resorts-for-evening-activities",
    "best-disney-resorts-for-free-activities",
    "best-disney-resorts-for-toddlers",
    "best-disney-resorts-for-teens",
    "best-disney-resorts-for-adults",
    "best-disney-resorts-for-rainy-days",
    "best-resorts-for-movies-under-the-stars",
    "best-resorts-for-campfires",
    "best-resorts-for-check-in-day",
    "best-resorts-if-you-do-not-have-a-park-ticket",
    "best-monorail-resort-activities",
    "best-skyliner-resort-activities",
    "best-boardwalk-area-resort-activities",
    "best-fort-wilderness-activities-without-a-park-ticket",
  ];

  for (const slug of requiredSlugs) {
    const page = getSeoComparisonPageBySlug(slug);
    assert.ok(page, `${slug} should be a comparison page`);
    assert.ok(page!.title.includes("Disney"), `${slug} should target Disney intent`);
    assert.ok(page!.primaryAction.href.startsWith("/"), `${slug} should have a product route`);
    assert.ok(page!.deepLinks.length >= 3, `${slug} should have deep links`);
    assert.ok(page!.exclusionRules.length >= 2, `${slug} should have exclusion rules`);
  }

  const issues = validateSeoComparisonPages(SEO_COMPARISON_PAGES);
  assert.deepEqual(
    issues,
    [],
    `comparison pages should pass the SEO qualification gate: ${issues.join("; ")}`
  );

  const sampleActivities: ActivityOccurrence[] = [
    {
      id: "a",
      activitySlug: "movies-under-the-stars",
      activityCatalogId: "movies",
      resort: { slug: "poly", name: "Disney's Polynesian Village Resort", tier: "Deluxe", area: "magic_kingdom" },
      title: "Movies Under the Stars",
      summary: "Outdoor movie",
      category: "movies_under_stars",
      section: "Evening",
      daypart: "evening",
      price: { state: "free" },
      location: { label: "Lawn" },
      eligibility: { ages: ["all_ages"] },
      freshness: { lastVerified: "2026-06-27", sourceUrl: "https://example.com", badge: "verified" },
      status: "active",
    },
    {
      id: "b",
      activitySlug: "crafts",
      activityCatalogId: "crafts",
      resort: { slug: "poly", name: "Disney's Polynesian Village Resort", tier: "Deluxe", area: "magic_kingdom" },
      title: "Crafts",
      summary: "Craft activity",
      category: "arts_crafts",
      section: "Daytime",
      daypart: "afternoon",
      price: { state: "fee" },
      location: { label: "Lobby" },
      eligibility: { ages: ["all_ages"] },
      freshness: { lastVerified: "2026-06-27", sourceUrl: "https://example.com", badge: "verified" },
      status: "active",
    },
    {
      id: "c",
      activitySlug: "campfire",
      activityCatalogId: "campfire",
      resort: { slug: "akl", name: "Disney's Animal Kingdom Lodge", tier: "Deluxe", area: "animal_kingdom" },
      title: "Campfire",
      summary: "Evening campfire",
      category: "campfire",
      section: "Evening",
      daypart: "evening",
      price: { state: "free" },
      location: { label: "Fire pit" },
      eligibility: { ages: ["all_ages"] },
      freshness: { lastVerified: "2026-06-27", sourceUrl: "https://example.com", badge: "verified" },
      status: "active",
    },
  ];

  const todayPage = getSeoComparisonPageBySlug("best-disney-resorts-for-activities-today")!;
  const ranked = rankResortsForComparisonPage(todayPage, sampleActivities);
  assert.equal(ranked[0].resortSlug, "poly");
  assert.ok(ranked[0].score > ranked[1].score, "resort with more matching activities should rank first");
  assert.match(ranked[0].reason, /current/i);

  assert.ok(
    SEO_COMPARISON_PAGES.every((page) =>
      [page.primaryAction.href, ...page.deepLinks].every((href) => !href.startsWith(removedGuidePath))
    ),
    "comparison pages should route to existing product paths instead of removed guide routes"
  );

  process.env.NEXT_PUBLIC_SITE_URL = "https://aftertheparks.com";
  const urls = (await sitemap()).map((entry) => entry.url);
  assert.ok(
    urls.includes("https://aftertheparks.com/resorts"),
    "sitemap should include resort product pages that comparison surfaces route into"
  );
  for (const alias of [
    "best-disney-resort-activities-for-toddlers",
    "best-disney-resort-activities-for-teens",
    "best-disney-resort-activities-for-adults",
    "best-disney-resorts-without-park-ticket",
    "boardwalk-area-resort-activities",
    "fort-wilderness-activities-without-park-ticket",
  ]) {
    assert.ok(
      !urls.includes(`https://aftertheparks.com${removedGuidePath}/${alias}`),
      `${alias} should not appear in the sitemap as a duplicate removed guide route`
    );
  }

  console.log("SEO comparison page tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
