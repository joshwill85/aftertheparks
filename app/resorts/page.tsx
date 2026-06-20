import Link from "next/link";
import { Hero } from "@/components/atlas/Hero";
import { getResorts } from "@/lib/data/activities";
import { formatResortTier } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ResortsPage() {
  const resorts = await getResorts();

  const grouped = resorts.reduce(
    (acc, r) => {
      const tier = r.category;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(r);
      return acc;
    },
    {} as Record<string, typeof resorts>
  );

  return (
    <>
      <Hero
        title="Resorts"
        subtitle="All 31 Disney-owned and operated Walt Disney World resort hotels."
      />
      {Object.entries(grouped).map(([tier, list]) => (
        <section key={tier} className="mb-10">
          <h2 className="font-display mb-4 text-xl font-semibold">
            {formatResortTier(tier)}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((resort) => (
              <Link
                key={resort.slug}
                href={`/resorts/${resort.slug}`}
                className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 hover:border-[var(--accent)]"
              >
                <h3 className="font-display font-semibold">{resort.name}</h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {resort.activityCount} activities
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
