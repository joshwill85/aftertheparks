import type { WeatherWindow } from "@/lib/weather/types";

export interface WeatherDayStory {
  headline: string;
  body: string;
  chapters: Array<{
    id: string;
    label: string;
    headline: string;
    href: string;
  }>;
}

export function buildWeatherDayStory(input: {
  windows: WeatherWindow[];
  stormModeActive: boolean;
}): WeatherDayStory {
  const firstWindow = input.windows[0];
  const stormWindow = input.windows.find((window) => window.chapterLabel === "Storm Mode");
  const headline = input.stormModeActive
    ? "Storm Mode shapes the day"
    : firstWindow?.chapterLabel === "Sunshine Start"
      ? "Start outdoor, then keep the middle flexible"
      : firstWindow?.headline ?? "Weather-aware resort day";

  return {
    headline,
    body: input.stormModeActive
      ? "Lead with indoor and covered plans until official guidance and conditions improve."
      : stormWindow
        ? "Use the clearer window first, expect the weather to build, then switch to indoor backups before the stormy chapter."
        : "Treat the day as chapters: best outdoor window, heat or rain buildup, backup window, then an evening reset if conditions ease.",
    chapters: input.windows.map((window) => ({
      id: window.id,
      label: window.chapterLabel,
      headline: window.headline,
      href: window.deepLinks[0]?.href ?? "/today",
    })),
  };
}
