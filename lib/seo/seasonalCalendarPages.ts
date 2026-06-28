export interface SeasonalCalendarPageDefinition {
  slug: string;
  title: string;
  description: string;
  seasonLabel: string;
  scheduleWindow: string;
  userPromise: string;
  primaryAction: {
    label: string;
    href: string;
  };
  deepLinks: string[];
  planningAngles: string[];
  sourceCaveats: string[];
  freshnessRule: string;
  keywords: string[];
}

export const SEASONAL_CALENDAR_PAGES: SeasonalCalendarPageDefinition[] = [
  {
    slug: "summer-2026",
    title: "Summer 2026 Walt Disney World Resort Activity Calendars",
    description:
      "Track Summer 2026 Walt Disney World resort recreation with current activity counts, heat-aware planning notes, source caveats, and today/tonight shortcuts.",
    seasonLabel: "Summer 2026",
    scheduleWindow: "June through August 2026",
    userPromise:
      "A strong summer resort day starts with current activity calendars, heat-aware timing, pool and indoor backups, and evening options that are easy to confirm.",
    primaryAction: { label: "See today's resort activities", href: "/today" },
    deepLinks: [
      "/today",
      "/tonight",
      "/activities?weather=indoor",
      "/guides/rainy-day-disney-resort-activities",
    ],
    planningAngles: [
      "Prioritize morning and evening activities during peak heat.",
      "Use indoor or covered backups for thunderstorms and midday breaks.",
      "Confirm outdoor movies, campfires, poolside games, and transportation-sensitive plans before leaving your resort.",
    ],
    sourceCaveats: [
      "Summer schedules can shift for heat, storms, staffing, pool operations, and seasonal programming.",
      "A listed activity should still be confirmed with the current official resort source before travel.",
    ],
    freshnessRule:
      "Recheck daily during summer calendar changes and whenever storm, pool, or evening activity guidance changes.",
    keywords: ["summer 2026 Disney resort activities", "summer resort calendar", "Disney resort activities summer"],
  },
  {
    slug: "fall-2026",
    title: "Fall 2026 Walt Disney World Resort Activity Calendars",
    description:
      "Prepare for Fall 2026 Walt Disney World resort recreation with current calendars, seasonal activity notes, weather caveats, and resort planning shortcuts.",
    seasonLabel: "Fall 2026",
    scheduleWindow: "September through November 2026",
    userPromise:
      "A useful fall resort calendar separates current activity data from seasonal expectations, then points you to today, tonight, and resort-specific pages.",
    primaryAction: { label: "Browse resort calendars", href: "/disney-world-resort-activity-calendars" },
    deepLinks: [
      "/disney-world-resort-activity-calendars",
      "/today",
      "/tonight",
      "/guides/disney-world-non-park-day",
    ],
    planningAngles: [
      "Watch for seasonal recreation changes before relying on older fall advice.",
      "Use current resort pages for actual times instead of assuming every recurring activity is available.",
      "Pair evening plans with weather and transportation backups.",
    ],
    sourceCaveats: [
      "Fall activity calendars may not be final until resorts publish current recreation schedules.",
      "Treat seasonal expectations as planning context, not official confirmation.",
    ],
    freshnessRule:
      "Recheck weekly before fall calendars publish, then daily as current fall schedule rows become available.",
    keywords: ["fall 2026 Disney resort activities", "fall resort calendar", "Disney resort activities fall"],
  },
  {
    slug: "holiday-2026",
    title: "Holiday 2026 Walt Disney World Resort Activity Calendars",
    description:
      "Plan Holiday 2026 Walt Disney World resort activities with current recreation calendars, source-backed caveats, no-ticket guidance, and evening planning links.",
    seasonLabel: "Holiday 2026",
    scheduleWindow: "Late November through December 2026",
    userPromise:
      "Holiday resort planning works best when festive ideas are grounded in current calendars, access rules, transportation caveats, and resort-specific next steps.",
    primaryAction: { label: "Browse resort activities", href: "/activities" },
    deepLinks: [
      "/activities",
      "/today",
      "/tonight",
      "/guides/things-to-do-without-park-ticket",
    ],
    planningAngles: [
      "Separate holiday atmosphere and decor ideas from activities that require a park ticket.",
      "Use resort pages to confirm current activity times, eligibility, cost, and location.",
      "Build plans around resort stays, confirmed dining/experience reservations, or direct routes instead of Disney Springs transfer workarounds.",
    ],
    sourceCaveats: [
      "Holiday activities, decor access, parking, and resort transportation can be capacity-sensitive and change quickly.",
      "Do not use Disney Springs as a free way to reach resort hotels; use a resort stay, confirmed dining/experience reservation, rideshare, or currently allowed direct route.",
    ],
    freshnessRule:
      "Recheck weekly before holiday calendars publish, then daily during holiday schedule, access, and transportation changes.",
    keywords: ["holiday 2026 Disney resort activities", "Christmas Disney resort calendar", "Disney resort holiday activities"],
  },
];

export function getSeasonalCalendarPageBySlug(
  slug: string
): SeasonalCalendarPageDefinition | undefined {
  return SEASONAL_CALENDAR_PAGES.find((page) => page.slug === slug);
}

export function validateSeasonalCalendarPages(
  pages: SeasonalCalendarPageDefinition[]
): string[] {
  const issues: string[] = [];

  for (const page of pages) {
    for (const field of ["title", "description", "userPromise", "freshnessRule"] as const) {
      if (!page[field] || page[field].trim().length < 40) {
        issues.push(`${page.slug}: ${field} is missing or too thin`);
      }
    }
    if (!page.primaryAction.href.startsWith("/")) {
      issues.push(`${page.slug}: primary action must be internal`);
    }
    if (page.deepLinks.length < 3) {
      issues.push(`${page.slug}: needs at least three deep links`);
    }
    if (page.planningAngles.length < 3) {
      issues.push(`${page.slug}: needs at least three planning angles`);
    }
    if (page.sourceCaveats.length < 2) {
      issues.push(`${page.slug}: needs at least two source caveats`);
    }
    if (
      page.slug.includes("holiday") &&
      !page.sourceCaveats.join(" ").match(/resort stay|dining\/experience reservation|confirmed/i)
    ) {
      issues.push(`${page.slug}: holiday no-ticket guidance must include Disney Springs access caveat`);
    }
  }

  return issues;
}
