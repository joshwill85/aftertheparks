import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assertFile(relativePath: string) {
  assert.ok(existsSync(path.join(root, relativePath)), `Missing ${relativePath}`);
}

const REQUIRED_PUBLIC_ASSETS = [
  "public/brand/atp-pocket-map-horizontal-lockup-outlined.svg",
  "public/brand/atp-pocket-map-primary-lockup-outlined.svg",
  "public/brand/atp-pocket-map-dark-lockup-outlined.svg",
  "public/brand/atp-pocket-map-only-outlined.svg",
  "public/brand/atp-guide-companion-only.svg",
  "public/brand/atp-three-waypoint-motif.svg",
  "public/brand/atp-pocket-map-app-icon-512.png",
  "public/brand/atp-pocket-map-app-icon-1024.png",
  "public/brand/apple-touch-icon-180.png",
  "public/favicon.ico",
  "public/favicon.svg",
] as const;

for (const asset of REQUIRED_PUBLIC_ASSETS) {
  assertFile(asset);
}

for (const asset of REQUIRED_PUBLIC_ASSETS.filter((file) =>
  file.endsWith("-outlined.svg")
)) {
  assert.doesNotMatch(
    read(asset),
    /<text\b/,
    `${asset} should be production-safe with text converted to paths`
  );
}

const manifest = read("app/manifest.ts");
assert.match(manifest, /\/brand\/atp-pocket-map-app-icon-512\.png/);
assert.match(manifest, /\/brand\/atp-pocket-map-app-icon-1024\.png/);
assert.match(manifest, /\/brand\/apple-touch-icon-180\.png/);
assert.doesNotMatch(manifest, /src:\s*"\/icon"/, "manifest should not use the AP generated icon route");

const layout = read("app/layout.tsx");
assert.match(layout, /icons:/, "root metadata should define favicon/icon links");
assert.match(layout, /\/favicon\.svg/, "root metadata should reference the SVG favicon");
assert.match(layout, /\/favicon\.ico/, "root metadata should reference the ICO favicon");
assert.match(layout, /\/brand\/apple-touch-icon-180\.png/, "root metadata should reference apple touch icon");

const header = read("components/layout/SiteHeader.tsx");
assert.match(header, /BrandMark/, "site header should use the shared BrandMark component");
assert.match(header, /variant="header"/, "site header should use the compact header mark");
assert.match(header, /Independent Guide/, "site header should preserve the independent guide badge");

const footer = read("components/layout/SiteFooter.tsx");
assert.match(footer, /BrandMark/, "site footer should include brand lockup");
assert.match(footer, /BrandMotif/, "site footer should include route motif");
assert.match(footer, /not affiliated\s+with Disney/, "site footer should preserve the independent disclaimer");

const ogRoute = read("app/api/og/route.tsx");
assert.match(ogRoute, /afterTheParksWordmark/, "OG route should include a brand wordmark treatment");
assert.match(ogRoute, /pocketMapMotif/, "OG route should include a pocket-map motif treatment");

const emptyState = read("components/atlas/EmptyState.tsx");
assert.match(emptyState, /BrandAsset/, "generic empty state should use a brand asset");
assert.match(emptyState, /guide-companion/, "generic empty state should use the guide companion");

const planEmpty = read("components/plan/PlanEmptyState.tsx");
assert.match(planEmpty, /BrandAsset/, "plan empty state should use a brand asset");
assert.match(planEmpty, /pocket-map-only/, "plan empty state should use the map-only mark");

const resortEmpty = read("components/resort/ResortEmptyState.tsx");
assert.match(resortEmpty, /BrandAsset/, "resort empty state should use a brand asset");

const nightEmpty = read("components/tonight/NightEmptyState.tsx");
assert.match(nightEmpty, /BrandAsset/, "night empty state should use a brand asset");
assert.match(nightEmpty, /guide-companion/, "night empty state should use the guide companion");

const planPage = read("app/plan/page.tsx");
assert.match(planPage, /BrandAsset/, "plan page should include pocket-map brand context");
assert.match(planPage, /pocket-map-only/, "plan page should include the map-only asset");

const tonightPage = read("app/tonight/page.tsx");
assert.match(tonightPage, /BrandAsset/, "tonight page should include dark brand feature art");
assert.match(tonightPage, /dark-lockup/, "tonight page should use the dark lockup");

const aboutPage = read("app/about/page.tsx");
assert.match(aboutPage, /BrandMark/, "about page should include the primary brand lockup");
assert.match(aboutPage, /variant="primary"/, "about page should use the primary lockup");

const guidesPage = read("app/guides/page.tsx");
assert.match(guidesPage, /BrandMotif/, "guides page should use the route motif");

const calendarPage = read("app/calendar/page.tsx");
assert.match(calendarPage, /BrandAsset/, "calendar page should include map metaphor art");
assert.match(calendarPage, /pocket-map-only/, "calendar page should use the map-only mark");

const strategy = read("docs/brand-asset-usage-strategy.md");
assert.match(strategy, /Recommended Public Asset Set/, "strategy doc should remain the integration source");

console.log("Brand asset integration coverage passed.");
