import assert from "node:assert/strict";
import {
  AGENT_READINESS_CHECKS,
  AI_VISIBILITY_EVIDENCE_FIELDS,
  AI_VISIBILITY_PROMPTS,
  CORE_WEB_VITALS_BUDGETS,
  PRIORITY_RANK_TRACKING_QUERIES,
  validateSeoMeasurementPlan,
} from "@/lib/seo/measurement";

const issues = validateSeoMeasurementPlan();
assert.deepEqual(issues, [], `SEO measurement plan should be complete: ${issues.join("; ")}`);

assert.equal(
  PRIORITY_RANK_TRACKING_QUERIES.length,
  50,
  "strategy requires a bounded rank-tracking list of 50 priority queries"
);

for (const pageType of ["calendar_hub", "today_tonight", "resort", "activity", "guide"] as const) {
  assert.ok(
    PRIORITY_RANK_TRACKING_QUERIES.some((query) => query.pageType === pageType),
    `rank tracking should cover ${pageType} page type`
  );
}

for (const intent of [
  "calendar",
  "today",
  "tonight",
  "non_park_day",
  "no_ticket",
  "activity_specific",
  "resort_specific",
  "transportation_area",
] as const) {
  assert.ok(
    PRIORITY_RANK_TRACKING_QUERIES.some((query) => query.intent === intent),
    `rank tracking should cover ${intent} intent`
  );
}

assert.ok(
  PRIORITY_RANK_TRACKING_QUERIES.some((query) =>
    query.query.toLowerCase().includes("magical resort guide")
  ),
  "rank tracking should include competitor-overlap terms for Magical Resort Guide"
);
assert.ok(
  PRIORITY_RANK_TRACKING_QUERIES.some((query) =>
    query.query.toLowerCase().includes("mama")
  ),
  "rank tracking should include competitor-overlap terms for Mama's on Vacation"
);

for (const prompt of AI_VISIBILITY_PROMPTS) {
  assert.ok(prompt.prompt.length > 40, `${prompt.id} should be a real guest-planning prompt`);
  assert.ok(prompt.expectedCanonicalPath.startsWith("/"), `${prompt.id} should map to a canonical path`);
}

for (const tool of ["ChatGPT Search", "Google AI Mode", "Perplexity", "Bing Copilot"] as const) {
  assert.ok(
    AI_VISIBILITY_PROMPTS.some((prompt) => prompt.tools.includes(tool)),
    `AI visibility prompts should include ${tool}`
  );
}

for (const field of [
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
] as const) {
  assert.ok(
    AI_VISIBILITY_EVIDENCE_FIELDS.some((evidenceField) => evidenceField.field === field),
    `AI visibility spot checks should record ${field}`
  );
}

assert.ok(
  AI_VISIBILITY_EVIDENCE_FIELDS.every((field) => field.purpose.length > 24),
  "AI visibility evidence fields should explain why each field matters"
);

for (const check of [
  "accessibilityTree",
  "stableHeadings",
  "descriptiveInteractiveNames",
  "keyboardReachablePrimaryFlows",
  "noHoverOnlyCriticalContent",
  "serverRenderedPrimaryAnswer",
  "canonicalAndStructuredDataPresent",
] as const) {
  assert.ok(
    AGENT_READINESS_CHECKS.some((agentCheck) => agentCheck.check === check),
    `agent-friendly SEO checks should include ${check}`
  );
}

assert.ok(
  AGENT_READINESS_CHECKS.every((check) => check.evidence.length > 24),
  "agent-friendly SEO checks should name the evidence to collect"
);

assert.equal(CORE_WEB_VITALS_BUDGETS.lcpMs, 2500);
assert.equal(CORE_WEB_VITALS_BUDGETS.inpMs, 200);
assert.equal(CORE_WEB_VITALS_BUDGETS.cls, 0.1);
assert.equal(
  CORE_WEB_VITALS_BUDGETS.mobileJsKb,
  320,
  "strategy requires a mobile JS route budget for SEO-critical pages"
);
assert.equal(
  CORE_WEB_VITALS_BUDGETS.serverRenderedFirstScheduleBlockRequired,
  true,
  "strategy requires the first schedule block to be server-rendered"
);
assert.equal(
  CORE_WEB_VITALS_BUDGETS.lazyLoadSecondaryWidgets,
  true,
  "strategy requires filters, maps, modals, and secondary widgets to be lazy-loaded"
);

console.log("SEO measurement tests passed.");
