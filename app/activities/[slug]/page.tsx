import { ActivityDetailClient } from "@/components/atlas/ActivityDetailClient";
import {
  getActivitiesByArea,
  getActivityBySlug,
  getResortBySlug,
  getSimilarActivities,
} from "@/lib/data/activities";
import { canonicalActivitySlug } from "@/lib/activities/legacySlugs";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ resort?: string }>;
}) {
  const { slug } = await params;
  const { resort: homeResortSlug } = await searchParams;
  const canonicalSlug = canonicalActivitySlug(slug);

  if (canonicalSlug !== slug) {
    const suffix = homeResortSlug
      ? `?resort=${encodeURIComponent(homeResortSlug)}`
      : "";
    redirect(`/activities/${canonicalSlug}${suffix}`);
  }

  const result = await getActivityBySlug(canonicalSlug, {
    resort: homeResortSlug,
  });

  if (!result) notFound();

  const { activity, upcoming } = result;
  const [similar, nearbyActivities, homeResort] = await Promise.all([
    getSimilarActivities(activity),
    getActivitiesByArea(activity.resort.area),
    homeResortSlug ? getResortBySlug(homeResortSlug) : Promise.resolve(null),
  ]);

  const homeBase = homeResort
    ? { slug: homeResort.slug, area: homeResort.area }
    : undefined;

  const nearby = nearbyActivities.filter(
    (item) => item.activitySlug !== activity.activitySlug
  );

  return (
    <article>
      <ActivityDetailClient
        activity={activity}
        upcoming={upcoming}
        similar={similar}
        nearbyActivities={nearby}
        homeResort={homeBase}
      />
    </article>
  );
}
