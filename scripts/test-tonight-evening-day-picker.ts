import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const collection = read("components/atlas/ActivityCollectionView.tsx");
assert.match(
  collection,
  /selectedDay/,
  "ActivityCollectionView should keep a selected day when users switch to By day."
);
assert.match(
  collection,
  /activity-collection-view__day-picker/,
  "By day view should render a visible day picker."
);
assert.match(
  collection,
  /aria-label="Choose activity day"/,
  "Day picker should be labelled for assistive tech."
);
assert.match(
  collection,
  /selectedDayItems/,
  "By day view should render the selected day group instead of every day at once."
);
assert.match(
  collection,
  /weatherById\?: Record<string, WeatherForTimeSpan>/,
  "ActivityCollectionView should accept weather summaries for shared cards."
);
assert.match(
  collection,
  /weatherById=\{weatherById\}/,
  "ActivityCollectionView should pass weather summaries into ActivityGrid."
);

const grid = read("components/atlas/ActivityGrid.tsx");
assert.match(
  grid,
  /weatherById\?: Record<string, WeatherForTimeSpan>/,
  "ActivityGrid should accept weather summaries for its ActivityCard children."
);
assert.match(
  grid,
  /weatherSummary=\{weatherById\?\.\[activity\.id\] \?\? null\}/,
  "ActivityGrid should pass the matching weather summary to each ActivityCard."
);

const data = read("lib/data/activities.ts");
assert.match(
  data,
  /export async function getEveningActivitiesThisWeek/,
  "Plan-ahead and collection surfaces can still use a week-scoped evening activity feed."
);
assert.match(
  data,
  /getAllOccurrences\(7\)/,
  "The week-scoped evening activity feed should load the full week when used."
);

const tonightPage = read("app/tonight/page.tsx");
assert.doesNotMatch(
  tonightPage,
  /getEveningActivitiesThisWeek|weekEveningActivities/,
  "Tonight should stay scoped to tonight's event window instead of adding a second week-ahead collection."
);

const tonightClient = read("components/atlas/TonightClient.tsx");
assert.doesNotMatch(
  tonightClient,
  /ActivityCollectionView|visibleWeekEveningActivities|weekEveningActivities/,
  "Tonight should use the same single event timeline setup as Today."
);

console.log("Tonight evening day-picker contract passed.");
