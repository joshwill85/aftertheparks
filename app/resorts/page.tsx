import { Hero } from "@/components/atlas/Hero";
import { ResortCard } from "@/components/resort/ResortCard";
import { getResorts, getTonightActivities } from "@/lib/data/activities";
import { formatResortTier } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TIER_ORDER = [
  "value",
  "moderate",
  "deluxe",
  "deluxe_villa",
  "campground",
] as const;

export default async function ResortsPage() {
  const [resorts, tonightActivities] = await Promise.all([
    getResorts(),
    getTonightActivities(),
  ]);

  const tonightByResort = new Map<string, number>();
  for (const activity of tonightActivities) {
    const slug = activity.resort.slug;
    tonightByResort.set(slug, (tonightByResort.get(slug) ?? 0) + 1);
  }

  const grouped = resorts.reduce(
    (acc, r) => {
      const tier = r.category;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(r);
      return acc;
    },
    {} as Record<string, typeof resorts>
  );

  const orderedTiers = [
    ...TIER_ORDER.filter((tier) => grouped[tier]?.length),
    ...Object.keys(grouped).filter(
      (tier) => !TIER_ORDER.includes(tier as (typeof TIER_ORDER)[number])
    ),
  ];

  return (
    <>
      <Hero
        title="Resorts"
        subtitle="All 31 Disney-owned and operated Walt Disney World resort hotels."
      />
      {orderedTiers.map((tier) => {
        const list = grouped[tier];
        if (!list?.length) return null;

        return (
          <section key={tier} className="mb-10">
            <h2 className="font-display mb-4 text-xl font-semibold">
              {formatResortTier(tier)}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((resort) => (
                <ResortCard
                  key={resort.slug}
                  resort={resort}
                  tonightCount={tonightByResort.get(resort.slug)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
