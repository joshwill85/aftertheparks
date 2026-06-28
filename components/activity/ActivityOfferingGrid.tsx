import { ActivityOfferingCard } from "@/components/activity/ActivityOfferingCard";
import { findNextOfferingSession } from "@/lib/activityOfferingDisplay";
import type { ActivityOccurrence, ActivityOffering } from "@/lib/types/occurrence";

export function ActivityOfferingGrid({
  offerings,
  showResort = false,
  emptyMessage = "No official recreation offerings published yet.",
  nextSessions = [],
}: {
  offerings: ActivityOffering[];
  showResort?: boolean;
  emptyMessage?: string;
  nextSessions?: ActivityOccurrence[];
}) {
  if (offerings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-card-border)] p-10 text-center">
        <p className="text-[var(--color-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="activity-offering-grid">
      {offerings.map((offering) => (
        <ActivityOfferingCard
          key={offering.offeringKey}
          offering={offering}
          showResort={showResort}
          nextSession={findNextOfferingSession(offering, nextSessions)}
        />
      ))}
    </div>
  );
}
