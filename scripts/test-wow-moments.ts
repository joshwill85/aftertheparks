import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WOW_MOMENTS } from "../lib/magic/wowMoments";

const REQUIRED_IDS = [
  "living_resort_diorama_hero",
  "starlight_firefly_route_map",
  "filter_alchemy_board",
  "folded_map_daybook_transition",
  "calendar_time_weather_aurora",
] as const;

assert.equal(WOW_MOMENTS.length, 5, "Phase 6 must ship exactly 5 advanced wow moments");
assert.deepEqual(
  WOW_MOMENTS.map((moment) => moment.id),
  REQUIRED_IDS,
  "Wow moment IDs should match the PRD list in order"
);

const ids = new Set(WOW_MOMENTS.map((moment) => moment.id));
assert.equal(ids.size, 5, "Wow moment IDs must be unique");

for (const moment of WOW_MOMENTS) {
  assert.ok(moment.publicName.length > 8, `${moment.id} needs a readable public name`);
  assert.ok(moment.route.length > 0, `${moment.id} needs a route`);
  assert.ok(moment.componentPath.endsWith(".tsx"), `${moment.id} needs a TSX component hook`);
  assert.match(moment.cssClass, /^wow-[a-z0-9-]+$/, `${moment.id} needs a wow CSS class`);
  assert.ok(moment.figmaHandoff.length > 24, `${moment.id} needs Figma handoff guidance`);
  assert.ok(moment.reducedMotion.length > 12, `${moment.id} needs reduced-motion behavior`);
  assert.ok(moment.acceptance.length >= 3, `${moment.id} needs concrete acceptance criteria`);
  assert.equal(moment.noLayoutShift, true, `${moment.id} must preserve layout stability`);
  assert.equal(moment.primaryActionSafe, true, `${moment.id} must not block primary actions`);
}

const docs = readFileSync("docs/visual-qa/wow-moments.md", "utf8");
for (const moment of WOW_MOMENTS) {
  assert.match(docs, new RegExp(`\\|\\s*${moment.id}\\s*\\|`), `${moment.id} needs a QA doc row`);
  assert.match(docs, new RegExp(moment.route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

const css = readFileSync("src/styles/polish.css", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
for (const moment of WOW_MOMENTS) {
  assert.match(css, new RegExp(`\\.${moment.cssClass}\\b`), `${moment.cssClass} needs CSS`);
  const source = readFileSync(moment.componentPath, "utf8");
  assert.match(
    source,
    new RegExp(`data-wow-moment="${moment.id}"`),
    `${moment.componentPath} should wire ${moment.id}`
  );
}

assert.match(
  globals,
  /\.home-hero > \.wow-living-resort-diorama-hero\.wow-living-resort-diorama-hero\s*\{[\s\S]*?position:\s*absolute;/,
  "Home hero cascade must keep the diorama layer absolute after the generic child rule"
);

console.log("Wow moment coverage passed.");
