import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/atlas/Hero";
import { getResorts, getTodayActivities, getTonightActivities } from "@/lib/data/activities";
import { buildItemListJsonLd, stringifyJsonLd } from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { SEASONAL_CALENDAR_PAGES } from "@/lib/seo/seasonalCalendarPages";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Walt Disney World Resort Activity Calendars",
  description:
    "Current-first Walt Disney World resort activity calendars with today and tonight highlights, resort links, source caveats, and planning shortcuts.",
  alternates: { canonical: "/disney-world-resort-activity-calendars" },
  ...buildSocialMetadata({
    title: "Walt Disney World Resort Activity Calendars",
    description:
      "Current-first Walt Disney World resort activity calendars with today and tonight highlights, resort links, source caveats, and planning shortcuts.",
    path: "/disney-world-resort-activity-calendars",
    imageEyebrow: "Resort activity calendars",
    imageSummary:
      "Compare current resort activity calendars, today and tonight counts, source caveats, and seasonal planning links.",
  }),
};

function countByResort<T extends { resort: { slug: string } }>(items: T[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.resort.slug, (counts.get(item.resort.slug) ?? 0) + 1);
  }
  return counts;
}

function uniqueSourceCount(
  items: Array<{ freshness?: { sourceUrl?: string }; source?: { url?: string } }>
) {
  return new Set(
    items
      .map((item) => item.freshness?.sourceUrl ?? item.source?.url)
      .filter((value): value is string => Boolean(value))
  ).size;
}

export default async function ResortActivityCalendarsPage() {
  const [resorts, todayActivities, tonightActivities] = await Promise.all([
    getResorts(),
    getTodayActivities(),
    getTonightActivities(),
  ]);

  const todayByResort = countByResort(todayActivities);
  const tonightByResort = countByResort(tonightActivities);
  const trackedActivities =
    todayActivities.length + tonightActivities.filter((activity) => !todayActivities.some((today) => today.id === activity.id)).length;
  const statusDate = new Date();
  const lastVerified = statusDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const nextExpectedRefresh = new Date(
    statusDate.getTime() + 24 * 60 * 60 * 1000
  ).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const dateModified = statusDate.toISOString().slice(0, 10);
  const officialSourcesChecked = uniqueSourceCount([
    ...todayActivities,
    ...tonightActivities,
  ]);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const jsonLd = stringifyJsonLd(
    buildItemListJsonLd(
      baseUrl,
      "Walt Disney World resort activity calendars",
      resorts.map((resort) => ({
        name: `${resort.name} activity calendar`,
        path: `/resorts/${resort.slug}`,
        description: `${todayByResort.get(resort.slug) ?? 0} activities today and ${tonightByResort.get(resort.slug) ?? 0} tonight.`,
      })),
      {
        dateModified,
        currentScheduleWindow: "Today and tonight resort activity listings",
        sourceSummary:
          "Official Disney resort recreation sources are checked first, with current schedule, source, and access caveats shown on the page.",
      }
    )
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Hero
        title="Walt Disney World Resort Activity Calendars"
        subtitle="A current-first hub for resort recreation, movies, campfires, crafts, and no-park-day planning."
      />

      <section className="mb-8 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Current status</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          After the Parks tracks Walt Disney World resort activities from official
          and verified calendars, then routes you into live today, tonight,
          activity, and resort views. Always confirm times with the official
          resort source before heading out.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Last checked
            </dt>
            <dd className="font-semibold">{lastVerified}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Resorts covered
            </dt>
            <dd className="font-semibold">{resorts.length}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Tracked now
            </dt>
            <dd className="font-semibold">{trackedActivities} activities</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Tonight
            </dt>
            <dd className="font-semibold">{tonightActivities.length} activities</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Official sources checked
            </dt>
            <dd className="font-semibold">{officialSourcesChecked || "Current data"}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Next expected refresh
            </dt>
            <dd className="font-semibold">{nextExpectedRefresh}</dd>
          </div>
        </dl>
        <Link
          href="/corrections"
          className="mt-4 inline-flex text-sm font-bold text-[var(--accent)] hover:underline"
        >
          Send a correction
        </Link>
      </section>

      <section className="mb-8">
        <div className="mb-4 flex flex-wrap gap-3">
          <Link className="btn-primary rounded-full px-5 py-3 text-sm font-bold" href="/today">
            See today
          </Link>
          <Link className="btn-secondary rounded-full px-5 py-3 text-sm font-bold" href="/tonight">
            See tonight
          </Link>
          <Link className="btn-secondary rounded-full px-5 py-3 text-sm font-bold" href="/activities">
            Browse activities
          </Link>
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          The best calendar page is not just a list of PDFs. It should help you
          decide what is happening, what is nearby, what is free or reservation
          based, and where to go next.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">
          Seasonal calendar planning
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Seasonal pages keep current resort activity data connected to summer,
          fall, and holiday planning so older advice does not outrun verified
          schedules, weather caveats, or access rules.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {SEASONAL_CALENDAR_PAGES.map((page) => (
            <Link
              key={page.slug}
              href={`/disney-world-resort-activity-calendars/${page.slug}`}
              className="rounded-xl border border-[var(--color-card-border)] p-4 hover:bg-[var(--color-card-subtle)]"
            >
              <span className="block text-sm font-bold text-[var(--accent)]">
                {page.seasonLabel}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-[var(--color-muted)]">
                {page.scheduleWindow}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="resort-calendar-list-heading">
        <h2 id="resort-calendar-list-heading" className="font-display text-2xl font-semibold">
          Resort activity calendar links
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resorts.map((resort) => (
            <article
              key={resort.slug}
              className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"
            >
              <h3 className="font-display text-xl font-semibold">
                <Link href={`/resorts/${resort.slug}`} className="hover:text-[var(--accent)]">
                  {resort.name}
                </Link>
              </h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {resort.activityCount} scheduled activities and {resort.offeringCount} standing offerings tracked.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <Link href={`/today?resort=${resort.slug}`} className="text-[var(--accent)] hover:underline">
                  {todayByResort.get(resort.slug) ?? 0} today
                </Link>
                <Link href={`/tonight?resort=${resort.slug}`} className="text-[var(--accent)] hover:underline">
                  {tonightByResort.get(resort.slug) ?? 0} tonight
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Source and accuracy notes</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Resort activity calendars can change because of weather, staffing,
          refurbishments, private events, seasonal programming, and Disney policy
          changes. A tracked listing means After the Parks has verified data;
          it does not replace official Disney confirmation.
        </p>
        <Link href="/source-and-accuracy-policy" className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
          Read the source and accuracy policy
        </Link>
      </section>
    </>
  );
}
