import { getTopCategoryBadges } from "@/lib/resorts/sections";
import type { ActivityOccurrence, ResortSummary } from "@/lib/types/occurrence";

export interface ResortEnrichment {
  tonightByResort: Map<string, number>;
  todayByResort: Map<string, number>;
  highlightsByResort: Map<string, string[]>;
}

export function countByResort(activities: { resort: { slug: string } }[]) {
  const counts = new Map<string, number>();
  for (const activity of activities) {
    const slug = activity.resort.slug;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return counts;
}

export function highlightsByResort(activities: ActivityOccurrence[]) {
  const byResort = new Map<string, ActivityOccurrence[]>();
  for (const activity of activities) {
    const slug = activity.resort.slug;
    const list = byResort.get(slug) ?? [];
    list.push(activity);
    byResort.set(slug, list);
  }

  const highlights = new Map<string, string[]>();
  for (const [slug, list] of byResort) {
    highlights.set(slug, getTopCategoryBadges(list, 3));
  }
  return highlights;
}

export function buildResortEnrichment(
  todayActivities: ActivityOccurrence[],
  tonightActivities: ActivityOccurrence[]
): ResortEnrichment {
  return {
    todayByResort: countByResort(todayActivities),
    tonightByResort: countByResort(tonightActivities),
    highlightsByResort: highlightsByResort([
      ...todayActivities,
      ...tonightActivities,
    ]),
  };
}

export function enrichmentToProps(
  resort: ResortSummary,
  enrichment: ResortEnrichment
) {
  return {
    tonightCount: enrichment.tonightByResort.get(resort.slug),
    todayCount: enrichment.todayByResort.get(resort.slug),
    highlights: enrichment.highlightsByResort.get(resort.slug) ?? [],
  };
}
