"use client";

import { ActivityCard } from "@/components/activity/ActivityCard";
import { EventCardList, EventCardListItem } from "@/components/events/EventCardList";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import type { WeatherForTimeSpan } from "@/lib/weather/types";

export function ActivityGrid({
  activities,
  emptyMessage = "No activities match your filters.",
  showResort = true,
  onSave,
  columns = 1,
  weatherById,
  className,
}: {
  activities: ActivityOccurrence[];
  emptyMessage?: string;
  showResort?: boolean;
  onSave?: (a: ActivityOccurrence) => void;
  columns?: 1 | 2;
  weatherById?: Record<string, WeatherForTimeSpan>;
  className?: string;
}) {
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-card-border)] p-12 text-center">
        <p className="text-[var(--color-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <EventCardList columns={columns === 2 ? 2 : 1} className={className}>
      {activities.map((activity) => (
        <EventCardListItem key={activity.id}>
          <ActivityCard
            activity={activity}
            showResort={showResort}
            onSave={onSave}
            weatherSummary={weatherById?.[activity.id] ?? null}
          />
        </EventCardListItem>
      ))}
    </EventCardList>
  );
}
