import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const polish = readFileSync("src/styles/polish.css", "utf8");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function reducedMotionBlockFor(selector: string): string {
  const pattern = new RegExp(
    `@media\\s*\\(prefers-reduced-motion:\\s*reduce\\)\\s*{[\\s\\S]*?${escapeRegExp(
      selector
    )}[\\s\\S]*?}`,
    "m"
  );
  return polish.match(pattern)?.[0] ?? "";
}

for (const selector of [
  ".wow-diorama__shimmer",
  ".wow-diorama__lantern-bloom",
  ".wow-firefly-route__glow",
  ".wow-folded-map-daybook-transition",
  ".hrm-firefly-pause",
  ".hrm-search-echo",
  ".plan-story::before",
  ".browse-filter-badge",
  ".plan-living-badge",
]) {
  assert.match(
    reducedMotionBlockFor(selector),
    /animation:\s*none/,
    `${selector} should disable decorative animation under reduced motion`
  );
}

for (const [file, pattern] of [
  ["components/home/HomeHero.tsx", /wow-living-resort-diorama-hero[\s\S]+aria-hidden/],
  ["components/tonight/NightfallTimeline.tsx", /wow-starlight-firefly-route-map[\s\S]+aria-hidden/],
  ["components/atlas/CalendarClient.tsx", /wow-calendar-time-weather-aurora[\s\S]+aria-hidden/],
  ["components/activity/SaveButton.tsx", /wow-folded-map-daybook-transition[\s\S]+aria-hidden/],
] as const) {
  assert.match(
    readFileSync(file, "utf8"),
    pattern,
    `${file} should mark decorative visual moments aria-hidden`
  );
}

assert.match(
  polish,
  /Warm evening accent[\s\S]+\.event-card--night/,
  "Evening emphasis should be a scoped night-card accent, not a global dark mode"
);
assert.doesNotMatch(
  polish,
  /body(?:\[[^\]]*daypart[^\]]*\])?[^{]*{[^}]*background:\s*(?:#0|black|rgb\(0|var\(--weather-card-dark-bg)/i,
  "After-dark emphasis should not globally darken the whole page"
);

console.log("Visual motion guardrails passed.");
