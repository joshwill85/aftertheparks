"use client";

import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { ActivityOfferingGrid } from "@/components/activity/ActivityOfferingGrid";
import { usePlan } from "@/components/atlas/PlanProvider";
import { ExplorePlanRail } from "@/components/explore/ExplorePlanRail";
import { BrowseFilterShell } from "@/components/explore/BrowseFilterShell";
import type { FilterImpact } from "@/lib/explore/filterImpact";
import type { ActivityOffering, ActivityOccurrence } from "@/lib/types/occurrence";

interface ExploreLayoutProps {
  activities: ActivityOccurrence[];
  officialOfferings: ActivityOffering[];
  resorts: { slug: string; name: string }[];
  filterImpact: FilterImpact;
}

export function ExploreLayout({
  activities,
  officialOfferings,
  resorts,
  filterImpact,
}: ExploreLayoutProps) {
  const { addActivity } = usePlan();

  return (
    <div className="min-[1280px]:grid min-[1280px]:grid-cols-[minmax(0,1fr)_300px] min-[1280px]:gap-6">
      <BrowseFilterShell
        variant="explore"
        resorts={resorts}
        resultCount={activities.length + officialOfferings.length}
        filterImpact={filterImpact}
      >
        {(activities.length > 0 || officialOfferings.length === 0) && (
          <div className={officialOfferings.length > 0 ? "results-grid mb-8" : "results-grid"}>
            <ActivityGrid
              activities={activities}
              onSave={addActivity}
              columns={2}
              className="explore-activity-grid"
              emptyMessage="No activities match your filters. Try broadening your search."
            />
          </div>
        )}

        {officialOfferings.length > 0 && (
          <section
            id="official-offerings"
            className="mb-8 space-y-4"
            aria-labelledby="official-offerings-heading"
          >
            <div>
              <h2
                id="official-offerings-heading"
                className="font-display text-2xl font-semibold"
              >
                Other resort recreation
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Disney recreation listings from official sources that are not
                tied to a dated calendar time.
              </p>
            </div>
            <ActivityOfferingGrid
              offerings={officialOfferings}
              showResort
              emptyMessage="No official recreation offerings match your filters."
            />
          </section>
        )}
      </BrowseFilterShell>

      <ExplorePlanRail />
    </div>
  );
}
