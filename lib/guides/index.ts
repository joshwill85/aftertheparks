export interface GuideEntry {
  slug: string;
  title: string;
  description: string;
  href: string;
  exploreHref: string;
  keywords: string[];
}

export const GUIDES: GuideEntry[] = [
  {
    slug: "first-night-at-the-resort",
    title: "Your first night at the resort",
    description:
      "Settle in, scout tonight's activities, and ease into vacation mode without a park ticket.",
    href: "/guides/first-night-at-the-resort",
    exploreHref: "/tonight",
    keywords: [
      "first night",
      "check-in",
      "arrival",
      "settle in",
      "tonight",
      "evening",
    ],
  },
  {
    slug: "rainy-day-resort",
    title: "Rainy day at the resort",
    description:
      "Arcade time, indoor crafts, and cozy lobby moments when the skies open up.",
    href: "/activities?category=arcade",
    exploreHref: "/activities?category=arcade",
    keywords: ["rain", "rainy", "indoor", "arcade", "weather"],
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
