import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  footerCta,
  heroContent,
  messyInputs,
  messyToMagicContent,
  organizedOutputs,
  souvenirMarks,
  storySections,
} from "../app/about/content";

function readAboutSources(dir = path.join(process.cwd(), "app/about")): string {
  return readdirSync(dir)
    .map((entry) => path.join(dir, entry))
    .flatMap((entryPath) => {
      if (statSync(entryPath).isDirectory()) return [readAboutSources(entryPath)];
      if (/\.(tsx|ts)$/.test(entryPath)) return [readFileSync(entryPath, "utf8")];
      return [];
    })
    .join("\n");
}

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

assert.deepEqual(
  storySections.map((section) => section.artifact),
  ["summer", "cabin", "problem", "builder", "born", "twilight"],
  "Story cards should expose the requested artifact variants."
);

for (const section of storySections) {
  assert.ok(section.stamp.length > 0, `${section.heading} should have an artifact stamp.`);
  assert.ok(section.motif.length > 0, `${section.heading} should have a unique visual motif.`);
  assert.ok(section.phase.length > 0, `${section.heading} should have a story phase.`);
}

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

assert.equal(
  storySections[0].paragraphs[1],
  "This whole thing started because my wife and I wanted to give our daughter a summer she would remember.",
  "The opening story should stay family-centered."
);

assert.ok(
  storySections[1].paragraphs[0].startsWith("Living in Orlando"),
  "The cabin section should lead with the cabin setup."
);

assert.ok(
  storySections.some((section) =>
    section.paragraphs.some((paragraph) => paragraph.includes("inconvenient traits"))
  ),
  "The builder section should use the softened trait wording."
);

assert.equal(
  storySections.at(-1)?.hingeNote,
  "Next time, I want this to be easier.",
  "The emotional hinge note should be preserved as a map note."
);

assert.equal(
  messyToMagicContent.outputLabel,
  "A clearer family plan",
  "The organized side should use human planning language, not data-pipeline language."
);

assert.deepEqual(organizedOutputs, [
  "Today",
  "Tonight",
  "Free activities",
  "Movies",
  "Campfires",
  "Resort filters",
  "My Plan",
]);

assert.deepEqual(
  souvenirMarks.map((mark) => mark.name),
  [
    "key-tag",
    "receipt",
    "calendar",
    "pencil",
    "paperclip",
    "lantern",
    "compass",
    "marshmallow",
    "map-pin",
    "weather",
    "tonight-note",
  ],
  "The souvenir margin system should include every requested decorative variant."
);

const aboutSources = readAboutSources();

for (const section of storySections) {
  for (const paragraph of section.paragraphs) {
    assert.doesNotMatch(paragraph, /toxic traits/i);
    assert.doesNotMatch(paragraph, /I kept thinking, Next time/i);
  }
}

const illustrationText = [
  heroContent.illustrationAlt,
  ...heroContent.decorativeLabels,
  ...storySections.map((section) => section.icon),
].join(" ");

assert.doesNotMatch(
  aboutSources,
  /alt=["']Image["']/,
  "About page sources should not use generic image alt text."
);

assert.match(aboutSources, /data-about-route-step/, "About page should expose route activation stops.");
assert.match(aboutSources, /className=\{styles\.storyRoute\}/, "Story spine should use an SVG route.");
assert.match(aboutSources, /ctaSignpost/, "Final CTA should include a signpost scene.");
assert.match(aboutSources, /Tonight\?/, "Hero/story visuals should include the small Tonight note.");
assert.doesNotMatch(aboutSources, /from ["']motion["']|from ["']framer-motion["']/, "About page must not use a client-side animation library.");
assert.doesNotMatch(aboutSources, /next\/image|https?:\/\//, "About page should not add remote images in this pass.");

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
