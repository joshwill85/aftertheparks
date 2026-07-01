import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClient } from "@/components/atlas/CalendarClient";
import { BrandAsset } from "@/components/brand/BrandAsset";
import { PlanClientBoundary } from "@/components/plan/PlanClientBoundary";
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
import { parsePlanAheadParams } from "@/lib/calendar/params";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Plan Ahead | Disney World Resort Activity Calendar",
  description:
    "Plan future Walt Disney World resort days by date, resort, activity type, area, and time of day before or after you know where you are staying.",
  alternates: { canonical: "/calendar" },
  ...buildSocialMetadata({
    title: "Plan Ahead",
    description:
      "Pick dates for a known stay, or compare resorts before you book using current resort activity calendars.",
    path: "/calendar",
  }),
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const planAhead = parsePlanAheadParams(params);
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
      <section className="browse-hero-compact relative mb-5 overflow-hidden rounded-3xl border border-[var(--color-card-border)] p-6 md:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, var(--hero-glow), transparent 50%),
              radial-gradient(ellipse at 80% 80%, var(--hero-glow), transparent 40%)`,
          }}
        />
        <div className="relative">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[var(--accent)]">
            Sunshine to Starlight
          </p>
          <h1 className="font-display max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Plan Ahead
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--color-muted)]">
            Pick a day of your trip to see resort activities, weather context,
            and easy backup ideas.
          </p>
        </div>
      </section>
      <div className="mb-6 flex justify-center">
        <BrandAsset asset="pocket-map-only" className="brand-asset--map-panel" priority />
      </div>
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
      <PlanClientBoundary>
        <CalendarClient
          occurrences={occurrences}
          initialPlanAhead={planAhead}
        />
      </PlanClientBoundary>
    </>
  );
}
