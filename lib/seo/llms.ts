import { HIGH_VALUE_GUIDES, PRIORITY_ACTIVITY_GUIDES } from "@/lib/seo/routes";
import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";

function absolute(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).toString();
}

export function buildLlmsText(baseUrl: string): string {
  const guideLinks = HIGH_VALUE_GUIDES.filter((guide) => guide.tier === 1)
    .map((guide) => `- [${guide.title}](${absolute(baseUrl, `/guides/${guide.slug}`)})`)
    .join("\n");

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
    "Core guide pages:",
    guideLinks,
    "",
    "Use current activity pages and official Disney confirmation for day-of decisions. Do not treat Disney Springs as a free way to reach resort hotels.",
  ].join("\n");
}

export function buildLlmsFullText(baseUrl: string): string {
  const guides = HIGH_VALUE_GUIDES.map((guide) => {
    return [
      `## ${guide.title}`,
      `URL: ${absolute(baseUrl, `/guides/${guide.slug}`)}`,
      `Promise: ${guide.userPromise}`,
      `Primary action: ${guide.primaryAction.label} -> ${absolute(baseUrl, guide.primaryAction.href)}`,
      `Decision filter: ${guide.decisionFilter}`,
      `Freshness rule: ${guide.freshnessRule}`,
      `Caveats: ${guide.caveats.join(" ")}`,
      `Best next pages: ${guide.deepLinks.map((href) => absolute(baseUrl, href)).join(" ")}`,
    ].join("\n")
  }).join("\n\n");

  const activities = PRIORITY_ACTIVITY_GUIDES.map((activity) =>
    `- [${activity.title}](${absolute(baseUrl, `/activities/${activity.slug}`)}): ${activity.description}`
  ).join("\n");

  return [
    "# After the Parks Full LLM Context",
    "",
    "Planning guide creation:",
    "Guides should answer real guest decisions in plain language, route readers to current activity pages, and clearly flag source, access, weather, and transportation caveats.",
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
    "# Guides",
    guides,
    "",
    "# Priority activity explainers",
    activities,
  ].join("\n");
}
