import type { Metadata } from "next";
import Link from "next/link";
import { ActivityDetailClient } from "@/components/atlas/ActivityDetailClient";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SeoFaq } from "@/components/seo/SeoFaq";
import {
  buildActivityEventJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildItemListJsonLd,
  stringifyJsonLd,
  type JsonLdObject,
} from "@/lib/seo/jsonLd";
import {
  getActivitiesByArea,
  getActivityBySlug,
  getResortBySlug,
  getSimilarActivities,
} from "@/lib/data/activities";
import { canonicalActivitySlug } from "@/lib/activities/legacySlugs";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { getSeoActivityBySlug } from "@/lib/seo/routes";
import { buildActivityFaqItems, type SeoFaqItem } from "@/lib/seo/faqs";
import { ActivityWeatherBadge } from "@/components/weather/ActivityWeatherBadge";
import { ForecastCompare } from "@/components/weather/ForecastCompare";
import { NearTermRainLine } from "@/components/weather/NearTermRainLine";
import { WeatherFreshnessLine } from "@/components/weather/WeatherFreshnessLine";
import { WeatherPrecipMapPreview } from "@/components/weather/WeatherPrecipMapPreview";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { getActivityWeatherProfile } from "@/lib/weather/activityProfiles";
import { getCachedNwsAlerts, getCachedNwsAlertsForAllWdw, getCachedWeatherSnapshot } from "@/lib/weather/cache";
import { compareForecastTiming } from "@/lib/weather/forecastCompare";
import { buildWeatherGuidanceForTimeSpan } from "@/lib/weather/guidance";
import { getWeatherLocationForResort } from "@/lib/weather/locations";
import { getWeatherApiPrecipMapContext } from "@/lib/weather/precipMap";
import { chooseWeatherProviderForTimeSpan } from "@/lib/weather/providerRouter";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ resort?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { resort } = await searchParams;
  const canonicalSlug = canonicalActivitySlug(slug);
  const result = await getActivityBySlug(canonicalSlug, { resort });
  const fallback = getSeoActivityBySlug(canonicalSlug);

  if (!result && fallback) {
    return {
      title: `${fallback.title} at Walt Disney World Resorts`,
      description: fallback.description,
      alternates: { canonical: `/activities/${canonicalSlug}` },
      ...buildSocialMetadata({
        title: `${fallback.title} at Walt Disney World Resorts`,
        description: fallback.description,
        path: `/activities/${canonicalSlug}`,
        type: "article",
        imageEyebrow: "Resort activity guide",
        imageSummary:
          "Where this activity is offered, who it fits, cost and reservation notes, source caveats, and current schedule links.",
      }),
    };
  }

  if (!result) return {};

  const title = `${result.activity.title} at ${result.activity.resort.name}`;
  const description =
    result.activity.summary ||
    `Current Walt Disney World resort activity details for ${result.activity.title}, including schedule, resort, location, cost, source caveats, and similar activities.`;

  return {
    title,
    description,
    alternates: { canonical: `/activities/${canonicalSlug}` },
    ...buildSocialMetadata({
      title,
      description,
      path: `/activities/${canonicalSlug}`,
      type: "article",
      imageEyebrow: "Resort activity guide",
      imageSummary:
        "Current schedule details, resort location, cost, source caveats, similar activities, and confirm-before-going notes.",
    }),
  };
}

