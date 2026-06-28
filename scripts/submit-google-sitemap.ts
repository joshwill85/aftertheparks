import { submitGoogleSitemap } from "@/lib/seo/externalReadiness";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://aftertheparks.com";
const sitemapUrl = process.argv[2]?.trim() || new URL("/sitemap.xml", siteUrl).toString();

submitGoogleSitemap({
  siteUrl,
  sitemapUrl,
  searchConsoleSiteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL,
  accessToken: process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN,
  credentialsFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  clientEmail: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY,
})
  .then((message) => {
    console.log(message);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Google sitemap submission failed.");
    process.exit(1);
  });
