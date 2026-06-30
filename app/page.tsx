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
import { AnswerBlock } from "@/components/seo/AnswerBlock";
import { FreshnessFacts } from "@/components/seo/FreshnessFacts";
import { IntentLinkCluster } from "@/components/seo/IntentLinkCluster";
import {
  getCuratedHomeActivities,
  getMovieNights,
  getResorts,
  getTodayActivities,
  getTonightActivities,
} from "@/lib/data/activities";
import { buildResortEnrichment } from "@/lib/resorts/enrichment";
import { activitySourceSummary, formatSeoDate } from "@/lib/seo/activityPage";
import { getDaypart, getNowInOrlando } from "@/lib/daypart";
import {
  homeSectionOrderForDaypart,
  type HomeSectionId,
} from "@/lib/home/daypartPriority";

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
  const homeDaypart = getDaypart(getNowInOrlando());
  const homeSectionOrder = homeSectionOrderForDaypart(
    homeDaypart,
    tonightMovies.length > 0
  );

  const renderHomeSection = (section: HomeSectionId) => {
    switch (section) {
      case "answer":
        return (
          <AnswerBlock
            key={section}
            eyebrow="Current resort planning"
            title="How current is this?"
            primaryAction={{ label: "See today", href: "/today" }}
            secondaryActions={[{ label: "See tonight", href: "/tonight" }]}
          >
            After the Parks helps you choose current Disney resort activities outside
            the parks, then points you to source notes and confirmation steps before
            you commit time, transportation, or money. Schedules can change, so confirm with the resort before you go.
          </AnswerBlock>
        );
      case "freshness":
        return (
          <FreshnessFacts
            key={section}
            lastVerified={formatSeoDate(sourceSummary.latestVerified)}
            activityCount={sourceSummary.activityCount}
            sourceCount={sourceSummary.sourceCount}
          />
        );
      case "intent":
        return (
          <IntentLinkCluster
            key={section}
            title="Start with the right view"
            links={[
              { label: "Today", href: "/today", description: "Activities still available today." },
              { label: "Tonight", href: "/tonight", description: "Movies, campfires, and evening plans." },
              { label: "Resort calendars", href: "/disney-world-resort-activity-calendars", description: "Compare resort activity calendars." },
              { label: "Free activities", href: "/activities?free=true", description: "Current free and low-cost options." },
              { label: "Choose your resort", href: "/resorts", description: "Start where you are staying." },
              { label: "Weather", href: "/weather", description: "Check rain, heat, and storm risk." },
            ]}
          />
        );
      case "tonight":
        return (
          <section key={section} className="home-section" aria-labelledby="tonight-heading">
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
        );
      case "popular":
        return popularActivities.length > 0 ? (
          <section key={section} className="home-section" aria-labelledby="popular-activities-heading">
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
        ) : null;
      case "resorts":
        return (
          <section key={section} className="home-section" aria-labelledby="resorts-heading">
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
        );
      case "restDay":
        return (
          <section key={section} className="home-section" aria-labelledby="rest-day-heading">
            <RestDayBuilder resorts={resortOptions} />
          </section>
        );
      case "noTicket":
        return <NoTicketMagic key={section} />;
    }
  };

  return (
    <PlanClientBoundary>
      <HomeHero resorts={resortOptions} />
      {homeSectionOrder.map(renderHomeSection)}
    </PlanClientBoundary>
  );
}
