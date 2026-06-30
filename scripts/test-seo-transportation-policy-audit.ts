import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  auditTransportationPolicyRecords,
  collectTransportationPolicyRecords,
  renderTransportationPolicyAuditReport,
} from "@/lib/seo/transportationPolicyAudit";

const cleanAudit = auditTransportationPolicyRecords([
  {
    path: "app/resorts?no_ticket_friendly=true/page.tsx",
    text: "Do not use Disney Springs as a free way to get to Disney resort hotels. Use a resort stay, restaurant reservation, dining reservation, or confirmed dining/experience reservation instead.",
  },
  {
    path: "app/activities?area=disney-springs/page.tsx",
    text: "Disney Springs-area resort plans should rely on a resort stay, confirmed dining/experience reservation, rideshare, or another currently allowed route.",
  },
]);

assert.deepEqual(cleanAudit.issues, [], `caveated transportation copy should pass: ${cleanAudit.issues.join("; ")}`);
assert.equal(cleanAudit.rows.length, 2);
assert.ok(
  renderTransportationPolicyAuditReport(cleanAudit).includes("Transportation Policy Audit"),
  "transportation policy report should render a readable heading"
);

const badFreeTransferAudit = auditTransportationPolicyRecords([
  {
    path: "app/legacy-bad-copy/page.tsx",
    text: "Use Disney Springs buses as a free way to get to Disney resort hotels for resort hopping without paying for parking.",
  },
]);

assert.ok(
  badFreeTransferAudit.issues.some((issue) => /free resort-transfer/i.test(issue)),
  "audit should flag copy that promotes Disney Springs as a free resort-transfer route"
);

const missingReservationAudit = auditTransportationPolicyRecords([
  {
    path: "app/activities?area=disney-springs/page.tsx",
    text: "Disney Springs buses and boats can reach nearby resort hotels, but access rules may vary.",
  },
]);

assert.ok(
  missingReservationAudit.issues.some((issue) => /resort stay or dining\/experience reservation/i.test(issue)),
  "audit should require the resort stay or dining/experience reservation caveat"
);

const allCurrentRecords = collectTransportationPolicyRecords();
assert.ok(
  allCurrentRecords.some((record) => record.path.endsWith("lib/seo/transportation.ts")),
  "default collection should include the central transportation policy helper"
);

const currentAudit = auditTransportationPolicyRecords(allCurrentRecords);
assert.deepEqual(
  currentAudit.issues,
  [],
  `current repo transportation copy should pass: ${currentAudit.issues.join("; ")}`
);

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.ok(
  packageJson.scripts["seo:transportation-policy"],
  "package should expose seo:transportation-policy"
);

console.log("SEO transportation policy audit tests passed.");
