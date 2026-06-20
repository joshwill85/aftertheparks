import Link from "next/link";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { getResortBySlug, getResortActivities } from "@/lib/data/activities";
import { formatResortTier } from "@/lib/utils";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ResortDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [resort, activities] = await Promise.all([
    getResortBySlug(slug),
    getResortActivities(slug),
  ]);

  if (!resort) notFound();

  const uniqueActivities = Array.from(
    new Map(activities.map((a) => [a.activitySlug, a])).values()
  );

  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-[var(--accent)]">
          {formatResortTier(resort.category)}
        </p>
        <h1 className="font-display mt-1 text-4xl font-bold">{resort.name}</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          {uniqueActivities.length} activities in the current recreation calendar
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/activities?resort=${resort.slug}`}
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white"
          >
            Filter activities
          </Link>
          <Link
            href={`/tonight`}
            className="rounded-full border border-[var(--color-card-border)] px-4 py-2 text-sm"
          >
            Tonight at this resort
          </Link>
        </div>
      </header>
      <ActivityGrid
        activities={uniqueActivities}
        showResort={false}
        emptyMessage="No activities published for this resort yet."
      />
    </>
  );
}
