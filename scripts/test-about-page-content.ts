import assert from "node:assert/strict";
import {
  footerCta,
  heroContent,
  messyInputs,
  organizedOutputs,
  storySections,
} from "../app/about/content";

const expectedHeadings = [
  "The summer we wanted to make count",
  "The cabin that made it possible",
  "The planning problem",
  "The part where I could not leave it alone",
  "After the Parks is born",
  "Maybe I'm becoming a Disney person",
];

assert.deepEqual(
  storySections.map((section) => section.heading),
  expectedHeadings,
  "About story sections should preserve the approved origin-story order."
);

assert.equal(
  heroContent.primaryCta.href,
  "#story",
  "Hero primary CTA should jump to the story spine."
);
assert.equal(
  heroContent.secondaryCta.href,
  "/today",
  "Hero secondary CTA should route to today's activities."
);

assert.deepEqual(
  footerCta.actions.map((action) => action.href),
  ["/today", "/tonight", "/plan"],
  "Footer CTA should route to Today, Tonight, and My Plan in order."
);

assert.deepEqual(messyInputs, [
  "PDFs",
  "Resort pages",
  "Images",
  "Activity calendars",
  "Times that change",
  "Weather questions",
  "Transportation confusion",
]);

assert.deepEqual(organizedOutputs, [
  "Today",
  "Tonight",
  "Free activities",
  "Movies",
  "Campfires",
  "Resort filters",
  "My Plan",
]);

const illustrationText = [
  heroContent.illustrationAlt,
  ...heroContent.decorativeLabels,
  ...storySections.map((section) => section.icon),
].join(" ");

for (const forbidden of [
  /\bMickey\b/i,
  /\bcastle\b/i,
  /\bcharacter\b/i,
  /official Disney typography/i,
]) {
  assert.doesNotMatch(
    illustrationText,
    forbidden,
    `About illustration labels should avoid IP-sensitive term: ${forbidden}`
  );
}

console.log("About page content contract passed.");
