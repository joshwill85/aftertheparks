import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const serviceWorkerEnabled =
  process.env.NODE_ENV === "production" &&
  process.env.SITE_VISIBILITY_MODE?.trim().toLowerCase() === "public";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: !serviceWorkerEnabled,
});

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 82, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/p/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
        ],
      },
    ];
  },
  webpack(config, { dev, nextRuntime }) {
    if (!dev && nextRuntime === "edge") {
      config.devtool = false;
    }
    return config;
  },
};

export default withSerwist(nextConfig);
