import assert from "node:assert/strict";
import {
  getVisibleTonightResultCount,
  getVisibleTonightActivities,
} from "../lib/tonight/visibleResults";
import type {
  ActivityOccurrence,
  MovieNightOccurrence,
} from "../lib/types/occurrence";

function occurrence(
  id: string,
  overrides: Partial<ActivityOccurrence> = {}
): ActivityOccurrence {
  return {
    id,
    activitySlug: "campfire-at-pride-rock",
    activityCatalogId: "campfire-at-pride-rock",
    title: "Campfire at Pride Rock",
    summary: "Evening campfire activity.",
    category: "campfire",
    section: "Resort Activities",
    location: { label: "Lion King Section" },
    resort: {
      slug: "art-of-animation-resort",
      name: "Art of Animation Resort",
      tier: "value",
      area: "skyliner",
    },
    daypart: "evening",
    price: { state: "free" },
    eligibility: { ages: [] },
    freshness: {
      lastVerified: "2026-06-27",
      sourceUrl: "https://example.com",
      badge: "verified",
    },
    source: {},
    status: "active",
    startDateTime: "2026-06-28T18:30:00-04:00",
    endDateTime: "2026-06-28T19:30:00-04:00",
    ...overrides,
  };
}

const visibleCampfire = occurrence("campfire-visible");
const duplicateCampfire = occurrence("campfire-duplicate", {
  title: "Campfire Activities",
});
const movieProxyActivity = occurrence("movie-proxy", {
  activitySlug: "movie-under-the-stars",
  activityCatalogId: "movie-under-the-stars",
  title: "Movie Under the Stars",
  category: "movies_under_stars",
  startDateTime: "2026-06-28T20:30:00-04:00",
  endDateTime: "2026-06-28T22:00:00-04:00",
});
const corruptActivity = occurrence("corrupt", {
  activitySlug: "a-b-c-d-e",
  activityCatalogId: "corrupt",
  title: "A B C D E",
});
const movieNight: MovieNightOccurrence = {
  id: "movie-night",
  resortSlug: "art-of-animation-resort",
  resortName: "Art of Animation Resort",
  movieTitle: "The Lion King",
  displayTitle: "The Lion King",
  showTime: "8:30 PM",
  location: "Big Blue Pool",
  dayOfWeek: "Sunday",
  startDateTime: "2026-06-28T20:30:00-04:00",
  endDateTime: "2026-06-28T22:00:00-04:00",
  isTonight: true,
};

assert.deepEqual(
  getVisibleTonightActivities([
    visibleCampfire,
    duplicateCampfire,
    movieProxyActivity,
    corruptActivity,
  ]).map((activity) => activity.id),
  ["campfire-visible"],
  "Visible tonight activity cards should remove duplicate slots, movie proxy rows, and hidden/corrupt activities."
);

assert.equal(
  getVisibleTonightResultCount({
    activities: [
      visibleCampfire,
      duplicateCampfire,
      movieProxyActivity,
      corruptActivity,
    ],
    movieNights: [movieNight],
  }),
  2,
  "Tonight result count should match rendered activity cards plus rendered movie cards."
);

console.log("Tonight visible result count coverage passed.");
