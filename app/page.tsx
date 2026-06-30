import type { Metadata } from "next";
import { EventCardList, EventCardListItem } from "@/components/events/EventCardList";
import Link from "next/link";
import { HomeHero } from "@/components/home/HomeHero";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { RestDayBuilder } from "@/components/home/RestDayBuilder";
import { NoTicketMagic } from "@/components/magic/NoTicketMagic";
import { PlanClientBoundary } from "@/components/plan/PlanClientBoundary";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { ActivityCollectionView } from "@/components/atlas/ActivityCollectionView";
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
import { activitySourceSummary, formatSeoDate } from "@/lib/seo/activityPage";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "After the Parks",
  description:
    "Current Walt Disney World resort activities, movies, campfires, recreation calendars, and no-park-day planning.",
  alternates: { canonical: "/" },
  ...buildSocialMetadata({
    title: "After the Parks",
    description:
      "Current Walt Disney World resort activities, movies, campfires, recreation calendars, and no-park-day planning.",
    path: "/",
  }),
};

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
  const popularActivities = [...freeActivities, ...littleKidActivities];
  const sourceSummary = activitySourceSummary([
    ...todayActivities,
    ...tonightActivities,
  ]);

  return (
    <PlanClientBoundary>
      <HomeHero resorts={resortOptions} />

      <section className="home-section" aria-labelledby="home-source-heading">
        <div className="grid gap-4">
          <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 md:p-6">
            <h2 id="home-source-heading" className="font-display text-2xl font-semibold">
              How current is this?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
              Last verified {formatSeoDate(sourceSummary.latestVerified) ?? "by current source"}. Includes{" "}
              {sourceSummary.activityCount} verified activity rows from{" "}
              {sourceSummary.sourceCount} official sources. Schedules can change, so confirm with the resort before you go.
            </p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-bold text-[var(--color-muted)]">Last verified</dt>
                <dd className="font-semibold">
                  {formatSeoDate(sourceSummary.latestVerified) ?? "Check current source"}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-[var(--color-muted)]">Verified activity rows</dt>
                <dd className="font-semibold">{sourceSummary.activityCount}</dd>
              </div>
              <div>
                <dt className="font-bold text-[var(--color-muted)]">Official sources</dt>
                <dd className="font-semibold">{sourceSummary.sourceCount}</dd>
              </div>
            </dl>
            <Link
              href="/source-and-accuracy-policy"
              className="home-section__link mt-4 inline-flex"
            >
              Source and accuracy policy <IconGlyph iconKey="arrow_right" className="ml-1 text-sm" />
            </Link>
          </div>
        </div>
      </section>

      {tonightMovies.length > 0 && (
        <section className="home-section" aria-labelledby="tonight-heading">
          <div className="home-section__header">
            <div>
              <h2 id="tonight-heading" className="home-section__title">
                Tonight&apos;s easy wins
              </h2>
              <p className="home-section__subtitle">
                Quick evening options with current times, locations, and weather notes.
              </p>
            </div>
            <Link href="/tonight" className="home-section__link">
              See all <IconGlyph iconKey="arrow_right" className="ml-1 text-sm" />
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

      {popularActivities.length > 0 && (
        <section className="home-section" aria-labelledby="popular-activities-heading">
          <div className="home-section__header">
            <div>
              <h2 id="popular-activities-heading" className="home-section__title">
                Current resort activities
              </h2>
              <p className="home-section__subtitle">
                Free and low-cost activities from Disney resort calendars.
              </p>
            </div>
            <Link
              href="/activities"
              className="home-section__link"
            >
              Browse all <IconGlyph iconKey="arrow_right" className="ml-1 text-sm" />
            </Link>
          </div>
          <ActivityCollectionView activities={popularActivities} showResort />
        </section>
      )}

      <section className="home-section" aria-labelledby="resorts-heading">
        <div className="home-section__header">
          <div>
            <h2 id="resorts-heading" className="home-section__title">
              Choose your resort
            </h2>
            <p className="home-section__subtitle">
              {"See today's schedule, tonight's options, free activities, and source freshness for the resort where you are staying."}
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
            Browse all guides <IconGlyph iconKey="arrow_right" className="ml-1 text-sm" />
          </Link>
        </div>
      </section>
    </PlanClientBoundary>
  );
}
