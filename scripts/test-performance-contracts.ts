import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function assertNoForceDynamic(path: string) {
  const source = read(path);
  assert.doesNotMatch(
    source,
    /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/,
    `${path} should not force per-request SSR for anonymous public traffic`
  );
}

function assertRevalidate(path: string, seconds: number) {
  const source = read(path);
  assert.match(
    source,
    new RegExp(`export\\s+const\\s+revalidate\\s*=\\s*${seconds}\\b`),
    `${path} should use ISR revalidate=${seconds}`
  );
}

function assertForceDynamic(path: string) {
  const source = read(path);
  assert.match(
    source,
    /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/,
    `${path} should stay dynamic/private`
  );
}

const trustValidator = read("scripts/validate-trust.mjs");
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

const dbTrustValidator = read("scripts/validate-db-trust.mjs");
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

const packageJson = read("package.json");
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

const publicDataCache = read("lib/cache/publicData.ts");
assert.match(
  publicDataCache,
  /import\s+\{\s*unstable_cache\s*\}\s+from\s+"next\/cache"/,
  "public data cache helper should use Next cache for short cross-request reuse"
);
assert.match(
  publicDataCache,
  /PUBLIC_DATA_REVALIDATE_SECONDS\s*=\s*CACHE_SECONDS\.evergreen/,
  "public catalogue data should use the shared evergreen cache policy"
);
assert.match(
  publicDataCache,
  /PUBLIC_CACHE_TAGS\.catalogue/,
  "public catalogue data should be tagged for publish-time invalidation"
);
assert.match(
  publicDataCache,
  /incrementalCache missing/,
  "public data cache helper should fall back for non-Next script contexts"
);

const goldActivities = read("lib/data/goldActivities.ts");
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

const activities = read("lib/data/activities.ts");
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

const warmMoviePosters = read("scripts/warm-movie-posters.ts");
assert.match(
  warmMoviePosters,
  /legacy_movie_poster_warm_disabled/,
  "legacy movie poster warming must be explicitly guarded"
);

const cacheHttp = read("lib/cache/http.ts");
assert.match(
  cacheHttp,
  /Vercel-CDN-Cache-Control/,
  "public API cache helper should emit Vercel CDN cache headers"
);
assert.match(
  cacheHttp,
  /CDN-Cache-Control/,
  "public API cache helper should emit standard CDN cache headers"
);
assert.match(
  cacheHttp,
  /private,\s*no-store/,
  "cache helper should expose an explicit private no-store policy"
);

const cacheTags = read("lib/cache/tags.ts");
assert.match(
  cacheTags,
  /catalogue:\s*"public-activity-data"/,
  "public cache tags should include the catalogue tag"
);
assert.match(
  cacheTags,
  /weather:\s*"public-weather-data"/,
  "public cache tags should include the weather tag"
);
assert.match(
  cacheTags,
  /seo:\s*"public-seo-data"/,
  "public cache tags should include the SEO tag"
);

const evergreenPublicRoutes = [
  "app/activities/page.tsx",
  "app/activities/[slug]/page.tsx",
  "app/resorts/page.tsx",
  "app/resorts/[slug]/page.tsx",
  "app/disney-world-resort-activity-calendars/page.tsx",
  "app/disney-world-resort-activity-calendars/[season]/page.tsx",
  "app/guides/[slug]/page.tsx",
  "app/sitemap.ts",
  "app/robots.ts",
  "app/llms.txt/route.ts",
  "app/llms-full.txt/route.ts",
];

for (const route of evergreenPublicRoutes) {
  assertNoForceDynamic(route);
  assertRevalidate(route, 86400);
}

const timeRelativePublicRoutes = [
  "app/page.tsx",
  "app/today/page.tsx",
  "app/tonight/page.tsx",
  "app/calendar/page.tsx",
];

for (const route of timeRelativePublicRoutes) {
  assertNoForceDynamic(route);
  assertRevalidate(route, 900);
}

assertNoForceDynamic("app/weather/page.tsx");
assertRevalidate("app/weather/page.tsx", 60);

const privateRoutes = [
  "app/plan/page.tsx",
  "app/plan/[shareId]/page.tsx",
  "app/p/[shareToken]/page.tsx",
  "app/api/plan/route.ts",
  "app/api/plan/share/route.ts",
  "app/api/cron/weather-warm/route.ts",
];

for (const route of privateRoutes) {
  assertForceDynamic(route);
}

const publicApiRoutes = [
  ["app/api/activities/route.ts", "publicCacheJson", "evergreen"],
  ["app/api/activities/[slug]/route.ts", "publicCacheJson", "evergreen"],
  ["app/api/resorts/route.ts", "publicCacheJson", "evergreen"],
  ["app/api/resorts/[slug]/route.ts", "publicCacheJson", "evergreen"],
  ["app/api/today/route.ts", "publicCacheJson", "timeRelative"],
  ["app/api/tonight/route.ts", "publicCacheJson", "timeRelative"],
  ["app/api/search/suggest/route.ts", "publicCacheJson", "timeRelative"],
  ["app/api/weather/guidance/route.ts", "publicCacheJson", "weather"],
] as const;

for (const [route, helper, policy] of publicApiRoutes) {
  const source = read(route);
  assert.match(source, new RegExp(`\\b${helper}\\b`), `${route} should use ${helper}`);
  assert.match(source, new RegExp(`["']${policy}["']`), `${route} should use ${policy} cache policy`);
}

const revalidateRoutePath = "app/api/revalidate/route.ts";
assert.ok(
  existsSync(revalidateRoutePath),
  "protected public cache revalidation route should exist"
);
const revalidateRoute = read(revalidateRoutePath);
assert.match(
  revalidateRoute,
  /CACHE_REVALIDATION_SECRET/,
  "revalidation route should require a dedicated secret"
);
assert.match(
  revalidateRoute,
  /isPublicCacheTagName/,
  "revalidation route should reject tags outside the fixed public tag enum"
);
assert.match(
  revalidateRoute,
  /revalidateTag\(/,
  "revalidation route should invalidate cache tags"
);

const layout = read("app/layout.tsx");
assert.doesNotMatch(
  layout,
  /PlanProvider/,
  "root layout should not mount the plan provider for every public page"
);

const daypartShell = read("components/atlas/DaypartShell.tsx");
assert.doesNotMatch(
  daypartShell,
  /PlanPreview|Fireflies|FirstVisitWelcome/,
  "global daypart shell should not mount planning preview or decorative first-visit UI"
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
  /process\.env\.NODE_ENV\s*===\s*"production"/,
  "service worker generation should only run for production builds"
);
assert.match(
  nextConfig,
  /disable:\s*!serviceWorkerEnabled/,
  "service worker should only be enabled when explicitly allowed"
);
