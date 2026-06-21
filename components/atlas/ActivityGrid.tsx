"use client";

import { ActivityCard } from "@/components/activity/ActivityCard";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { cn } from "@/lib/utils";

export function ActivityGrid({
  activities,
  emptyMessage = "No activities match your filters.",
  showResort = true,
  onSave,
  columns = 1,
}: {
  activities: ActivityOccurrence[];
  emptyMessage?: string;
  showResort?: boolean;
  onSave?: (a: ActivityOccurrence) => void;
  columns?: 1 | 2;
}) {
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-card-border)] p-12 text-center">
        <p className="text-[var(--color-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 ? "md:grid-cols-2" : "grid-cols-1"
      )}
    >
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
