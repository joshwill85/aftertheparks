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
  "Tonight should have a week-scoped evening activity feed for the bottom By day collection."
);
assert.match(
  data,
  /getAllOccurrences\(7\)/,
  "The week-scoped evening activity feed should load the full week."
);

const tonightPage = read("app/tonight/page.tsx");
assert.match(
  tonightPage,
  /getEveningActivitiesThisWeek/,
  "Tonight page should load week evening activities for the bottom collection."
);
assert.match(
  tonightPage,
  /weekEveningActivities=\{weekEveningActivities\}/,
  "Tonight page should pass week evening activities to TonightClient."
);
assert.match(
  tonightPage,
  /weekEveningActivities\.map\(\(activity\) =>[\s\S]*weatherQueryForActivity\(activity, weatherNow\)/,
  "Initial weather loading should include week evening activities."
);

const tonightClient = read("components/atlas/TonightClient.tsx");
assert.match(
  tonightClient,
  /weekEveningActivities/,
  "TonightClient should receive week evening activities."
);
assert.match(
  tonightClient,
  /visibleWeekEveningActivities/,
  "TonightClient should filter week evening activities for the bottom collection."
);
assert.match(
  tonightClient,
  /ActivityCollectionView[\s\S]*activities=\{visibleWeekEveningActivities\}[\s\S]*weatherById=\{weatherById\}/,
  "Bottom evening activity collection should use week activities and shared weather-aware cards."
);

console.log("Tonight evening day-picker contract passed.");
