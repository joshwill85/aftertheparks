import { ActivityDetailClient } from "@/components/atlas/ActivityDetailClient";
import {
  getActivitiesByArea,
  getActivityBySlug,
  getResortBySlug,
  getSimilarActivities,
} from "@/lib/data/activities";
import { notFound } from "next/navigation";

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
  const result = await getActivityBySlug(slug);

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
