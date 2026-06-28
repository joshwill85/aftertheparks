import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { movieToEventCard } from "@/lib/events/mapToEventCard";
import {
  formatMovieDuration,
  movieEndsAt,
  movieStartsAt,
} from "@/lib/movies/time";
import { sanitizeMovieTitle } from "@/lib/movies/sanitize";
import type { MovieNightOccurrence } from "@/lib/types/occurrence";

const movie: MovieNightOccurrence = {
  id: "movie-polynesian-lilo-stitch",
  resortSlug: "polynesian-village-resort",
  resortName: "Polynesian Village Resort",
  movieTitle: "Lilo & Stitch",
  displayTitle: "Lilo & Stitch",
  showTime: "8:30 PM",
  location: "Great Ceremonial House Lawn",
  dayOfWeek: "Friday",
  posterUrl: "https://image.tmdb.org/t/p/w342/example-poster.jpg",
  backdropUrl: "https://image.tmdb.org/t/p/w780/example-backdrop.jpg",
  releaseYear: 2002,
  tmdbId: 11544,
  overview:
    "A lonely Hawaiian girl and a runaway alien learn what family can mean.",
  voteAverage: 7.5,
  runtimeMinutes: 85,
  startDateTime: "2026-06-27T20:30:00-04:00",
  endDateTime: "2026-06-27T21:55:00-04:00",
  isTonight: true,
};

const card = movieToEventCard(movie, "day");

assert.equal(card.title, "Lilo & Stitch", "movie cards must show the movie title");
assert.equal(card.href, undefined, "movie cards should open in-app details instead of bouncing to Tonight");
assert.equal(card.summary, movie.overview, "movie cards should surface the movie summary when TMDB provides one");
assert.match(
  card.extra ?? "",
  /2002/,
  "movie cards should include parent-useful metadata like release year"
);
assert.match(
  card.extra ?? "",
  /TMDB 7\.5/,
  "movie cards should include the TMDB audience score when available"
);
assert.match(
  card.extra ?? "",
  /1 hr 25 min/,
  "movie cards should include runtime when TMDB provides duration"
);
assert.equal(
  card.timeDateTime,
  movie.startDateTime,
  "movie cards should expose the movie start datetime for weather and semantic time"
);
assert.match(
  card.scheduleDayLabel ?? "",
  /Sat, Jun 27/,
  "movie cards should list the Disney-local day and date from the exact start datetime"
);
assert.equal(
  card.scheduleDayDateTime,
  "2026-06-27",
  "movie cards should expose the semantic local calendar date"
);
assert.equal(
  card.timeLabel,
  "Starts 8:30 PM",
  "movie cards should label the exact movie start time"
);
assert.match(
  card.extra ?? "",
  /Duration 1 hr 25 min/,
  "movie cards should label movie duration explicitly"
);
assert.equal(
  card.endDateTime,
  movie.endDateTime,
  "movie cards should expose the movie end datetime for weather expiry"
);
assert.deepEqual(
  card.weatherQuery,
  {
    resortSlug: movie.resortSlug,
    startsAt: movie.startDateTime,
    endsAt: movie.endDateTime,
  },
  "movie cards should request weather for the movie window"
);
assert.deepEqual(
  card.media,
  {
    kind: "movie",
    posterSrc: movie.posterUrl,
    backdropSrc: movie.backdropUrl,
    alt: "Lilo & Stitch poster",
  },
  "movie cards must use movie database artwork, not initial-letter placeholders"
);

assert.equal(formatMovieDuration(45), "45 min");
assert.equal(formatMovieDuration(85), "1 hr 25 min");
assert.equal(formatMovieDuration(120), "2 hr");
assert.equal(
  movieStartsAt({
    dayOfWeek: "saturday",
    showTime: "8:30PM",
    now: new Date("2026-06-26T12:00:00-04:00"),
  })?.toISOString(),
  "2026-06-28T00:30:00.000Z",
  "movie start time should resolve to the next matching Orlando calendar day"
);
assert.equal(
  movieEndsAt("2026-06-28T00:30:00.000Z", 85)?.toISOString(),
  "2026-06-28T01:55:00.000Z",
  "movie end time should use TMDB runtime when available"
);

const listingCard = readFileSync("components/movies/MovieListingCard.tsx", "utf8");
assert.match(
  listingCard,
  /MovieDetailsDialog/,
  "MovieListingCard should open a movie details dialog"
);
assert.match(
  listingCard,
  /overview|tmdbId|posterUrl/,
  "Movie details should include summary and TMDB-backed movie metadata"
);

const eventCard = readFileSync("components/events/EventCard.tsx", "utf8");
assert.match(
  eventCard,
  /onOpen/,
  "EventCard should support button-style in-app details interactions"
);

const tmdb = readFileSync("lib/movies/tmdb.ts", "utf8");
assert.match(
  tmdb,
  /overview/,
  "TMDB metadata loader should retain movie summaries"
);
assert.match(
  tmdb,
  /vote_average/,
  "TMDB metadata loader should retain audience score"
);
assert.match(
  tmdb,
  /runtime/,
  "TMDB metadata loader should retain movie runtime"
);
assert.match(
  tmdb,
  /fetchTmdbMovieRuntime/,
  "TMDB metadata loader should support refreshing runtime for cached movie hits"
);

const posterCache = readFileSync("lib/movies/poster-cache.ts", "utf8");
assert.match(
  posterCache,
  /refreshRuntimeIfMissing/,
  "Movie poster cache should refresh runtime for existing cached hits"
);
assert.match(
  posterCache,
  /runtime_minutes/,
  "Movie poster cache should persist runtime minutes"
);

assert.equal(sanitizeMovieTitle("Tangled Ps"), "Tangled");
assert.equal(sanitizeMovieTitle("Moana 'P"), "Moana");

const activitiesData = readFileSync("lib/data/activities.ts", "utf8");
assert.match(
  activitiesData,
  /activity_gold_v2_preview\.json/,
  "Movie nights should come from source-backed Gold data instead of legacy database rows"
);
assert.match(
  activitiesData,
  /isUsableMovieTitle/,
  "Movie night loader should filter OCR-damaged movie titles before publishing cards"
);
assert.match(
  activitiesData,
  /enrichMovieNightsWithPosters/,
  "Movie night loader should enrich every published movie card with TMDB artwork"
);
assert.match(
  activitiesData,
  /filter\(\(movie\) => Boolean\(movie\.posterUrl\)\)/,
  "Movie night loader should only publish cards that have TMDB poster artwork"
);
assert.doesNotMatch(
  activitiesData,
  /friday\|saturday\|sunday/,
  "Movie title filtering must not reject valid titles such as Freaky Friday or Freakier Friday"
);
assert.doesNotMatch(
  activitiesData,
  /building\|pool\|beach\|lawn\|courtyard\|deck/,
  "Movie title filtering must not reject valid titles such as Teen Beach Movie"
);
assert.match(
  activitiesData,
  /Freaky Friday|Freakier Friday|Teen Beach Movie/,
  "Movie title filtering should explicitly protect known valid movie-title words that look like schedule/location text"
);

assert.match(
  listingCard,
  /aria-labelledby=\{titleId\}[\s\S]+headingId=\{titleId\}/,
  "Movie details dialog should connect aria-labelledby to the rendered movie heading"
);

assert.match(
  listingCard,
  /runtimeMinutes/,
  "Movie details dialog should include runtime facts when available"
);

console.log("Movie card detail coverage passed.");
