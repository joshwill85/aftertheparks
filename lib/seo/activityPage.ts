import {
  buildActivityEventJsonLd,
  buildItemListJsonLd,
  type JsonLdObject,
} from "@/lib/seo/jsonLd";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

export function formatSeoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: value.includes("T") ? "America/New_York" : "UTC",
  }).format(date);
}

export function activitySourceSummary(activities: ActivityOccurrence[]) {
  const verifiedTimes = activities
    .map((activity) => new Date(activity.freshness.lastVerified).getTime())
    .filter((time) => Number.isFinite(time));
  const sourceUrls = new Set<string>();

  for (const activity of activities) {
    const url = activity.freshness.sourceUrl || activity.source?.url;
    if (url) sourceUrls.add(url);
  }

  return {
    latestVerified: verifiedTimes.length
      ? new Date(Math.max(...verifiedTimes)).toISOString()
      : undefined,
    sourceCount: sourceUrls.size,
    activityCount: activities.length,
  };
}

export function activityListJsonLd(
  baseUrl: string,
  name: string,
  activities: ActivityOccurrence[]
) {
  return buildItemListJsonLd(
    baseUrl,
    name,
    activities.slice(0, 25).map((activity) => ({
      name: `${activity.title} at ${activity.resort.name}`,
      path: `/activities/${activity.activitySlug}?resort=${activity.resort.slug}`,
      description:
        activity.startDateTime ??
        activity.scheduleText ??
        activity.summary ??
        "Current resort activity",
    }))
  );
}

export function activityEventJsonLd(
  baseUrl: string,
  activities: ActivityOccurrence[],
  limit = 20
): JsonLdObject[] {
  return activities
    .slice(0, limit)
    .map((activity) => buildActivityEventJsonLd(baseUrl, activity))
    .filter((entry): entry is JsonLdObject => Boolean(entry));
}
