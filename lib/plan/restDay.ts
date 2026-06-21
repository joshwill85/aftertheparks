import type { ActivityOccurrence } from "@/lib/types/occurrence";

export type RestDayVibe = "relaxed" | "active" | "evening";
export type RestDayWho = "little_kids" | "family" | "couple";

const PICK_ORDER: Record<RestDayVibe, Record<RestDayWho, string[]>> = {
  relaxed: {
    little_kids: ["poolside", "arts_crafts", "movies_under_stars"],
    family: ["poolside", "resort_activity", "campfire"],
    couple: ["fitness_wellness", "signature", "movies_under_stars"],
  },
  active: {
    little_kids: ["scavenger_hunt", "poolside", "campfire"],
    family: ["fitness_wellness", "poolside", "nighttime_entertainment"],
    couple: ["fitness_wellness", "signature", "music"],
  },
  evening: {
    little_kids: ["arts_crafts", "campfire", "movies_under_stars"],
    family: ["resort_activity", "campfire", "movies_under_stars"],
    couple: ["signature", "music", "movies_under_stars"],
  },
};

function pickByCategory(
  pool: ActivityOccurrence[],
  category: string,
  used: Set<string>
): ActivityOccurrence | null {
  const match = pool.find(
    (activity) =>
      activity.category === category &&
      !used.has(activity.activityCatalogId)
  );
  if (match) return match;

  const fallback = pool.find((activity) => !used.has(activity.activityCatalogId));
  return fallback ?? null;
}

/** Build a low-stress 3-stop rest day from today + tonight pools. */
export function buildRestDayPlan(
  today: ActivityOccurrence[],
  tonight: ActivityOccurrence[],
  options: { vibe: RestDayVibe; who: RestDayWho }
): ActivityOccurrence[] {
  const pool = [...today, ...tonight];
  const categories = PICK_ORDER[options.vibe][options.who];
  const used = new Set<string>();
  const picks: ActivityOccurrence[] = [];

  for (const category of categories) {
    const activity = pickByCategory(pool, category, used);
    if (!activity) continue;
    used.add(activity.activityCatalogId);
    picks.push(activity);
  }

  return picks;
}
