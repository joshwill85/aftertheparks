import assert from "node:assert/strict";
import type { WeatherAlert } from "@/lib/weather/types";
import {
  dedupeAlertsByProviderAlertId,
  filterActiveAlerts,
  isStale,
} from "@/lib/weather/cache";

function alert(id: string, effective: string, expires: string): WeatherAlert {
  return {
    provider: "nws",
    id,
    event: "Special Weather Statement",
    headline: id,
    severity: "Minor",
    urgency: "Expected",
    certainty: "Possible",
    effective,
    expires,
  };
}

const now = new Date("2026-06-27T16:00:00Z");
const active = alert("active", "2026-06-27T15:00:00Z", "2026-06-27T17:00:00Z");
const expired = alert("expired", "2026-06-27T12:00:00Z", "2026-06-27T15:59:59Z");
const future = alert("future", "2026-06-27T16:00:01Z", "2026-06-27T18:00:00Z");

assert.deepEqual(filterActiveAlerts([active, expired, future], now), [active]);
assert.equal(
  isStale("2026-06-27T15:00:00Z", "2026-06-27T15:59:59Z", now),
  true
);
assert.equal(
  isStale("2026-06-27T15:00:00Z", "2026-06-27T16:30:00Z", now),
  false
);

const deduped = dedupeAlertsByProviderAlertId([
  { status: "fulfilled", value: [active, expired] },
  { status: "rejected", reason: new Error("provider down") },
  { status: "fulfilled", value: [alert("active", active.effective, active.expires)] },
]);
assert.equal(deduped.length, 2);
assert.equal(deduped.filter((item) => item.id === "active").length, 1);

console.log("weather alert expiry contract passed");
