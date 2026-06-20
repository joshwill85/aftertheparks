import { Suspense } from "react";
import { ActivitiesClient } from "@/components/atlas/ActivitiesClient";
import { FilterBar } from "@/components/atlas/FilterBar";
import { Hero } from "@/components/atlas/Hero";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { getFilteredActivities, getResorts } from "@/lib/data/activities";
import type { Daypart } from "@/lib/types/occurrence";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    resort?: string;
    category?: string;
    daypart?: string;
    free?: string;
  }>;
}

export default async function ActivitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const daypart = params.daypart as Daypart | undefined;
  const activities = await getFilteredActivities({
    resort: params.resort,
    category: params.category,
    daypart,
    free: params.free === "true",
  });
  const resorts = await getResorts();

  return (
    <>
      <Hero
        title="Explore activities"
        subtitle="Filter by resort, daypart, and category to find your next resort moment."
      />
      <Suspense fallback={null}>
        <FilterBar
          resorts={resorts.map((r) => ({ slug: r.slug, name: r.name }))}
        />
      </Suspense>
      <div className="mt-6">
        <Suspense fallback={<ActivityGridSkeleton />}>
          <ActivitiesClient initialActivities={activities} />
        </Suspense>
      </div>
    </>
  );
}
