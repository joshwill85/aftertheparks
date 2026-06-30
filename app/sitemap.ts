import type { MetadataRoute } from "next";
import { getFilteredActivities, getResorts } from "@/lib/data/activities";
import { GUIDES } from "@/lib/guides";
import { HIGH_VALUE_GUIDES, PRIORITY_ACTIVITY_SLUGS } from "@/lib/seo/routes";
import { SEASONAL_CALENDAR_PAGES } from "@/lib/seo/seasonalCalendarPages";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

export const revalidate = 86400;

function entry(
  url: string,
  options: Omit<MetadataRoute.Sitemap[number], "url"> = {}
): MetadataRoute.Sitemap[number] {
  return {
    url,
    lastModified: options.lastModified ?? new Date(),
    changeFrequency: options.changeFrequency,
    priority: options.priority,
    images: options.images,
  };
}

function ogImage(
  base: string,
  title: string,
  eyebrow = "After the Parks",
  summary = "Current resort activities, calendars, source caveats, and no-park-day planning."
): string {
  const params = new URLSearchParams({ title, eyebrow, summary });
  return `${base}/api/og?${params.toString()}`.replaceAll("&", "&amp;");
}

function seoEntry(
  base: string,
  path: string,
  title: string,
  options: Omit<MetadataRoute.Sitemap[number], "url" | "images"> & {
    imageEyebrow?: string;
    imageSummary?: string;
  } = {}
): MetadataRoute.Sitemap[number] {
  const url = path === "/" ? base : `${base}${path}`;
  const { imageEyebrow, imageSummary, ...entryOptions } = options;
  return entry(url, {
    ...entryOptions,
    images: [ogImage(base, title, imageEyebrow, imageSummary)],
  });
}

function latestFreshnessDate(
  activities: readonly ActivityOccurrence[],
  predicate: (activity: ActivityOccurrence) => boolean,
  fallback: Date
): Date {
  const latest = activities
    .filter(predicate)
    .map((activity) => Date.parse(activity.freshness.lastVerified))
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => b - a)[0];

  return latest ? new Date(latest) : fallback;
}

export function latestActivitySitemapLastModified(
  activities: readonly ActivityOccurrence[],
  activitySlug: string,
  fallback: Date
): Date {
  return latestFreshnessDate(
    activities,
    (activity) => activity.activitySlug === activitySlug,
    fallback
  );
}

export function latestResortSitemapLastModified(
  activities: readonly ActivityOccurrence[],
  resortSlug: string,
  fallback: Date
): Date {
  return latestFreshnessDate(
    activities,
    (activity) => activity.resort.slug === resortSlug,
    fallback
  );
}

