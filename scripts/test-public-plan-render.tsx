import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getPublicPlanPreview,
  PUBLIC_PLAN_PREVIEW_TOKEN,
} from "@/lib/plan/publicPlanPreview";
import type { PublicPlanResponse } from "@/lib/plan/types";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const previewPublicPlan = getPublicPlanPreview(PUBLIC_PLAN_PREVIEW_TOKEN);

if (!previewPublicPlan) {
  throw new Error(
    "Public share preview token should resolve in local/test environments"
  );
}
const samplePublicPlan: PublicPlanResponse = previewPublicPlan;
assert.equal(
  getPublicPlanPreview("missing-token"),
  null,
  "Public share preview should only resolve the explicit preview token"
);
const previewHelper = readFileSync("lib/plan/publicPlanPreview.ts", "utf8");
const publicPlanPage = readFileSync("app/p/[shareToken]/page.tsx", "utf8");
const publicPlanApi = readFileSync("app/api/shared-plan/[token]/route.ts", "utf8");

assert.match(
  previewHelper,
  /process\.env\.NODE_ENV === "production"[\s\S]*return null/,
  "Public share preview token should be disabled in production"
);
assert.ok(
  publicPlanPage.indexOf("getPublicPlanPreview(shareToken)") <
    publicPlanPage.indexOf("createServiceClient()"),
  "Public share page should resolve the local preview token before requiring Supabase"
);
assert.ok(
  publicPlanApi.indexOf("getPublicPlanPreview(token)") <
    publicPlanApi.indexOf("createServiceClient()"),
  "Public share API should resolve the local preview token before requiring Supabase"
);

async function main() {
  const { PlanClientBoundary } = await import("@/components/plan/PlanClientBoundary");
  const { PublicPlanClient } = await import("@/components/plan/PublicPlanClient");

  const html = renderToStaticMarkup(
    <PlanClientBoundary preview={false}>
      <PublicPlanClient token={PUBLIC_PLAN_PREVIEW_TOKEN} initial={samplePublicPlan} />
    </PlanClientBoundary>
  );

  for (const expected of [
    "View only",
    "BoardWalk Arrival Night",
    "Boardwalk Inn · 2026-07-04 to 2026-07-04",
    "Resort Day Ticket",
    "3 saved ideas",
    "Build in buffers",
    "Keep an indoor backup nearby",
    "Magic Check",
    "Transportation disclosures",
    "Weather caveats",
    "Source and freshness",
    "Schedule changed since this was saved",
    "Add these ideas to My Plan",
  ]) {
    assert.match(html, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const forbidden of [
    "Share plan",
    "Add to calendar",
    "Edit my plan",
    "Delete plan permanently",
    'href="/activities?weather=indoor"',
  ]) {
    assert.doesNotMatch(
      html,
      new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `Public shared plan render should not expose ${forbidden}`
    );
  }

  assert.match(
    html,
    /<section[^>]+aria-labelledby="resort-day-ticket-heading"/,
    "Resort day ticket should be a labelled section"
  );
  assert.match(
    html,
    /plan-magic-check__readonly-action/,
    "Read-only Magic Check should render actions as inert labels"
  );
  assert.doesNotMatch(
    html,
    /plan-magic-check__action/,
    "Read-only Magic Check should not render editable action links"
  );

  console.log("Public shared plan render contract passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
