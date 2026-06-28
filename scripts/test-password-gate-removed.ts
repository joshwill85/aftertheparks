import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const removedPaths = [
  "app/site-gate/page.tsx",
  "app/site-gate/SiteGateForm.tsx",
  "app/api/site-gate-login/route.ts",
  "lib/site-gate/config.ts",
  "lib/site-gate/middleware.ts",
  "lib/site-gate/paths.ts",
  "lib/site-gate/token.ts",
  "app/sw.js/route.ts",
  "scripts/setup-site-gate-env-push.sh",
];

for (const path of removedPaths) {
  assert.equal(existsSync(path), false, `${path} should be removed`);
}

for (const path of [
  "middleware.ts",
  "next.config.ts",
  "app/robots.ts",
  "app/sitemap.ts",
  "app/llms.txt/route.ts",
  "app/llms-full.txt/route.ts",
]) {
  const source = readFileSync(path, "utf8");
  assert.doesNotMatch(
    source,
    /site-gate|SITE_GATE|SITE_VISIBILITY_MODE|isSitePrivate|NOINDEX_HEADERS/i,
    `${path} should not contain site gate controls`
  );
}

const packageJson = readFileSync("package.json", "utf8");
assert.doesNotMatch(
  packageJson,
  /site-gate|SITE_GATE|SITE_VISIBILITY_MODE/i,
  "package scripts should not expose site gate setup"
);

const envExample = readFileSync(".env.example", "utf8");
assert.doesNotMatch(
  envExample,
  /site gate|SITE_GATE|SITE_VISIBILITY_MODE/i,
  ".env.example should not document site gate vars"
);
