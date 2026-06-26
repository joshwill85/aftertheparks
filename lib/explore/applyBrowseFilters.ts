import { filterByDaypart } from "@/lib/occurrences/expand";
import { rankActivitiesByQuery } from "@/lib/search/runSearch";
import { sortActivities, type ActivitySortKey } from "@/lib/activities/sort";
import type { ActivityFilters, ActivityOccurrence } from "@/lib/types/occurrence";

/** Apply URL browse filters to an already day-scoped activity list. */
export function applyBrowseFilters(
  occurrences: ActivityOccurrence[],
  filters: ActivityFilters
): ActivityOccurrence[] {
  let result = occurrences;

  if (filters.resort) {
    result = result.filter((o) => o.resort.slug === filters.resort);
  }
  if (filters.category) {
    result = result.filter((o) => o.category === filters.category);
  }
  if (filters.daypart) {
    result = filterByDaypart(result, filters.daypart);
  }
  if (filters.free) {
    result = result.filter((o) => o.price.state === "free");
  }
  if (filters.reservation) {
    result = result.filter(
      (o) =>
        o.eligibility.reservation?.required ||
        o.enrichment?.reservationRequired ||
        o.enrichment?.reservationRecommended
    );
  }
  if (filters.q) {
    result = rankActivitiesByQuery(result, filters.q);
  }

  const sortKey = (filters.sort ?? "time") as ActivitySortKey;
  return sortActivities(result, sortKey);
}
