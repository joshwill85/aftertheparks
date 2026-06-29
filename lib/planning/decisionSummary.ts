import {
  INTENT_PRESETS,
  itemMatchesPreset,
} from "@/lib/planning/presetDefinitions";
import type {
  ActivityIntentPreset,
  ActivityOccurrence,
} from "@/lib/types/occurrence";

export interface DecisionSummaryAction {
  id: ActivityIntentPreset;
  label: string;
  href: string;
  count: number;
  explanation: string;
}

export interface DecisionSummary {
  primaryText: string;
  trustText: string;
  actions: DecisionSummaryAction[];
}

export type DecisionSummaryScope =
  | "activities"
  | "today"
  | "tonight"
  | "weather"
  | "resort";

const ACTION_ORDER_BY_SCOPE: Record<
  DecisionSummaryScope,
  ActivityIntentPreset[]
> = {
  activities: [
    "at_my_resort",
    "rain_backup",
    "after_7_pm",
    "no_booking_required",
    "little_kids",
  ],
  today: [
    "at_my_resort",
    "rain_backup",
    "free_today",
    "little_kids",
    "no_booking_required",
  ],
  tonight: [
    "at_my_resort",
    "after_7_pm",
    "rain_backup",
    "no_booking_required",
  ],
  weather: ["rain_backup", "at_my_resort", "low_transfer"],
  resort: [
    "at_my_resort",
    "after_7_pm",
    "rain_backup",
    "no_booking_required",
  ],
};

function verifiedCount(activities: ActivityOccurrence[]): number {
  return activities.filter((activity) => activity.freshness.badge === "verified")
    .length;
}

export function buildDecisionSummary({
  activities,
  homeResortSlug,
  scope,
}: {
  activities: ActivityOccurrence[];
  homeResortSlug?: string;
  scope: DecisionSummaryScope;
}): DecisionSummary {
  const actionOrder = ACTION_ORDER_BY_SCOPE[scope];
  const actions = actionOrder
    .map((id) => {
      const preset = INTENT_PRESETS.find((item) => item.id === id);
      if (!preset) return null;
      if (preset.requiresHomeResort && !homeResortSlug) return null;

      const count = activities.filter((activity) =>
        itemMatchesPreset(activity, id, { homeResortSlug })
      ).length;
      if (count === 0) return null;

      return {
        id,
        label: preset.label,
        href: `?preset=${id}`,
        count,
        explanation: preset.explanation,
      };
    })
    .filter((value): value is DecisionSummaryAction => Boolean(value));

  const verified = verifiedCount(activities);

  return {
    primaryText:
      activities.length > 0
        ? `${activities.length} verified options are ready to narrow.`
        : "No verified options match this view yet.",
    trustText:
      verified > 0
        ? `${verified} verified rows; confirm times before heading out.`
        : "Times and source freshness are verified where shown; confirm before heading out.",
    actions,
  };
}
