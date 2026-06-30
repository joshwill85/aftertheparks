import { toZonedTime } from "date-fns-tz";
import {
  DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG,
  isPrimaryRainyDayFit,
  type WeatherFit,
} from "@/lib/seo/fit";
import { inferWeatherFitFromText } from "@/lib/explore/weatherFit";
import {
  areaFilterForResort,
  resortAreaMatchesOrigin,
} from "@/lib/explore/routeTaxonomy";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

const ORLANDO_TZ = "America/New_York";

export type FactConfidence = "verified" | "inferred" | "text_match" | "unknown";

export type BookingStatus =
  | "required"
  | "recommended"
  | "walkup_only"
  | "not_required_verified"
  | "unknown";

export interface BookingFact {
  status: BookingStatus;
  label: string;
  confidence: Extract<FactConfidence, "verified" | "inferred" | "unknown">;
  reason: string;
}

export interface AgeFitFact {
  littleKids: boolean;
  familyFriendly: boolean;
  minAge?: number;
  maxAge?: number;
  confidence: Extract<FactConfidence, "verified" | "text_match" | "unknown">;
  reason: string;
}

export interface TimeWindowFact {
  id:
    | "now"
    | "dinner_window"
    | "after_7_pm"
    | "daytime"
    | "flexible"
    | "unknown";
  label: string;
  reason: string;
}

export interface TravelFitFact {
  atMyResort: boolean;
  nearbyResortArea: boolean;
  lowTransfer: boolean;
  reason: string;
}

export interface WeatherFitFact {
  rainBackup: boolean;
  label: string;
  reason: string;
}

function hasEvidence(activity: ActivityOccurrence, key: string): boolean {
  const claim = activity.claims?.[key];
  return Array.isArray(claim?.evidence) && claim.evidence.length > 0;
}

export function bookingStatusForActivity(
  activity: ActivityOccurrence
): BookingFact {
  if (
    activity.eligibility.reservation?.required ||
    activity.enrichment?.reservationRequired
  ) {
    return {
      status: "required",
      label: "Reservation required",
      confidence: "verified",
      reason: "Reservation required. Confirm availability before you go.",
    };
  }

  if (activity.enrichment?.reservationRecommended) {
    return {
      status: "recommended",
      label: "Reservation recommended",
      confidence: "verified",
      reason: "Reservation recommended. Confirm availability before you go.",
    };
  }

  if (
    activity.enrichment?.walkUpsAllowed &&
    activity.enrichment.reservationRequired === false &&
    (hasEvidence(activity, "booking") || hasEvidence(activity, "reservation"))
  ) {
    return {
      status: "walkup_only",
      label: "Walk-up only",
      confidence: "verified",
      reason:
        "Source evidence says walk-ups are allowed and reservations are not required.",
    };
  }

  if (
    activity.enrichment?.reservationRequired === false &&
    (hasEvidence(activity, "booking") || hasEvidence(activity, "reservation"))
  ) {
    return {
      status: "not_required_verified",
      label: "No booking required",
      confidence: "verified",
      reason: "Source evidence says no reservation is required.",
    };
  }

  return {
    status: "unknown",
    label: "Booking unclear",
    confidence: "unknown",
    reason: "No clear booking status is available.",
  };
}

function parseAgeRange(text: string): { minAge?: number; maxAge?: number } {
  const range = text.match(
    /\bages?\s+(\d{1,2})\s*(?:-|to|–|—)\s*(\d{1,2})\b/i
  );
  if (range) return { minAge: Number(range[1]), maxAge: Number(range[2]) };

  const plus =
    text.match(/\bages?\s+(\d{1,2})\s*(?:and|&)?\s*up\b/i) ??
    text.match(/\b(\d{1,2})\s*(?:and|&)?\s*up\b/i);
  if (plus) return { minAge: Number(plus[1]) };

  return {};
}

