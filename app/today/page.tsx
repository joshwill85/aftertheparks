import { Suspense } from "react";
import { TodayClient } from "@/components/atlas/TodayClient";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { Hero } from "@/components/atlas/Hero";
import { BrowseFilterShell } from "@/components/explore/BrowseFilterShell";
import { getTodayActivities, getTomorrowPreview, getResorts } from "@/lib/data/activities";
import { parseBrowseParams } from "@/lib/explore/browseParams";
import {
  activityToFilterableItem,
  buildFilterImpact,
} from "@/lib/explore/filterImpact";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseBrowseParams(params);
  const [activities, tomorrowPreview, baseActivities, resorts] = await Promise.all([
    getTodayActivities(filters),
    getTomorrowPreview(filters),
    getTodayActivities({}),
    getResorts(),
  ]);
  const resortOptions = resorts.map((r) => ({ slug: r.slug, name: r.name }));
  const filterImpact = buildFilterImpact(
    baseActivities.map(activityToFilterableItem),
    filters,
    resortOptions
  );

  return (
    <>
      <Hero
        title="Today"
        subtitle="What's still ahead for the rest of your resort day — sorted by time."
      />
      <Suspense fallback={<ActivityGridSkeleton columns={2} />}>
        <BrowseFilterShell
          variant="today"
          resorts={resortOptions}
          resultCount={activities.length}
          filterImpact={filterImpact}
        >
          <TodayClient
            initialActivities={activities}
            tomorrowPreview={tomorrowPreview}
          />
        </BrowseFilterShell>
      </Suspense>
    </>
  );
}
