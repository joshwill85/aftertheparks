#!/usr/bin/env node
/**
 * Trust + UI validation against local or production API.
 * Usage: node scripts/validate-trust.mjs [baseUrl]
 * Default: http://localhost:3000
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

const LETTER_SPACED = /\b[A-Z](?:\s[A-Z]){3,}\b/;
const KNOWN_TITLE_BREAKS = /Wellnessscav|Engerhunt/i;
const SUSPICIOUS_BLOCK = /9:00\s*AM\s*[–-]\s*9:00\s*PM/i;
const REQUIRED_PROVENANCE_FIELDS = ["title", "schedule", "location"];

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

function isCamelCaseSmash(title) {
  return title
    .split(/\s+/)
    .some((token) => token.length >= 8 && (/[a-z][A-Z]/.test(token) || /^[A-Z][a-z]+[A-Z]/.test(token)));
}

function hasEvidence(claim) {
  return Array.isArray(claim?.evidence) && claim.evidence.length > 0;
}

function isUnknownClaim(claim) {
  const value = String(claim?.value ?? "").trim().toLowerCase();
  return !value || value === "unknown" || value === "not_applicable";
}

function missingProvenanceFields(activity) {
  const provenance = activity.fieldProvenance ?? {};
  const missing = REQUIRED_PROVENANCE_FIELDS.filter((field) => {
    const spans = provenance[field];
    return !Array.isArray(spans) || spans.length === 0;
  });

  if ((activity.summary ?? "").trim()) {
    const spans = provenance.description;
    if (!Array.isArray(spans) || spans.length === 0) missing.push("description");
  }

  return missing;
}

function unsupportedClaims(activity) {
  return Object.entries(activity.claims ?? {})
    .filter(([, claim]) => !isUnknownClaim(claim) && !hasEvidence(claim))
    .map(([kind]) => kind);
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
  let brokenTitles = 0;
  let camelCaseTitles = 0;
  let fakeVerified = 0;
  let suspiciousWithoutBadge = 0;
  let missingSource = 0;
  let missingProvenance = 0;
  let unsupportedClaimCount = 0;

  for (const a of activities) {
    const title = a.title ?? a.activity_name ?? "";
    if (LETTER_SPACED.test(title)) ocrTitles++;
    if (KNOWN_TITLE_BREAKS.test(title)) brokenTitles++;
    if (isCamelCaseSmash(title)) camelCaseTitles++;
    if (a.freshness?.badge === "verified" && a.displayQuality?.tier) {
      if (a.displayQuality.tier !== "high") fakeVerified++;
    }
    const timeLabel = a.scheduleText ?? a.startDateTime ?? "";
    if (SUSPICIOUS_BLOCK.test(timeLabel) && !a.timeUncertain) {
      suspiciousWithoutBadge++;
    }
    if (!a.source?.url || !a.source?.documentHash) {
      missingSource++;
    }
    if (missingProvenanceFields(a).length) {
      missingProvenance++;
    }
    if (unsupportedClaims(a).length) {
      unsupportedClaimCount++;
    }
  }

  if (ocrTitles) return fail("Explore OCR titles", `${ocrTitles} found`);
  if (brokenTitles) return fail("Known broken title fragments", `${brokenTitles} found`);
  if (camelCaseTitles) return fail("Camel-case smashed titles", `${camelCaseTitles} found`);
  if (fakeVerified) return fail("Unearned verified badges", `${fakeVerified} found`);
  if (suspiciousWithoutBadge) {
    return fail("Suspicious 9-9 time blocks", `${suspiciousWithoutBadge} without uncertainty`);
  }
  if (missingSource) return fail("Source evidence", `${missingSource} missing source URL/hash`);
  if (missingProvenance) {
    return fail("Field provenance", `${missingProvenance} missing source spans`);
  }
  if (unsupportedClaimCount) {
    return fail("Unsupported claims", `${unsupportedClaimCount} activities have claims without evidence`);
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

async function validateWellnessDetail() {
  const data = await fetchJson("/api/activities/wellness-scavenger-hunt");
  const activity = data.activity ?? {};
  const summary = activity.summary ?? "";
  const schedule = activity.scheduleText ?? "";

  if (activity.activitySlug !== "wellness-scavenger-hunt") {
    return fail("Wellness canonical slug", activity.activitySlug || "<missing>");
  }
  if (activity.title !== "Wellness Scavenger Hunt") {
    return fail("Wellness title", activity.title || "<missing>");
  }
  if (!activity.endDateTime || activity.endDateTime === activity.startDateTime) {
    return fail("Wellness end time", "missing or collapsed endDateTime");
  }
  if (!/11:00\s*pm/i.test(schedule)) {
    return fail("Wellness schedule", schedule || "<missing>");
  }
  if (!/Pick up a map/i.test(summary) || !/any merchandise location/i.test(summary)) {
    return fail("Wellness source description", summary.slice(0, 160) || "<missing>");
  }
  if (KNOWN_TITLE_BREAKS.test(`${activity.title} ${activity.activitySlug} ${summary}`)) {
    return fail("Wellness broken fragments", "legacy title fragments still present");
  }
  if (!activity.source?.url || !activity.source?.documentHash) {
    return fail("Wellness source evidence", "missing source URL/hash");
  }
  const missingProvenance = missingProvenanceFields(activity);
  if (missingProvenance.length) {
    return fail("Wellness field provenance", missingProvenance.join(", "));
  }
  const claims = unsupportedClaims(activity);
  if (claims.length) {
    return fail("Wellness unsupported claims", claims.join(", "));
  }
  return pass("Wellness detail fidelity", "title, slug, range, description, and provenance clean");
}

async function validateLegacyWellnessRedirect() {
  const res = await fetch(`${BASE}/activities/wellnessscav-engerhunt`, {
    redirect: "manual",
  });
  const location = res.headers.get("location") ?? "";
  if (![307, 308].includes(res.status)) {
    return fail("Legacy Wellness URL redirect", `expected 307/308, got ${res.status}`);
  }
  if (!location.includes("/activities/wellness-scavenger-hunt")) {
    return fail("Legacy Wellness URL redirect", location || "<missing location>");
  }
  return pass("Legacy Wellness URL redirect", location);
}

async function main() {
  console.log(`Validating ${BASE}\n`);
  const checks = [];

  for (const fn of [
    validateTonight,
    validateExplore,
    validateMovies,
    validateWellnessDetail,
    validateLegacyWellnessRedirect,
  ]) {
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
