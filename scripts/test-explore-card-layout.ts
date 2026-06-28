import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const activityGrid = readFileSync("components/atlas/ActivityGrid.tsx", "utf8");
const exploreLayout = readFileSync("components/explore/ExploreLayout.tsx", "utf8");
const polish = readFileSync("src/styles/polish.css", "utf8");

assert.match(
  activityGrid,
  /className\?: string/,
  "ActivityGrid should accept a className so page-specific card layouts can opt in without changing every shared card."
);

assert.match(
  activityGrid,
  /<EventCardList[\s\S]*className=\{className\}/,
  "ActivityGrid should pass its className to EventCardList."
);

assert.match(
  exploreLayout,
  /className="explore-activity-grid"/,
  "Explore activity results should opt into the denser Explore card layout."
);

assert.match(
  polish,
  /\.explore-activity-grid \.event-card__hit-area\s*\{[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/,
  "Explore cards should use a single-column layout so the right side of the card is not left empty."
);

assert.doesNotMatch(
  polish,
  /\.explore-activity-grid \.event-card__hit-area\s*\{[\s\S]*grid-template-columns:\s*112px minmax\(0,\s*1fr\)/,
  "Explore cards should not reserve a two-column media-and-copy grid."
);

assert.match(
  polish,
  /\.explore-activity-grid \.event-card--has-save \.event-card__hit-area\s*\{[\s\S]*padding-right:\s*18px/,
  "Explore cards should not reserve a huge right gutter across the whole card just for the save button."
);

assert.match(
  polish,
  /\.explore-activity-grid\s*\{[\s\S]*grid-auto-rows:\s*auto/,
  "Explore cards should size rows to their own content instead of inheriting extra equal-height whitespace."
);

assert.match(
  polish,
  /\.explore-activity-grid \.decision-signals\.decision-signals--compact \.decision-signals__grid\s*\{[\s\S]*grid-template-columns:\s*1fr/,
  "Explore card decision facts should stack in one column instead of leaving unused card width."
);

assert.match(
  polish,
  /@media \(max-width:\s*420px\)[\s\S]*\.explore-activity-grid \.decision-signals\.decision-signals--compact \.decision-signals__grid\s*\{[\s\S]*grid-template-columns:\s*1fr/,
  "Explore card decision facts should stay one column on narrow screens."
);

assert.match(
  polish,
  /\.explore-activity-grid \.event-card__save\s*\{[\s\S]*position:\s*static/,
  "Explore cards should keep Add to My Plan in normal flow instead of floating over the card."
);

assert.match(
  polish,
  /\.explore-activity-grid \.event-card__footer\s*\{[\s\S]*padding-right:\s*0/,
  "Explore card footers should not reserve overlap space once the save button is in normal flow."
);

assert.match(
  polish,
  /@media \(max-width:\s*640px\)[\s\S]*\.explore-activity-grid \.event-card__hit-area\s*\{[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/,
  "Explore cards should return to the readable stacked mobile layout on narrow screens."
);

console.log("Explore card layout coverage passed.");
