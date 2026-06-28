import assert from "node:assert/strict";
import { buildWeatherDayStory } from "@/lib/weather/dayStory";

const story = buildWeatherDayStory({
  windows: [
    {
      id: "morning",
      locationKey: "all_wdw",
      startsAt: "2026-06-27T08:00:00-04:00",
      endsAt: "2026-06-27T12:00:00-04:00",
      title: "Morning",
      chapterLabel: "Sunshine Start",
      action: "go_now",
      headline: "Good outdoor window",
      plainLanguageSummary: "Outdoor resort exploring works best this morning.",
      recommendedActivityTags: ["outdoor_shaded"],
      cautionActivityTags: [],
      avoidActivityTags: [],
      deepLinks: [{ label: "See outdoor activities", href: "/today?weather=outdoor" }],
    },
  ],
  stormModeActive: false,
});

assert.match(story.headline, /Sunshine|outdoor|morning/i);
assert.ok(story.chapters[0].href);
assert.doesNotMatch(story.body, /cute|magical alert/i);

console.log("Weather day story passed.");
