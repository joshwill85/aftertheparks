import type { DisplayActivity } from "@/lib/displayActivity";
import type { ActivityOccurrence, ActivityOffering } from "@/lib/types/occurrence";

export type DecisionTone = "positive" | "notice" | "neutral" | "warm";

export interface DecisionSignal {
  id: "time" | "cost" | "effort";
  label: string;
  value: string;
  helper: string;
  tone: DecisionTone;
}

export interface DecisionProfile {
  whyFits: string;
  signals: DecisionSignal[];
}

function costSignal(state: ActivityOccurrence["price"]["state"]): DecisionSignal {
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
  return {
    id: "cost",
    label: "Cost",
    value: "Ask first",
    helper: "Pricing is not clear enough to promise.",
    tone: "notice",
  };
}

function offeringEffortSignal(offering: ActivityOffering): DecisionSignal {
  if (offering.booking?.reservationRequired) {
    return {
      id: "effort",
      label: "Effort",
      value: "Reservation",
      helper: "Plan ahead before promising it to the group.",
      tone: "notice",
    };
  }
  if (offering.booking?.reservationRecommended) {
    return {
      id: "effort",
      label: "Effort",
      value: "Reserve if set",
      helper: "Likely easier with a quick call or booking step.",
      tone: "warm",
    };
  }
  if (offering.eligibility.resortGuestOnly) {
    return {
      id: "effort",
      label: "Effort",
      value: "Guest-only",
      helper: "Best if you are staying at this resort.",
      tone: "neutral",
    };
  }
  return {
    id: "effort",
    label: "Effort",
    value: "Low",
    helper: "Easy to consider without much setup.",
    tone: "positive",
  };
}

function activityEffortSignal(activity: ActivityOccurrence): DecisionSignal {
  if (activity.eligibility.reservation?.required || activity.enrichment?.reservationRequired) {
    return {
      id: "effort",
      label: "Effort",
      value: "Reservation",
      helper: "Book or confirm before building the evening around it.",
      tone: "notice",
    };
  }
  if (activity.enrichment?.reservationRecommended) {
    return {
      id: "effort",
      label: "Effort",
      value: "Reserve if set",
      helper: "A small planning step may make this smoother.",
      tone: "warm",
    };
  }
  if (activity.enrichment?.walkUpsAllowed) {
    return {
      id: "effort",
      label: "Effort",
      value: "Walk-up",
      helper: "Good candidate when plans are flexible.",
      tone: "positive",
    };
  }
  if (activity.enrichment?.resortGuestOnly || activity.enrichment?.poolGated) {
    return {
      id: "effort",
      label: "Effort",
      value: "Guest-only",
      helper: "Make sure your group has access.",
      tone: "neutral",
    };
  }
  return {
    id: "effort",
    label: "Effort",
    value: "Low",
    helper: "Easy to keep as an option.",
    tone: "positive",
  };
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

function effortPhrase(value: string): string {
  if (value === "Low") return "low";
  if (value === "Walk-up") return "walk-up friendly";
  return value.toLowerCase();
}

function timingPhrase(value: string): string {
  if (value === "Check hours") return "check-hours";
  if (value === "Bookable") return "reservation-based";
  if (value === "Flexible") return "flexible";
  if (value === "Confirm") return "one last timing check";
  if (value === "Now") return "right-now timing";
  return "scheduled";
}

export function offeringDecisionProfile(offering: ActivityOffering): DecisionProfile {
  const effort = offeringEffortSignal(offering);
  const time = offeringTimeSignal(offering);
  return {
    whyFits: `${offering.title} works well at ${offering.resort.name} when you want ${effortPhrase(effort.value)} planning and ${timingPhrase(time.value)} timing.`,
    signals: [
      time,
      costSignal(offering.price.state),
      effort,
    ],
  };
}

export function activityDecisionProfile(
  activity: ActivityOccurrence,
  display: DisplayActivity
): DecisionProfile {
  const effort = activityEffortSignal(activity);
  const time = activityTimeSignal(activity, display);
  return {
    whyFits: `${display.title} works well for ${display.categoryLabel.toLowerCase()} at ${display.resortName} with ${effortPhrase(effort.value)} planning.`,
    signals: [
      time,
      costSignal(activity.price.state),
      effort,
    ],
  };
}
