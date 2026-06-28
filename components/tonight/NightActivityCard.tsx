"use client";

import { EventCard } from "@/components/events/EventCard";
import { usePlan } from "@/components/atlas/PlanProvider";
import { toDisplayActivity } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import type { WeatherForTimeSpan } from "@/lib/weather/types";

interface NightActivityCardProps {
  activity: ActivityOccurrence;
  onSave?: (activity: ActivityOccurrence) => void;
  weatherSummary?: WeatherForTimeSpan | null;
}

export function NightActivityCard({
  activity,
  onSave,
  weatherSummary,
}: NightActivityCardProps) {
  const { addActivity, isActivitySaved } = usePlan();
  const display = toDisplayActivity(activity);
  const card = activityToEventCard(activity, display, {
    showResort: true,
    variant: "day",
  });
  const handleSave = () => {
    if (onSave) {
      onSave(activity);
      return;
    }
    addActivity(activity);
  };

  return (
    <EventCard
      {...card}
      weatherSummary={weatherSummary}
      saved={isActivitySaved(activity)}
      onSave={handleSave}
    />
  );
}
