import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const siteGateForm = readFileSync("app/site-gate/SiteGateForm.tsx", "utf8");
assert.ok(
  !siteGateForm.includes("router.refresh("),
  "site gate login must not refresh the current gate route after setting the cookie"
);
assert.match(
  siteGateForm,
  /window\.location\.assign/,
  "site gate login should use a document navigation after the cookie is set"
);

const trustValidator = readFileSync("scripts/validate-trust.mjs", "utf8");
assert.match(
  trustValidator,
  /function\s+loadLocalEnvIfPresent\(\)/,
  "trust validator should load local env for gated preview validation"
);
assert.match(
  trustValidator,
  /resolve\(process\.cwd\(\),\s*"\.env\.local"\)/,
  "trust validator should look for .env.local in the project root"
);
assert.match(
  trustValidator,
  /if\s*\(\s*process\.env\[key\]\s*!=\s*null\s*\)\s*continue/,
  "trust validator must not override explicitly provided env vars"
);
assert.ok(
  trustValidator.indexOf("loadLocalEnvIfPresent();") <
    trustValidator.indexOf("const SITE_GATE_PASSWORD"),
  "trust validator should load env before reading site gate credentials"
);
assert.match(
  trustValidator,
  /SHA256_HEX/,
  "HTTP trust validator must reject malformed mapped source hashes"
);
assert.match(
  trustValidator,
  /function\s+hasUsableProvenance/,
  "HTTP trust validator must reject empty mapped provenance placeholders"
);
assert.match(
  trustValidator,
  /function\s+hasValidDocumentKeyLegends/,
  "HTTP trust validator must reject malformed document key legend payloads"
);
assert.match(
  trustValidator,
  /hasUsableSourceHash\(a\.source\?\.documentHash\)/,
  "HTTP trust validator must require usable activity source hashes"
);
assert.match(
  trustValidator,
  /hasUsableSourceHash\(offering\.source\?\.documentHash\)/,
  "HTTP trust validator must require usable official offering source hashes"
);
assert.match(
  trustValidator,
  /function\s+placeholderOfferingAvailability/,
  "HTTP trust validator must reject placeholder availability labels on public official offerings"
);
assert.match(
  trustValidator,
  /Search placeholder suppression/,
  "HTTP trust validator must reject placeholder availability text in search output"
);

const dbTrustValidator = readFileSync("scripts/validate-db-trust.mjs", "utf8");
assert.match(
  dbTrustValidator,
  /function\s+loadLocalEnvIfPresent\(\)/,
  "DB trust validator should load local env for live Supabase verification"
);
assert.match(
  dbTrustValidator,
  /v_public_activity_gold/,
  "DB trust validator must audit the public Gold view"
);
assert.match(
  dbTrustValidator,
  /v_public_activity_offerings/,
  "DB trust validator must audit the public official offerings view"
);
assert.match(
  dbTrustValidator,
  /\["title",\s*"schedule",\s*"location"\]/,
  "DB trust validator must require Gold title, schedule, and location provenance"
);
assert.match(
  dbTrustValidator,
  /\["title",\s*"resort_join"\]/,
  "DB trust validator must require official offering title and resort-join provenance"
);
assert.match(
  dbTrustValidator,
  /Wellnessscav/,
  "DB trust validator must scan for known title contamination fragments"
);
assert.match(
  dbTrustValidator,
  /check_official_activity_offerings_health/,
  "DB trust validator must call official offering health checks"
);
assert.match(
  dbTrustValidator,
  /SHA256_HEX/,
  "DB trust validator must reject malformed source hashes"
);
assert.match(
  dbTrustValidator,
  /hasUsableProvenance/,
  "DB trust validator must reject empty provenance placeholders"
);
assert.match(
  dbTrustValidator,
  /hasValidStructuredGoldSource/,
  "DB trust validator must validate structured Gold source evidence when present"
);
assert.match(
  dbTrustValidator,
  /documentKeyLegends/,
  "DB trust validator must validate Gold document key legend shape when present"
);
assert.match(
  dbTrustValidator,
  /auditGoldSourceLegendParity/,
  "DB trust validator must compare expected Gold key legends to live public rows"
);
assert.match(
  dbTrustValidator,
  /activity_gold_v2_preview\.json/,
  "DB trust validator must load the processed Gold artifact for source evidence parity"
);
assert.match(
  dbTrustValidator,
  /fileURLToPath\(import\.meta\.url\)/,
  "DB trust validator imports must not execute the live Supabase audit"
);

