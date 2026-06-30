import assert from "node:assert/strict";
import {
  EVENING_THRESHOLD_HOUR,
  LATE_THRESHOLD_HOUR,
  daypartFromHour,
  getDaypart,
  getTonightStart,
  isTonightWindow,
} from "@/lib/daypart";

assert.equal(EVENING_THRESHOLD_HOUR, 17);
assert.equal(LATE_THRESHOLD_HOUR, 21);

assert.equal(daypartFromHour(EVENING_THRESHOLD_HOUR - 1), "afternoon");
assert.equal(daypartFromHour(EVENING_THRESHOLD_HOUR), "evening");
assert.equal(daypartFromHour(LATE_THRESHOLD_HOUR - 1), "evening");
assert.equal(daypartFromHour(LATE_THRESHOLD_HOUR), "late");

assert.equal(getDaypart(new Date(2026, 5, 30, 16, 59)), "afternoon");
assert.equal(getDaypart(new Date(2026, 5, 30, 17, 0)), "evening");
assert.equal(getDaypart(new Date(2026, 5, 30, 21, 0)), "late");

assert.equal(isTonightWindow(new Date(2026, 5, 30, 16, 59)), false);
assert.equal(isTonightWindow(new Date(2026, 5, 30, 17, 0)), true);

const afternoonTonightStart = getTonightStart(new Date(2026, 5, 30, 16, 30));
assert.equal(afternoonTonightStart.getHours(), EVENING_THRESHOLD_HOUR);
assert.equal(afternoonTonightStart.getMinutes(), 0);

const eveningNow = new Date(2026, 5, 30, 19, 12);
assert.equal(getTonightStart(eveningNow), eveningNow);

console.log("Daypart threshold contract passed.");
