import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import conditions from "@/data/weather/weatherapi-conditions.json";
import { weatherApiToAtpIconMap } from "@/lib/weather/icons";

for (const condition of conditions as Array<{ code: number }>) {
  const item = weatherApiToAtpIconMap[condition.code];
  assert.ok(item, `Missing WeatherAPI mapping for ${condition.code}`);
  assert.equal(item.code, condition.code);
  assert.ok(item.afterTheParksDayIcon, `${condition.code} missing day icon`);
  assert.ok(item.afterTheParksNightIcon, `${condition.code} missing night icon`);
  assert.ok(item.altText, `${condition.code} missing alt text`);
  assert.ok(item.ariaLabel, `${condition.code} missing aria label`);
  assert.ok(
    existsSync(`public/weather-icons/${item.afterTheParksDayIcon}.svg`),
    `${item.afterTheParksDayIcon} SVG missing`
  );
  assert.ok(
    existsSync(`public/weather-icons/${item.afterTheParksNightIcon}.svg`),
    `${item.afterTheParksNightIcon} SVG missing`
  );
}

console.log("Weather condition icon map coverage passed.");
