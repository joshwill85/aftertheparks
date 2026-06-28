export type RankPageType =
  | "calendar_hub"
  | "today_tonight"
  | "resort"
  | "activity"
  | "guide";

export type RankIntent =
  | "calendar"
  | "today"
  | "tonight"
  | "non_park_day"
  | "no_ticket"
  | "activity_specific"
  | "resort_specific"
  | "transportation_area"
  | "competitor_overlap";

export interface RankTrackingQuery {
  query: string;
  canonicalPath: string;
  pageType: RankPageType;
  intent: RankIntent;
  reviewCadence: "weekly" | "after_major_update";
}

export type AiVisibilityTool =
  | "ChatGPT Search"
  | "Google AI Mode"
  | "Perplexity"
  | "Bing Copilot";

export interface AiVisibilityPrompt {
  id: string;
  prompt: string;
  expectedCanonicalPath: string;
  tools: AiVisibilityTool[];
}

export type AiVisibilityEvidenceFieldName =
  | "checkedAt"
  | "tool"
  | "promptId"
  | "expectedCanonicalPath"
  | "observedCitationUrl"
  | "citedAfterTheParks"
  | "citationCurrent"
  | "sourceFreshnessMentioned"
  | "transportationCaveatRespected"
  | "disneySpringsFreeTransferRejected"
  | "resortStayOrDiningExperienceReservationMentioned";

export interface AiVisibilityEvidenceField {
  field: AiVisibilityEvidenceFieldName;
  purpose: string;
}

export type AgentReadinessCheckName =
  | "accessibilityTree"
  | "stableHeadings"
  | "descriptiveInteractiveNames"
  | "keyboardReachablePrimaryFlows"
  | "noHoverOnlyCriticalContent"
  | "serverRenderedPrimaryAnswer"
  | "canonicalAndStructuredDataPresent";

export interface AgentReadinessCheck {
  check: AgentReadinessCheckName;
  evidence: string;
}

export const CORE_WEB_VITALS_BUDGETS = {
  lcpMs: 2500,
  inpMs: 200,
  cls: 0.1,
  mobileJsKb: 320,
  serverRenderedFirstScheduleBlockRequired: true,
  lazyLoadSecondaryWidgets: true,
  routeGroups: [
    "homepage_calendar_hub",
    "today_tonight",
    "resort_pages",
    "activity_pages",
    "guide_pages",
  ],
} as const;

