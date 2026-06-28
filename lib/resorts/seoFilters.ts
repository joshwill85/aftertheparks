import type { ActivityOccurrence, ResortSummary } from "@/lib/types/occurrence";

export interface ResortSeoFilterOptions {
  noTicketFriendly?: boolean;
  noTicketCounts?: Map<string, number>;
}

function requiresParkTicket(activity: ActivityOccurrence): boolean {
  const text = [
    activity.title,
    activity.summary,
    activity.category,
    activity.section,
    activity.location.label,
    activity.scheduleText,
    activity.price.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    /valid (theme )?park admission|requires? (valid )?(theme )?park admission|park ticket required|theme park ticket|required admission/.test(
      text
    ) ||
    /\binside (magic kingdom|epcot|hollywood studios|animal kingdom) park\b/.test(text) ||
    /\b(magic kingdom|epcot|hollywood studios|animal kingdom) park\b/.test(text)
  );
}

export function buildNoTicketFriendlyResortStats(
  activities: ActivityOccurrence[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const activity of activities) {
    if (requiresParkTicket(activity)) continue;
    counts.set(activity.resort.slug, (counts.get(activity.resort.slug) ?? 0) + 1);
  }
  return counts;
}

export function filterResortsForSeoIntent(
  resorts: ResortSummary[],
  options: ResortSeoFilterOptions = {}
): ResortSummary[] {
  const sorted = [...resorts].sort((a, b) => a.name.localeCompare(b.name));
  if (!options.noTicketFriendly) return sorted;

  const counts = options.noTicketCounts ?? new Map<string, number>();
  return sorted.filter((resort) => (counts.get(resort.slug) ?? 0) > 0);
}
