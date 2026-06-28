import type { Metadata } from "next";

type SocialType = "website" | "article";

interface SocialMetadataInput {
  title: string;
  description: string;
  path: string;
  type?: SocialType;
  imageEyebrow?: string;
  imageSummary?: string;
}

function ogImagePath(title: string, eyebrow: string, summary: string): string {
  const params = new URLSearchParams({ title, eyebrow, summary });
  return `/api/og?${params.toString()}`;
}

export function buildSocialMetadata({
  title,
  description,
  path,
  type = "website",
  imageEyebrow = "After the Parks",
  imageSummary = "Current resort activities, calendars, source caveats, and no-park-day planning.",
}: SocialMetadataInput): Pick<Metadata, "openGraph" | "twitter"> {
  const imageUrl = ogImagePath(title, imageEyebrow, imageSummary);
  const image = {
    url: imageUrl,
    width: 1200,
    height: 630,
    alt: `${title} - After the Parks`,
  };

  return {
    openGraph: {
      title,
      description,
      url: path,
      type,
      siteName: "After the Parks",
      locale: "en_US",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