const FILTERED_LANDING_PAGES = [
  {
    path: "/activities?free=true",
    title: "Free Walt Disney World Resort Activities",
    changeFrequency: "weekly" as const,
    priority: 0.74,
    imageSummary:
      "Current free resort activities with verified schedule notes and access-sensitive planning caveats.",
  },
  {
    path: "/activities?weather=indoor",
    title: "Indoor Walt Disney World Resort Activities",
    changeFrequency: "daily" as const,
    priority: 0.74,
    imageSummary:
      "Indoor and weather-safer resort activities for rainy days, heat breaks, and flexible resort planning.",
  },
  {
    path: "/activities?weather=covered",
    title: "Covered Walt Disney World Resort Activities",
    changeFrequency: "daily" as const,
    priority: 0.72,
    imageSummary:
      "Covered resort activities and light-rain backups with verified weather and schedule caveats.",
  },
  {
    path: "/activities?transport=monorail",
    title: "Monorail Resort Activities at Walt Disney World",
    changeFrequency: "daily" as const,
    priority: 0.72,
    imageSummary:
      "Current resort activities around the monorail loop with verified schedule and access caveats.",
  },
  {
    path: "/activities?transport=skyliner",
    title: "Skyliner Resort Activities at Walt Disney World",
    changeFrequency: "daily" as const,
    priority: 0.72,
    imageSummary:
      "Current Skyliner-area resort activities with verified schedule, route, and weather caveats.",
  },
  {
    path: "/activities?area=disney-springs",
    title: "Disney Springs-Area Resort Activities",
    changeFrequency: "daily" as const,
    priority: 0.7,
    imageSummary:
      "Disney Springs-area resort activities with current resort stay, dining reservation, and access caveats.",
  },
  {
    path: "/resorts?no_ticket_friendly=true",
    title: "Disney Resorts With No-Ticket-Friendly Activities",
    changeFrequency: "daily" as const,
    priority: 0.7,
    imageSummary:
      "Resorts with current no-ticket-friendly activities plus access, parking, transportation, and reservation caveats.",
  },
  {
    path: "/today?weather=indoor",
    title: "Indoor Disney Resort Activities Today",
    changeFrequency: "daily" as const,
    priority: 0.74,
    imageSummary:
      "Indoor and weather-safer resort activities available today, with current schedule and source notes.",
  },
  {
    path: "/tonight?weather=indoor",
    title: "Indoor Disney Resort Activities Tonight",
    changeFrequency: "daily" as const,
    priority: 0.74,
    imageSummary:
      "Indoor and weather-safer resort activities tonight for rainy evenings and flexible backup plans.",
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const now = new Date();
  const [resorts, activities] = await Promise.all([
    getResorts().catch(() => []),
    getFilteredActivities({ limit: 500 }).catch(() => []),
  ]);

  const activitySlugs = new Set<string>(PRIORITY_ACTIVITY_SLUGS);
  for (const activity of activities) {
    activitySlugs.add(activity.activitySlug);
  }

  const guideSlugs = new Set<string>(HIGH_VALUE_GUIDES.map((guide) => guide.slug));
  for (const guide of GUIDES) {
    if (guide.href.startsWith("/guides/")) {
      guideSlugs.add(guide.slug);
    }
  }

  return [
    seoEntry(base, "/", "After the Parks", {
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    }),
    seoEntry(base, "/disney-world-resort-activity-calendars", "Walt Disney World Resort Activity Calendars", {
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
      imageEyebrow: "Resort activity calendars",
      imageSummary:
        "Compare current resort activity calendars, today and tonight counts, source caveats, and seasonal planning links.",
    }),
    seoEntry(base, "/activities", "Walt Disney World Resort Activities", {
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    }),
    seoEntry(base, "/resorts", "Walt Disney World Resort Activity Guides", {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    }),
    seoEntry(base, "/guides", "Disney World Resort Planning Guides", {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
    seoEntry(base, "/calendar", "Disney World Resort Activity Calendar", {
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.75,
    }),
    seoEntry(base, "/today", "Disney World Resort Activities Today", {
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    }),
    seoEntry(base, "/tonight", "Disney World Resort Activities Tonight", {
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    }),
    seoEntry(base, "/weather", "Disney World Weather", {
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.82,
      imageEyebrow: "Disney resort weather",
      imageSummary:
        "Now, next, hourly, daily, and weekly weather guidance for Walt Disney World resort areas.",
    }),
    seoEntry(base, "/about", "About After the Parks", {
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    }),
    seoEntry(base, "/source-and-accuracy-policy", "After the Parks Source and Accuracy Policy", {
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65,
    }),
    ...FILTERED_LANDING_PAGES.map((page) =>
      seoEntry(base, page.path, page.title, {
        lastModified: now,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        imageEyebrow: "Filtered resort planning",
        imageSummary: page.imageSummary,
      })
    ),
    seoEntry(base, "/privacy", "After the Parks Privacy Policy", {
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.45,
    }),
    seoEntry(base, "/terms", "After the Parks Terms and Legal", {
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.45,
    }),
    ...SEASONAL_CALENDAR_PAGES.map((page) =>
      seoEntry(base, `/disney-world-resort-activity-calendars/${page.slug}`, page.title, {
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.74,
      })
    ),
    ...resorts.map((resort) =>
      seoEntry(base, `/resorts/${resort.slug}`, `${resort.name} Activities, Movies & Recreation Calendar`, {
        lastModified: latestResortSitemapLastModified(activities, resort.slug, now),
        changeFrequency: "daily",
        priority: 0.82,
      })
    ),
    ...Array.from(activitySlugs).map((slug) =>
      seoEntry(base, `/activities/${slug}`, `${slug.replaceAll("-", " ")} at Walt Disney World Resorts`, {
        lastModified: latestActivitySitemapLastModified(activities, slug, now),
        changeFrequency: "daily",
        priority: 0.78,
      })
    ),
    ...Array.from(guideSlugs).map((slug) =>
      seoEntry(base, `/guides/${slug}`, `${slug.replaceAll("-", " ")} guide`, {
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.72,
      })
    ),
  ];
}
