import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  buildExternalSeoReadinessReport,
  googleSitemapSubmitUrl,
} from "@/lib/seo/externalReadiness";
import * as externalSeoModule from "@/lib/seo/externalReadiness";

const externalSeo = externalSeoModule as Record<string, unknown>;
const submitGoogleSitemap = externalSeo.submitGoogleSitemap as
  | undefined
  | ((input: {
      siteUrl: string;
      sitemapUrl: string;
      searchConsoleSiteUrl?: string;
      accessToken?: string;
      credentialsFile?: string;
      clientEmail?: string;
      privateKey?: string;
      fetchImpl: typeof fetch;
    }) => Promise<string>);
const inspectGoogleUrl = externalSeo.inspectGoogleUrl as
  | undefined
  | ((input: {
      inspectionUrl: string;
      siteUrl: string;
      searchConsoleSiteUrl?: string;
      accessToken?: string;
      credentialsFile?: string;
      clientEmail?: string;
      privateKey?: string;
      fetchImpl: typeof fetch;
    }) => Promise<{
      inspectionUrl: string;
      verdict?: string;
      coverageState?: string;
      robotsTxtState?: string;
      indexingState?: string;
      lastCrawlTime?: string;
      pageFetchState?: string;
    }>);
const googleUrlInspectionEndpoint = externalSeo.googleUrlInspectionEndpoint as
  | undefined
  | (() => string);
const submitBingSitemap = externalSeo.submitBingSitemap as
  | undefined
  | ((input: {
      siteUrl: string;
      sitemapUrl: string;
      apiKey?: string;
      bingSiteUrl?: string;
      fetchImpl: typeof fetch;
    }) => Promise<string>);
const bingSitemapSubmitUrl = externalSeo.bingSitemapSubmitUrl as
  | undefined
  | ((apiKey?: string) => string);

const report = buildExternalSeoReadinessReport({
  GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN: "",
  GOOGLE_APPLICATION_CREDENTIALS: "",
  BING_WEBMASTER_API_KEY: "",
  CLOUDFLARE_API_TOKEN: "",
  CLOUDFLARE_ZONE_ID: "",
});

for (const expected of [
  "Google Search Console",
  "Bing Webmaster Tools",
  "Cloudflare AI Crawl Control",
  "missing",
  "https://aftertheparks.com/sitemap.xml",
  "Bing sitemap submit endpoint",
]) {
  assert.match(report, new RegExp(expected, "i"), `report should include ${expected}`);
}

assert.doesNotMatch(
  report,
  /cfat_[A-Za-z0-9_-]+|AIza[0-9A-Za-z_-]+|ya29\.[A-Za-z0-9_-]+/,
  "external readiness report must not leak API tokens"
);

const readyReport = buildExternalSeoReadinessReport({
  GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN: "ya29.fake-token",
  BING_WEBMASTER_API_KEY: "bing-secret",
  CLOUDFLARE_API_TOKEN: "cfat_fake-token",
  CLOUDFLARE_ZONE_ID: "zone123",
});
assert.match(readyReport, /Google Search Console:[^\n]+ready/i);
assert.match(readyReport, /Bing Webmaster Tools:[^\n]+ready/i);
assert.match(readyReport, /Cloudflare AI Crawl Control:[^\n]+ready/i);
assert.doesNotMatch(readyReport, /fake-token|bing-secret|zone123/);

assert.equal(
  googleSitemapSubmitUrl("https://aftertheparks.com", "https://aftertheparks.com/sitemap.xml"),
  "https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Aaftertheparks.com/sitemaps/https%3A%2F%2Faftertheparks.com%2Fsitemap.xml"
);
assert.equal(
  googleSitemapSubmitUrl(
    "https://aftertheparks.com",
    "https://aftertheparks.com/sitemap.xml",
    "https://aftertheparks.com/"
  ),
  "https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Faftertheparks.com%2F/sitemaps/https%3A%2F%2Faftertheparks.com%2Fsitemap.xml"
);

assert.equal(typeof submitGoogleSitemap, "function", "submitGoogleSitemap helper should exist");
assert.equal(typeof googleUrlInspectionEndpoint, "function", "googleUrlInspectionEndpoint helper should exist");
assert.equal(typeof inspectGoogleUrl, "function", "inspectGoogleUrl helper should exist");
assert.equal(typeof bingSitemapSubmitUrl, "function", "bingSitemapSubmitUrl helper should exist");
assert.equal(typeof submitBingSitemap, "function", "submitBingSitemap helper should exist");

