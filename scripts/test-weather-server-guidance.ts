import assert from "node:assert/strict";

import {
  weatherQueryForActivity,
  weatherQueryForMovie,
} from "@/lib/weather/serverGuidance";
import type {
  ActivityOccurrence,
  MovieNightOccurrence,
} from "@/lib/types/occurrence";

function activity(
  overrides: Partial<ActivityOccurrence>
): ActivityOccurrence {
  return {
    id: "activity-1",
    activitySlug: "poolside-activities",
    activityCatalogId: "poolside-catalog",
    title: "Poolside Activities",
    summary: "",
    category: "poolside",
    section: "Resort Activities",
    resort: {
      slug: "boardwalk-inn",
      name: "BoardWalk Inn",
      tier: "Deluxe",
      area: "epcot",
    },
    daypart: "anytime",
    price: { state: "unknown" },
    location: { label: "Luna Park Pool Deck" },
    eligibility: { ages: ["all_ages"] },
    freshness: {
      lastVerified: "2026-06-27T12:00:00-04:00",
      sourceUrl: "https://example.com/source.pdf",
      badge: "verified",
    },
    status: "active",
    scheduleText: "Activities schedule available digitally; no posted time in PDF",
    isHappeningNow: false,
    ...overrides,
  };
}

const now = new Date("2026-06-27T14:00:00-04:00");

const exact = weatherQueryForActivity(
  activity({
    id: "timed-pool",
    startDateTime: "2026-06-27T15:00:00-04:00",
    endDateTime: "2026-06-27T16:00:00-04:00",
  }),
  now
);
assert.equal(exact?.startsAt, "2026-06-27T15:00:00-04:00");
assert.equal(exact?.endsAt, "2026-06-27T16:00:00-04:00");
assert.equal(exact?.timeBasis, "exact_event_time");
assert.equal(exact?.timeBasisLabel, "Exact event time");

const pool = weatherQueryForActivity(activity({ id: "untimed-pool" }), now);
assert.equal(pool?.startsAt, "2026-06-27T14:00:00-04:00");
assert.equal(pool?.endsAt, "2026-06-27T18:00:00-04:00");
assert.equal(pool?.timeBasis, "flexible_activity_window");
assert.equal(pool?.timeBasisLabel, "Pool-area weather window");

const walk = weatherQueryForActivity(
  activity({
    id: "nature-walk",
    activitySlug: "nature-walk",
    title: "Nature Walk",
    category: "other",
    location: { label: "around Barefoot Bay" },
    scheduleText: "Daily",
  }),
  now
);
assert.equal(walk?.startsAt, "2026-06-27T14:00:00-04:00");
assert.equal(walk?.endsAt, "2026-06-27T17:00:00-04:00");
assert.equal(walk?.timeBasis, "flexible_activity_window");
assert.equal(walk?.timeBasisLabel, "Flexible outdoor window");

const genericMovie = weatherQueryForActivity(
  activity({
    id: "generic-movie",
    activitySlug: "movie-under-the-stars",
    title: "Movies Under the Stars",
    category: "movies_under_stars",
    scheduleText: "Nightly",
  }),
  now
);
assert.equal(genericMovie?.startsAt, "2026-06-27T19:00:00-04:00");
assert.equal(genericMovie?.endsAt, "2026-06-27T22:00:00-04:00");
assert.equal(genericMovie?.timeBasis, "flexible_activity_window");
assert.equal(
  genericMovie?.timeBasisLabel,
  "Typical evening window; confirm showtime"
);

const movie: MovieNightOccurrence = {
  id: "movie-boardwalk-saturday",
  resortSlug: "boardwalk-inn",
  resortName: "BoardWalk Inn",
  movieTitle: "Moana",
  displayTitle: "Moana",
  showTime: "8:30PM",
  dayOfWeek: "saturday",
  startDateTime: "2026-06-27T20:30:00-04:00",
  endDateTime: "2026-06-27T22:30:00-04:00",
  isTonight: true,
};
const movieQuery = weatherQueryForMovie(movie);
assert.equal(movieQuery?.startsAt, "2026-06-27T20:30:00-04:00");
assert.equal(movieQuery?.endsAt, "2026-06-27T22:30:00-04:00");
assert.equal(movieQuery?.timeBasis, "exact_event_time");
assert.equal(movieQuery?.timeBasisLabel, "Exact movie showtime");

console.log("Weather server guidance contracts passed.");
