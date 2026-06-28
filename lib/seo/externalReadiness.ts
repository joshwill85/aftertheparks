import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

export type ExternalSeoEnv = {
  GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN?: string;
  GOOGLE_SEARCH_CONSOLE_SITE_URL?: string;
  GOOGLE_APPLICATION_CREDENTIALS?: string;
  GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL?: string;
  GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?: string;
  BING_WEBMASTER_API_KEY?: string;
  BING_WEBMASTER_SITE_URL?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
  NEXT_PUBLIC_SITE_URL?: string;
};

export type GoogleSitemapSubmitInput = {
  siteUrl: string;
  sitemapUrl: string;
  searchConsoleSiteUrl?: string;
  accessToken?: string;
  credentialsFile?: string;
  clientEmail?: string;
  privateKey?: string;
  fetchImpl?: typeof fetch;
};

export type GoogleUrlInspectionInput = {
  inspectionUrl: string;
  siteUrl: string;
  searchConsoleSiteUrl?: string;
  accessToken?: string;
  credentialsFile?: string;
  clientEmail?: string;
  privateKey?: string;
  languageCode?: string;
  fetchImpl?: typeof fetch;
};

export type GoogleUrlInspectionSummary = {
  inspectionUrl: string;
  verdict?: string;
  coverageState?: string;
  robotsTxtState?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  pageFetchState?: string;
};

export type BingSitemapSubmitInput = {
  siteUrl: string;
  sitemapUrl: string;
  apiKey?: string;
  bingSiteUrl?: string;
  fetchImpl?: typeof fetch;
};

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function statusLine(name: string, ready: boolean, detail: string): string {
  return `- ${name}: ${ready ? "ready" : "missing"} - ${detail}`;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalizePrivateKey(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\\n/g, "\n");
}

function serviceAccountFromFile(credentialsFile?: string): {
  clientEmail?: string;
  privateKey?: string;
} {
  const file = credentialsFile?.trim();
  if (!file) return {};
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as {
      client_email?: string;
      private_key?: string;
    };
    return {
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  } catch {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS could not be read as a service-account JSON file.");
  }
}

function buildGoogleServiceAccountAssertion({
  clientEmail,
  privateKey,
  now = Math.floor(Date.now() / 1000),
}: {
  clientEmail: string;
  privateKey: string;
  now?: number;
}): string {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/webmasters",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${base64url(signer.sign(privateKey))}`;
}

async function getGoogleAccessToken({
  accessToken,
  credentialsFile,
  clientEmail,
  privateKey,
  fetchImpl = fetch,
}: {
  accessToken?: string;
  credentialsFile?: string;
  clientEmail?: string;
  privateKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const directToken = accessToken?.trim();
  if (directToken) return directToken;

  const fileCredentials = serviceAccountFromFile(credentialsFile);
  const email = clientEmail?.trim() || fileCredentials.clientEmail?.trim();
  const key = normalizePrivateKey(privateKey) ?? normalizePrivateKey(fileCredentials.privateKey);

  if (!email || !key) {
    throw new Error(
      "GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN or Google service-account credentials are required."
    );
  }

  const assertion = buildGoogleServiceAccountAssertion({
    clientEmail: email,
    privateKey: key,
  });
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Google service-account token exchange failed with HTTP ${response.status} ${response.statusText}`.trim()
    );
  }

  const payload = (await response.json()) as { access_token?: string };
  const token = payload.access_token?.trim();
  if (!token) {
    throw new Error("Google service-account token exchange did not return an access token.");
  }
  return token;
}

export function googleSitemapSubmitUrl(
  siteUrl: string,
  sitemapUrl: string,
  searchConsoleSiteUrl?: string
): string {
  const host = new URL(siteUrl).hostname;
  const propertyUrl = searchConsoleSiteUrl?.trim() || `sc-domain:${host}`;
  return `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    propertyUrl
  )}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
}

