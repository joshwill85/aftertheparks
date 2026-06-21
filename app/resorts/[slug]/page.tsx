import Link from "next/link";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { getResortTierGradient } from "@/components/resort/ResortCard";
import { getResortBySlug, getResortActivities } from "@/lib/data/activities";
import { filterTonight } from "@/lib/occurrences/expand";
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
  const tonightCount = filterTonight(activities).length;
  const isDarkTier = resort.category === "deluxe";

  return (
    <>
      <header className="mb-10 overflow-hidden rounded-3xl border border-[var(--color-card-border)] shadow-md">
        <div
          className="relative px-6 py-10 md:px-10 md:py-12"
          style={{ background: getResortTierGradient(resort.category) }}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"
            aria-hidden
          />
          <div className="relative">
            <p
              className={`text-sm font-bold uppercase tracking-widest ${
                isDarkTier ? "text-[var(--color-lantern)]" : "text-white/90"
              }`}
            >
              {formatResortTier(resort.category)}
            </p>
            <h1
              className={`font-display mt-2 text-4xl font-bold leading-tight md:text-5xl ${
                isDarkTier ? "text-white" : "text-[var(--brand-ink)]"
              }`}
              style={
                isDarkTier
                  ? { textShadow: "0 2px 24px rgba(0,0,0,0.35)" }
                  : undefined
              }
            >
              {resort.name}
            </h1>
            <p
              className={`mt-3 text-lg ${
                isDarkTier ? "text-white/85" : "text-[var(--brand-ink)]/80"
              }`}
            >
              {uniqueActivities.length}{" "}
              {uniqueActivities.length === 1 ? "activity" : "activities"} in
              the current recreation calendar
              {tonightCount > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-[var(--color-lantern)]">
                    {tonightCount} tonight
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[var(--color-card-border)] bg-[var(--color-card)] px-6 py-4 md:px-10">
          <Link
            href={`/activities?resort=${resort.slug}`}
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--accent)] px-5 text-sm font-bold text-white"
          >
            Filter activities
          </Link>
          <Link
            href="/tonight"
            className="btn-secondary inline-flex min-h-11 items-center rounded-full border border-[var(--color-card-border)] px-5 text-sm font-bold"
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
