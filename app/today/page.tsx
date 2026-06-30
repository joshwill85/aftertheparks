import type { Metadata } from "next";
import { Suspense } from "react";
import { TodayClient } from "@/components/atlas/TodayClient";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { Hero } from "@/components/atlas/Hero";
import { BrowseFilterShell } from "@/components/explore/BrowseFilterShell";
import { PlanClientBoundary } from "@/components/plan/PlanClientBoundary";
import { AnswerBlock } from "@/components/seo/AnswerBlock";
import { FreshnessFacts } from "@/components/seo/FreshnessFacts";
import { IntentLinkCluster } from "@/components/seo/IntentLinkCluster";
import { getTodayActivities, getTomorrowPreview, getResorts } from "@/lib/data/activities";
import { parseBrowseParams } from "@/lib/explore/browseParams";
import {
  activityToFilterableItem,
  buildFilterImpact,
} from "@/lib/explore/filterImpact";
import {
  activitySourceSummary,
  activityEventJsonLd,
  activityListJsonLd,
  formatSeoDate,
} from "@/lib/seo/activityPage";
import { canonicalPolicyForParams } from "@/lib/seo/canonicalPolicy";
import { stringifyJsonLd } from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import {
  loadWeatherByOccurrence,
  loadWeatherGuidanceForLocation,
  weatherQueryForActivity,
} from "@/lib/weather/serverGuidance";

export const revalidate = 900;

const DEFAULT_TODAY_METADATA = {
  title: "Disney World Resort Activities Today",
  description:
    "See current Walt Disney World resort activities for today, including resort recreation, crafts, poolside activities, movies, campfires, and verified schedule notes.",
  canonical: "/today",
};

const STRATEGIC_TODAY_FILTER_METADATA: Record<string, typeof DEFAULT_TODAY_METADATA> = {
  "weather=indoor": {
    title: "Indoor Disney Resort Activities Today",
    description:
      "Find indoor and weather-safer Walt Disney World resort activities for today, including rainy-day backups and verified schedule notes.",
    canonical: "/today?weather=indoor",
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const canonicalPolicy = canonicalPolicyForParams("/today", params);
  const pageMetadata =
    STRATEGIC_TODAY_FILTER_METADATA[canonicalPolicy.strategicFilterKey ?? ""] ??
    DEFAULT_TODAY_METADATA;

  return {
    title: pageMetadata.title,
    description: pageMetadata.description,
    robots: { index: canonicalPolicy.index, follow: true },
    alternates: { canonical: canonicalPolicy.canonical },
    ...buildSocialMetadata({
      title: pageMetadata.title,
      description: pageMetadata.description,
      path: pageMetadata.canonical,
      imageEyebrow: "Today at Disney resorts",
      imageSummary:
        pageMetadata.canonical === "/today"
          ? "Current resort activities for today with verified schedule notes, weather context, and planning links."
          : "A high-value filtered today view for current resort activities that match a specific guest-planning need.",
    }),
  };
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseBrowseParams(params);
  const weatherNow = new Date();
  const [activities, tomorrowPreview, baseActivities, resorts] = await Promise.all([
    getTodayActivities(filters),
    getTomorrowPreview(filters),
    getTodayActivities({}),
    getResorts(),
  ]);
  const initialPageWeather = await loadWeatherGuidanceForLocation({
    locationKey: "all_wdw",
    startsAt: weatherNow,
    endsAt: new Date(weatherNow.getTime() + 12 * 60 * 60 * 1000),
    now: weatherNow,
    timeBasis: "page_area_window",
    timeBasisLabel: "Today across Walt Disney World",
  });
  const initialWeatherById = await loadWeatherByOccurrence({
    occurrences: [...activities, ...tomorrowPreview]
      .map((activity) => weatherQueryForActivity(activity, weatherNow))
      .filter((query): query is NonNullable<typeof query> => Boolean(query)),
    now: weatherNow,
  });
  const resortOptions = resorts.map((r) => ({ slug: r.slug, name: r.name }));
  const filterImpact = buildFilterImpact(
    baseActivities.map(activityToFilterableItem),
    filters,
    resortOptions
  );
  const sourceSummary = activitySourceSummary(activities);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const jsonLd = stringifyJsonLd([
    activityListJsonLd(baseUrl, "Walt Disney World resort activities today", activities),
    ...activityEventJsonLd(baseUrl, activities),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Hero
        title="Today at Disney World Resorts"
        subtitle="Activities still available today, sorted by start time."
        compactBrowse
      />
      <AnswerBlock
        eyebrow="Today"
        title="What can you still do today?"
        primaryAction={{ label: "Browse today's activities", href: "/today" }}
        secondaryActions={[{ label: "Indoor today", href: "/today?weather=indoor" }]}
      >
        Today&apos;s page shows currently listed Disney resort activities with
        resort, time, cost, category, and weather-aware filters. Confirm the
        final time and location with the resort before leaving.
      </AnswerBlock>
      <FreshnessFacts
        lastVerified={formatSeoDate(sourceSummary.latestVerified)}
        activityCount={sourceSummary.activityCount}
        sourceCount={sourceSummary.sourceCount}
      />
      <IntentLinkCluster
        title="Useful today shortcuts"
        links={[
          { label: "Tonight", href: "/tonight", description: "Evening activities after the parks." },
          { label: "Free activities", href: "/activities?free=true", description: "Current free options." },
          { label: "Choose a resort", href: "/resorts", description: "Filter around where you are staying." },
        ]}
      />
      <PlanClientBoundary>
        <Suspense fallback={<ActivityGridSkeleton columns={2} />}>
          <BrowseFilterShell
            variant="today"
            resorts={resortOptions}
            resultCount={activities.length}
            filterImpact={filterImpact}
          >
            <TodayClient
              initialActivities={activities}
              tomorrowPreview={tomorrowPreview}
              initialPageWeather={initialPageWeather}
              initialWeatherById={initialWeatherById}
            />
          </BrowseFilterShell>
        </Suspense>
      </PlanClientBoundary>
    </>
  );
}
