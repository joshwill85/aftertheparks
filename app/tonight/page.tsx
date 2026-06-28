import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Hero } from "@/components/atlas/Hero";
import { BrandAsset } from "@/components/brand/BrandAsset";
import { TonightClient } from "@/components/atlas/TonightClient";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { BrowseFilterShell } from "@/components/explore/BrowseFilterShell";
import { DecisionSummaryBar } from "@/components/planning/DecisionSummaryBar";
import { TrustInline } from "@/components/planning/TrustInline";
import {
  getEveningActivitiesThisWeek,
  getTonightActivities,
  getMovieNights,
  getResorts,
} from "@/lib/data/activities";
import {
  filterMovieNights,
  hasActiveBrowseFilters,
  parseBrowseParams,
} from "@/lib/explore/browseParams";
import {
  activityToFilterableItem,
  buildFilterImpact,
  movieToFilterableItem,
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
  weatherQueryForMovie,
} from "@/lib/weather/serverGuidance";
import { WEATHER_TIMEZONE } from "@/lib/weather/time";
import { fromZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

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
  const filters = parseBrowseParams(params);
  const weatherNow = new Date();
  const [
    activities,
    weekEveningActivities,
    baseActivities,
    movieNights,
    resorts,
  ] = await Promise.all([
    getTonightActivities(filters),
    getEveningActivitiesThisWeek(filters),
    getTonightActivities({}),
    getMovieNights(),
    getResorts(),
  ]);

  const filteredMovies = filterMovieNights(movieNights, filters);
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
      ...activities.map((activity) => weatherQueryForActivity(activity, weatherNow)),
      ...weekEveningActivities.map((activity) =>
        weatherQueryForActivity(activity, weatherNow)
      ),
      ...filteredMovies.map(weatherQueryForMovie),
    ].filter((query): query is NonNullable<typeof query> => Boolean(query)),
    now: weatherNow,
  });
  const filteredMode = hasActiveBrowseFilters(filters);
  const resultCount = activities.length + filteredMovies.length;
  const resortOptions = resorts.map((r) => ({ slug: r.slug, name: r.name }));
  const filterImpact = buildFilterImpact(
    [
      ...baseActivities.map(activityToFilterableItem),
      ...movieNights.map(movieToFilterableItem),
    ],
    filters,
    resortOptions
  );
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const sourceSummary = activitySourceSummary(baseActivities);
  const decisionSummary = buildDecisionSummary({
    activities,
    scope: "tonight",
  });
  const jsonLd = stringifyJsonLd([
    activityListJsonLd(baseUrl, "Walt Disney World resort activities tonight", activities),
    ...activityEventJsonLd(baseUrl, activities),
  ]);

  return (
    <div className="tonight-page -mx-4 -mt-8 min-h-[calc(100vh-72px)] px-4 py-8 pb-24 md:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Hero
        title="Tonight"
        subtitle="Evening resort activities, outdoor movies, campfires, and low-pressure after-park ideas."
        compactBrowse
      />
      <section className="mx-auto mb-8 max-w-6xl rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Quick answer</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Tonight&apos;s Walt Disney World resort activities can include movies,
          campfires, poolside games, trivia, crafts, lounges nearby, and other
          resort-specific evening options. Confirm outdoor and weather-sensitive
          plans before leaving your resort.
        </p>
        <TrustInline
          lastVerified={formatSeoDate(sourceSummary.latestVerified)}
          sourceCount={sourceSummary.sourceCount}
          rowCount={sourceSummary.activityCount}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/today" className="btn-secondary rounded-full px-5 py-3 text-sm font-bold">
            See today
          </Link>
          <Link href="/activities?daypart=evening" className="btn-secondary rounded-full px-5 py-3 text-sm font-bold">
            Evening activities
          </Link>
          <Link href="/source-and-accuracy-policy" className="text-sm font-bold text-[var(--accent)] hover:underline">
            Source and accuracy policy
          </Link>
        </div>
      </section>
      <section className="mx-auto mb-8 grid max-w-6xl gap-5 rounded-2xl border border-[rgba(255,200,87,0.28)] bg-[var(--night)] p-5 text-white md:grid-cols-[minmax(0,1fr)_360px] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--lantern)]">
            Starlight mode
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold">
            A calmer map for after-dark resort wins.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/78">
            Tonight is where the pocket-map idea gets cozy: movies, campfires,
            low-energy detours, and weather-aware backups before anyone crosses
            the resort.
          </p>
        </div>
        <BrandAsset
          asset="dark-lockup"
          className="brand-asset--night-feature justify-self-center"
        />
      </section>
      <DecisionSummaryBar summary={decisionSummary} />
      <Suspense fallback={<ActivityGridSkeleton columns={2} />}>
        <BrowseFilterShell
          variant="tonight"
          resorts={resortOptions}
          resultCount={resultCount}
          filterImpact={filterImpact}
        >
          <TonightClient
            activities={activities}
            weekEveningActivities={weekEveningActivities}
            movieNights={filteredMovies}
            filteredMode={filteredMode}
            initialPageWeather={initialPageWeather}
            initialWeatherById={initialWeatherById}
            initialTimelineNowIso={weatherNow.toISOString()}
          />
        </BrowseFilterShell>
      </Suspense>
    </div>
  );
}
