import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/resorts/[slug]/page.tsx", "utf8");
const emptyState = readFileSync("components/resort/ResortEmptyState.tsx", "utf8");
const transportation = readFileSync("lib/seo/transportation.ts", "utf8");
const routeSmoke = readFileSync("scripts/test-route-smoke.ts", "utf8");

const requiredHeadings: Array<[RegExp, string]> = [
  [/What(?:'|&apos;)s happening today/, "What's happening today"],
  [/Best options tonight/, "Best options tonight"],
  [/Free or low-cost options/, "Free or low-cost options"],
  [/Indoor\/weather backups/, "Indoor/weather backups"],
  [/Anytime resort options/, "Anytime resort options"],
  [/Transportation and access notes/, "Transportation and access notes"],
  [/Source and freshness/, "Source and freshness"],
  [/Nearby resorts and related activity links/, "Nearby resorts and related activity links"],
];

for (const [pattern, heading] of requiredHeadings) {
  assert.match(
    page,
    pattern,
    `Resort detail page should include "${heading}"`
  );
}

assert.doesNotMatch(
  page,
  /Official Disney recreation offerings that are not tied to a dated calendar time/,
  "Resort detail page should not expose internal official-offering wording"
);
assert.match(
  page,
  /These are resort activities or amenities that may not have a specific calendar time\. Confirm hours, access, and availability before you go\./,
  "Anytime resort options should explain the planning caveat"
);

const transportIndex = page.indexOf("Transportation and access notes");
const sourceIndex = page.indexOf("Source and freshness");
const relatedIndex = page.indexOf("Nearby resorts and related activity links");
assert.ok(
  transportIndex !== -1 && sourceIndex !== -1 && relatedIndex !== -1,
  "Resort detail structure markers should be present"
);
assert.ok(
  transportIndex < sourceIndex && sourceIndex < relatedIndex,
  "Resort detail should show transportation/access, then source freshness, then nearby/related links"
);

for (const href of [
  "/today?resort=",
  "/tonight?resort=",
  "/activities?resort=",
  "/activities?weather=indoor",
]) {
  assert.match(
    emptyState,
    new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `Empty state should link to ${href}`
  );
}
assert.doesNotMatch(
  emptyState,
  /Browse tonight|currently tracked/,
  "Resort empty states should avoid audit-banned browse/internal phrasing"
);

assert.match(
  transportation,
  /Do not use Disney Springs as a free resort-transfer hub\. Confirm resort access and return transportation before you go\./,
  "Disney Springs caveat should use the PRD short form"
);

assert.match(
  routeSmoke,
  /\/resorts\/[^"']+/,
  "Route smoke test should cover at least one resort detail page"
);

console.log("Resort detail structure contract passed.");