export const PRIORITY_RANK_TRACKING_QUERIES: RankTrackingQuery[] = [
  { query: "Disney World resort activity calendars", canonicalPath: "/disney-world-resort-activity-calendars", pageType: "calendar_hub", intent: "calendar", reviewCadence: "weekly" },
  { query: "Disney resort recreation calendars", canonicalPath: "/disney-world-resort-activity-calendars", pageType: "calendar_hub", intent: "calendar", reviewCadence: "weekly" },
  { query: "Disney hotel activity schedule", canonicalPath: "/disney-world-resort-activity-calendars", pageType: "calendar_hub", intent: "calendar", reviewCadence: "weekly" },
  { query: "Disney resort movie schedule", canonicalPath: "/activities/movies-under-the-stars", pageType: "activity", intent: "activity_specific", reviewCadence: "weekly" },
  { query: "Disney resort campfire schedule", canonicalPath: "/activities/campfire", pageType: "activity", intent: "activity_specific", reviewCadence: "weekly" },
  { query: "Disney resort activities today", canonicalPath: "/today", pageType: "today_tonight", intent: "today", reviewCadence: "weekly" },
  { query: "Disney World resort activities today", canonicalPath: "/today", pageType: "today_tonight", intent: "today", reviewCadence: "weekly" },
  { query: "Disney resort activities tonight", canonicalPath: "/tonight", pageType: "today_tonight", intent: "tonight", reviewCadence: "weekly" },
  { query: "Disney World resort activities tonight", canonicalPath: "/tonight", pageType: "today_tonight", intent: "tonight", reviewCadence: "weekly" },
  { query: "Disney resort movies tonight", canonicalPath: "/activities/movies-under-the-stars", pageType: "activity", intent: "activity_specific", reviewCadence: "weekly" },
  { query: "what to do at Disney World on a non park day", canonicalPath: "/guides/disney-world-non-park-day", pageType: "guide", intent: "non_park_day", reviewCadence: "weekly" },
  { query: "Disney World non park day", canonicalPath: "/guides/disney-world-non-park-day", pageType: "guide", intent: "non_park_day", reviewCadence: "weekly" },
  { query: "Disney rest day itinerary", canonicalPath: "/guides/disney-world-non-park-day", pageType: "guide", intent: "non_park_day", reviewCadence: "weekly" },
  { query: "things to do at Disney resorts", canonicalPath: "/activities", pageType: "activity", intent: "non_park_day", reviewCadence: "weekly" },
  { query: "free Disney resort activities", canonicalPath: "/guides/free-disney-resort-activities", pageType: "guide", intent: "no_ticket", reviewCadence: "weekly" },
  { query: "free things to do at Disney World resorts", canonicalPath: "/guides/free-disney-resort-activities", pageType: "guide", intent: "no_ticket", reviewCadence: "weekly" },
  { query: "Disney World things to do without park tickets", canonicalPath: "/guides/things-to-do-without-park-ticket", pageType: "guide", intent: "no_ticket", reviewCadence: "weekly" },
  { query: "Disney resort activities without park ticket", canonicalPath: "/guides/things-to-do-without-park-ticket", pageType: "guide", intent: "no_ticket", reviewCadence: "weekly" },
  { query: "can you do Disney resort activities without staying there", canonicalPath: "/guides/things-to-do-without-park-ticket", pageType: "guide", intent: "no_ticket", reviewCadence: "weekly" },
  { query: "Disney World no ticket activities", canonicalPath: "/guides/things-to-do-without-park-ticket", pageType: "guide", intent: "no_ticket", reviewCadence: "weekly" },
  { query: "Movies Under the Stars Disney resorts", canonicalPath: "/activities/movies-under-the-stars", pageType: "activity", intent: "activity_specific", reviewCadence: "weekly" },
  { query: "Disney Movies Under the Stars schedule", canonicalPath: "/activities/movies-under-the-stars", pageType: "activity", intent: "activity_specific", reviewCadence: "weekly" },
  { query: "Disney resort campfires", canonicalPath: "/activities/campfire", pageType: "activity", intent: "activity_specific", reviewCadence: "weekly" },
  { query: "Disney resort arcades", canonicalPath: "/activities/arcades", pageType: "activity", intent: "activity_specific", reviewCadence: "weekly" },
  { query: "Disney resort crafts activities", canonicalPath: "/activities/crafts", pageType: "activity", intent: "activity_specific", reviewCadence: "weekly" },
  { query: "Disney resort community halls", canonicalPath: "/activities/community-halls", pageType: "activity", intent: "activity_specific", reviewCadence: "weekly" },
  { query: "Disney resort poolside activities", canonicalPath: "/activities/poolside-activities", pageType: "activity", intent: "activity_specific", reviewCadence: "weekly" },
  { query: "Polynesian Village Resort activities", canonicalPath: "/resorts/polynesian-village-resort", pageType: "resort", intent: "resort_specific", reviewCadence: "weekly" },
  { query: "Contemporary Resort activities", canonicalPath: "/resorts/contemporary-resort", pageType: "resort", intent: "resort_specific", reviewCadence: "weekly" },
  { query: "Grand Floridian resort activities", canonicalPath: "/resorts/grand-floridian-resort-and-spa", pageType: "resort", intent: "resort_specific", reviewCadence: "weekly" },
  { query: "Fort Wilderness activities without park ticket", canonicalPath: "/guides/best-fort-wilderness-activities-without-a-park-ticket", pageType: "guide", intent: "transportation_area", reviewCadence: "weekly" },
  { query: "BoardWalk area resort activities", canonicalPath: "/guides/best-boardwalk-area-resort-activities", pageType: "guide", intent: "transportation_area", reviewCadence: "weekly" },
  { query: "Disney monorail resort activities", canonicalPath: "/guides/monorail-resort-activities", pageType: "guide", intent: "transportation_area", reviewCadence: "weekly" },
  { query: "Disney Skyliner resort activities", canonicalPath: "/guides/skyliner-resort-activities", pageType: "guide", intent: "transportation_area", reviewCadence: "weekly" },
  { query: "Disney Springs area resort activities", canonicalPath: "/guides/best-resorts-if-you-do-not-have-a-park-ticket", pageType: "guide", intent: "transportation_area", reviewCadence: "after_major_update" },
  { query: "Disney resort hopping guide", canonicalPath: "/guides/disney-resort-hopping", pageType: "guide", intent: "transportation_area", reviewCadence: "weekly" },
  { query: "rainy day Disney resort activities", canonicalPath: "/guides/rainy-day-disney-resort-activities", pageType: "guide", intent: "non_park_day", reviewCadence: "weekly" },
  { query: "indoor Disney resort activities", canonicalPath: "/activities?weather=indoor", pageType: "activity", intent: "non_park_day", reviewCadence: "weekly" },
  { query: "first night at Disney resort", canonicalPath: "/guides/first-night-at-disney-resort", pageType: "guide", intent: "tonight", reviewCadence: "weekly" },
  { query: "Disney check-in day activities", canonicalPath: "/guides/first-night-at-disney-resort", pageType: "guide", intent: "today", reviewCadence: "weekly" },
  { query: "best Disney resorts for activities today", canonicalPath: "/guides/best-disney-resorts-for-activities-today", pageType: "guide", intent: "today", reviewCadence: "weekly" },
  { query: "best Disney resorts for evening activities", canonicalPath: "/guides/best-disney-resorts-for-evening-activities", pageType: "guide", intent: "tonight", reviewCadence: "weekly" },
  { query: "best Disney resorts for toddlers", canonicalPath: "/guides/best-disney-resorts-for-toddlers", pageType: "guide", intent: "non_park_day", reviewCadence: "weekly" },
  { query: "best Disney resorts for teens", canonicalPath: "/guides/best-disney-resorts-for-teens", pageType: "guide", intent: "non_park_day", reviewCadence: "weekly" },
  { query: "best Disney resorts for adults", canonicalPath: "/guides/best-disney-resorts-for-adults", pageType: "guide", intent: "non_park_day", reviewCadence: "weekly" },
  { query: "best Disney resorts for grandparents", canonicalPath: "/guides/best-disney-resorts-for-grandparents", pageType: "guide", intent: "non_park_day", reviewCadence: "weekly" },
  { query: "best Disney resorts for rainy days", canonicalPath: "/guides/best-disney-resorts-for-rainy-days", pageType: "guide", intent: "non_park_day", reviewCadence: "weekly" },
  { query: "Magical Resort Guide resort activities", canonicalPath: "/disney-world-resort-activity-calendars", pageType: "calendar_hub", intent: "competitor_overlap", reviewCadence: "after_major_update" },
  { query: "Mama's on Vacation Disney non park day", canonicalPath: "/guides/disney-world-non-park-day", pageType: "guide", intent: "competitor_overlap", reviewCadence: "after_major_update" },
  { query: "Disney resort activity calendar Magical Resort Guide", canonicalPath: "/disney-world-resort-activity-calendars", pageType: "calendar_hub", intent: "competitor_overlap", reviewCadence: "after_major_update" },
];

