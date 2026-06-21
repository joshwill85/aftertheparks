"use client";

import { useCallback, useState } from "react";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { EmptyState } from "@/components/atlas/EmptyState";
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
        <EmptyState
          title="We don't see confirmed activities left today"
          description="Schedules change often. Try tonight's movies and campfires, browse free activities, or check the official resort guide before heading out."
          actions={[
            { label: "Tonight's movies", href: "/tonight", variant: "primary" },
            { label: "Free activities", href: "/activities?free=true" },
            { label: "Browse by resort", href: "/resorts" },
            { label: "Explore all", href: "/activities" },
          ]}
        />
      </PalmRefresh>
    );
  }

  return (
    <PalmRefresh onRefresh={refresh}>
      <div className="relative">
        <div
          className="absolute bottom-0 left-4 top-0 w-0.5 bg-gradient-to-b from-[var(--color-citrus)] via-[var(--accent)] to-[var(--color-lantern)]"
          aria-hidden
        />
        <ul className="space-y-6 pl-10">
          {activities.map((activity) => (
            <li key={activity.id} className="relative">
              <span
                className="absolute -left-[1.85rem] top-6 flex h-3 w-3 rounded-full bg-[var(--accent)] ring-4 ring-[var(--color-card)]"
                aria-hidden
              />
              <p className="mb-2 text-sm font-medium text-[var(--color-muted)]">
                {formatOrlandoTime(activity.startDateTime)}
              </p>
              <ActivityCard activity={activity} showResort onSave={addActivity} />
            </li>
          ))}
        </ul>
      </div>
    </PalmRefresh>
  );
}
