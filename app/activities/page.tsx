import { Suspense } from "react";
import { Hero } from "@/components/atlas/Hero";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { ExploreLayout } from "@/components/explore/ExploreLayout";
import { getFilteredActivities, getResorts } from "@/lib/data/activities";
import {
  filterOfficialOfferingsWithoutActivityCollisions,
  getFilteredOfficialOfferings,
} from "@/lib/data/officialOfferings";
import { parseBrowseParams } from "@/lib/explore/browseParams";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ActivitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseBrowseParams(params);
  const [activities, officialOfferingsPool, resorts] = await Promise.all([
    getFilteredActivities(filters),
    getFilteredOfficialOfferings(filters),
    getResorts(),
  ]);
  const officialOfferings = filterOfficialOfferingsWithoutActivityCollisions(
    officialOfferingsPool,
    activities
  );

  return (
    <>
      <Hero
        title="Explore activities"
        subtitle="Discover resort moments by mood, resort, and time of day — curated for rest days between park visits."
      />
      <Suspense fallback={<ActivityGridSkeleton columns={2} />}>
        <ExploreLayout
          activities={activities}
          officialOfferings={officialOfferings}
          resorts={resorts.map((r) => ({ slug: r.slug, name: r.name }))}
        />
      </Suspense>
    </>
  );
}
