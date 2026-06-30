import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/atlas/Hero";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { ExploreLayout } from "@/components/explore/ExploreLayout";
import { PlanClientBoundary } from "@/components/plan/PlanClientBoundary";
import { AnswerBlock } from "@/components/seo/AnswerBlock";
import { FreshnessFacts } from "@/components/seo/FreshnessFacts";
import { IntentLinkCluster } from "@/components/seo/IntentLinkCluster";
import { getFilteredActivities, getResorts } from "@/lib/data/activities";
import {
  filterOfficialOfferingsWithoutActivityCollisions,
  getFilteredOfficialOfferings,
} from "@/lib/data/officialOfferings";
import { parseBrowseParams } from "@/lib/explore/browseParams";
import {
  activityToFilterableItem,
  buildFilterImpact,
  offeringToFilterableItem,
} from "@/lib/explore/filterImpact";
import { canonicalPolicyForParams } from "@/lib/seo/canonicalPolicy";
import { activitySourceSummary, formatSeoDate } from "@/lib/seo/activityPage";
import { buildItemListJsonLd, stringifyJsonLd } from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";

export const revalidate = 86400;

const DEFAULT_ACTIVITY_METADATA = {
  title: "Walt Disney World Resort Activities",
  description:
    "Browse current Disney resort activities by resort, time, category, cost, and weather fit.",
  canonical: "/activities",
};

const STRATEGIC_ACTIVITY_FILTER_METADATA: Record<
  string,
  typeof DEFAULT_ACTIVITY_METADATA
