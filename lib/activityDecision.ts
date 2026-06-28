import type { DisplayActivity } from "@/lib/displayActivity";
import {
  ageFitForActivity,
  bookingStatusForActivity,
} from "@/lib/planning/activityFacts";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

export type DecisionTone = "positive" | "notice" | "neutral" | "warm";

export interface DecisionSignal {
  id: "booking" | "fit";
  label: string;
  value: string;
  helper: string;
  tone: DecisionTone;
}

export interface DecisionProfile {
  whyFits?: string;
  signals: DecisionSignal[];
}

function bookingSignal(activity: ActivityOccurrence): DecisionSignal | undefined {
  const booking = bookingStatusForActivity(activity);
  if (booking.status !== "required") return undefined;

  return {
    id: "booking",
    label: "Booking",
    value: "Required",
    helper: booking.reason,
    tone: "warm",
  };
}

function fitSignal(activity: ActivityOccurrence): DecisionSignal | undefined {
  const age = ageFitForActivity(activity);
  if (!age.littleKids && !age.familyFriendly) return undefined;

  return {
    id: "fit",
    label: "Fit",
    value: age.littleKids ? "Little kids" : "Family",
    helper: age.reason,
    tone: "positive",
  };
}

export function activityDecisionProfile(
  activity: ActivityOccurrence,
  _display: DisplayActivity
): DecisionProfile {
  const booking = bookingSignal(activity);
  const fit = fitSignal(activity);
  return {
    signals: [booking, fit].filter(
      (signal): signal is DecisionSignal => Boolean(signal)
    ),
  };
}
