import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HIDDEN_RESORT_MAGIC_DETAILS } from "../lib/magic/hiddenResortMagic";

const REQUIRED_IDS = [
  "hero_lantern_alignment",
  "quick_finder_bubble_trail",
  "filter_chip_constellation",
  "calendar_triple_dot_upgrade",
  "resort_card_tilework",
  "category_stamp_imperfection",
  "plan_passport_completion_reveal",
  "starlight_firefly_pause",
  "search_suggestion_echo",
  "footer_paper_grain_secret",
] as const;

assert.equal(
  HIDDEN_RESORT_MAGIC_DETAILS.length,
  10,
  "Phase 7 must ship exactly 10 hidden resort magic details"
);
assert.deepEqual(
  HIDDEN_RESORT_MAGIC_DETAILS.map((detail) => detail.id),
  REQUIRED_IDS,
  "Hidden detail IDs should match the PRD list in order"
);

const ids = new Set(HIDDEN_RESORT_MAGIC_DETAILS.map((detail) => detail.id));
assert.equal(ids.size, 10, "Hidden detail IDs must be unique");

const triggered = HIDDEN_RESORT_MAGIC_DETAILS.filter(
  (detail) => detail.triggered
);
assert.ok(
  triggered.length >= 6,
  "At least 6 hidden details must require interaction, time, scroll, or plan progress"
);

for (const detail of HIDDEN_RESORT_MAGIC_DETAILS) {
  assert.equal(detail.decorative, true, `${detail.id} must be decorative`);
  assert.equal(detail.ariaHidden, true, `${detail.id} must be aria-hidden`);
  assert.match(detail.cssClass, /^hrm-[a-z0-9-]+$/, `${detail.id} needs an hrm CSS class`);
  assert.ok(detail.reducedMotion.length > 0, `${detail.id} needs reduced-motion guidance`);
  assert.doesNotMatch(
    `${detail.publicName} ${detail.brandSafetyNote}`,
    /\b(mouse\s*ear|castle|character face|official map|logo)\b/i,
    `${detail.id} brand-safety copy should avoid restricted concepts`
  );
}

const inventory = readFileSync("docs/visual-qa/hidden-mickeys.md", "utf8");
for (const detail of HIDDEN_RESORT_MAGIC_DETAILS) {
  assert.match(inventory, new RegExp(`\\|\\s*${detail.id}\\s*\\|`));
  assert.match(inventory, new RegExp(detail.route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(inventory, /Reduced motion/i);
}

const css = readFileSync("src/styles/polish.css", "utf8");
for (const detail of HIDDEN_RESORT_MAGIC_DETAILS) {
  assert.match(css, new RegExp(`\\.${detail.cssClass}\\b`), `${detail.cssClass} needs CSS`);
  const source = readFileSync(detail.componentPath, "utf8");
  assert.match(
    source,
    new RegExp(`data-hidden-detail="${detail.id}"`),
    `${detail.componentPath} should wire ${detail.id}`
  );
}

console.log("Hidden resort magic coverage passed.");
