import type { WeatherLocation, WeatherLocationKey } from "@/lib/weather/types";

export const WEATHER_LOCATIONS: Record<WeatherLocationKey, WeatherLocation> = {
  magic_kingdom_resort_area: {
    key: "magic_kingdom_resort_area",
    name: "Magic Kingdom resort area",
    lat: 28.4158,
    lon: -81.5844,
    timezone: "America/New_York",
  },
  epcot_boardwalk_area: {
    key: "epcot_boardwalk_area",
    name: "EPCOT and BoardWalk resort area",
    lat: 28.3675,
    lon: -81.5553,
    timezone: "America/New_York",
  },
  skyliner_area: {
    key: "skyliner_area",
    name: "Skyliner resort area",
    lat: 28.3504,
    lon: -81.5459,
    timezone: "America/New_York",
  },
  animal_kingdom_lodge_area: {
    key: "animal_kingdom_lodge_area",
    name: "Animal Kingdom Lodge area",
    lat: 28.3522,
    lon: -81.6038,
    timezone: "America/New_York",
  },
  disney_springs_area: {
    key: "disney_springs_area",
    name: "Disney Springs resort area",
    lat: 28.3728,
    lon: -81.5187,
    timezone: "America/New_York",
  },
  all_wdw: {
    key: "all_wdw",
    name: "Walt Disney World area",
    lat: 28.3772,
    lon: -81.5707,
    timezone: "America/New_York",
  },
};

const RESORT_TO_WEATHER_LOCATION: Record<string, WeatherLocationKey> = {
  "contemporary-resort": "magic_kingdom_resort_area",
  "bay-lake-tower-at-contemporary": "magic_kingdom_resort_area",
  "grand-floridian-resort-and-spa": "magic_kingdom_resort_area",
  "polynesian-village-resort": "magic_kingdom_resort_area",
  "fort-wilderness-resort": "magic_kingdom_resort_area",
  "wilderness-lodge": "magic_kingdom_resort_area",
  "boardwalk-inn": "epcot_boardwalk_area",
  "boardwalk-villas": "epcot_boardwalk_area",
  "yacht-club-resort": "epcot_boardwalk_area",
  "beach-club-resort": "epcot_boardwalk_area",
  "beach-club-villas": "epcot_boardwalk_area",
  "pop-century-resort": "skyliner_area",
  "art-of-animation-resort": "skyliner_area",
  "caribbean-beach-resort": "skyliner_area",
  "riviera-resort": "skyliner_area",
  "animal-kingdom-lodge": "animal_kingdom_lodge_area",
  "animal-kingdom-villas-jambo-house": "animal_kingdom_lodge_area",
  "animal-kingdom-villas-kidani-village": "animal_kingdom_lodge_area",
  "saratoga-springs-resort-and-spa": "disney_springs_area",
  "old-key-west-resort": "disney_springs_area",
  "port-orleans-resort-riverside": "disney_springs_area",
  "port-orleans-resort-french-quarter": "disney_springs_area",
};

export function getWeatherLocation(key: WeatherLocationKey): WeatherLocation {
  return WEATHER_LOCATIONS[key] ?? WEATHER_LOCATIONS.all_wdw;
}

export function getWeatherLocationForResort(resortSlug?: string | null): WeatherLocation {
  if (!resortSlug) return WEATHER_LOCATIONS.all_wdw;
  return WEATHER_LOCATIONS[RESORT_TO_WEATHER_LOCATION[resortSlug] ?? "all_wdw"];
}

export function parseWeatherLocationKey(value: string | null): WeatherLocationKey {
  if (value && value in WEATHER_LOCATIONS) return value as WeatherLocationKey;
  return "all_wdw";
}
