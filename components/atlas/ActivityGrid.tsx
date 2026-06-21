"use client";

import { ActivityCard } from "@/components/activity/ActivityCard";
import { EventCardList, EventCardListItem } from "@/components/events/EventCardList";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

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
    <EventCardList columns={columns === 2 ? 2 : 1}>
      {activities.map((activity) => (
        <EventCardListItem key={activity.id}>
          <ActivityCard
            activity={activity}
            showResort={showResort}
            onSave={onSave}
          />
        </EventCardListItem>
      ))}
    </EventCardList>
  );
}
