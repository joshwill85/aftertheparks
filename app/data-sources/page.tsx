import { Hero } from "@/components/atlas/Hero";

export default function DataSourcesPage() {
  return (
    <>
      <Hero
        title="Data sources"
        subtitle="How we collect, verify, and publish resort recreation schedules."
      />
      <div className="space-y-6 text-[var(--color-muted)]">
        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <h2 className="font-display text-lg font-semibold text-[var(--color-foreground)]">
            Official recreation calendars
          </h2>
          <p className="mt-2">
            Activity data is extracted from official Walt Disney World resort
            recreation pages and A-frame PDF calendars published by Disney. Each
            activity links to its source document where available.
          </p>
        </section>
        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <h2 className="font-display text-lg font-semibold text-[var(--color-foreground)]">
            Freshness & verification
          </h2>
          <p className="mt-2">
            Schedules change with seasons and resort operations. We run weekly
            ingest checks and display a verification badge on each activity.
            Activities flagged for review are hidden from public results until
            verified.
          </p>
        </section>
        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <h2 className="font-display text-lg font-semibold text-[var(--color-foreground)]">
            Editorial summaries
          </h2>
          <p className="mt-2">
            Activity descriptions on After the Parks are original editorial copy.
            We do not reproduce copyrighted Disney marketing text.
          </p>
        </section>
      </div>
    </>
  );
}
