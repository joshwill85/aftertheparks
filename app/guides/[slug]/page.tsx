import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Hero } from "@/components/atlas/Hero";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SeoFaq } from "@/components/seo/SeoFaq";
import { getResorts, getTodayActivities, getTonightActivities } from "@/lib/data/activities";
import {
  SEO_COMPARISON_PAGES,
  getActivitiesForComparisonPage,
  getSeoComparisonPageBySlug,
  rankResortsForComparisonPage,
} from "@/lib/seo/comparisonPages";
import { SEO_MISTAKE_LOG, type SeoMistake } from "@/lib/seo/fit";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildGuideArticleJsonLd,
  buildItemListJsonLd,
  stringifyJsonLd,
} from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT, shouldShowDisneySpringsCaveat } from "@/lib/seo/transportation";
import { getSeoGuideBySlug, HIGH_VALUE_GUIDES } from "@/lib/seo/routes";
import type { SeoFaqItem } from "@/lib/seo/faqs";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { WeatherStatusStrip } from "@/components/weather/WeatherStatusStrip";

export const revalidate = 86400;

const GUIDE_DATE_MODIFIED = "2026-06-27";
const GUIDE_LAST_UPDATED_LABEL = "June 27, 2026";
const GUIDE_ALIAS_REDIRECTS: Record<string, string> = {
  "best-disney-resort-activities-for-toddlers": "best-disney-resorts-for-toddlers",
  "best-disney-resort-activities-for-teens": "best-disney-resorts-for-teens",
  "best-disney-resort-activities-for-adults": "best-disney-resorts-for-adults",
  "best-disney-resorts-without-park-ticket": "best-resorts-if-you-do-not-have-a-park-ticket",
  "boardwalk-area-resort-activities": "best-boardwalk-area-resort-activities",
  "fort-wilderness-activities-without-park-ticket": "best-fort-wilderness-activities-without-a-park-ticket",
};

function linkLabel(path: string): string {
  if (path === "/today") return "Today";
  if (path === "/tonight") return "Tonight";
  if (path === "/activities") return "Activities";
  if (path === "/resorts") return "Resorts";
  if (path === "/source-and-accuracy-policy") return "Source and accuracy policy";

  const [pathname, search] = path.split("?");
  const label = pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return search ? `${label ?? path} filter` : label ?? path;
}

type MistakePageInput = {
  slug: string;
  title: string;
  description?: string;
  sections?: readonly string[];
  deepLinks?: readonly string[];
  caveats?: readonly string[];
  transportationNotes?: readonly string[];
};

