import assert from "node:assert/strict";
import {
  buildNightfallTimeline,
  parseTonightMovieMinutes,
} from "../lib/visualizations/nightfallTimeline";
import type {
  ActivityOccurrence,
  MovieNightOccurrence,
} from "../lib/types/occurrence";

function activity(
  id: string,
  startDateTime: string,
  category: string,
  title = id,
  resortName = "Polynesian Village Resort"
): ActivityOccurrence {
  return {
    id,
    activityCatalogId: id,
    activitySlug: id,
    resort: {
      slug: resortName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: resortName,
      tier: "deluxe",
      area: "Magic Kingdom",
    },
    title,
    summary: "",
    category,
    section: "test",
    startDateTime,
    daypart: "evening",
    price: { state: "free" },
    location: { label: "Great Lawn" },
    eligibility: { ages: ["all_ages"] },
    freshness: {
      badge: "verified",
      lastVerified: "2026-06-20T12:00:00.000Z",
      sourceUrl: "https://example.com/source.pdf",
    },
    status: "active",
  };
}

const movie: MovieNightOccurrence = {
  id: "movie-1",
  resortSlug: "grand-floridian-resort-and-spa",
  resortName: "Grand Floridian Resort & Spa",
  movieTitle: "A Resort Movie",
  displayTitle: "A Resort Movie",
  showTime: "8:30 PM",
  dayOfWeek: "Friday",
  isTonight: true,
};

assert.equal(parseTonightMovieMinutes("8:30 PM"), 20 * 60 + 30);
assert.equal(parseTonightMovieMinutes("10 PM"), 22 * 60);
assert.equal(parseTonightMovieMinutes("not a time"), undefined);

const timeline = buildNightfallTimeline({
  activities: [
    activity("campfire", "2026-06-26T23:30:00.000Z", "campfire", "Campfire"),
    activity("campfire-duplicate", "2026-06-26T23:30:00.000Z", "campfire", "Campfire", "Beach Club Resort"),
    activity("campfire-variant", "2026-06-26T23:30:00.000Z", "campfire", "Cajun Campfire", "Port Orleans Resort - French Quarter"),
    activity("same-hour-extra", "2026-06-26T23:45:00.000Z", "resort_activity", "Pool Trivia"),
    activity("late-music", "2026-06-27T02:15:00.000Z", "music", "Late Music"),
    activity("too-early", "2026-06-26T20:30:00.000Z", "arts_crafts", "Too Early"),
  ],
  movies: [movie],
  nowMinutes: 20 * 60,
});

assert.equal(timeline.items.length, 3, "Timeline should group duplicate same-time story stops");
assert.deepEqual(
  timeline.items.map((item) => item.title),
  ["Campfire options", "A Resort Movie", "Late Music"],
  "Timeline items should sort chronologically"
);
assert.equal(timeline.items[0].status, "happening_now");
assert.equal(timeline.items[0].resortName, "3 resorts");
assert.equal(timeline.items[1].status, "next_showing");
assert.equal(timeline.items[2].status, "last_call");
assert.equal(timeline.items[0].positionPct, 42);
assert.equal(timeline.items[1].positionPct, 58);
assert.equal(timeline.items[2].positionPct, 86);
assert.match(timeline.ariaLabel, /3 timeline stops/);
assert.match(timeline.ariaLabel, /Campfire options at 7:30 PM/);
assert.match(timeline.ariaLabel, /A Resort Movie at 8:30 PM/);
assert.equal(timeline.summary, "3 evening stops from 7:30 PM through 10:15 PM.");

console.log("Nightfall timeline coverage passed.");
