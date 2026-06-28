import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { WeatherIconKey } from "@/lib/weather/types";

const iconKeys: WeatherIconKey[] = [
  "sunny_day",
  "clear_night",
  "partly_cloudy_day",
  "partly_cloudy_night",
  "cloudy",
  "overcast",
  "mist",
  "fog",
  "haze",
  "smoke",
  "dust",
  "patchy_rain",
  "light_rain",
  "moderate_rain",
  "heavy_rain",
  "rain_shower",
  "torrential_rain",
  "drizzle",
  "freezing_drizzle",
  "freezing_rain",
  "thunder_possible",
  "rain_with_thunder",
  "snow",
  "sleet",
  "ice_pellets",
  "wind",
  "heat",
  "official_alert",
  "unknown",
];

function shapeTokens(svg: string): string[] {
  const withoutMetadata = svg
    .replace(/<title>[\s\S]*?<\/title>/g, "")
    .replace(/<desc>[\s\S]*?<\/desc>/g, "")
    .replace(/<style>[\s\S]*?<\/style>/g, "")
    .replace(/<defs>[\s\S]*?<\/defs>/g, "");
  const matches =
    withoutMetadata.match(
      /<(path|circle|ellipse|polygon|polyline|line|rect)\b[^>]*>/g
    ) ?? [];
  return matches
    .map((token) =>
      token
        .replace(/\s(id|class|aria-label|role)="[^"]*"/g, "")
        .replace(/\s(fill|stroke|stop-color)="[^"]*"/g, "")
        .replace(/\sopacity="[^"]*"/g, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((token) => !/^<rect width="64" height="64"/.test(token))
    .sort();
}

function similarity(a: string[], b: string[]): number {
  const left = new Set(a);
  const right = new Set(b);
  const union = new Set([...left, ...right]);
  const shared = [...left].filter((token) => right.has(token)).length;
  return union.size === 0 ? 1 : shared / union.size;
}

const signatures = new Map<string, string>();
const tokenSets = new Map<string, string[]>();

for (const key of iconKeys) {
  const file = `public/weather-icons/${key}.svg`;
  assert.ok(existsSync(file), `${key} icon file is missing`);
  const svg = readFileSync(file, "utf8");
  assert.doesNotMatch(svg, /currentColor/, `${key} must not be a monochrome placeholder`);
  assert.match(svg, /<desc>After the Parks storybook weather icon/, `${key} is missing source description`);
  assert.match(svg, /prefers-reduced-motion/, `${key} should include reduced-motion-safe animation styles`);

  const tokens = shapeTokens(svg);
  assert.ok(tokens.length >= 5, `${key} should have enough geometry to be a real icon`);
  const hash = createHash("sha256").update(tokens.join("\n")).digest("hex");
  assert.ok(!signatures.has(hash), `${key} duplicates ${signatures.get(hash)} geometry`);
  signatures.set(hash, key);
  tokenSets.set(key, tokens);
}

for (let i = 0; i < iconKeys.length; i++) {
  for (let j = i + 1; j < iconKeys.length; j++) {
    const a = iconKeys[i];
    const b = iconKeys[j];
    const score = similarity(tokenSets.get(a) ?? [], tokenSets.get(b) ?? []);
    assert.ok(
      score < 0.82,
      `${a} and ${b} are too geometrically similar (${score.toFixed(2)})`
    );
  }
}

console.log("Weather icon distinctness passed.");
