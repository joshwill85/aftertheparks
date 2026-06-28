import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const resortPage = read("app/resorts/[slug]/page.tsx");
const homePage = read("app/page.tsx");
const tonightClient = read("components/atlas/TonightClient.tsx");
const browseParams = read("lib/explore/browseParams.ts");
const resultSummary = read("components/explore/ResultSummary.tsx");
const activitySort = read("lib/activities/sort.ts");
const searchClient = read("components/atlas/SearchClient.tsx");
const calendarPage = read("app/calendar/page.tsx");
const calendarClient = read("components/atlas/CalendarClient.tsx");

assert.doesNotMatch(
  resortPage,
  /todayActivities\.slice|tonightActivities\.slice|freeActivities\.slice|categoryGroups\.slice|<ResortCategorySections/,
  "Resort detail pages should not repeat the same scheduled records through Today, Tonight, Free, category, and full-schedule preview blocks."
);

assert.match(
  resortPage,
  /ActivityCollectionView/,
  "Resort detail pages should present scheduled records through one view/sort explorer."
);

assert.match(
  resortPage,
  /defaultView="cards"/,
  "Resort detail pages should default to consolidated activity cards instead of repeating every day-by-day occurrence."
);

assert.doesNotMatch(
  homePage,
  /ActivityGrid activities=\{freeActivities\}|ActivityGrid activities=\{littleKidActivities\}/,
  "Home should not render separate overlapping free and little-kid activity grids."
);

assert.match(
  homePage,
  /popularActivities|Easy resort activities|ActivityCollectionView/,
  "Home should combine curated activity previews into one browsable activity collection."
);

assert.doesNotMatch(
  tonightClient,
  /id="campfires"|id="after-dinner"|id="low-energy"|id="games-and-crafts"|id="tomorrow-preview"/,
  "Tonight should not repeat the same evening activities across overlapping editorial card sections."
);

assert.match(
  tonightClient,
  /id="evening-activities"|ActivityCollectionView/,
  "Tonight should expose one evening activity collection with view and sort controls."
);

for (const sortKey of ["alpha", "free", "paid"] as const) {
  assert.match(
    browseParams,
    new RegExp(`"${sortKey}"`),
    `Browse params should accept ${sortKey} sorting.`
  );
  assert.match(
    activitySort,
    new RegExp(`case "${sortKey}"`),
    `Activity sorting should implement ${sortKey}.`
  );
}

for (const label of ["Alphabetical", "Free first", "Paid first"] as const) {
  assert.match(
    resultSummary,
    new RegExp(label),
    `Browse result sort UI should expose ${label}.`
  );
}

assert.match(
  searchClient,
  /duplicateHitIds|topHitIds|excludeTopHitIds/,
  "Search results should exclude best-match items from lower typed sections instead of showing the same record twice."
);

assert.match(
  calendarPage,
  /searchParams/,
  "Calendar page should preserve resort/category context from links like /calendar?resort=..."
);

assert.match(
  calendarClient,
  /initialResort/,
  "Calendar client should initialize filters from page query params."
);

assert.match(
  read("components/atlas/ActivityCollectionView.tsx"),
  /Cards|By day|By category/,
  "Activity collection view should let users switch between cards, day, and category views."
);

const activityCollectionView = read("components/atlas/ActivityCollectionView.tsx");

for (const contract of ["uniqueExperiences", "uniqueOccurrences", "experienceKey"] as const) {
  assert.match(
    activityCollectionView,
    new RegExp(contract),
    `Activity collection view should keep ${contract} logic so consolidated cards do not erase the full day-by-day schedule.`
  );
}

assert.match(
  activityCollectionView,
  /if \(!existing\.startDateTime && activity\.startDateTime\)[\s\S]+byExperience\.set\(key, activity\)/,
  "Consolidated cards should replace untimed duplicates with the matching timed session."
);
assert.doesNotMatch(
  activityCollectionView,
  /if \(!activity\.startDateTime \|\| activity\.startDateTime < existing\.startDateTime\)/,
  "Consolidated cards should not let untimed generic rows replace real timed occurrences."
);

console.log("Redundancy and view-control coverage passed.");
