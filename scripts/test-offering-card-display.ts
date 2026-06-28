import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  findNextOfferingSession,
  formatOfferingAvailabilityLabel,
  formatOfferingTimingLabel,
} from "@/lib/activityOfferingDisplay";
import type { ActivityOccurrence, ActivityOffering } from "@/lib/types/occurrence";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const offeringCard = read("components/activity/ActivityOfferingCard.tsx");
const offeringGrid = read("components/activity/ActivityOfferingGrid.tsx");
const resortPage = read("app/resorts/[slug]/page.tsx");
const polish = read("src/styles/polish.css");

assert.doesNotMatch(
  offeringCard,
  /DecisionSignals|offeringDecisionProfile/,
  "Official offering cards should not render nested decision/signal blocks."
);

assert.match(
  offeringCard,
  /nextSession\?:\s*ActivityOccurrence/,
  "Official offering cards should accept a matched next dated session."
);

assert.match(
  offeringCard,
  /formatOfferingAvailabilityLabel\(offering,\s*nextSession\)/,
  "Official offering availability should include the next session when available."
);

assert.match(
  offeringCard,
  /formatOfferingTimingLabel\(offering,\s*nextSession\)/,
  "Official offering timing should use the actual matched session timing."
);

assert.match(
  offeringGrid,
  /findNextOfferingSession\(offering,\s*nextSessions\)/,
  "Official offering grids should match offerings to dated resort sessions."
);

assert.match(
  resortPage,
  /nextSessions=\{resortTimeline\}/,
  "Resort offering cards should receive the resort timeline for next-session matching."
);

assert.match(
  polish,
  /\.activity-offering-grid\s*\{[\s\S]*grid-auto-rows:\s*1fr/,
  "Official offering grids should make cards in each row the same height."
);

assert.match(
  polish,
  /\.activity-offering-card\s*\{[\s\S]*height:\s*100%/,
  "Official offering cards should fill the equal-height grid cell."
);

const moviesOffering = {
  id: "offering-movies",
  activitySlug: "movies-under-the-stars",
  activityCatalogId: "program-movies",
  offeringKey: "movies-under-the-stars:akl-kidani",
  resort: {
    slug: "animal-kingdom-villas-kidani-village",
    name: "Animal Kingdom Villas - Kidani Village",
    tier: "villa",
    area: "Animal Kingdom",
  },
  title: "Movie Under the Stars",
  summary: "",
  category: "movies_under_stars",
  tags: [],
  availability: {
    kind: "calendar_dependent",
    label: "Schedule varies by resort calendar",
  },
  price: { state: "free" },
  location: { label: "Movie Lawn" },
  eligibility: { ages: ["all_ages"] },
  amenities: [],
  freshness: {
    lastVerified: "2026-06-27T12:00:00.000Z",
    sourceUrl: "https://example.com",
    badge: "verified",
  },
  status: "active",
} satisfies ActivityOffering;

const movieSession = {
  id: "movie-session",
  activitySlug: "movie-under-the-stars",
  activityCatalogId: "catalog-movie",
  resort: moviesOffering.resort,
  title: "Movies Under the Stars",
  summary: "",
  category: "movies_under_stars",
  section: "Resort Activities",
  startDateTime: "2026-06-27T20:30:00-04:00",
  endDateTime: "2026-06-27T22:00:00-04:00",
  daypart: "evening",
  price: { state: "free" },
  location: { label: "Movie Lawn" },
  eligibility: { ages: ["all_ages"] },
  freshness: {
    lastVerified: "2026-06-27T12:00:00.000Z",
    sourceUrl: "https://example.com",
    badge: "verified",
  },
  status: "active",
} satisfies ActivityOccurrence;

const nextSession = findNextOfferingSession(
  moviesOffering,
  [movieSession],
  new Date("2026-06-27T12:00:00-04:00")
);
assert.equal(nextSession?.id, "movie-session");
assert.equal(
  formatOfferingAvailabilityLabel(moviesOffering, nextSession),
  "Next session: Today",
  "Availability should call out the next matched dated session."
);
assert.equal(
  formatOfferingTimingLabel(moviesOffering, nextSession),
  "8:30 PM – 10:00 PM",
  "Timing should use the actual matched session range instead of Check hours."
);

console.log("Offering card display coverage passed.");
