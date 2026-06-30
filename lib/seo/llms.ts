import { PRIORITY_ACTIVITY_GUIDES } from "@/lib/seo/routes";
import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";

function absolute(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).toString();
}

export function buildLlmsText(baseUrl: string): string {
  return [
    "# After the Parks",
    "",
    "After the Parks is an independent Walt Disney World resort activity planner focused on current resort recreation, activity calendars, no-park-day planning, and today/tonight resort schedules.",
    "",
    "Important transportation caveat:",
    DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary,
    "",
    "Canonical resources:",
    `- [Sitemap](${absolute(baseUrl, "/sitemap.xml")})`,
    `- [Current resort activity calendars](${absolute(baseUrl, "/disney-world-resort-activity-calendars")})`,
    `- [Today](${absolute(baseUrl, "/today")})`,
    `- [Tonight](${absolute(baseUrl, "/tonight")})`,
    `- [Activities](${absolute(baseUrl, "/activities")})`,
    `- [Resorts](${absolute(baseUrl, "/resorts")})`,
    `- [Source and accuracy policy](${absolute(baseUrl, "/source-and-accuracy-policy")})`,
    "",
    "Use current activity pages and official Disney confirmation for day-of decisions. Do not treat Disney Springs as a free way to reach resort hotels.",
  ].join("\n");
}

export function buildLlmsFullText(baseUrl: string): string {
  const activities = PRIORITY_ACTIVITY_GUIDES.map((activity) =>
    `- [${activity.title}](${absolute(baseUrl, `/activities/${activity.slug}`)}): ${activity.description}`
  ).join("\n");

  return [
    "# After the Parks Full LLM Context",
    "",
    "Current transportation caveat:",
    DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary,
    "Confirm resort access and return transportation before you go.",
    "",
    "Primary product routes:",
    `- ${absolute(baseUrl, "/disney-world-resort-activity-calendars")}`,
    `- ${absolute(baseUrl, "/today")}`,
    `- ${absolute(baseUrl, "/tonight")}`,
    `- ${absolute(baseUrl, "/activities")}`,
    `- ${absolute(baseUrl, "/resorts")}`,
    `- ${absolute(baseUrl, "/source-and-accuracy-policy")}`,
    "",
    "# Priority activity explainers",
    activities,
  ].join("\n");
}
