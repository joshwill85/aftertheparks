import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const polish = readFileSync("src/styles/polish.css", "utf8");
const constellationComponent = readFileSync(
  "components/resort/ResortActivityConstellation.tsx",
  "utf8"
);

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = polish.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Missing CSS rule for ${selector}`);
  return match[1];
}

function combinedRuleBody(selectorList: string): string {
  const escaped = selectorList.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = polish.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Missing CSS rule for ${selectorList}`);
  return match[1];
}

assert.match(
  ruleBody(".wow-filter-alchemy-board"),
  /overflow:\s*hidden/,
  "Filter alchemy boards should clip decorative tokens inside the board."
);

assert.match(
  ruleBody(".wow-filter-alchemy-board__orb"),
  /overflow:\s*hidden/,
  "Filter alchemy orb should clip long chip labels inside the orb."
);

assert.match(
  ruleBody(".filter-chip"),
  /min-width:\s*0/,
  "Active filter chips should be allowed to shrink inside their row."
);

assert.match(
  ruleBody(".filter-chip span"),
  /min-width:\s*0[\s\S]*max-width:\s*100%/,
  "Filter chip labels should ellipsize within the chip instead of bleeding out."
);

assert.match(
  combinedRuleBody(
    ".filter-recovery__actions .btn-primary,\n.filter-recovery__actions .btn-secondary"
  ),
  /min-width:\s*0[\s\S]*max-width:\s*100%[\s\S]*white-space:\s*normal[\s\S]*overflow-wrap:\s*anywhere/,
  "No-results recovery action buttons should wrap long labels inside the button."
);

assert.match(
  combinedRuleBody(".filter-recovery__title,\n.filter-recovery__copy"),
  /overflow-wrap:\s*anywhere/,
  "No-results recovery copy should wrap long text inside the panel."
);

assert.match(
  ruleBody(".result-summary"),
  /min-width:\s*0/,
  "Result summary layout should not force controls outside the content column."
);

assert.ok(
  constellationComponent.includes('className="resort-constellation__orbit-labels"'),
  "Constellation orbit labels should render in their own overlay layer."
);

assert.ok(
  constellationComponent.indexOf('className={nodeClassName(node)}') <
    constellationComponent.indexOf('className="resort-constellation__orbit-labels"'),
  "Constellation orbit labels should render after nodes so labels are never covered by icons."
);

assert.match(
  ruleBody(".resort-constellation__orbit-labels"),
  /pointer-events:\s*none[\s\S]*z-index:\s*4/,
  "Constellation orbit label overlay should sit above icon nodes without blocking node clicks."
);

assert.match(
  ruleBody(".resort-constellation__orbit-label"),
  /z-index:\s*4[\s\S]*white-space:\s*nowrap/,
  "Constellation orbit labels should stay readable above icon nodes."
);

assert.match(
  ruleBody(".resort-card-grid"),
  /grid-auto-rows:\s*1fr/,
  "Resort card grids should use equal-height rows so card footers align symmetrically."
);

assert.match(
  ruleBody(".resort-card__highlights"),
  /margin-top:\s*auto/,
  "Resort card category chips should sit at the bottom of the card body."
);

assert.match(
  ruleBody(".resort-card__hint"),
  /margin:\s*auto 0 0/,
  "Resort card fallback footer text should sit at the bottom just like category chips."
);

console.log("Text overflow guard coverage passed.");
