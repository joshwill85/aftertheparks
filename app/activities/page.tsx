import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/atlas/Hero";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { ExploreLayout } from "@/components/explore/ExploreLayout";
import { DecisionSummaryBar } from "@/components/planning/DecisionSummaryBar";
import { TrustInline } from "@/components/planning/TrustInline";
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
import { buildItemListJsonLd, stringifyJsonLd } from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";
import { activitySourceSummary, formatSeoDate } from "@/lib/seo/activityPage";
import { buildDecisionSummary } from "@/lib/planning/decisionSummary";

export const dynamic = "force-dynamic";

const DEFAULT_ACTIVITY_METADATA = {
  title: "Walt Disney World Resort Activities",
  description:
    "Browse current Walt Disney World resort activities by time, resort, activity type, cost, weather fit, and no-park-day planning intent.",
  canonical: "/activities",
};

const STRATEGIC_ACTIVITY_FILTER_METADATA: Record<
  string,
  typeof DEFAULT_ACTIVITY_METADATA
> = {
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

function strategicFilterKey(params: Record<string, string | undefined>): string | undefined {
  const keys = Object.keys(params).filter((key) => params[key]);
  if (keys.length !== 1) return undefined;
  const key = keys[0];
  return `${key}=${params[key]}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const pageMetadata =
    STRATEGIC_ACTIVITY_FILTER_METADATA[strategicFilterKey(params) ?? ""] ??
    DEFAULT_ACTIVITY_METADATA;

  return {
    title: pageMetadata.title,
    description: pageMetadata.description,
    alternates: { canonical: pageMetadata.canonical },
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
  const strategicKey = strategicFilterKey(params);
  const pageMetadata =
    STRATEGIC_ACTIVITY_FILTER_METADATA[strategicKey ?? ""] ??
    DEFAULT_ACTIVITY_METADATA;
  const filters = parseBrowseParams(params);
  const [
    activities,
    officialOfferingsPool,
    baseActivities,
    baseOfficialOfferings,
    resorts,
  ] = await Promise.all([
    getFilteredActivities(filters),
    getFilteredOfficialOfferings(filters),
    getFilteredActivities({ limit: 500 }),
    getFilteredOfficialOfferings({ limit: 500 }),
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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const sourceSummary = activitySourceSummary(baseActivities);
  const decisionSummary = buildDecisionSummary({
    activities,
    scope: "activities",
  });
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
      <section className="mb-6">
        <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Quick answer</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Browse current Walt Disney World resort activities by time, resort,
            cost, weather fit, and no-park-day intent. Start here when you want
            the broad activity list, then narrow to today, tonight, indoor, free,
            or transportation-area views.
          </p>
          <TrustInline
            lastVerified={formatSeoDate(sourceSummary.latestVerified)}
            sourceCount={sourceSummary.sourceCount}
            rowCount={sourceSummary.activityCount}
          />
        </div>
      </section>
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
      <DecisionSummaryBar summary={decisionSummary} />
      <Suspense fallback={<ActivityGridSkeleton columns={2} />}>
        <ExploreLayout
          activities={activities}
          officialOfferings={officialOfferings}
          resorts={resortOptions}
          filterImpact={filterImpact}
        />
      </Suspense>
    </>
  );
}