function ActivitySeoFallback({
  slug,
}: {
  slug: string;
}) {
  const activity = getSeoActivityBySlug(slug);
  if (!activity) return null;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const dateModified = new Date().toISOString();
  const faqItems: SeoFaqItem[] = [
    {
      question: `Is ${activity.title} currently scheduled?`,
      answer:
        "This evergreen activity guide can exist even when there is no confirmed current schedule row. Use the live today, tonight, or activity views to confirm current source-backed timing.",
    },
    {
      question: `What should I confirm before planning ${activity.title}?`,
      answer:
        "Confirm the current time, location, cost, reservation requirement, eligibility, and weather or operations caveats with the official resort source before heading out.",
    },
    {
      question: `Where should I go next for ${activity.title}?`,
      answer: `Use ${activity.currentCheckHref} for current listings, then open the resort or activity detail page for source and freshness notes.`,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: stringifyJsonLd(
            [
              buildBreadcrumbJsonLd(baseUrl, [
                { name: "Activities", path: "/activities" },
                { name: activity.title, path: `/activities/${activity.slug}` },
              ]),
              buildItemListJsonLd(
                baseUrl,
                `${activity.title} current planning paths`,
                [
                  {
                    name: `Current ${activity.title} listings`,
                    path: activity.currentCheckHref,
                    description:
                      "Source-backed current activity listings when available.",
                  },
                  {
                    name: "Today's resort activities",
                    path: "/today",
                    description: "Current resort activities tracked for today.",
                  },
                  {
                    name: "Tonight's resort activities",
                    path: "/tonight",
                    description: "Current evening resort activities tracked for tonight.",
                  },
                ],
                {
                  dateModified,
                  currentScheduleWindow: "Current source-backed activity listings",
                  sourceSummary:
                    "Evergreen activity guide with visible source and freshness notes; use current listings and official resort confirmation before planning.",
                }
              ),
              buildFaqPageJsonLd(
                baseUrl,
                `/activities/${activity.slug}`,
                faqItems
              ),
            ]
          ),
        }}
      />
      <Breadcrumbs
        items={[
          { name: "Activities", href: "/activities" },
          { name: activity.title },
        ]}
      />
      <article className="space-y-8">
      <header className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--accent)]">
          Activity guide
        </p>
        <h1 className="font-display mt-2 text-4xl font-bold">
          {activity.title} at Walt Disney World Resorts
        </h1>
        <p className="mt-3 max-w-3xl text-[var(--color-muted)]">
          {activity.description}
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Quick answer</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          {activity.title} can be a useful resort-day option when it matches your
          timing, weather, transportation, and access situation. Use the live
          activity views to confirm whether it is currently scheduled.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={activity.currentCheckHref}
            className="btn-primary rounded-full px-5 py-3 text-sm font-bold"
          >
            Check current listings
          </Link>
          <Link
            href="/activities"
            className="btn-secondary rounded-full px-5 py-3 text-sm font-bold"
          >
            Browse all activities
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Activity planning snapshot</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-subtle)] p-4">
            <h3 className="font-display text-lg font-semibold">Overview</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              {activity.title} is an evergreen Walt Disney World resort activity
              guide. Use it to understand the activity, then use live listings to
              confirm whether it is currently scheduled.
            </p>
          </article>
          <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-subtle)] p-4">
            <h3 className="font-display text-lg font-semibold">Participating resorts</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              Participating resorts can change by season, calendar, and source
              availability. The current activity views show the source-backed
              resort listings available now.
            </p>
          </article>
          <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-subtle)] p-4">
            <h3 className="font-display text-lg font-semibold">Today and tonight</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              Use the current today and tonight views before planning around this
              activity. Times, locations, movies, supplies, and weather decisions
              can change close to the event.
            </p>
            <Link
              href={activity.currentCheckHref}
              className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline"
            >
              Check current listings
            </Link>
          </article>
          <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-subtle)] p-4">
            <h3 className="font-display text-lg font-semibold">Cost and reservations</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              Cost, supplies, eligibility, and reservation needs vary by activity
              and resort. Confirm the current official source before treating this
              as free, paid, walk-up, or reservation-backed.
            </p>
          </article>
          <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-subtle)] p-4">
            <h3 className="font-display text-lg font-semibold">Best resorts for this activity</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              The best resort is the one with a current source-backed listing,
              simple access from where you are staying, and a backup that fits
              weather, timing, and transportation.
            </p>
          </article>
          <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-subtle)] p-4">
            <h3 className="font-display text-lg font-semibold">Tips</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              Start with the current listing, choose the easiest resort route,
              and keep a nearby indoor or low-walking backup if the activity is
              outdoors, time-sensitive, or popular.
            </p>
          </article>
          <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-subtle)] p-4">
            <h3 className="font-display text-lg font-semibold">Weather/cancellation caveats</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              Outdoor activities, poolside recreation, campfires, boats, movies,
              and exposed walking plans can change for rain, lightning, heat, or
              operations. Confirm close to the start time.
            </p>
          </article>
          <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-subtle)] p-4">
            <h3 className="font-display text-lg font-semibold">Similar activities</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              If this activity is unavailable, compare nearby activities in the
              same category or switch to the full activity directory for current
              source-backed alternatives.
            </p>
            <Link
              href="/activities"
              className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline"
            >
              Browse similar activities
            </Link>
          </article>
          <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-subtle)] p-4">
            <h3 className="font-display text-lg font-semibold">Official-source notes</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              Treat After the Parks as the cross-resort planning layer and Disney
              as the official source of record for final times, access, pricing,
              eligibility, and operational decisions.
            </p>
          </article>
          <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-subtle)] p-4">
            <h3 className="font-display text-lg font-semibold">Confirm before going</h3>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
              <li>Current time, location, and eligibility.</li>
              <li>Weather, operations, cost, supplies, and reservation needs.</li>
              {activity.caveats.slice(0, 2).map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Best for</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {activity.bestFor}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Confirm first</h2>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {activity.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">
          Source and freshness
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          This evergreen activity guide exists even when there is no currently
          confirmed schedule row for the exact activity. Day-of decisions should
          use source-backed current listings and official resort confirmation.
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="font-bold text-[var(--color-foreground)]">
              Last verified
            </dt>
            <dd className="mt-1 text-[var(--color-muted)]">
              No current source-backed schedule row is published for this
              evergreen guide. Use today, tonight, and official resort sources
              before relying on a specific time.
            </dd>
          </div>
        </dl>
        <Link
          href="/source-and-accuracy-policy"
          className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline"
        >
          Source and accuracy policy
        </Link>
      </section>
      <SeoFaq title="Common questions" items={faqItems} />
    </article>
    </>
  );
}

