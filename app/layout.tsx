import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { DaypartShell } from "@/components/atlas/DaypartShell";
import { PlanProvider } from "@/components/atlas/PlanProvider";
import { WebVitals } from "@/components/analytics/WebVitals";
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
};

export const viewport: Viewport = {
  themeColor: "#16a6b6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${nunitoSans.variable} antialiased`}>
        <WebVitals />
        <PlanProvider>
          <DaypartShell>{children}</DaypartShell>
        </PlanProvider>
      </body>
    </html>
  );
}