> = {
  "category=campfire": {
    title: "Disney Resort Campfires",
    description:
      "Campfires are outdoor and weather-sensitive. Compare current Disney resort campfire times, locations, and supply notes before you go.",
    canonical: "/activities?category=campfire",
  },
  "category=poolside": {
    title: "Disney Resort Poolside Activities",
    description:
      "Browse current Disney resort poolside activities. Pool access is usually limited to guests staying at that resort, so confirm access before planning around pool games.",
    canonical: "/activities?category=poolside",
  },
  "category=arcade": {
    title: "Arcades and Games at Disney Resorts",
    description:
      "Find Disney resort arcades and games for indoor, low-effort backup plans during arrival days, breaks, or flexible resort time.",
    canonical: "/activities?category=arcade",
  },
  "free=true": {
    title: "Free Walt Disney World Resort Activities",
    description:
      "Browse current free Walt Disney World resort activities with current schedule notes, access caveats, and no-park-day planning links.",
    canonical: "/activities?free=true",
  },
  "weather=indoor": {
    title: "Indoor Walt Disney World Resort Activities",
    description:
      "Find indoor and weather-safer Walt Disney World resort activities for rainy days, heat breaks, and flexible no-park-day plans.",
    canonical: "/activities?weather=indoor",
  },
  "weather=covered": {
    title: "Covered Walt Disney World Resort Activities",
    description:
      "Find covered Walt Disney World resort activities and light-rain backups with current schedule notes and weather caveats.",
    canonical: "/activities?weather=covered",
  },
  "transport=monorail": {
    title: "Monorail Resort Activities at Walt Disney World",
    description:
      "Browse current Walt Disney World resort activities around the monorail loop with current schedule notes and access caveats.",
    canonical: "/activities?transport=monorail",
  },
  "transport=skyliner": {
    title: "Skyliner Resort Activities at Walt Disney World",
    description:
      "Browse current Walt Disney World resort activities around Skyliner-area resorts with current schedule notes and weather caveats.",
    canonical: "/activities?transport=skyliner",
  },
  "area=disney-springs": {
    title: "Disney Springs-Area Resort Activities",
    description:
      "Browse current Disney Springs-area resort activities with access caveats: confirm a resort stay, dining/experience reservation, or another currently allowed route before relying on resort transportation.",
    canonical: "/activities?area=disney-springs",
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const canonicalPolicy = canonicalPolicyForParams("/activities", params);
  const pageMetadata =
    STRATEGIC_ACTIVITY_FILTER_METADATA[canonicalPolicy.strategicFilterKey ?? ""] ??
    DEFAULT_ACTIVITY_METADATA;

  return {
    title: pageMetadata.title,
    description: pageMetadata.description,
    robots: { index: canonicalPolicy.index, follow: true },
    alternates: { canonical: canonicalPolicy.canonical },
    ...buildSocialMetadata({
      title: pageMetadata.title,
      description: pageMetadata.description,
      path: pageMetadata.canonical,
      imageEyebrow: "Resort activity finder",
      imageSummary:
        pageMetadata.canonical === "/activities"
          ? "Browse current resort activities by time, cost, weather fit, source freshness, and no-park-day planning intent."
          : "Use this focused activity view for current resort planning without wading through unrelated results.",
    }),
  };
}

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ActivitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const canonicalPolicy = canonicalPolicyForParams("/activities", params);
  const strategicKey = canonicalPolicy.strategicFilterKey;
  const pageMetadata =
    STRATEGIC_ACTIVITY_FILTER_METADATA[strategicKey ?? ""] ??
    DEFAULT_ACTIVITY_METADATA;
  const filters = parseBrowseParams(params);
  const activityFilters = { ...filters, limit: 500 };
  const baseFilters = { limit: 500 };
  const [
    activities,
    officialOfferingsPool,
    baseActivities,
    baseOfficialOfferings,
    resorts,
  ] = await Promise.all([
    getFilteredActivities(activityFilters),
    getFilteredOfficialOfferings(activityFilters),
    getFilteredActivities(baseFilters),
    getFilteredOfficialOfferings(baseFilters),
    getResorts(),
  ]);
  const officialOfferings = filterOfficialOfferingsWithoutActivityCollisions(
    officialOfferingsPool,
    activities
  );
  const resortOptions = resorts.map((r) => ({ slug: r.slug, name: r.name }));
  const filterImpact = buildFilterImpact(
    [
      ...baseActivities.map(activityToFilterableItem),
      ...baseOfficialOfferings.map(offeringToFilterableItem),
    ],
    filters,
    resortOptions
  );
  const sourceSummary = activitySourceSummary(activities);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const jsonLd = stringifyJsonLd(
    buildItemListJsonLd(
      baseUrl,
      "Current Walt Disney World resort activities",
      activities.slice(0, 25).map((activity) => ({
        name: `${activity.title} at ${activity.resort.name}`,
        path: `/activities/${activity.activitySlug}`,
        description:
          activity.startDateTime ??
          activity.scheduleText ??
          activity.summary ??
          "Current resort activity",
      }))
    )
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Hero
        title={pageMetadata.title}
        subtitle={pageMetadata.description}
        compactBrowse
      />
      <AnswerBlock
        eyebrow="Activity finder"
        title="Browse by what your group needs"
        primaryAction={{ label: "Use activity filters", href: pageMetadata.canonical }}
        secondaryActions={[
          { label: "See today", href: "/today" },
          { label: "See tonight", href: "/tonight" },
        ]}
      >
        Use the activity directory to compare current resort recreation by
        resort, time, category, cost, weather fit, reservation needs, and
        transportation context.
      </AnswerBlock>
      <FreshnessFacts
        lastVerified={formatSeoDate(sourceSummary.latestVerified)}
        activityCount={sourceSummary.activityCount}
        sourceCount={sourceSummary.sourceCount}
      />
      <IntentLinkCluster
        title="Common activity needs"
        links={[
          { label: "Free activities", href: "/activities?free=true", description: "Current free and low-cost listings." },
          { label: "Indoor activities", href: "/activities?weather=indoor", description: "Rain and heat backups." },
          { label: "Movies", href: "/activities/movies-under-the-stars", description: "Outdoor movie details and schedules." },
        ]}
      />
      {strategicKey === "area=disney-springs" && (
        <section className="mb-6 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">
            Disney Springs transportation caveat
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary}
          </p>
        </section>
      )}
      <PlanClientBoundary>
        <Suspense fallback={<ActivityGridSkeleton columns={2} />}>
          <ExploreLayout
            activities={activities}
            officialOfferings={officialOfferings}
            resorts={resortOptions}
            filterImpact={filterImpact}
          />
        </Suspense>
      </PlanClientBoundary>
    </>
  );
}