const packageJson = readFileSync("package.json", "utf8");
assert.match(
  packageJson,
  /"validate:db-trust":\s*"node scripts\/validate-db-trust\.mjs"/,
  "package scripts should expose the live DB trust audit"
);
assert.match(
  packageJson,
  /node scripts\/test-db-trust\.mjs/,
  "contract validation should exercise DB trust audit helper behavior"
);

const publicDataCache = readFileSync("lib/cache/publicData.ts", "utf8");
assert.match(
  publicDataCache,
  /import\s+\{\s*unstable_cache\s*\}\s+from\s+"next\/cache"/,
  "public data cache helper should use Next cache for short cross-request reuse"
);
assert.match(
  publicDataCache,
  /PUBLIC_DATA_REVALIDATE_SECONDS\s*=\s*60/,
  "public catalogue data should revalidate quickly"
);
assert.match(
  publicDataCache,
  /incrementalCache missing/,
  "public data cache helper should fall back for non-Next script contexts"
);

const goldActivities = readFileSync("lib/data/goldActivities.ts", "utf8");
assert.match(
  goldActivities,
  /import\s+\{\s*cache\s*\}\s+from\s+"react"/,
  "gold activity data should use React.cache for request-level dedupe"
);
assert.match(
  goldActivities,
  /cachePublicData/,
  "gold activity data should use the public data cache helper"
);
assert.match(
  goldActivities,
  /fetchGoldActivityRows\s*=\s*cache\(/,
  "raw gold activity rows should be cached per request"
);
assert.match(
  goldActivities,
  /fetchResortMeta\s*=\s*cache\(/,
  "gold resort metadata should be cached per request"
);

const activities = readFileSync("lib/data/activities.ts", "utf8");
assert.match(
  activities,
  /import\s+\{\s*cache\s*\}\s+from\s+"react"/,
  "activity data should use React.cache for repeated public catalogue reads"
);
assert.match(
  activities,
  /cachePublicData/,
  "activity data should use the public data cache helper"
);
assert.match(
  activities,
  /export const getResorts\s*=\s*cache\(/,
  "resort summaries should be cached per request"
);
assert.match(
  activities,
  /export const getMovieNights\s*=\s*cache\(/,
  "movie nights should be cached per request"
);
assert.doesNotMatch(
  activities,
  /legacyCounts/,
  "resort summaries must not fall back to legacy temporal activity counts"
);
assert.doesNotMatch(
  activities,
  /\.from\("movie_nights"\)/,
  "movie title listings must not read legacy movie_nights rows"
);
assert.match(
  activities,
  /ALLOW_LEGACY_ACTIVITY_UI_PIPELINE/,
  "legacy temporal UI reads should require an explicit operator opt-in"
);

const warmMoviePosters = readFileSync("scripts/warm-movie-posters.ts", "utf8");
assert.match(
  warmMoviePosters,
  /legacy_movie_poster_warm_disabled/,
  "legacy movie poster warming must be explicitly guarded"
);
assert.match(
  warmMoviePosters,
  /ALLOW_LEGACY_ACTIVITY_UI_PIPELINE/,
  "legacy movie poster warming should share the legacy UI unlock"
);

const officialOfferings = readFileSync("lib/data/officialOfferings.ts", "utf8");
assert.match(
  officialOfferings,
  /export const fetchOfficialActivityOfferings\s*=\s*cache\(/,
  "official activity offerings should be cached per request"
);
assert.match(
  officialOfferings,
  /cachePublicData/,
  "official offerings should use the public data cache helper"
);

const rootLayout = readFileSync("app/layout.tsx", "utf8");
assert.match(
  rootLayout,
  /data-scroll-behavior="smooth"/,
  "root html should declare smooth scrolling for Next route transitions"
);

const nextConfig = readFileSync("next.config.ts", "utf8");
assert.match(
  nextConfig,
  /SITE_VISIBILITY_MODE/,
  "service worker generation should account for private site visibility"
);
assert.match(
  nextConfig,
  /disable:\s*!serviceWorkerEnabled/,
  "service worker should only be enabled when explicitly allowed"
);

const serviceWorkerRoute = readFileSync("app/sw.js/route.ts", "utf8");
assert.match(
  serviceWorkerRoute,
  /registration\.unregister/,
  "private fallback service worker should unregister stale workers"
);
assert.match(
  serviceWorkerRoute,
  /caches\.keys/,
  "private fallback service worker should clear stale runtime caches"
);
assert.match(
  serviceWorkerRoute,
  /no-store/,
  "private fallback service worker should not be cached"
);
