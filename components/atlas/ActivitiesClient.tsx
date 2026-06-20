"use client";

import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { usePlan } from "@/components/atlas/PlanProvider";

export function ActivitiesClient({
  initialActivities,
}: {
  initialActivities: ActivityOccurrence[];
}) {
  const { addActivity } = usePlan();

  return (
    <ActivityGrid
      activities={initialActivities}
      onSave={addActivity}
      emptyMessage="No activities match your filters. Try broadening your search."
    />
  );
}
