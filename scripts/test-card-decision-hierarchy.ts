import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const eventCard = readFileSync("components/events/EventCard.tsx", "utf8");
const activityDecision = readFileSync("lib/activityDecision.ts", "utf8");

assert.ok(activityDecision.includes('"booking"'), "Decision signals should include booking.");
assert.ok(activityDecision.includes('"weather"'), "Decision signals should include weather.");
assert.ok(
  activityDecision.includes("bookingStatusForActivity"),
  "Activity decision profile should use planning facts."
);
assert.ok(
  activityDecision.includes("weatherFitForActivity"),
  "Activity decision profile should use weather fit facts."
);

assert.ok(
  eventCard.indexOf("<EventTitleBlock") < eventCard.indexOf("<DecisionSignals"),
  "Title/time/location should render before decision signals."
);

assert.ok(
  eventCard.indexOf("<DecisionSignals") < eventCard.indexOf("<EventBadgeRow"),
  "Decision signals should render before lower-priority badges."
);

console.log("Card decision hierarchy contract passed.");
