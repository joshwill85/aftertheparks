import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { DaypartShell } from "@/components/atlas/DaypartShell";
import { PlanProvider } from "@/components/atlas/PlanProvider";
import { WebVitals } from "@/components/analytics/WebVitals";
import {
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  stringifyJsonLd,
} from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { buildSiteVerificationMetadata } from "@/lib/seo/siteVerification";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "After the Parks",
    template: "%s | After the Parks",
  },
  description:
    "Independent Walt Disney World resort activity planner — what to do now, tonight, and during your stay.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com"
  ),
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "After the Parks",
  },
  ...buildSocialMetadata({
    title: "After the Parks",
    description:
      "Independent Walt Disney World resort activity planner for current resort recreation, calendars, and no-park-day planning.",
    path: "/",
  }),
  ...buildSiteVerificationMetadata(),
};

export const viewport: Viewport = {
  themeColor: "#16a6b6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const siteJsonLd = stringifyJsonLd([
    buildOrganizationJsonLd(baseUrl),
    buildWebsiteJsonLd(baseUrl),
  ]);

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${nunitoSans.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: siteJsonLd }}
        />
        <WebVitals />
        <PlanProvider>
          <DaypartShell>{children}</DaypartShell>
        </PlanProvider>
      </body>
    </html>
  );
}
