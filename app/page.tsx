import Link from "next/link";
import { HomeHero } from "@/components/home/HomeHero";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { MovieNightCard } from "@/components/atlas/MovieNightCard";
import { ResortCard } from "@/components/resort/ResortCard";
import {
  getFilteredActivities,
  getMovieNights,
  getResorts,
} from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [resorts, freeActivities, littleKidActivities, movieNights] =
    await Promise.all([
      getResorts(),
      getFilteredActivities({ free: true, limit: 4 }),
      getFilteredActivities({ category: "arts_crafts", limit: 4 }),
      getMovieNights(),
    ]);

  const tonightMovies = movieNights.filter((m) => m.isTonight).slice(0, 3);
  const resortOptions = resorts.map((r) => ({ slug: r.slug, name: r.name }));

  return (
    <>
      <HomeHero resorts={resortOptions} />

      {tonightMovies.length > 0 && (
        <section className="home-section" aria-labelledby="tonight-heading">
          <div className="home-section__header">
            <div>
              <h2 id="tonight-heading" className="font-display text-2xl font-semibold">
                Tonight&apos;s easy wins
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Movies and evening favorites across the resorts.
              </p>
            </div>
            <Link href="/tonight" className="home-section__link">
              See all →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {tonightMovies.map((m) => (
              <Link key={m.id} href="/tonight" className="block">
                <MovieNightCard movie={m} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {freeActivities.length > 0 && (
        <section className="home-section" aria-labelledby="free-heading">
          <div className="home-section__header">
            <div>
              <h2 id="free-heading" className="font-display text-2xl font-semibold">
                Free things happening today
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                No ticket needed — resort fun included with your stay.
              </p>
            </div>
            <Link href="/activities?free=true" className="home-section__link">
              Browse free →
            </Link>
          </div>
          <ActivityGrid activities={freeActivities} />
        </section>
      )}

      {littleKidActivities.length > 0 && (
        <section className="home-section" aria-labelledby="kids-heading">
          <div className="home-section__header">
            <div>
              <h2 id="kids-heading" className="font-display text-2xl font-semibold">
                Good for little travelers
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Crafts, scavenger hunts, and gentle resort fun.
              </p>
            </div>
            <Link
              href="/activities?category=arts_crafts"
              className="home-section__link"
            >
              See more →
            </Link>
          </div>
          <ActivityGrid activities={littleKidActivities} />
        </section>
      )}

      <section className="home-section" aria-labelledby="resorts-heading">
        <h2 id="resorts-heading" className="font-display mb-4 text-2xl font-semibold">
          Pick your resort
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resorts.slice(0, 9).map((resort) => (
            <ResortCard key={resort.slug} resort={resort} />
          ))}
        </div>
        <Link href="/resorts" className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline">
          View all 31 resorts →
        </Link>
      </section>

      <section className="home-section" aria-labelledby="rest-day-heading">
        <div className="rest-day-builder">
          <h2 id="rest-day-heading" className="rest-day-builder__title font-display">
            Build a low-stress rest day
          </h2>
          <p className="rest-day-builder__copy">
            Coming soon — stack pool time, a craft, and a movie under the stars into
            one easy afternoon plan.
          </p>
          <Link
            href="/plan"
            className="mt-4 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Preview My Plan →
          </Link>
        </div>
      </section>

      <section className="home-section">
        <div className="postcard-texture rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold">Helpful planning guides</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Practical tips for settling in, scouting tonight, and making the most of
            your first hours at the resort.
          </p>
          <Link
            href="/guides/first-night-at-the-resort"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Your first night at the resort →
          </Link>
        </div>
      </section>
    </>
  );
}
