import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  homeSectionOrderForDaypart,
  isAfterDarkHomeDaypart,
} from "@/lib/home/daypartPriority";

assert.equal(isAfterDarkHomeDaypart("morning"), false);
assert.equal(isAfterDarkHomeDaypart("afternoon"), false);
assert.equal(isAfterDarkHomeDaypart("evening"), true);
assert.equal(isAfterDarkHomeDaypart("late"), true);

assert.deepEqual(homeSectionOrderForDaypart("afternoon", true).slice(0, 4), [
  "answer",
  "freshness",
  "intent",
  "tonight",
]);

assert.deepEqual(homeSectionOrderForDaypart("evening", true).slice(0, 4), [
  "tonight",
  "answer",
  "freshness",
  "intent",
]);

assert.ok(
  !homeSectionOrderForDaypart("late", false).includes("tonight"),
  "Home should not render an empty Tonight priority section"
);

const homePage = readFileSync("app/page.tsx", "utf8");
assert.match(
  homePage,
  /homeSectionOrderForDaypart/,
  "Home should use the server-rendered daypart section order"
);
assert.match(
  homePage,
  /getDaypart\(getNowInOrlando\(\)\)/,
  "Home should derive after-dark priority from the stable Orlando daypart source"
);

console.log("Home daypart priority contract passed.");
