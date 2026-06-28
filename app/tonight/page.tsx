import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Hero } from "@/components/atlas/Hero";
import { TonightClient } from "@/components/atlas/TonightClient";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { BrowseFilterShell } from "@/components/explore/BrowseFilterShell";
import { getTonightActivities, getMovieNights, getResorts } from "@/lib/data/activities";
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

export const dynamic = "force-dynamic";

const DEFAULT_TONIGHT_METADATA = {
  title: "Disney World Resort Activities Tonight",
  description:
    "Find tonight's Walt Disney World resort activities, including Movies Under the Stars, campfires, evening recreation, and current schedule caveats.",
  canonical: "/tonight",
};

const STRATEGIC_TONIGHT_FILTER_METADATA: Record<string, typeof DEFAULT_TONIGHT_METADATA> = {
  "ticket_required=false": {
    title: "Disney Resort Activities Tonight Without a Park Ticket",
    description:
      "Find tonight's Walt Disney World resort activities that do not require park admission, with access, transportation, weather, and source caveats.",
    canonical: "/tonight?ticket_required=false",
  },
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
  const [activities, baseActivities, movieNights, resorts] = await Promise.all([
    getTonightActivities(filters),
    getTonightActivities({}),
    getMovieNights(),
    getResorts(),
  ]);

  const filteredMovies = filterMovieNights(movieNights, filters);
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
      />
      <section className="mx-auto mb-8 max-w-6xl rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Quick answer</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Tonight&apos;s Walt Disney World resort activities can include movies,
          campfires, poolside games, trivia, crafts, lounges nearby, and other
          resort-specific evening options. Confirm outdoor and weather-sensitive
          plans before leaving your resort.
        </p>
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

      <section className="mx-auto mb-8 max-w-6xl rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Source and freshness</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Last verified
            </dt>
            <dd className="font-semibold">
              {formatSeoDate(sourceSummary.latestVerified) ?? "Check current source"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Source-backed rows
            </dt>
            <dd className="font-semibold">{sourceSummary.activityCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Official sources
            </dt>
            <dd className="font-semibold">{sourceSummary.sourceCount}</dd>
          </div>
        </dl>
      </section>
      <Suspense fallback={<ActivityGridSkeleton columns={2} />}>
        <BrowseFilterShell
          variant="tonight"
          resorts={resortOptions}
          resultCount={resultCount}
          filterImpact={filterImpact}
        >
          <TonightClient
            activities={activities}
            movieNights={filteredMovies}
            filteredMode={filteredMode}
          />
        </BrowseFilterShell>
      </Suspense>
    </div>
  );
}
