"use client";

import { ActivityCard } from "@/components/atlas/ActivityCard";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

export function ActivityGrid({
  activities,
  emptyMessage = "No activities match your filters.",
  showResort = true,
  onSave,
}: {
  activities: ActivityOccurrence[];
  emptyMessage?: string;
  showResort?: boolean;
  onSave?: (a: ActivityOccurrence) => void;
}) {
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-card-border)] p-12 text-center">
        <p className="text-[var(--color-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          showResort={showResort}
          onSave={onSave}
        />
      ))}
    </div>
  );
}
