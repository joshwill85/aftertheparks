import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const eventCard = read("components/events/EventCard.tsx");
const eventUi = read("components/events/event-ui.tsx");
const mapper = read("lib/events/mapToEventCard.ts");
const polish = read("src/styles/polish.css");

assert.match(
  eventCard,
  /resortSlug\?: string/,
  "Event cards need an optional resortSlug so repeated activities at different resorts can show resort identity."
);

assert.match(
  eventCard,
  /<EventMediaDisplay[\s\S]+resortSlug=\{resortSlug\}/,
  "EventCard should pass resortSlug into the media area."
);

assert.match(
  eventUi,
  /import \{[\s\S]*hasResortStoryIcon[\s\S]*ResortStoryIcon[\s\S]*\} from "@\/components\/resort\/ResortStoryIcon"/,
  "Event media should use the shared resort story icon registry."
);

assert.match(
  eventUi,
  /event-card__resort-story-icon/,
  "Event media should render a resort icon badge for visual uniqueness."
);

assert.match(
  eventUi,
  /hasResortStoryIcon\(resortSlug\)[\s\S]+<ResortStoryIcon slug=\{resortSlug\}/,
  "Event media should only render known resort icons."
);

assert.match(
  mapper,
  /resortSlug:\s*display\.resortSlug/,
  "Activity cards should receive the resort slug from display activity mapping."
);

assert.doesNotMatch(
  mapper,
  /showTrust:\s*display\.trustState|showTrust:\s*activity\.trustState|showTrust:\s*[\s\S]*trustActivity/,
  "Browse cards should not show internal source/trust confidence language."
);

assert.match(
  polish,
  /\.event-card-list--cols-2 \.event-card-list__item\s*\{[\s\S]*height:\s*clamp\(31rem,\s*35vw,\s*35rem\)/,
  "Two-column event grid items should use a fixed card footprint."
);

assert.match(
  polish,
  /\.event-card-list--cols-3 \.event-card-list__item,[\s\S]*\.event-card-list--compact \.event-card-list__item\s*\{[\s\S]*height:\s*clamp\(23rem,\s*30vw,\s*28rem\)/,
  "Three-column and compact event grid items should use a fixed card footprint."
);

assert.match(
  polish,
  /\.event-card-list--cols-2 \.event-card\s*\{[\s\S]*height:\s*clamp\(31rem,\s*35vw,\s*35rem\)[\s\S]*min-height:\s*0/,
  "Two-column event cards should use the fixed footprint instead of content-only height."
);

assert.match(
  polish,
  /\.event-card-list--cols-2 \.event-card__hit-area,[\s\S]*\.event-card-list--compact \.event-card__hit-area\s*\{[\s\S]*overflow:\s*hidden/,
  "Fixed-size event cards should hide overflow rather than stretching unevenly."
);

assert.match(
  polish,
  /\.event-card-list--cols-2 \.event-card__title,[\s\S]*-webkit-line-clamp:\s*2/,
  "Fixed-size event cards should clamp long titles and resort lines."
);

console.log("Event card layout coverage passed.");
