import type { MetadataRoute } from "next";
import { isSitePrivate } from "@/lib/site-gate/config";

export default function sitemap(): MetadataRoute.Sitemap {
  if (isSitePrivate()) return [];

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/activities`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/resorts`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/plan`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/today`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/tonight`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];
}
