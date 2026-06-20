import { ActivityDetailClient } from "@/components/atlas/ActivityDetailClient";
import { getActivityBySlug } from "@/lib/data/activities";
import { formatCategory } from "@/lib/utils";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getActivityBySlug(slug);

  if (!result) notFound();

  const { activity, upcoming } = result;

  return (
    <article>
      <header className="mb-8">
        <p className="text-sm font-medium text-[var(--accent)]">
          {formatCategory(activity.category)} · {activity.resort.name}
        </p>
        <h1 className="font-display mt-2 text-4xl font-bold">{activity.title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--color-muted)]">
          {activity.summary}
        </p>
      </header>

      <ActivityDetailClient activity={activity} upcoming={upcoming} />
    </article>
  );
}
