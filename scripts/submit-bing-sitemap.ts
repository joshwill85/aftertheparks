import { submitBingSitemap } from "@/lib/seo/externalReadiness";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://aftertheparks.com";
const sitemapUrl = process.argv[2]?.trim() || new URL("/sitemap.xml", siteUrl).toString();

submitBingSitemap({
  siteUrl,
  sitemapUrl,
  apiKey: process.env.BING_WEBMASTER_API_KEY,
  bingSiteUrl: process.env.BING_WEBMASTER_SITE_URL,
})
  .then((message) => {
    console.log(message);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Bing sitemap submission failed.");
    process.exit(1);
  });
