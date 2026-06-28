import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hero } from "@/components/atlas/Hero";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  getResorts,
  getTodayActivities,
  getTonightActivities,
} from "@/lib/data/activities";
import {
  getSeasonalCalendarPageBySlug,
  SEASONAL_CALENDAR_PAGES,
} from "@/lib/seo/seasonalCalendarPages";
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  stringifyJsonLd,
} from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SEASONAL_CALENDAR_PAGES.map((page) => ({ season: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  const page = getSeasonalCalendarPageBySlug(season);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: `/disney-world-resort-activity-calendars/${page.slug}`,
    },
    ...buildSocialMetadata({
      title: page.title,
      description: page.description,
      path: `/disney-world-resort-activity-calendars/${page.slug}`,
    }),
  };
}

function uniqueCurrentActivities<T extends { id: string }>(first: T[], second: T[]) {
  return Array.from(
    new Map([...first, ...second].map((activity) => [activity.id, activity])).values()
  );
}

export default async function SeasonalCalendarPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  const page = getSeasonalCalendarPageBySlug(season);
  if (!page) notFound();

  const [resorts, todayActivities, tonightActivities] = await Promise.all([
    getResorts(),
    getTodayActivities(),
    getTonightActivities(),
  ]);
  const currentActivities = uniqueCurrentActivities(todayActivities, tonightActivities);
  const currentSources = new Set(
    currentActivities
      .map((activity) => activity.freshness.sourceUrl || activity.source?.url)
      .filter(Boolean)
  ).size;
  const statusDate = new Date();
  const dateModified = statusDate.toISOString().slice(0, 10);
  const nextExpectedRefresh = new Date(
    statusDate.getTime() + 24 * 60 * 60 * 1000
  ).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const jsonLd = stringifyJsonLd(
    [
      buildBreadcrumbJsonLd(baseUrl, [
        { name: "Resort Activity Calendars", path: "/disney-world-resort-activity-calendars" },
        {
          name: page.seasonLabel,
          path: `/disney-world-resort-activity-calendars/${page.slug}`,
        },
      ]),
      buildItemListJsonLd(
        baseUrl,
        `${page.seasonLabel} resort calendar planning paths`,
        [
          ...page.deepLinks.map((href) => ({
            name: href,
            path: href,
            description: `Live After the Parks planning path for ${page.seasonLabel}.`,
          })),
          ...resorts.slice(0, 12).map((resort) => ({
            name: `${resort.name} activity calendar`,
            path: `/resorts/${resort.slug}`,
            description: `${resort.activityCount} scheduled activities and ${resort.offeringCount} standing offerings tracked.`,
          })),
        ],
        {
          dateModified,
          currentScheduleWindow: page.scheduleWindow,
          sourceSummary:
            "Official Disney resort recreation sources are checked first, with current schedule, source, and access caveats shown on the page.",
        }
      ),
    ]
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Breadcrumbs
        items={[
          {
            name: "Resort Activity Calendars",
            href: "/disney-world-resort-activity-calendars",
          },
          { name: page.seasonLabel },
        ]}
      />
      <Hero title={page.title} subtitle={page.description} />

      <article className="space-y-8">
        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">
            Current seasonal snapshot
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                Window
              </dt>
              <dd className="font-semibold">{page.scheduleWindow}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                Resorts covered
              </dt>
              <dd className="font-semibold">{resorts.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                Current rows
              </dt>
              <dd className="font-semibold">{currentActivities.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                Sources
              </dt>
              <dd className="font-semibold">{currentSources}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                Next expected refresh
              </dt>
              <dd className="font-semibold">{nextExpectedRefresh}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">
            How to use this seasonal page
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {page.planningAngles.map((angle) => (
              <div
                key={angle}
                className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 text-sm leading-relaxed text-[var(--color-muted)]"
              >
                {angle}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">Live planning paths</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {page.deepLinks.map((href) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-[var(--color-card-border)] px-4 py-2 text-sm font-bold text-[var(--accent)] hover:bg-[var(--color-card-subtle)]"
              >
                {href}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
            Freshness rule: {page.freshnessRule}
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-display text-2xl font-semibold">
            Source and accuracy notes
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {page.sourceCaveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link
              href="/source-and-accuracy-policy"
              className="inline-flex text-sm font-bold text-[var(--accent)] hover:underline"
            >
              Read the source and accuracy policy
            </Link>
            <Link
              href="/corrections"
              className="inline-flex text-sm font-bold text-[var(--accent)] hover:underline"
            >
              Send a correction
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}
