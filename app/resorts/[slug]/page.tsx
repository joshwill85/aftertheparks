import type { Metadata } from "next";
import Link from "next/link";
import { ActivityCollectionView } from "@/components/atlas/ActivityCollectionView";
import { ActivityOfferingGrid } from "@/components/activity/ActivityOfferingGrid";
import { PlanClientBoundary } from "@/components/plan/PlanClientBoundary";
import { getResortTierGradient } from "@/components/resort/ResortCard";
import { ResortActivityConstellation } from "@/components/resort/ResortActivityConstellation";
import { ResortEmptyState } from "@/components/resort/ResortEmptyState";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SeoFaq } from "@/components/seo/SeoFaq";
import {
  getResorts,
  getResortBySlug,
  getResortActivities,
  getResortTimeline,
  getTodayActivities,
  getTonightActivities,
} from "@/lib/data/activities";
import { getOfficialOfferingsForResort } from "@/lib/data/officialOfferings";
import { NearTermRainLine } from "@/components/weather/NearTermRainLine";
import { ResortWeatherPersonality } from "@/components/weather/ResortWeatherPersonality";
import { WeatherFreshnessLine } from "@/components/weather/WeatherFreshnessLine";
import { WeatherPrecipMapPreview } from "@/components/weather/WeatherPrecipMapPreview";
import { getResortWeatherProfile } from "@/lib/weather/resortWeatherProfiles";
import { loadWeatherGuidanceForLocation } from "@/lib/weather/serverGuidance";
import {
  buildActivityEventJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildItemListJsonLd,
  buildResortAccommodationJsonLd,
  stringifyJsonLd,
  type JsonLdObject,
} from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { disneySpringsTransportationCaveat } from "@/lib/seo/transportation";
import { buildResortFaqItems } from "@/lib/seo/faqs";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { formatResortTier } from "@/lib/utils";
import { notFound } from "next/navigation";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resort = await getResortBySlug(slug);
  if (!resort) return {};

  const title = `${resort.name} Activities, Movies & Recreation Calendar`;
  const description = `Current Walt Disney World resort activities for ${resort.name}, including today and tonight highlights, movies, campfires, recreation offerings, and planning caveats.`;

  return {
    title,
    description,
    alternates: { canonical: `/resorts/${resort.slug}` },
    ...buildSocialMetadata({
      title,
      description,
      path: `/resorts/${resort.slug}`,
      type: "article",
      imageEyebrow: "Resort recreation calendar",
      imageSummary:
        "Current resort activities, today and tonight highlights, recreation offerings, source freshness, and planning caveats.",
    }),
  };
}

function ResortSectionHeader({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
        )}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="text-sm font-bold text-[var(--accent)] hover:underline"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: value.includes("T") ? "America/New_York" : "UTC",
  }).format(date);
}

function latestVerified(activities: ActivityOccurrence[]): string | undefined {
  const times = activities
    .map((activity) => new Date(activity.freshness.lastVerified).getTime())
    .filter((time) => Number.isFinite(time));
  if (times.length === 0) return undefined;
  return new Date(Math.max(...times)).toISOString();
}

function scheduleWindow(activities: ActivityOccurrence[]) {
  const validFrom = activities
    .map((activity) => activity.validFrom)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  const validUntil = activities
    .map((activity) => activity.validUntil)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return { validFrom, validUntil };
}

function sourceUrls(activities: ActivityOccurrence[]): string[] {
  return Array.from(
    new Set(
      activities
        .map((activity) => activity.freshness.sourceUrl || activity.source?.url)
        .filter((value): value is string => Boolean(value))
    )
  );
}

const KIDS_CATEGORIES = new Set([
  "poolside",
  "arts_crafts",
  "arcade",
  "scavenger_hunt",
  "sports_games",
  "resort_activity",
]);

const ADULT_CATEGORIES = new Set([
  "arts_crafts",
  "fitness",
  "health_wellness",
  "music",
  "nighttime_entertainment",
  "resort_activity",
  "tours",
]);

