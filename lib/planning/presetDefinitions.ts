import {
  ageFitForActivity,
  bookingStatusForActivity,
  timeWindowForActivity,
  travelFitForActivity,
  weatherFitForActivity,
  type BookingStatus,
} from "@/lib/planning/activityFacts";
import type {
  ActivityIntentPreset,
  ActivityOccurrence,
} from "@/lib/types/occurrence";

export interface IntentPresetDefinition {
  id: ActivityIntentPreset;
  label: string;
  description: string;
  explanation: string;
  requiresHomeResort?: boolean;
}

export interface PresetMatchContext {
  homeResortSlug?: string;
}

const BOOKING_NOT_REQUIRED: BookingStatus[] = [
  "walkup_only",
  "not_required_verified",
];

const BOOKING_NEEDED: BookingStatus[] = ["required", "recommended"];

export const INTENT_PRESETS: IntentPresetDefinition[] = [
  {
    id: "at_my_resort",
    label: "At my resort",
    description: "Only activities at your selected resort.",
    explanation:
      "Requires a home resort and an exact resort match.",
    requiresHomeResort: true,
  },
  {
    id: "nearby_resort_area",
    label: "Same resort area",
    description: "Nearby means the same resort-area cluster.",
    explanation:
      "Uses the selected resort area, not walking distance from your room.",
    requiresHomeResort: true,
  },
  {
    id: "after_7_pm",
    label: "After 7 PM",
    description: "Starts at or after 7:00 PM Orlando time.",
    explanation: "Defined as 7:00 PM through 11:59 PM Orlando time.",
  },
  {
    id: "dinner_window",
    label: "5-7 PM",
    description: "Starts during the defined early-evening window.",
    explanation: "Defined as 5:00 PM up to, but not including, 7:00 PM Orlando time.",
  },
  {
    id: "rain_backup",
    label: "Rain backup",
    description: "Source-backed indoor or covered fit.",
    explanation:
      "Requires indoor/covered evidence; outdoor movies and weather-dependent activities do not qualify.",
  },
  {
    id: "no_booking_required",
    label: "No booking required",
    description: "Only when source evidence says walk-up or no reservation.",
    explanation:
      "Not inferred from missing reservation data.",
  },
  {
    id: "reservation_needed",
    label: "Reservation needed",
    description: "Reservation is required or recommended.",
    explanation:
      "Includes required and recommended booking states; cards should still show the precise status.",
  },
  {
    id: "little_kids",
    label: "Little kids",
    description: "Explicit source-backed fit for preschool or young kids.",
    explanation:
      "Requires an explicit age fit or child-oriented all-ages source text.",
  },
  {
    id: "free_today",
    label: "Free today",
    description: "Free and scheduled or available today.",
    explanation:
      "Requires a free price state and a current or dated availability signal.",
  },
  {
    id: "low_transfer",
    label: "Low transfer",
    description: "Same resort or same resort-area cluster.",
    explanation:
      "Uses resort and route clusters; it is not a walking-distance claim.",
    requiresHomeResort: true,
  },
];

export const INTENT_PRESET_IDS = new Set<ActivityIntentPreset>(
  INTENT_PRESETS.map((preset) => preset.id)
);

export function isActivityIntentPreset(
  value: string | undefined
): value is ActivityIntentPreset {
  return Boolean(value && INTENT_PRESET_IDS.has(value as ActivityIntentPreset));
}

export function presetLabel(presetId: ActivityIntentPreset): string {
  return (
    INTENT_PRESETS.find((preset) => preset.id === presetId)?.label ?? presetId
  );
}

export function itemMatchesPreset(
  activity: ActivityOccurrence,
  presetId: ActivityIntentPreset,
  context: PresetMatchContext = {}
): boolean {
  switch (presetId) {
    case "at_my_resort":
      return travelFitForActivity(activity, context).atMyResort;
    case "nearby_resort_area":
      return travelFitForActivity(activity, context).nearbyResortArea;
    case "after_7_pm":
      return timeWindowForActivity(activity).id === "after_7_pm";
    case "dinner_window":
      return timeWindowForActivity(activity).id === "dinner_window";
    case "rain_backup":
      return weatherFitForActivity(activity).rainBackup;
    case "no_booking_required":
      return BOOKING_NOT_REQUIRED.includes(
        bookingStatusForActivity(activity).status
      );
    case "reservation_needed":
      return BOOKING_NEEDED.includes(bookingStatusForActivity(activity).status);
    case "little_kids":
      return ageFitForActivity(activity).littleKids;
    case "free_today":
      return (
        activity.price.state === "free" &&
        Boolean(activity.isHappeningNow || activity.startDateTime)
      );
    case "low_transfer":
      return travelFitForActivity(activity, context).lowTransfer;
  }
}
