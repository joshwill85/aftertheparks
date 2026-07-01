export interface CanonicalPolicy {
  canonical: string;
  index: boolean;
  strategicFilterKey?: string;
}

const STRATEGIC_FILTERS_BY_PATH: Record<string, ReadonlySet<string>> = {
  "/activities": new Set([
    "category=arcade",
    "category=campfire",
    "category=movies_under_stars",
    "category=poolside",
    "free=true",
    "weather=indoor",
    "weather=covered",
    "transport=monorail",
    "transport=skyliner",
    "area=disney-springs",
  ]),
  "/today": new Set(["weather=indoor"]),
  "/tonight": new Set(["free=true", "weather=indoor"]),
  "/resorts": new Set(["no_ticket_friendly=true"]),
};

function activeEntries(params: Record<string, string | undefined>): Array<[string, string]> {
  return Object.entries(params).filter(
    (entry): entry is [string, string] => Boolean(entry[1])
  );
}

export function strategicFilterKeyForParams(
  params: Record<string, string | undefined>
): string | undefined {
  const entries = activeEntries(params);
  if (entries.length !== 1) return undefined;
  const [key, value] = entries[0];
  return `${key}=${value}`;
}

export function canonicalPolicyForParams(
  path: keyof typeof STRATEGIC_FILTERS_BY_PATH | string,
  params: Record<string, string | undefined>
): CanonicalPolicy {
  const strategicFilterKey = strategicFilterKeyForParams(params);
  const strategicFilters = STRATEGIC_FILTERS_BY_PATH[path];

  if (strategicFilterKey && strategicFilters?.has(strategicFilterKey)) {
    return {
      canonical: `${path}?${strategicFilterKey}`,
      index: true,
      strategicFilterKey,
    };
  }

  return {
    canonical: path,
    index: activeEntries(params).length === 0,
    strategicFilterKey: undefined,
  };
}