function normalizedMistakeSearchText(page: MistakePageInput): string {
  return [
    page.slug,
    page.title,
    page.description,
    ...(page.sections ?? []),
    ...(page.deepLinks ?? []),
    ...(page.caveats ?? []),
    ...(page.transportationNotes ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function mistakeKeysForPage(page: MistakePageInput): Set<string> {
  const searchText = normalizedMistakeSearchText(page);
  const keys = new Set<string>();

  if (/(rain|storm|indoor|covered|weather)/.test(searchText)) keys.add("rainy_day");
  if (/(first[- ]night|arrival|check[- ]?in|travel day|tonight)/.test(searchText)) keys.add("first_night");
  if (/(resort[- ]hop|resort hopping|transport|monorail|skyliner|boat|bus|disney springs)/.test(searchText)) {
    keys.add("resort_hopping");
  }
  if (/(no[- ]ticket|without[- ]a[- ]park[- ]ticket|park[- ]ticket|free|no park)/.test(searchText)) {
    keys.add("no_ticket");
  }
  if (/(grandparent|multi[- ]generational|mobility|low[- ]walking|seating)/.test(searchText)) {
    keys.add("grandparents");
  }
  if (/(couple|date[- ]night|adult|romantic)/.test(searchText)) keys.add("couples");
  if (/disney springs/.test(searchText)) keys.add("disney_springs_area");

  return keys;
}

function mistakesForPage(page: MistakePageInput): SeoMistake[] {
  const keys = mistakeKeysForPage(page);
  const matches = SEO_MISTAKE_LOG.filter((mistake) =>
    mistake.appliesToPages.some((pageKey) => keys.has(pageKey))
  );

  if (matches.length > 0) return matches.slice(0, 4);
  return SEO_MISTAKE_LOG.filter((mistake) => mistake.severity === "high").slice(0, 2);
}

function evidenceLabel(evidenceType: SeoMistake["evidenceType"]): string {
  return {
    official_policy: "Official policy",
    community_pattern: "Community pattern",
    editor_experience: "Editor experience",
    data_pattern: "Data pattern",
  }[evidenceType];
}

function severityLabel(severity: SeoMistake["severity"]): string {
  return {
    low: "Low",
    medium: "Medium",
    high: "High",
  }[severity];
}

function latestVerifiedForComparison(activities: ActivityOccurrence[]): string {
  const latest = activities
    .map((activity) => new Date(activity.freshness.lastVerified).getTime())
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => b - a)[0];

  if (!latest) return "Check current source";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(latest));
}

function ComparisonPlanningContext({
  page,
  activities,
  rankedResortCount,
}: {
  page: GuidePlanningPage;
  activities: ActivityOccurrence[];
  rankedResortCount: number;
}) {
  const freeCount = activities.filter((activity) => activity.price.state === "free").length;
  const paidCount = activities.filter((activity) => activity.price.state === "fee").length;
  const unknownCount = activities.filter((activity) => activity.price.state === "unknown").length;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Who this is best for</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Use this page if you want a resort that matches this planning need:
          {" "}{page.decisionFilter}
        </p>
        <Link href={page.primaryAction.href} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
          {page.primaryAction.label}
        </Link>
      </article>
      <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Free vs paid notes</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Current activity snapshot: {freeCount} are marked free, {paidCount}
          {" "}show a fee signal, and {unknownCount} need price confirmation. Free
          activity status does not guarantee unrestricted resort access.
        </p>
      </article>
      <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Last verified data</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Last verified: {latestVerifiedForComparison(activities)}. This ranking
          uses {activities.length} current activities across {rankedResortCount}
          {" "}resorts, then applies the page freshness rule below.
        </p>
      </article>
    </section>
  );
}

