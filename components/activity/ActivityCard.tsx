"use client";

import { EventCard } from "@/components/events/EventCard";
import { usePlan } from "@/components/atlas/PlanProvider";
import { toDisplayActivity } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

interface ActivityCardProps {
  activity: ActivityOccurrence;
  showResort?: boolean;
  onSave?: (activity: ActivityOccurrence) => void;
}

export function ActivityCard({
  activity,
  showResort = true,
  onSave,
}: ActivityCardProps) {
  const { isInPlan } = usePlan();
  const display = toDisplayActivity(activity);
  const card = activityToEventCard(activity, display, {
    showResort,
    variant: "day",
  });

  return (
    <EventCard
      {...card}
      saved={isInPlan(activity.activityCatalogId)}
      onSave={onSave ? () => onSave(activity) : undefined}
    />
  );
}
