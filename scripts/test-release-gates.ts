import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert.ok(
  packageJson.scripts["test:public-data-quality-gate"]?.includes(
    "scripts/public-data-quality-gate.ts"
  ),
  "package.json should expose the deterministic public data-quality gate"
);

assert.ok(
  packageJson.scripts["validate:public-release"],
  "package.json should expose a public release verification matrix"
);

for (const command of [
  "npx tsc --noEmit --pretty false",
  "npm run test:public-copy-audit",
  "npm run test:no-guides-surface",
  "npm run test:planning-ux",
  "npm run test:search",
  "npm run test:weather:ui",
  "npm run test:weather:pages",
  "npm run test:routes",
  "npm run test:visual-motion",
  "npm run validate:contracts",
  "npm run validate:trust -- http://localhost:3000",
  "npm run test:public-data-quality-gate",
]) {
  assert.ok(
    packageJson.scripts["validate:public-release"].includes(command),
    `validate:public-release should include ${command}`
  );
}

assert.ok(
  packageJson.scripts["test:visual-motion"]?.includes(
    "scripts/test-visual-motion-guardrails.ts"
  ),
  "package.json should expose visual and reduced-motion guardrails"
);

for (const [scriptName, expectedTarget] of [
  ["test:activity-detail-decision-summary", "scripts/test-activity-detail-decision-summary.ts"],
  ["test:calendar-density", "scripts/test-calendar-density.ts"],
  ["test:filter-pane-ux", "scripts/test-filter-pane-ux.ts"],
  ["test:filter-impact", "scripts/test-filter-impact.ts"],
  ["test:plan-pace", "scripts/test-plan-pace.ts"],
  ["test:plan-resilience", "scripts/test-plan-resilience.ts"],
  ["test:plan-transport-connections", "scripts/test-plan-transport-connections.ts"],
  ["test:public-plan-render", "scripts/test-public-plan-render.tsx"],
  ["test:public-browse-filters", "scripts/test-public-browse-filters.ts"],
  ["test:resort-decision-cards", "scripts/test-resort-decision-cards.ts"],
  ["test:resort-detail-structure", "scripts/test-resort-detail-structure.ts"],
  ["test-filter-pane-ux", "npm run test:filter-pane-ux"],
  ["test-filter-impact", "npm run test:filter-impact"],
] as const) {
  assert.ok(
    packageJson.scripts[scriptName]?.includes(expectedTarget),
    `package.json should expose ${scriptName} for ACT-01 verification`
  );
}

for (const command of [
  "npm run test:activity-detail-decision-summary",
  "npm run test:calendar-density",
  "npm run test:filter-pane-ux",
  "npm run test:filter-impact",
  "npm run test:plan-pace",
  "npm run test:plan-resilience",
  "npm run test:plan-transport-connections",
  "npm run test:public-plan-render",
  "npm run test:public-browse-filters",
  "npm run test:resort-decision-cards",
  "npm run test:resort-detail-structure",
]) {
  assert.ok(
    packageJson.scripts["test:planning-ux"].includes(command),
    `test:planning-ux should include ${command}`
  );
}

assert.ok(
  packageJson.scripts.validate?.includes("test-release-gates") ||
    packageJson.scripts["test:public-data-quality-gate"],
  "release gate contract should be discoverable from package scripts"
);

console.log("Release gate contract passed.");