function MistakesToAvoid({ mistakes }: { mistakes: SeoMistake[] }) {
  if (mistakes.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
      <h2 className="font-display text-2xl font-semibold">Mistakes to avoid</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        These are the planning traps this guide is designed to prevent, pulled from
        the reusable editorial risk log so the advice stays consistent across
        weather, transportation, no-ticket, first-night, and audience pages.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {mistakes.map((mistake) => (
          <article
            key={`${mistake.deepLink}-${mistake.mistake}`}
            className="rounded-xl border border-[var(--color-card-border)] p-4"
          >
            <h3 className="font-display text-lg font-semibold">{mistake.mistake}</h3>
            <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-bold uppercase tracking-wide text-[var(--color-muted)]">
                  Evidence
                </dt>
                <dd className="mt-1 font-semibold">{evidenceLabel(mistake.evidenceType)}</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-[var(--color-muted)]">
                  Severity
                </dt>
                <dd className="mt-1 font-semibold">{severityLabel(mistake.severity)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
              Fix: {mistake.fix}
            </p>
            <Link
              href={mistake.deepLink}
              className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline"
            >
              Open safer path
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

type GuidePlanningPage = MistakePageInput & {
  userPromise: string;
  decisionFilter: string;
  freshnessRule: string;
  primaryAction: {
    label: string;
    href: string;
  };
  deepLinks: readonly string[];
};

function buildGuideFaqItems(
  guide: GuidePlanningPage,
  showDisneySpringsCaveat: boolean
): SeoFaqItem[] {
  return [
    {
      question: `How should I use ${guide.title}?`,
      answer: `${guide.userPromise} Start with the quick answer, then use the live After the Parks links so the plan is based on current resort activity data instead of a static article.`,
    },
    {
      question: `What should I check before following this plan?`,
      answer: `Check current activity times, resort access, transportation, cost, eligibility, weather, and the official source before committing time or crossing property. The decision filter for this guide is: ${guide.decisionFilter}`,
    },
    {
      question: `Can I use this guide without a park ticket?`,
      answer: showDisneySpringsCaveat
        ? `${DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary} Use a resort stay, confirmed dining/experience reservation, rideshare, or another currently allowed direct route instead of treating Disney Springs as a free transfer hub.`
        : "Some ideas may work without park admission, but resort access, parking, transportation, reservations, and activity eligibility can still matter. Use no-ticket filters and confirm the official source before relying on a plan.",
    },
    {
      question: `How current is this guide?`,
      answer: `This guide is designed to route into live After the Parks activity, resort, today, and tonight pages. Freshness rule: ${guide.freshnessRule}`,
    },
  ];
}

function GuidePlanningModules({
  guide,
  showDisneySpringsCaveat,
}: {
  guide: GuidePlanningPage;
  showDisneySpringsCaveat: boolean;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
      <h2 className="font-display text-2xl font-semibold">Planning modules</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        Use these scenario checks to adapt the guide without creating thin
        one-off pages for every audience, weather, cost, and transportation
        variation.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border border-[var(--color-card-border)] p-4">
          <h3 className="font-display text-lg font-semibold">Best overall plan</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Start with the guide promise, then apply the decision filter before
            choosing a resort, route, activity, or reservation.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-card-border)] p-4">
          <h3 className="font-display text-lg font-semibold">Free plan</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Use free and low-cost filters first, but separate activity price from
            resort access, parking, transportation, capacity, and eligibility.
          </p>
          <Link href="/activities?free=true" className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Filter free activities
          </Link>
        </article>
        <article className="rounded-xl border border-[var(--color-card-border)] p-4">
          <h3 className="font-display text-lg font-semibold">Toddler plan</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Prefer short, close, flexible, shaded or indoor options with an easy
            exit before naps, storms, heat, or overstimulation.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-card-border)] p-4">
          <h3 className="font-display text-lg font-semibold">Teen plan</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Look for games, arcades, snacks, photo-friendly areas, evening energy,
            and clear meeting or return routes.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-card-border)] p-4">
          <h3 className="font-display text-lg font-semibold">Adult/couple plan</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Keep the plan relaxed: atmosphere, dining or lounge proximity, scenic
            movement, and one low-pressure activity beat an overstuffed route.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-card-border)] p-4">
          <h3 className="font-display text-lg font-semibold">Rainy-day plan</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Indoor and covered choices come first. Outdoor movies, campfires,
            poolside activities, boats, and Skyliner-dependent plans need caveats.
          </p>
          <Link href="/activities?weather=indoor" className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Find indoor backups
          </Link>
        </article>
        <article className="rounded-xl border border-[var(--color-card-border)] p-4">
          <h3 className="font-display text-lg font-semibold">First-night plan</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Stay close, flexible, and easy to abandon. Arrival delays and tired
            travelers make hard-to-reach reservations a fragile first move.
          </p>
          <Link href="/tonight" className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            See tonight
          </Link>
        </article>
        <article className="rounded-xl border border-[var(--color-card-border)] p-4">
          <h3 className="font-display text-lg font-semibold">Resort-hopping plan</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Favor your own resort, same-area options, direct routes, or
            reservation-backed plans before multi-transfer hopping.
          </p>
          {showDisneySpringsCaveat && (
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              {DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary}
            </p>
          )}
        </article>
        <article className="rounded-xl border border-[var(--color-card-border)] p-4">
          <h3 className="font-display text-lg font-semibold">Live activities today</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Use the live today and tonight views before trusting any plan that
            depends on times, weather, source freshness, or resort operations.
          </p>
          <Link href={guide.primaryAction.href} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            {guide.primaryAction.label}
          </Link>
        </article>
        <article className="rounded-xl border border-[var(--color-card-border)] p-4">
          <h3 className="font-display text-lg font-semibold">Best resorts for this plan</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Compare resorts by current activity depth, route simplicity, weather
            fit, cost, audience fit, and how easy the plan is to change.
          </p>
          <Link href="/resorts" className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Compare resorts
          </Link>
        </article>
        <article className="rounded-xl border border-[var(--color-card-border)] p-4">
          <h3 className="font-display text-lg font-semibold">Transportation notes</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Route quality is part of the recommendation. Avoid plans that only
            work by ignoring access, parking, weather, or return transportation.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-card-border)] p-4">
          <h3 className="font-display text-lg font-semibold">Sources and update notes</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {guide.freshnessRule} Confirm official Disney sources before travel,
            and use After the Parks for cross-resort planning context.
          </p>
        </article>
      </div>
    </section>
  );
}

