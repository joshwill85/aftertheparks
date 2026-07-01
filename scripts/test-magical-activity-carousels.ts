import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const carouselPath = "components/atlas/MagicalActivityCarousel.tsx";
const detailPath = "components/atlas/ActivityDetailClient.tsx";
const activityPagePath = "app/activities/[slug]/page.tsx";
const stylesPath = "src/styles/polish.css";

assert.ok(
  existsSync(carouselPath),
  "Activity detail pages should have a reusable magical activity carousel component."
);

const carousel = readFileSync(carouselPath, "utf8");
const detail = readFileSync(detailPath, "utf8");
const page = readFileSync(activityPagePath, "utf8");
const styles = readFileSync(stylesPath, "utf8");

assert.match(
  carousel,
  /export function MagicalActivityCarousel/,
  "The magical carousel component should be exported for page reuse."
);
assert.match(
  carousel,
  /movieToEventCard/,
  "The magical carousel should render movie event cards for movie guide pages."
);
assert.match(
  carousel,
  /EventCard/,
  "The magical carousel should render activity cards for campfire/current activity pages."
);
assert.match(
  detail,
  /MagicalActivityCarousel[\s\S]+title="Campfire glow nearby"/,
  "Campfire activity detail pages should include a magical campfire card carousel."
);
assert.match(
  page,
  /getMovieNights/,
  "The Movies Under the Stars evergreen page should load current movie-night cards."
);
assert.match(
  page,
  /MagicalActivityCarousel[\s\S]+title="Movie magic this week"/,
  "The Movies Under the Stars evergreen page should include a magical movie-card carousel."
);
assert.match(
  styles,
  /\.magical-activity-carousel__rail[\s\S]+scroll-snap-type:\s*x mandatory/,
  "The magical carousel rail should scroll horizontally with snap points."
);
assert.match(
  styles,
  /\.magical-activity-carousel__item[\s\S]+scroll-snap-align:\s*start/,
  "Each magical carousel card should snap cleanly at the start edge."
);

console.log("Magical activity carousel contract passed.");
