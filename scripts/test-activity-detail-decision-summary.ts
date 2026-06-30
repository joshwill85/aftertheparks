import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const detail = readFileSync("components/atlas/ActivityDetailClient.tsx", "utf8");

for (const label of ["When", "Where", "Cost", "Reservation", "Access", "Weather"]) {
  assert.match(
    detail,
    new RegExp(`label="${label}"`),
    `Activity detail summary facts should include ${label}`
  );
}

for (const section of [
  "Before you go",
  "What to expect",
  "Good fit",
  "What to confirm",
  "Source and freshness",
]) {
  assert.match(
    detail,
    new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `Activity detail page should include ${section}`
  );
}

assert.match(
  detail,
  /"More"\}\s*at this resort/,
  "Activity detail page should include More at this resort"
);

assert.match(
  detail,
  /Booking details are incomplete in the current data\. Confirm with the official source before planning around this activity\./,
  "Activity detail should show booking-incomplete copy when reservation method is missing"
);

for (const banned of [
  "is a activity activity",
  "Other activity activities",
  "Soft planning only",
  "currently tracked",
]) {
  assert.doesNotMatch(detail, new RegExp(banned), `Activity detail should not render ${banned}`);
}

assert.match(
  detail,
  /resortGuestOnly[\s\S]+Resort guests only/,
  "Resort-guest-only access should appear in summary facts"
);

const accessCopyBlock = detail.match(/function accessCopy[\s\S]+?function weatherCopy/)?.[0] ?? "";
assert.match(
  accessCopyBlock,
  /category === "poolside"[\s\S]+pool area/i,
  "Poolside activities should show a public pool-area access caveat even without enrichment"
);

console.log("Activity detail decision summary contract passed.");
