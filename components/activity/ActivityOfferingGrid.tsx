import { ActivityOfferingCard } from "@/components/activity/ActivityOfferingCard";
import type { ActivityOffering } from "@/lib/types/occurrence";

export function ActivityOfferingGrid({
  offerings,
  showResort = false,
  emptyMessage = "No official recreation offerings published yet.",
}: {
  offerings: ActivityOffering[];
  showResort?: boolean;
  emptyMessage?: string;
}) {
  if (offerings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-card-border)] p-10 text-center">
        <p className="text-[var(--color-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {offerings.map((offering) => (
        <ActivityOfferingCard
          key={offering.offeringKey}
          offering={offering}
          showResort={showResort}
        />
      ))}
    </div>
  );
}