function EditorialReviewBlock({
  showDisneySpringsCaveat,
}: {
  showDisneySpringsCaveat: boolean;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
      <h2 className="font-display text-2xl font-semibold">Editorial review</h2>
      <dl className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Reviewed by
          </dt>
          <dd className="mt-1 font-semibold">Reviewed by After the Parks</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Last updated
          </dt>
          <dd className="mt-1 font-semibold">{GUIDE_LAST_UPDATED_LABEL}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Site status
          </dt>
          <dd className="mt-1 font-semibold">
            After the Parks is independent and not affiliated with Disney.
          </dd>
        </div>
      </dl>
      <div className="mt-5 border-t border-[var(--color-card-border)] pt-4">
        <h3 className="font-display text-lg font-semibold">What changed in this update</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Added current-first planning modules, visible source and update notes,
          FAQ schema tied to on-page FAQ content, and reusable mistakes-to-avoid
          guidance connected to live After the Parks planning paths.
        </p>
        {showDisneySpringsCaveat && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            This update also keeps the Disney Springs transportation caveat
            prominent: use a resort stay, confirmed dining/experience
            reservation, rideshare, or another currently allowed direct route
            rather than treating Disney Springs as a free resort-transfer hub.
          </p>
        )}
      </div>
    </section>
  );
}

