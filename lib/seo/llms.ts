import { HIGH_VALUE_GUIDES, PRIORITY_ACTIVITY_GUIDES } from "@/lib/seo/routes";
import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";
import { buildSeoGuideDossier } from "@/lib/seo/guideDossiers";

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
    const dossier = buildSeoGuideDossier(guide);
    return [
      `## ${guide.title}`,
      `URL: ${absolute(baseUrl, `/guides/${guide.slug}`)}`,
      `Promise: ${guide.userPromise}`,
      `Primary action: ${guide.primaryAction.label} -> ${absolute(baseUrl, guide.primaryAction.href)}`,
      `Decision filter: ${guide.decisionFilter}`,
      `Freshness rule: ${guide.freshnessRule}`,
      `Kill rule: ${guide.killRule}`,
      `Caveats: ${guide.caveats.join(" ")}`,
      "Research dossier:",
      `Official-source facts: ${dossier.officialSourceFacts.slice(0, 2).join(" ")}`,
      `After the Parks data facts: ${dossier.afterTheParksDataFacts.slice(0, 2).join(" ")}`,
      `Competitor gap analysis: ${dossier.competitorGapAnalysis.slice(0, 2).join(" ")}`,
      `Transportation validation: ${dossier.transportationValidation.slice(0, 2).join(" ")}`,
      `Bad-fit exclusions: ${dossier.badFitExclusions.slice(0, 2).join(" ")}`,
      `Deep-link plan: ${dossier.deepLinkPlan.slice(0, 3).join(" ")}`,
      `Editorial review: ${dossier.editorialReview.slice(0, 2).join(" ")}`,
      `Official source links: ${dossier.officialSourceLinks
        .slice(0, 3)
        .map((source) => `${source.label} (${source.href}) - ${source.purpose}`)
        .join(" ")}`,
      `What changed in this update: ${dossier.updateNotes.slice(0, 2).join(" ")}`,
      `Anti-thin-content checks: ${dossier.antiThinContentChecks.slice(0, 3).join(" ")}`,
    ].join("\n")
  }).join("\n\n");

  const activities = PRIORITY_ACTIVITY_GUIDES.map((activity) =>
    `- [${activity.title}](${absolute(baseUrl, `/activities/${activity.slug}`)}): ${activity.description}`
  ).join("\n");

  return [
    "# After the Parks Full LLM Context",
    "",
    "Research-gated guide creation:",
    "No SEO page exists unless it is also a useful product landing page. Every new SEO guide must prove user intent, unique After the Parks value, live data integration, research depth, bad-fit exclusions, route/access accuracy, and deep links into the product.",
    "",
    "Current transportation caveat:",
    DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary,
    "Do not use Disney Springs as a free way to get to Disney resort hotels.",
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