const ALL_AI_TOOLS: AiVisibilityTool[] = [
  "ChatGPT Search",
  "Google AI Mode",
  "Perplexity",
  "Bing Copilot",
];

export const AI_VISIBILITY_PROMPTS: AiVisibilityPrompt[] = [
  {
    id: "resorts-tonight-no-ticket",
    prompt: "What can I do at Walt Disney World resorts tonight without a park ticket, and what access or transportation caveats should I know?",
    expectedCanonicalPath: "/tonight",
    tools: ALL_AI_TOOLS,
  },
  {
    id: "current-resort-calendars",
    prompt: "Where can I find current Walt Disney World resort activity calendars and compare resort recreation schedules?",
    expectedCanonicalPath: "/disney-world-resort-activity-calendars",
    tools: ALL_AI_TOOLS,
  },
  {
    id: "rainy-day-resort-plan",
    prompt: "What are good rainy-day activities at Disney World resorts that do not depend on outdoor movies, campfires, or storm-sensitive transportation?",
    expectedCanonicalPath: "/guides/rainy-day-disney-resort-activities",
    tools: ALL_AI_TOOLS,
  },
  {
    id: "disney-springs-transfer-caveat",
    prompt: "Can I use Disney Springs buses or boats as a free way to reach Disney resort hotels, or do I need a resort stay or dining reservation?",
    expectedCanonicalPath: "/guides/things-to-do-without-park-ticket",
    tools: ALL_AI_TOOLS,
  },
  {
    id: "movies-under-stars-tonight",
    prompt: "Which Disney World resorts have Movies Under the Stars tonight, and what should I confirm before going?",
    expectedCanonicalPath: "/activities/movies-under-the-stars",
    tools: ALL_AI_TOOLS,
  },
];

