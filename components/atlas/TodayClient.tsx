"use client";

import { useCallback, useState } from "react";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { ActivityCard } from "@/components/atlas/ActivityCard";
import { PalmRefresh } from "@/components/magic/PalmRefresh";
import { formatOrlandoTime } from "@/lib/daypart";
import { usePlan } from "@/components/atlas/PlanProvider";

export function TodayClient({
  initialActivities,
}: {
  initialActivities: ActivityOccurrence[];
}) {
  const [activities, setActivities] = useState(initialActivities);
  const { addActivity } = usePlan();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/today");
    const data = await res.json();
    setActivities(data.activities ?? []);
  }, []);

  if (activities.length === 0) {
    return (
      <PalmRefresh onRefresh={refresh}>
        <p className="rounded-2xl border border-dashed border-[var(--color-card-border)] p-12 text-center text-[var(--color-muted)]">
          Nothing scheduled for the rest of today. Check Tonight or Explore for more.
        </p>
      </PalmRefresh>
    );
  }

  return (
    <PalmRefresh onRefresh={refresh}>
      <div className="relative">
        <div
          className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--color-citrus)] via-[var(--accent)] to-[var(--color-lantern)]"
          aria-hidden
        />
        <ul className="space-y-6 pl-10">
          {activities.map((activity, i) => (
            <li key={activity.id} className="relative">
              <span
                className="absolute -left-[1.85rem] top-6 flex h-3 w-3 rounded-full bg-[var(--accent)] ring-4 ring-[var(--color-card)]"
                aria-hidden
              />
              <p className="mb-2 text-sm font-medium text-[var(--color-muted)]">
                {formatOrlandoTime(activity.startDateTime)}
              </p>
              <ActivityCard
                activity={activity}
                showResort
                onSave={addActivity}
              />
            </li>
          ))}
        </ul>
      </div>
    </PalmRefresh>
  );
}
