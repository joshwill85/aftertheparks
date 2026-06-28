import { HIGH_VALUE_GUIDES } from "@/lib/seo/routes";
import { SEO_COMPARISON_PAGES } from "@/lib/seo/comparisonPages";

export interface GuideEntry {
  slug: string;
  title: string;
  description: string;
  href: string;
  exploreHref: string;
  keywords: string[];
}

export const GUIDES: GuideEntry[] = [
  ...HIGH_VALUE_GUIDES.map((guide) => ({
    slug: guide.slug,
    title: guide.title,
    description: guide.description,
    href: `/guides/${guide.slug}`,
    exploreHref: guide.primaryAction.href,
    keywords: guide.keywords,
  })),
  ...SEO_COMPARISON_PAGES.map((page) => ({
    slug: page.slug,
    title: page.title,
    description: page.description,
    href: `/guides/${page.slug}`,
    exploreHref: page.primaryAction.href,
    keywords: page.keywords,
  })),
  {
    slug: "arcade-and-crafts",
    title: "Arcade and crafts",
    description:
      "Arcade listings, crafts, and other resort options from current calendars.",
    href: "/activities?category=arcade",
    exploreHref: "/activities?category=arcade",
    keywords: ["arcade", "games", "crafts"],
  },
  {
    slug: "resort-calendar",
    title: "Browse the resort calendar",
    description:
      "Pool breaks, crafts, campfires, and other current recreation-calendar activities.",
    href: "/activities",
    exploreHref: "/activities",
    keywords: ["calendar", "activities", "pool", "crafts", "campfires"],
  },
];

export function searchGuides(query: string, limit = 5): GuideEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return GUIDES.filter(
    (guide) =>
      guide.title.toLowerCase().includes(q) ||
      guide.description.toLowerCase().includes(q) ||
      guide.keywords.some((keyword) => keyword.includes(q) || q.includes(keyword))
  ).slice(0, limit);
}
