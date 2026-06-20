import type { Metadata, Viewport } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import { DaypartShell } from "@/components/atlas/DaypartShell";
import { PlanProvider } from "@/components/atlas/PlanProvider";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sourceSans = Source_Sans_3({
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1a8f9e" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${sourceSans.variable} antialiased`}>
        <PlanProvider>
          <DaypartShell>{children}</DaypartShell>
        </PlanProvider>
      </body>
    </html>
  );
}
