import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const eventCard = read("components/events/EventCard.tsx");
const eventUi = read("components/events/event-ui.tsx");
const mapper = read("lib/events/mapToEventCard.ts");
const polish = read("src/styles/polish.css");
const todayClient = read("components/atlas/TodayClient.tsx");
const tonightClient = read("components/atlas/TonightClient.tsx");
const activityCard = read("components/activity/ActivityCard.tsx");
const nightActivityCard = read("components/tonight/NightActivityCard.tsx");
const activityDecision = read("lib/activityDecision.ts");

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

assert.match(
  mapper,
  /decisionProfile:\s*activityDecisionProfile\(activity,\s*display\)/,
  "Shared activity event cards should use the central decision profile."
);

assert.doesNotMatch(
  activityDecision,
  /id:\s*"time"[\s\S]*label:\s*"Timing"/,
  "Activity card decision blocks should not duplicate the visible card timing."
);

assert.doesNotMatch(
  activityDecision,
  /id:\s*"cost"[\s\S]*label:\s*"Cost"/,
  "Activity card decision blocks should not duplicate cost badges."
);

assert.match(
  activityDecision,
  /if \(booking\.status !== "required"\) return undefined/,
  "Activity card booking blocks should only appear for confirmed required bookings."
);

assert.doesNotMatch(
  mapper,
  /showTrust:\s*display\.trustState|showTrust:\s*activity\.trustState|showTrust:\s*[\s\S]*trustActivity/,
  "Browse cards should not show internal source/trust confidence language."
);

assert.match(
  polish,
  /\.event-card-list--cols-2 \.event-card-list__item\s*\{[\s\S]*height:\s*100%/,
  "Two-column event grid items should stretch to the tallest card in the row without a fixed oversized footprint."
);

assert.match(
  polish,
  /\.event-card-list--cols-3 \.event-card-list__item,[\s\S]*\.event-card-list--compact \.event-card-list__item\s*\{[\s\S]*height:\s*100%/,
  "Three-column and compact event grid items should stretch to the tallest card in the row without a fixed oversized footprint."
);

assert.match(
  polish,
  /\.event-card-list--cols-2 \.event-card\s*\{[\s\S]*height:\s*100%[\s\S]*min-height:\s*0/,
  "Two-column event cards should fill the row height chosen by content, not a hard-coded card height."
);

assert.match(
  polish,
  /\.event-card-list--cols-2 \.event-card__hit-area,[\s\S]*\.event-card-list--compact \.event-card__hit-area\s*\{[\s\S]*flex-direction:\s*column/,
  "Grid event cards should stack media above copy so the card does not split into a sparse icon column."
);

assert.match(
  eventCard,
  /<div className="event-card__footer">[\s\S]*<EventBadgeRow/,
  "EventCard should render badges in a bottom footer, not at the top of the text block."
);

assert.match(
  polish,
  /\.event-card__footer\s*\{[\s\S]*margin-top:\s*auto/,
  "Event card footer badges should sit at the bottom of the card body."
);

assert.match(
  eventCard,
  /<EventWeatherSignal[\s\S]*className="event-card__inline-weather"/,
  "Fetched event weather should render as an inline card row with weather icon space."
);

assert.match(
  eventUi,
  /<CategoryIcon[\s\S]*size=\{isDetail \? "md" : "md"\}/,
  "Card category icons should be large enough to recognize in browsing grids."
);

assert.match(
  eventUi,
  /<span className="sr-only">Resort:<\/span>/,
  "Event card resort metadata should include a screen-reader label."
);

assert.match(
  eventUi,
  /<span className="sr-only">Where:<\/span>/,
  "Event card location metadata should include a screen-reader label."
);

assert.match(
  eventUi,
  /<span className="sr-only">When:<\/span>/,
  "Event card time metadata should include a screen-reader label."
);

assert.match(
  polish,
  /\.event-weather-signal__icon\s*\{[\s\S]*width:\s*2\.25rem[\s\S]*height:\s*2\.25rem/,
  "Inline weather signals should use a recognizable weather icon size."
);

assert.match(
  polish,
  /\.event-card-list--cols-2 \.event-card__title,[\s\S]*-webkit-line-clamp:\s*2/,
  "Fixed-size event cards should clamp long titles and resort lines."
);

assert.match(
  todayClient,
  /import \{ EventCardList, EventCardListItem \} from "@\/components\/events\/EventCardList"/,
  "Today timeline cards should use the shared EventCardList grid wrapper."
);

assert.match(
  todayClient,
  /<EventCardList[\s\S]+columns=\{2\}[\s\S]+className="today-activity-timeline"/,
  "Today timeline should get the same two-column card sizing behavior as other card surfaces."
);

assert.match(
  todayClient,
  /<EventCardListItem key=\{activity\.id\}/,
  "Today timeline items should use EventCardListItem so row heights are shared."
);

assert.match(
  activityCard,
  /const card = activityToEventCard\(activity,\s*display/,
  "ActivityCard should inherit the shared non-redundant event-card decision profile."
);

assert.match(
  tonightClient,
  /<NightActivityCard[\s\S]*activity=\{activity\}/,
  "Tonight activity sections should render through the shared night activity card."
);

assert.match(
  nightActivityCard,
  /const card = activityToEventCard\(activity,\s*display/,
  "NightActivityCard should inherit the shared non-redundant event-card decision profile."
);

assert.doesNotMatch(
  todayClient,
  /formatOrlandoTime|absolute bottom-0 left-4 top-0|-left-\[1\.85rem\]/,
  "Today timeline should not render the old rail, dot, or duplicate time label outside the shared card."
);

console.log("Event card layout coverage passed.");
