import type { ResortWeatherProfile } from "@/lib/weather/types";

export const RESORT_WEATHER_PROFILES: Record<string, ResortWeatherProfile> = {
  "polynesian-village-resort": {
    resortSlug: "polynesian-village-resort",
    indoorBackupDepth: "medium",
    coveredWanderingFit: "medium",
    outdoorExposure: "medium",
    transportWeatherSensitivity: "medium",
    heatWalkingIntensity: "medium",
    rainyDaySummary: "Rainy plans work best around lobby, dining, monorail, and same-resort indoor backups.",
    heatDaySummary: "Keep outdoor wandering short and use shaded or indoor resets between activities.",
    stormDaySummary: "Avoid beach, pool, boat, and outdoor movie plans during storm risk.",
  },
  "boardwalk-inn": {
    resortSlug: "boardwalk-inn",
    indoorBackupDepth: "medium",
    coveredWanderingFit: "low",
    outdoorExposure: "high",
    transportWeatherSensitivity: "medium",
    heatWalkingIntensity: "high",
    rainyDaySummary: "BoardWalk-area plans need indoor backups because many connections are exposed.",
    heatDaySummary: "Walking-heavy plans feel hotter here; keep loops short.",
    stormDaySummary: "Pause outdoor entertainment and long walks during lightning risk.",
  },
  "fort-wilderness-resort": {
    resortSlug: "fort-wilderness-resort",
    indoorBackupDepth: "low",
    coveredWanderingFit: "medium",
    outdoorExposure: "high",
    transportWeatherSensitivity: "high",
    heatWalkingIntensity: "high",
    rainyDaySummary: "Rain has a larger impact because many activities and transfers are outdoors.",
    heatDaySummary: "Build around shade, hydration, and shorter loops.",
    stormDaySummary: "Campfires, pools, boats, and outdoor recreation are highly storm-sensitive.",
  },
  "animal-kingdom-lodge": {
    resortSlug: "animal-kingdom-lodge",
    indoorBackupDepth: "high",
    coveredWanderingFit: "high",
    outdoorExposure: "medium",
    transportWeatherSensitivity: "low",
    heatWalkingIntensity: "medium",
    rainyDaySummary: "Strong indoor lobby, dining, and viewing areas make rainy-day pivots easier.",
    heatDaySummary: "Use indoor viewing and dining breaks when heat builds.",
    stormDaySummary: "Stay inside the resort core and skip outdoor viewing areas while alerts are active.",
  },
};

export function getResortWeatherProfile(resortSlug: string): ResortWeatherProfile | undefined {
  return RESORT_WEATHER_PROFILES[resortSlug];
}
