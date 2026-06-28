import { getDisplayTime, occurrenceToDisplayInput } from "@/lib/activityDisplay";
import { getPublicOfferingAvailabilityLabel } from "@/lib/activityAvailabilityDisplay";
import { formatActivityEventDay } from "@/lib/events/formatEventDay";
import type { ActivityOccurrence, ActivityOffering } from "@/lib/types/occurrence";

const CALENDAR_BACKED_CATEGORY_MATCHES = new Set([
  "movies_under_stars",
  "campfire",
  "nighttime_entertainment",
]);

function normalizeComparable(value: string): string {
  return value
    .toLowerCase()
    .replace(/^disney'?s\s+/i, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titlesMatch(offering: ActivityOffering, activity: ActivityOccurrence): boolean {
  const offeringTitle = normalizeComparable(offering.title);
  const activityTitle = normalizeComparable(activity.title);
  if (!offeringTitle || !activityTitle) return false;
  return (
    offeringTitle === activityTitle ||
    offeringTitle.includes(activityTitle) ||
    activityTitle.includes(offeringTitle)
  );
}

function matchesOfferingSession(
  offering: ActivityOffering,
  activity: ActivityOccurrence
): boolean {
  if (offering.resort.slug !== activity.resort.slug) return false;
  if (offering.activitySlug === activity.activitySlug) return true;
  if (
    offering.availability.kind === "calendar_dependent" &&
    offering.category === activity.category &&
    CALENDAR_BACKED_CATEGORY_MATCHES.has(offering.category)
  ) {
    return true;
  }
  return offering.category === activity.category && titlesMatch(offering, activity);
}

export function findNextOfferingSession(
  offering: ActivityOffering,
  activities: ActivityOccurrence[],
  referenceDate: Date = new Date()
): ActivityOccurrence | undefined {
  const sessions = activities
    .filter((activity) => activity.startDateTime && matchesOfferingSession(offering, activity))
    .sort((a, b) => (a.startDateTime ?? "").localeCompare(b.startDateTime ?? ""));

  return (
    sessions.find(
      (activity) =>
        activity.startDateTime && new Date(activity.startDateTime).getTime() >= referenceDate.getTime()
    ) ?? sessions[0]
  );
}

export function formatOfferingAvailabilityLabel(
  offering: ActivityOffering,
  nextSession?: ActivityOccurrence
): string | undefined {
  if (nextSession?.startDateTime) {
    const day = formatActivityEventDay(nextSession.startDateTime, {
      includeDate: true,
    }).label;
    return day ? `Next session: ${day}` : "Next session available";
  }

  return getPublicOfferingAvailabilityLabel(offering.availability);
}

export function formatOfferingTimingLabel(
  offering: ActivityOffering,
  nextSession?: ActivityOccurrence
): string | undefined {
  if (nextSession) {
    return getDisplayTime(occurrenceToDisplayInput(nextSession)).label;
  }

  return getPublicOfferingAvailabilityLabel(offering.availability);
}
