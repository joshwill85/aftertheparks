"use client";

import type { ActivityOccurrence, MovieNightOccurrence } from "@/lib/types/occurrence";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { usePlan } from "@/components/atlas/PlanProvider";
import { useDaypart } from "@/components/atlas/DaypartProvider";
import { useEffect } from "react";

export function TonightClient({
  activities,
  movieNights,
}: {
  activities: ActivityOccurrence[];
  movieNights: MovieNightOccurrence[];
}) {
  const { addActivity } = usePlan();
  const { setForceDaypart } = useDaypart();

  useEffect(() => {
    setForceDaypart("evening");
    return () => setForceDaypart(null);
  }, [setForceDaypart]);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display mb-4 text-2xl font-semibold">
          Evening activities
        </h2>
        <ActivityGrid
          activities={activities}
          onSave={addActivity}
          emptyMessage="No evening activities found for tonight. Explore all activities or check back after the next schedule update."
        />
      </section>

      <section>
        <h2 className="font-display mb-4 text-2xl font-semibold">
          Movies under the stars
        </h2>
        {movieNights.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {movieNights.map((mn) => (
              <div
                key={mn.id}
                className="film-strip rounded-2xl border-2 border-[var(--color-card-border)] bg-[var(--color-card)] p-5"
              >
                <p className="text-xs uppercase tracking-wide text-[var(--color-porch-light)]">
                  {mn.dayOfWeek}
                </p>
                <h3 className="font-display mt-1 text-lg font-semibold">
                  {mn.movieTitle}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {mn.resortName}
                  {mn.location && ` · ${mn.location}`}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--color-card-border)] p-8 text-center text-[var(--color-muted)]">
            Movie schedules are updating — outdoor cinema listings will appear here
            as we verify each resort&apos;s calendar.
          </p>
        )}
      </section>
    </div>
  );
}