async function testGoogleSitemapSubmitter() {
  assert.ok(submitGoogleSitemap);
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  const submitResult = await submitGoogleSitemap({
    siteUrl: "https://aftertheparks.com",
    sitemapUrl: "https://aftertheparks.com/sitemap.xml",
    accessToken: "ya29.fake-google-token",
    fetchImpl: fakeFetch,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, googleSitemapSubmitUrl("https://aftertheparks.com", "https://aftertheparks.com/sitemap.xml"));
  assert.equal(calls[0]?.init.method, "PUT");
  assert.deepEqual(calls[0]?.init.headers, {
    Authorization: "Bearer ya29.fake-google-token",
  });
  assert.match(submitResult, /submitted/i);
  assert.doesNotMatch(submitResult, /fake-google-token|should-not-appear/);

  await assert.rejects(
    () =>
      submitGoogleSitemap({
        siteUrl: "https://aftertheparks.com",
        sitemapUrl: "https://aftertheparks.com/sitemap.xml",
        accessToken: "",
        fetchImpl: fakeFetch,
      }),
    /GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN/
  );

  const failingFetch = (async () =>
    new Response("secret ya29.response-token", { status: 403, statusText: "Forbidden" })) as typeof fetch;
  await assert.rejects(
    () =>
      submitGoogleSitemap({
        siteUrl: "https://aftertheparks.com",
        sitemapUrl: "https://aftertheparks.com/sitemap.xml",
        accessToken: "ya29.fake-google-token",
        fetchImpl: failingFetch,
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /403/);
      assert.doesNotMatch(error.message, /fake-google-token|response-token/);
      return true;
    }
  );
}

async function testGoogleServiceAccountSubmitter() {
  assert.ok(submitGoogleSitemap);
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    if (String(url) === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({ access_token: "ya29.from-service-account" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  await submitGoogleSitemap({
    siteUrl: "https://aftertheparks.com",
    sitemapUrl: "https://aftertheparks.com/sitemap.xml",
    clientEmail: "search-console@example.iam.gserviceaccount.com",
    privateKey: privateKeyPem.replace(/\n/g, "\\n"),
    fetchImpl: fakeFetch,
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.url, "https://oauth2.googleapis.com/token");
  assert.equal(calls[0]?.init.method, "POST");
  assert.deepEqual(calls[0]?.init.headers, {
    "Content-Type": "application/x-www-form-urlencoded",
  });
  assert.match(
    String(calls[0]?.init.body),
    /grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer/
  );
  assert.match(String(calls[0]?.init.body), /assertion=/);
  assert.equal(
    calls[1]?.url,
    googleSitemapSubmitUrl("https://aftertheparks.com", "https://aftertheparks.com/sitemap.xml")
  );
  assert.deepEqual(calls[1]?.init.headers, {
    Authorization: "Bearer ya29.from-service-account",
  });
}

async function testGoogleUrlInspection() {
  assert.ok(googleUrlInspectionEndpoint);
  assert.ok(inspectGoogleUrl);
  assert.equal(
    googleUrlInspectionEndpoint(),
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
  );

  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(
      JSON.stringify({
        inspectionResult: {
          inspectionResultLink: "https://search.google.com/search-console/inspect?resource_id=sc-domain:aftertheparks.com&id=secret",
          indexStatusResult: {
            verdict: "PASS",
            coverageState: "Submitted and indexed",
            robotsTxtState: "ALLOWED",
            indexingState: "INDEXING_ALLOWED",
            lastCrawlTime: "2026-06-27T14:00:00Z",
            pageFetchState: "SUCCESSFUL",
          },
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  const result = await inspectGoogleUrl({
    inspectionUrl: "https://aftertheparks.com/today",
    siteUrl: "https://aftertheparks.com",
    searchConsoleSiteUrl: "sc-domain:aftertheparks.com",
    accessToken: "ya29.fake-google-token",
    fetchImpl: fakeFetch,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, googleUrlInspectionEndpoint());
  assert.equal(calls[0]?.init.method, "POST");
  assert.deepEqual(calls[0]?.init.headers, {
    Authorization: "Bearer ya29.fake-google-token",
    "Content-Type": "application/json; charset=utf-8",
  });
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), {
    inspectionUrl: "https://aftertheparks.com/today",
    siteUrl: "sc-domain:aftertheparks.com",
    languageCode: "en-US",
  });
  assert.deepEqual(result, {
    inspectionUrl: "https://aftertheparks.com/today",
    verdict: "PASS",
    coverageState: "Submitted and indexed",
    robotsTxtState: "ALLOWED",
    indexingState: "INDEXING_ALLOWED",
    lastCrawlTime: "2026-06-27T14:00:00Z",
    pageFetchState: "SUCCESSFUL",
  });

  await assert.rejects(
    () =>
      inspectGoogleUrl({
        inspectionUrl: "https://aftertheparks.com/today",
        siteUrl: "https://aftertheparks.com",
        accessToken: "",
        fetchImpl: fakeFetch,
      }),
    /GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN/
  );

  const failingFetch = (async () =>
    new Response("secret ya29.response-token", { status: 403, statusText: "Forbidden" })) as typeof fetch;
  await assert.rejects(
    () =>
      inspectGoogleUrl({
        inspectionUrl: "https://aftertheparks.com/today",
        siteUrl: "https://aftertheparks.com",
        accessToken: "ya29.fake-google-token",
        fetchImpl: failingFetch,
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /403/);
      assert.doesNotMatch(error.message, /fake-google-token|response-token/);
      return true;
    }
  );
}

async function testBingSitemapSubmitter() {
  assert.ok(bingSitemapSubmitUrl);
  assert.ok(submitBingSitemap);
  assert.equal(
    bingSitemapSubmitUrl("bing-secret"),
    "https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed?apikey=bing-secret"
  );

  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ d: null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  const submitResult = await submitBingSitemap({
    siteUrl: "https://aftertheparks.com",
    sitemapUrl: "https://aftertheparks.com/sitemap.xml",
    apiKey: "bing-secret",
    bingSiteUrl: "https://aftertheparks.com/",
    fetchImpl: fakeFetch,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, bingSitemapSubmitUrl("bing-secret"));
  assert.equal(calls[0]?.init.method, "POST");
  assert.deepEqual(calls[0]?.init.headers, {
    "Content-Type": "application/json; charset=utf-8",
  });
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), {
    siteUrl: "https://aftertheparks.com/",
    feedUrl: "https://aftertheparks.com/sitemap.xml",
  });
  assert.match(submitResult, /submitted/i);
  assert.doesNotMatch(submitResult, /bing-secret/);

  await assert.rejects(
    () =>
      submitBingSitemap({
        siteUrl: "https://aftertheparks.com",
        sitemapUrl: "https://aftertheparks.com/sitemap.xml",
        apiKey: "",
        fetchImpl: fakeFetch,
      }),
    /BING_WEBMASTER_API_KEY/
  );

  const failingFetch = (async () =>
    new Response("secret bing-secret", { status: 403, statusText: "Forbidden" })) as typeof fetch;
  await assert.rejects(
    () =>
      submitBingSitemap({
        siteUrl: "https://aftertheparks.com",
        sitemapUrl: "https://aftertheparks.com/sitemap.xml",
        apiKey: "bing-secret",
        fetchImpl: failingFetch,
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /403/);
      assert.doesNotMatch(error.message, /bing-secret/);
      return true;
    }
  );
}

async function main() {
  await testGoogleSitemapSubmitter();
  await testGoogleServiceAccountSubmitter();
  await testGoogleUrlInspection();
  await testBingSitemapSubmitter();

  const scriptSource = readFileSync("scripts/audit-seo-external-readiness.ts", "utf8");
  assert.match(scriptSource, /buildExternalSeoReadinessReport/);

  const submitScriptSource = readFileSync("scripts/submit-google-sitemap.ts", "utf8");
  assert.match(submitScriptSource, /submitGoogleSitemap/);
  assert.match(submitScriptSource, /GOOGLE_APPLICATION_CREDENTIALS/);
  assert.match(submitScriptSource, /GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL/);
  assert.match(submitScriptSource, /GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY/);

  const bingSubmitScriptSource = readFileSync("scripts/submit-bing-sitemap.ts", "utf8");
  assert.match(bingSubmitScriptSource, /submitBingSitemap/);

  const googleInspectionScriptSource = readFileSync("scripts/inspect-google-urls.ts", "utf8");
  assert.match(googleInspectionScriptSource, /inspectGoogleUrl/);
  assert.match(googleInspectionScriptSource, /GOOGLE_APPLICATION_CREDENTIALS/);
  assert.match(googleInspectionScriptSource, /GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL/);
  assert.match(googleInspectionScriptSource, /GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY/);

  console.log("SEO external readiness tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