const RAINY_DAY_CATEGORIES = new Set([
  "arcade",
  "arts_crafts",
  "community_hall",
  "resort_activity",
]);

const EVENING_CATEGORIES = new Set([
  "campfire",
  "movies_under_stars",
  "nighttime_entertainment",
  "music",
]);

function countActivities(
  activities: ActivityOccurrence[],
  predicate: (activity: ActivityOccurrence) => boolean
): number {
  return activities.filter(predicate).length;
}

function activityExamples(activities: ActivityOccurrence[], limit = 3): string {
  const titles = Array.from(new Set(activities.map((activity) => activity.title))).slice(
    0,
    limit
  );
  if (titles.length === 0) return "";
  if (titles.length === 1) return titles[0];
  return `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}`;
}

function activitySearchText(activity: ActivityOccurrence): string {
  return [
    activity.title,
    activity.summary,
    activity.category,
    activity.location.label,
    activity.enrichment?.weatherDependency,
    activity.enrichment?.programFamily,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function ResortPlanningSnapshot({
  resort,
  scheduledActivities,
  todayActivities,
  tonightActivities,
  nearbyResorts,
}: {
  resort: NonNullable<Awaited<ReturnType<typeof getResortBySlug>>>;
  scheduledActivities: ActivityOccurrence[];
  todayActivities: ActivityOccurrence[];
  tonightActivities: ActivityOccurrence[];
  nearbyResorts: Array<{ slug: string; name: string }>;
}) {
  const freeActivities = scheduledActivities.filter(
    (activity) => activity.price.state === "free"
  );
  const paidActivities = scheduledActivities.filter(
    (activity) => activity.price.state === "fee"
  );
  const kidFriendlyCount = countActivities(scheduledActivities, (activity) =>
    KIDS_CATEGORIES.has(activity.category)
  );
  const adultOptions = scheduledActivities.filter((activity) => {
    const text = activitySearchText(activity);
    return (
      ADULT_CATEGORIES.has(activity.category) ||
      /(adult|couple|date|fitness|yoga|painting|mosaic|music|tour|wellness|lounge)/.test(text)
    );
  });
  const rainyDayOptions = scheduledActivities.filter((activity) => {
    const text = activitySearchText(activity);
    return (
      RAINY_DAY_CATEGORIES.has(activity.category) ||
      /(indoor|covered|lobby|community hall|arcade|craft|mosaic|painting)/.test(text)
    );
  });
  const eveningOptions = scheduledActivities.filter(
    (activity) =>
      activity.daypart === "evening" ||
      activity.daypart === "late" ||
      EVENING_CATEGORIES.has(activity.category)
  );
  const nearbyNames = nearbyResorts.map((nearby) => nearby.name).join(", ");

  return (
    <section className="mb-10">
      <ResortSectionHeader
        title="Resort planning snapshot"
        description="Helpful next pages for today, tonight, free activities, rainy-day backups, and nearby resort plans."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">What&apos;s happening today</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {todayActivities.length > 0
              ? `${resort.name} has ${todayActivities.length} verified ${todayActivities.length === 1 ? "activity" : "activities"} tracked for today, including ${activityExamples(todayActivities) || "current resort recreation"}.`
              : `${resort.name} does not currently have a verified activity row for today in After the Parks data. Check the official resort source before planning around a same-day activity.`}
          </p>
          <Link href={`/today?resort=${resort.slug}`} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            View today at this resort
          </Link>
        </article>

        <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Best options tonight</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {tonightActivities.length > 0
              ? `Tonight at ${resort.name}, After the Parks is tracking ${tonightActivities.length} ${tonightActivities.length === 1 ? "option" : "options"} such as ${activityExamples(tonightActivities) || "evening resort recreation"}. Confirm time, location, weather, and eligibility before heading out.`
              : `No verified tonight listing is currently listed for ${resort.name}. Use nearby resort and indoor filters if you need a backup plan.`}
          </p>
          <Link href={`/tonight?resort=${resort.slug}`} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            View tonight at this resort
          </Link>
        </article>

        <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Free or low-cost options</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {freeActivities.length > 0
              ? `${freeActivities.length} tracked ${freeActivities.length === 1 ? "activity is" : "activities are"} currently marked free, including ${activityExamples(freeActivities) || "resort recreation"}. Access can still depend on resort rules, capacity, weather, or guest eligibility.`
              : "No verified activity for this resort is marked free right now. Confirm cost and eligibility before planning around a free option."}
          </p>
          <Link href={`/activities?resort=${resort.slug}&free=true`} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Filter free activities
          </Link>
        </article>

        <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Paid activities</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {paidActivities.length > 0
              ? `${paidActivities.length} tracked ${paidActivities.length === 1 ? "activity has" : "activities have"} a fee signal, including ${activityExamples(paidActivities) || "paid recreation"}. Check reservation, cancellation, and current price notes before committing.`
              : "No verified scheduled activity is marked as fee-based for this resort right now. Paid recreation can still exist as standing offerings, rentals, dining, or separately booked experiences."}
          </p>
          <Link href={`/activities?resort=${resort.slug}&sort=paid`} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            See paid-first activity view
          </Link>
        </article>

        <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Best for kids</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {kidFriendlyCount > 0
              ? `${resort.name} has ${kidFriendlyCount} tracked kid-friendly style ${kidFriendlyCount === 1 ? "option" : "options"} across poolside fun, crafts, games, scavenger hunts, or resort recreation.`
              : `Kid-friendly activity fit is not strongly represented in the current tracked schedule for ${resort.name}; check poolside, craft, and game filters before relying on this resort for a kids-first plan.`}
          </p>
          <Link href={`/activities?resort=${resort.slug}&category=arts_crafts`} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Start with crafts and easy activities
          </Link>
        </article>

        <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Best for adults</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {adultOptions.length > 0
              ? `${resort.name} has ${adultOptions.length} tracked adult-friendly ${adultOptions.length === 1 ? "option" : "options"}, including ${activityExamples(adultOptions) || "slower resort recreation, creative activities, wellness, or evening entertainment"}.`
              : `Adult-focused fit is not strongly represented in the current tracked schedule for ${resort.name}. Check fitness, creative, music, and evening filters before making this the centerpiece of an adults-only plan.`}
          </p>
          <Link href={`/activities?resort=${resort.slug}&audience=adults`} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Find adult-friendly activities
          </Link>
        </article>

        <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Indoor/weather backups</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {rainyDayOptions.length > 0
              ? `${resort.name} has ${rainyDayOptions.length} tracked rainy-day candidate ${rainyDayOptions.length === 1 ? "option" : "options"}, including ${activityExamples(rainyDayOptions) || "indoor or covered resort recreation"}. Keep outdoor movies, campfires, pools, boats, and exposed walks as confirm-before-going choices.`
              : `No strong indoor or covered activity set is currently listed for ${resort.name}. Start with the indoor and covered filters before relying on this resort during rain, lightning, or high heat.`}
          </p>
          <Link href={`/activities?resort=${resort.slug}&weather=indoor`} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Filter indoor options
          </Link>
        </article>

        <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Evening options</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {eveningOptions.length > 0
              ? `${resort.name} has ${eveningOptions.length} tracked evening-leaning ${eveningOptions.length === 1 ? "option" : "options"}, including ${activityExamples(eveningOptions) || "campfires, movies, or nighttime recreation"}.`
              : "No strong evening activity set is currently listed here. Use tonight and nearby-resort filters before building the night around this resort."}
          </p>
          <Link href={`/activities?resort=${resort.slug}&time=evening`} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Filter evening activities
          </Link>
        </article>

        <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 lg:col-span-2">
          <h2 className="font-display text-2xl font-semibold">Transportation and access notes</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            For a low-stress resort day, start at {resort.name}, then compare
            same-area resorts{nearbyNames ? ` such as ${nearbyNames}` : ""} before
            adding a longer transfer. Direct or near-direct routes are better
            fits for first-night, rainy-day, grandparents, toddlers, and no-ticket
            planning than bus-to-park-to-bus chains.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {disneySpringsTransportationCaveat()}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/tonight?near=my-resort&resort=${resort.slug}`} className="btn-secondary rounded-full px-5 py-3 text-sm font-bold">
              Tonight near this resort
            </Link>
            <Link href={`/activities?area=${resort.area}`} className="btn-secondary rounded-full px-5 py-3 text-sm font-bold">
              Compare nearby activities
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

export default async function ResortDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [
    resort,
    activities,
    resortTimeline,
    todayActivities,
    tonightActivities,
    officialOfferings,
    allResorts,
  ] =
    await Promise.all([
      getResortBySlug(slug),
      getResortActivities(slug),
      getResortTimeline(slug, 31),
      getTodayActivities({ resort: slug }),
      getTonightActivities({ resort: slug }),
      getOfficialOfferingsForResort(slug),
      getResorts(),
    ]);

  if (!resort) notFound();

  const uniqueActivities = Array.from(
    new Map(activities.map((a) => [a.activitySlug, a])).values()
  );
  const uniqueOfferings = Array.from(
    new Map(officialOfferings.map((a) => [a.offeringKey, a])).values()
  );
  const scheduledActivities = Array.from(
    new Map(
      [...resortTimeline, ...uniqueActivities].map((activity) => [
        `${activity.activityCatalogId}:${activity.startDateTime ?? activity.id}`,
        activity,
      ])
    ).values()
  );
  const isDarkTier = resort.category === "deluxe";
  const hasAnyActivities = scheduledActivities.length > 0 || uniqueOfferings.length > 0;
  const latestVerifiedAt = latestVerified(scheduledActivities);
  const { validFrom, validUntil } = scheduleWindow(scheduledActivities);
  const officialSourceUrls = sourceUrls(scheduledActivities);
  const nearbyResorts = allResorts
    .filter((candidate) => candidate.slug !== resort.slug)
    .filter((candidate) => candidate.area === resort.area)
    .slice(0, 4);
  const faqItems = buildResortFaqItems(resort, {
    scheduledCount: scheduledActivities.length,
    offeringCount: uniqueOfferings.length,
    todayCount: todayActivities.length,
    tonightCount: tonightActivities.length,
    sourceCount: officialSourceUrls.length,
  });
  const resortWeatherProfile = getResortWeatherProfile(resort.slug);
  const resortWeatherNow = new Date();
  const resortWeatherGuidance = await loadWeatherGuidanceForLocation({
    resortSlug: resort.slug,
    now: resortWeatherNow,
    startsAt: resortWeatherNow,
    endsAt: new Date(resortWeatherNow.getTime() + 12 * 60 * 60 * 1000),
    includePrecipMap: true,
    timeBasis: "page_area_window",
    timeBasisLabel: `${resort.name} resort-area weather`,
  });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const eventJsonLd = scheduledActivities
    .slice(0, 20)
    .map((activity) => buildActivityEventJsonLd(baseUrl, activity))
    .filter((entry): entry is JsonLdObject => Boolean(entry));
  const jsonLd = stringifyJsonLd([
    buildBreadcrumbJsonLd(baseUrl, [
      { name: "Resorts", path: "/resorts" },
      { name: resort.name, path: `/resorts/${resort.slug}` },
    ]),
    buildResortAccommodationJsonLd(baseUrl, {
      slug: resort.slug,
      name: resort.name,
      description: `Current After the Parks recreation calendar for ${resort.name}, including verified activities, today and tonight highlights, and planning caveats.`,
      dateModified: latestVerifiedAt,
      sourceUrl: officialSourceUrls[0],
    }),
    buildItemListJsonLd(
      baseUrl,
      `${resort.name} current activity calendar`,
      scheduledActivities.slice(0, 25).map((activity) => ({
        name: activity.title,
        path: `/activities/${activity.activitySlug}?resort=${resort.slug}`,
        description:
          activity.startDateTime ??
          activity.scheduleText ??
          activity.summary ??
          "Current resort activity",
      })),
      {
        dateModified: latestVerifiedAt,
        currentScheduleWindow:
          validFrom && validUntil
            ? `${validFrom} to ${validUntil}`
            : "Current resort activity listings",
        sourceSummary:
          officialSourceUrls.length > 0
            ? "Official Disney resort recreation sources are checked first, with visible freshness and caveats on the page."
            : "Current resort activity listings with visible freshness and planning caveats.",
      }
    ),
    buildFaqPageJsonLd(baseUrl, `/resorts/${resort.slug}`, faqItems),
    ...eventJsonLd,
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Breadcrumbs
        items={[
          { name: "Resorts", href: "/resorts" },
          { name: resort.name },
        ]}
      />

      <header className="mb-10 overflow-hidden rounded-3xl border border-[var(--color-card-border)] shadow-md">
        <div
          className="relative px-6 py-10 md:px-10 md:py-12"
          style={{ background: getResortTierGradient(resort.category) }}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"
            aria-hidden
          />
          <div className="relative">
            <p
              className={`text-sm font-bold uppercase tracking-widest ${
                isDarkTier ? "text-[var(--color-lantern)]" : "text-white/90"
              }`}
            >
              {formatResortTier(resort.category)}
            </p>
            <h1
              className={`font-display mt-2 text-4xl font-bold leading-tight md:text-5xl ${
                isDarkTier ? "text-white" : "text-[var(--brand-ink)]"
              }`}
              style={
                isDarkTier
                  ? { textShadow: "0 2px 24px rgba(0,0,0,0.35)" }
                  : undefined
              }
            >
              {resort.name}
            </h1>
            <p
              className={`mt-3 text-lg ${
                isDarkTier ? "text-white/85" : "text-[var(--brand-ink)]/80"
              }`}
            >
              {scheduledActivities.length} scheduled{" "}
              {scheduledActivities.length === 1 ? "activity" : "activities"}
              {uniqueOfferings.length > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-[var(--accent)]">
                    {uniqueOfferings.length} standing{" "}
                    {uniqueOfferings.length === 1 ? "offering" : "offerings"}
                  </span>
                </>
              )}
              {todayActivities.length > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-[var(--accent)]">
                    {todayActivities.length} today
                  </span>
                </>
              )}
              {tonightActivities.length > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-[var(--color-lantern)]">
                    {tonightActivities.length} tonight
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[var(--color-card-border)] bg-[var(--color-card)] px-6 py-4 md:px-10">
          <Link
            href={`/activities?resort=${resort.slug}`}
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--accent)] px-5 text-sm font-bold text-white"
          >
            Filter activities
          </Link>
          <Link
            href={`/today?resort=${resort.slug}`}
            className="btn-secondary inline-flex min-h-11 items-center rounded-full border border-[var(--color-card-border)] px-5 text-sm font-bold"
          >
            Today at this resort
          </Link>
          <Link
            href={`/tonight?resort=${resort.slug}`}
            className="btn-secondary inline-flex min-h-11 items-center rounded-full border border-[var(--color-card-border)] px-5 text-sm font-bold"
          >
            Tonight at this resort
          </Link>
        </div>
      </header>

      <section className="mb-10 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">No-park-day plan</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Start with activities at {resort.name}, keep the route simple, then
            add a nearby or evening option only after checking today&apos;s current
            schedule and weather.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/today?resort=${resort.slug}`} className="btn-primary rounded-full px-5 py-3 text-sm font-bold">
              Start with today
            </Link>
            <Link href={`/activities?resort=${resort.slug}&free=true`} className="btn-secondary rounded-full px-5 py-3 text-sm font-bold">
              Free options
            </Link>
            <Link href={`/tonight?resort=${resort.slug}`} className="btn-secondary rounded-full px-5 py-3 text-sm font-bold">
              Evening plan
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Planning shortcuts</h2>
          <div className="mt-3 grid gap-2 text-sm font-bold">
            <Link href={`/today?resort=${resort.slug}`} className="text-[var(--accent)] hover:underline">
              Activities today at {resort.name}
            </Link>
            <Link href={`/activities?resort=${resort.slug}&free=true`} className="text-[var(--accent)] hover:underline">
              Free activities at this resort
            </Link>
            <Link href={`/tonight?resort=${resort.slug}`} className="text-[var(--accent)] hover:underline">
              Tonight at your resort
            </Link>
            <Link href={`/activities?resort=${resort.slug}&weather=indoor`} className="text-[var(--accent)] hover:underline">
              Indoor and rainy-day options
            </Link>
          </div>
        </div>
      </section>

      <ResortPlanningSnapshot
        resort={resort}
        scheduledActivities={scheduledActivities}
        todayActivities={todayActivities}
        tonightActivities={tonightActivities}
        nearbyResorts={nearbyResorts}
      />

      <section className="mb-10 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <ResortSectionHeader
          title="Source and freshness"
          description="A compact status check for current resort recreation data before you build a plan around it."
        />
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Last verified
            </dt>
            <dd className="mt-1 font-semibold">
              {formatDate(latestVerifiedAt) ?? "Check current source"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Schedule window
            </dt>
            <dd className="mt-1 font-semibold">
              {validFrom && validUntil
                ? `${formatDate(validFrom)} - ${formatDate(validUntil)}`
                : "Varies by activity"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Verified listings
            </dt>
            <dd className="mt-1 font-semibold">{scheduledActivities.length}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Official sources
            </dt>
            <dd className="mt-1 font-semibold">{officialSourceUrls.length}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
          {officialSourceUrls[0] && (
            <a
              href={officialSourceUrls[0]}
              className="text-[var(--accent)] hover:underline"
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              Open primary official source
            </a>
          )}
          <Link href="/source-and-accuracy-policy" className="text-[var(--accent)] hover:underline">
            Source and accuracy policy
          </Link>
          <Link href="/corrections" className="text-[var(--accent)] hover:underline">
            Send a correction
          </Link>
        </div>
      </section>

      <section className="mb-10 grid gap-4 lg:grid-cols-2" aria-labelledby="nearby-related-heading">
        <div className="lg:col-span-2">
          <h2 id="nearby-related-heading" className="font-display text-2xl font-semibold">
            Nearby resorts and related activity links
          </h2>
        </div>
        <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Nearby resorts with activities tonight</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Tonight at nearby resorts can be a good backup when the route stays
            simple: compare tonight&apos;s activities in the same area before adding
            a transfer to the plan.
          </p>
          <div className="mt-4 grid gap-2 text-sm font-bold">
            {nearbyResorts.length > 0 ? (
              nearbyResorts.map((nearbyResort) => (
                <Link
                  key={nearbyResort.slug}
                  href={`/tonight?resort=${nearbyResort.slug}`}
                  className="text-[var(--accent)] hover:underline"
                >
                  Tonight at {nearbyResort.name}
                </Link>
              ))
            ) : (
              <Link href="/tonight" className="text-[var(--accent)] hover:underline">
                Compare all resort activities tonight
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Related activities</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            People also plan from these routes, which keep the next click tied
            to current schedules instead of a static article dead end.
          </p>
          <div className="mt-4 grid gap-2 text-sm font-bold">
            <Link href={`/activities?resort=${resort.slug}`} className="text-[var(--accent)] hover:underline">
              All activities at {resort.name}
            </Link>
            <Link href={`/calendar?resort=${resort.slug}`} className="text-[var(--accent)] hover:underline">
              Plan ahead at this resort
            </Link>
            <Link href={`/activities?area=${resort.area}`} className="text-[var(--accent)] hover:underline">
              Activities near this resort area
            </Link>
            <Link href="/resorts" className="text-[var(--accent)] hover:underline">
              Compare all resorts
            </Link>
          </div>
        </div>
      </section>

      <section id="rainy-day-options" className="mb-10 scroll-mt-24">
        <ResortSectionHeader
          title="Weather near this resort area"
          description="Use this to choose what works in rain, heat, and storm-sensitive windows before you commit to a resort day."
        />
        <WeatherFreshnessLine
          weather={resortWeatherGuidance}
          className="mb-4 block text-sm"
        />
        <NearTermRainLine signal={resortWeatherGuidance.nearTermRain} />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <WeatherPrecipMapPreview precipMap={resortWeatherGuidance.precipMap} />
          </div>
          <div className="space-y-4">
            {resortWeatherProfile && (
              <ResortWeatherPersonality profile={resortWeatherProfile} />
            )}
            <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
              <h2 className="font-display text-2xl font-semibold">
                Weather-safe backups
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                Start with indoor or covered activities at {resort.name}, then
                keep outdoor movies, pools, boats, campfires, and long walks as
                confirm-before-you-go options.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`/activities?resort=${resort.slug}&weather=indoor`} className="btn-secondary rounded-full px-5 py-3 text-sm font-bold">
                  Indoor options
                </Link>
                <Link href={`/activities?resort=${resort.slug}&weather=covered`} className="btn-secondary rounded-full px-5 py-3 text-sm font-bold">
                  Covered options
                </Link>
              </div>
            </section>
            <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
              <h2 className="font-display text-2xl font-semibold">
                Outdoor activities to confirm
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                Confirm pool games, campfires, outdoor movies, marina activity,
                and exposed walking plans when rain, lightning, heat, or wind
                enters the forecast.
              </p>
            </section>
          </div>
        </div>
      </section>

      {!hasAnyActivities ? (
        <ResortEmptyState resort={resort} />
      ) : (
        <>
          {uniqueActivities.length > 0 && (
            <ResortActivityConstellation
              activities={uniqueActivities}
              resortSlug={resort.slug}
              resortName={resort.name}
            />
          )}

          {scheduledActivities.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold">Full activity calendar</h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    One complete set of current calendar activities. Switch views
                    or sort without losing anything.
                  </p>
                </div>
                <Link
                  href={`/calendar?resort=${resort.slug}`}
                  className="text-sm font-bold text-[var(--accent)] hover:underline"
                >
                  Plan ahead at this resort
                </Link>
              </div>
              <PlanClientBoundary>
                <ActivityCollectionView
                  activities={scheduledActivities}
                  showResort={false}
                  defaultView="cards"
                />
              </PlanClientBoundary>
            </section>
          )}

          {uniqueOfferings.length > 0 && (
            <section id="official-offerings" className="mb-10 scroll-mt-24">
              <ResortSectionHeader
                title="Anytime resort options"
                description="These are resort activities or amenities that may not have a specific calendar time. Confirm hours, access, and availability before you go."
              />
              <ActivityOfferingGrid
                offerings={uniqueOfferings}
                showResort={false}
                nextSessions={resortTimeline}
              />
            </section>
          )}

        </>
      )}

      <section className="mb-10 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Source and caveat block</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          After the Parks is independent and not affiliated with Disney. Resort
          activity times, eligibility, prices, weather handling, and access rules
          can change, so confirm important details against the current official
          source before traveling across property.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          {disneySpringsTransportationCaveat()}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
          {officialSourceUrls[0] && (
            <a
              href={officialSourceUrls[0]}
              className="text-[var(--accent)] hover:underline"
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              Open official source
            </a>
          )}
          <Link href="/source-and-accuracy-policy" className="text-[var(--accent)] hover:underline">
            Source and accuracy policy
          </Link>
          <Link href="/corrections" className="text-[var(--accent)] hover:underline">
            Submit a correction
          </Link>
        </div>
      </section>

      <SeoFaq title="FAQ" items={faqItems} />

    </>
  );
}
