import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildSiteVerificationMetadata } from "@/lib/seo/siteVerification";

const emptyVerification = buildSiteVerificationMetadata({});
assert.deepEqual(
  emptyVerification,
  {},
  "site verification metadata should stay empty until dashboard tokens are configured"
);

const verification = buildSiteVerificationMetadata({
  GOOGLE_SITE_VERIFICATION: " google-token ",
  BING_SITE_VERIFICATION: " bing-token ",
});
assert.deepEqual(verification, {
  verification: {
    google: "google-token",
    other: {
      "msvalidate.01": "bing-token",
    },
  },
});

const publicFallbackVerification = buildSiteVerificationMetadata({
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: "public-google",
  NEXT_PUBLIC_BING_SITE_VERIFICATION: "public-bing",
});
assert.deepEqual(publicFallbackVerification, {
  verification: {
    google: "public-google",
    other: {
      "msvalidate.01": "public-bing",
    },
  },
});

const layoutSource = readFileSync("app/layout.tsx", "utf8");
assert.match(
  layoutSource,
  /buildSiteVerificationMetadata/,
  "root layout should include Search Console and Bing verification metadata"
);
assert.match(
  layoutSource,
  /\.\.\.buildSiteVerificationMetadata\(\)/,
  "root metadata should spread the verification metadata helper"
);

const envExample = readFileSync(".env.example", "utf8");
for (const expected of [
  "GOOGLE_SITE_VERIFICATION=",
  "BING_SITE_VERIFICATION=",
  "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=",
  "NEXT_PUBLIC_BING_SITE_VERIFICATION=",
  "GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN=",
  "GOOGLE_SEARCH_CONSOLE_SITE_URL=",
  "BING_WEBMASTER_API_KEY=",
  "BING_WEBMASTER_SITE_URL=",
]) {
  assert.match(
    envExample,
    new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `.env.example should document ${expected}`
  );
}

console.log("SEO verification metadata tests passed.");
