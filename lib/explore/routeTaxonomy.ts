import type {
  ActivityAreaFilter,
  ActivityTransportFilter,
} from "@/lib/types/occurrence";

export const AREA_LABELS: Record<ActivityAreaFilter, string> = {
  "magic-kingdom": "Magic Kingdom resort area",
  "epcot-boardwalk": "EPCOT and BoardWalk area",
  skyliner: "Skyliner area",
  "animal-kingdom": "Animal Kingdom Lodge area",
  "disney-springs": "Disney Springs area",
  "fort-wilderness": "Fort Wilderness area",
};

export const TRANSPORT_LABELS: Record<ActivityTransportFilter, string> = {
  monorail: "Monorail",
  skyliner: "Skyliner",
  boat: "Boat",
  walk: "Walkable",
  bus: "Bus",
  rideshare: "Rideshare",
};

export const AREA_OPTIONS = Object.keys(AREA_LABELS) as ActivityAreaFilter[];
export const TRANSPORT_OPTIONS = Object.keys(
  TRANSPORT_LABELS
) as ActivityTransportFilter[];

const MONORAIL_RESORTS = new Set([
  "contemporary-resort",
  "bay-lake-tower-at-contemporary",
  "grand-floridian-resort-and-spa",
  "polynesian-village-resort",
  "poly",
]);

const SKYLINER_RESORTS = new Set([
  "pop-century-resort",
  "art-of-animation-resort",
  "caribbean-beach-resort",
  "riviera-resort",
  "boardwalk-inn",
  "boardwalk-villas",
  "yacht-club-resort",
  "beach-club-resort",
  "beach-club-villas",
  "pop",
]);

const BOAT_RESORTS = new Set([
  "fort-wilderness-resort",
  "wilderness-lodge",
  "contemporary-resort",
  "grand-floridian-resort-and-spa",
  "polynesian-village-resort",
  "boardwalk-inn",
  "boardwalk-villas",
  "yacht-club-resort",
  "beach-club-resort",
  "beach-club-villas",
  "saratoga-springs-resort-and-spa",
  "old-key-west-resort",
  "port-orleans-resort-riverside",
  "port-orleans-resort-french-quarter",
  "poly",
  "saratoga",
]);

const WALKABLE_RESORTS = new Set([
  "contemporary-resort",
  "bay-lake-tower-at-contemporary",
  "boardwalk-inn",
  "boardwalk-villas",
  "yacht-club-resort",
  "beach-club-resort",
  "beach-club-villas",
  "saratoga-springs-resort-and-spa",
  "poly",
  "saratoga",
]);

const RESORT_AREA_BY_SLUG: Record<string, ActivityAreaFilter> = {
  "contemporary-resort": "magic-kingdom",
  "bay-lake-tower-at-contemporary": "magic-kingdom",
  "grand-floridian-resort-and-spa": "magic-kingdom",
  "polynesian-village-resort": "magic-kingdom",
  "fort-wilderness-resort": "fort-wilderness",
  "wilderness-lodge": "magic-kingdom",
  "boardwalk-inn": "epcot-boardwalk",
  "boardwalk-villas": "epcot-boardwalk",
  "yacht-club-resort": "epcot-boardwalk",
  "beach-club-resort": "epcot-boardwalk",
  "beach-club-villas": "epcot-boardwalk",
  "pop-century-resort": "skyliner",
  "art-of-animation-resort": "skyliner",
  "caribbean-beach-resort": "skyliner",
  "riviera-resort": "skyliner",
  "animal-kingdom-lodge": "animal-kingdom",
  "animal-kingdom-villas-jambo-house": "animal-kingdom",
  "animal-kingdom-villas-kidani-village": "animal-kingdom",
  "saratoga-springs-resort-and-spa": "disney-springs",
  "old-key-west-resort": "disney-springs",
  "port-orleans-resort-riverside": "disney-springs",
  "port-orleans-resort-french-quarter": "disney-springs",
  poly: "magic-kingdom",
  akl: "animal-kingdom",
  saratoga: "disney-springs",
  pop: "skyliner",
};

function normalized(value?: string): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeAreaFilter(value?: string): ActivityAreaFilter | undefined {
  const area = normalized(value);
  if (["magic_kingdom", "magic_kingdom_resort_area"].includes(area)) {
    return "magic-kingdom";
  }
  if (["epcot", "epcot_boardwalk", "epcot_boardwalk_area", "boardwalk"].includes(area)) {
    return "epcot-boardwalk";
  }
  if (["skyliner", "skyliner_area"].includes(area)) return "skyliner";
  if (["animal_kingdom", "animal_kingdom_lodge", "animal_kingdom_lodge_area"].includes(area)) {
    return "animal-kingdom";
  }
  if (["disney_springs", "disney_springs_area"].includes(area)) return "disney-springs";
  if (["fort_wilderness", "fort_wilderness_area"].includes(area)) return "fort-wilderness";
  return undefined;
}

export function areaFilterForResort(
  resortSlug: string,
  resortArea?: string
): ActivityAreaFilter | undefined {
  return normalizeAreaFilter(resortArea) ?? RESORT_AREA_BY_SLUG[resortSlug];
}

export function areaMatchesFilter(
  resortSlug: string,
  resortArea: string | undefined,
  filter: ActivityAreaFilter
): boolean {
  if (filter === "fort-wilderness") return resortSlug === "fort-wilderness-resort";
  return areaFilterForResort(resortSlug, resortArea) === filter;
}

export function resortAreaMatchesOrigin(
  originResortSlug: string,
  resortSlug: string,
  resortArea?: string
): boolean {
  const originArea = areaFilterForResort(originResortSlug);
  if (!originArea) return resortSlug === originResortSlug;
  return areaMatchesFilter(resortSlug, resortArea, originArea);
}

export function transportMatchesFilter(
  resortSlug: string,
  resortArea: string | undefined,
  filter: ActivityTransportFilter
): boolean {
  if (filter === "bus" || filter === "rideshare") return true;
  if (filter === "monorail") return MONORAIL_RESORTS.has(resortSlug);
  if (filter === "skyliner") return SKYLINER_RESORTS.has(resortSlug);
  if (filter === "boat") return BOAT_RESORTS.has(resortSlug);
  if (filter === "walk") return WALKABLE_RESORTS.has(resortSlug);
  return false;
}
