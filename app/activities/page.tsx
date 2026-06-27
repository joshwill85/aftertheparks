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
import {
  activityToFilterableItem,
  buildFilterImpact,
  offeringToFilterableItem,
} from "@/lib/explore/filterImpact";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ActivitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseBrowseParams(params);
  const [
    activities,
    officialOfferingsPool,
    baseActivities,
    baseOfficialOfferings,
    resorts,
  ] = await Promise.all([
    getFilteredActivities(filters),
    getFilteredOfficialOfferings(filters),
    getFilteredActivities({ limit: 500 }),
    getFilteredOfficialOfferings({ limit: 500 }),
    getResorts(),
  ]);
  const officialOfferings = filterOfficialOfferingsWithoutActivityCollisions(
    officialOfferingsPool,
    activities
  );
  const resortOptions = resorts.map((r) => ({ slug: r.slug, name: r.name }));
  const filterImpact = buildFilterImpact(
    [
      ...baseActivities.map(activityToFilterableItem),
      ...baseOfficialOfferings.map(offeringToFilterableItem),
    ],
    filters,
    resortOptions
  );

  return (
    <>
      <Hero
        title="Explore activities"
        subtitle="Find resort activities by mood, resort, and time of day for days between park visits."
      />
      <Suspense fallback={<ActivityGridSkeleton columns={2} />}>
        <ExploreLayout
          activities={activities}
          officialOfferings={officialOfferings}
          resorts={resortOptions}
          filterImpact={filterImpact}
        />
      </Suspense>
    </>
  );
}
