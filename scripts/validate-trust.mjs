#!/usr/bin/env node
/**
 * Trust + UI validation against local or production API.
 * Usage: node scripts/validate-trust.mjs [baseUrl]
 * Default: http://localhost:3000
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

const LETTER_SPACED = /\b[A-Z](?:\s[A-Z]){3,}\b/;
const SUSPICIOUS_BLOCK = /9:00\s*AM\s*[–-]\s*9:00\s*PM/i;

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

function fail(check, detail) {
  return { check, pass: false, detail };
}

function pass(check, detail = "ok") {
  return { check, pass: true, detail };
}

async function validateTonight() {
  const data = await fetchJson("/api/tonight");
  const activities = data.activities ?? [];
  const ids = activities.map((a) => a.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) {
    return fail("Tonight duplicate IDs", `${dupes.length} duplicates`);
  }
  return pass("Tonight duplicate IDs", `${activities.length} activities, 0 dupes`);
}

async function validateExplore() {
  const data = await fetchJson("/api/activities?limit=150");
  const activities = data.activities ?? [];
  if (activities.length === 0) {
    return fail("Explore activities", "empty response");
  }
  let ocrTitles = 0;
  let fakeVerified = 0;
  let suspiciousWithoutBadge = 0;

  for (const a of activities) {
    const title = a.title ?? a.activity_name ?? "";
    if (LETTER_SPACED.test(title)) ocrTitles++;
    if (a.freshness?.badge === "verified" && a.displayQuality?.tier) {
      if (a.displayQuality.tier !== "high") fakeVerified++;
    }
    const timeLabel = a.scheduleText ?? a.startDateTime ?? "";
    if (SUSPICIOUS_BLOCK.test(timeLabel) && !a.timeUncertain) {
      suspiciousWithoutBadge++;
    }
  }

  if (ocrTitles) return fail("Explore OCR titles", `${ocrTitles} found`);
  if (fakeVerified) return fail("Unearned verified badges", `${fakeVerified} found`);
  if (suspiciousWithoutBadge) {
    return fail("Suspicious 9-9 time blocks", `${suspiciousWithoutBadge} without uncertainty`);
  }
  return pass("Explore trust scan", `${activities.length} activities clean`);
}

async function validateMovies() {
  const data = await fetchJson("/api/tonight");
  const movies = data.movieNights ?? [];
  let doubled = 0;
  for (const m of movies) {
    const title = (m.title ?? m.movieTitle ?? "").trim();
    const words = title.split(/\s+/);
    if (words.length >= 2 && words[0] === words[1]) doubled++;
  }
  if (doubled) return fail("Doubled movie titles", `${doubled} found`);
  return pass("Movie title dedupe", `${movies.length} checked`);
}

async function main() {
  console.log(`Validating ${BASE}\n`);
  const checks = [];

  for (const fn of [validateTonight, validateExplore, validateMovies]) {
    try {
      checks.push(await fn());
    } catch (err) {
      checks.push({
        check: fn.name,
        pass: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let failed = 0;
  for (const result of checks) {
    const icon = result.pass ? "✓" : "✗";
    console.log(`${icon} ${result.check}: ${result.detail}`);
    if (!result.pass) failed++;
  }

  console.log(`\n${checks.length - failed}/${checks.length} passed`);
  process.exit(failed ? 1 : 0);
}

main();
