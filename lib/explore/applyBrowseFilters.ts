import { filterByDaypart } from "@/lib/occurrences/expand";
import { rankActivitiesByQuery } from "@/lib/search/runSearch";
import { sortActivities, type ActivitySortKey } from "@/lib/activities/sort";
import { DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG } from "@/lib/seo/fit";
import {
  areaMatchesFilter,
  resortAreaMatchesOrigin,
  transportMatchesFilter,
} from "@/lib/explore/routeTaxonomy";
import type { ActivityFilters, ActivityOccurrence } from "@/lib/types/occurrence";

function weatherMatches(
  occurrence: ActivityOccurrence,
  weather: NonNullable<ActivityFilters["weather"]>
): boolean {
  const fit = DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG[occurrence.activitySlug]?.weatherFit;
  if (fit === weather) return true;

  const text = [
    occurrence.title,
    occurrence.category,
    occurrence.location.label,
    occurrence.enrichment?.weatherDependency,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (weather === "indoor") {
    return /\bindoor\b|arcade|community hall|lobby|animation|learn to draw/.test(text);
  }
  return /\bcovered\b|porch|pavilion|under cover|covered walkway/.test(text);
}

function requiresParkTicket(occurrence: ActivityOccurrence): boolean {
  const text = [
    occurrence.title,
    occurrence.summary,
    occurrence.category,
    occurrence.section,
    occurrence.location.label,
    occurrence.scheduleText,
    occurrence.price.notes,
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

function isShortDuration(occurrence: ActivityOccurrence): boolean {
  const duration = occurrence.enrichment?.durationMinutes;
  if (typeof duration === "number") return duration <= 45;

  const text = [occurrence.title, occurrence.category, occurrence.summary, occurrence.scheduleText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/movie|fireworks|cruise|tour|trail|surrey/.test(text)) return false;
  return /campfire|arcade|craft|trivia|game|scavenger|lobby|drawing|animation/.test(text);
}

/** Apply URL browse filters to an already day-scoped activity list. */
export function applyBrowseFilters(
  occurrences: ActivityOccurrence[],
  filters: ActivityFilters
): ActivityOccurrence[] {
  let result = occurrences;

  if (filters.near === "my-resort" && filters.resort) {
    result = result.filter((o) =>
      resortAreaMatchesOrigin(filters.resort!, o.resort.slug, o.resort.area)
    );
  } else if (filters.resort) {
    result = result.filter((o) => o.resort.slug === filters.resort);
  }
  if (filters.category) {
    result = result.filter((o) => o.category === filters.category);
  }
  if (filters.daypart) {
    result = filterByDaypart(result, filters.daypart);
  }
  if (filters.duration === "short") {
    result = result.filter(isShortDuration);
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
  if (filters.ticketRequired !== undefined) {
    result = result.filter((o) => requiresParkTicket(o) === filters.ticketRequired);
  }
  if (filters.q) {
    result = rankActivitiesByQuery(result, filters.q);
  }

  const sortKey = (filters.sort ?? "time") as ActivitySortKey;
  return sortActivities(result, sortKey);
}
