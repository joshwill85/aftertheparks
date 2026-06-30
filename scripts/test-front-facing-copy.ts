import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const COPY_FILES = [
  "app/activities/page.tsx",
  "app/page.tsx",
  "app/resorts/[slug]/page.tsx",
  "app/resorts/page.tsx",
  "app/search/page.tsx",
  "components/activity/DecisionSignals.tsx",
  "components/activity/ActivityOfferingCard.tsx",
  "components/atlas/CalendarClient.tsx",
  "components/atlas/SearchClient.tsx",
  "components/explore/BrowseFilterShell.tsx",
  "components/explore/ExploreLayout.tsx",
  "components/explore/FilterRail.tsx",
  "components/explore/ResultSummary.tsx",
  "components/home/HomeHero.tsx",
  "components/home/RestDayBuilder.tsx",
  "components/magic/NoTicketMagic.tsx",
  "components/plan/PlanPaceMeter.tsx",
  "components/plan/PlanItem.tsx",
  "components/plan/PlanPreview.tsx",
  "components/plan/PlanStorySummary.tsx",
  "components/resort/ResortActivityConstellation.tsx",
  "components/resort/ResortCard.tsx",
  "components/resort/ResortCategorySections.tsx",
  "components/tonight/NightfallTimeline.tsx",
  "components/tonight/TonightHero.tsx",
  "lib/activityDecision.ts",
  "lib/magic/collections.ts",
  "lib/magic/nearby.ts",
  "lib/plan/daybookPath.ts",
  "lib/plan/pace.ts",
  "lib/plan/story.ts",
  "lib/search/synonyms.ts",
  "lib/visualizations/calendarDensity.ts",
  "lib/visualizations/resortConstellation.ts",
];

const BANNED_COPY = [
  /decision friction/i,
  /tight handoff/i,
  /backtracking/i,
  /anchored plan moment/i,
  /turn it into a story/i,
  /feel intentional/i,
  /story map/i,
  /shaping (?:a rest-day story|the list)/i,
  /narrowing the spell/i,
  /rarest token/i,
  /loosen the narrowest filter/i,
  /no moments match/i,
  /source-backed/i,
  /source confidence/i,
  /source check/i,
  /how current does this look/i,
  /data & freshness/i,
  /source-confirmed/i,
  /source looks current/i,
  /official source linked/i,
  /verified recently/i,
  /time is clear/i,
  /cost is clear/i,
  /source saved/i,
  /source checked/i,
  /price unclear/i,
  /unknown price/i,
  /unknown prices/i,
  /no-cost/i,
  /no extra activity cost/i,
  /view source calendar/i,
  /official schedule/i,
  /official disney source/i,
  /source calendar/i,
  /confidence score/i,
  /source-led/i,
  /source contract/i,
  /document captured/i,
  /traceability/i,
  /at a glance/i,
  /curated/i,
  /(["'`>])OK(["'`<])/,
  /turn it into/i,
  /resort moments?/i,
  /works well.*\bplanning\b/i,
];

const allowedInternalContexts = [
  /data-wow-moment/,
  /data-hidden-detail/,
  /type .*confidence/i,
  /interface .*confidence/i,
  /function .*confidence/i,
  /export .*confidence/i,
  /SourceConfidence[A-Z]/,
  /getCuratedHomeActivities/,
  /turnstileToken/,
  /booking/,
  /PlanDaybook/,
  /daybook/,
  /"backtracking"/,
];

const failures: string[] = [];

for (const file of COPY_FILES) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (allowedInternalContexts.some((pattern) => pattern.test(line))) return;
    for (const pattern of BANNED_COPY) {
      if (pattern.test(line)) {
        failures.push(`${file}:${index + 1}: ${pattern} -> ${line.trim()}`);
      }
    }
  });
}

assert.equal(
  failures.length,
  0,
  `Front-facing copy still contains AI-ish or jargon-heavy language:\n${failures.join("\n")}`
);

console.log("Front-facing copy tone coverage passed.");
