import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { toDisplayActivity } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

const eventCardSource = readFileSync("components/events/EventCard.tsx", "utf8");
assert.match(eventCardSource, /EventWeatherSignal/);
assert.match(eventCardSource, /showWeatherSignal = true/);
assert.match(eventCardSource, /weatherQuery\?\.startsAt/);

const css = readFileSync("src/styles/polish.css", "utf8");
assert.match(css, /\.event-weather-signal/);
assert.match(css, /\.event-weather-signal--mixed/);
assert.match(css, /\.event-weather-signal--poor/);
assert.match(css, /\.near-term-rain-line/);

const eventSignalSource = readFileSync("components/weather/EventWeatherSignal.tsx", "utf8");
assert.doesNotMatch(
  eventSignalSource,
  /nearTermRain/,
  "Event card weather should not include near-term rain copy or headline fallbacks."
);
assert.doesNotMatch(
  eventSignalSource,
  /NearTermRainLine/,
  "Event card weather should not render near-term rain copy inside the compact card."
);

const activity: ActivityOccurrence = {
  id: "test",
  activitySlug: "movie-under-the-stars",
  activityCatalogId: "movie",
  resort: {
    slug: "polynesian-village-resort",
    name: "Disney's Polynesian Village Resort",
    tier: "deluxe",
    area: "Magic Kingdom",
  },
  title: "Movie Under the Stars",
  summary: "Outdoor movie",
  category: "movies_under_stars",
  section: "entertainment",
  startDateTime: "2026-06-27T20:00:00-04:00",
  endDateTime: "2026-06-27T22:00:00-04:00",
  daypart: "evening",
  price: { state: "free" },
  location: { label: "Great Ceremonial House Lawn" },
  eligibility: { ages: [] },
  freshness: {
    lastVerified: "2026-06-27",
    sourceUrl: "https://example.com",
    badge: "verified",
  },
  status: "active",
};

const card = activityToEventCard(activity, toDisplayActivity(activity));

assert.equal(card.timeDateTime, "2026-06-27T20:00:00-04:00");
assert.equal(card.endDateTime, "2026-06-27T22:00:00-04:00");
assert.equal(card.resortSlug, "polynesian-village-resort");

console.log("weather event-card integration contract passed");
