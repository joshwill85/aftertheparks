import {
  getTrustState,
  occurrenceToDisplayInput,
  TRUST_STATE_LABELS,
  type TrustState,
} from "@/lib/activityDisplay";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { cn } from "@/lib/utils";

const TRUST_STYLES: Record<TrustState, string> = {
  verified: "bg-[#2f8e5b]/12 text-[#2f8e5b]",
  recently_updated: "bg-[#2f8e5b]/12 text-[#2f8e5b]",
  confirm_before_going: "bg-[#ffc857]/22 text-[#7a4a00]",
  time_unclear: "bg-[#ffc857]/22 text-[#7a4a00]",
  price_unclear: "bg-[#ffc857]/22 text-[#7a4a00]",
  source_unclear: "bg-[#ffc857]/22 text-[#7a4a00]",
  weather_dependent: "bg-[var(--color-lagoon)]/13 text-[var(--color-lagoon)]",
};

interface TrustBadgeProps {
  activity: ActivityOccurrence;
  className?: string;
}

export function shouldRenderTrustBadge(activity: ActivityOccurrence): boolean {
  const state = getTrustState(occurrenceToDisplayInput(activity));
  return (
    state !== "verified" &&
    state !== "recently_updated" &&
    state !== "price_unclear"
  );
}

export function TrustBadge({ activity, className }: TrustBadgeProps) {
  const state = getTrustState(occurrenceToDisplayInput(activity));
  if (
    state === "verified" ||
    state === "recently_updated" ||
    state === "price_unclear"
  ) {
    return null;
  }

  const label = TRUST_STATE_LABELS[state];

  return (
    <span
      className={cn(
        "trust-note inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.76rem] font-bold",
        "trust-warning",
        TRUST_STYLES[state],
        className
      )}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-[#b56b00]"
        aria-hidden
      />
      {label}
    </span>
  );
}
