import { Suspense } from "react";
import { Hero } from "@/components/atlas/Hero";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { ExploreLayout } from "@/components/explore/ExploreLayout";
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
        subtitle="Discover resort moments by mood, resort, and time of day — curated for rest days between park visits."
      />
      <Suspense fallback={<ActivityGridSkeleton columns={2} />}>
        <ExploreLayout
          activities={activities}
          resorts={resorts.map((r) => ({ slug: r.slug, name: r.name }))}
        />
      </Suspense>
    </>
  );
}