function latestVerifiedAt(
  occurrences: Array<{ freshness?: { lastVerified?: string } }>
): string | undefined {
  const times = occurrences
    .map((occurrence) => occurrence.freshness?.lastVerified)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((time) => Number.isFinite(time));
  if (times.length === 0) return undefined;
  return new Date(Math.max(...times)).toISOString();
}

function activityScheduleWindow(occurrences: ActivityOccurrence[]): string {
  const times = occurrences
    .map((occurrence) => occurrence.startDateTime ?? occurrence.validFrom)
    .filter((value): value is string => Boolean(value))
    .sort();
  const first = times[0];
  const last = times.at(-1);

  if (first && last && first !== last) return `${first} to ${last}`;
  if (first) return first;
  return "Current activity listings";
}

export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ resort?: string }>;
}) {
  const { slug } = await params;
  const { resort: homeResortSlug } = await searchParams;
  const canonicalSlug = canonicalActivitySlug(slug);

  if (canonicalSlug !== slug) {
    const suffix = homeResortSlug
      ? `?resort=${encodeURIComponent(homeResortSlug)}`
      : "";
    redirect(`/activities/${canonicalSlug}${suffix}`);
  }

  const result = await getActivityBySlug(canonicalSlug, {
    resort: homeResortSlug,
  });

  if (!result) {
    if (!getSeoActivityBySlug(canonicalSlug)) notFound();
    return <ActivitySeoFallback slug={canonicalSlug} />;
  }

  const { activity, upcoming } = result;
  const [similar, nearbyActivities, homeResort] = await Promise.all([
    getSimilarActivities(activity),
    getActivitiesByArea(activity.resort.area),
    homeResortSlug ? getResortBySlug(homeResortSlug) : Promise.resolve(null),
  ]);

  const homeBase = homeResort
    ? { slug: homeResort.slug, area: homeResort.area }
    : undefined;
  const activityWeatherLocation = getWeatherLocationForResort(activity.resort.slug);
  const activityWeatherNow = new Date();
  const activityWeatherStartsAt =
    upcoming[0]?.startDateTime ?? activity.startDateTime ?? activityWeatherNow.toISOString();
  const activityWeatherEndsAt =
    upcoming[0]?.endDateTime ??
    activity.endDateTime ??
    new Date(activityWeatherNow.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const activityWeatherSelection = chooseWeatherProviderForTimeSpan({
    now: activityWeatherNow,
    startsAt: activityWeatherStartsAt,
    endsAt: activityWeatherEndsAt,
  });
  const [activityWeatherSnapshotResult, activityWeatherAlertsResult] =
    await Promise.allSettled([
      getCachedWeatherSnapshot({
        location: activityWeatherLocation,
        provider: activityWeatherSelection.provider,
      }),
      activityWeatherLocation.key === "all_wdw"
        ? getCachedNwsAlertsForAllWdw()
        : getCachedNwsAlerts({ location: activityWeatherLocation }),
    ]);
  const activityWeatherSnapshot =
    activityWeatherSnapshotResult.status === "fulfilled"
      ? activityWeatherSnapshotResult.value
      : null;
  const activityWeatherAlertState =
    activityWeatherAlertsResult.status === "fulfilled"
      ? { status: "available" as const, alerts: activityWeatherAlertsResult.value }
      : { status: "unavailable" as const, alerts: [] };
  const activityWeatherGuidance = buildWeatherGuidanceForTimeSpan({
    locationKey: activityWeatherLocation.key,
    startsAt: activityWeatherStartsAt,
    endsAt: activityWeatherEndsAt,
    snapshot: activityWeatherSnapshot,
    alerts: activityWeatherAlertState.alerts,
    officialAlertStatus: activityWeatherAlertState.status,
    precipMap: getWeatherApiPrecipMapContext({
      location: activityWeatherLocation,
      now: activityWeatherNow,
    }),
  });

  const nearby = nearbyActivities.filter(
    (item) => item.activitySlug !== activity.activitySlug
  );
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const faqItems = buildActivityFaqItems(activity, upcoming.length);
  const eventJsonLd = upcoming
    .map((occurrence) => buildActivityEventJsonLd(baseUrl, occurrence))
    .filter((entry): entry is JsonLdObject => Boolean(entry));
  const activityDateModified =
    latestVerifiedAt([activity, ...upcoming]) ?? activity.freshness.lastVerified;
  const jsonLd = stringifyJsonLd([
    buildBreadcrumbJsonLd(baseUrl, [
      { name: "Activities", path: "/activities" },
      { name: activity.title, path: `/activities/${activity.activitySlug}` },
    ]),
    buildItemListJsonLd(
      baseUrl,
      `${activity.title} upcoming schedule`,
      upcoming.slice(0, 10).map((occurrence) => ({
        name: `${occurrence.title} at ${occurrence.resort.name}`,
        path: `/activities/${occurrence.activitySlug}`,
        description:
          occurrence.startDateTime ??
          occurrence.scheduleText ??
          occurrence.summary ??
          "Current activity occurrence",
      })),
      {
        dateModified: activityDateModified,
        currentScheduleWindow: activityScheduleWindow(upcoming),
        sourceSummary:
          "Official and source-backed resort activity data is checked first, with visible freshness, schedule, cost, reservation, weather, and caveat notes on the page.",
      }
    ),
    buildFaqPageJsonLd(baseUrl, `/activities/${activity.activitySlug}`, faqItems),
    ...eventJsonLd,
  ]);

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Breadcrumbs
        items={[
          { name: "Activities", href: "/activities" },
          { name: activity.title },
        ]}
      />
      <ActivityDetailClient
        activity={activity}
        upcoming={upcoming}
        similar={similar}
        nearbyActivities={nearby}
        homeResort={homeBase}
        faqItems={faqItems}
      />
      <section className="mt-8 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Weather fit</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          {getActivityWeatherProfile(activity.activitySlug).defaultWeatherCaveat ??
            "Use the latest weather guidance to decide whether this activity needs a backup."}
        </p>
        <WeatherFreshnessLine
          weather={activityWeatherGuidance}
          className="mt-3 block text-sm"
        />
        <NearTermRainLine signal={activityWeatherGuidance.nearTermRain} />
        <div className="mt-4 flex flex-wrap gap-2">
          {getActivityWeatherProfile(activity.activitySlug).weatherFit.map((fit) => (
            <ActivityWeatherBadge key={fit} fit={fit} />
          ))}
        </div>
        <WeatherPrecipMapPreview
          precipMap={activityWeatherGuidance.precipMap}
          className="mt-5"
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Backup recommendation
            </h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Weather-sensitive plans should keep an indoor or covered option
              nearby, especially for rain, heat, lightning, wind, pools, boats,
              Skyliner-dependent routes, outdoor movies, and campfires.
            </p>
            <Link
              href="/activities?weather=indoor"
              className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline"
            >
              Find indoor backups
            </Link>
          </div>
          <ForecastCompare
            result={compareForecastTiming({
              now: new Date(),
              startsAt: upcoming[0]?.startDateTime ?? new Date().toISOString(),
              isFlexible: !upcoming[0]?.startDateTime,
              confidence: upcoming[0]?.startDateTime
                ? "near_term_hourly"
                : "not_available_yet",
            })}
          />
        </div>
      </section>
    </article>
  );
}
