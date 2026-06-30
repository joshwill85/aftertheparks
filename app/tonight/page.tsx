import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/atlas/Hero";
import { TonightClient } from "@/components/atlas/TonightClient";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { BrandAsset } from "@/components/brand/BrandAsset";
import { BrowseFilterShell } from "@/components/explore/BrowseFilterShell";
import { PlanClientBoundary } from "@/components/plan/PlanClientBoundary";
import {
  getTonightActivities,
  getMovieNights,
  getResorts,
} from "@/lib/data/activities";
import {
  filterMovieNights,
  hasActiveBrowseFilters,
  parseBrowseParams,
} from "@/lib/explore/browseParams";
import { buildFilterImpact } from "@/lib/explore/filterImpact";
import {
  activityEventJsonLd,
  activityListJsonLd,
} from "@/lib/seo/activityPage";
import { stringifyJsonLd } from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import {
  getVisibleTonightActivities,
  getVisibleTonightFilterItems,
  getVisibleTonightMovieNights,
  getVisibleTonightResultCount,
  normalizeTonightFilters,
} from "@/lib/tonight/visibleResults";
import {
  loadWeatherByOccurrence,
  loadWeatherGuidanceForLocation,
  weatherQueryForActivity,
  weatherQueryForMovie,
} from "@/lib/weather/serverGuidance";
import { WEATHER_TIMEZONE } from "@/lib/weather/time";
import { fromZonedTime } from "date-fns-tz";

export const revalidate = 900;

const DEFAULT_TONIGHT_METADATA = {
  title: "Disney World Resort Activities Tonight",
  description:
    "Find tonight's Walt Disney World resort activities, including Movies Under the Stars, campfires, evening recreation, and current schedule caveats.",
  canonical: "/tonight",
};

const STRATEGIC_TONIGHT_FILTER_METADATA: Record<string, typeof DEFAULT_TONIGHT_METADATA> = {
  "weather=indoor": {
    title: "Indoor Disney Resort Activities Tonight",
    description:
      "Find indoor and weather-safer Walt Disney World resort activities tonight, with current schedule notes and outdoor-plan caveats.",
    canonical: "/tonight?weather=indoor",
  },
};

function strategicTonightFilterKey(params: Record<string, string | undefined>): string | undefined {
  const keys = Object.keys(params).filter((key) => params[key]);
  if (keys.length !== 1) return undefined;
  const key = keys[0];
  return `${key}=${params[key]}`;
}

function orlandoDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WEATHER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function tonightWeatherWindow(now: Date): { startsAt: Date; endsAt: Date } {
  const dateKey = orlandoDateKey(now);
  const fivePm = fromZonedTime(`${dateKey}T17:00:00`, WEATHER_TIMEZONE);
  const midnight = fromZonedTime(`${dateKey}T23:59:00`, WEATHER_TIMEZONE);
  return {
    startsAt: now.getTime() < fivePm.getTime() ? fivePm : now,
    endsAt: midnight,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const pageMetadata =
    STRATEGIC_TONIGHT_FILTER_METADATA[strategicTonightFilterKey(params) ?? ""] ??
    DEFAULT_TONIGHT_METADATA;

  return {
    title: pageMetadata.title,
    description: pageMetadata.description,
    alternates: { canonical: pageMetadata.canonical },
    ...buildSocialMetadata({
      title: pageMetadata.title,
      description: pageMetadata.description,
      path: pageMetadata.canonical,
      imageEyebrow: "Tonight at Disney resorts",
      imageSummary:
        pageMetadata.canonical === "/tonight"
          ? "Tonight's resort activities, outdoor movies, campfires, evening recreation, weather caveats, and source notes."
          : "A high-value filtered tonight view for current resort activities that match a specific evening-planning need.",
    }),
  };
}

export default async function TonightPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters = normalizeTonightFilters(parseBrowseParams(params));
  const weatherNow = new Date();
  const [activities, baseActivities, movieNights, resorts] = await Promise.all([
    getTonightActivities(filters),
    getTonightActivities({}),
    getMovieNights(),
    getResorts(),
  ]);

  const filteredMovies = getVisibleTonightMovieNights(
    filterMovieNights(movieNights, filters)
  );
  const visibleActivities = getVisibleTonightActivities(activities);
  const weatherWindow = tonightWeatherWindow(weatherNow);
  const initialPageWeather = await loadWeatherGuidanceForLocation({
    locationKey: "all_wdw",
    startsAt: weatherWindow.startsAt,
    endsAt: weatherWindow.endsAt,
    now: weatherNow,
    timeBasis: "page_area_window",
    timeBasisLabel: "Tonight across Walt Disney World",
  });
  const initialWeatherById = await loadWeatherByOccurrence({
    occurrences: [
      ...visibleActivities.map((activity) => weatherQueryForActivity(activity, weatherNow)),
      ...filteredMovies.map(weatherQueryForMovie),
    ].filter((query): query is NonNullable<typeof query> => Boolean(query)),
    now: weatherNow,
  });
  const filteredMode = hasActiveBrowseFilters(filters);
  const resultCount = getVisibleTonightResultCount({
    activities: visibleActivities,
    movieNights: filteredMovies,
  });
  const resortOptions = resorts.map((r) => ({ slug: r.slug, name: r.name }));
  const filterImpact = buildFilterImpact(
    getVisibleTonightFilterItems({
      activities: baseActivities,
      movieNights,
    }),
    filters,
    resortOptions
  );
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const jsonLd = stringifyJsonLd([
    activityListJsonLd(baseUrl, "Walt Disney World resort activities tonight", visibleActivities),
    ...activityEventJsonLd(baseUrl, visibleActivities),
  ]);

  return (
    <div className="tonight-page -mx-4 -mt-8 min-h-[calc(100vh-72px)] px-4 py-8 pb-24 md:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Hero
        title="Tonight at Disney World Resorts"
        subtitle="Low-effort movies, campfires, games, and activities after the parks."
        compactBrowse
      />
      <div className="mb-6 flex justify-center">
        <BrandAsset asset="dark-lockup" className="brand-asset--night-feature" />
      </div>
      <PlanClientBoundary>
        <Suspense fallback={<ActivityGridSkeleton columns={2} />}>
          <BrowseFilterShell
            variant="tonight"
            resorts={resortOptions}
            resultCount={resultCount}
            filterImpact={filterImpact}
          >
            <TonightClient
              activities={visibleActivities}
              movieNights={filteredMovies}
              filteredMode={filteredMode}
              initialPageWeather={initialPageWeather}
              initialWeatherById={initialWeatherById}
            />
          </BrowseFilterShell>
        </Suspense>
      </PlanClientBoundary>
    </div>
  );
}
