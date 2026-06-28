import type { DisplayActivity } from "@/lib/displayActivity";
import type { ActivityOccurrence, ActivityOffering } from "@/lib/types/occurrence";

export type DecisionTone = "positive" | "notice" | "neutral" | "warm";

export interface DecisionSignal {
  id: "time" | "cost";
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
  const cost = costSignal(activity.price.state);
  return {
    signals: [time, cost].filter((signal): signal is DecisionSignal => Boolean(signal)),
  };
}
