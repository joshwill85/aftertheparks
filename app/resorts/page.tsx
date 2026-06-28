import type { Metadata } from "next";
import { Hero } from "@/components/atlas/Hero";
import { ResortGrid } from "@/components/resort/ResortGrid";
import {
  getResorts,
  getTodayActivities,
  getTonightActivities,
} from "@/lib/data/activities";
import {
  buildResortEnrichment,
} from "@/lib/resorts/enrichment";
import {
  buildNoTicketFriendlyResortStats,
  filterResortsForSeoIntent,
} from "@/lib/resorts/seoFilters";
import { buildItemListJsonLd, stringifyJsonLd } from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";
import { activitySourceSummary, formatSeoDate } from "@/lib/seo/activityPage";

export const dynamic = "force-dynamic";

const DEFAULT_RESORT_METADATA = {
  title: "Walt Disney World Resort Activity Calendars by Resort",
  description:
    "Browse Disney-owned Walt Disney World resort hotels with current activity, movie, campfire, recreation, and today/tonight schedule highlights.",
  canonical: "/resorts",
};

const NO_TICKET_FRIENDLY_RESORT_METADATA = {
  title: "Disney Resorts With No-Ticket-Friendly Activities",
  description:
    "Find Walt Disney World resorts with current no-ticket-friendly activities, while confirming resort access, parking, transportation, resort stay, and dining/experience reservation caveats.",
  canonical: "/resorts?no_ticket_friendly=true",
};

function resortMetadataForParams(params: Record<string, string | undefined>) {
  if (params.no_ticket_friendly === "true") return NO_TICKET_FRIENDLY_RESORT_METADATA;
  return DEFAULT_RESORT_METADATA;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const pageMetadata = resortMetadataForParams(params);

  return {
    title: pageMetadata.title,
    description: pageMetadata.description,
    alternates: { canonical: pageMetadata.canonical },
    ...buildSocialMetadata({
      title: pageMetadata.title,
      description: pageMetadata.description,
      path: pageMetadata.canonical,
      imageEyebrow: "Resort directory",
      imageSummary:
        pageMetadata.canonical === "/resorts"
          ? "Browse Disney-owned Walt Disney World resort hotels with current activity, movie, campfire, and recreation highlights."
          : "Start with resorts that currently show no-ticket-friendly activities, then verify access, parking, transportation, and reservation caveats.",
    }),
  };
}

function mapsToRecords<T>(map: Map<string, T>): Record<string, T> {
  return Object.fromEntries(map.entries());
}

export default async function ResortsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const noTicketFriendly = params.no_ticket_friendly === "true";
  const [resorts, tonightActivities, todayActivities] = await Promise.all([
    getResorts(),
    getTonightActivities(),
    getTodayActivities(),
  ]);

  const noTicketCounts = buildNoTicketFriendlyResortStats([
    ...todayActivities,
    ...tonightActivities,
  ]);
  const visibleResorts = filterResortsForSeoIntent(resorts, {
    noTicketFriendly,
    noTicketCounts,
  });
  const enrichment = buildResortEnrichment(todayActivities, tonightActivities);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const sourceSummary = activitySourceSummary([...todayActivities, ...tonightActivities]);
  const jsonLd = stringifyJsonLd(
    buildItemListJsonLd(
      baseUrl,
      "Walt Disney World resort activity calendar directory",
      visibleResorts.map((resort) => ({
        name: resort.name,
        path: `/resorts/${resort.slug}`,
        description: `${resort.activityCount} scheduled activities and ${resort.offeringCount} standing offerings tracked.`,
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
        title="Resorts"
        subtitle="All 31 Disney-owned and operated Walt Disney World resort hotels — filter by tier, area, or what's happening today."
      />
      <section className="mb-6 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Quick answer</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Use the resort directory to compare Disney-owned Walt Disney World
            resort hotels by current activity coverage, today and tonight
            highlights, movies, campfires, standing recreation, and no-park-day
            planning fit.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Source and freshness</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="font-bold text-[var(--color-muted)]">Last verified</dt>
              <dd className="font-semibold">
                {formatSeoDate(sourceSummary.latestVerified) ?? "Check current source"}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--color-muted)]">Verified activity rows</dt>
              <dd className="font-semibold">{sourceSummary.activityCount}</dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--color-muted)]">Official sources</dt>
              <dd className="font-semibold">{sourceSummary.sourceCount}</dd>
            </div>
          </dl>
          <a
            href="/source-and-accuracy-policy"
            className="mt-4 inline-flex text-sm font-bold text-[var(--accent)] hover:underline"
          >
            Source and accuracy policy
          </a>
        </div>
      </section>
      {noTicketFriendly && (
        <section className="mb-6 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">
            No-ticket-friendly resort starting points
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Showing resorts with current Today or Tonight activities that do not
            indicate park admission is required. Access, parking, and
            transportation rules can still vary by resort and date.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
            {DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary}
          </p>
        </section>
      )}
      <section className="resorts-page" aria-label="Resort directory">
        <ResortGrid
          resorts={visibleResorts}
          todayByResort={mapsToRecords(enrichment.todayByResort)}
          tonightByResort={mapsToRecords(enrichment.tonightByResort)}
          highlightsByResort={mapsToRecords(enrichment.highlightsByResort)}
        />
      </section>
    </>
  );
}
