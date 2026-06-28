import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const hero = readFileSync("components/atlas/Hero.tsx", "utf8");
const activities = readFileSync("app/activities/page.tsx", "utf8");
const today = readFileSync("app/today/page.tsx", "utf8");
const tonight = readFileSync("app/tonight/page.tsx", "utf8");
const css = readFileSync("src/styles/polish.css", "utf8");

assert.ok(hero.includes("compactBrowse"), "Hero should support compact browse mode.");
assert.ok(activities.includes("compactBrowse"), "Activities should use compact hero.");
assert.ok(today.includes("compactBrowse"), "Today should use compact hero.");
assert.ok(tonight.includes("compactBrowse"), "Tonight should use compact hero.");
assert.ok(css.includes(".browse-hero-compact"), "Compact browse hero CSS should exist.");
assert.ok(
  css.includes("@media (max-width: 640px)"),
  "Mobile-specific compact styles should exist."
);

console.log("Mobile browse efficiency contract passed.");
