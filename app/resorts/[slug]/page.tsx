import Link from "next/link";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { ActivityOfferingGrid } from "@/components/activity/ActivityOfferingGrid";
import { getResortTierGradient } from "@/components/resort/ResortCard";
import { ResortCategorySections } from "@/components/resort/ResortCategorySections";
import { ResortEmptyState } from "@/components/resort/ResortEmptyState";
import { ResortSourceBlock } from "@/components/resort/ResortSourceBlock";
import { ResortTimeline } from "@/components/resort/ResortTimeline";
import {
  getResortBySlug,
  getResortActivities,
  getResortTimeline,
  getTodayActivities,
  getTonightActivities,
} from "@/lib/data/activities";
import { getOfficialOfferingsForResort } from "@/lib/data/officialOfferings";
import {
  filterFreeActivities,
  groupByCategory,
} from "@/lib/resorts/sections";
import { formatResortTier } from "@/lib/utils";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function ResortSectionHeader({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="text-sm font-bold text-[var(--accent)] hover:underline"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export default async function ResortDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [
    resort,
    activities,
    resortTimeline,
    todayActivities,
    tonightActivities,
    officialOfferings,
  ] =
    await Promise.all([
      getResortBySlug(slug),
      getResortActivities(slug),
      getResortTimeline(slug, 31),
      getTodayActivities({ resort: slug }),
      getTonightActivities({ resort: slug }),
      getOfficialOfferingsForResort(slug),
    ]);

  if (!resort) notFound();

  const uniqueActivities = Array.from(
    new Map(activities.map((a) => [a.activitySlug, a])).values()
  );
  const uniqueOfferings = Array.from(
    new Map(officialOfferings.map((a) => [a.offeringKey, a])).values()
  );
  const freeActivities = filterFreeActivities(uniqueActivities);
  const categoryGroups = groupByCategory(uniqueActivities).filter(
    (group) => group.activities.length >= 2
  );
  const isDarkTier = resort.category === "deluxe";
  const hasAnyActivities = uniqueActivities.length > 0 || uniqueOfferings.length > 0;

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
              {uniqueActivities.length} scheduled{" "}
              {uniqueActivities.length === 1 ? "activity" : "activities"}
              {uniqueOfferings.length > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-[var(--accent)]">
                    {uniqueOfferings.length} standing{" "}
                    {uniqueOfferings.length === 1 ? "offering" : "offerings"}
                  </span>
                </>
              )}
              {todayActivities.length > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-[var(--accent)]">
                    {todayActivities.length} today
                  </span>
                </>
              )}
              {tonightActivities.length > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-[var(--color-lantern)]">
                    {tonightActivities.length} tonight
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
            href={`/today?resort=${resort.slug}`}
            className="btn-secondary inline-flex min-h-11 items-center rounded-full border border-[var(--color-card-border)] px-5 text-sm font-bold"
          >
            Today at this resort
          </Link>
          <Link
            href={`/tonight?resort=${resort.slug}`}
            className="btn-secondary inline-flex min-h-11 items-center rounded-full border border-[var(--color-card-border)] px-5 text-sm font-bold"
          >
            Tonight at this resort
          </Link>
        </div>
      </header>

      {!hasAnyActivities ? (
        <ResortEmptyState resort={resort} />
      ) : (
        <>
          {todayActivities.length > 0 && (
            <section className="mb-10">
              <ResortSectionHeader
                title="Today"
                description="What's on the calendar for the rest of today."
                href={`/today?resort=${resort.slug}`}
                linkLabel="View all"
              />
              <ActivityGrid
                activities={todayActivities.slice(0, 6)}
                showResort={false}
              />
            </section>
          )}

          {tonightActivities.length > 0 && (
            <section className="mb-10">
              <ResortSectionHeader
                title="Tonight"
                description={`Evening and late activities at ${resort.name}.`}
                href={`/tonight?resort=${resort.slug}`}
                linkLabel="View all"
              />
              <ActivityGrid
                activities={tonightActivities.slice(0, 6)}
                showResort={false}
              />
            </section>
          )}

          {freeActivities.length > 0 && (
            <section className="mb-10">
              <ResortSectionHeader
                title="Source-confirmed no-cost activities"
                description="Activities whose current source explicitly supports a no-cost label."
                href={`/activities?resort=${resort.slug}&free=true`}
                linkLabel="View no-cost"
              />
              <ActivityGrid
                activities={freeActivities.slice(0, 6)}
                showResort={false}
              />
            </section>
          )}

          <ResortCategorySections
            groups={categoryGroups.slice(0, 4)}
            resortSlug={resort.slug}
          />

          {uniqueOfferings.length > 0 && (
            <section id="official-offerings" className="mb-10 scroll-mt-24">
              <ResortSectionHeader
                title="Available at this resort"
                description="Official Disney recreation offerings that are not tied to a dated calendar time."
              />
              <ActivityOfferingGrid
                offerings={uniqueOfferings}
                showResort={false}
              />
            </section>
          )}

          {resortTimeline.length > 0 && (
            <section className="mb-10">
              <ResortSectionHeader
                title="Full schedule"
                description="Every dated occurrence in the current recreation calendar."
              />
              <ResortTimeline activities={resortTimeline} />
            </section>
          )}
        </>
      )}

      <div className="mt-10">
        <ResortSourceBlock resort={resort} />
      </div>
    </>
  );
}