export const AGENT_READINESS_CHECKS: AgentReadinessCheck[] = [
  {
    check: "accessibilityTree",
    evidence: "Inspect the accessibility tree for SEO-critical pages and confirm roles, names, and states describe the page purpose and controls.",
  },
  {
    check: "stableHeadings",
    evidence: "Review the rendered heading outline to confirm the first answer, source block, schedules, and caveats are clearly named.",
  },
  {
    check: "descriptiveInteractiveNames",
    evidence: "Verify primary filters, links, buttons, accordions, and correction controls have specific accessible names.",
  },
  {
    check: "keyboardReachablePrimaryFlows",
    evidence: "Use keyboard-only navigation to reach today, tonight, resort, activity, source, and correction flows.",
  },
  {
    check: "noHoverOnlyCriticalContent",
    evidence: "Confirm key planning content, freshness notes, transportation caveats, and CTA paths are not available only on hover.",
  },
  {
    check: "serverRenderedPrimaryAnswer",
    evidence: "Fetch rendered HTML and confirm the primary answer block and first schedule/source summary are present without client-only state.",
  },
  {
    check: "canonicalAndStructuredDataPresent",
    evidence: "Confirm canonical tags and visible-content-matched JSON-LD are present on the same routes used for AI/crawler checks.",
  },
];

export const AI_VISIBILITY_EVIDENCE_FIELDS: AiVisibilityEvidenceField[] = [
  {
    field: "checkedAt",
    purpose: "Records the exact date of the manual AI answer check so currentness can be judged later.",
  },
  {
    field: "tool",
    purpose: "Identifies which AI search surface produced the answer for tool-specific citation tracking.",
  },
  {
    field: "promptId",
    purpose: "Connects the result back to the stable guest-planning prompt in the measurement plan.",
  },
  {
    field: "expectedCanonicalPath",
    purpose: "Shows which After the Parks page should own the intent if the answer cites the site.",
  },
  {
    field: "observedCitationUrl",
    purpose: "Captures the actual cited URL so canonical drift and wrong-page citations can be corrected.",
  },
  {
    field: "citedAfterTheParks",
    purpose: "Separates visibility wins from checks where the AI answer did not cite the site at all.",
  },
  {
    field: "citationCurrent",
    purpose: "Flags whether the cited answer reflects the latest verified schedule and policy context.",
  },
  {
    field: "sourceFreshnessMentioned",
    purpose: "Checks whether the answer preserves the site's source-backed and last-verified trust signal.",
  },
  {
    field: "transportationCaveatRespected",
    purpose: "Confirms the answer did not simplify resort access or transportation in a misleading way.",
  },
  {
    field: "disneySpringsFreeTransferRejected",
    purpose: "Ensures AI answers do not recommend Disney Springs as a free transfer path to resort hotels.",
  },
  {
    field: "resortStayOrDiningExperienceReservationMentioned",
    purpose: "Verifies the answer mentions the resort stay or confirmed dining/experience reservation caveat.",
  },
];

