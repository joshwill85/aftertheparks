import type { Metadata } from "next";
import { Hero } from "@/components/atlas/Hero";
import { ResortGrid } from "@/components/resort/ResortGrid";
import { AnswerBlock } from "@/components/seo/AnswerBlock";
import { FreshnessFacts } from "@/components/seo/FreshnessFacts";
import { IntentLinkCluster } from "@/components/seo/IntentLinkCluster";
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
import { canonicalPolicyForParams } from "@/lib/seo/canonicalPolicy";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";
import { activitySourceSummary, formatSeoDate } from "@/lib/seo/activityPage";

export const revalidate = 86400;

const DEFAULT_RESORT_METADATA = {
  title: "Disney World Resort Activity Calendars",
  description:
    "Choose your resort to see today's activities, tonight's options, free activities, weather notes, and source freshness.",
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
  const canonicalPolicy = canonicalPolicyForParams("/resorts", params);
  const pageMetadata = resortMetadataForParams(params);

  return {
    title: pageMetadata.title,
    description: pageMetadata.description,
    robots: { index: canonicalPolicy.index, follow: true },
    alternates: { canonical: canonicalPolicy.canonical },
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
  const pageMetadata = resortMetadataForParams(params);
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
        title={pageMetadata.title}
        subtitle={pageMetadata.description}
      />
      <AnswerBlock
        eyebrow="Resort calendars"
        title="Start with the resort where you are staying"
        primaryAction={{ label: "Choose a resort", href: pageMetadata.canonical }}
        secondaryActions={[{ label: "Calendar hub", href: "/disney-world-resort-activity-calendars" }]}
      >
        Resort pages collect today&apos;s activities, tonight&apos;s options,
        free and paid recreation, weather notes, access caveats, and source
        freshness for each Disney-owned Walt Disney World resort hotel.
      </AnswerBlock>
      <FreshnessFacts
        lastVerified={formatSeoDate(sourceSummary.latestVerified)}
        activityCount={sourceSummary.activityCount}
        sourceCount={sourceSummary.sourceCount}
      />
      <IntentLinkCluster
        title="Resort planning shortcuts"
        links={[
          { label: "Today by resort", href: "/today", description: "Same-day activity listings." },
          { label: "Tonight by resort", href: "/tonight", description: "Evening movies, campfires, and recreation." },
          { label: "No-ticket-friendly resorts", href: "/resorts?no_ticket_friendly=true", description: "Start with access-sensitive caveats." },
        ]}
      />
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
