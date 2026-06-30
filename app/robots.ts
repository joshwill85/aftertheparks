import type { MetadataRoute } from "next";

export const revalidate = 86400;
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";

  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Googlebot-Image", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
      { userAgent: "Applebot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Claude-User", allow: "/" },
      { userAgent: "Claude-SearchBot", allow: "/" },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "Google-Extended", disallow: "/" },
      { userAgent: "Applebot-Extended", disallow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