export function validateSeoMeasurementPlan(): string[] {
  const issues: string[] = [];
  const seenQueries = new Set<string>();

  if (PRIORITY_RANK_TRACKING_QUERIES.length !== 50) {
    issues.push("Rank tracking must contain exactly 50 priority queries.");
  }

  for (const item of PRIORITY_RANK_TRACKING_QUERIES) {
    const key = item.query.toLowerCase();
    if (seenQueries.has(key)) issues.push(`Duplicate rank query: ${item.query}`);
    seenQueries.add(key);
    if (!item.canonicalPath.startsWith("/")) {
      issues.push(`${item.query} must map to a canonical site path.`);
    }
    if (item.query.length < 8) issues.push(`Rank query is too short: ${item.query}`);
  }

  for (const prompt of AI_VISIBILITY_PROMPTS) {
    if (!prompt.expectedCanonicalPath.startsWith("/")) {
      issues.push(`${prompt.id} must map to a canonical site path.`);
    }
    for (const tool of ALL_AI_TOOLS) {
      if (!prompt.tools.includes(tool)) {
        issues.push(`${prompt.id} is missing ${tool}.`);
      }
    }
  }

  const agentChecks = new Set(AGENT_READINESS_CHECKS.map((check) => check.check));
  for (const required of [
    "accessibilityTree",
    "stableHeadings",
    "descriptiveInteractiveNames",
    "keyboardReachablePrimaryFlows",
    "noHoverOnlyCriticalContent",
    "serverRenderedPrimaryAnswer",
    "canonicalAndStructuredDataPresent",
  ] satisfies AgentReadinessCheckName[]) {
    if (!agentChecks.has(required)) {
      issues.push(`Agent-friendly SEO checks are missing ${required}.`);
    }
  }
  for (const check of AGENT_READINESS_CHECKS) {
    if (check.evidence.length <= 24) {
      issues.push(`Agent-friendly SEO check ${check.check} needs clearer evidence.`);
    }
  }

  const evidenceFields = new Set(AI_VISIBILITY_EVIDENCE_FIELDS.map((field) => field.field));
  for (const required of [
    "checkedAt",
    "tool",
    "promptId",
    "expectedCanonicalPath",
    "observedCitationUrl",
    "citedAfterTheParks",
    "citationCurrent",
    "sourceFreshnessMentioned",
    "transportationCaveatRespected",
    "disneySpringsFreeTransferRejected",
    "resortStayOrDiningExperienceReservationMentioned",
  ] satisfies AiVisibilityEvidenceFieldName[]) {
    if (!evidenceFields.has(required)) {
      issues.push(`AI visibility evidence is missing ${required}.`);
    }
  }
  for (const field of AI_VISIBILITY_EVIDENCE_FIELDS) {
    if (field.purpose.length <= 24) {
      issues.push(`AI visibility evidence field ${field.field} needs a clearer purpose.`);
    }
  }

  if (CORE_WEB_VITALS_BUDGETS.mobileJsKb !== 320) {
    issues.push("Mobile JS budget must stay pinned at 320 KB for SEO-critical routes.");
  }
  if (!CORE_WEB_VITALS_BUDGETS.serverRenderedFirstScheduleBlockRequired) {
    issues.push("The first schedule block must remain server-rendered.");
  }
  if (!CORE_WEB_VITALS_BUDGETS.lazyLoadSecondaryWidgets) {
    issues.push("Filters, maps, modals, and secondary widgets must remain lazy-loaded.");
  }

  return issues;
}
