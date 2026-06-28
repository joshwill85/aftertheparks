import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClient } from "@/components/atlas/CalendarClient";
import { Hero } from "@/components/atlas/Hero";
import { sanitizePublicActivities, dedupeOccurrences } from "@/lib/api/publicActivities";
import { getAllOccurrences } from "@/lib/data/activities";
import {
  activityEventJsonLd,
  activityListJsonLd,
  activitySourceSummary,
  formatSeoDate,
} from "@/lib/seo/activityPage";
import { stringifyJsonLd } from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Disney World Resort Activity Calendar | After the Parks",
  description:
    "Month-at-a-glance Walt Disney World resort activity calendar with current movies, campfires, crafts, poolside recreation, and source freshness notes.",
  alternates: { canonical: "/calendar" },
  ...buildSocialMetadata({
    title: "Disney World Resort Activity Calendar",
    description:
      "Month-at-a-glance Walt Disney World resort activity calendar with current movies, campfires, crafts, poolside recreation, and source freshness notes.",
    path: "/calendar",
  }),
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ resort?: string; category?: string }>;
}) {
  const params = await searchParams;
  const occurrences = sanitizePublicActivities(
    dedupeOccurrences(await getAllOccurrences(31)),
    { minTier: "low" }
  );
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const sourceSummary = activitySourceSummary(occurrences);
  const resortCount = new Set(occurrences.map((occurrence) => occurrence.resort.slug)).size;
  const datedOccurrences = occurrences.filter((occurrence) => occurrence.startDateTime);
  const firstDate = datedOccurrences
    .map((occurrence) => occurrence.startDateTime)
    .sort()[0];
  const lastDate = datedOccurrences
    .map((occurrence) => occurrence.startDateTime)
    .sort()
    .at(-1);
  const jsonLd = stringifyJsonLd([
    activityListJsonLd(
      baseUrl,
      "Walt Disney World resort activity calendar",
      occurrences
    ),
    ...activityEventJsonLd(baseUrl, occurrences),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Hero
        title="Disney World Resort Activity Calendar"
        subtitle="A month-at-a-glance view of current resort activities across your stay."
      />
      <section className="mb-6 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
          Quick answer
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          This calendar shows currently tracked Walt Disney World resort
          activities for the next 31 days, including movies, campfires, crafts,
          poolside recreation, and other resort-calendar events. Use it to spot
          busy activity days, compare resorts, and confirm what is worth checking
          before you walk or travel.
        </p>
      </section>
      <section className="mb-6 grid gap-3 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 text-sm md:grid-cols-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Source and freshness
          </p>
          <p className="mt-1 font-semibold text-[var(--brand-ink)]">
            {sourceSummary.latestVerified
              ? formatSeoDate(sourceSummary.latestVerified)
              : "Needs verification"}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Schedule window
          </p>
          <p className="mt-1 font-semibold text-[var(--brand-ink)]">
            {firstDate && lastDate
              ? `${formatSeoDate(firstDate)} to ${formatSeoDate(lastDate)}`
              : "Current calendar data"}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Resorts covered
          </p>
          <p className="mt-1 font-semibold text-[var(--brand-ink)]">
            {resortCount} resorts
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Sources checked
          </p>
          <p className="mt-1 font-semibold text-[var(--brand-ink)]">
            {sourceSummary.sourceCount} source pages
          </p>
        </div>
        <p className="md:col-span-4 text-xs leading-relaxed text-[var(--color-muted)]">
          Schedules can move, fill, or cancel. Check the linked official resort
          source before heading out, and see the{" "}
          <Link href="/source-and-accuracy-policy" className="font-semibold text-[var(--accent)] hover:underline">
            source and accuracy policy
          </Link>{" "}
          for how verification works.
        </p>
      </section>
      <CalendarClient
        occurrences={occurrences}
        initialResort={params.resort}
        initialCategory={params.category}
      />
    </>
  );
}
