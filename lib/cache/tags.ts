export const CACHE_SECONDS = {
  evergreen: 86_400,
  evergreenBrowser: 300,
  evergreenSWR: 604_800,
  timeRelative: 900,
  timeRelativeBrowser: 60,
  timeRelativeSWR: 3_600,
  weather: 60,
  weatherBrowser: 0,
  weatherSWR: 120,
} as const;

export const PUBLIC_CACHE_TAGS = {
  catalogue: "public-activity-data",
  weather: "public-weather-data",
  seo: "public-seo-data",
} as const;

export type PublicCacheTagName = keyof typeof PUBLIC_CACHE_TAGS;
export type PublicCacheTag = (typeof PUBLIC_CACHE_TAGS)[PublicCacheTagName];

const PUBLIC_CACHE_TAG_NAMES = new Set(Object.keys(PUBLIC_CACHE_TAGS));

export function isPublicCacheTagName(value: string): value is PublicCacheTagName {
  return PUBLIC_CACHE_TAG_NAMES.has(value);
}
