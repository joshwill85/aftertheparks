import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { movieToEventCard } from "@/lib/events/mapToEventCard";
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

assert.equal(sanitizeMovieTitle("Tangled Ps"), "Tangled");
assert.equal(sanitizeMovieTitle("Moana 'P"), "Moana");

const activitiesData = readFileSync("lib/data/activities.ts", "utf8");
assert.match(
  activitiesData,
  /activities_ingest\.json/,
  "Movie nights should come from source-backed ingest data instead of legacy database rows"
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

console.log("Movie card detail coverage passed.");