export function ageFitForActivity(activity: ActivityOccurrence): AgeFitFact {
  const ageMinimum = activity.enrichment?.ageMinimum;
  if (ageMinimum != null) {
    return {
      littleKids: ageMinimum <= 5,
      familyFriendly: ageMinimum <= 12,
      minAge: ageMinimum,
      confidence: "verified",
      reason: `Minimum age is ${ageMinimum}.`,
    };
  }

  const text = `${activity.summary} ${activity.scheduleText ?? ""}`.toLowerCase();
  const parsed = parseAgeRange(text);
  if (parsed.minAge != null || parsed.maxAge != null) {
    const minAge = parsed.minAge ?? 0;
    const maxAge = parsed.maxAge ?? 99;
    return {
      littleKids: minAge <= 5 && maxAge <= 12,
      familyFriendly: minAge <= 12,
      minAge: parsed.minAge,
      maxAge: parsed.maxAge,
      confidence: "text_match",
      reason: "Source text contains an explicit age range.",
    };
  }

  if (/\ball ages\b|\bguests of all ages\b/.test(text)) {
    return {
      littleKids: [
        "arts_crafts",
        "scavenger_hunt",
        "poolside",
        "arcade",
      ].includes(activity.category),
      familyFriendly: true,
      confidence: "text_match",
      reason:
        "Source text says all ages; little-kid fit only applies to child-oriented categories.",
    };
  }

  return {
    littleKids: false,
    familyFriendly: false,
    confidence: "unknown",
    reason: "No explicit age fit is available.",
  };
}

export function timeWindowForActivity(activity: ActivityOccurrence): TimeWindowFact {
  if (activity.isHappeningNow) {
    return {
      id: "now",
      label: "Happening now",
      reason: "Availability state marks this as happening now.",
    };
  }

  const startWindow = timeWindowIdForStart(activity.startDateTime);
  if (startWindow === "unknown") {
    return {
      id: "flexible",
      label: "Flexible timing",
      reason: "No exact start time is available.",
    };
  }

  if (startWindow === "after_7_pm") {
    return {
      id: "after_7_pm",
      label: "After 7 PM",
      reason: "Start time is at or after 7:00 PM Orlando time.",
    };
  }

  if (startWindow === "dinner_window") {
    return {
      id: "dinner_window",
      label: "5-7 PM",
      reason: "Start time falls in the defined 5:00-7:00 PM Orlando window.",
    };
  }

  return {
    id: "daytime",
    label: "Daytime",
    reason: "Start time is before 5:00 PM Orlando time.",
  };
}

export function timeWindowIdForStart(
  startDateTime?: string
): "after_7_pm" | "dinner_window" | "daytime" | "unknown" {
  if (!startDateTime) return "unknown";

  const zoned = toZonedTime(new Date(startDateTime), ORLANDO_TZ);
  const minutes = zoned.getHours() * 60 + zoned.getMinutes();

  if (minutes >= 19 * 60 && minutes <= 23 * 60 + 59) return "after_7_pm";
  if (minutes >= 17 * 60 && minutes < 19 * 60) return "dinner_window";
  return "daytime";
}

export function travelFitForActivity(
  activity: ActivityOccurrence,
  options: { homeResortSlug?: string } = {}
): TravelFitFact {
  const homeResortSlug = options.homeResortSlug;
  const atMyResort = Boolean(homeResortSlug && activity.resort.slug === homeResortSlug);
  const nearbyResortArea = Boolean(
    homeResortSlug &&
      resortAreaMatchesOrigin(
        homeResortSlug,
        activity.resort.slug,
        activity.resort.area
      )
  );

  return {
    atMyResort,
    nearbyResortArea,
    lowTransfer: atMyResort || nearbyResortArea,
    reason: atMyResort
      ? "Activity is at the selected home resort."
      : nearbyResortArea
        ? `Activity is in the same resort area (${
            areaFilterForResort(activity.resort.slug, activity.resort.area) ??
            "unknown"
          }).`
        : "Activity requires leaving the selected resort area or no home resort is set.",
  };
}

export function weatherFitForActivity(activity: ActivityOccurrence): WeatherFitFact {
  const resolvedFit = weatherFitValueForActivity(activity);
  const rainBackup = resolvedFit === "indoor" || resolvedFit === "covered";

  return {
    rainBackup,
    label: rainBackup ? "Rain backup" : "Weather check",
    reason: rainBackup
      ? "Weather fit is indoor or covered."
      : "No indoor or covered rain-backup fit is available.",
  };
}

export function weatherFitValueForActivity(
  activity: ActivityOccurrence
): WeatherFit | undefined {
  const explicit = activity.enrichment?.weatherDependency;
  const fit = DEFAULT_ACTIVITY_SEO_FIT_BY_SLUG[activity.activitySlug];
  if (explicit === "indoor" || explicit === "covered") return explicit;
  if (fit) return fit.weatherFit;
  return inferWeatherFitFromText({
    title: activity.title,
    category: activity.category,
    summary: activity.summary,
    location: activity.location.label,
    weatherDependency: activity.enrichment?.weatherDependency,
  });
}