export async function submitGoogleSitemap({
  siteUrl,
  sitemapUrl,
  searchConsoleSiteUrl,
  accessToken,
  credentialsFile,
  clientEmail,
  privateKey,
  fetchImpl = fetch,
}: GoogleSitemapSubmitInput): Promise<string> {
  const token = await getGoogleAccessToken({
    accessToken,
    credentialsFile,
    clientEmail,
    privateKey,
    fetchImpl,
  });

  const response = await fetchImpl(googleSitemapSubmitUrl(siteUrl, sitemapUrl, searchConsoleSiteUrl), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Google Search Console sitemap submission failed with HTTP ${response.status} ${response.statusText}`.trim()
    );
  }

  return `Submitted ${sitemapUrl} to Google Search Console for ${new URL(siteUrl).hostname}.`;
}

export function googleUrlInspectionEndpoint(): string {
  return "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
}

export async function inspectGoogleUrl({
  inspectionUrl,
  siteUrl,
  searchConsoleSiteUrl,
  accessToken,
  credentialsFile,
  clientEmail,
  privateKey,
  languageCode = "en-US",
  fetchImpl = fetch,
}: GoogleUrlInspectionInput): Promise<GoogleUrlInspectionSummary> {
  const token = await getGoogleAccessToken({
    accessToken,
    credentialsFile,
    clientEmail,
    privateKey,
    fetchImpl,
  });

  const host = new URL(siteUrl).hostname;
  const propertyUrl = searchConsoleSiteUrl?.trim() || `sc-domain:${host}`;
  const response = await fetchImpl(googleUrlInspectionEndpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl: propertyUrl,
      languageCode,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Google Search Console URL inspection failed with HTTP ${response.status} ${response.statusText}`.trim()
    );
  }

  const payload = (await response.json()) as {
    inspectionResult?: {
      indexStatusResult?: Partial<GoogleUrlInspectionSummary>;
    };
  };
  const indexStatus = payload.inspectionResult?.indexStatusResult ?? {};

  return {
    inspectionUrl,
    verdict: indexStatus.verdict,
    coverageState: indexStatus.coverageState,
    robotsTxtState: indexStatus.robotsTxtState,
    indexingState: indexStatus.indexingState,
    lastCrawlTime: indexStatus.lastCrawlTime,
    pageFetchState: indexStatus.pageFetchState,
  };
}

export function bingSitemapSubmitUrl(apiKey?: string): string {
  const key = apiKey?.trim();
  const url = new URL("https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed");
  if (key) {
    url.searchParams.set("apikey", key);
  }
  return url.toString();
}

export async function submitBingSitemap({
  siteUrl,
  sitemapUrl,
  apiKey,
  bingSiteUrl,
  fetchImpl = fetch,
}: BingSitemapSubmitInput): Promise<string> {
  const key = apiKey?.trim();
  if (!key) {
    throw new Error("BING_WEBMASTER_API_KEY is required to submit the sitemap to Bing Webmaster Tools.");
  }

  const response = await fetchImpl(bingSitemapSubmitUrl(key), {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      siteUrl: bingSiteUrl?.trim() || siteUrl,
      feedUrl: sitemapUrl,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Bing Webmaster Tools sitemap submission failed with HTTP ${response.status} ${response.statusText}`.trim()
    );
  }

  return `Submitted ${sitemapUrl} to Bing Webmaster Tools for ${new URL(siteUrl).hostname}.`;
}

export function buildExternalSeoReadinessReport(env?: ExternalSeoEnv): string {
  const source = env ?? process.env;
  const siteUrl = source.NEXT_PUBLIC_SITE_URL?.trim() || "https://aftertheparks.com";
  const sitemapUrl = new URL("/sitemap.xml", siteUrl).toString();
  const searchConsoleSiteUrl = source.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim();
  const hasGoogle =
    present(source.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN) ||
    present(source.GOOGLE_APPLICATION_CREDENTIALS) ||
    (present(source.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL) &&
      present(source.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY));
  const hasBing = present(source.BING_WEBMASTER_API_KEY);
  const hasCloudflare =
    present(source.CLOUDFLARE_API_TOKEN) && present(source.CLOUDFLARE_ZONE_ID);

  return [
    "# External SEO Dashboard Readiness",
    "",
    `Site: ${siteUrl}`,
    `Sitemap: ${sitemapUrl}`,
    `Google sitemap submit endpoint: ${googleSitemapSubmitUrl(siteUrl, sitemapUrl, searchConsoleSiteUrl)}`,
    `Bing sitemap submit endpoint: ${bingSitemapSubmitUrl()}`,
    "",
    statusLine(
      "Google Search Console",
      hasGoogle,
      hasGoogle
        ? "credential material is configured; submit and inspect sitemap in Search Console."
        : "configure GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN or service-account credentials, then submit and inspect sitemap."
    ),
    statusLine(
      "Bing Webmaster Tools",
      hasBing,
      hasBing
        ? "API key is configured; inspect sitemap/index status and AI visibility reporting in Bing Webmaster Tools."
        : "configure BING_WEBMASTER_API_KEY, then inspect sitemap/index status and AI visibility reporting."
    ),
    statusLine(
      "Cloudflare AI Crawl Control",
      hasCloudflare,
      hasCloudflare
        ? "Cloudflare API token and zone id are configured; inspect AI Crawl Control and bot/security events."
        : "configure CLOUDFLARE_API_TOKEN with zone visibility and CLOUDFLARE_ZONE_ID, then inspect AI Crawl Control."
    ),
  ].join("\n");
}
