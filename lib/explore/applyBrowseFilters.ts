import { filterByDaypart } from "@/lib/occurrences/expand";
import { rankActivitiesByQuery } from "@/lib/search/runSearch";
import { sortActivities, type ActivitySortKey } from "@/lib/activities/sort";
import {
  areaMatchesFilter,
  resortAreaMatchesOrigin,
  transportMatchesFilter,
} from "@/lib/explore/routeTaxonomy";
import { selectedResortSlugs } from "@/lib/explore/resortFilters";
import { itemMatchesPreset } from "@/lib/planning/presetDefinitions";
import { weatherFitValueForActivity } from "@/lib/planning/activityFacts";
import type { ActivityFilters, ActivityOccurrence } from "@/lib/types/occurrence";

function weatherMatches(
  occurrence: ActivityOccurrence,
  weather: NonNullable<ActivityFilters["weather"]>
): boolean {
  return weatherFitValueForActivity(occurrence) === weather;
}

/** Apply URL browse filters to an already day-scoped activity list. */
export function applyBrowseFilters(
  occurrences: ActivityOccurrence[],
  filters: ActivityFilters
): ActivityOccurrence[] {
  let result = occurrences;
  const selectedResorts = selectedResortSlugs(filters.resort);

  if (filters.near === "my-resort" && selectedResorts.length === 1) {
    const homeResort = selectedResorts[0];
    result = result.filter((o) =>
      resortAreaMatchesOrigin(homeResort, o.resort.slug, o.resort.area)
    );
  } else if (selectedResorts.length > 0) {
    const resortSet = new Set(selectedResorts);
    result = result.filter((o) => resortSet.has(o.resort.slug));
  }
  if (filters.category) {
    result = result.filter((o) => o.category === filters.category);
  }
  if (filters.daypart) {
    result = filterByDaypart(result, filters.daypart);
  }
  if (filters.preset) {
    result = result.filter((o) =>
      itemMatchesPreset(o, filters.preset!, {
        homeResortSlug: selectedResorts[0],
      })
    );
  }
  if (filters.transport) {
    result = result.filter((o) =>
      transportMatchesFilter(o.resort.slug, o.resort.area, filters.transport!)
    );
  }
  if (filters.area) {
    result = result.filter((o) => areaMatchesFilter(o.resort.slug, o.resort.area, filters.area!));
  }
  if (filters.weather) {
    result = result.filter((o) => weatherMatches(o, filters.weather!));
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
