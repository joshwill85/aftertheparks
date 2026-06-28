import type { DisplayActivity } from "@/lib/displayActivity";
import {
  ageFitForActivity,
  bookingStatusForActivity,
  weatherFitForActivity,
  type BookingStatus,
} from "@/lib/planning/activityFacts";
import type { ActivityOccurrence, ActivityOffering } from "@/lib/types/occurrence";

export type DecisionTone = "positive" | "notice" | "neutral" | "warm";

export interface DecisionSignal {
  id: "time" | "place" | "weather" | "cost" | "booking" | "fit";
  label: string;
  value: string;
  helper: string;
  tone: DecisionTone;
}

export interface DecisionProfile {
  whyFits?: string;
  signals: DecisionSignal[];
}

function costSignal(
  state: ActivityOccurrence["price"]["state"]
): DecisionSignal | undefined {
  if (state === "free") {
    return {
      id: "cost",
      label: "Cost",
      value: "Free",
      helper: "The current guide lists this as free.",
      tone: "positive",
    };
  }
  if (state === "fee") {
    return {
      id: "cost",
      label: "Cost",
      value: "Paid",
      helper: "Budget a little extra before you go.",
      tone: "warm",
    };
  }
  return undefined;
}

function offeringTimeSignal(offering: ActivityOffering): DecisionSignal {
  if (offering.availability.kind === "evergreen_all_day") {
    return {
      id: "time",
      label: "Timing",
      value: "Flexible",
      helper: "Works well as a gap filler.",
      tone: "positive",
    };
  }
  if (offering.availability.kind === "reservation_based") {
    return {
      id: "time",
      label: "Timing",
      value: "Bookable",
      helper: "Timing depends on reservation availability.",
      tone: "warm",
    };
  }
  return {
    id: "time",
    label: "Timing",
    value: "Check hours",
    helper: offering.availability.label ?? "Confirm the latest operating window.",
    tone: "neutral",
  };
}

function weatherSignal(activity: ActivityOccurrence): DecisionSignal {
  const weather = weatherFitForActivity(activity);
  return {
    id: "weather",
    label: "Weather",
    value: weather.rainBackup ? "Backup fit" : "Check forecast",
    helper: weather.reason,
    tone: weather.rainBackup ? "positive" : "neutral",
  };
}

function bookingValue(status: BookingStatus): string {
  switch (status) {
    case "required":
      return "Required";
    case "recommended":
      return "Recommended";
    case "walkup_only":
      return "Walk-up";
    case "not_required_verified":
      return "No booking";
    case "unknown":
      return "Unclear";
  }
}

function bookingTone(status: BookingStatus): DecisionTone {
  switch (status) {
    case "required":
    case "recommended":
      return "warm";
    case "walkup_only":
    case "not_required_verified":
      return "positive";
    case "unknown":
      return "neutral";
  }
}

function bookingSignal(activity: ActivityOccurrence): DecisionSignal {
  const booking = bookingStatusForActivity(activity);
  return {
    id: "booking",
    label: "Booking",
    value: bookingValue(booking.status),
    helper: booking.reason,
    tone: bookingTone(booking.status),
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

function activityTimeSignal(activity: ActivityOccurrence, display: DisplayActivity): DecisionSignal {
  if (display.timeUncertain) {
    return {
      id: "time",
      label: "Timing",
      value: "Confirm",
      helper: "Published timing needs one last check.",
      tone: "notice",
    };
  }
  if (activity.isHappeningNow) {
    return {
      id: "time",
      label: "Timing",
      value: "Now",
      helper: "Worth acting on quickly if it fits.",
      tone: "positive",
    };
  }
  return {
    id: "time",
    label: "Timing",
    value: display.timeLabel ?? "Flexible",
    helper: activity.startDateTime ? "Scheduled enough to plan around." : "Good as a flexible option.",
    tone: activity.startDateTime ? "positive" : "neutral",
  };
}

export function offeringDecisionProfile(offering: ActivityOffering): DecisionProfile {
  const time = offeringTimeSignal(offering);
  const cost = costSignal(offering.price.state);
  return {
    signals: [time, cost].filter((signal): signal is DecisionSignal => Boolean(signal)),
  };
}

export function activityDecisionProfile(
  activity: ActivityOccurrence,
  display: DisplayActivity
): DecisionProfile {
  const time = activityTimeSignal(activity, display);
  const weather = weatherSignal(activity);
  const cost = costSignal(activity.price.state);
  const booking = bookingSignal(activity);
  const fit = fitSignal(activity);
  return {
    signals: [time, weather, cost, booking, fit].filter(
      (signal): signal is DecisionSignal => Boolean(signal)
    ),
  };
}
