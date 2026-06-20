import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "After the Parks",
    short_name: "After Parks",
    description:
      "Independent Walt Disney World resort activity planner — today, tonight, and your stay.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#1a8f9e",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
