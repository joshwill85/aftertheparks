import Link from "next/link";
import { Hero } from "@/components/atlas/Hero";
import { QuickLink } from "@/components/atlas/QuickLink";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { getHappeningNow, getResorts } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [happeningNow, resorts] = await Promise.all([
    getHappeningNow(),
    getResorts(),
  ]);

  return (
    <>
      <Hero
        title="After the Parks"
        subtitle="Resort activities from sunshine to starlight — discover what's happening now, tonight, and across your stay."
      >
        <QuickLink href="/today" label="Today" description="Rest of your day" />
        <QuickLink
          href="/tonight"
          label="Tonight"
          description="Evening & movies"
          variant="secondary"
        />
        <QuickLink href="/plan" label="My Plan" variant="secondary" />
      </Hero>

      {happeningNow.length > 0 && (
        <section className="mb-12">
          <h2 className="font-display mb-4 text-2xl font-semibold">
            Happening now
          </h2>
          <ActivityGrid activities={happeningNow.slice(0, 3)} />
        </section>
      )}

      <section>
        <h2 className="font-display mb-4 text-2xl font-semibold">
          Pick your resort
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resorts.slice(0, 9).map((resort) => (
            <Link
              key={resort.slug}
              href={`/resorts/${resort.slug}`}
              className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 transition-all hover:border-[var(--accent)] hover:shadow-md"
            >
              <h3 className="font-display font-semibold">{resort.name}</h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {resort.activityCount} activities
              </p>
            </Link>
          ))}
        </div>
        <Link
          href="/resorts"
          className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline"
        >
          View all 31 resorts →
        </Link>
      </section>
    </>
  );
}
