import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TodayClient } from "@/components/atlas/TodayClient";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { Hero } from "@/components/atlas/Hero";
import { BrowseFilterShell } from "@/components/explore/BrowseFilterShell";
import { DecisionSummaryBar } from "@/components/planning/DecisionSummaryBar";
import { TrustInline } from "@/components/planning/TrustInline";
import { getTodayActivities, getTomorrowPreview, getResorts } from "@/lib/data/activities";
import { parseBrowseParams } from "@/lib/explore/browseParams";
import {
  activityToFilterableItem,
  buildFilterImpact,
} from "@/lib/explore/filterImpact";
import {
  activityEventJsonLd,
  activityListJsonLd,
  activitySourceSummary,
  formatSeoDate,
} from "@/lib/seo/activityPage";
import { stringifyJsonLd } from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { buildDecisionSummary } from "@/lib/planning/decisionSummary";
import {
  loadWeatherByOccurrence,
  loadWeatherGuidanceForLocation,
  weatherQueryForActivity,
} from "@/lib/weather/serverGuidance";

export const dynamic = "force-dynamic";

const DEFAULT_TODAY_METADATA = {
  title: "Disney World Resort Activities Today",
  description:
    "See current Walt Disney World resort activities for today, including resort recreation, crafts, poolside activities, movies, campfires, and source-backed schedule notes.",
  canonical: "/today",
};

const STRATEGIC_TODAY_FILTER_METADATA: Record<string, typeof DEFAULT_TODAY_METADATA> = {
  "weather=indoor": {
    title: "Indoor Disney Resort Activities Today",
    description:
      "Find indoor and weather-safer Walt Disney World resort activities for today, including rainy-day backups and source-backed schedule notes.",
    canonical: "/today?weather=indoor",
  },
};

function strategicTodayFilterKey(params: Record<string, string | undefined>): string | undefined {
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
    STRATEGIC_TODAY_FILTER_METADATA[strategicTodayFilterKey(params) ?? ""] ??
    DEFAULT_TODAY_METADATA;

  return {
    title: pageMetadata.title,
    description: pageMetadata.description,
    alternates: { canonical: pageMetadata.canonical },
    ...buildSocialMetadata({
      title: pageMetadata.title,
      description: pageMetadata.description,
      path: pageMetadata.canonical,
      imageEyebrow: "Today at Disney resorts",
      imageSummary:
        pageMetadata.canonical === "/today"
          ? "Current resort activities for today with source-backed schedule notes, weather context, and planning links."
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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const sourceSummary = activitySourceSummary(baseActivities);
  const decisionSummary = buildDecisionSummary({
    activities,
    scope: "today",
  });
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
        title="Today"
        subtitle="What's still ahead for the rest of your resort day — sorted by time."
        compactBrowse
      />
      <section className="mb-8 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Quick answer</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Today at Walt Disney World resorts, use this page to find currently
          tracked recreation, crafts, poolside activities, games, movies,
          campfires, and source-backed resort options that still fit your day.
        </p>
        <TrustInline
          lastVerified={formatSeoDate(sourceSummary.latestVerified)}
          sourceCount={sourceSummary.sourceCount}
          rowCount={sourceSummary.activityCount}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/tonight" className="btn-secondary rounded-full px-5 py-3 text-sm font-bold">
            See tonight
          </Link>
          <Link href="/activities" className="btn-secondary rounded-full px-5 py-3 text-sm font-bold">
            Browse all activities
          </Link>
          <Link href="/source-and-accuracy-policy" className="text-sm font-bold text-[var(--accent)] hover:underline">
            Source and accuracy policy
          </Link>
        </div>
      </section>
      <DecisionSummaryBar summary={decisionSummary} />
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
    </>
  );
}
