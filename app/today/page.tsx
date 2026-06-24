import { Suspense } from "react";
import { TodayClient } from "@/components/atlas/TodayClient";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { Hero } from "@/components/atlas/Hero";
import { BrowseFilterShell } from "@/components/explore/BrowseFilterShell";
import { getTodayActivities, getTomorrowPreview, getResorts } from "@/lib/data/activities";
import { parseBrowseParams } from "@/lib/explore/browseParams";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseBrowseParams(params);
  const [activities, tomorrowPreview, resorts] = await Promise.all([
    getTodayActivities(filters),
    getTomorrowPreview(filters),
    getResorts(),
  ]);

  return (
    <>
      <Hero
        title="Today"
        subtitle="What's still ahead for the rest of your resort day — sorted by time."
      />
      <Suspense fallback={<ActivityGridSkeleton columns={2} />}>
        <BrowseFilterShell
          variant="today"
          resorts={resorts.map((r) => ({ slug: r.slug, name: r.name }))}
          resultCount={activities.length}
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
