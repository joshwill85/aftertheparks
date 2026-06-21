import { ActivityDetailClient } from "@/components/atlas/ActivityDetailClient";
import { getActivityBySlug } from "@/lib/data/activities";
import { getCategoryMeta } from "@/lib/categories/meta";
import { getDisplayTitle, occurrenceToDisplayInput } from "@/lib/activityDisplay";
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
  const meta = getCategoryMeta(activity.category);
  const displayTitle = getDisplayTitle(occurrenceToDisplayInput(activity));

  return (
    <article>
      <header className="mb-8">
        <span className="stamp-badge">
          <span aria-hidden>{meta.icon}</span>
          {meta.label} · {activity.resort.name}
        </span>
        <h1 className="font-display mt-4 text-4xl font-bold leading-tight md:text-5xl">
          {displayTitle}
        </h1>
        {activity.location.label && activity.location.label !== "Resort" && (
          <p className="mt-2 text-lg text-[var(--color-muted)]">{activity.location.label}</p>
        )}
      </header>

      <ActivityDetailClient activity={activity} upcoming={upcoming} />
    </article>
  );
}
