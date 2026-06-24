import { differenceInMinutes, isAfter, isBefore } from "date-fns";
import type { PlanItem } from "@/lib/types/occurrence";

export type LivingState =
  | "happening_now"
  | "starts_soon"
  | "tonight"
  | "tomorrow"
  | "schedule_changed"
  | "recently_verified"
  | null;

export function getLivingState(
  item: PlanItem,
  now = new Date()
): LivingState {
  if (item.sourceStatus === "changed") return "schedule_changed";

  if (item.startDateTime) {
    const start = new Date(item.startDateTime);
    const end = item.endDateTime ? new Date(item.endDateTime) : null;

    if (end && isAfter(now, start) && isBefore(now, end)) {
      return "happening_now";
    }

    const mins = differenceInMinutes(start, now);
    if (mins > 0 && mins <= 90) return "starts_soon";
  }

  if (item.sourceVerifiedAt) {
    const verified = new Date(item.sourceVerifiedAt);
    const days = differenceInMinutes(now, verified) / (60 * 24);
    if (days <= 14) return "recently_verified";
  }

  return null;
}

export function livingStateLabel(state: LivingState): string | null {
  switch (state) {
    case "happening_now":
      return "Happening now";
    case "starts_soon":
      return "Starts soon";
    case "schedule_changed":
      return "Schedule changed";
    case "recently_verified":
      return "Recently verified";
    default:
      return null;
  }
}
