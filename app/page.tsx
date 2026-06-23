import { EventCardList, EventCardListItem } from "@/components/events/EventCardList";
import Link from "next/link";
import { HomeHero } from "@/components/home/HomeHero";
import { RestDayBuilder } from "@/components/home/RestDayBuilder";
import { NoTicketMagic } from "@/components/magic/NoTicketMagic";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { MovieNightCard } from "@/components/atlas/MovieNightCard";
import { ResortGrid } from "@/components/resort/ResortGrid";
import {
  getCuratedHomeActivities,
  getMovieNights,
  getResorts,
  getTodayActivities,
  getTonightActivities,
} from "@/lib/data/activities";
import { buildResortEnrichment } from "@/lib/resorts/enrichment";

export const dynamic = "force-dynamic";

function mapsToRecords<T>(map: Map<string, T>): Record<string, T> {
  return Object.fromEntries(map.entries());
}

export default async function HomePage() {
  const [
    resorts,
    { freeToday: freeActivities, littleKids: littleKidActivities },
    movieNights,
    todayActivities,
    tonightActivities,
  ] = await Promise.all([
    getResorts(),
    getCuratedHomeActivities({ freeLimit: 6, kidsLimit: 4 }),
    getMovieNights(),
    getTodayActivities(),
    getTonightActivities(),
  ]);

  const enrichment = buildResortEnrichment(todayActivities, tonightActivities);
  const tonightMovies = movieNights.filter((m) => m.isTonight).slice(0, 3);
  const resortOptions = resorts.map((r) => ({ slug: r.slug, name: r.name }));

  return (
    <>
      <HomeHero resorts={resortOptions} />

      {tonightMovies.length > 0 && (
        <section className="home-section" aria-labelledby="tonight-heading">
          <div className="home-section__header">
            <div>
              <h2 id="tonight-heading" className="home-section__title">
                Tonight&apos;s easy wins
              </h2>
              <p className="home-section__subtitle">
                Movies and evening favorites across the resorts.
              </p>
            </div>
            <Link href="/tonight" className="home-section__link">
              See all →
            </Link>
          </div>
          <EventCardList columns={3}>
            {tonightMovies.map((m) => (
              <EventCardListItem key={m.id}>
                <MovieNightCard movie={m} />
              </EventCardListItem>
            ))}
          </EventCardList>
        </section>
      )}

      {freeActivities.length > 0 && (
        <section className="home-section" aria-labelledby="free-heading">
          <div className="home-section__header">
            <div>
              <h2 id="free-heading" className="home-section__title">
                Source-confirmed no-cost activities
              </h2>
              <p className="home-section__subtitle">
                Activities whose current source explicitly supports a no-cost label.
              </p>
            </div>
            <Link href="/activities?free=true" className="home-section__link">
              Browse no-cost →
            </Link>
          </div>
          <ActivityGrid activities={freeActivities} />
        </section>
      )}

      {littleKidActivities.length > 0 && (
        <section className="home-section" aria-labelledby="kids-heading">
          <div className="home-section__header">
            <div>
              <h2 id="kids-heading" className="home-section__title">
                Good for little travelers
              </h2>
              <p className="home-section__subtitle">
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
        <div className="home-section__header">
          <div>
            <h2 id="resorts-heading" className="home-section__title">
              Pick your resort
            </h2>
            <p className="home-section__subtitle">
              Find schedules, movies, and campfires where you&apos;re staying.
            </p>
          </div>
        </div>
        <ResortGrid
          resorts={resorts}
          todayByResort={mapsToRecords(enrichment.todayByResort)}
          tonightByResort={mapsToRecords(enrichment.tonightByResort)}
          highlightsByResort={mapsToRecords(enrichment.highlightsByResort)}
          previewLimit={9}
          compactToolbar
          showViewAllLink
        />
      </section>

      <section className="home-section" aria-labelledby="rest-day-heading">
        <RestDayBuilder resorts={resortOptions} />
      </section>

      <NoTicketMagic />

      <section className="home-section">
        <div className="postcard-texture rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold text-[var(--brand-ink)]">
            Helpful planning guides
          </h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Practical tips for settling in, scouting tonight, and making the most of
            your first hours at the resort.
          </p>
          <Link href="/guides" className="home-section__link mt-4 inline-flex">
            Browse all guides →
          </Link>
        </div>
      </section>
    </>
  );
}
