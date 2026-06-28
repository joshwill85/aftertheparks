import type { SeoGuideDefinition } from "@/lib/seo/routes";
import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";

export interface SeoGuideDossier {
  slug: string;
  title: string;
  officialSourceFacts: string[];
  afterTheParksDataFacts: string[];
  communitySentimentUse: string[];
  competitorGapAnalysis: string[];
  transportationValidation: string[];
  badFitExclusions: string[];
  deepLinkPlan: string[];
  editorialReview: string[];
  officialSourceLinks: Array<{
    label: string;
    href: string;
    purpose: string;
  }>;
  updateNotes: string[];
  antiThinContentChecks: string[];
}

function mentionsAccessSensitiveTopic(guide: SeoGuideDefinition): boolean {
  const text = [
    guide.slug,
    guide.title,
    guide.description,
    guide.userIntent,
    guide.decisionFilter,
    ...guide.caveats,
    ...guide.exclusionRules,
    ...guide.keywords,
  ].join(" ").toLowerCase();

  return (
    text.includes("disney springs") ||
    text.includes("without park ticket") ||
    text.includes("no-ticket") ||
    text.includes("resort hopping") ||
    text.includes("transportation") ||
    text.includes("monorail") ||
    text.includes("skyliner")
  );
}

export function buildSeoGuideDossier(
  guide: SeoGuideDefinition
): SeoGuideDossier {
  const officialSourceFacts = [
    "Use official Walt Disney World resort recreation, transportation, parking, dining, and experience pages as source-of-record inputs before making policy or access claims.",
    "Treat official activity calendars and resort pages as time-sensitive because schedules, locations, fees, and eligibility can change without notice.",
    ...guide.researchSources
      .filter((source) => /official|calendar|transportation|parking|dining/i.test(source))
      .slice(0, 2),
  ];

  const afterTheParksDataFacts = [
    `Live page depends on these After the Parks fields: ${guide.liveDataDependencies.join(", ")}.`,
    `Primary product action: ${guide.primaryAction.label} (${guide.primaryAction.href}).`,
    `Freshness rule: ${guide.freshnessRule}`,
  ];

  const communitySentimentUse = [
    "Use community discussion only to identify expectations, regrets, confusing moments, and mistakes to avoid.",
    "Do not use Reddit, forums, trip reports, social comments, or creator content as policy authority when Disney or source-backed data can answer the question.",
  ];

  const competitorGapAnalysis = [
    "Magical Resort Guide is strong for current calendar directory intent; this guide must add decision filters, live data routes, and source caveats.",
    "Mama's on Vacation is strong for broad planning intent; this guide must be tighter, current-first, and connected to live resort/activity data.",
    "Static Disney blogs and official Disney pages are useful references, but they usually do not combine cross-resort schedules, freshness, access caveats, and next-click planning paths.",
  ];

  const transportationValidation = [
    `Route/access rule: ${guide.decisionFilter}`,
    "Favor same-resort, direct, or near-direct plans before recommending multi-transfer resort hopping.",
  ];

  if (mentionsAccessSensitiveTopic(guide)) {
    transportationValidation.push(DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary);
  } else {
    transportationValidation.push(
      "If a plan crosses resorts, recheck current transportation and access rules before treating it as easy."
    );
  }

  return {
    slug: guide.slug,
    title: guide.title,
    officialSourceFacts,
    afterTheParksDataFacts,
    communitySentimentUse,
    competitorGapAnalysis,
    transportationValidation,
    badFitExclusions: guide.exclusionRules,
    deepLinkPlan: guide.deepLinks.map(
      (href) => `${href}: route users into current data instead of leaving them in a static article.`
    ),
    editorialReview: [
      "Reviewed by After the Parks for current planning usefulness, source discipline, access caveats, and live-data fit.",
      "After the Parks is independent and not affiliated with Disney; official Disney sources remain the authority for policy, access, transportation, reservations, and hours.",
    ],
    officialSourceLinks: [
      {
        label: "Official Walt Disney World resorts",
        href: "https://disneyworld.disney.go.com/resorts/",
        purpose: "Use as the source-of-record for resort names, official resort pages, amenities, and guest-facing resort context.",
      },
      {
        label: "Official Walt Disney World transportation",
        href: "https://disneyworld.disney.go.com/guest-services/transportation/",
        purpose: "Use as the source-of-record for transportation modes, access caveats, and route-sensitive planning claims.",
      },
      {
        label: "Official Walt Disney World dining reservations",
        href: "https://disneyworld.disney.go.com/dining/",
        purpose: "Use when a guide depends on dining reservations, restaurant access, or reservation-backed resort visits.",
      },
    ],
    updateNotes: [
      `Current update trigger: ${guide.freshnessRule}`,
      "What changed in this update: guide recommendations are tied to live planning paths, visible source notes, transportation caveats, bad-fit exclusions, and reusable mistakes-to-avoid evidence.",
    ],
    antiThinContentChecks: [
      `Would this page still help if search engines sent zero traffic? It should, because the primary action is ${guide.primaryAction.label} at ${guide.primaryAction.href}.`,
      `Unique planning value: ${guide.afterTheParksAdvantage}`,
      `Kill rule: ${guide.killRule}`,
    ],
  };
}

export function validateSeoGuideDossiers(
  guides: SeoGuideDefinition[]
): string[] {
  const issues: string[] = [];

  for (const guide of guides) {
    const dossier = buildSeoGuideDossier(guide);
    const requiredBuckets: Array<keyof Omit<SeoGuideDossier, "slug" | "title">> = [
      "officialSourceFacts",
      "afterTheParksDataFacts",
      "communitySentimentUse",
      "competitorGapAnalysis",
      "transportationValidation",
      "badFitExclusions",
      "deepLinkPlan",
      "editorialReview",
      "officialSourceLinks",
      "updateNotes",
      "antiThinContentChecks",
    ];

    for (const bucket of requiredBuckets) {
      if (dossier[bucket].length < 2) {
        issues.push(`${guide.slug}: ${bucket} needs at least two entries`);
      }
    }

    for (const link of dossier.officialSourceLinks) {
      if (!link.href.startsWith("https://disneyworld.disney.go.com/")) {
        issues.push(`${guide.slug}: officialSourceLinks must point to official Disney World pages`);
      }
      if (link.purpose.length < 40) {
        issues.push(`${guide.slug}: officialSourceLinks need planning-specific purpose notes`);
      }
    }

    if (mentionsAccessSensitiveTopic(guide)) {
      const joinedTransportation = dossier.transportationValidation.join(" ").toLowerCase();
      if (
        joinedTransportation.includes("disney springs") &&
        !/(resort stay|dining|experience reservation|confirmed)/i.test(joinedTransportation)
      ) {
        issues.push(
          `${guide.slug}: Disney Springs transportation validation must mention resort stay or dining/experience reservation`
        );
      }
    }
  }

  return issues;
}