export function generateStaticParams() {
  return [
    ...HIGH_VALUE_GUIDES.map((guide) => ({ slug: guide.slug })),
    ...SEO_COMPARISON_PAGES.map((page) => ({ slug: page.slug })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = GUIDE_ALIAS_REDIRECTS[slug] ?? slug;
  const guide = getSeoGuideBySlug(canonicalSlug);
  const comparisonPage = getSeoComparisonPageBySlug(canonicalSlug);
  if (!guide && !comparisonPage) return {};
  const page = guide ?? comparisonPage!;

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/guides/${page.slug}` },
    ...buildSocialMetadata({
      title: page.title,
      description: page.description,
      path: `/guides/${page.slug}`,
      type: "article",
      imageEyebrow: guide ? "Planning guide" : "Resort comparison",
      imageSummary:
        "Practical planning guidance with current activity links, source notes, transportation caveats, and clear exclusions.",
    }),
  };
}

export default async function SeoGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const redirectSlug = GUIDE_ALIAS_REDIRECTS[slug];
  if (redirectSlug) {
    permanentRedirect(`/guides/${redirectSlug}`);
  }

  const guide = getSeoGuideBySlug(slug);
  const comparisonPage = getSeoComparisonPageBySlug(slug);
  if (!guide && !comparisonPage) notFound();

  if (comparisonPage) {
    const [todayActivities, tonightActivities, resorts] = await Promise.all([
      getTodayActivities({}),
      getTonightActivities({}),
      getResorts(),
    ]);
    const activities = Array.from(
      new Map([...todayActivities, ...tonightActivities].map((activity) => [activity.id, activity])).values()
    );
    const comparisonActivities = getActivitiesForComparisonPage(comparisonPage, activities);
    const rankedResorts = rankResortsForComparisonPage(comparisonPage, activities);
    const shownResorts = rankedResorts.slice(0, 8);
    const mistakes = mistakesForPage(comparisonPage);
    const showDisneySpringsCaveat = shouldShowDisneySpringsCaveat(comparisonPage.slug) ||
      comparisonPage.transportationNotes.some((note) => note.toLowerCase().includes("disney springs"));
    const sourceCount = new Set(
      activities
        .map((activity) => activity.freshness.sourceUrl || activity.source?.url)
        .filter(Boolean)
    ).size;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
    const jsonLd = stringifyJsonLd([
      buildBreadcrumbJsonLd(baseUrl, [
        { name: "Guides", path: "/guides" },
        { name: comparisonPage.title, path: `/guides/${comparisonPage.slug}` },
      ]),
      buildGuideArticleJsonLd(baseUrl, {
        slug: comparisonPage.slug,
        title: comparisonPage.title,
        description: comparisonPage.description,
        dateModified: GUIDE_DATE_MODIFIED,
      }),
      buildItemListJsonLd(
        baseUrl,
        `${comparisonPage.title} ranked resorts`,
        shownResorts.map((resort) => ({
          name: resort.resortName,
          path: `/resorts/${resort.resortSlug}`,
          description: resort.reason,
        }))
      ),
    ]);

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
        <Breadcrumbs
          items={[
            { name: "Guides", href: "/guides" },
            { name: comparisonPage.title },
          ]}
        />
        <Hero title={comparisonPage.title} subtitle={comparisonPage.description} />

        <article className="space-y-8">
          <EditorialReviewBlock
            showDisneySpringsCaveat={showDisneySpringsCaveat}
          />

          <WeatherStatusStrip
            state="normal"
            headline="Weather-aware planning layer"
            summary="Rainy-day, first-night, grandparents, toddlers, couples, transportation, and resort-hopping guidance should prioritize indoor and covered backups during heat, rain, lightning, or wind-sensitive windows."
            actions={[
              { label: "Indoor activities", href: "/activities?weather=indoor" },
              { label: "Covered options", href: "/activities?weather=covered" },
            ]}
          />
          <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
            <h2 className="font-display text-2xl font-semibold">Live data snapshot</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                  Resorts checked
                </dt>
                <dd className="font-semibold">{resorts.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                  Current activities
                </dt>
                <dd className="font-semibold">{activities.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                  Resorts with enough data
                </dt>
                <dd className="font-semibold">{rankedResorts.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                  Sources
                </dt>
                <dd className="font-semibold">{sourceCount}</dd>
              </div>
            </dl>
          </section>

          <ComparisonPlanningContext
            page={comparisonPage}
            activities={comparisonActivities}
            rankedResortCount={rankedResorts.length}
          />

          <section>
            <h2 className="font-display text-2xl font-semibold">Best resorts right now</h2>
            <div className="mt-4 grid gap-4">
              {shownResorts.map((resort, index) => (
                <article
                  key={resort.resortSlug}
                  className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                    Rank {index + 1}
                  </p>
                  <h3 className="font-display mt-1 text-xl font-semibold">
                    <Link href={`/resorts/${resort.resortSlug}`} className="hover:text-[var(--accent)]">
                      {resort.resortName}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                    {resort.reason}
                  </p>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    Sample activities: {resort.sampleActivities.join(", ") || "Check current listings before planning."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[var(--color-muted)]">
                    <span>{resort.activityCount} matching</span>
                    <span>{resort.freeCount} free</span>
                    <span>{resort.eveningCount} evening</span>
                  </div>
                </article>
              ))}
              {shownResorts.length === 0 && (
                <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 text-sm text-[var(--color-muted)]">
                  <h3 className="font-display text-xl font-semibold text-[var(--brand-ink)]">
                    We do not have enough current data to rank this yet.
                  </h3>
                  <p className="mt-2 leading-relaxed">
                    We do not want to guess. Start with the current activity pages below,
                    then confirm the resort schedule before you go.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
              <h2 className="font-display text-2xl font-semibold">Decision filter</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {comparisonPage.decisionFilter}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
              <h2 className="font-display text-2xl font-semibold">What this excludes</h2>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {comparisonPage.exclusionRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
              <h2 className="font-display text-2xl font-semibold">Who should skip it</h2>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {comparisonPage.skipIf.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
              <h2 className="font-display text-2xl font-semibold">Transportation and access notes</h2>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {comparisonPage.transportationNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
            <h2 className="font-display text-2xl font-semibold">Live planning paths</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {comparisonPage.deepLinks.map((href) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full border border-[var(--color-card-border)] px-4 py-2 text-sm font-bold text-[var(--accent)] hover:bg-[var(--color-card-subtle)]"
                >
                  {linkLabel(href)}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
              Freshness rule: {comparisonPage.freshnessRule}
            </p>
          </section>

          <MistakesToAvoid mistakes={mistakes} />
        </article>
      </>
    );
  }

  if (!guide) notFound();

  const showDisneySpringsCaveat =
    shouldShowDisneySpringsCaveat(guide.slug) ||
    guide.caveats.some((caveat) => caveat.toLowerCase().includes("disney springs"));
  const mistakes = mistakesForPage(guide);
  const faqItems = buildGuideFaqItems(guide, showDisneySpringsCaveat);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const jsonLd = stringifyJsonLd([
    buildBreadcrumbJsonLd(baseUrl, [
      { name: "Guides", path: "/guides" },
      { name: guide.title, path: `/guides/${guide.slug}` },
    ]),
    buildGuideArticleJsonLd(baseUrl, {
      slug: guide.slug,
      title: guide.title,
      description: guide.description,
      dateModified: GUIDE_DATE_MODIFIED,
    }),
    buildFaqPageJsonLd(baseUrl, `/guides/${guide.slug}`, faqItems),
    buildItemListJsonLd(
      baseUrl,
      `${guide.title} planning paths`,
      guide.deepLinks.map((href) => ({
        name: linkLabel(href),
        path: href,
        description: `Live After the Parks planning route for ${guide.title}.`,
      }))
    ),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Breadcrumbs
        items={[
          { name: "Guides", href: "/guides" },
          { name: guide.title },
        ]}
      />
      <Hero title={guide.title} subtitle={guide.description} />

      <article className="space-y-8">
        <EditorialReviewBlock
          showDisneySpringsCaveat={showDisneySpringsCaveat}
        />

        <section>
          <h2 className="font-display text-2xl font-semibold">Start here</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {guide.sections.map((section) => (
              <div
                key={section}
                className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"
              >
                <h3 className="font-display text-xl font-semibold">{section}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                  Check current times, cost, weather, access, and transportation before
                  building this part of the day around one activity.
                </p>
              </div>
            ))}
          </div>
        </section>

        <GuidePlanningModules
          guide={guide}
          showDisneySpringsCaveat={showDisneySpringsCaveat}
        />

        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Important caveats</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {guide.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
            {showDisneySpringsCaveat && (
              <li>{DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary}</li>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Live planning paths</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/today" className="text-sm font-bold text-[var(--accent)] hover:underline">
              Today
            </Link>
            <Link href="/tonight" className="text-sm font-bold text-[var(--accent)] hover:underline">
              Tonight
            </Link>
            <Link href="/activities" className="text-sm font-bold text-[var(--accent)] hover:underline">
              Activities
            </Link>
            <Link href="/resorts" className="text-sm font-bold text-[var(--accent)] hover:underline">
              Resorts
            </Link>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
            Use these pages to check what is current, nearby, weather-appropriate,
            and worth doing today.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">
            Planning quality checks
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <h3 className="font-display text-lg font-semibold">
                Decision filter
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {guide.decisionFilter}
              </p>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">
                Why After the Parks
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {guide.afterTheParksAdvantage}
              </p>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">
                What this avoids
              </h3>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {guide.exclusionRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-5 border-t border-[var(--color-card-border)] pt-4">
            <h3 className="font-display text-lg font-semibold">
              Best next clicks
            </h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {guide.deepLinks.map((href) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full border border-[var(--color-card-border)] px-4 py-2 text-sm font-bold text-[var(--accent)] hover:bg-[var(--color-card-subtle)]"
                >
                  {linkLabel(href)}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <MistakesToAvoid mistakes={mistakes} />

        <SeoFaq title="FAQ" items={faqItems} />

        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Sources and update notes</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            After the Parks is independent and not affiliated with Disney. Guide
            recommendations should be checked against current official sources,
            live activity data, weather, and transportation rules before you
            travel.
          </p>
          <Link
            href="/source-and-accuracy-policy"
            className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline"
          >
            Read source and accuracy policy
          </Link>
        </section>
      </article>
    </>
  );
}
