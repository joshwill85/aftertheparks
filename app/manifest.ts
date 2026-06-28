import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "After the Parks",
    short_name: "After Parks",
    description:
      "Independent Walt Disney World resort activity planner — today, tonight, and your stay.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B2340",
    theme_color: "#0B2340",
    icons: [
      {
        src: "/brand/atp-pocket-map-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/brand/atp-pocket-map-app-icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
      },
      {
        src: "/brand/apple-touch-icon-180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
